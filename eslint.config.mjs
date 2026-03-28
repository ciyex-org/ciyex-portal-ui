import js from "@eslint/js";
import next from "eslint-config-next";
 
export default [
  js.configs.recommended,
  ...next,
  {
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        RequestInfo: 'readonly',
        RequestCache: 'readonly',
      },
    },
    rules: {
      // Re-enable important rules with warnings first, then upgrade to errors
      'no-unused-vars': 'warn', // Re-enabled as warning
      'no-empty': 'warn', // Re-enabled as warning
      'no-useless-escape': 'warn', // Re-enabled as warning
      'no-duplicate-case': 'error', // This should always be an error
      'no-dupe-else-if': 'error', // This should always be an error
      
      // React hooks rules - keep as warnings for gradual improvement
      'react-hooks/rules-of-hooks': 'error', // This is critical for React
      'react-hooks/exhaustive-deps': 'warn',
      
      // Next.js specific rules
      '@next/next/no-img-element': 'warn',
      
      // Temporarily disabled rules that need more extensive refactoring
      'react-hooks/set-state-in-effect': 'off', // TODO: Fix setState in effects
      'react-hooks/static-components': 'off', // TODO: Fix components created during render
      'react-hooks/immutability': 'off', // TODO: Fix functions used before declared
      'import/no-anonymous-default-export': 'off', // For config exports
    },
  },
];
 