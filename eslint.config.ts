import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['*.ts', '**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      ...eslintPluginPrettierRecommended.plugins,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...eslintPluginPrettierRecommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
    ignores: ['node_modules/**', 'build/**', 'generated/**'],
  },
];
