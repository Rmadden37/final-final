/** @type {import('eslint').Linter.Config} */
const eslintConfig = {
  extends: [
    "next/core-web-vitals",
    "next/typescript"
  ],
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "functions/",
    "dist/",
    "*.js.map",
    ".env*",
    "public/",
    "build/",
  ],
  rules: {
    "no-console": "off",
    "no-case-declarations": "error",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off", 
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "jsx-a11y/alt-text": "off",
    "@next/next/no-img-element": "off",
    "no-var": "off"
  },
  overrides: [
    {
      files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/e2e/**/*.{ts,tsx}"],
      env: {
        jest: true,
        node: true
      },
      rules: {
        "no-console": "off"
      }
    }
  ]
};

module.exports = eslintConfig;
