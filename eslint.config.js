/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
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
  }
];

export default eslintConfig;
