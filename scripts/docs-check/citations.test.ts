import { join, relative } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { capture, cleanUp, makeTree } from './test-utils.ts'
import { findProblems, findProblemsForFiles, runCitations } from './citations.ts'
import { UsageError } from './usage.ts'

afterAll(cleanUp)

// The doc every citation below points at: `a, a, a-1` is the slug collision, `phases/...` a
// target outside the scanned tree.
const DOCS = {
  '.claude/spec/combat.md': '# Spec\n\n## Design\n\n### Damage formula\n\n### Provoke\n',
  '.claude/spec/dups.md': '# Dups\n\n## a\n\n## a\n\n## a-1\n',
  '.claude/CONVENTIONS.md': '# Conventions\n\n## Testing\n',
  '.claude/phases/a/brief.md': '# Brief\n\n## Process for 4.2\n\n## Process for 4.2\n',
}

type Place = (text: string) => string
interface Site {
  name: string
  /** A scratch tree whose one scanned file holds `text` (starting at line 3). */
  place: Place
  file: string
  /** A comment wrapped over a line break, in this site's own idiom. */
  wrap: (before: string, after: string) => string
}

const sites: Site[] = [
  {
    name: 'src/',
    file: 'src/engine/x.ts',
    place: (text) => makeTree({ ...DOCS, 'src/engine/x.ts': `const a = 1\n\n${text}\n` }),
    wrap: (before, after) => `// ${before}\n// ${after}`,
  },
  {
    name: '.claude/',
    file: '.claude/workflow/x.md',
    place: (text) =>
      makeTree({ ...DOCS, '.claude/workflow/x.md': `# Title\n\n${text}\n` }),
    wrap: (before, after) => `${before}\n${after}`,
  },
]

describe.each(sites)('citations in $name', ({ place, file, wrap }) => {
  const problems = (text: string) => findProblems(place(text)).problems

  it('passes a resolving citation', () => {
    const result = findProblems(place('see `spec/combat.md#damage-formula` for it'))
    expect(result.problems).toEqual([])
    expect(result.citations).toBe(1)
  })

  describe('(a) unresolved anchors', () => {
    it('fails a heading that does not exist, with file:line', () => {
      const found = problems('see spec/combat.md#no-such-heading')
      expect(found).toHaveLength(1)
      expect(found[0]).toMatchObject({ file, line: 3 })
      expect(found[0].what).toContain('no such heading anchor')
    })

    it('fails a file that does not exist', () => {
      expect(problems('see spec/nope.md#x')[0].what).toContain('no such file')
    })

    it('fails a wrong-case anchor', () => {
      expect(problems('see spec/combat.md#Damage-formula')[0].what).toContain(
        'no such heading anchor',
      )
    })

    it('fails a path with a ".." segment', () => {
      expect(problems('see ../.claude/spec/combat.md#provoke')[0].what).toContain('".."')
    })

    it('tolerates a leading .claude/', () => {
      expect(problems('see .claude/spec/combat.md#provoke')).toEqual([])
    })

    it('reads the slug collision as GitHub does: headings a, a, a-1 give a-1-1', () => {
      expect(problems('see spec/dups.md#a-1-1')).toEqual([])
      expect(problems('see spec/dups.md#a-2')).toHaveLength(1)
    })

    it('does not read a URL or a <placeholder> form as a citation', () => {
      const result = findProblems(
        place('see https://example.com/x.md#frag and spec/<file>.md#<anchor> here'),
      )
      expect(result.problems).toEqual([])
      expect(result.citations).toBe(0)
    })

    it('allows a target in phases/, duplicate slugs included', () => {
      expect(problems('see phases/a/brief.md#process-for-42-1')).toEqual([])
    })
  })

  describe('(b) old forms', () => {
    it.each([
      ['CONVENTIONS "Testing"'],
      ['CONVENTIONS\' "Testing"'],
      ['CONVENTIONS.md "Testing"'],
      ['CONVENTIONS: "Testing"'],
      ['GAME_DESIGN §4'],
      ['GAME_DESIGN.md §13'],
    ])('fails %s', (text) => {
      const found = problems(`see ${text} here`)
      expect(found.length).toBeGreaterThan(0)
      expect(found[0]).toMatchObject({ file, line: 3 })
      expect(found[0].what).toContain('old form')
    })

    it('fails a CONVENTIONS "Label" wrapped over a line break', () => {
      const found = problems(wrap('see CONVENTIONS', '"Testing"'))
      expect(found[0].what).toContain('old form')
    })

    it('reports a form once, not once per rule', () => {
      expect(problems('see GAME_DESIGN §4 here')).toHaveLength(1)
    })
  })

  describe('(c) label forms', () => {
    it.each([
      ['`spec/combat.md` "Damage formula"'],
      ['`spec/combat.md`, "Damage formula"'],
      ['`CONVENTIONS.md` "Testing"'],
      ['`spec/combat.md` ("Damage formula", "Provoke")'],
      ['WORKFLOWS "Golden policy"'],
      ['ROADMAP.md "Phase 5"'],
    ])('fails %s', (text) => {
      const found = problems(`see ${text} here`)
      expect(found).toHaveLength(1)
      expect(found[0]).toMatchObject({ file, line: 3 })
      expect(found[0].what).toContain('label form')
    })

    it('fails a label wrapped over a line break', () => {
      const found = problems(wrap('see `spec/combat.md`', '"Damage formula"'))
      expect(found[0].what).toContain('label form')
    })

    it('passes a prose mention, a quotation and an intra-file label', () => {
      expect(problems('see `spec/combat.md` for it')).toEqual([])
      expect(problems('content/overgrowth.md: "a quote"')).toEqual([])
      expect(problems('as the rule says ("Damage formula")')).toEqual([])
    })
  })

  it('prints file:line for every problem and exits 1', () => {
    const out = capture()
    const code = runCitations(
      place('see GAME_DESIGN §4 and `spec/nope.md` "X"'),
      out.io.log,
    )
    expect(code).toBe(1)
    expect(out.lines[0]).toMatch(new RegExp(`^${file.replace(/\./g, '\\.')}:3: `))
    expect(out.lines.at(-1)).toMatch(/^citations: FAIL, \d+ problems$/)
  })
})

describe('citations: where it looks', () => {
  it('skips an old form in phases/ and archive/', () => {
    const root = makeTree({
      ...DOCS,
      '.claude/phases/a/note.md': 'see CONVENTIONS "Testing" and GAME_DESIGN §4\n',
      '.claude/archive/old.md': 'see `spec/combat.md` "Provoke"\n',
    })
    expect(findProblems(root).problems).toEqual([])
  })

  it('reads only .ts/.tsx under src/ and .md under .claude/', () => {
    const root = makeTree({
      ...DOCS,
      'src/data.json': 'GAME_DESIGN §4',
      'src/x.tsx': '// fine\n',
      '.claude/notes.txt': 'CONVENTIONS "Testing"',
    })
    const result = findProblems(root)
    expect(result.problems).toEqual([])
    expect(result.files).toBe(4)
  })

  it('names a deleted doc as a problem in src/ only', () => {
    const root = makeTree({
      ...DOCS,
      'src/x.ts': '// GAME_DESIGN, species-locked.md and a bare CONVENTIONS\n',
      '.claude/ROADMAP.md': 'most of it CONVENTIONS and GAME_DESIGN, species-locked.md\n',
    })
    const found = findProblems(root).problems
    expect(found.map((p) => p.file)).toEqual(['src/x.ts', 'src/x.ts', 'src/x.ts'])
  })

  it('does not flag CONVENTIONS.md#anchor in src/', () => {
    const root = makeTree({ ...DOCS, 'src/x.ts': '// see CONVENTIONS.md#testing\n' })
    expect(findProblems(root).problems).toEqual([])
  })

  it('fails a label form wrapped over a block-comment leader in src/', () => {
    const root = makeTree({
      ...DOCS,
      'src/x.ts': '/**\n * see `spec/combat.md`\n * "Damage formula"\n */\n',
    })
    expect(findProblems(root).problems[0].what).toContain('label form')
  })

  it('fails an old form wrapped over a block-comment leader in src/', () => {
    const root = makeTree({
      ...DOCS,
      'src/x.ts': '/**\n * see CONVENTIONS\n * "Testing"\n */\n',
    })
    expect(findProblems(root).problems[0].what).toContain('old form')
  })

  it('passes with a CRLF checkout', () => {
    const root = makeTree({ ...DOCS, 'src/x.ts': '// see `spec/combat.md#provoke`\r\n' })
    expect(findProblems(root).problems).toEqual([])
  })

  it('prints a PASS line with the counts', () => {
    const out = capture()
    const root = makeTree({ ...DOCS, 'src/x.ts': '// see `spec/combat.md#provoke`\n' })
    expect(runCitations(root, out.io.log)).toBe(0)
    expect(out.lines).toEqual(['citations: PASS, 1 citations in 4 files'])
  })
})

describe('citations of named files', () => {
  const claude = (files: Record<string, string>) => makeTree({ ...DOCS, ...files })
  const run = (root: string, ...paths: string[]) => {
    const out = capture()
    return { code: runCitations(root, out.io.log, paths), lines: out.lines }
  }

  it('passes a clean file under phases/, which the full run skips', () => {
    const root = claude({ '.claude/phases/a/x.md': 'see `spec/combat.md#provoke`\n' })
    expect(run(root, '.claude/phases/a/x.md')).toEqual({
      code: 0,
      lines: ['citations: PASS, 1 citations in 1 files'],
    })
  })

  it('fails a label form and an unresolved anchor under phases/, with file:line', () => {
    const root = claude({
      '.claude/phases/a/x.md':
        'ok\n`spec/combat.md` "Provoke"\nand spec/combat.md#nope here\n',
    })
    const { code, lines } = run(root, '.claude/phases/a/x.md')
    expect(code).toBe(1)
    expect(lines[0]).toMatch(/^\.claude\/phases\/a\/x\.md:2: label form/)
    expect(lines[1]).toMatch(
      /^\.claude\/phases\/a\/x\.md:3: citation spec\/combat\.md#nope: no such heading/,
    )
    expect(lines.at(-1)).toBe('citations: FAIL, 2 problems')
  })

  it('fails an old form in a named file', () => {
    const root = claude({ '.claude/phases/a/x.md': 'CONVENTIONS "Testing"\n' })
    expect(run(root, '.claude/phases/a/x.md').lines[0]).toContain('old form')
  })

  it('checks exactly the named files, whatever their extension', () => {
    const root = claude({
      '.claude/phases/a/x.md': 'CONVENTIONS "Testing"\n',
      '.claude/phases/a/y.md': 'CONVENTIONS "Testing"\n',
      'notes.txt': 'see spec/combat.md#provoke\n',
    })
    expect(run(root, 'notes.txt')).toEqual({
      code: 0,
      lines: ['citations: PASS, 1 citations in 1 files'],
    })
    expect(
      run(root, '.claude/phases/a/x.md').lines.filter((l) => l.includes('y.md')),
    ).toEqual([])
  })

  it('takes a repo-relative path and an absolute path under the root alike', () => {
    const root = claude({ '.claude/phases/a/x.md': 'CONVENTIONS "Testing"\n' })
    const relative = run(root, '.claude/phases/a/x.md')
    const absolute = run(root, join(root, '.claude', 'phases', 'a', 'x.md'))
    expect(absolute).toEqual(relative)
  })

  it('raises a usage error for a path outside the root, a missing file and a directory', () => {
    const root = claude({ '.claude/phases/a/x.md': 'ok\n' })
    // A file that exists, beside the root and not under it: only the root check can refuse it.
    const outside = makeTree({ 'elsewhere.md': 'ok\n' })
    for (const path of [
      join(outside, 'elsewhere.md'),
      join(relative(root, outside), 'elsewhere.md'),
      join(root, '..', 'elsewhere.md'),
      '../up.md',
      'nope.md',
      '.claude',
      root,
    ])
      expect(() => findProblemsForFiles(root, [path]), path).toThrow(UsageError)
  })

  it('leaves the output with no paths as it was', () => {
    const root = claude({ 'src/x.ts': '// GAME_DESIGN §4\n' })
    const out = capture()
    expect(runCitations(root, out.io.log)).toBe(1)
    expect(out.lines).toEqual([
      'src/x.ts:1: old form: GAME_DESIGN §… (cite the spec file by anchor)',
      'citations: FAIL, 1 problems',
    ])
    const empty = capture()
    expect(runCitations(root, empty.io.log, [])).toBe(1)
    expect(empty.lines).toEqual(out.lines)
  })
})
