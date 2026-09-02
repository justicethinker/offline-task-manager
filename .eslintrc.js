module.exports = {
  extends: ['expo', 'plugin:prettier/recommended'],
  rules: {
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
