import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: '/dc-dashboard/',
  build: {
    outDir: 'dist',
  },
});
