import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { identifiersOf, literalsOf } from './tokens.ts'

// The name guard behind `comments`: a phase or slice id in a file name, an identifier or a string
// literal under `src/` is provenance in the code itself (`CONVENTIONS.md#comment-why-not-what`).
// Plan-item letters are A-I, so `D7_THING` is flagged and the derivation handle `S1_SCRIPT` is
// not: the letter, not a shape heuristic, tells them apart. A future `E1_FOO` handle would be
// flagged and need another name.

export const FILE_PATTERN = 18
export const IDENTIFIER_PATTERN = 19
export const LITERAL_PATTERN = 20

export interface NameProblem {
  file: string
  line: number
  pattern: number
  what: string
  snippet: string
  kind: 'file' | 'identifier' | 'literal'
}

const ID_PIECE = /^[a-i]\d[a-z]?\d?$/

/** Every path under `src/` of any extension, as root-relative paths with `/`. The two config files are not walked: their names are fixed. */
function allPaths(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string, prefix: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.isDirectory()) walk(join(dir, entry.name), `${prefix}${entry.name}/`)
      else out.push(`${prefix}${entry.name}`)
    }
  }
  walk(join(root, 'src'), 'src/')
  return out
}

/** The piece of a file path that carries a slice or phase id, if any. */
function fileHit(path: string): string | undefined {
  const pieces = path.toLowerCase().split(/[/\-.]/)
  for (const [i, piece] of pieces.entries()) {
    if (ID_PIECE.test(piece)) return piece
    if (piece === 'e' && pieces[i - 1] === 'golden') return piece
    if ((piece === 'phase' || piece === 'slice') && /^\d+$/.test(pieces[i + 1] ?? ''))
      return `${piece}-${pieces[i + 1]}`
  }
  return undefined
}

/** The id inside an identifier, if any. */
function identifierHit(name: string): string | undefined {
  if (/^[A-I]\d[a-z]\d?$/.test(name)) return name
  const phase = /(?:^|_)(?:PHASE|Phase|phase)(?:_\d+|\d+)/.exec(name)
  if (phase) return phase[0].replace(/^_/, '')
  const camel = /^[a-i]\d[a-z]?\d?(?=[A-Z])/.exec(name)
  if (camel) return camel[0]
  const segments = name.split('_')
  if (segments.length > 1)
    return segments.find((segment) => /^[A-I]\d[a-z]?\d?$/.test(segment))
  return undefined
}

const LEADING = /^(?:[a-i]\d[a-z]?\d?|e)-/
const INTERIOR = /-[a-i]\d[a-z]?\d?-/
const NAMED = /^[A-I]\d[a-z]?\d?\s/

/** The slice id in a literal, if any. A test title skips the third shape: it may open with a derivation label. */
function literalHit(text: string, title: boolean): string | undefined {
  const hit =
    LEADING.exec(text) ?? INTERIOR.exec(text) ?? (title ? null : NAMED.exec(text))
  return hit?.[0].trim()
}

/**
 * The name guard over `root`: file names (every extension), identifiers and string literals. The
 * source files are the ones `comments` already reads, so one walk feeds both.
 */
export function findNameProblems(root: string, sourceFiles: string[]): NameProblem[] {
  const problems: NameProblem[] = []
  for (const path of allPaths(root)) {
    const hit = fileHit(path)
    if (hit !== undefined)
      problems.push({
        file: path,
        line: 1,
        pattern: FILE_PATTERN,
        what: 'pattern 18, slice or phase id in a file name',
        snippet: hit,
        kind: 'file',
      })
  }
  for (const file of sourceFiles) {
    const text = readFileSync(join(root, file), 'utf8').replace(/\r/g, '')
    for (const id of identifiersOf(file, text)) {
      const hit = identifierHit(id.text)
      if (hit !== undefined)
        problems.push({
          file,
          line: id.line,
          pattern: IDENTIFIER_PATTERN,
          what: 'pattern 19, slice or phase id in an identifier',
          snippet: id.text,
          kind: 'identifier',
        })
    }
    for (const lit of literalsOf(file, text)) {
      if (lit.context === 'specifier') continue
      const hit = literalHit(lit.text, lit.context === 'title')
      if (hit !== undefined)
        problems.push({
          file,
          line: lit.line,
          pattern: LITERAL_PATTERN,
          what: 'pattern 20, slice id in a string literal',
          snippet: lit.text.length > 60 ? `${lit.text.slice(0, 59)}…` : lit.text,
          kind: 'literal',
        })
    }
  }
  return problems
}
