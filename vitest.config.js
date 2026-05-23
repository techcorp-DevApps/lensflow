import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { '@': path.resolve(__dirname, 'src') },
        },
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.{js,mjs}'],
          globals: false,
          setupFiles: ['./server/__tests__/setup.js'],
          testTimeout: 20000,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: { '@': path.resolve(__dirname, 'src') },
        },
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.{js,jsx,mjs}'],
          globals: true,
          setupFiles: ['./src/test/setup.js'],
        },
      },
    ],
  },
});
