import { existsSync } from 'node:fs'
import { FENCE, readWorkingLines } from './text.ts'

interface Heading {
  level: number
  /** Index of the heading's line in the file. */
  index: number
  slug: string
}

/**
 * The headings of a Markdown file with the anchors GitHub gives them, by GitHub's rules: inline
 * markup stripped, lowercased, punctuation other than `-` and `_` removed, each space becomes `-`,
 * and a slug that is already taken gets `-<n>` for the first free n (so headings `a`, `a`, `a-1`
 * give `a`, `a-1`, `a-1-1`). Fenced lines are skipped.
 *
 * Known gaps, none of which any heading in `.claude/` has: a heading indented one to three spaces
 * is not seen, and `_emphasis_` or an HTML entity in a heading stays in the slug.
 */
function readHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = []
  const taken = new Set<string>()
  const repeats = new Map<string, number>()
  let inFence = false
  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (!m) return
    const text = m[2]
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
    while (taken.has(slug)) {
      const n = (repeats.get(original) ?? 0) + 1
      repeats.set(original, n)
      slug = `${original}-${n}`
    }
    taken.add(slug)
    headings.push({ level: m[1].length, index, slug })
  })
  return headings
}

export function resolveAnchors(lines: string[]): Set<string> {
  return new Set(readHeadings(lines).map((h) => h.slug))
}

/**
 * The text of the section an anchor names: its heading line through its sub-headings, up to the
 * next heading of the same or a higher level. Null when the file has no such anchor.
 */
export function sectionOf(lines: string[], anchor: string): string | null {
  const headings = readHeadings(lines)
  const at = headings.findIndex((h) => h.slug === anchor)
  if (at < 0) return null
  const next = headings.slice(at + 1).find((h) => h.level <= headings[at].level)
  return lines.slice(headings[at].index, next?.index ?? lines.length).join('\n')
}

/** The anchors of a file on disk, or null when it does not exist. */
export function anchorsOfFile(path: string): Set<string> | null {
  return existsSync(path) ? resolveAnchors(readWorkingLines(path)) : null
}
