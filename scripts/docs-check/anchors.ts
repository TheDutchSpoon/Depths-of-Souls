import { existsSync } from 'node:fs'
import { FENCE, readWorkingLines } from './text.ts'

/**
 * Anchors GitHub gives the headings of a Markdown file, by GitHub's rules: inline markup
 * stripped, lowercased, punctuation other than `-` and `_` removed, each space becomes `-`, and a
 * slug that is already taken gets `-<n>` for the first free n (so headings `a`, `a`, `a-1` give
 * `a`, `a-1`, `a-1-1`). Fenced lines are skipped.
 *
 * Known gaps, none of which any heading in `.claude/` has: a heading indented one to three spaces
 * is not seen, and `_emphasis_` or an HTML entity in a heading stays in the slug.
 */
export function resolveAnchors(lines: string[]): Set<string> {
  const anchors = new Set<string>()
  const repeats = new Map<string, number>()
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
    const original = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s/g, '-')
    let slug = original
    while (anchors.has(slug)) {
      const n = (repeats.get(original) ?? 0) + 1
      repeats.set(original, n)
      slug = `${original}-${n}`
    }
    anchors.add(slug)
  }
  return anchors
}

/** The anchors of a file on disk, or null when it does not exist. */
export function anchorsOfFile(path: string): Set<string> | null {
  return existsSync(path) ? resolveAnchors(readWorkingLines(path)) : null
}
