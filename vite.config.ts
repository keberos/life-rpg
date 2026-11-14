import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [preact()],
  base: './', // works from any static host path (GitHub Pages, Netlify, Cloudflare)
  server: { host: true, port: 5173 }, // host: reachable from the phone on the same Wi-Fi
  build: { outDir: 'dist' },
});
