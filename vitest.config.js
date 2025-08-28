import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['audits/scripts/modules/__tests__/**/*.test.js'],
    environment: 'jsdom',
  },
});
