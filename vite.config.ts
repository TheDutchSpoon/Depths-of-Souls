import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Depths-of-Souls/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    // The Node/jsdom split and why Node also enforces engine purity are
    // `CONVENTIONS.md#test-environments`. src/ui and src/app render React, so they keep jsdom.
    //
    // The Node project's `include` is a single catch-all
    // (`src/**/*.test.{ts,tsx}`) minus the jsdom project's own two folders, NOT an enumerated
    // `src/{engine,data,state}` list -- an enumerated list silently drops any test under a NEW
    // top-level folder, which no project would collect.
    projects: [
      {
        extends: true,
        test: {
          name: 'engine-data-state',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/ui/**', 'src/app/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui-app',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.{ts,tsx}', 'src/app/**/*.test.{ts,tsx}'],
        },
      },
      {
        // The docs checks (`scripts/docs-check/`) run in Node and are tested apart from `src/`, so
        // neither project above gains a test.
        extends: true,
        test: {
          name: 'docs-check',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
        },
      },
    ],
  },
}))
