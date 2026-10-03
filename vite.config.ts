import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, fs: { allow: [frontendRoot] } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    setupFiles: './test/setup.ts',
  },
});
