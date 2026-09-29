import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const CORPUS_UPDATE = process.argv.includes('corpus-update')

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Depths-of-Souls/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    // `vitest run ... --mode corpus-update` (npm run corpus:update) regenerates the corpus digest
    // fixture. Vitest pins `import.meta.env.MODE` to 'test' inside tests and re-evaluates this
    // config per project with mode 'test', so the requested mode is read once from the command
    // line and forwarded as a plain env flag -- cross-platform, unlike a `VAR=1 cmd` npm script.
    env: { CORPUS_UPDATE: CORPUS_UPDATE ? '1' : '' },
    // Phase 4.1-A (S4): src/engine, src/data and src/state run in Node -- this ALSO enforces
    // engine purity (DOM globals are undefined there, so a stray `window`/`document` reference
    // fails loudly instead of silently working under jsdom). src/ui and src/app render React, so
    // they keep jsdom.
    //
    // Review fix F2: the Node project's `include` is now a single catch-all
    // (`src/**/*.test.{ts,tsx}`) minus the jsdom project's own two folders, NOT an enumerated
    // `src/{engine,data,state}` list -- an enumerated list silently drops any test under a NEW
    // top-level folder (verified: a throwaway `src/zzprobe/x.test.ts` was collected by NEITHER
    // project and never ran). ASSUMPTION 24 ("any new top-level test folder defaults to Node
    // unless it renders React") is now actually true of the config, not just documented.
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
    ],
  },
}))
