
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import next from 'eslint-config-next';

/** @type {import('eslint').Linter.Config} */
export default [
  js.configs.recommended,
  ...next,
  {
    ignores: [
      'node_modules/',
      '.next/',
      'out/',
      'functions/',
      'dist/',
      '*.js.map',
      '.env*',
      'public/',
      'build/',
    ],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
    },
    rules: {
      // Add or override rules as needed
    },
  },
];
