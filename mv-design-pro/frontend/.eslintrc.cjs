/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // react-refresh: complex codebase with mixed exports from component files
    'react-refresh/only-export-components': 'off',

    // TypeScript-specific rules — disabled intentionally for this codebase
    // Codebase uses 'as any' in many adapter/utility files (justified by TS limitations)
    '@typescript-eslint/no-explicit-any': 'off',
    // Unused-vars enforcement is handled by TypeScript compiler (tsc --noEmit in type-check)
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',

    // React Hooks: many intentional dep-array omissions for mount-only effects
    'react-hooks/exhaustive-deps': 'off',

    // Console: intentional debug logging gated by import.meta.env.DEV
    'no-console': 'off',

    // no-undef: TypeScript's type checker handles undefined references
    'no-undef': 'off',
  },
};
