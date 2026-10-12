import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { main } from './cli.ts'
import { runCommentProof } from './comment-proof.ts'
import { caseCollisions, loadRenames } from './renames.ts'
import type { RenameFile, RenameName, Renames } from './renames.ts'
import { capture, cleanUp, gitIn, makeTree, writeTree } from './test-utils.ts'
import { UsageError } from './usage.ts'

afterAll(cleanUp)

function repo(files: Record<string, string>): string {
  const root = makeTree(files)
  gitIn(root, 'init', '-q')
  gitIn(root, 'config', 'core.quotePath', 'true')
  gitIn(root, 'add', '-A')
  gitIn(root, 'commit', '-qm', 'base')
  return root
}

function proof(root: string, renames?: unknown, mask?: unknown) {
  const written = (name: string, value: unknown) =>
    join(makeTree({ [name]: JSON.stringify(value) }), name)
  const out = capture()
  const code = runCommentProof(
    root,
    'HEAD',
    mask === undefined ? undefined : written('mask.json', mask),
    out.io.log,
    renames === undefined ? undefined : written('renames.json', renames),
  )
  return { code, lines: out.lines, text: out.lines.join('\n') }
}

const FIXTURE_OLD = 'src/golden-h9z-a.fixture.ts'
const FIXTURE_NEW = 'src/golden-tick-a.fixture.ts'
const TEST_OLD = 'src/golden-h9z-a.test.ts'
const TEST_NEW = 'src/golden-tick-a.test.ts'

const BASE = {
  [FIXTURE_OLD]: [
    "export const FIXTURE_OLD = { id: 'h9z-one', name: 'plain' }",
    "export const SECOND = 'h9z-two'",
    '',
  ].join('\n'),
  [TEST_OLD]: [
    "import { FIXTURE_OLD } from './golden-h9z-a.fixture'",
    "import { describe, it } from 'vitest'",
    "describe('thing', () => { it('works', () => { void FIXTURE_OLD }) })",
    '',
  ].join('\n'),
  'src/other.ts': "export const OTHER = 'plain'\n",
}

/** The base's two files after the rename: moved, specifier, identifier and id rewritten. */
const HEAD = {
  [FIXTURE_NEW]: BASE[FIXTURE_OLD].replace('FIXTURE_OLD', 'FIXTURE_NEW').replace(
    'h9z-one',
    'tick-one',
  ),
  [TEST_NEW]: BASE[TEST_OLD].replaceAll('FIXTURE_OLD', 'FIXTURE_NEW').replace(
    'golden-h9z-a',
    'golden-tick-a',
  ),
}

function moved(): string {
  const root = repo(BASE)
  renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
  renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
  writeTree(root, HEAD)
  return root
}

const FILES: RenameFile[] = [
  { old: FIXTURE_OLD, new: FIXTURE_NEW, imports: 1 },
  { old: TEST_OLD, new: TEST_NEW },
]
const IDENTIFIERS: RenameName[] = [
  { file: FIXTURE_NEW, old: 'FIXTURE_OLD', new: 'FIXTURE_NEW' },
  { file: TEST_NEW, old: 'FIXTURE_OLD', new: 'FIXTURE_NEW', count: 2 },
]
const LITERALS: RenameName[] = [{ file: FIXTURE_NEW, old: 'h9z-one', new: 'tick-one' }]
const MAP: Renames = { files: FILES, identifiers: IDENTIFIERS, literals: LITERALS }
const withMap = (patch: Partial<Renames>): Renames => ({ ...MAP, ...patch })

describe('comment-proof --renames, a rename that is listed', () => {
  it('passes the pair, the importer specifier, the identifier and the id, and prints each', () => {
    const { code, lines } = proof(moved(), MAP)
    expect(lines).toEqual([
      `OK ${FIXTURE_NEW} (renamed from ${FIXTURE_OLD}; imports 1; identifiers 1; literals 1)`,
      '  identifier FIXTURE_OLD -> FIXTURE_NEW',
      '  literal "h9z-one" -> "tick-one"',
      `OK ${TEST_NEW} (renamed from ${TEST_OLD}; imports 0; identifiers 2)`,
      '  identifier FIXTURE_OLD -> FIXTURE_NEW (x2)',
      'comment-proof: PASS, 2 changed files',
    ])
    expect(code).toBe(0)
  })

  it('fails the same tree without the option, as deleted and added', () => {
    const { code, text } = proof(moved())
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${FIXTURE_OLD}: deleted`)
    expect(text).toContain(`FAIL ${FIXTURE_NEW}: added`)
  })

  it('passes a renamed file whose text is identical, only through its entry', () => {
    const root = repo({ 'src/aa-h9z.ts': 'export const a = 1\n' })
    renameSync(join(root, 'src/aa-h9z.ts'), join(root, 'src/aa-tick.ts'))
    expect(proof(root).code).toBe(1)
    const map = { files: [{ old: 'src/aa-h9z.ts', new: 'src/aa-tick.ts' }] }
    expect(proof(root, map)).toMatchObject({
      code: 0,
      lines: [
        'OK src/aa-tick.ts (renamed from src/aa-h9z.ts; imports 0)',
        'comment-proof: PASS, 1 changed files',
      ],
    })
  })

  it('composes with a mask in the same file', () => {
    const root = moved()
    writeTree(root, {
      [TEST_NEW]: HEAD[TEST_NEW].replace("it('works'", "it('works fine'"),
    })
    expect(proof(root, MAP).code).toBe(1)
    const mask = [{ file: TEST_NEW, old: 'works', new: 'works fine' }]
    expect(proof(root, MAP, mask).code).toBe(0)
  })

  it('passes a comment-only edit in a renamed file', () => {
    const root = moved()
    writeTree(root, { [FIXTURE_NEW]: `// new note\n${HEAD[FIXTURE_NEW]}` })
    expect(proof(root, MAP).code).toBe(0)
  })
})

describe('comment-proof --renames, what it still refuses', () => {
  it('fails a planted code change in a renamed file, naming it', () => {
    const root = moved()
    writeTree(root, { [FIXTURE_NEW]: HEAD[FIXTURE_NEW].replace("'plain'", "'changed'") })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${FIXTURE_NEW}: code differs`)
  })

  it('fails a rename that is not listed', () => {
    const { code, text } = proof(moved(), withMap({ files: [FILES[0]] }))
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${TEST_OLD}: deleted`)
    expect(text).toContain(`FAIL ${TEST_NEW}: added`)
    expect(text).not.toContain(`FAIL ${FIXTURE_NEW}: added`)
  })

  it.each([
    [
      'an old file that is still in the working tree',
      'src/other.ts',
      'src/other-moved.ts',
      'src/other.ts is still in the working tree',
    ],
    [
      'an old file that is not in the base',
      'src/none.ts',
      'src/none-moved.ts',
      'src/none.ts is not in HEAD',
    ],
  ])('fails a file entry for %s', (_name, from, to, reason) => {
    const { code, text } = proof(
      moved(),
      withMap({ files: [...FILES, { old: from, new: to }] }),
    )
    expect(code).toBe(1)
    expect(text).toContain(
      `FAIL ${to}: renames entry ${from} -> ${to} not consumed (${reason})`,
    )
  })

  it('fails a deleted file listed as renamed to a file that does not exist', () => {
    const root = repo({ 'src/a.ts': 'export const a = 1\n' })
    rmSync(join(root, 'src/a.ts'))
    const { code, text } = proof(root, { files: [{ old: 'src/a.ts', new: 'src/c.ts' }] })
    expect(code).toBe(1)
    expect(text).toContain('src/c.ts is not in the working tree')
  })

  it('fails a pair whose new file is already in the base', () => {
    const root = repo({
      'src/a.ts': 'export const a = 1\n',
      'src/b.ts': 'export const b = 1\n',
    })
    rmSync(join(root, 'src/a.ts'))
    const { text } = proof(root, { files: [{ old: 'src/a.ts', new: 'src/b.ts' }] })
    expect(text).toContain(
      'FAIL src/b.ts: renames entry src/a.ts -> src/b.ts not consumed (src/b.ts is already in HEAD)',
    )
  })

  it('fails a pair that changes directory or extension, or is not code', () => {
    const root = repo({ 'src/a.ts': 'export const a = 1\n', 'src/n.json': '{}\n' })
    renameSync(join(root, 'src/a.ts'), join(root, 'src/b.tsx'))
    expect(
      proof(root, { files: [{ old: 'src/a.ts', new: 'src/b.tsx' }] }).text,
    ).toContain('the extension changes')
    renameSync(join(root, 'src/b.tsx'), join(root, 'src/b.ts'))
    mkdirSync(join(root, 'src/deep'))
    renameSync(join(root, 'src/b.ts'), join(root, 'src/deep/b.ts'))
    expect(
      proof(root, { files: [{ old: 'src/a.ts', new: 'src/deep/b.ts' }] }).text,
    ).toContain('the directory changes')
    renameSync(join(root, 'src/deep/b.ts'), join(root, 'src/b.ts'))
    renameSync(join(root, 'src/n.json'), join(root, 'src/m.json'))
    expect(
      proof(root, { files: [{ old: 'src/n.json', new: 'src/m.json' }] }).text,
    ).toContain('not a code file')
  })

  it('fails an identifier entry whose count is too high, or too low', () => {
    for (const count of [3, 1]) {
      const { code, text } = proof(
        moved(),
        withMap({
          identifiers: [IDENTIFIERS[0], { ...IDENTIFIERS[1], count }],
        }),
      )
      expect(code, String(count)).toBe(1)
      expect(text).toContain(`FAIL ${TEST_NEW}: renames identifier FIXTURE_OLD`)
    }
  })

  it('fails an identifier entry and a literal entry for a file that did not change', () => {
    const root = moved()
    const a = proof(
      root,
      withMap({
        identifiers: [
          ...IDENTIFIERS,
          { file: 'src/other.ts', old: 'OTHER', new: 'ELSE' },
        ],
      }),
    )
    expect(a.text).toContain(
      'FAIL src/other.ts: renames identifier OTHER -> ELSE not consumed',
    )
    const b = proof(
      root,
      withMap({
        literals: [...LITERALS, { file: 'src/other.ts', old: 'plain', new: 'x' }],
      }),
    )
    expect(b.text).toContain(
      'FAIL src/other.ts: renames literal "plain" -> "x" not consumed',
    )
  })

  it('fails a literal entry whose old text is not in the file, or occurs more often', () => {
    const absent = proof(
      moved(),
      withMap({ literals: [{ file: FIXTURE_NEW, old: 'h9z-zzz', new: 'tick-zzz' }] }),
    )
    expect(absent.text).toContain('expects 1 in the base, found 0')
    const root = repo({
      ...BASE,
      [FIXTURE_OLD]: `${BASE[FIXTURE_OLD]}export const COPY = 'h9z-one'\n`,
    })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, {
      ...HEAD,
      [FIXTURE_NEW]: `${HEAD[FIXTURE_NEW]}export const COPY = 'tick-one'\n`,
    })
    expect(proof(root, MAP).text).toContain('expects 1 in the base, found 2')
  })
})

describe('comment-proof --renames, specifiers', () => {
  it('fails when the entry says 0 or 2 importers and the tree has 1', () => {
    for (const imports of [0, 2]) {
      const { code, text } = proof(
        moved(),
        withMap({ files: [{ ...FILES[0], imports }, FILES[1]] }),
      )
      expect(code, String(imports)).toBe(1)
      expect(text).toContain(`expects ${imports} importing specifiers, found 1`)
    }
  })

  it('fails when the base has more importers than the entry says, and the working tree matches it', () => {
    const root = repo({ ...BASE, 'src/user.ts': "import './golden-h9z-a.fixture'\n" })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, { ...HEAD, 'src/user.ts': '// no longer imports it\n' })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(
      `FAIL ${FIXTURE_NEW}: renames entry ${FIXTURE_OLD} -> ${FIXTURE_NEW} expects 1 importing specifiers, found 2 in the base and 1 in the working tree`,
    )
  })

  it('fails when the working tree has more importers than the entry says, and the base matches it', () => {
    const root = repo({ ...BASE, 'src/user.ts': 'export const u = 1\n' })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, { ...HEAD, 'src/user.ts': "import './golden-tick-a.fixture'\n" })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(
      `FAIL ${FIXTURE_NEW}: renames entry ${FIXTURE_OLD} -> ${FIXTURE_NEW} expects 1 importing specifiers, found 1 in the base and 2 in the working tree`,
    )
  })

  it('fails an importer that keeps the old specifier', () => {
    const root = moved()
    writeTree(root, {
      [TEST_NEW]: HEAD[TEST_NEW].replace('golden-tick-a', 'golden-h9z-a'),
    })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${TEST_NEW}: imports ${FIXTURE_OLD}, which was renamed`)
  })

  it('fails an unchanged importer that still names the old file', () => {
    const root = repo({ ...BASE, 'src/user.ts': "import './golden-h9z-a.fixture'\n" })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, HEAD)
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL src/user.ts: imports ${FIXTURE_OLD}, which was renamed`)
  })

  it('fails a specifier that points at a name that is not listed', () => {
    const root = moved()
    writeTree(root, {
      [TEST_NEW]: HEAD[TEST_NEW].replace('golden-tick-a', 'golden-tick-b'),
    })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${TEST_NEW}: code differs`)
  })

  it('passes a specifier written with the extension, and counts a type import', () => {
    const root = repo({
      ...BASE,
      [TEST_OLD]: "import type { FIXTURE_OLD } from './golden-h9z-a.fixture.ts'\n",
    })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, {
      ...HEAD,
      [TEST_NEW]: "import type { FIXTURE_NEW } from './golden-tick-a.fixture.ts'\n",
    })
    expect(
      proof(
        root,
        withMap({ identifiers: [IDENTIFIERS[0], { ...IDENTIFIERS[1], count: 1 }] }),
      ).code,
    ).toBe(0)
  })
})

describe('comment-proof --renames, identifiers', () => {
  it('names an identifier that occurs more often in the working tree than the entry says', () => {
    const root = moved()
    writeTree(root, {
      [FIXTURE_NEW]: `${HEAD[FIXTURE_NEW]}export const EXTRA = FIXTURE_NEW\n`,
    })
    expect(proof(root, MAP).text).toContain(
      `FAIL ${FIXTURE_NEW}: renames: identifier FIXTURE_NEW occurs 2 times in the working tree, expected 1`,
    )
  })

  it('fails a second identifier renamed outside the map', () => {
    const root = moved()
    writeTree(root, { [FIXTURE_NEW]: HEAD[FIXTURE_NEW].replace('SECOND', 'THIRD') })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${FIXTURE_NEW}: code differs`)
  })

  it('passes an aliased import that renames only the imported name', () => {
    const base = {
      [FIXTURE_OLD]: BASE[FIXTURE_OLD],
      [TEST_OLD]:
        "import { FIXTURE_OLD as CFG } from './golden-h9z-a.fixture'\nexport const a = CFG\n",
    }
    const head = {
      [FIXTURE_NEW]: HEAD[FIXTURE_NEW],
      [TEST_NEW]:
        "import { FIXTURE_NEW as CFG } from './golden-tick-a.fixture'\nexport const a = CFG\n",
    }
    const make = (tail: string) => {
      const root = repo(base)
      renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
      renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
      writeTree(root, {
        ...head,
        [TEST_NEW]: head[TEST_NEW].replace('export const a = CFG\n', tail),
      })
      return root
    }
    const map = withMap({
      identifiers: [IDENTIFIERS[0], { ...IDENTIFIERS[1], count: 1 }],
    })
    expect(proof(make('export const a = CFG\n'), map).code).toBe(0)
    // The alias dropped: the uses of CFG change too.
    const dropped = repo(base)
    renameSync(join(dropped, FIXTURE_OLD), join(dropped, FIXTURE_NEW))
    renameSync(join(dropped, TEST_OLD), join(dropped, TEST_NEW))
    writeTree(dropped, {
      ...head,
      [TEST_NEW]:
        "import { FIXTURE_NEW } from './golden-tick-a.fixture'\nexport const a = FIXTURE_NEW\n",
    })
    expect(proof(dropped, map).code).toBe(1)
  })

  it.each([
    [
      'in the same file',
      'src/golden-tick-a.fixture.ts',
      'export const FIXTURE_NEW = 0\n',
    ],
    ['in another file', 'src/other.ts', 'export const FIXTURE_NEW = 0\n'],
  ])(
    'fails a new identifier that is already an identifier in the base, %s',
    (_n, file, add) => {
      const root = repo({
        ...BASE,
        [file === FIXTURE_NEW ? FIXTURE_OLD : file]:
          (file === FIXTURE_NEW ? BASE[FIXTURE_OLD] : BASE['src/other.ts']) + add,
      })
      renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
      renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
      writeTree(root, {
        ...HEAD,
        ...(file === FIXTURE_NEW ? { [FIXTURE_NEW]: HEAD[FIXTURE_NEW] + add } : {}),
      })
      const { code, text } = proof(root, MAP)
      expect(code).toBe(1)
      expect(text).toContain('new identifier "FIXTURE_NEW" already exists in HEAD')
    },
  )

  it('does not call a new identifier that only a comment names a collision', () => {
    const root = repo({
      ...BASE,
      'src/other.ts': `// FIXTURE_NEW is planned\n${BASE['src/other.ts']}`,
    })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, HEAD)
    expect(proof(root, MAP).code).toBe(0)
  })
})

describe('comment-proof --renames, literals', () => {
  it('names a literal that occurs more often in the working tree than the entry says', () => {
    const root = moved()
    writeTree(root, {
      [FIXTURE_NEW]: `${HEAD[FIXTURE_NEW]}export const EXTRA = 'tick-one'\n`,
    })
    expect(proof(root, MAP).text).toContain(
      `FAIL ${FIXTURE_NEW}: renames: literal "tick-one" occurs 2 times in the working tree, expected 1`,
    )
  })

  it('fails an id changed outside the map', () => {
    const root = moved()
    writeTree(root, { [FIXTURE_NEW]: HEAD[FIXTURE_NEW].replace('h9z-two', 'tick-two') })
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(`FAIL ${FIXTURE_NEW}: code differs`)
  })

  it('fails a new literal that already exists in the base as a literal', () => {
    const root = repo({ ...BASE, 'src/other.ts': "export const OTHER = 'tick-one'\n" })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, HEAD)
    const { code, text } = proof(root, MAP)
    expect(code).toBe(1)
    expect(text).toContain(
      `FAIL ${FIXTURE_NEW}: new literal "tick-one" already exists in HEAD`,
    )
  })

  it('does not call a new literal that only a comment holds a collision', () => {
    const root = repo({
      ...BASE,
      'src/other.ts': `// 'tick-one' later\n${BASE['src/other.ts']}`,
    })
    renameSync(join(root, FIXTURE_OLD), join(root, FIXTURE_NEW))
    renameSync(join(root, TEST_OLD), join(root, TEST_NEW))
    writeTree(root, HEAD)
    expect(proof(root, MAP).code).toBe(0)
  })

  it('reads a template part and a masked regex literal', () => {
    const root = repo({
      'src/t.ts': 'export const a = `h9z-${1}`\nexport const r = /old text/\n',
    })
    writeTree(root, {
      'src/t.ts': 'export const a = `tick-${1}`\nexport const r = /new text/\n',
    })
    const map = { files: [], literals: [{ file: 'src/t.ts', old: 'h9z-', new: 'tick-' }] }
    expect(proof(root, map).text).toContain('code differs')
    const mask = [{ file: 'src/t.ts', old: '/old text/', new: '/new text/' }]
    expect(proof(root, map, mask).code).toBe(0)
    writeTree(root, {
      'src/t.ts': 'export const a = `tick-${1}`\nexport const r = /other/\n',
    })
    expect(proof(root, map, mask).code).toBe(1)
  })

  it('fails a renamed file whose text is identical but one literal differs unlisted', () => {
    const root = moved()
    writeTree(root, { [TEST_NEW]: HEAD[TEST_NEW].replace("'thing'", "'things'") })
    expect(proof(root, MAP).text).toContain(`FAIL ${TEST_NEW}: code differs`)
  })
})

describe('comment-proof --renames, the file set', () => {
  it('lists a path that differs from another only in case', () => {
    expect(caseCollisions(['src/b.ts', 'src/a.ts', 'src/B.ts'])).toEqual([
      ['src/b.ts', 'src/B.ts'],
    ])
    expect(caseCollisions(['src/a.ts', 'src/a-b.ts', 'src/ab.ts'])).toEqual([])
  })

  it('fails a base that already holds two paths differing only in case', () => {
    const root = repo({ 'src/a-h9z.ts': 'export const a = 1\n' })
    // Both paths go into the commit through the index, so no case-insensitive checkout is needed.
    const blob = gitIn(root, 'rev-parse', 'HEAD:src/a-h9z.ts')
    gitIn(root, 'update-index', '--add', '--cacheinfo', `100644,${blob},src/A-H9Z.ts`)
    gitIn(root, 'commit', '-qm', 'two')
    const { code, text } = proof(root, { files: [] })
    expect(code).toBe(1)
    expect(text).toContain('only in case')
  })

  it('fails a pragma moved in a renamed file', () => {
    const base = {
      'src/p-h9z.ts': '// @ts-expect-error -- x\nconst a: number = ""\nexport { a }\n',
    }
    const root = repo(base)
    renameSync(join(root, 'src/p-h9z.ts'), join(root, 'src/p-tick.ts'))
    writeTree(root, {
      'src/p-tick.ts': 'const a: number = ""\n// @ts-expect-error -- x\nexport { a }\n',
    })
    const { code, text } = proof(root, {
      files: [{ old: 'src/p-h9z.ts', new: 'src/p-tick.ts' }],
    })
    expect(code).toBe(1)
    expect(text).toContain('FAIL src/p-tick.ts: pragma differs')
  })
})

describe('loadRenames', () => {
  const load = (value: unknown) =>
    loadRenames(join(makeTree({ 'r.json': JSON.stringify(value) }), 'r.json'))
  const file = (old: string, next: string) => ({ old, new: next })
  const name = (f: string, old: string, next: string, extra = {}) => ({
    file: f,
    old,
    new: next,
    ...extra,
  })

  it('reads a map and ignores a pins field', () => {
    const map = load({
      files: [{ ...file('a.ts', 'b.ts'), imports: 2, pins: 'what it pins' }],
      identifiers: [name('b.ts', 'X', 'Y', { count: 3, pins: 'p' })],
    })
    expect(map.files[0]).toMatchObject({ old: 'a.ts', new: 'b.ts', imports: 2 })
    expect(map.literals).toEqual([])
  })

  it.each([
    ['not an object', []],
    ['no files array', { identifiers: [] }],
    ['a missing field', { files: [{ old: 'a.ts' }] }],
    ['a file mapped to itself', { files: [file('a.ts', 'a.ts')] }],
    ['a negative imports', { files: [{ ...file('a.ts', 'b.ts'), imports: -1 }] }],
    ['a fractional imports', { files: [{ ...file('a.ts', 'b.ts'), imports: 1.5 }] }],
    [
      'two entries for one old file',
      { files: [file('a.ts', 'b.ts'), file('a.ts', 'c.ts')] },
    ],
    ['a file chain', { files: [file('a.ts', 'b.ts'), file('b.ts', 'c.ts')] }],
    ['an identifiers object', { files: [], identifiers: {} }],
    ['a missing name field', { files: [], literals: [{ file: 'a.ts', old: 'x' }] }],
    ['a name mapped to itself', { files: [], literals: [name('a.ts', 'x', 'x')] }],
    ['a count of 0', { files: [], literals: [name('a.ts', 'x', 'y', { count: 0 })] }],
    [
      'a name chain in one file',
      { files: [], literals: [name('a.ts', 'x', 'y'), name('a.ts', 'y', 'z')] },
    ],
    [
      'two entries for one old in a file',
      { files: [], literals: [name('a.ts', 'x', 'y'), name('a.ts', 'x', 'z')] },
    ],
    [
      'two literal olds to one new, in one file',
      { files: [], literals: [name('a.ts', 'x', 'z'), name('a.ts', 'y', 'z')] },
    ],
    [
      'two literal olds to one new, in two files',
      { files: [], literals: [name('a.ts', 'x', 'z'), name('b.ts', 'y', 'z')] },
    ],
    [
      'two identifier olds to one new',
      { files: [], identifiers: [name('a.ts', 'X', 'Z'), name('b.ts', 'Y', 'Z')] },
    ],
  ])('rejects %s', (_n, value) => {
    expect(() => load(value)).toThrow(UsageError)
  })

  it('accepts one old mapped to one new in two files', () => {
    const map = load({
      files: [],
      literals: [name('a.ts', 'x', 'z'), name('b.ts', 'x', 'z')],
    })
    expect(map.literals).toHaveLength(2)
  })

  it('rejects a missing or malformed file as a usage error, through the cli', () => {
    const root = repo(BASE)
    const dir = makeTree({ 'bad.json': '{' })
    for (const path of [join(dir, 'bad.json'), join(dir, 'none.json')]) {
      const out = capture()
      expect(
        main(
          ['comment-proof', 'HEAD', '--renames', path, '--root', root],
          '/unused',
          out.io,
        ),
      ).toBe(2)
    }
  })

  it('belongs to comment-proof only', () => {
    const out = capture()
    const path = join(makeTree({ 'r.json': '{"files":[]}' }), 'r.json')
    expect(main(['comments', '--renames', path], '/unused', out.io)).toBe(2)
    expect(out.errors.join('\n')).toContain('--renames belongs to comment-proof')
  })
})

describe('comment-proof --renames, layout', () => {
  const FLAT =
    "import { a, b } from './x'\nexport const o = { k: 1 }\nexport const l = [1, 2]\n"
  const WRAPPED =
    "import {\n  a,\n  b,\n} from './x'\nexport const o = {\n  k: 1,\n}\nexport const l = [\n  1, 2,\n]\n"

  it('passes a re-wrapped list and a trailing comma under --renames, and not without it', () => {
    const root = repo({ 'src/l.ts': FLAT })
    writeTree(root, { 'src/l.ts': WRAPPED })
    expect(proof(root).code).toBe(1)
    expect(proof(root, { files: [] })).toMatchObject({ code: 0 })
  })

  it('still fails a changed token, an added element and a moved statement boundary', () => {
    for (const changed of [
      WRAPPED.replace('k: 1', 'k: 2'),
      WRAPPED.replace('  1, 2,\n', '  1, 2, 3,\n'),
      WRAPPED.replace('a,\n', ''),
      `${WRAPPED}export const z = 1\n`,
    ]) {
      const root = repo({ 'src/l.ts': FLAT })
      writeTree(root, { 'src/l.ts': changed })
      expect(proof(root, { files: [] }).code, changed).toBe(1)
    }
  })

  it('does not join two statements the source kept apart', () => {
    const root = repo({ 'src/s.ts': 'const a = 1\nconst b = 2\nexport { a, b }\n' })
    writeTree(root, { 'src/s.ts': 'const a = 1\nexport { a, b }\nconst b = 2\n' })
    expect(proof(root, { files: [] }).code).toBe(1)
  })
})
