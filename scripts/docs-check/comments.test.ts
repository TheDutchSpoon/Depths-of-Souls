import { afterAll, describe, expect, it } from 'vitest'
import { runComments } from './comments.ts'
import { capture, cleanUp, makeTree } from './test-utils.ts'

afterAll(cleanUp)

function check(files: Record<string, string>, options = {}) {
  const root = makeTree(files)
  const out = capture()
  const code = runComments(root, options, out.io.log)
  return { code, lines: out.lines }
}

const asComment = (text: string) => ({
  'src/x.ts': `\n\n// ${text}\nexport const a = 1\n`,
})
const asTitle = (text: string) => ({
  'src/x.test.ts': `\n\nit(${JSON.stringify(text)}, () => {})\n`,
})

// [pattern, text that records history, text that shares words with the game or the process]
const PATTERNS: [number, string, string][] = [
  [1, 'ASSUMPTION 14 says so', 'an assumption about the roll'],
  [2, 'decided in Phase 4', 'uses the phase-8 slug'],
  [3, 'from Pre-5 work', 'a Prelude-like step'],
  [4, 'added in 4.1-H2c', 'a 1.5-second delay'],
  [5, 'Slice D rules', 'a slice of the list, slice 3'],
  [5, 'the Slice-C2 rules', 'a slice-of-life piece'],
  [5, 'from pre-slice work', 'a pre-sliced loaf'],
  [6, 'PR #81 comment', 'the PR process'],
  [7, 'Review fix F2', 'after a review'],
  [7, 'the design-review said', 'a designer reviews it'],
  [7, 'a nit (nit, review)', 'it needs a review'],
  [7, 'Nit (review)', 'it needs a (careful) review'],
  [8, 'see E2a for it', 'scenario S1 and P2'],
  [8, 'see H2b2 for it', 'scenario S1b2 and P2b'],
  [8, 'the Slice-H2b2 rules', 'a 4-2 split'],
  [8, 'item B-2 was it', 'a 4-2 split'],
  [9, 'from H2+ only', 'script rule 4: skip'],
  [10, 'the kickoff said so', 'kicks off a fight'],
  [11, 'the locked design principle', 'a locked CASTER, locked rounds 2-4, still locked'],
  [12, 'decided before launch', "has already decided this round's defending status"],
  [13, 'see §4 for it', 'a section of the log'],
  [14, 'the brief says so', 'briefly'],
  [15, "the plan's own step", 'a plan to flee, planned'],
  [16, 'after plan review', 'a planned review'],
  [17, 'needs sign-off', 'it signs off the turn'],
]

describe('comments patterns', () => {
  it.each(PATTERNS)(
    'pattern %i fails in a comment and in a title, with file:line (%s)',
    (id, bad) => {
      const comment = check(asComment(bad))
      expect(comment.code).toBe(1)
      expect(comment.lines.join('\n')).toContain(`src/x.ts:3: pattern ${id},`)
      const title = check(asTitle(bad))
      expect(title.code).toBe(1)
      expect(title.lines.join('\n')).toContain(`src/x.test.ts:3: pattern ${id},`)
    },
  )

  it.each(PATTERNS)(
    'pattern %i passes the game and process wording (%#)',
    (_id, _bad, good) => {
      expect(check(asComment(good)).lines.at(-1)).toMatch(/^comments: PASS/)
      expect(check(asTitle(good)).lines.at(-1)).toMatch(/^comments: PASS/)
    },
  )

  it('passes the game words that "locked" and "decided" share', () => {
    const { code } = check({
      'src/x.ts': [
        '// isActionLocked and lockedTurns gate the action',
        '// a SLOW attack (locked) and a spell that is still locked',
        'export const a = 1',
        '',
      ].join('\n'),
    })
    expect(code).toBe(0)
  })

  it('fails a trailing comment, at its own line', () => {
    const { code, lines } = check({
      'src/x.ts': 'export const a = [\n  1, // Phase 4\n  2,\n]\n',
    })
    expect(code).toBe(1)
    expect(lines.join('\n')).toContain('src/x.ts:2: pattern 2,')
  })

  it('fails a pattern that wraps over comment lines, at the line of its first word', () => {
    expect(
      check({ 'src/x.ts': 'export const a = 1\n// Phase\n// 8\n' }).lines.join('\n'),
    ).toContain('src/x.ts:2: pattern 2,')
    expect(
      check({ 'src/x.ts': 'export const a = 1\n/**\n * Phase\n * 8\n */\n' }).lines.join(
        '\n',
      ),
    ).toContain('src/x.ts:3: pattern 2,')
  })

  it('checks the literal parts of a template title and ignores an identifier title', () => {
    expect(
      check({ 'src/x.test.ts': 'it(`${n} added in Phase 4`, () => {})\n' }).code,
    ).toBe(1)
    expect(check({ 'src/x.test.ts': 'it(title, () => {})\n' }).code).toBe(0)
  })

  it('checks a title of each call shape', () => {
    for (const call of [
      'describe',
      'it.only',
      'it.each(rows)',
      'test.each(rows)',
      'describe.skipIf(c)',
    ])
      expect(
        check({ 'src/x.test.ts': `${call}('Phase 4 thing', () => {})\n` }).code,
        call,
      ).toBe(1)
  })

  it('does not see a pattern split by a template substitution', () => {
    expect(check({ 'src/x.test.ts': 'it(`Phase ${n}`, () => {})\n' }).code).toBe(0)
  })
})

describe('comments ASSUMPTION', () => {
  it('fails ASSUMPTIONS: and a numbered ASSUMPTION', () => {
    expect(check(asComment('ASSUMPTIONS: one, two')).code).toBe(1)
    expect(check(asComment('ASSUMPTIONS:')).code).toBe(1)
    expect(check(asComment('ASSUMPTION 14')).code).toBe(1)
  })

  it('fails ASSUMPTION: with no citation', () => {
    const { code, lines } = check(asComment('ASSUMPTION: the roll is rounded'))
    expect(code).toBe(1)
    expect(lines.join('\n')).toContain('without an OPEN_QUESTIONS.md#')
  })

  it('passes ASSUMPTION: with the citation in the same block, across a wrap', () => {
    const wrapped = {
      'src/x.ts':
        '// ASSUMPTION: the roll is rounded, see\n// OPEN_QUESTIONS.md#rounding\nexport const a = 1\n',
    }
    expect(check(wrapped).code).toBe(0)
    const starred = {
      'src/x.ts':
        '/**\n * ASSUMPTION: rounded; see\n * OPEN_QUESTIONS.md#rounding\n */\nexport const a = 1\n',
    }
    expect(check(starred).code).toBe(0)
  })

  it('fails ASSUMPTION: when the citation is in the next block', () => {
    const files = {
      'src/x.ts':
        '// ASSUMPTION: rounded\n\n// OPEN_QUESTIONS.md#rounding\nexport const a = 1\n',
    }
    expect(check(files).code).toBe(1)
  })

  it('fails ASSUMPTION: in a title, even with a citation', () => {
    expect(
      check(asTitle('ASSUMPTION: rounds (OPEN_QUESTIONS.md#rounding)')).lines.join('\n'),
    ).toContain('ASSUMPTION: in a title')
  })
})

describe('comments scope', () => {
  it.each([
    ['src/engine/__golden__/g.fixture.ts'],
    ['src/engine/__corpus__/c.ts'],
    ['src/engine/__fixtures__/f.ts'],
    ['src/ui/App.tsx'],
    ['src/types.d.ts'],
    ['vite.config.ts'],
    ['eslint.config.js'],
  ])('checks %s, with no exemption', (path) => {
    const { code, lines } = check({ [path]: '// Phase 4 note\nexport const a = 1\n' })
    expect(code).toBe(1)
    expect(lines.join('\n')).toContain(`${path}:1:`)
  })

  it('does not check scripts/', () => {
    expect(check({ 'scripts/x.ts': '// Phase 4 note\nexport const a = 1\n' }).code).toBe(
      0,
    )
  })

  it('reports a comment count and a title count on a pass', () => {
    const { lines } = check({
      'src/x.test.ts': "// fine\ndescribe('a', () => { it('b', () => {}) })\n",
    })
    expect(lines.at(-1)).toBe('comments: PASS, 1 comments and 2 titles in 1 files')
  })
})

describe('comments --counts', () => {
  it('reports per pattern and exits 0 on a failing tree', () => {
    const { code, lines } = check(
      {
        'src/x.ts': '// Phase 4\n// ok\nexport const a = 1 // PR #3\n',
        'src/y.test.ts': "it('Phase 5 thing', () => {})\n",
      },
      { counts: true },
    )
    expect(code).toBe(0)
    expect(lines[0]).toBe(
      'totals: 2 files, 3 comment ranges, 1 titles (1 plain, 0 each, 0 skipIf/runIf, 0 template)',
    )
    expect(lines).toContain('      2         1       1      2  phase number')
    expect(lines).toContain('      6         1       0      1  PR number')
  })
})

describe('comments --quotations', () => {
  const claude = {
    '.claude/spec/combat.md':
      '# Spec\n\n### Provoke\nProvoke forces the **target** to hit you.\n\n### Other\nSomething else.\n',
  }

  it('lists a quote the anchor section does not contain, and not one it does', () => {
    const { code, lines } = check(
      {
        ...claude,
        'src/x.ts': [
          '// spec/combat.md#provoke "forces the target to hit you"',
          '// spec/combat.md#provoke "never expires"',
          'export const a = 1',
          '',
        ].join('\n'),
      },
      { quotations: true },
    )
    expect(code).toBe(0)
    expect(lines).toEqual([
      'src/x.ts:2: spec/combat.md#provoke "never expires"',
      'quotations: 1 comments and 0 titles',
    ])
  })

  it('reads a quote that wraps over comment lines whole, and a title', () => {
    const { lines } = check(
      {
        ...claude,
        'src/x.test.ts': [
          '// spec/combat.md#provoke "forces the',
          '// target to hit you"',
          '/* spec/combat.md#other "not there',
          ' * at all" */',
          'it(\'x (spec/combat.md#other: "missing")\', () => {})',
          '',
        ].join('\n'),
      },
      { quotations: true },
    )
    expect(lines).toEqual([
      'src/x.test.ts:3: spec/combat.md#other "not there at all"',
      'src/x.test.ts:5: spec/combat.md#other "missing"',
      'quotations: 1 comments and 1 titles',
    ])
  })

  it('looks four words past the anchor and not five', () => {
    const { lines } = check(
      {
        ...claude,
        'src/x.ts': [
          '// spec/combat.md#provoke one two three four "absent"',
          'export const a = 1',
          '// spec/combat.md#provoke one two three four five "absent"',
          '',
        ].join('\n'),
      },
      { quotations: true },
    )
    expect(lines[0]).toBe('src/x.ts:1: spec/combat.md#provoke "absent"')
    expect(lines).toHaveLength(2)
  })

  it('does not count punctuation as a word', () => {
    const { lines } = check(
      {
        ...claude,
        'src/x.ts': '// (`spec/combat.md#provoke`) -- / one two three four "absent"\n',
      },
      { quotations: true },
    )
    expect(lines[0]).toBe('src/x.ts:1: spec/combat.md#provoke "absent"')
  })

  it('gives a quote to the nearest anchor before it, not to an earlier one', () => {
    const { lines } = check(
      {
        ...claude,
        'src/x.ts':
          '// spec/combat.md#other and spec/combat.md#provoke own "forces the target to hit you"\n',
      },
      { quotations: true },
    )
    expect(lines).toEqual(['quotations: 0 comments and 0 titles'])
  })

  it('skips an anchor that does not resolve', () => {
    const { lines } = check(
      {
        ...claude,
        'src/x.ts': '// spec/combat.md#nope "absent"\n// spec/none.md#a "absent"\n',
      },
      { quotations: true },
    )
    expect(lines).toEqual(['quotations: 0 comments and 0 titles'])
  })
})

describe('comments --quotations, before an anchor', () => {
  const claude = {
    '.claude/spec/combat.md':
      '# Spec\n\n### Provoke\nProvoke forces the **target** to hit you.\n\n### Other\nSomething else.\n',
  }
  const run = (comment: string) =>
    check({ ...claude, 'src/x.ts': `// ${comment}\n` }, { quotations: true }).lines

  it('lists a quote that ends right before its anchor, and not one the section contains', () => {
    expect(run('"never expires" spec/combat.md#provoke')).toEqual([
      'src/x.ts:1: spec/combat.md#provoke "never expires"',
      'quotations: 1 comments and 0 titles',
    ])
    expect(run('"forces the target to hit you" spec/combat.md#provoke')).toEqual([
      'quotations: 0 comments and 0 titles',
    ])
  })

  it('lists a short quote on either side of the anchor', () => {
    for (const short of ['"gone"', '"two words"', '"a b c d"']) {
      expect(run(`${short} spec/combat.md#provoke`)[0], short).toContain('src/x.ts:1:')
      expect(run(`spec/combat.md#provoke ${short}`)[0], short).toContain('src/x.ts:1:')
    }
  })

  it('looks four words before the anchor and not five', () => {
    expect(run('"absent" one two three four spec/combat.md#provoke')).toEqual([
      'src/x.ts:1: spec/combat.md#provoke "absent"',
      'quotations: 1 comments and 0 titles',
    ])
    expect(run('"absent" one two three four five spec/combat.md#provoke')).toEqual([
      'quotations: 0 comments and 0 titles',
    ])
  })

  it('gives a quote between two anchors to the nearer one, the earlier on a tie, listed once', () => {
    expect(run('spec/combat.md#other "absent" spec/combat.md#provoke')).toEqual([
      'src/x.ts:1: spec/combat.md#other "absent"',
      'quotations: 1 comments and 0 titles',
    ])
    expect(run('spec/combat.md#other one two "absent" spec/combat.md#provoke')).toEqual([
      'src/x.ts:1: spec/combat.md#provoke "absent"',
      'quotations: 1 comments and 0 titles',
    ])
  })

  it('does not read an opening quote before the anchor as a closing one', () => {
    expect(run('"x" and "a b spec/combat.md#provoke"')).toEqual([
      'quotations: 0 comments and 0 titles',
    ])
  })
})
