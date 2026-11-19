import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths: Reportlah serves this build from /3d/index.html on its own origin.
  base: './',
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  preview: { port: 5198, strictPort: true },
  // three.js alone is about 700 kB minified; the walk is the first screen, so splitting would not help.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
