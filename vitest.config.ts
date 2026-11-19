import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.js'],
      exclude: ['src/**/__tests__/**', 'src/test/**', 'src/main.tsx', 'src/types.ts'],
    },
  },
});
