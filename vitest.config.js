import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    include: ['tests/**/*.test.js'],
    exclude: ['tests/__init__.py', 'tests/run_all_tests.py'],
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        '*.config.js'
      ]
    }
  }
});