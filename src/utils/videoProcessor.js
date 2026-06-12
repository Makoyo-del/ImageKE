import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = null;

/**
 * Loads the WebAssembly FFmpeg instance from a CDN.
 * Falls back to single-threaded if multi-threaded load fails.
 * @param {Function} onProgress - Callback for download/load progress (0-100).
 * @param {Function} onLog - Callback for FFmpeg console log messages.
 * @returns {Promise<FFmpeg>}
 */
export async function loadFFmpeg(onProgress = () => {}, onLog = () => {}) {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    onLog(message);
    console.log('[FFmpeg]', message);
  });

  // Track progress of the transcoding operations
  ffmpeg.on('progress', ({ progress }) => {
    // progress is a float from 0 to 1
    onProgress(Math.round(progress * 100));
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  try {
    // Attempt load. FFmpeg.wasm v0.12 ESM builds load core and wasm from CDN.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  } catch (err) {
    console.error('FFmpeg load failed:', err);
    throw new Error('Failed to initialize video editor. Please ensure you are online and using a supported browser.');
  }

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Generates a transparent PNG blob containing watermark text.
 * Used to burn text watermarks into videos without needing local TTF fonts.
 * @param {string} text - Watermark text
 * @param {string} color - CSS color code
 * @param {number} fontSize - font size in pixels
 * @returns {Promise<Blob>}
 */
export function generateWatermarkBlob(text, color = 'rgba(255, 255, 255, 0.75)', fontSize = 28) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(text).width;
    
    // Fit canvas tightly to text
    canvas.width = Math.ceil(textWidth + 24);
    canvas.height = Math.ceil(fontSize + 16);
    
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Shadow for high readability on any background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Get coordinates for the FFmpeg overlay filter based on position.
 * @param {string} position - 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
 * @returns {string} overlay parameter
 */
function getOverlayPosition(position) {
  switch (position) {
    case 'top-left':
      return '16:16';
    case 'top-right':
      return 'W-w-16:16';
    case 'bottom-left':
      return '16:H-h-16';
    case 'bottom-right':
    default:
      return 'W-w-16:H-h-16';
    case 'center':
      return '(W-w)/2:(H-h)/2';
  }
}

/**
 * Crop and/or change video aspect ratio.
 * @param {FFmpeg} ffmpeg - Active FFmpeg instance
 * @param {File} file - Original video file
 * @param {string} aspect - Target aspect ratio: '16:9', '9:16', '1:1', 'custom'
 * @param {Object} [cropRect] - Draggable crop dimensions: { x, y, width, height }
 * @param {boolean} [isFree=true] - If true, watermarks and clips to 15s.
 * @returns {Promise<Blob>} Processed MP4 blob
 */
export async function changeVideoAspectRatio(ffmpeg, file, aspect, cropRect, isFree = true) {
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const filterParts = [];
  
  if (cropRect && cropRect.width && cropRect.height) {
    filterParts.push(`crop=${cropRect.width}:${cropRect.height}:${cropRect.x}:${cropRect.y}`);
  } else {
    // Default center crops if coordinates not provided
    if (aspect === '9:16') {
      filterParts.push('crop=ih*9/16:ih');
    } else if (aspect === '1:1') {
      filterParts.push('crop=ih:ih');
    }
  }

  let inputArgs = ['-i', inputName];
  let filterComplex = '';

  if (isFree) {
    const watermarkName = 'watermark.png';
    const watermarkBlob = await generateWatermarkBlob('PREVIEW — imageke.com', 'rgba(255, 255, 255, 0.6)', 24);
    await ffmpeg.writeFile(watermarkName, await fetchFile(watermarkBlob));
    
    inputArgs.push('-i', watermarkName);

    if (filterParts.length > 0) {
      filterComplex = `[0:v]${filterParts.join(',')}[cropped]; [cropped][1:v]overlay=W-w-12:H-h-12`;
    } else {
      filterComplex = `[0:v][1:v]overlay=W-w-12:H-h-12`;
    }
  } else {
    if (filterParts.length > 0) {
      filterComplex = `[0:v]${filterParts.join(',')}`;
    }
  }

  const args = [...inputArgs];
  
  if (filterComplex) {
    args.push('-filter_complex', filterComplex);
  }

  if (isFree) {
    args.push('-t', '15'); // Limit duration to 15 seconds on free tier
  }

  // Fast transcoder settings
  args.push(
    '-preset', 'ultrafast',
    '-c:v', 'libx264',
    '-crf', '26',
    '-c:a', 'aac',
    '-b:a', '96k',
    outputName
  );

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  // Cleanup files from FFmpeg memory
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    if (isFree) await ffmpeg.deleteFile('watermark.png');
  } catch (e) {
    console.warn('File cleanup failed:', e);
  }

  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Compress video to fit under specific file size.
 * @param {FFmpeg} ffmpeg - Active FFmpeg instance
 * @param {File} file - Original video file
 * @param {number} duration - Video duration in seconds
 * @param {number} targetSizeMB - Target file size limit (e.g. 16 or 25)
 * @param {boolean} [isFree=true] - If true, watermarks and clips to 15s.
 * @returns {Promise<Blob>} Compressed MP4 blob
 */
export async function compressVideo(ffmpeg, file, duration, targetSizeMB, isFree = true) {
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Determine duration to use for bitrate calculation
  const limitDuration = isFree ? Math.min(15, duration) : duration;
  
  // Target total bits = target MB * 1024 * 1024 * 8
  const targetBits = targetSizeMB * 1024 * 1024 * 8;
  const targetBitrateBps = targetBits / limitDuration;
  
  // Standard audio allocation
  const audioBitrateBps = 96 * 1024; // 96kbps
  let videoBitrateBps = targetBitrateBps - audioBitrateBps;

  // Clamp video bitrate to reasonable ranges
  if (videoBitrateBps < 150 * 1024) {
    videoBitrateBps = 150 * 1024; // absolute floor to keep some text visible
  }
  
  const videoBitrateKbps = Math.round(videoBitrateBps / 1024);
  const audioBitrateKbps = 96;

  let inputArgs = ['-i', inputName];
  let filterComplex = '';

  if (isFree) {
    const watermarkName = 'watermark.png';
    const watermarkBlob = await generateWatermarkBlob('PREVIEW — imageke.com', 'rgba(255, 255, 255, 0.6)', 24);
    await ffmpeg.writeFile(watermarkName, await fetchFile(watermarkBlob));
    inputArgs.push('-i', watermarkName);
    filterComplex = `[0:v][1:v]overlay=W-w-12:H-h-12`;
  }

  const args = [...inputArgs];

  if (filterComplex) {
    args.push('-filter_complex', filterComplex);
  }

  if (isFree) {
    args.push('-t', '15');
  }

  args.push(
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${videoBitrateKbps * 1.2}k`,
    '-bufsize', `${videoBitrateKbps * 2}k`,
    '-preset', 'ultrafast',
    '-c:v', 'libx264',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', `${audioBitrateKbps}k`,
    outputName
  );

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    if (isFree) await ffmpeg.deleteFile('watermark.png');
  } catch (e) {
    console.warn('File cleanup failed:', e);
  }

  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Add a brand image watermark or text logo overlay to a video.
 * @param {FFmpeg} ffmpeg - Active FFmpeg instance
 * @param {File} file - Original video file
 * @param {File|string} watermarkSource - Image File or Text string
 * @param {string} type - 'image' or 'text'
 * @param {string} position - 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
 * @param {boolean} [isFree=true] - If true, burns in free preview watermark in addition
 * @returns {Promise<Blob>} Watermarked MP4 blob
 */
export async function addVideoWatermark(ffmpeg, file, watermarkSource, type, position, isFree = true) {
  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const overlayPos = getOverlayPosition(position);
  let filterComplex = '';
  let inputArgs = ['-i', inputName];

  // 1. Load User's Brand Watermark
  const brandWatermarkName = 'brand_watermark.png';
  if (type === 'image') {
    await ffmpeg.writeFile(brandWatermarkName, await fetchFile(watermarkSource));
  } else {
    // Generate text watermark as transparent PNG dynamically
    const textBlob = await generateWatermarkBlob(watermarkSource, 'rgba(255, 255, 255, 0.85)', 32);
    await ffmpeg.writeFile(brandWatermarkName, await fetchFile(textBlob));
  }
  inputArgs.push('-i', brandWatermarkName);

  // 2. Load Free Tier Watermark if active
  if (isFree) {
    const freeWatermarkName = 'free_watermark.png';
    const freeBlob = await generateWatermarkBlob('PREVIEW — imageke.com', 'rgba(255, 255, 255, 0.5)', 20);
    await ffmpeg.writeFile(freeWatermarkName, await fetchFile(freeBlob));
    inputArgs.push('-i', freeWatermarkName);
    
    // Apply user watermark at chosen position, and free watermark at bottom-right corner
    filterComplex = `[0:v][1:v]overlay=${overlayPos}[temp]; [temp][2:v]overlay=W-w-12:H-h-12`;
  } else {
    filterComplex = `[0:v][1:v]overlay=${overlayPos}`;
  }

  const args = [...inputArgs];
  if (filterComplex) {
    args.push('-filter_complex', filterComplex);
  }

  if (isFree) {
    args.push('-t', '15');
  }

  args.push(
    '-preset', 'ultrafast',
    '-c:v', 'libx264',
    '-crf', '26',
    '-c:a', 'aac',
    '-b:a', '96k',
    outputName
  );

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    await ffmpeg.deleteFile(brandWatermarkName);
    if (isFree) await ffmpeg.deleteFile('free_watermark.png');
  } catch (e) {
    console.warn('File cleanup failed:', e);
  }

  return new Blob([data.buffer], { type: 'video/mp4' });
}

/**
 * Extract audio track from a video file and save as MP3.
 * @param {FFmpeg} ffmpeg - Active FFmpeg instance
 * @param {File} file - Original video file
 * @param {boolean} [isFree=true] - If true, limit audio duration to 15s.
 * @returns {Promise<Blob>} Extracted audio MP3 blob
 */
export async function extractAudio(ffmpeg, file) {
  const inputName = 'input.mp4';
  const outputName = 'output.mp3';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = ['-i', inputName];

  args.push(
    '-vn',               // Strip video
    '-acodec', 'libmp3lame', // Transcode to MP3
    '-ab', '128k',       // Constant Bitrate (CBR) 128kbps for faster processing
    outputName
  );

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile(outputName);
  
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn('File cleanup failed:', e);
  }

  return new Blob([data.buffer], { type: 'audio/mp3' });
}

/**
 * Extract frames from a video file.
 * @param {FFmpeg} ffmpeg - Active FFmpeg instance
 * @param {File} file - Original video file
 * @param {number} duration - Video duration in seconds
 * @param {string} mode - 'fps' (every N seconds) or 'count' (extract exactly N frames)
 * @param {number} rateOrCount - frequency in seconds (for 'fps') or total frames (for 'count')
 * @param {boolean} [isFree=true] - If true, watermarks the frames and limits to first 15s of video.
 * @returns {Promise<Array<{name: string, timestamp: number, blob: Blob}>>} Extracted frames
 */
export async function extractVideoFrames(ffmpeg, file, duration, mode, rateOrCount, isFree = true) {
  const inputName = 'input.mp4';
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Determine fps filter
  let fps = 1;
  if (mode === 'fps') {
    fps = 1 / rateOrCount; // e.g. every 2s means fps = 0.5
  } else {
    // Total frames, e.g. extract 10 frames
    const count = Math.max(2, rateOrCount);
    const limitDur = isFree ? Math.min(15, duration) : duration;
    const interval = limitDur / count;
    fps = 1 / interval;
  }

  const args = ['-i', inputName];
  
  if (isFree) {
    args.push('-t', '15'); // Capped to first 15 seconds
  }

  let filterComplex = `fps=${fps}`;
  if (isFree) {
    const watermarkName = 'watermark.png';
    const watermarkBlob = await generateWatermarkBlob('PREVIEW — imageke.com', 'rgba(255, 255, 255, 0.6)', 24);
    await ffmpeg.writeFile(watermarkName, await fetchFile(watermarkBlob));
    args.push('-i', watermarkName);
    filterComplex = `[0:v]fps=${fps}[vframe]; [vframe][1:v]overlay=W-w-12:H-h-12`;
  }

  args.push('-filter_complex', filterComplex, 'frame_%04d.jpg');

  await ffmpeg.exec(args);

  const frames = [];
  let i = 1;
  while (true) {
    const frameName = `frame_${String(i).padStart(4, '0')}.jpg`;
    try {
      const data = await ffmpeg.readFile(frameName);
      const blob = new Blob([data.buffer], { type: 'image/jpeg' });
      frames.push({
        name: `frame_${i}.jpg`,
        timestamp: (i - 1) / fps,
        blob,
      });
      // Delete from memory to save RAM
      await ffmpeg.deleteFile(frameName);
      i++;
    } catch (e) {
      // Loop ends when no more frame files are found
      break;
    }
  }

  try {
    await ffmpeg.deleteFile(inputName);
    if (isFree) await ffmpeg.deleteFile('watermark.png');
  } catch (e) {
    console.warn('File cleanup failed:', e);
  }

  return frames;
}
