import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'despia-native': path.resolve(__dirname, './src/__mocks__/despia-native-mock.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    // Exclude e2e tests (these use Playwright, not Vitest)
    // Exclude integration tests with mock hoisting issues pending infrastructure fix
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.integration.test.{ts,tsx}',
      // These tests have vi.mock hoisting issues with shared mock utilities
      'src/__tests__/calendar-conflict.test.tsx',
      'src/__tests__/chat-flow.test.tsx',
      'src/__tests__/payment-balance.test.tsx',
      'src/__tests__/trip-creation-flow.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'dist/',
        'build/',
        'coverage/',
      ],
      // Thresholds will be enforced gradually as coverage improves
      // thresholds: {
      //   lines: 50,
      //   functions: 50,
      //   branches: 50,
      //   statements: 50,
      // },
    },
  },
});
