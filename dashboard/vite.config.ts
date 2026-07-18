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
    // echarts-gl's 3D engine and lightweight-charts
    // are too large for default warning threshold
    chunkSizeWarningLimit: 2500,
  },
  test: {
    // jsdom gives store/hook tests a DOM + localStorage
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
