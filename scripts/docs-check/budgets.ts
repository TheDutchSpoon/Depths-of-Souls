import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { splitCells, splitLines } from './text.ts'

// `budgets` reads the working tree only (no git) and never fails a run: only the design agent can
// fix a budget, so a blocking check would fail an unrelated pull request.

export interface BudgetRow {
  file: string
  kb: number
}

/** The rows of the first table in `workflow/budgets.md` whose first cell is a backticked path. */
export function parseBudgets(text: string): BudgetRow[] {
  const rows: BudgetRow[] = []
  for (const line of splitLines(text)) {
    if (!line.startsWith('|')) continue
    const [file, kb] = splitCells(line)
    const m = /^`([^`]+)`$/.exec(file ?? '')
    if (m && /^\d+(\.\d+)?$/.test(kb ?? '')) rows.push({ file: m[1], kb: Number(kb) })
  }
  return rows
}

/** A file's size in bytes with `\r` removed, so a CRLF checkout measures as CI's does. */
export function sizeOf(path: string): number {
  return Buffer.byteLength(readFileSync(path, 'utf8').replace(/\r/g, ''), 'utf8')
}

/** Prints every budgeted file against its budget and returns 0 whatever it finds. */
export function runBudgets(root: string, log: (line: string) => void): number {
  const claude = join(root, '.claude')
  const table = join(claude, 'workflow/budgets.md')
  const rows = existsSync(table) ? parseBudgets(readFileSync(table, 'utf8')) : []
  if (rows.length === 0) {
    log('budgets: no budgets found in .claude/workflow/budgets.md, 0 files budgeted')
    return 0
  }
  let over = 0
  const cells: string[][] = [['file', 'size', 'budget', 'used', 'status']]
  for (const { file, kb } of rows) {
    const path = join(claude, file)
    if (!existsSync(path)) {
      cells.push([file, '-', `${kb} KB`, '-', 'MISSING'])
      continue
    }
    const bytes = sizeOf(path)
    const used = Math.round((bytes / (kb * 1000)) * 100)
    const isOver = bytes > kb * 1000
    if (isOver) over++
    cells.push([
      file,
      `${(bytes / 1000).toFixed(1)} KB`,
      `${kb} KB`,
      `${used}%`,
      isOver ? 'OVER' : 'ok',
    ])
  }
  const listed = new Set(rows.map((r) => r.file))
  const specDir = join(claude, 'spec')
  const specFiles = existsSync(specDir)
    ? readdirSync(specDir).filter((n) => n.endsWith('.md'))
    : []
  for (const name of specFiles.sort()) {
    const file = `spec/${name}`
    if (!listed.has(file))
      cells.push([
        file,
        `${(sizeOf(join(specDir, name)) / 1000).toFixed(1)} KB`,
        '-',
        '-',
        'no budget',
      ])
  }
  const widths = cells[0].map((_, i) => Math.max(...cells.map((r) => r[i].length)))
  for (const r of cells)
    log(
      r
        .map((c, i) => c.padEnd(widths[i]))
        .join('  ')
        .trimEnd(),
    )
  log(`budgets: ${rows.length} files, ${over} over budget`)
  return 0
}
