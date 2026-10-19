// The farthest reachable floor has one home, `farthestReachableFloor` in `store.ts`. This guard
// reads every non-test source file and fails on any other place that restates the rule in code,
// so a fifth reader cannot grow beside the four that call the export. Comments are stripped
// first, so a comment that names the rule passes.

import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const RAW_SOURCES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** One plus the deepest floor, written as code. */
const RESTATEMENT = /deepestFloor\s*\+\s*1\b/g

/** The file's code as the compiler emits it: no comments, and a `.tsx` file parsed as TSX. */
function codeOf(path: string, source: string): string {
  return ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.Preserve,
      removeComments: true,
    },
  }).outputText
}

function restatements(path: string, source: string): string[] {
  // Stripping comments only removes matches, so a file whose raw text has none has none in code
  // either, and skips the (slow) compile.
  if (!new RegExp(RESTATEMENT.source).test(source)) return []
  return codeOf(path, source).match(RESTATEMENT) ?? []
}

const SOURCE_PATHS = Object.keys(RAW_SOURCES).filter(
  (path) => !/\.test\.tsx?$/.test(path) && !path.endsWith('.d.ts'),
)

const HOME = '/src/state/store.ts'

describe('the reach rule has one home', () => {
  test('the guard reads the source files', () => {
    expect(SOURCE_PATHS.length).toBeGreaterThan(50)
    expect(SOURCE_PATHS).toContain(HOME)
    expect(SOURCE_PATHS).toContain('/src/ui/RunScreen.tsx')
  })

  test('a code line is a restatement and a comment line is not', () => {
    expect(restatements('/x.ts', 'const reach = deepestFloor + 1\n')).toHaveLength(1)
    expect(restatements('/x.ts', 'const reach = deepestFloor+1\n')).toHaveLength(1)
    expect(restatements('/x.ts', '// one past deepestFloor + 1\nconst a = 1\n')).toEqual(
      [],
    )
    expect(
      restatements('/x.ts', '/** the farthest is deepestFloor + 1 */\nconst a = 1\n'),
    ).toEqual([])
    expect(
      restatements('/x.tsx', 'const a = <b>{state.deepestFloor + 1}</b>\n'),
    ).toHaveLength(1)
    expect(restatements('/x.ts', 'const a = deepestFloor + 10\n')).toEqual([])
  })

  test('only the farthestReachableFloor export in store.ts writes the rule in code', () => {
    const offenders = SOURCE_PATHS.filter(
      (path) => path !== HOME && restatements(path, RAW_SOURCES[path]!).length > 0,
    )
    expect(offenders).toEqual([])

    const home = codeOf(HOME, RAW_SOURCES[HOME]!)
    expect(home.match(RESTATEMENT)).toHaveLength(1)
    const start = home.indexOf('function farthestReachableFloor')
    const end = home.indexOf('\n}', start)
    expect(start).toBeGreaterThan(-1)
    expect(home.slice(start, end)).toMatch(RESTATEMENT)
  })

  test('the demo screen reads the export for the button and for the refusal text', () => {
    const screen = codeOf('/src/ui/RunScreen.tsx', RAW_SOURCES['/src/ui/RunScreen.tsx']!)
    expect(screen.match(/farthestReachableFloor\(game\.deepestFloor\)/g)).toHaveLength(2)
  })
})
