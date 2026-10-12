import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Pattern } from './comments.ts'
import { identifiersOf, jsxTextsOf, literalsOf } from './tokens.ts'

// The name guard behind `comments`: provenance in the code itself, not in a comment
// (`CONVENTIONS.md#comment-why-not-what`). It reads:
// - every path under `src/`, for a slice or phase id in a file name;
// - every identifier, for a slice id or a phase id (`PHASE_4_X`, `placeholderPhase4Config`);
// - every string, template and regex literal that is not a module specifier or a test title,
//   for a slice id and for the provenance words of `comments`' patterns 1-9 (ASSUMPTION, phase
//   and slice names, PR numbers, review words, plan-item ids) and for `ASSUMPTION:`, which a value
//   cannot excuse by citing an open question. Patterns 10-17 are not run there: "brief", "grill"
//   and "the plan" are English a player-facing string can hold;
// - every JSX text node, read as a value literal;
// - a test title for the two hyphen shapes of a slice id only, because `comments` already runs
//   every pattern over a title.
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

/** A phase id opening an identifier or following `_`, or inside a camel or upper-case run. */
const PHASE_IN_IDENTIFIER =
  /(?:^|_)(?:PHASE|Phase|phase)(?:_\d+|\d+)|(?<=[a-z0-9])(?:PHASE|Phase)_?\d+/

/** The id inside an identifier, if any. */
function identifierHit(name: string): string | undefined {
  if (/^[A-I]\d[a-z]\d?$/.test(name)) return name
  const phase = PHASE_IN_IDENTIFIER.exec(name)
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

const LAST_VALUE_PATTERN = 9

/** The first of `comments`' patterns 1-9 that `text` matches, if any. */
function provenanceHit(text: string, patterns: Pattern[]): Pattern | undefined {
  return patterns.find(
    (p) =>
      p.id <= LAST_VALUE_PATTERN &&
      p.res.some((re) => text.matchAll(re).next().done === false),
  )
}

/** `ASSUMPTION:` is pattern 1's colon form; a value cannot cite an open question, so it always fails. */
const ASSUMPTION_MARKER = 1

interface ValueHit {
  id: number
  what: string
}

/** The provenance word in a value's `text`: the first of patterns 1-9, then `ASSUMPTION:`. */
function valueHit(
  text: string,
  patterns: Pattern[],
  assumptionColon: RegExp,
): ValueHit | undefined {
  const word = provenanceHit(text, patterns)
  if (word !== undefined) return word
  if (text.matchAll(assumptionColon).next().done === false)
    return patterns.find((p) => p.id === ASSUMPTION_MARKER)
  return undefined
}

/** One pattern-20 problem: a slice id when `word` is undefined, else the provenance word. */
function literalProblem(
  file: string,
  line: number,
  text: string,
  word: ValueHit | undefined,
): NameProblem {
  return {
    file,
    line,
    pattern: LITERAL_PATTERN,
    what:
      word === undefined
        ? 'pattern 20, slice id in a string literal'
        : `pattern 20, provenance in a string literal (pattern ${word.id}, ${word.what})`,
    snippet: text.length > 60 ? `${text.slice(0, 59)}…` : text,
    kind: 'literal',
  }
}

/**
 * The name guard over `root`: file names (every extension), identifiers and string literals. The
 * source files are the ones `comments` already reads, so one walk feeds both; `patterns` and
 * `assumptionColon` are `comments`' own.
 */
export function findNameProblems(
  root: string,
  sourceFiles: string[],
  patterns: Pattern[],
  assumptionColon: RegExp,
): NameProblem[] {
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
      const word =
        hit === undefined && lit.context === 'value'
          ? valueHit(lit.text, patterns, assumptionColon)
          : undefined
      if (hit !== undefined || word !== undefined)
        problems.push(literalProblem(file, lit.line, lit.text, word))
    }
    for (const jsx of jsxTextsOf(file, text)) {
      const hit = literalHit(jsx.text, false)
      const word =
        hit === undefined ? valueHit(jsx.text, patterns, assumptionColon) : undefined
      if (hit !== undefined || word !== undefined)
        problems.push(literalProblem(file, jsx.line, jsx.text, word))
    }
  }
  return problems
}
