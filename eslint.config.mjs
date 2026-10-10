import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: [
      '.next/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/out/**',
      'scripts/**',
      'starter-for-nextjs/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
]

export default config
