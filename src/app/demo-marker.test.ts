// A throwaway demo module says so in its first line and cites the rule it follows
// (`CONVENTIONS.md#every-feature-phase-ships-a-demo`), so the real UI can find what it replaces.
// Read from the raw text, comments included.

import { expect, test } from 'vitest'

const DEMO_SOURCES = {
  ...import.meta.glob('/src/app/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('/src/ui/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('/src/main.tsx', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>

const MARKER =
  '// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).'

const MODULES = Object.keys(DEMO_SOURCES).filter(
  (path) => !/\.test\.tsx?$/.test(path) && !path.endsWith('.d.ts'),
)

test('the glob finds the demo modules', () => {
  expect(MODULES.length).toBeGreaterThan(30)
  expect(MODULES).toContain('/src/main.tsx')
  expect(MODULES).toContain('/src/ui/RunScreen.tsx')
  expect(MODULES).toContain('/src/app/refusals.ts')
})

test.each(MODULES)('%s opens with the throwaway-demo marker', (path) => {
  expect(DEMO_SOURCES[path]!.split('\n')[0]).toBe(MARKER)
})
