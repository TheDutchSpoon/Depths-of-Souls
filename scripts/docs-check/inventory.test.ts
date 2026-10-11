import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { runInventory, runInventorySkeleton, unitsOf } from './inventory.ts'
import { capture, cleanUp, gitIn, makeTree, writeTree } from './test-utils.ts'

afterAll(cleanUp)

const MAILBOX = '.claude/phases/4.5/A'
const STORE_OLD = [
  '# Spec — Store',
  '',
  '## Design',
  '',
  '### One store',
  '',
  '- First rule.',
  '- Second rule.',
  '',
  'A closing paragraph.',
  '',
].join('\n')
const SAVES_OLD = '# Spec — Saves\n\n### Versions\n\n- A save has a version.\n'
// The condensed docs: "Second rule." is gone, the headings are the New homes.
const STORE_NEW =
  '# Spec — Store\n\n## Design\n\n### One store\n\n- First rule.\n\n### Slots\n\nA closing paragraph.\n'
const SAVES_NEW = '# Spec — Saves\n\n### Versions\n'

/** A scratch repo on a branch named `trunk` (nothing here may need a local `main`). */
function repo(files: Record<string, string> = {}): string {
  const root = makeTree({
    '.claude/spec/store.md': STORE_OLD,
    '.claude/spec/saves.md': SAVES_OLD,
    ...files,
  })
  gitIn(root, 'init', '-q', '-b', 'trunk')
  gitIn(root, 'add', '-A')
  gitIn(root, 'commit', '-q', '-m', 'old docs')
  return root
}

function skeleton(root: string, files: string[], base = 'HEAD') {
  const out = capture()
  const code = runInventorySkeleton(root, MAILBOX, files, base, out.io.log)
  return { code, lines: out.lines }
}

function check(root: string) {
  const out = capture()
  const code = runInventory(root, MAILBOX, out.io.log)
  return { code, lines: out.lines, text: out.lines.join('\n') }
}

type Fill = (
  id: string,
) => Partial<Record<'decided' | 'fate' | 'home' | 'reason', string>> | null

/** Fills the skeleton's rows; a `null` from `fill` removes the row. */
function fillRows(root: string, fill: Fill): void {
  const path = join(root, MAILBOX, 'inventory.md')
  const lines = readFileSync(path, 'utf8').split('\n')
  const out = lines.flatMap((line) => {
    const m = /^\| ([^ |]+:\d+) \| (.*?) \| {2}\| {2}\| {2}\| {2}\|$/.exec(line)
    if (!m) return [line]
    const f = fill(m[1])
    if (f === null) return []
    const { decided = 'x', fate = 'kept', home = '', reason = '' } = f
    return [`| ${m[1]} | ${m[2]} | ${decided} | ${fate} | ${home} | ${reason} |`]
  })
  writeFileSync(path, out.join('\n'))
}

const KEEP: Fill = () => ({ fate: 'kept', home: '`spec/store.md#one-store`' })

/** The condense: overwrite the working-tree docs, uncommitted. */
function condense(root: string): void {
  writeTree(root, {
    '.claude/spec/store.md': STORE_NEW,
    '.claude/spec/saves.md': SAVES_NEW,
  })
}

describe('unitsOf: the unit definition', () => {
  it('counts a heading, a "- " item and a paragraph start after a blank line', () => {
    expect(unitsOf(STORE_OLD.split('\n')).map((u) => u.line)).toEqual([1, 3, 5, 7, 8, 10])
  })

  it('counts a numbered item only when it starts a paragraph', () => {
    expect(unitsOf(['intro', '1. one', '', '2. two']).map((u) => u.line)).toEqual([1, 4])
  })

  it('does not count a nested bullet, table row, quote, rule or fenced code', () => {
    const lines = [
      '- top',
      '  - nested',
      '| a | b |',
      '> quote',
      '---',
      '```',
      '- fenced',
      '```',
    ]
    expect(unitsOf(lines).map((u) => u.line)).toEqual([1])
  })

  it('does not treat a line after a fence as a paragraph start', () => {
    expect(unitsOf(['```', 'x', '```', 'after']).map((u) => u.line)).toEqual([])
  })
})

describe('inventory-skeleton', () => {
  it('writes the base sha, the files and one empty row per unit', () => {
    const root = repo()
    const { code, lines } = skeleton(root, ['spec/store.md', 'spec/saves.md'])
    expect(code).toBe(0)
    expect(lines.at(-1)).toBe(`  total: 9 units, written to ${MAILBOX}/inventory.md`)
    const text = readFileSync(join(root, MAILBOX, 'inventory.md'), 'utf8')
    expect(text).toContain(`Base: \`${gitIn(root, 'rev-parse', 'HEAD')}\``)
    expect(text).toContain('Files: `spec/store.md`, `spec/saves.md`')
    expect(text).toContain('| spec/store.md:1 | Spec — Store |  |  |  |  |')
    expect(text).toContain('| spec/saves.md:5 | A save has a version. |  |  |  |  |')
  })

  it('refuses to overwrite an inventory', () => {
    const root = repo()
    skeleton(root, ['spec/store.md'])
    expect(() => skeleton(root, ['spec/store.md'])).toThrow('already exists')
  })

  it('reads the committed text, not the uncommitted condense', () => {
    const root = repo()
    condense(root)
    skeleton(root, ['spec/store.md'])
    expect(readFileSync(join(root, MAILBOX, 'inventory.md'), 'utf8')).toContain(
      '| spec/store.md:8 | Second rule. |',
    )
  })

  it('takes --base: an older revision reads the older text', () => {
    const root = repo()
    condense(root)
    gitIn(root, 'commit', '-q', '-am', 'condense')
    const older = gitIn(root, 'rev-parse', 'HEAD~1')
    skeleton(root, ['spec/store.md'], older)
    const text = readFileSync(join(root, MAILBOX, 'inventory.md'), 'utf8')
    expect(text).toContain(`Base: \`${older}\``)
    expect(text).toContain('Second rule.')
  })

  it('errors on an unknown revision and on a file the base does not have', () => {
    const root = repo()
    expect(() => skeleton(root, ['spec/store.md'], 'no-such-rev')).toThrow()
    expect(() => skeleton(root, ['spec/nope.md'])).toThrow()
  })

  it('needs no local main: a repo with only the trunk branch works', () => {
    const root = repo()
    expect(gitIn(root, 'branch', '--list', 'main')).toBe('')
    expect(skeleton(root, ['spec/store.md']).code).toBe(0)
  })
})

describe('inventory: the guard', () => {
  function filled(files = ['spec/store.md', 'spec/saves.md'], fill: Fill = KEEP) {
    const root = repo()
    skeleton(root, files)
    fillRows(root, fill)
    return root
  }

  it('passes a filled inventory', () => {
    const root = filled()
    condense(root)
    const result = check(root)
    expect(result.code).toBe(0)
    expect(result.lines[0]).toMatch(
      /^inventory: PASS, 9 units and 9 rows checked \(base [0-9a-f]{40}\)$/,
    )
  })

  it('fails on a missing row, naming the unit', () => {
    const root = filled(undefined, (id) => (id === 'spec/store.md:8' ? null : KEEP(id)))
    const result = check(root)
    expect(result.code).toBe(1)
    expect(result.text).toContain('unit spec/store.md:8 (Second rule.) is missing (1)')
  })

  it('still passes after the condense is committed: the base sha is read from the file', () => {
    const root = filled()
    condense(root)
    gitIn(root, 'commit', '-q', '-am', 'condense')
    expect(check(root).code).toBe(0)
  })

  it('fails when Base is changed to the post-condense commit', () => {
    const root = filled()
    condense(root)
    const before = gitIn(root, 'rev-parse', 'HEAD')
    gitIn(root, 'commit', '-q', '-am', 'condense')
    const path = join(root, MAILBOX, 'inventory.md')
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(before, gitIn(root, 'rev-parse', 'HEAD')),
    )
    const result = check(root)
    expect(result.code).toBe(1)
    expect(result.text).toContain('spec/store.md:8 is not a unit of')
    expect(result.text).toContain('unit spec/store.md:9 (Slots) is missing (1)')
  })

  it('names the files and the mailbox is any path', () => {
    const root = repo()
    const out = capture()
    runInventorySkeleton(
      root,
      '.claude/phases/9.9/Z/',
      ['spec/saves.md'],
      'HEAD',
      out.io.log,
    )
    expect(
      readFileSync(join(root, '.claude/phases/9.9/Z/inventory.md'), 'utf8'),
    ).toContain('| spec/saves.md:1 | Spec — Saves |')
  })

  describe('row checks', () => {
    const only =
      (id: string, f: ReturnType<Fill>): Fill =>
      (x) =>
        x === id ? f : KEEP(x)
    const failsWith = (fill: Fill, text: string) => {
      const result = check(filled(undefined, fill))
      expect(result.code).toBe(1)
      expect(result.text).toContain(text)
    }

    it('fails a duplicate row', () => {
      const root = filled()
      const path = join(root, MAILBOX, 'inventory.md')
      const text = readFileSync(path, 'utf8')
      const row = text.split('\n').find((l) => l.startsWith('| spec/store.md:7 |')) ?? ''
      writeFileSync(path, `${text.trimEnd()}\n${row}\n`)
      expect(check(root).text).toContain('unit spec/store.md:7 appears in 2 rows (1)')
    })

    it('fails a row for a unit that is not in the listed files', () => {
      const root = filled()
      const path = join(root, MAILBOX, 'inventory.md')
      writeFileSync(
        path,
        `${readFileSync(path, 'utf8').trimEnd()}\n| spec/combat.md:1 | x | x | kept | \`spec/store.md#one-store\` |  |\n`,
      )
      expect(check(root).text).toContain(
        'spec/combat.md:1 is not a unit of spec/store.md, spec/saves.md',
      )
    })

    it('fails an unknown fate', () => {
      failsWith(only('spec/store.md:7', { fate: 'lost' }), 'unknown fate "lost" (3)')
    })

    it('fails a fate with no New home, unless it is dropped', () => {
      failsWith(
        only('spec/store.md:7', { fate: 'moved', reason: 'r' }),
        'needs a New home (4)',
      )
      const root = filled(
        undefined,
        only('spec/store.md:7', { fate: 'dropped', reason: 'r' }),
      )
      expect(check(root).code).toBe(0)
    })

    it('fails a New home that is not backticked file#anchor entries', () => {
      failsWith(
        only('spec/store.md:7', { home: 'spec/store.md#one-store' }),
        'must be backticked file#anchor',
      )
    })

    it('fails a New home with no anchor', () => {
      failsWith(
        only('spec/store.md:7', { home: '`spec/store.md`' }),
        'has no #anchor (4)',
      )
    })

    it('fails a New home in a file that does not exist', () => {
      failsWith(
        only('spec/store.md:7', { home: '`spec/nope.md#x`' }),
        'file spec/nope.md does not exist (4)',
      )
    })

    it('fails a New home heading that does not exist', () => {
      failsWith(
        only('spec/store.md:7', { home: '`spec/store.md#nope`' }),
        'no such heading anchor (4)',
      )
    })

    it('resolves a New home with the fixed slugger: headings a, a, a-1 give a-1-1', () => {
      const root = repo({ '.claude/spec/dups.md': '# Dups\n\n## a\n\n## a\n\n## a-1\n' })
      skeleton(root, ['spec/store.md'])
      fillRows(root, () => ({ home: '`spec/dups.md#a-1-1`' }))
      expect(check(root).code).toBe(0)
    })

    it('fails a rewritten unit with no Reason', () => {
      failsWith(
        only('spec/store.md:7', { fate: 'rewritten', home: '`spec/store.md#one-store`' }),
        'needs a Reason (5)',
      )
    })

    it('fails an old label that is not in the unit', () => {
      const root = filled()
      const path = join(root, MAILBOX, 'inventory.md')
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace('| First rule. |', '| Other words |'),
      )
      expect(check(root).text).toContain(
        'old label "Other words" is not in "- First rule."',
      )
    })

    it('fails a row with the wrong number of cells', () => {
      const root = filled()
      const path = join(root, MAILBOX, 'inventory.md')
      writeFileSync(
        path,
        `${readFileSync(path, 'utf8').trimEnd()}\n| spec/store.md:1 | x | y |\n`,
      )
      expect(check(root).text).toContain('row has 3 cells')
    })
  })
})
