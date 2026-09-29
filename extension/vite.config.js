import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = dirname(fileURLToPath(import.meta.url));
// Single source of truth for the version shown in the panel: public/manifest.json
const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.json'), 'utf8'));

// Builds a Chrome MV3 extension into dist/. Load dist/ via chrome://extensions → "Load unpacked".
export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(manifest.version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        devtools: resolve(root, 'devtools.html'),
        panel: resolve(root, 'panel.html'),
      },
    },
  },
});
