module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  env: { browser: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', 'src/api/schema.ts', '*.config.ts', '*.config.js', '*.config.d.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Literal quotes/apostrophes in JSX text are fine; escaping is a style opinion.
    'react/no-unescaped-entities': 'off',
    // Informative but not blocking — many deps are intentionally omitted.
    'react-hooks/exhaustive-deps': 'warn',
  },
};
