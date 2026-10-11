import { renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { main } from './cli.ts'
import { duplicatesGrew, loadMask, runCommentProof } from './comment-proof.ts'
import type { MaskEntry } from './comment-proof.ts'
import { capture, cleanUp, gitIn, makeTree, writeTree } from './test-utils.ts'
import { UsageError } from './usage.ts'

afterAll(cleanUp)

/** A scratch repo with `files` committed as its one commit. */
function repo(files: Record<string, string>): string {
  const root = makeTree(files)
  gitIn(root, 'init', '-q')
  gitIn(root, 'config', 'core.quotePath', 'true')
  gitIn(root, 'add', '-A')
  gitIn(root, 'commit', '-qm', 'base')
  return root
}

function proof(root: string, mask?: unknown, base = 'HEAD') {
  const maskPath =
    mask === undefined
      ? undefined
      : join(makeTree({ 'mask.json': JSON.stringify(mask) }), 'mask.json')
  const out = capture()
  const code = runCommentProof(root, base, maskPath, out.io.log)
  return { code, lines: out.lines, text: out.lines.join('\n') }
}

const entry = (file: string, old: string, next: string, count?: number): MaskEntry => ({
  file,
  old,
  new: next,
  ...(count === undefined ? {} : { count }),
})

describe('comment-proof print equality', () => {
  const FILES = {
    'src/a.ts': 'export const a = 1\nexport const s = "x"\n',
    'src/b.tsx': 'export const B = () => <p>{"x"}</p>\nexport const n = 1\n',
    'src/c.js': 'export const a = 1\nexport const s = "x"\n',
  }

  it.each(Object.keys(FILES))('passes a comment-only change in %s', (path) => {
    const root = repo(FILES)
    const text = FILES[path as keyof typeof FILES]
    writeTree(root, {
      [path]: `// a new note\n/* and a block */\n${text.replace('\n', ' // trailing\n')}`,
    })
    expect(proof(root)).toMatchObject({
      code: 0,
      lines: [`OK ${path}`, 'comment-proof: PASS, 1 changed files'],
    })
  })

  it.each([
    ['src/a.ts', 'export const a = 1', 'export const b = 1'],
    ['src/a.ts', 'export const a = 1', 'export const a = 2'],
    ['src/a.ts', '"x"', '"y"'],
    ['src/b.tsx', '<p>{"x"}</p>', '<div>{"x"}</div>'],
    ['src/b.tsx', 'n = 1', 'n = 2'],
    ['src/c.js', 'export const a = 1', 'export const b = 1'],
    ['src/c.js', 'export const a = 1', 'export const a = 2'],
    ['src/c.js', '"x"', '"y"'],
  ])('fails a changed code token in %s (%s -> %s)', (path, from, to) => {
    const root = repo(FILES)
    writeTree(root, { [path]: FILES[path as keyof typeof FILES].replace(from, to) })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${path}: code differs`)
  })

  it('names the first differing printed line', () => {
    const root = repo(FILES)
    writeTree(root, { 'src/a.ts': FILES['src/a.ts'].replace('= 1', '= 2') })
    expect(proof(root).text).toContain(
      'base `export const a = 1;`, working tree `export const a = 2;`',
    )
  })

  it('ignores a CRLF checkout', () => {
    const root = repo(FILES)
    writeTree(root, { 'src/a.ts': FILES['src/a.ts'].replace(/\n/g, '\r\n') })
    expect(proof(root)).toMatchObject({
      code: 0,
      lines: ['comment-proof: PASS, 0 changed files'],
    })
  })
})

describe('comment-proof pragmas', () => {
  const BASE = [
    '/// <reference types="vite/client" />',
    '// @ts-expect-error -- because',
    'const a: number = ""',
    '/* eslint-disable no-console */',
    'console.log(a)',
    'console.log(a) // eslint-disable-line no-console',
    '',
  ].join('\n')

  it('passes unchanged pragmas around changed prose', () => {
    const root = repo({ 'src/p.ts': BASE })
    writeTree(root, {
      'src/p.ts': `// note\n${BASE.replace('console.log(a)\n', 'console.log(a) // why\n')}`,
    })
    expect(proof(root).code).toBe(0)
  })

  it.each([
    [
      'a triple-slash directive',
      '/// <reference types="vite/client" />',
      '/// <reference types="node" />',
    ],
    [
      '@ts-expect-error',
      '// @ts-expect-error -- because',
      '// @ts-expect-error -- another reason',
    ],
    [
      'an eslint-disable block',
      '/* eslint-disable no-console */',
      '/* eslint-disable no-alert */',
    ],
    [
      'a trailing eslint-disable-line',
      '// eslint-disable-line no-console',
      '// eslint-disable-line no-alert',
    ],
    [
      'an ESLint config comment',
      '/* eslint-disable no-console */',
      '/* eslint no-console: off */',
    ],
  ])('fails a changed %s, though the printed code is equal', (_name, from, to) => {
    const root = repo({ 'src/p.ts': BASE })
    writeTree(root, { 'src/p.ts': BASE.replace(from, to) })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toContain('FAIL src/p.ts: pragma differs')
  })

  it('fails a reworded ESLint config comment and a deleted /*#__PURE__*/', () => {
    const config = 'const a = 1\n/* eslint no-console: off */\nconsole.log(a)\n'
    const root = repo({
      'src/q.ts': config,
      'src/r.ts': 'export const r = /*#__PURE__*/ f()\n',
    })
    writeTree(root, { 'src/q.ts': config.replace('off', 'warn') })
    expect(proof(root).text).toContain('FAIL src/q.ts: pragma differs')
    writeTree(root, {
      'src/q.ts': config,
      'src/r.ts': 'export const r = f()\n',
    })
    expect(proof(root).text).toContain('FAIL src/r.ts: pragma differs')
  })

  it('fails an added pragma and a removed pragma', () => {
    const root = repo({ 'src/p.ts': BASE })
    writeTree(root, { 'src/p.ts': `// @ts-ignore\n${BASE}` })
    expect(proof(root).text).toContain('FAIL src/p.ts: pragma differs')
    writeTree(root, { 'src/p.ts': BASE.replace('/* eslint-disable no-console */\n', '') })
    expect(proof(root).text).toContain('FAIL src/p.ts: pragma differs')
  })

  it('fails a pragma appended after the last pragma, or added to a file with none', () => {
    const root = repo({
      'src/p.ts': BASE,
      'src/n.ts': 'export const a = 1\nexport const b = 2\n',
    })
    writeTree(root, { 'src/p.ts': `${BASE}/* eslint-disable */\n` })
    expect(proof(root).text).toContain('FAIL src/p.ts: pragma differs')
    writeTree(root, {
      'src/p.ts': BASE,
      'src/n.ts': 'export const a = 1\n/* eslint-disable */\nexport const b = 2\n',
    })
    expect(proof(root).text).toContain('FAIL src/n.ts: pragma differs')
  })

  it('passes prose that merely mentions a pragma, changed', () => {
    const root = repo({ 'src/p.ts': '// see eslint-disable here\nconst a = 1\n' })
    writeTree(root, { 'src/p.ts': '// see eslint-disable there\nconst a = 1\n' })
    expect(proof(root).code).toBe(0)
  })

  describe('position', () => {
    const MOVABLE = [
      'const a = 1',
      '// eslint-disable-next-line no-console',
      'console.log(a)',
      'const b = 2',
      '',
    ].join('\n')

    it('fails the same pragma moved above a different statement', () => {
      const root = repo({ 'src/m.ts': MOVABLE })
      writeTree(root, {
        'src/m.ts':
          'const a = 1\nconsole.log(a)\n// eslint-disable-next-line no-console\nconst b = 2\n',
      })
      const { code, text } = proof(root)
      expect(code).toBe(1)
      expect(text).toContain('FAIL src/m.ts: pragma differs')
    })

    it('passes a comment-only edit elsewhere in the file, which shifts no token', () => {
      const root = repo({ 'src/m.ts': MOVABLE })
      writeTree(root, {
        'src/m.ts': `// a long new note\n// over two lines\n${MOVABLE}// the end\n`,
      })
      expect(proof(root).code).toBe(0)
    })

    // A JSDoc comment is not walked, so rewording it moves no token (and so no later pragma).
    it('passes a reworded JSDoc comment above a later pragma', () => {
      const doc = (text: string) =>
        `/** ${text} */
export function f() {}
// eslint-disable-next-line no-console
console.log(f)
`
      const root = repo({ 'src/j.ts': doc('one two three {@link f} and more words') })
      writeTree(root, { 'src/j.ts': doc('one') })
      expect(proof(root)).toMatchObject({
        code: 0,
        lines: ['OK src/j.ts', 'comment-proof: PASS, 1 changed files'],
      })
    })
  })
})

describe('comment-proof file set', () => {
  const BASE = {
    '.gitignore': '.DS_Store\n*.local\n',
    'src/a.ts': 'export const a = 1\n',
    'src/index.css': 'body { margin: 0; }\n',
    'vite.config.ts': 'export default { a: 1 }\n',
  }

  it('fails an untracked file that git does not ignore, as added', () => {
    const root = repo(BASE)
    writeTree(root, { 'src/new.ts': 'export const n = 1\n' })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toContain('FAIL src/new.ts: added')
  })

  it('fails a deleted file, as deleted', () => {
    const root = repo(BASE)
    rmSync(join(root, 'src/a.ts'))
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toContain('FAIL src/a.ts: deleted')
  })

  it('fails a renamed file as both deleted and added', () => {
    const root = repo(BASE)
    renameSync(join(root, 'src/a.ts'), join(root, 'src/b.ts'))
    const { text } = proof(root)
    expect(text).toContain('FAIL src/a.ts: deleted')
    expect(text).toContain('FAIL src/b.ts: added')
  })

  it('fails a deleted file that git still tracks in its index', () => {
    const root = repo(BASE)
    rmSync(join(root, 'src/a.ts'))
    gitIn(root, 'add', '-A')
    expect(proof(root).text).toContain('FAIL src/a.ts: deleted')
  })

  it('does not fail on files git ignores', () => {
    const root = repo(BASE)
    writeTree(root, {
      'src/.DS_Store': 'junk',
      'src/x.local': 'junk',
      'src/deep/.DS_Store': 'junk',
    })
    expect(proof(root)).toMatchObject({ code: 0 })
  })

  it('does not fail on an unchanged file with a non-ASCII name', () => {
    const root = repo({ ...BASE, 'src/ünï.ts': 'export const u = 1\n' })
    expect(proof(root)).toMatchObject({ code: 0 })
    writeTree(root, { 'src/ünï.ts': '// note\nexport const u = 1\n' })
    expect(proof(root).text).toContain('OK src/ünï.ts')
  })

  it('fails a changed non-code file under the scope', () => {
    const root = repo(BASE)
    writeTree(root, { 'src/index.css': 'body { margin: 1px; }\n' })
    expect(proof(root).text).toContain('FAIL src/index.css: non-code file changed')
  })

  it('fails a code change in a config file, and ignores files outside the scope', () => {
    const root = repo({ ...BASE, 'docs/readme.md': 'a\n' })
    writeTree(root, {
      'docs/readme.md': 'b\n',
      'vite.config.ts': 'export default { a: 2 }\n',
    })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toContain('FAIL vite.config.ts: code differs')
    expect(text).not.toContain('readme')
  })

  it('reads <base> through git: an older commit works and a bad revision fails with exit 1', () => {
    const root = repo(BASE)
    writeTree(root, { 'src/a.ts': '// note\nexport const a = 1\n' })
    gitIn(root, 'commit', '-qam', 'comment')
    expect(proof(root, undefined, 'HEAD~1').code).toBe(0)
    const out = capture()
    expect(
      main(['comment-proof', 'no-such-rev', '--root', root], '/unused', out.io),
    ).toBe(1)
    expect(main(['comment-proof', 'HEAD~1', '--root', root], '/unused', out.io)).toBe(0)
  })
})

describe('comment-proof masks', () => {
  const TITLES = [
    "import { describe, it } from 'vitest'",
    "describe('thing (Phase 4 Slice D)', () => {",
    "  it('works (4.1-H2c)', () => {})",
    '})',
    '',
  ].join('\n')
  const FILE = 'src/t.test.ts'
  const MASK = [
    entry(FILE, 'thing (Phase 4 Slice D)', 'thing'),
    entry(FILE, 'works (4.1-H2c)', 'works'),
  ]
  const REWORDED = TITLES.replace(' (Phase 4 Slice D)', '').replace(' (4.1-H2c)', '')

  it('passes listed title changes and prints each masked pair', () => {
    const root = repo({ [FILE]: TITLES })
    writeTree(root, { [FILE]: REWORDED })
    expect(proof(root, MASK).lines).toEqual([
      `OK ${FILE} (masked 2)`,
      '  "thing (Phase 4 Slice D)" -> "thing"',
      '  "works (4.1-H2c)" -> "works"',
      'comment-proof: PASS, 1 changed files',
    ])
  })

  it('fails a title change that is not listed', () => {
    const root = repo({ [FILE]: TITLES })
    writeTree(root, { [FILE]: REWORDED.replace("'works'", "'works well'") })
    const { code, text } = proof(root, MASK)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${FILE}`)
  })

  it('fails a listed entry whose old text is not in the changed file', () => {
    const root = repo({ [FILE]: TITLES })
    writeTree(root, { [FILE]: `// note\n${TITLES}` })
    const { code, text } = proof(root, [entry(FILE, 'absent', 'present')])
    expect(code).toBe(1)
    expect(text).toContain(
      `FAIL ${FILE}: mask entry "absent" -> "present" expects 1 in the base, found 0`,
    )
  })

  it('fails an entry for an unchanged file, and for a path in neither file set', () => {
    const root = repo({ [FILE]: TITLES, 'src/other.ts': 'export const o = 1\n' })
    writeTree(root, { 'src/other.ts': '// note\nexport const o = 1\n' })
    const unchanged = proof(root, [entry(FILE, 'thing (Phase 4 Slice D)', 'thing')])
    expect(unchanged.code).toBe(1)
    expect(unchanged.text).toContain(`FAIL ${FILE}: mask entry`)
    const missing = proof(root, [entry('src/nowhere.ts', 'a', 'b')])
    expect(missing.code).toBe(1)
    expect(missing.text).toContain('FAIL src/nowhere.ts: mask entry')
  })

  it('fails an entry written with backslash separators instead of skipping it', () => {
    const root = repo({ [FILE]: TITLES })
    writeTree(root, { [FILE]: REWORDED })
    const { code, text } = proof(
      root,
      MASK.map((e) => ({ ...e, file: 'src\\t.test.ts' })),
    )
    expect(code).toBe(1)
    expect(text).toContain('FAIL src\\t.test.ts: mask entry')
  })

  it('fails an entry that would be consumed twice at count 1, and passes it at count 2', () => {
    const twice = [
      "describe('a', () => {",
      "  it('same (Phase 1)', () => {})",
      "  it('same (Phase 1)', () => {})",
      '})',
      '',
    ].join('\n')
    const reworded = twice.replace(/ \(Phase 1\)/g, '')
    const root = repo({ [FILE]: twice })
    writeTree(root, { [FILE]: reworded })
    expect(proof(root, [entry(FILE, 'same (Phase 1)', 'same')]).text).toContain(
      'expects 1 in the base, found 2',
    )
    // The base already had the duplicate, so rewording both copies adds none.
    expect(proof(root, [entry(FILE, 'same (Phase 1)', 'same', 2)]).code).toBe(0)
  })

  it('passes a title requoted by the formatter', () => {
    const root = repo({ [FILE]: "it('works (4.1-H2c)', () => {})\n" })
    writeTree(root, { [FILE]: 'it("it\'s fine", () => {})\n' })
    expect(proof(root, [entry(FILE, 'works (4.1-H2c)', "it's fine")]).code).toBe(0)
  })

  it('masks a template part and a non-title literal and prints them', () => {
    const base = 'it(`a ${n} (Phase 4)`, () => {})\nexport const t = `// one\n// two\n`\n'
    const head = 'it(`a ${n}`, () => {})\nexport const t = `one\ntwo\n`\n'
    const root = repo({ [FILE]: base })
    writeTree(root, { [FILE]: head })
    const mask = [
      entry(FILE, ' (Phase 4)', ''),
      entry(FILE, '// one\n// two\n', 'one\ntwo\n'),
    ]
    const { code, lines } = proof(root, mask)
    expect(code).toBe(0)
    expect(lines[0]).toBe(`OK ${FILE} (masked 2)`)
    expect(lines).toContain('  " (Phase 4)" -> ""')
  })

  describe('keyed by the new text', () => {
    const CHEAT = [
      "describe('cheat-death (Phase 4 Slice D, Last Stand)', () => {",
      "  it('x', () => { const k = { kind: 'cheat-death' } })",
      '})',
      '',
    ].join('\n')
    const cheat = entry(FILE, 'cheat-death (Phase 4 Slice D, Last Stand)', 'cheat-death')

    it('passes a title whose new text already exists as another literal in the file', () => {
      const root = repo({ [FILE]: CHEAT })
      writeTree(root, { [FILE]: CHEAT.replace(' (Phase 4 Slice D, Last Stand)', '') })
      expect(proof(root, [cheat]).code).toBe(0)
    })

    it('fails the same diff when it also changes that other literal', () => {
      const root = repo({ [FILE]: CHEAT })
      writeTree(root, {
        [FILE]: CHEAT.replace(' (Phase 4 Slice D, Last Stand)', '').replace(
          "kind: 'cheat-death'",
          "kind: 'other'",
        ),
      })
      const { code, text } = proof(root, [cheat])
      expect(code).toBe(1)
      expect(text).toContain(
        `FAIL ${FILE}: mask: "cheat-death" occurs 1 times in the working tree, expected 2`,
      )
    })

    it('fails when an unlisted literal becomes the new text while the title keeps its old text', () => {
      const root = repo({ [FILE]: CHEAT })
      writeTree(root, { [FILE]: CHEAT.replace("kind: 'cheat-death'", "kind: 'other'") })
      expect(proof(root, [cheat]).code).toBe(1)
    })

    const CONVERGE = (inOne: boolean) =>
      [
        "describe('x', () => {",
        "  it('a (Phase 1)', () => {})",
        ...(inOne
          ? ["  it('a (Phase 2)', () => {})", '})']
          : ['})', "describe('y', () => {", "  it('a (Phase 2)', () => {})", '})']),
        '',
      ].join('\n')
    const converge = [entry(FILE, 'a (Phase 1)', 'a'), entry(FILE, 'a (Phase 2)', 'a')]

    it('passes two old titles reworded to one title under different describes', () => {
      const root = repo({ [FILE]: CONVERGE(false) })
      writeTree(root, { [FILE]: CONVERGE(false).replace(/ \(Phase \d\)/g, '') })
      expect(proof(root, converge)).toMatchObject({ code: 0 })
    })

    it('fails them as a duplicate name under one describe', () => {
      const root = repo({ [FILE]: CONVERGE(true) })
      writeTree(root, { [FILE]: CONVERGE(true).replace(/ \(Phase \d\)/g, '') })
      const { code, text } = proof(root, converge)
      expect(code).toBe(1)
      expect(text).toContain(`FAIL ${FILE}: duplicate test name: "x > a"`)
    })
  })

  describe('usage errors', () => {
    it.each([
      [
        'two entries with the same file and old',
        [entry('a.ts', 'x', 'y'), entry('a.ts', 'x', 'z')],
      ],
      ['a chain', [entry('a.ts', 'x', 'y'), entry('a.ts', 'y', 'z')]],
      ['a swap', [entry('a.ts', 'x', 'y'), entry('a.ts', 'y', 'x')]],
      ['an entry that maps to itself', [entry('a.ts', 'x', 'x')]],
      ['a missing field', [{ file: 'a.ts', old: 'x' }]],
      ['a count of 0', [entry('a.ts', 'x', 'y', 0)]],
      ['an object instead of an array', { file: 'a.ts' }],
    ])('rejects %s before reading any file', (_name, mask) => {
      const path = join(makeTree({ 'mask.json': JSON.stringify(mask) }), 'mask.json')
      expect(() => loadMask(path)).toThrow(UsageError)
      const root = repo({ 'src/a.ts': 'export const a = 1\n' })
      const out = capture()
      expect(
        main(
          ['comment-proof', 'HEAD', '--mask', path, '--root', root],
          '/unused',
          out.io,
        ),
      ).toBe(2)
    })

    it('rejects a mask file that is missing or not JSON', () => {
      const dir = makeTree({ 'bad.json': '{' })
      expect(() => loadMask(join(dir, 'bad.json'))).toThrow(UsageError)
      expect(() => loadMask(join(dir, 'none.json'))).toThrow(UsageError)
    })

    it('accepts a count for the same old text mapped to the same new text', () => {
      const path = join(
        makeTree({ 'mask.json': JSON.stringify([entry('a.ts', 'x', 'y', 2)]) }),
        'mask.json',
      )
      expect(loadMask(path)).toHaveLength(1)
    })
  })
})

describe('comment-proof syntax errors', () => {
  const BASE = 'export function f(x: number) {\n  return x\n}\n'

  it('fails a stray token the parser skips, naming the file and the reason', () => {
    const root = repo({ 'src/s.ts': BASE })
    writeTree(root, { 'src/s.ts': BASE.replace('return x', 'return x\n  )') })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toMatch(/FAIL src\/s\.ts: syntax error in the working tree at line 3: /)
  })

  it('fails a file that was already broken in the base', () => {
    const root = repo({ 'src/s.ts': BASE.replace('return x', 'return x\n  )') })
    writeTree(root, { 'src/s.ts': `// note\n${BASE}` })
    expect(proof(root).text).toMatch(
      /FAIL src\/s\.ts: syntax error in the base at line 3: /,
    )
  })

  it('passes a comment-only change to a declaration file', () => {
    const root = repo({ 'src/x.d.ts': 'declare const p: number\n' })
    writeTree(root, { 'src/x.d.ts': '// shim\ndeclare const p: number\n' })
    expect(proof(root).code).toBe(0)
  })

  it('fails a stray token in a declaration file, naming the file', () => {
    const root = repo({ 'src/x.d.ts': '// shim\ndeclare const p: number\n' })
    writeTree(root, { 'src/x.d.ts': '// shim\ndeclare const p: number\n)\n' })
    const { code, text } = proof(root)
    expect(code).toBe(1)
    expect(text).toMatch(
      /FAIL src\/x\.d\.ts: syntax error in the working tree at line 3: /,
    )
  })

  it('passes a comment-only change in the same file', () => {
    const root = repo({ 'src/s.ts': BASE })
    writeTree(root, { 'src/s.ts': BASE.replace('return x', '// why\n  return x') })
    expect(proof(root).code).toBe(0)
  })
})

describe('duplicatesGrew', () => {
  it('fails when the excess copies grow but the duplicated names do not', () => {
    expect(duplicatesGrew(['t', 't'], ['t', 't', 't'])).toBe(true)
  })

  it('fails when the duplicated names grow but the excess copies do not', () => {
    expect(duplicatesGrew(['t', 't', 't'], ['t', 't', 'u', 'u'])).toBe(true)
  })

  it('passes when neither grows', () => {
    expect(duplicatesGrew(['t', 't'], ['t', 't'])).toBe(false)
  })
})

describe('comment-proof duplicate names', () => {
  const FILE = 'src/d.test.ts'

  it('does not fail a duplicate the base already had', () => {
    const base =
      "describe('a', () => {\n  it('same', () => {})\n  it('same', () => {})\n})\n"
    const root = repo({ [FILE]: base })
    writeTree(root, { [FILE]: `// note\n${base}` })
    expect(proof(root).code).toBe(0)
  })

  it('does not count the same title under two describes as a duplicate', () => {
    const base =
      "describe('a', () => { it('t', () => {}) })\ndescribe('b', () => { it('t', () => {}) })\n"
    const root = repo({ [FILE]: base })
    writeTree(root, { [FILE]: `// note\n${base}` })
    expect(proof(root).code).toBe(0)
  })
})
