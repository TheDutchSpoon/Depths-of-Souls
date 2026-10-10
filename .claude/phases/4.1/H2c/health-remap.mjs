// Phase 4.1-H2c (ASSUMPTION 125): the one-time Health remap, run as a script and never by hand.
//   new = floor(20 + (old - 10) * 1.25 + 0.5)
// Matches `baseStats: { health: N` ONLY (so no trait's `stat: 'health'` modifier can be touched) in the
// four species files, and skips the three Flickerlings by creature id (they are already on the new
// scale; 25 and 28 are values other creatures also hold, so skipping by value would be wrong).
//
//   node health-remap.mjs            dry run: prints the table, writes nothing
//   node health-remap.mjs --write    rewrites the species files and writes health-remap-table.md
//
// Run from the repo root.

import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/data/species/overgrowth.ts',
  'src/data/species/glimmerdark.ts',
  'src/data/species/rotcap-hollow.ts',
  'src/data/species/starters.ts',
]
const SKIP_IDS = new Set([
  'flickerling-wick',
  'flickerling-flare',
  'flickerling-last-gleam',
])
const remap = (old) => Math.floor(20 + (old - 10) * 1.25 + 0.5)

const write = process.argv.includes('--write')
const rows = []
const skipped = []

for (const file of FILES) {
  const lines = readFileSync(file, 'utf8').split('\n')
  let currentId = null
  const out = lines.map((line) => {
    const idMatch = line.match(/^\s*id:\s*'([^']+)'/)
    if (idMatch) currentId = idMatch[1]
    const m = line.match(/baseStats:\s*\{\s*health:\s*(\d+)/)
    if (!m) return line
    const old = Number(m[1])
    if (SKIP_IDS.has(currentId)) {
      skipped.push({ file, id: currentId, health: old })
      return line
    }
    const next = remap(old)
    rows.push({ file, id: currentId, old, next })
    return line.replace(/(baseStats:\s*\{\s*health:\s*)\d+/, `$1${next}`)
  })
  if (write) writeFileSync(file, out.join('\n'))
}

const table = [
  '# Health remap (ASSUMPTION 125): old -> new',
  '',
  'new = floor(20 + (old - 10) * 1.25 + 0.5). Skipped (already on the new scale): ' +
    skipped.map((s) => `${s.id} (${s.health})`).join(', ') +
    '.',
  '',
  '| Creature | File | Old | New |',
  '|---|---|---|---|',
  ...rows.map(
    (r) => `| ${r.id} | ${r.file.replace('src/data/species/', '')} | ${r.old} | ${r.next} |`,
  ),
  '',
  `${rows.length} creatures remapped, ${skipped.length} skipped.`,
  '',
].join('\n')

console.log(table)
if (write) writeFileSync('.claude/phases/4.1/H2c/health-remap-table.md', table)
