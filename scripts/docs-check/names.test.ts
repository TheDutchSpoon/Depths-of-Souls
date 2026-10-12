import { afterAll, describe, expect, it } from 'vitest'
import { main } from './cli.ts'
import { runComments } from './comments.ts'
import { capture, cleanUp, makeTree } from './test-utils.ts'

afterAll(cleanUp)

const SRC = 'export const a = 1\n'

function check(files: Record<string, string>, options = {}) {
  const root = makeTree(files)
  const out = capture()
  const code = runComments(root, options, out.io.log)
  return { code, root, text: out.lines.join('\n'), lines: out.lines }
}

const inSource = (code: string) => check({ 'src/x.ts': `${code}\n` })

describe('name guard, file names', () => {
  it.each([
    'src/engine/golden-d7-x.test.ts',
    'src/engine/__golden__/golden-h9z-x.fixture.ts',
    'src/engine/generation-g9.test.ts',
    'src/engine/golden-e-thing.test.ts',
    'src/engine/phase-4-thing.ts',
    'src/engine/slice-3.ts',
    'src/engine/d7/thing.ts',
  ])('fails %s, naming the file at line 1', (path) => {
    const { code, text } = check({ [path]: SRC })
    expect(code).toBe(1)
    expect(text).toContain(`${path}:1: pattern 18,`)
  })

  it.each([
    'src/engine/golden-1v1.test.ts',
    'src/engine/golden-6v6.ts',
    'src/engine/stable-name.ts',
    'src/engine/golden-eat.ts',
    'src/engine/phase-shift.ts',
    'src/engine/slice-of-life.ts',
    'src/engine/p1-thing.ts',
  ])('passes %s', (path) => {
    expect(check({ [path]: SRC }).code).toBe(0)
  })

  it('reaches a file that is not TypeScript', () => {
    const { code, text } = check({ 'src/ui/d7-thing.css': 'a { color: red }\n' })
    expect(code).toBe(1)
    expect(text).toContain('src/ui/d7-thing.css:1: pattern 18,')
  })

  it('reaches the two config files', () => {
    expect(check({ 'vite.config.ts': 'export const D7_THING = 1\n' }).text).toContain(
      'vite.config.ts:1: pattern 19,',
    )
    expect(check({ 'eslint.config.js': 'export const d7Thing = 1\n' }).text).toContain(
      'eslint.config.js:1: pattern 19,',
    )
  })
})

describe('name guard, identifiers', () => {
  it.each(['D7_THING', 'd7Thing', 'H2b2', 'PHASE_4_X', 'Phase4Thing', 'x_B5_y'])(
    'fails %s, wherever it is used',
    (name) => {
      for (const code of [
        `export const ${name} = 1`,
        `const o = { ${name}: 1 }\nexport const a = o.${name}`,
        `import { ${name} as y } from './z'\nexport const a = y`,
        `export type ${name} = number`,
      ]) {
        const { code: exit, text } = inSource(code)
        expect(exit, code).toBe(1)
        expect(text, code).toContain('pattern 19,')
      }
    },
  )

  it.each([
    'A2',
    'E1',
    'T98',
    'S1_SCRIPT',
    'P1',
    'O1',
    'U1',
    'R1',
    'L8',
    'E0',
    'phase',
    'sliceOf',
  ])('passes %s', (name) => {
    expect(inSource(`export const ${name} = 1`).code).toBe(0)
  })

  it('reports the line of the identifier', () => {
    expect(check({ 'src/x.ts': '\n\nexport const D7_THING = 1\n' }).text).toContain(
      'src/x.ts:3: pattern 19,',
    )
  })
})

describe('name guard, string literals', () => {
  it.each([
    "'d7-thing'",
    "'x-d7-y'",
    "'D7 thing'",
    "'e-thing'",
    '`d7-${x}`',
    '`${x}-d7-y`',
  ])('fails %s', (literal) => {
    const { code, text } = inSource(`export const a = ${literal}`)
    expect(code).toBe(1)
    expect(text).toContain('pattern 20,')
  })

  it.each([
    "'a-player-0'",
    "'hp-percent'",
    "'perk-N'",
    "'a2'",
    "'e0'",
    "'e'",
    "'e1'",
    "'1v1-fight'",
    "'x-d7'",
    "'x-j7-y'",
    "'D7'",
    '`${x}-thing`',
  ])('passes %s', (literal) => {
    expect(inSource(`export const a = ${literal}`).code).toBe(0)
  })

  it('leaves a module specifier to the file-name arm', () => {
    expect(
      inSource(
        "import './golden-d7-x'\nexport { b } from './golden-d7-y'\nawait import('./golden-d7-z')",
      ).code,
    ).toBe(0)
  })

  it('lets a test title open with a derivation label, and not carry a slice id', () => {
    const title = (text: string) =>
      check({ 'src/x.test.ts': `it(${JSON.stringify(text)}, () => {})\n` })
    expect(title('E1 ticks first').code).toBe(0)
    expect(title('D7 thing ticks').code).toBe(0)
    const { code, text } = title('d7-thing ticks')
    expect(code).toBe(1)
    expect(text).toContain('pattern 20,')
    expect(title('ticks in x-d7-y').code).toBe(1)
  })

  it('still reads a value inside a test body', () => {
    expect(
      check({ 'src/x.test.ts': "it('ok', () => { const a = 'D7 thing' })\n" }).code,
    ).toBe(1)
  })
})

describe('name guard in the comments check', () => {
  it('fails through the cli entry point, as CI runs it', () => {
    const root = makeTree({ 'src/golden-d7-x.ts': SRC })
    const out = capture()
    expect(main(['comments', '--root', root], '/unused', out.io)).toBe(1)
    expect(out.lines.join('\n')).toContain('comments: FAIL, 1 problems')
  })

  it('counts the three arms apart in --counts', () => {
    const { lines } = check(
      {
        'src/golden-d7-x.ts':
          'export const D7_THING = "d7-thing"\nexport const D7_OTHER = "x"\n',
        'src/y.ts': SRC,
      },
      { counts: true },
    )
    expect(lines.slice(-3)).toEqual([
      '     18  file names: 1 hits in 1 files',
      '     19  identifiers: 2 hits in 1 files',
      '     20  string literals: 1 hits in 1 files',
    ])
  })
})
