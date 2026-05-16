import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Vitest = tests unitaires uniquement (*.test.ts).
    // Les specs Playwright (tests/e2e/*.spec.ts) sont exécutées par Playwright,
    // pas Vitest — sinon l'import de @playwright/test casse le run unitaire.
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
