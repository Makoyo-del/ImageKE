import Pica from 'pica';

const pica = new Pica();

export const PRESETS = {
  ECITIZEN: {
    name: 'eCitizen (Kenya)',
    width: 350,
    height: 450,
    maxSizeKB: 48, // Target slightly below 50KB to guarantee acceptance
    label: 'Best for Passports, Good Conduct, CR12',
  },
  US_VISA: {
    name: 'US Visa / DV Lottery',
    width: 600,
    height: 600,
    maxSizeKB: 230, // Target below 240KB limit
    label: 'Strict 600×600px for Green Card Lottery',
  },
  KRA: {
    name: 'KRA iTax',
    width: 160,
    height: 160,
    maxSizeKB: 19, // Target below 20KB limit
    label: 'Tiny profile photo for iTax portal',
  },
  HELB: {
    name: 'HELB / University',
    width: 413,
    height: 531,
    maxSizeKB: 95, // Target below 100KB limit
    label: 'Standard 4×5 student portrait',
  },
  SCHENGEN: {
    name: 'Schengen Visa',
    width: 413, // 35mm at 300 dpi ≈ 413px
    height: 531, // 45mm at 300 dpi ≈ 531px
    maxSizeKB: 95,
    label: 'European Biometric Standard (35×45mm)',
  },
};

/**
 * Applies a visible diagonal watermark to a canvas.
 * Uses dark semi-transparent text so it's visible on any background.
 */
function applyWatermark(canvas, text = 'PREVIEW — imageke.com') {
  const ctx = canvas.getContext('2d');
  const fontSize = Math.max(12, Math.round(canvas.width / 14));

  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Tile diagonally across the canvas
  const step = fontSize * 5;
  for (let y = -canvas.height; y < canvas.height * 2; y += step) {
    for (let x = -canvas.width; x < canvas.width * 2; x += step) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 5);
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * Loads an image File into an HTMLImageElement.
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Immediately revoke — image is decoded
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image. The file may be corrupted or unsupported.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Crops and resizes an image to fit a canvas using cover logic (centered).
 * @param {HTMLImageElement} img
 * @param {HTMLCanvasElement} targetCanvas
 */
async function cropAndResize(img, targetCanvas) {
  const targetW = targetCanvas.width;
  const targetH = targetCanvas.height;
  const sourceAspect = img.naturalWidth / img.naturalHeight;
  const targetAspect = targetW / targetH;

  let sx, sy, sWidth, sHeight;

  if (sourceAspect > targetAspect) {
    // Source is wider — crop sides
    sHeight = img.naturalHeight;
    sWidth = Math.round(img.naturalHeight * targetAspect);
    sx = Math.round((img.naturalWidth - sWidth) / 2);
    sy = 0;
  } else {
    // Source is taller — crop top/bottom
    sWidth = img.naturalWidth;
    sHeight = Math.round(img.naturalWidth / targetAspect);
    sx = 0;
    sy = Math.round((img.naturalHeight - sHeight) / 2);
  }

  // Draw crop into an intermediate canvas at original crop resolution
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = sWidth;
  srcCanvas.height = sHeight;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

  // Resize from intermediate → target using Pica (Lanczos)
  await pica.resize(srcCanvas, targetCanvas, { quality: 3 });
}

/**
 * Iteratively compresses a canvas to a JPEG blob within the maxSizeKB limit.
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxSizeKB
 * @returns {Promise<Blob>}
 */
async function compressToLimit(canvas, maxSizeKB) {
  let quality = 0.92;
  const minQuality = 0.05;
  const step = 0.05;

  let blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));

  while (blob && blob.size / 1024 > maxSizeKB && quality > minQuality) {
    quality = Math.max(minQuality, quality - step);
    blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  }

  if (!blob) {
    throw new Error('Failed to generate image blob.');
  }

  return blob;
}

/**
 * Processes an image file: crops, resizes, optionally watermarks, and compresses.
 * @param {File} file - The image file to process.
 * @param {Object} preset - The preset with { width, height, maxSizeKB }.
 * @param {boolean} [watermarked=false] - Whether to overlay a watermark.
 * @returns {Promise<Blob>} - The processed, compressed JPEG blob.
 */
export async function processImage(file, preset, watermarked = false) {
  if (!file) throw new Error('No file provided.');
  if (!preset || !preset.width || !preset.height || !preset.maxSizeKB) {
    throw new Error('Invalid preset configuration.');
  }

  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = preset.width;
  canvas.height = preset.height;

  await cropAndResize(img, canvas);

  if (watermarked) {
    applyWatermark(canvas);
  }

  return compressToLimit(canvas, preset.maxSizeKB);
}
