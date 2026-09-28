import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Depths-of-Souls/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    // Phase 4.1-A (S4): src/engine, src/data and src/state run in Node -- this ALSO enforces
    // engine purity (DOM globals are undefined there, so a stray `window`/`document` reference
    // fails loudly instead of silently working under jsdom). src/ui and src/app render React, so
    // they keep jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: 'engine-data-state',
          environment: 'node',
          include: [
            'src/engine/**/*.test.ts',
            'src/data/**/*.test.ts',
            'src/state/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui-app',
          environment: 'jsdom',
          include: [
            'src/ui/**/*.test.ts',
            'src/ui/**/*.test.tsx',
            'src/app/**/*.test.ts',
            'src/app/**/*.test.tsx',
          ],
        },
      },
    ],
  },
}))
