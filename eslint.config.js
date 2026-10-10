/**
 * Revisión automática del código (ESLint): encuentra variables sin usar,
 * imports mal puestos y errores comunes. Se corre con:  npm run lint
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '_site/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.js'],
    // __ce: ganchos que el juego expone sólo en modo prueba (?test)
    languageOptions: { globals: { ...globals.node, ...globals.browser, __ce: 'readonly' } },
  },
];
