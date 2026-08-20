import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        city: resolve(__dirname, 'city-view.html'),
        detail: resolve(__dirname, 'building-detail.html'),
      },
    },
  },
});
