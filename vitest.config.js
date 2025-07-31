import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.js',
        'scripts/',
        '.github/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Performance testing configuration
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,ts}'],
      exclude: ['node_modules', 'dist', '.git'],
      reporters: ['default']
    }
  },
  // Resolve aliases for testing
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
      '@components': new URL('./components', import.meta.url).pathname,
      '@services': new URL('./services', import.meta.url).pathname,
      '@utils': new URL('./utils', import.meta.url).pathname
    }
  }
});