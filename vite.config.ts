import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { studioApi } from './vite-studio-plugin.ts';

export default defineConfig({
  plugins: [react(), studioApi()],
  server: {
    // Bind to all interfaces so the app is reachable from the sandbox preview
    // URL and from a phone/emulator on the local network during development.
    host: true,
    // The sandboxed preview is served from a proxied host name.
    allowedHosts: true,
    port: 5173,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    // Only `index.html` is built. The studio page (`studio.html` + `src/studio/`)
    // is a development tool: it needs the dev server's write API to be useful at
    // all, so it is deliberately absent from the production bundle.
    // `assetsInlineLimit` keeps the web bundle self-contained: no remote assets,
    // no runtime fetches.
    assetsInlineLimit: 8 * 1024,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
