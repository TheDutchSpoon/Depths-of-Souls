import { readFileSync } from 'node:fs'

/** Splits text into lines; `\r` is stripped, and the empty element after a final `\n` is dropped. */
export function splitLines(text: string): string[] {
  const lines = text.replace(/\r/g, '').split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

export function readWorkingLines(path: string): string[] {
  return splitLines(readFileSync(path, 'utf8'))
}

/** Splits a Markdown table row into trimmed cells; only an unescaped `|` separates cells. */
export function splitCells(row: string): string[] {
  let s = row.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.trim())
}

export const FENCE = /^\s*```/

/** The 1-based line of a character offset. */
export function lineOf(text: string, offset: number): number {
  let line = 1
  for (let i = text.indexOf('\n'); i >= 0 && i < offset; i = text.indexOf('\n', i + 1))
    line++
  return line
}
