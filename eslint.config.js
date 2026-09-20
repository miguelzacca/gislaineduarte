import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', '.site/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'artifacts/**', 'tests/artifacts/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,mjs,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  { files: ['**/*.jsx'], rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z]' }] } },
];
