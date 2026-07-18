import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    headers: {
      // COOP isolates the browsing context from cross-origin popups (good security practice).
      // NOTE: We intentionally do NOT set Cross-Origin-Embedder-Policy (COEP) here because
      // COEP: require-corp blocks third-party scripts (Paystack, PDF.js CDN, etc.) that
      // don't serve a Cross-Origin-Resource-Policy response header. COEP is only needed
      // when using SharedArrayBuffer — which this app does not.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },

  build: {
    // Inline assets smaller than 4 KB as base64 — eliminates extra HTTP round-trips
    assetsInlineLimit: 4096,

    // Split CSS per chunk — only load what the current route needs
    cssCodeSplit: true,

    // Terser for smallest possible JS output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Strip console.log in production
        drop_debugger: true,
        passes: 2,            // Two compression passes
      },
    },

    rollupOptions: {
      output: {
        // Manual chunks — keeps vendor libs separate from app code.
        // Browser caches vendor chunk across deploys (long TTL on immutable files).
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
        },
        // Deterministic asset filenames for CDN cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})

