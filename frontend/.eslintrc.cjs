/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: 'detect' } },
  env: {
    browser: true,
    es2022: true,
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results',
    '.eslintrc.cjs',
    // Generated from the backend OpenAPI spec — see `npm run gen:api`.
    'src/api/schema.ts',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    // Apostrophes/quotes in JSX copy are intentional; escaping them hurts readability.
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
  },
};
