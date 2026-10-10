import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // względne ścieżki — działa pod dowolnym adresem, np. GitHub Pages: <login>.github.io/<repo>/
  base: './',
  server: { port: 5173 },
});
