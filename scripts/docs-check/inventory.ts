import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { anchorsOfFile } from './anchors.ts'
import { resolveRev, showAt } from './git.ts'
import { FENCE, readWorkingLines, splitCells, splitLines } from './text.ts'

// The guard for condensing a living doc (`workflow/condense.md`): the skeleton lists the units of
// the files as committed at a base revision, and the check proves every unit has a row saying
// what became of it. The unit definition, the fates and the row check are fixed.

export interface Unit {
  /** `<file>:<line>`, the file relative to `.claude/`, the line at the base. */
  id: string
  /** The unit's first line, as written. */
  first: string
}

export const INVENTORY_HEADER = [
  'Unit',
  'Old label',
  'Decided in',
  'Fate',
  'New home',
  'Reason',
]
export const FATES = ['kept', 'rewritten', 'merged', 'moved', 'dropped']

/**
 * The units of a file: outside code fences, a heading, a top-level `- ` item, or the first line of
 * a top-level paragraph (column 0, not `>`, `|` or `---`). A paragraph starts only at the top of
 * the file or after a blank line.
 */
export function unitsOf(lines: string[]): { line: number; first: string }[] {
  const units: { line: number; first: string }[] = []
  let inFence = false
  let prevBlank = true
  lines.forEach((text, i) => {
    if (FENCE.test(text)) {
      inFence = !inFence
      prevBlank = false
      return
    }
    if (inFence) {
      prevBlank = false
      return
    }
    const blank = text.trim() === ''
    if (!blank) {
      const heading = /^#{1,6}\s/.test(text)
      const item = text.startsWith('- ')
      const paragraph = prevBlank && !/^\s/.test(text) && !/^(>|\||---)/.test(text)
      if (heading || item || paragraph) units.push({ line: i + 1, first: text })
    }
    prevBlank = blank
  })
  return units
}

/** A unit's label: first line without its heading or bullet marker, cut at 70. */
export function makeLabel(first: string): string {
  const s = first
    .replace(/^#{1,6}\s+/, '')
    .replace(/^-\s+/, '')
    .trim()
  const chars = Array.from(s)
  const cut = chars.length > 70 ? `${chars.slice(0, 70).join('').trimEnd()}…` : s
  return cut.replace(/\|/g, '\\|')
}

/** Lowercased, inline markup stripped, whitespace collapsed. */
export function normalise(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Old label (unescaped, split on `…`) is contained, piece by piece in order, in the first line. */
export function inventoryLabelOk(label: string, first: string): boolean {
  const hay = normalise(first)
  let at = 0
  for (const piece of label.replace(/\\\|/g, '|').split('…')) {
    const p = normalise(piece)
    if (p === '') continue
    const found = hay.indexOf(p, at)
    if (found < 0) return false
    at = found + p.length
  }
  return true
}

/** The units of `files` (relative to `.claude/`) as committed at `sha`. */
export function unitsAt(root: string, sha: string, files: string[]): Unit[] {
  const units: Unit[] = []
  for (const file of files) {
    const lines = splitLines(showAt(root, sha, `.claude/${file}`))
    for (const u of unitsOf(lines))
      units.push({ id: `${file}:${u.line}`, first: u.first })
  }
  return units
}

function inventoryPath(mailbox: string): string {
  return `${mailbox.replace(/\\/g, '/').replace(/\/+$/, '')}/inventory.md`
}

/**
 * Writes `<mailbox>/inventory.md` with one empty row per unit of `files` as committed at `base`
 * (default `HEAD`: the committed file, before an uncommitted condense). The resolved sha goes in
 * the file, so a check run after the condense is committed still reads the old text.
 */
export function runInventorySkeleton(
  root: string,
  mailbox: string,
  files: string[],
  base: string,
  log: (line: string) => void,
): number {
  if (files.length === 0) throw new Error('inventory-skeleton needs at least one file')
  const path = inventoryPath(mailbox)
  if (existsSync(join(root, path)))
    throw new Error(`${path} already exists: not overwriting`)
  const sha = resolveRev(root, base)
  const units = unitsAt(root, sha, files)
  const out = [
    `# Inventory — ${files.join(', ')}`,
    '',
    `Base: \`${sha}\``,
    `Files: ${files.map((f) => `\`${f}\``).join(', ')}`,
    '',
    `| ${INVENTORY_HEADER.join(' | ')} |`,
    `| ${INVENTORY_HEADER.map(() => '---').join(' | ')} |`,
    ...units.map((u) => `| ${u.id} | ${makeLabel(u.first)} |  |  |  |  |`),
  ]
  mkdirSync(join(root, path, '..'), { recursive: true })
  writeFileSync(join(root, path), `${out.join('\n')}\n`, 'utf8')
  log(`inventory-skeleton: base ${sha}`)
  for (const file of files)
    log(`  ${file}: ${units.filter((u) => u.id.startsWith(`${file}:`)).length} units`)
  log(`  total: ${units.length} units, written to ${path}`)
  return 0
}

/** Checks `<mailbox>/inventory.md` against the units of its `Files:` at its `Base:` sha. */
export function runInventory(
  root: string,
  mailbox: string,
  log: (line: string) => void,
): number {
  const shown = inventoryPath(mailbox)
  if (!existsSync(join(root, shown))) throw new Error(`${shown} does not exist`)
  const lines = readWorkingLines(join(root, shown))

  const baseLine = lines
    .map((l) => /^Base:\s*`([0-9a-f]{40})`\s*$/.exec(l))
    .find((m) => m)
  if (!baseLine) throw new Error(`${shown}: no "Base: \`<40-hex sha>\`" line`)
  const base = baseLine[1]
  const filesLine = lines.map((l) => /^Files:\s*(.+)$/.exec(l)).find((m) => m)
  const files = filesLine ? [...filesLine[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]) : []
  if (files.length === 0)
    throw new Error(`${shown}: no "Files:" line naming backticked files`)

  const units = unitsAt(root, base, files)
  const byId = new Map(units.map((u) => [u.id, u]))
  const fails: string[] = []

  // The first table with the six-column header (the rest of the file is ignored).
  let at = lines.findIndex((l) => {
    if (!l.startsWith('|')) return false
    const cells = splitCells(l)
    return (
      cells.length === INVENTORY_HEADER.length &&
      cells.every((c, i) => c === INVENTORY_HEADER[i])
    )
  })
  if (at < 0)
    throw new Error(`${shown}: no table with the header ${INVENTORY_HEADER.join(' | ')}`)
  const tableRows: { cells: string[]; no: number }[] = []
  for (at++; at < lines.length && lines[at].startsWith('|'); at++) {
    const cells = splitCells(lines[at])
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue
    tableRows.push({ cells, no: at + 1 })
  }

  const anchorCache = new Map<string, Set<string> | null>()
  const anchorsOf = (file: string): Set<string> | null => {
    if (!anchorCache.has(file))
      anchorCache.set(file, anchorsOfFile(join(root, '.claude', file)))
    return anchorCache.get(file) ?? null
  }

  const seen = new Map<string, number>()
  for (const { cells, no } of tableRows) {
    const where = `${shown}:${no}`
    if (cells.length !== INVENTORY_HEADER.length) {
      fails.push(
        `${where}: row has ${cells.length} cells, expected ${INVENTORY_HEADER.length} (7)`,
      )
      continue
    }
    const [id, label, , fate, home, reason] = cells
    seen.set(id, (seen.get(id) ?? 0) + 1)
    const unit = byId.get(id)
    if (!unit) {
      fails.push(`${where}: ${id} is not a unit of ${files.join(', ')} at ${base} (2)`)
    } else if (!inventoryLabelOk(label, unit.first)) {
      fails.push(`${where}: ${id} old label "${label}" is not in "${unit.first}" (6)`)
    }
    if (!FATES.includes(fate)) fails.push(`${where}: ${id} unknown fate "${fate}" (3)`)
    if (home === '') {
      if (fate !== 'dropped')
        fails.push(`${where}: ${id} fate ${fate} needs a New home (4)`)
    } else {
      const entries = [...home.matchAll(/`([^`]*)`/g)].map((m) => m[1])
      if (
        home.replace(/`[^`]*`/g, '').replace(/[\s,]/g, '') !== '' ||
        entries.length === 0
      ) {
        fails.push(
          `${where}: ${id} New home must be backticked file#anchor entries, comma-separated: ${home} (4)`,
        )
      }
      for (const entry of entries) {
        const hash = entry.indexOf('#')
        const file = hash < 0 ? entry : entry.slice(0, hash)
        const anchor = hash < 0 ? '' : entry.slice(hash + 1)
        const anchors = anchorsOf(file)
        if (hash < 0 || anchor === '')
          fails.push(`${where}: ${id} New home ${entry} has no #anchor (4)`)
        else if (!anchors)
          fails.push(`${where}: ${id} New home file ${file} does not exist (4)`)
        else if (!anchors.has(anchor))
          fails.push(`${where}: ${id} New home ${entry}: no such heading anchor (4)`)
      }
    }
    if (fate !== 'kept' && reason === '')
      fails.push(`${where}: ${id} fate ${fate} needs a Reason (5)`)
  }
  for (const u of units) {
    if ((seen.get(u.id) ?? 0) === 0)
      fails.push(`${shown}: unit ${u.id} (${makeLabel(u.first)}) is missing (1)`)
  }
  for (const [id, n] of seen)
    if (n > 1) fails.push(`${shown}: unit ${id} appears in ${n} rows (1)`)

  if (fails.length > 0) {
    log(`inventory: FAIL, ${fails.length} problems (base ${base})`)
    for (const f of fails) log(`FAIL ${f}`)
    return 1
  }
  log(
    `inventory: PASS, ${units.length} units and ${tableRows.length} rows checked (base ${base})`,
  )
  return 0
}
