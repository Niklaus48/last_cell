import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    // Keeps the web bundle self-contained: no remote assets, no runtime fetches.
    assetsInlineLimit: 8 * 1024,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
