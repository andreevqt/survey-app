/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '.eslintrc.cjs'],
  rules: {
    // NestJS leans on decorators and DI; `any` shows up in framework glue.
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow intentionally-unused args/vars when prefixed with `_`.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // A `﻿` (BOM) literal inside a regex is intentional (CSV BOM stripping).
    'no-irregular-whitespace': ['error', { skipRegExps: true }],
  },
};
