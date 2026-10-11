import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// wersja z package.json (semver) — wyświetlana w stopce menu
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  // względne ścieżki — działa pod dowolnym adresem, np. GitHub Pages: <login>.github.io/<repo>/
  base: './',
  server: { port: 5173 },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
