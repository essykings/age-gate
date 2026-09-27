import { defineConfig } from 'vitest/config';

// Unit tests for the pure logic shared by the dashboard and the site script.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
