import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Phase 4.1-C2a (PR #71 review): `src/` must never import Node built-ins -- engine purity
    // (CONVENTIONS) and browser portability for `src/ui`/`src/app`. tsconfig.app.json's own
    // `types` array (`["vite/client"]`) keeps Node's AMBIENT globals (`process`, `Buffer`, ...)
    // out of `src/`, but `src/engine/__corpus__/node-shims.d.ts`'s ambient `declare module
    // 'node:*'` blocks are program-wide by construction (TypeScript ambient module declarations
    // always are) -- they make an EXPLICIT `import ... from 'node:*'` type-check from ANY file
    // under `src/`, not just the one that needs it. This lint rule is what actually confines
    // their use, not the shim file itself.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message:
                "src/ must not import Node built-ins -- see src/engine/__corpus__/node-shims.d.ts's own header comment.",
            },
          ],
        },
      ],
    },
  },
  {
    // The one file that legitimately needs them: the corpus digest's own generator, which writes
    // its committed fixture to disk (`npm run corpus:update`) and is switched on by Vitest's `--mode corpus-update`.
    files: ['src/engine/corpus-digest.test.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  eslintConfigPrettier,
)
