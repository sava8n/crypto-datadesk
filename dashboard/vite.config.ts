import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // echarts alone puts the bundle near 1.6 MB; some headroom over that
    chunkSizeWarningLimit: 2000,
  },
  test: {
    // jsdom gives store/hook tests a DOM + localStorage
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // vitest stubs .css modules to '' otherwise, ?raw included; charts.test.ts reads the stylesheet
    css: { include: /dashboard\.css/ },
  },
});
