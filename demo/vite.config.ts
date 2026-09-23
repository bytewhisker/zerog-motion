import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  base: '/zerog-motion/',
  resolve: {
    alias: {
      'zerog-motion': resolve(__dirname, '../dist/index.js'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
