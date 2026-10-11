import { afterAll, describe, expect, it } from 'vitest'
import { parseBudgets, runBudgets } from './budgets.ts'
import { capture, cleanUp, makeTree } from './test-utils.ts'

afterAll(cleanUp)

const TABLE = [
  '# Size budgets',
  '',
  '| File | Budget (KB) |',
  '| --- | --- |',
  '| `CLAUDE.md` | 1 |',
  '| `spec/combat.md` | 2 |',
  '',
].join('\n')

describe('parseBudgets', () => {
  it('reads the backticked-path rows and skips the header and rule', () => {
    expect(parseBudgets(TABLE)).toEqual([
      { file: 'CLAUDE.md', kb: 1 },
      { file: 'spec/combat.md', kb: 2 },
    ])
  })

  it('reads nothing from text with no table', () => {
    expect(parseBudgets('# Size budgets\n\nnothing here\n')).toEqual([])
  })
})

describe('runBudgets', () => {
  it('prints each file against its budget and exits 0', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': 'x'.repeat(500),
      '.claude/spec/combat.md': 'x'.repeat(1000),
    })
    const out = capture()
    expect(runBudgets(root, out.io.log)).toBe(0)
    expect(out.lines[0]).toMatch(/^file\s+size\s+budget\s+used\s+status$/)
    expect(out.lines[1]).toMatch(/^CLAUDE\.md\s+0\.5 KB\s+1 KB\s+50%\s+ok$/)
    expect(out.lines[2]).toMatch(/^spec\/combat\.md\s+1\.0 KB\s+2 KB\s+50%\s+ok$/)
    expect(out.lines.at(-1)).toBe('budgets: 2 files, 0 over budget')
  })

  it('marks an over-budget file OVER and still exits 0', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': 'x'.repeat(1001),
      '.claude/spec/combat.md': 'x',
    })
    const out = capture()
    expect(runBudgets(root, out.io.log)).toBe(0)
    expect(out.lines[1]).toMatch(/OVER$/)
    expect(out.lines.at(-1)).toBe('budgets: 2 files, 1 over budget')
  })

  it('sizes a CRLF file without the carriage returns', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': 'x\r\n'.repeat(400),
      '.claude/spec/combat.md': '',
    })
    const out = capture()
    runBudgets(root, out.io.log)
    expect(out.lines[1]).toMatch(/0\.8 KB/)
    expect(out.lines[1]).toMatch(/ok$/)
  })

  it('counts multi-byte text in bytes', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': '—'.repeat(400),
      '.claude/spec/combat.md': '',
    })
    const out = capture()
    runBudgets(root, out.io.log)
    expect(out.lines[1]).toMatch(/1\.2 KB\s+1 KB\s+120%\s+OVER$/)
  })

  it('prints MISSING for a listed file that is absent, and exits 0', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': 'x',
    })
    const out = capture()
    expect(runBudgets(root, out.io.log)).toBe(0)
    expect(out.lines[2]).toMatch(/spec\/combat\.md\s+-\s+2 KB\s+-\s+MISSING$/)
  })

  it('prints no budget for a spec file with no row', () => {
    const root = makeTree({
      '.claude/workflow/budgets.md': TABLE,
      '.claude/CLAUDE.md': 'x',
      '.claude/spec/combat.md': 'x',
      '.claude/spec/new.md': 'x'.repeat(2000),
    })
    const out = capture()
    runBudgets(root, out.io.log)
    expect(
      out.lines.some((l) => /^spec\/new\.md\s+2\.0 KB\s+-\s+-\s+no budget$/.test(l)),
    ).toBe(true)
  })

  it('reports an unreadable or empty table and exits 0', () => {
    const tables: Record<string, string>[] = [
      {},
      { '.claude/workflow/budgets.md': '# Size budgets\n\nno table\n' },
    ]
    for (const files of tables) {
      const out = capture()
      expect(runBudgets(makeTree(files), out.io.log)).toBe(0)
      expect(out.lines).toEqual([
        'budgets: no budgets found in .claude/workflow/budgets.md, 0 files budgeted',
      ])
    }
  })
})
