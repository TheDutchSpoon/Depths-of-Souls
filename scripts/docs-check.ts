// Docs checks, run as `npm run docs:check -- <mode>` (Node's type stripping, no dependencies).
//
// Phase 4.2 modes (each marked `(Phase 4.2 only)`; 4.2-G removes them with their helpers):
//   move                       write the 13 files of the target layout from the pinned commit
//   line-proof                 prove `move` lost, doubled and misplaced nothing
//   inventory-skeleton <slice> write phases/4.2/<slice>/inventory.md with the slice's units
//   inventory <slice>          check the filled-in inventory
//
// Lasting pieces: the git helpers, `resolveAnchors` (4.2-G reuses it for citations) and the dispatch.
// Everything else declared below is (Phase 4.2 only).

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLAUDE = join(ROOT, '.claude')

// ---------------------------------------------------------------------------------------------
// Git and text helpers (lasting)
// ---------------------------------------------------------------------------------------------

/** Runs git with an argument array (never a shell string) from the repo root. */
function git(args: string[]): Buffer {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 })
}

/** Splits text into lines; `\r` is stripped, and the empty element after a final `\n` is dropped. */
function splitLines(text: string): string[] {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

function readWorkingLines(path: string): string[] {
  return splitLines(readFileSync(path, 'utf8'))
}

/** Splits a Markdown table row into trimmed cells; only an unescaped `|` separates cells. */
function splitCells(row: string): string[] {
  let s = row.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.trim())
}

const FENCE = /^\s*```/

/**
 * Anchors GitHub gives the headings of a Markdown file, by GitHub's rules: inline markup
 * stripped, lowercased, punctuation other than `-` and `_` removed, each space becomes `-`, the
 * n-th repeat of a slug gets `-<n-1>`. Fenced lines are skipped. Known gaps: HTML entities, and
 * `_emphasis_` in a heading (the underscores stay, as they must for `snake_case`).
 */
function resolveAnchors(lines: string[]): Set<string> {
  const anchors = new Set<string>()
  const seen = new Map<string, number>()
  let inFence = false
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^#{1,6}\s+(.*)$/.exec(line)
    if (!m) continue
    const text = m[1]
      .trim()
      .replace(/\s+#+\s*$/, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`/g, '')
      .replace(/\*/g, '')
      .replace(/<[^>]+>/g, '')
      .trim()
    const slug = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s/g, '-')
    const n = seen.get(slug) ?? 0
    seen.set(slug, n + 1)
    anchors.add(n === 0 ? slug : `${slug}-${n}`)
  }
  return anchors
}

// ---------------------------------------------------------------------------------------------
// Pinned inputs (Phase 4.2 only)
// ---------------------------------------------------------------------------------------------

/** (Phase 4.2 only) The commit whose CONVENTIONS and GAME_DESIGN the file map is written against. */
const PINNED_COMMIT = '892f1b8'

type SrcKey = 'C' | 'G'

/** (Phase 4.2 only) */
const PINNED: Record<SrcKey, { path: string; sha: string; lines: number }> = {
  C: { path: '.claude/CONVENTIONS.md', sha: '91455dd2026ba18d', lines: 2160 },
  G: { path: '.claude/GAME_DESIGN.md', sha: '0970f347753833df', lines: 1347 },
}

const pinnedCache = new Map<SrcKey, string[]>()

/**
 * (Phase 4.2 only) The one way any mode reads the old text: `git show <pin>:<path>`, never the
 * working tree (which `move` overwrites). The blob's sha256 prefix must match, or the run stops.
 */
function readPinned(key: SrcKey): string[] {
  const cached = pinnedCache.get(key)
  if (cached) return cached
  const { path, sha, lines } = PINNED[key]
  const bytes = git(['show', `${PINNED_COMMIT}:${path}`])
  const got = createHash('sha256').update(bytes).digest('hex').slice(0, sha.length)
  if (got !== sha) {
    throw new Error(
      `pinned source differs: stop. ${PINNED_COMMIT}:${path} has sha256 prefix ${got}, expected ${sha}`,
    )
  }
  const result = splitLines(bytes.toString('utf8'))
  if (result.length !== lines) {
    throw new Error(
      `pinned source differs: stop. ${path} has ${result.length} lines, expected ${lines}`,
    )
  }
  pinnedCache.set(key, result)
  return result
}

// ---------------------------------------------------------------------------------------------
// The file map, as `move` and the inventory modes use it (Phase 4.2 only)
// ---------------------------------------------------------------------------------------------

type HalfName = 'Design' | 'Engine rules' | 'To fold'

/** (Phase 4.2 only) Order of the halves in a spec file. */
const HALF_ORDER: HalfName[] = ['Design', 'Engine rules', 'To fold']

interface MapRow {
  src: SrcKey
  from: number
  to: number
  label: string
  target: string
  half: HalfName | null
}

const D: HalfName = 'Design'
const E: HalfName = 'Engine rules'
const F: HalfName = 'To fold'

function row(
  src: SrcKey,
  from: number,
  to: number,
  label: string,
  target: string,
  half: HalfName | null,
): MapRow {
  return { src, from, to, label, target, half }
}

/**
 * (Phase 4.2 only) Hand-copied from the phase brief's two tables, in table order. `line-proof`
 * does not use it: it parses the brief, so a typo here cannot pass both.
 */
const MAP: MapRow[] = [
  row('C', 1, 39, 'Depths of Souls — Conventions', 'CONVENTIONS.md', null),
  row('C', 40, 118, 'Generation & the run layer (Phase 4)', 'spec/run.md', E),
  row(
    'C',
    119,
    139,
    '`materializeCreature(template, { level, side, slot, speciesId, gems…',
    'spec/creatures.md',
    E,
  ),
  row('C', 140, 148, 'Enemy script & loadout at spawn', 'spec/run.md', E),
  row('C', 149, 165, 'Player gem sets', 'spec/creatures.md', E),
  row('C', 166, 175, 'Rewards', 'spec/run.md', E),
  row(
    'C',
    176,
    181,
    'Phase 4 systems addenda (surfaced during content design)',
    'spec/responses.md',
    F,
  ),
  row('C', 182, 186, '`on-[action]` hook family', 'spec/effects.md', F),
  row(
    'C',
    187,
    212,
    'Action instance-list (locked, resolves the "attack again" ambiguity)',
    'spec/combat.md',
    F,
  ),
  row('C', 213, 215, 'Grant-action-state response', 'spec/responses.md', F),
  row('C', 216, 243, 'Support-spell model', 'spec/combat.md', F),
  row(
    'C',
    244,
    348,
    'Response vocabulary — eight verbs (nine until 4.1-H2b2), and "no si…',
    'spec/responses.md',
    F,
  ),
  row('C', 349, 379, "DoT and Regen from the applier's snapshot", 'spec/statuses.md', F),
  row('C', 380, 425, 'Flat-mode stat-derived magnitude', 'spec/responses.md', F),
  row('C', 426, 433, 'Armor penetration', 'spec/combat.md', F),
  row('C', 434, 497, 'New primitives / capabilities', 'spec/effects.md', F),
  row('C', 498, 501, 'consume-stacks', 'spec/responses.md', F),
  row('C', 502, 513, 'status-effect immunity', 'spec/statuses.md', F),
  row('C', 514, 535, 'adjacency targeting', 'spec/combat.md', F),
  row('C', 536, 554, 'Splashing / Annihilate', 'spec/effects.md', F),
  row(
    'C',
    555,
    582,
    "Action locks: `action-lock { scope: 'all' | 'attack' | 'cast' }`",
    'spec/statuses.md',
    F,
  ),
  row('C', 583, 598, 'acted-before-target', 'spec/effects.md', F),
  row('C', 599, 643, 'turn-order status', 'spec/statuses.md', F),
  row('C', 644, 647, 'Flow', 'spec/run.md', F),
  row('C', 648, 649, 'Principles (locked)', 'spec/statuses.md', F),
  row('C', 650, 657, 'Death-reset', 'spec/effects.md', F),
  row('C', 658, 658, 'No side doors', 'spec/responses.md', F),
  row(
    'C',
    659,
    662,
    'Immunity suppresses the *effect*, not the *application',
    'spec/statuses.md',
    F,
  ),
  row(
    'C',
    663,
    677,
    'Phase 4 Slice F addenda (specializations, perks, starters, the Unic…',
    'spec/effects.md',
    F,
  ),
  row('C', 678, 687, '`all-allies` `ResponseTarget`', 'spec/responses.md', F),
  row(
    'C',
    688,
    711,
    '`conditional-damage-bonus` gains an `actionKind` axis',
    'spec/effects.md',
    F,
  ),
  row('C', 712, 719, '`StatusDef.defaultDuration: number`', 'spec/statuses.md', F),
  row(
    'C',
    720,
    740,
    "The Sorcerer starter's extra spell is an innate spell",
    'spec/progression.md',
    F,
  ),
  row('C', 741, 754, 'Phase 4 Slice H2 addenda (Glimmerdark)', 'spec/responses.md', F),
  row(
    'C',
    755,
    764,
    '`TriggeredDef.stacks?: boolean` — a new dedup flag',
    'spec/effects.md',
    F,
  ),
  row('C', 765, 773, 'Phase 4 Slice H3 addenda (Rotcap Hollow)', 'spec/statuses.md', F),
  row(
    'C',
    774,
    795,
    '`random-ally-without-status` — one new `ResponseTarget` variant.',
    'spec/responses.md',
    F,
  ),
  row('C', 796, 1020, 'Combat & scripting', 'spec/combat.md', E),
  row('C', 1021, 1023, 'DoT damage', 'spec/statuses.md', E),
  row('C', 1024, 1128, 'Provoke targeting', 'spec/combat.md', E),
  row('C', 1129, 1242, 'Interpreter', 'spec/scripting.md', E),
  row('C', 1243, 1294, 'Event log', 'spec/combat.md', E),
  row(
    'C',
    1295,
    1609,
    'Unified effect framework (load-bearing invariant)',
    'spec/effects.md',
    E,
  ),
  row(
    'C',
    1610,
    1700,
    'Status lifecycle (Phase 3, re-timed in Phase 4.1-F)',
    'spec/statuses.md',
    E,
  ),
  row('C', 1701, 1776, 'Data-driven content', 'spec/creatures.md', E),
  row('C', 1777, 1804, 'Currencies', 'spec/run.md', E),
  row('C', 1805, 1824, 'Unspecified magnitude ⇒ 100%.', 'spec/effects.md', E),
  row('C', 1825, 1869, 'Where each number lives', 'CONVENTIONS.md', null),
  row('C', 1870, 1890, 'State & persistence', 'spec/store.md', E),
  row('C', 1891, 1917, '`snapshot()` / `hydrate()`', 'spec/saves.md', E),
  row('C', 1918, 2160, 'Testing', 'CONVENTIONS.md', null),
  row('G', 1, 71, 'Depths of Souls — Game Design Document', 'VISION.md', null),
  row('G', 72, 249, '4. The Cave (world & structure)', 'spec/run.md', D),
  row('G', 250, 253, 'Perk points', 'spec/progression.md', D),
  row('G', 254, 461, '5. Creatures', 'spec/creatures.md', D),
  row(
    'G',
    462,
    688,
    '6. Traits, statuses, equipment & the effect framework',
    'spec/effects.md',
    D,
  ),
  row('G', 689, 787, 'Status effects', 'spec/statuses.md', D),
  row('G', 788, 805, 'Equipment', 'spec/creatures.md', D),
  row('G', 806, 972, '7. Combat (automatic)', 'spec/combat.md', D),
  row(
    'G',
    973,
    1101,
    '8. Scripting system (the heart of the game)',
    'spec/scripting.md',
    D,
  ),
  row('G', 1102, 1209, '9. Player specializations', 'spec/progression.md', D),
  row('G', 1210, 1231, '11. Persistence', 'spec/saves.md', D),
  row('G', 1232, 1235, "The store's boundary", 'spec/store.md', D),
  row('G', 1236, 1275, 'References, not copies', 'spec/saves.md', D),
  row('G', 1276, 1283, '12. Explicit non-goals (for now)', 'VISION.md', null),
  row('G', 1284, 1347, '13. Open questions & parked items', 'OPEN_QUESTIONS.md', null),
]

/** (Phase 4.2 only) The first line of a row must hold every `…`-separated piece of its label, in order. */
function rowLabelOk(label: string, firstLine: string): boolean {
  let at = 0
  for (const piece of label.split('…')) {
    if (piece === '') continue
    const found = firstLine.indexOf(piece, at)
    if (found < 0) return false
    at = found + piece.length
  }
  return true
}

/** (Phase 4.2 only) The read-when lines, verbatim from the A brief. */
const READ_WHEN: Record<string, string> = {
  'CONVENTIONS.md': 'Every chat reads this file: the engineering rules for every change.',
  'VISION.md': 'Read this when designing a feature.',
  'OPEN_QUESTIONS.md': 'Read this when a slice touches a parked question, or at a grill.',
  'spec/effects.md': 'Read this when changing any trait, perk or effect.',
  'spec/combat.md': 'Read this when changing how a fight resolves.',
  'spec/statuses.md': 'Read this when changing any status.',
  'spec/creatures.md': 'Read this when changing collection, creatures or gems.',
  'spec/run.md': 'Read this when changing descent, generation or the hub.',
  'spec/scripting.md': 'Read this when changing scripts or behaviour.',
  'spec/responses.md': 'Read this with effects.md, for any triggered behaviour.',
  'spec/progression.md': 'Read this when changing progression.',
  'spec/store.md': 'Read this when changing the store or the state the UI reads.',
  'spec/saves.md': 'Read this when changing saving or loading.',
}

const SPEC_NAMES = [
  'effects',
  'combat',
  'statuses',
  'creatures',
  'run',
  'scripting',
  'responses',
  'progression',
  'store',
  'saves',
]

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

// ---------------------------------------------------------------------------------------------
// move (Phase 4.2 only)
// ---------------------------------------------------------------------------------------------

/**
 * (Phase 4.2 only) Writes the 13 files of the target layout. Rows are copied byte for byte, in old
 * order, with nothing inserted between them; the only inserted lines are the title, the read-when
 * line and each half heading (one blank line before it unless the previous line is blank, one
 * after). GAME_DESIGN.md is not touched.
 */
function runMove(): number {
  const old: Record<SrcKey, string[]> = { C: readPinned('C'), G: readPinned('G') }

  for (const key of ['C', 'G'] as const) {
    const rows = MAP.filter((r) => r.src === key).sort((a, b) => a.from - b.from)
    let next = 1
    for (const r of rows) {
      if (r.from !== next || r.to < r.from) {
        throw new Error(
          `map does not tile ${key}: row ${r.from}–${r.to} after line ${next - 1}`,
        )
      }
      next = r.to + 1
    }
    if (next - 1 !== old[key].length) {
      throw new Error(`map ends at ${key}:${next - 1}, file has ${old[key].length} lines`)
    }
  }
  for (const r of MAP) {
    const first = old[r.src][r.from - 1]
    if (!rowLabelOk(r.label, first)) {
      throw new Error(
        `label of ${r.src}:${r.from}–${r.to} not in its first line: ${first}`,
      )
    }
  }

  const rowText = (r: MapRow): string =>
    old[r.src]
      .slice(r.from - 1, r.to)
      .map((l) => `${l}\n`)
      .join('')

  const outputs = new Map<string, string>()

  for (const name of SPEC_NAMES) {
    const target = `spec/${name}.md`
    const rows = MAP.filter((r) => r.target === target)
    let text = `# Spec — ${capitalise(name)}\n\n${READ_WHEN[target]}\n`
    for (const half of HALF_ORDER) {
      const inHalf = rows
        .filter((r) => r.half === half)
        .sort((a, b) => (a.src === b.src ? a.from - b.from : a.src < b.src ? -1 : 1))
      if (inHalf.length === 0) continue
      const wantSrc = half === 'Design' ? 'G' : 'C'
      if (inHalf.some((r) => r.src !== wantSrc))
        throw new Error(`${target} ${half}: wrong source file`)
      if (!text.endsWith('\n\n')) text += '\n'
      text += `## ${half}\n\n`
      for (const r of inHalf) text += rowText(r)
    }
    outputs.set(target, text)
  }

  for (const [target, src] of [
    ['CONVENTIONS.md', 'C'],
    ['VISION.md', 'G'],
  ] as const) {
    const all = MAP.filter((r) => r.target === target && r.src === src)
      .map(rowText)
      .join('')
    const cut = all.indexOf('\n') + 1
    const rest = all.slice(cut)
    if (!rest.startsWith('\n')) throw new Error(`${target}: old line 2 is not blank`)
    outputs.set(target, `${all.slice(0, cut)}\n${READ_WHEN[target]}\n${rest}`)
  }

  const oq = MAP.filter((r) => r.target === 'OPEN_QUESTIONS.md')
    .map(rowText)
    .join('')
  outputs.set(
    'OPEN_QUESTIONS.md',
    `# Open questions\n\n${READ_WHEN['OPEN_QUESTIONS.md']}\n\n${oq}`,
  )

  mkdirSync(join(CLAUDE, 'spec'), { recursive: true })
  for (const [target, text] of outputs) {
    writeFileSync(join(CLAUDE, target), text, 'utf8')
    console.log(`${sha256(text)}  .claude/${target}`)
  }
  console.log(
    `wrote ${outputs.size} files. .claude/GAME_DESIGN.md is not touched: delete it by hand.`,
  )
  return 0
}

// ---------------------------------------------------------------------------------------------
// line-proof (Phase 4.2 only)
// ---------------------------------------------------------------------------------------------

interface BriefRow {
  src: SrcKey
  from: number
  to: number
  label: string
  target: string
  half: string | null
}

/** (Phase 4.2 only) Cells of the table that follows `heading` in the phase brief. */
function tableAfter(lines: string[], heading: string): string[][] {
  const at = lines.indexOf(heading)
  if (at < 0) throw new Error(`brief has no heading: ${heading}`)
  let i = at + 1
  while (i < lines.length && !lines[i].startsWith('|')) i++
  const rows: string[][] = []
  for (; i < lines.length && lines[i].startsWith('|'); i++)
    rows.push(splitCells(lines[i]))
  return rows.filter((cells) => cells[0] !== 'Lines' && !/^-+$/.test(cells[0]))
}

/** (Phase 4.2 only) The map rows of one old file, parsed from the phase brief. */
function parseBriefMap(brief: string[], heading: string, src: SrcKey): BriefRow[] {
  return tableAfter(brief, heading).map((cells) => {
    const range = /^(\d+)[–-](\d+)$/.exec(cells[0])
    if (!range) throw new Error(`brief map row has no line range: ${cells[0]}`)
    const target = /^`(.*)`$/.exec(cells[2])
    if (!target) throw new Error(`brief map row has no target: ${cells.join(' | ')}`)
    return {
      src,
      from: Number(range[1]),
      to: Number(range[2]),
      label: cells[1].replace(/\\\|/g, '|'),
      target: target[1],
      half: cells[3] === '—' ? null : cells[3],
    }
  })
}

/** (Phase 4.2 only) `file -> KB` from the brief's Target layout table (rows that carry a size). */
function parseBriefSizes(brief: string[]): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const line of brief) {
    if (!line.startsWith('| `')) continue
    const cells = splitCells(line)
    const file = /^`([^`]+)`$/.exec(cells[0])
    const kb = /^([\d.]+) KB$/.exec(cells[cells.length - 1])
    if (file && kb) sizes.set(file[1], Number(kb[1]))
  }
  return sizes
}

/** (Phase 4.2 only) `file -> read-when line` from the A brief's table. */
function parseBriefReadWhen(aBrief: string[]): Map<string, string> {
  const result = new Map<string, string>()
  for (const line of aBrief) {
    if (!line.startsWith('| `')) continue
    const cells = splitCells(line)
    if (cells.length !== 2) continue
    const file = /^`([^`]+)`$/.exec(cells[0])
    const text = /^`(.+)`$/.exec(cells[1])
    if (file && text) result.set(file[1], text[1])
  }
  return result
}

interface Expected {
  lines: string[]
  /** Parallel to `lines`: where each line should come from. */
  origin: string[]
  /** Non-blank lines the layout adds on top of the moved rows. */
  additions: string[]
  rowBytes: number
}

/** (Phase 4.2 only) Counts of non-blank lines, trailing whitespace stripped. */
function countLines(lines: string[], into: Map<string, number>, sign: 1 | -1): void {
  for (const raw of lines) {
    const l = raw.trimEnd()
    if (l.trim() === '') continue
    into.set(l, (into.get(l) ?? 0) + sign)
  }
}

/** (Phase 4.2 only) */
function runLineProof(): number {
  const old: Record<SrcKey, string[]> = { C: readPinned('C'), G: readPinned('G') }
  const brief = readWorkingLines(join(CLAUDE, 'phases/4.2/brief.md'))
  const aBrief = readWorkingLines(join(CLAUDE, 'phases/4.2/A/brief.md'))
  const rows = [
    ...parseBriefMap(brief, '### CONVENTIONS.md (2160 lines)', 'C'),
    ...parseBriefMap(brief, '### GAME_DESIGN.md (1347 lines)', 'G'),
  ]
  const sizes = parseBriefSizes(brief)
  const readWhen = parseBriefReadWhen(aBrief)
  const targets = [...sizes.keys()]

  const failures: Record<'map' | 'multiset' | 'placement', string[]> = {
    map: [],
    multiset: [],
    placement: [],
  }
  const body: string[] = []
  let skipped = false // the map check failed: multiset and placement have nothing to compare

  // 1. The map.
  if (targets.length !== 13)
    failures.map.push(`brief sizes table has ${targets.length} files, expected 13`)
  for (const t of targets)
    if (!readWhen.has(t)) failures.map.push(`no read-when line for ${t}`)
  for (const key of ['C', 'G'] as const) {
    let next = 1
    for (const r of rows.filter((x) => x.src === key)) {
      if (r.from !== next)
        failures.map.push(
          `${key} rows do not tile: ${r.from}–${r.to} follows line ${next - 1}`,
        )
      next = r.to + 1
    }
    if (next - 1 !== old[key].length)
      failures.map.push(`${key} rows end at ${next - 1}, file has ${old[key].length}`)
  }
  for (const r of rows) {
    const id = `${r.src}:${r.from}–${r.to}`
    const first = old[r.src][r.from - 1] ?? ''
    const pieces = r.label.split('…')
    let at = 0
    let ok = true
    for (const p of pieces) {
      if (p === '') continue
      const f = first.indexOf(p, at)
      if (f < 0) ok = false
      else at = f + p.length
    }
    if (!ok) failures.map.push(`${id}: label "${r.label}" not in first line "${first}"`)
    if (!targets.includes(r.target))
      failures.map.push(`${id}: unknown target ${r.target}`)
    const halfless = !r.target.includes('/')
    if (halfless && r.half !== null)
      failures.map.push(`${id}: ${r.target} has no halves, row says ${r.half}`)
    if (!halfless && !HALF_ORDER.includes(r.half as HalfName))
      failures.map.push(`${id}: bad half ${r.half}`)
  }

  // 2. Expected lines per target, built row by row (not by joining strings, as `move` does).
  const expected = new Map<string, Expected>()
  if (failures.map.length === 0) {
    for (const target of targets) {
      const mine = rows.filter((r) => r.target === target)
      const exp: Expected = { lines: [], origin: [], additions: [], rowBytes: 0 }
      const add = (text: string, why: string): void => {
        exp.lines.push(text)
        exp.origin.push(`added: ${why}`)
        if (text.trim() !== '') exp.additions.push(text)
      }
      const rowLines = (r: BriefRow): string[] => {
        const slice = old[r.src].slice(r.from - 1, r.to)
        exp.rowBytes += Buffer.byteLength(slice.join('\n') + '\n')
        return slice
      }
      const push = (r: BriefRow, l: string, n: number): void => {
        exp.lines.push(l)
        exp.origin.push(
          `${r.src}:${r.from}–${r.to} line ${n}${r.half ? ` (${r.half})` : ''}`,
        )
      }
      if (target.startsWith('spec/')) {
        add(`# Spec — ${capitalise(target.slice(5, -3))}`, 'title')
        add('', 'blank')
        add(readWhen.get(target) ?? '', 'read-when')
        for (const half of HALF_ORDER) {
          const inHalf = mine.filter((r) => r.half === half)
          if (inHalf.length === 0) continue
          if (exp.lines[exp.lines.length - 1] !== '') add('', 'blank before heading')
          add(`## ${half}`, 'half heading')
          add('', 'blank after heading')
          for (const r of inHalf) rowLines(r).forEach((l, i) => push(r, l, r.from + i))
        }
      } else if (target === 'OPEN_QUESTIONS.md') {
        add('# Open questions', 'title')
        add('', 'blank')
        add(readWhen.get(target) ?? '', 'read-when')
        add('', 'blank')
        for (const r of mine) rowLines(r).forEach((l, i) => push(r, l, r.from + i))
      } else {
        const flat: { text: string; r: BriefRow; n: number }[] = []
        for (const r of mine)
          rowLines(r).forEach((l, i) => flat.push({ text: l, r, n: r.from + i }))
        if (flat.length < 2 || flat[1].text !== '') {
          failures.map.push(`${target}: old line 2 is not blank`)
        } else {
          push(flat[0].r, flat[0].text, flat[0].n)
          add('', 'blank')
          add(readWhen.get(target) ?? '', 'read-when')
          for (const f of flat.slice(1)) push(f.r, f.text, f.n)
        }
      }
      expected.set(target, exp)
    }
  }

  // Actual files from the working tree.
  const actual = new Map<string, string[] | null>()
  for (const t of targets) {
    const p = join(CLAUDE, t)
    if (!existsSync(p)) {
      actual.set(t, null)
      continue
    }
    const text = readFileSync(p, 'utf8').replace(/\r/g, '')
    const lines = text.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    else failures.placement.push(`${t}: does not end with a newline`)
    actual.set(t, lines)
  }

  if (failures.map.length === 0) {
    // 3. Multiset.
    const counts = new Map<string, number>()
    countLines(old.C, counts, 1)
    countLines(old.G, counts, 1)
    const newCounts = new Map<string, number>()
    for (const t of targets) {
      const lines = actual.get(t)
      if (!lines) {
        failures.multiset.push(`${t}: file missing`)
        continue
      }
      countLines(lines, newCounts, 1)
      countLines(expected.get(t)?.additions ?? [], newCounts, -1)
    }
    for (const k of new Set([...counts.keys(), ...newCounts.keys()])) {
      const a = counts.get(k) ?? 0
      const b = newCounts.get(k) ?? 0
      if (a !== b) failures.multiset.push(`line  old×${a}  new×${b}: ${k}`)
    }

    // 4. Placement, exact.
    for (const t of targets) {
      const lines = actual.get(t)
      const exp = expected.get(t)
      if (!lines || !exp) {
        failures.placement.push(`${t}: file missing`)
        continue
      }
      const n = Math.max(lines.length, exp.lines.length)
      for (let i = 0; i < n; i++) {
        if (lines[i] !== exp.lines[i]) {
          failures.placement.push(
            `${t}:${i + 1}: expected ${JSON.stringify(exp.lines[i])} (${exp.origin[i] ?? 'past the end'}), got ${JSON.stringify(lines[i])}`,
          )
          break
        }
      }
      if (lines.length !== exp.lines.length) {
        failures.placement.push(
          `${t}: ${lines.length} lines, expected ${exp.lines.length}`,
        )
      }
    }
    const specDir = join(CLAUDE, 'spec')
    const present = existsSync(specDir) ? readdirSync(specDir) : []
    const wanted = new Set(
      targets.filter((t) => t.startsWith('spec/')).map((t) => t.slice(5)),
    )
    for (const f of present)
      if (!wanted.has(f)) failures.placement.push(`extra file in .claude/spec/: ${f}`)
  } else {
    skipped = true
  }

  // 5. Report.
  body.push('', 'Old files (pinned)')
  for (const key of ['C', 'G'] as const) {
    const nonBlank = old[key].filter((l) => l.trim() !== '').length
    body.push(
      `  ${PINNED[key].path}: ${old[key].length} lines, ${nonBlank} non-blank, sha256 prefix ${PINNED[key].sha}`,
    )
  }
  body.push(
    '',
    'New files: rows-only bytes (moved rows, decimal kB) vs the brief table, and whole-file bytes',
  )
  for (const t of targets) {
    const exp = expected.get(t)
    const lines = actual.get(t)
    const whole = lines ? Buffer.byteLength(lines.join('\n') + '\n') : 0
    const kb = sizes.get(t) ?? 0
    const rowsKb = exp ? Math.round(exp.rowBytes / 100) / 10 : 0
    const verdict = exp && rowsKb === kb ? 'MATCH' : 'DIFF'
    body.push(
      `  ${t.padEnd(22)} rows ${String(exp?.rowBytes ?? 0).padStart(7)} B (${rowsKb.toFixed(1)} kB)  table ${kb.toFixed(1)} kB  ${verdict}   whole ${whole} B (${lines?.length ?? 0} lines)`,
    )
  }
  for (const check of ['map', 'multiset', 'placement'] as const) {
    for (const f of failures[check]) body.push(`FAIL ${check}: ${f}`)
  }

  const status = (c: 'map' | 'multiset' | 'placement'): string =>
    skipped && c !== 'map' ? 'SKIPPED' : failures[c].length === 0 ? 'PASS' : 'FAIL'
  console.log(
    `line-proof: map ${status('map')}, multiset ${status('multiset')}, placement ${status('placement')}`,
  )
  for (const l of body) console.log(l)
  return failures.map.length + failures.multiset.length + failures.placement.length === 0
    ? 0
    : 1
}

// ---------------------------------------------------------------------------------------------
// Inventories (Phase 4.2 only)
// ---------------------------------------------------------------------------------------------

interface SliceDef {
  spec: string[]
  other: string[]
}

/** (Phase 4.2 only) Which files each condense slice inventories (the phase brief's table). */
const SLICES: Record<string, SliceDef> = {
  B: {
    spec: [],
    other: ['content/*.md', 'specializations/*.md', 'species/species-locked.md'],
  },
  C: {
    spec: [
      'spec/creatures.md',
      'spec/run.md',
      'spec/progression.md',
      'spec/store.md',
      'spec/saves.md',
    ],
    other: [],
  },
  D: { spec: ['spec/effects.md', 'spec/responses.md', 'spec/statuses.md'], other: [] },
  E: { spec: ['spec/combat.md', 'spec/scripting.md'], other: [] },
  F: {
    spec: ['CONVENTIONS.md', 'VISION.md', 'OPEN_QUESTIONS.md'],
    other: ['CLAUDE.md', 'ROADMAP.md', 'WORKFLOWS.md'],
  },
}

interface Unit {
  id: string
  line: number
  /** The unit's first line, as written. */
  first: string
}

/**
 * (Phase 4.2 only) The units of a file: outside code fences, a heading, a top-level `- ` item, or
 * the first line of a top-level paragraph (column 0, not `>`, `|` or `---`). A paragraph starts
 * only at the top of the file or after a blank line.
 */
function unitsOf(lines: string[]): { line: number; first: string }[] {
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

/** (Phase 4.2 only) A unit's label: first line without its heading or bullet marker, cut at 70. */
function makeLabel(first: string): string {
  const s = first
    .replace(/^#{1,6}\s+/, '')
    .replace(/^-\s+/, '')
    .trim()
  const chars = Array.from(s)
  const cut = chars.length > 70 ? `${chars.slice(0, 70).join('').trimEnd()}…` : s
  return cut.replace(/\|/g, '\\|')
}

/** (Phase 4.2 only) */
function pinnedUnits(key: SrcKey): (Unit & { target: string })[] {
  return unitsOf(readPinned(key)).map((u) => {
    const rows = MAP.filter((r) => r.src === key && r.from <= u.line && u.line <= r.to)
    if (rows.length !== 1)
      throw new Error(`${key}:${u.line} falls in ${rows.length} map rows`)
    return {
      id: `${key}:${u.line}`,
      line: u.line,
      first: u.first,
      target: rows[0].target,
    }
  })
}

/**
 * (Phase 4.2 only) The unit counts and the C–F partition that hold on every inventory run:
 * CONVENTIONS 261, GAME_DESIGN 262, and the pinned units of slices C to F sum to 523 with each in
 * exactly one slice.
 */
function assertUnitPartition(): void {
  const c = pinnedUnits('C')
  const g = pinnedUnits('G')
  if (c.length !== 261 || g.length !== 262) {
    throw new Error(
      `unit counts: CONVENTIONS ${c.length} (expected 261), GAME_DESIGN ${g.length} (expected 262)`,
    )
  }
  const owner = new Map<string, string>()
  let sum = 0
  for (const slice of ['C', 'D', 'E', 'F']) {
    for (const u of [...c, ...g]) {
      if (!SLICES[slice].spec.includes(u.target)) continue
      sum++
      const had = owner.get(u.id)
      if (had) throw new Error(`${u.id} is in slices ${had} and ${slice}`)
      owner.set(u.id, slice)
    }
  }
  if (sum !== 523 || owner.size !== 523) {
    throw new Error(
      `pinned units of slices C to F: ${sum} (${owner.size} distinct), expected 523`,
    )
  }
}

/** (Phase 4.2 only) `git merge-base HEAD main`: a missing local `main` stops the run. */
function inventoryBase(): string {
  return git(['merge-base', 'HEAD', 'main']).toString('utf8').trim()
}

/** (Phase 4.2 only) Paths (relative to `.claude/`) a slice's "other files" expand to at the base. */
function otherFiles(base: string, patterns: string[]): string[] {
  const result: string[] = []
  for (const p of patterns) {
    if (!p.endsWith('/*.md')) {
      result.push(p)
      continue
    }
    const dir = p.slice(0, -4)
    const listed = git(['ls-tree', '-r', '--name-only', base, '--', `.claude/${dir}`])
      .toString('utf8')
      .split('\n')
      .filter((x) => x !== '')
      .map((x) => x.slice('.claude/'.length))
      .filter(
        (x) =>
          x.startsWith(dir) && !x.slice(dir.length).includes('/') && x.endsWith('.md'),
      )
    result.push(...listed.sort())
  }
  return result
}

interface SliceUnits {
  units: Unit[]
  counts: [string, number][]
  base: string
}

/** (Phase 4.2 only) A slice's units: pinned ones by map target, then its other files at the base. */
function sliceUnits(slice: string): SliceUnits {
  const def = SLICES[slice]
  const units: Unit[] = []
  const counts: [string, number][] = []
  for (const key of ['C', 'G'] as const) {
    const mine = pinnedUnits(key).filter((u) => def.spec.includes(u.target))
    if (mine.length > 0)
      counts.push([
        `${PINNED[key].path.replace('.claude/', '')} (pinned at ${PINNED_COMMIT})`,
        mine.length,
      ])
    units.push(...mine)
  }
  const base = inventoryBase()
  for (const path of otherFiles(base, def.other)) {
    const text = git(['show', `${base}:.claude/${path}`]).toString('utf8')
    const mine = unitsOf(splitLines(text)).map((u) => ({
      id: `${path}:${u.line}`,
      line: u.line,
      first: u.first,
    }))
    counts.push([path, mine.length])
    units.push(...mine)
  }
  return { units, counts, base }
}

/** (Phase 4.2 only) The slice argument, case-insensitive (`b` is `B`). */
function sliceArg(arg: string | undefined): string {
  const slice = (arg ?? '').toUpperCase()
  if (!(slice in SLICES))
    throw new Error(`slice must be one of ${Object.keys(SLICES).join(', ')}`)
  return slice
}

const INVENTORY_HEADER = ['Unit', 'Old label', 'Decided in', 'Fate', 'New home', 'Reason']

/** (Phase 4.2 only) */
function runInventorySkeleton(arg: string | undefined): number {
  const slice = sliceArg(arg)
  assertUnitPartition()
  const { units, counts, base } = sliceUnits(slice)
  const path = join(CLAUDE, 'phases/4.2', slice, 'inventory.md')
  if (existsSync(path)) {
    throw new Error(
      `.claude/phases/4.2/${slice}/inventory.md already exists: not overwriting`,
    )
  }
  const out = [
    `# Inventory — Phase 4.2 — Slice ${slice}`,
    '',
    `| ${INVENTORY_HEADER.join(' | ')} |`,
    `| ${INVENTORY_HEADER.map(() => '---').join(' | ')} |`,
    ...units.map((u) => `| ${u.id} | ${makeLabel(u.first)} |  |  |  |  |`),
  ]
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${out.join('\n')}\n`, 'utf8')
  console.log(`inventory-skeleton ${slice}: base ${base}`)
  for (const [file, n] of counts) console.log(`  ${file}: ${n} units`)
  console.log(
    `  total: ${units.length} units, written to .claude/phases/4.2/${slice}/inventory.md`,
  )
  return 0
}

/** (Phase 4.2 only) Lowercased, inline markup stripped, whitespace collapsed. */
function normalise(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** (Phase 4.2 only) Old label (unescaped, split on `…`) is contained, piece by piece in order, in the first line. */
function inventoryLabelOk(label: string, first: string): boolean {
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

const FATES = ['kept', 'rewritten', 'merged', 'moved', 'dropped']

/** (Phase 4.2 only) */
function runInventory(arg: string | undefined): number {
  const slice = sliceArg(arg)
  assertUnitPartition()
  const { units, base } = sliceUnits(slice)
  const byId = new Map(units.map((u) => [u.id, u]))
  const path = join(CLAUDE, 'phases/4.2', slice, 'inventory.md')
  const shown = `.claude/phases/4.2/${slice}/inventory.md`
  const lines = readWorkingLines(path)
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

  // Which slice owns a unit that is not in this one (pinned units only; other files are not looked up).
  const otherOwner = new Map<string, string>()
  for (const key of ['C', 'G'] as const) {
    for (const u of pinnedUnits(key)) {
      for (const s of Object.keys(SLICES))
        if (SLICES[s].spec.includes(u.target)) otherOwner.set(u.id, s)
    }
  }

  const anchorCache = new Map<string, Set<string> | null>()
  const anchorsOf = (file: string): Set<string> | null => {
    if (!anchorCache.has(file)) {
      const p = join(CLAUDE, file)
      anchorCache.set(file, existsSync(p) ? resolveAnchors(readWorkingLines(p)) : null)
    }
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
      const owner = otherOwner.get(id)
      fails.push(
        owner
          ? `${where}: ${id} belongs to slice ${owner}, not ${slice} (2)`
          : `${where}: ${id} is not a unit of any slice (2)`,
      )
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
    const n = seen.get(u.id) ?? 0
    if (n === 0)
      fails.push(`${shown}: unit ${u.id} (${makeLabel(u.first)}) is missing (1)`)
  }
  for (const [id, n] of seen)
    if (n > 1) fails.push(`${shown}: unit ${id} appears in ${n} rows (1)`)

  if (fails.length > 0) {
    console.log(`inventory ${slice}: FAIL, ${fails.length} problems (base ${base})`)
    for (const f of fails) console.log(`FAIL ${f}`)
    return 1
  }
  console.log(
    `inventory ${slice}: PASS, ${units.length} units and ${tableRows.length} rows checked (base ${base})`,
  )
  return 0
}

// ---------------------------------------------------------------------------------------------
// Dispatch (lasting)
// ---------------------------------------------------------------------------------------------

const USAGE = `usage: npm run docs:check -- <mode>
  move                        (Phase 4.2 only) write the 13 files of the target layout
  line-proof                  (Phase 4.2 only) check that move lost, doubled and misplaced nothing
  inventory-skeleton <slice>  (Phase 4.2 only) write phases/4.2/<slice>/inventory.md (slice B to F)
  inventory <slice>           (Phase 4.2 only) check phases/4.2/<slice>/inventory.md`

function main(): number {
  const [mode, arg] = process.argv.slice(2)
  try {
    switch (mode) {
      case 'move':
        return runMove()
      case 'line-proof':
        return runLineProof()
      case 'inventory-skeleton':
        return runInventorySkeleton(arg)
      case 'inventory':
        return runInventory(arg)
      default:
        console.error(USAGE)
        return 2
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    return 1
  }
}

process.exitCode = main()
