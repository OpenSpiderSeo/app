import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Neutralino local server does not send CORS headers — strip Vite's crossorigin attrs. */
function stripCrossOriginForNeutralino() {
  return {
    name: 'strip-crossorigin-neutralino',
    transformIndexHtml(html: string) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, '');
    },
  };
}

export default defineConfig({
  root: rootDir,
  // Relative asset URLs work with Neutralino documentRoot /resources/ (avoid /resources/resources/ doubling).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify('1.0.5'),
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE ?? 'http://127.0.0.1:7845'),
  },
  plugins: [react(), tailwindcss(), stripCrossOriginForNeutralino()],
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, '../src/shared'),
      '@renderer': path.resolve(rootDir, '../src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Neutralino WebView + resources.neu (asar) is unreliable with native ES modules.
    // Single IIFE bundle loads as a classic <script> in packaged builds.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'OpenSpiderApp',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
