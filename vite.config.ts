

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix: __dirname is not defined in ES module scope.
// We derive it using import.meta.url to maintain compatibility with path.resolve.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Fix: Use the manually defined __dirname to resolve the base path alias
      '@': path.resolve(__dirname, './'),
    },
  },
});
