import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sectionOf } from './anchors.ts'
import { ANCHOR_CITATION } from './citations.ts'
import { findNameProblems } from './names.ts'
import { blockLine, scanSource } from './scanner.ts'
import type { Title } from './scanner.ts'
import { splitLines } from './text.ts'

// `comments` reads the working tree only (no git). It checks that a comment or a test title says
// why the code is the way it is, not where in the project's history it was decided
// (`CONVENTIONS.md#comment-why-not-what`, `CONVENTIONS.md#open-questions-get-an-interface`). It
// runs in CI's `test` job (`.github/workflows/deploy.yml`), before the tests. The same walk also
// runs the name guard (`names.ts`): a slice or phase id in a file name, an identifier or a string
// literal, and the provenance words of patterns 1-9 in a string literal.

export interface Pattern {
  id: number
  what: string
  res: RegExp[]
}

// Case-sensitive unless a class says otherwise. Patterns 11, 12 and 14-17 share words with the
// game ("locked", "decided", "plan"): they are narrowed until no hit on the tree is a game word.
export const PATTERNS: Pattern[] = [
  { id: 1, what: 'ASSUMPTION marker', res: [/\bASSUMPTIONS\b|\bASSUMPTION\b(?!:)/g] },
  { id: 2, what: 'phase number', res: [/\bPhases?\s+\d/g] },
  { id: 3, what: 'phase id', res: [/\b(?:Pre|Phase)-\d/g] },
  { id: 4, what: 'slice id', res: [/\b\d+\.\d+-[A-Z]\w*/g] },
  {
    id: 5,
    what: 'slice name',
    res: [
      /\b[Ss]lice\s+[A-Z]\d*[a-z]?\b/g,
      /\b[Ss]lice-[A-Z]\d*[a-z]?\b/g,
      /\bpre-[Ss]lice\b/g,
    ],
  },
  { id: 6, what: 'PR number', res: [/\bPRs?\s*#?\d+/g] },
  {
    id: 7,
    what: 'review round',
    res: [
      /\b(?:[Rr]eview|content-review|PR) (?:fix|round|amendment|revision|finding|review)s?\b/g,
      /\bcontent-review\b/g,
      /\bdesign-review\b/g,
      /\((?:[A-Za-z]+,\s*)?review\)/g,
    ],
  },
  { id: 8, what: 'plan item id', res: [/\b[A-I]\d[a-z]\d?\b/g, /\b[A-I]-\d\b/g] },
  {
    id: 9,
    what: 'plan item range or rule',
    res: [/\b[A-I]\d[a-z]?\+/g, /\b[A-I]\d[a-z]?\s+rule\s+\d/g],
  },
  {
    id: 10,
    what: 'workflow word',
    res: [/\bdesign[- ]owner\b/g, /\bgrill\b/g, /\bkickoff\b/g],
  },
  {
    id: 11,
    what: 'locked as a decision',
    res: [
      /\blocked\s+(?:design|content|seed|semantics|option|decision|number|principle)\b/g,
      /,\s*locked\)/g,
      /\blocked\s+"/g,
    ],
  },
  {
    id: 12,
    what: 'decided at a point in history',
    res: [/\bdecided\s+(?:at|in|before|by|with)\b/g],
  },
  { id: 13, what: 'section sign', res: [/§\s?\d+/g] },
  { id: 14, what: 'brief', res: [/\b[Bb]riefs?\b/g] },
  { id: 15, what: 'the plan', res: [/\b[Tt]he plan(?:'s)?\b/g] },
  { id: 16, what: 'plan review', res: [/\b[Pp]lan review\b/g] },
  { id: 17, what: 'sign-off', res: [/\b[Ss]ign-off\b/g] },
]

/** `ASSUMPTION:` is allowed when its comment cites the open question it points at. */
const ASSUMPTION_COLON = /\bASSUMPTION:/g
const OPEN_QUESTION_CITATION = /OPEN_QUESTIONS\.md#[\p{L}\p{N}_-]+/u

export interface CommentProblem {
  file: string
  line: number
  pattern: number
  what: string
  snippet: string
  kind: 'comment' | 'title' | 'file' | 'identifier' | 'literal'
  /** Identifies the comment block or title, so one block counts once per pattern. */
  unit: string
}

export interface CommentsResult {
  problems: CommentProblem[]
  files: number
  comments: number
  titles: number
  shapes: { plain: number; each: number; skipIf: number; template: number }
}

function walk(dir: string): string[] {
  const out: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name)))
    else if (/\.tsx?$/.test(entry.name)) out.push(join(dir, entry.name))
  }
  return out
}

/** Every file the check reads, as root-relative paths with `/`: all of `src/`, no exemption, and the two config files. */
export function commentFiles(root: string): string[] {
  const files = walk(join(root, 'src')).map((abs) =>
    abs.slice(root.length + 1).replace(/\\/g, '/'),
  )
  for (const config of ['vite.config.ts', 'eslint.config.js'])
    if (existsSync(join(root, config))) files.push(config)
  return files
}

function snippetOf(text: string, index: number, length: number): string {
  return text.slice(Math.max(0, index - 15), index + length + 25).trim()
}

function shapeOf(title: Title): keyof CommentsResult['shapes'] {
  if (title.template) return 'template'
  if (title.call.includes('.each')) return 'each'
  if (/\.(?:skipIf|runIf)/.test(title.call)) return 'skipIf'
  return 'plain'
}

/** Runs every pattern over `text`, which is a comment block or one title part. */
function checkText(
  text: string,
  kind: 'comment' | 'title',
  report: (offset: number, length: number, pattern: number, what: string) => void,
): void {
  for (const pattern of PATTERNS)
    for (const re of pattern.res)
      for (const m of text.matchAll(re))
        report(m.index, m[0].length, pattern.id, `pattern ${pattern.id}, ${pattern.what}`)
  const cited = kind === 'comment' && OPEN_QUESTION_CITATION.test(text)
  for (const m of text.matchAll(ASSUMPTION_COLON))
    if (!cited)
      report(
        m.index,
        m[0].length,
        1,
        kind === 'title'
          ? 'pattern 1, ASSUMPTION: in a title'
          : 'pattern 1, ASSUMPTION: without an OPEN_QUESTIONS.md#<anchor> citation in the same comment',
      )
}

export function findCommentProblems(root: string): CommentsResult {
  const files = commentFiles(root)
  const problems: CommentProblem[] = []
  const result: CommentsResult = {
    problems,
    files: files.length,
    comments: 0,
    titles: 0,
    shapes: { plain: 0, each: 0, skipIf: 0, template: 0 },
  }
  for (const file of files) {
    const scan = scanSource(file, readFileSync(join(root, file), 'utf8'))
    result.comments += scan.comments.length
    result.titles += scan.titles.length
    scan.blocks.forEach((block, i) => {
      checkText(block.text, 'comment', (offset, length, pattern, what) =>
        problems.push({
          file,
          line: blockLine(block, offset),
          pattern,
          what,
          snippet: snippetOf(block.text, offset, length),
          kind: 'comment',
          unit: `${file}:c${i}`,
        }),
      )
    })
    scan.titles.forEach((title, i) => {
      result.shapes[shapeOf(title)]++
      for (const part of title.parts)
        checkText(part.text, 'title', (offset, length, pattern, what) =>
          problems.push({
            file,
            line: part.line,
            pattern,
            what,
            snippet: snippetOf(part.text, offset, length),
            kind: 'title',
            unit: `${file}:t${i}`,
          }),
        )
    })
  }
  for (const p of findNameProblems(root, files, PATTERNS))
    problems.push({ ...p, unit: `${p.file}:${p.kind}:${p.line}:${p.snippet}` })
  problems.sort((a, b) =>
    a.file !== b.file
      ? a.file < b.file
        ? -1
        : 1
      : a.line - b.line || a.pattern - b.pattern,
  )
  return result
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Markup stripped, lowercased, whitespace collapsed: the form a quotation is compared in. */
export function normalise(text: string): string {
  return collapse(
    text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[`*]/g, '')
      .toLowerCase(),
  )
}

export interface Quotation {
  file: string
  line: number
  anchor: string
  quote: string
  kind: 'comment' | 'title'
}

const QUOTE_WINDOW_WORDS = 4
const QUOTE_PREFIX = 40

/** Quotations beside an anchor that the anchor's section does not contain. */
export function findQuotations(root: string): Quotation[] {
  const sections = new Map<string, string | null>()
  const sectionNormalised = (path: string, anchor: string): string | null => {
    const key = `${path}#${anchor}`
    if (!sections.has(key)) {
      const abs = join(root, '.claude', path)
      const section = existsSync(abs)
        ? sectionOf(splitLines(readFileSync(abs, 'utf8')), anchor)
        : null
      sections.set(key, section === null ? null : normalise(section))
    }
    return sections.get(key) ?? null
  }
  const out: Quotation[] = []
  const wordsIn = (gap: string) =>
    gap.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  const hasAnchor = (gap: string) => new RegExp(ANCHOR_CITATION.source, 'u').test(gap)
  const scanText = (
    file: string,
    text: string,
    kind: 'comment' | 'title',
    lineOf: (offset: number) => number,
  ) => {
    // A quote has one owner: the nearer anchor within the window, the earlier one on a tie.
    interface Claim {
      match: RegExpMatchArray
      at: number
      quote: string
      words: number
    }
    const claims = new Map<number, Claim>()
    const claim = (quoteStart: number, next: Claim) => {
      const held = claims.get(quoteStart)
      if (
        !held ||
        next.words < held.words ||
        (next.words === held.words && next.at < held.at)
      )
        claims.set(quoteStart, next)
    }
    for (const m of text.matchAll(ANCHOR_CITATION)) {
      const at = m.index
      const rest = text.slice(at + m[0].length)
      const open = rest.indexOf('"')
      if (open >= 0) {
        // The quote belongs to the nearest anchor before it; punctuation on its own is not a word.
        const gap = rest.slice(0, open)
        const words = wordsIn(gap)
        if (!hasAnchor(gap) && words <= QUOTE_WINDOW_WORDS) {
          const close = rest.indexOf('"', open + 1)
          claim(at + m[0].length + open, {
            match: m,
            at,
            quote: rest.slice(open + 1, close < 0 ? undefined : close),
            words,
          })
        }
      }
      // A quote that ends within four words before this anchor: its closing mark is the last
      // one before the anchor, and an even number of marks precede it, so it is a closing one.
      const before = text.slice(0, at)
      const end = before.lastIndexOf('"')
      if (end < 0) continue
      const gap = before.slice(end + 1)
      const words = wordsIn(gap)
      if (hasAnchor(gap) || words > QUOTE_WINDOW_WORDS) continue
      if ((before.slice(0, end + 1).split('"').length - 1) % 2 !== 0) continue
      const start = before.lastIndexOf('"', end - 1)
      claim(start, { match: m, at, quote: before.slice(start + 1, end), words })
    }
    for (const [, { match: m, at, quote }] of [...claims].sort((a, b) => a[0] - b[0])) {
      const prefix = normalise(quote).slice(0, QUOTE_PREFIX).trim()
      if (prefix === '') continue
      const path = m[1].startsWith('.claude/') ? m[1].slice('.claude/'.length) : m[1]
      const section = sectionNormalised(path, m[2])
      if (section === null || section.includes(prefix)) continue
      out.push({
        file,
        line: lineOf(at),
        anchor: `${m[1]}#${m[2]}`,
        quote: collapse(quote),
        kind,
      })
    }
  }
  for (const file of commentFiles(root)) {
    const scan = scanSource(file, readFileSync(join(root, file), 'utf8'))
    for (const block of scan.blocks)
      scanText(file, block.text, 'comment', (offset) => blockLine(block, offset))
    for (const title of scan.titles)
      for (const part of title.parts) scanText(file, part.text, 'title', () => part.line)
  }
  return out
}

export interface CommentsOptions {
  counts?: boolean
  quotations?: boolean
}

function runCounts(root: string, log: (line: string) => void): number {
  const result = findCommentProblems(root)
  const { shapes } = result
  log(
    `totals: ${result.files} files, ${result.comments} comment ranges, ${result.titles} titles (${shapes.plain} plain, ${shapes.each} each, ${shapes.skipIf} skipIf/runIf, ${shapes.template} template)`,
  )
  log('pattern  comments  titles  files  what')
  for (const pattern of PATTERNS) {
    const hits = result.problems.filter((p) => p.pattern === pattern.id)
    const units = (kind: string) =>
      new Set(hits.filter((p) => p.kind === kind).map((p) => p.unit)).size
    const files = new Set(hits.map((p) => p.file)).size
    log(
      `${String(pattern.id).padStart(7)}  ${String(units('comment')).padStart(8)}  ${String(units('title')).padStart(6)}  ${String(files).padStart(5)}  ${pattern.what}`,
    )
  }
  const names = (kind: CommentProblem['kind']) =>
    result.problems.filter((p) => p.kind === kind)
  for (const [id, kind, label] of [
    [18, 'file', 'file names'],
    [19, 'identifier', 'identifiers'],
    [20, 'literal', 'string literals'],
  ] as const) {
    const hits = names(kind)
    log(
      `${String(id).padStart(7)}  ${label}: ${hits.length} hits in ${new Set(hits.map((p) => p.file)).size} files`,
    )
  }
  return 0
}

function runQuotations(root: string, log: (line: string) => void): number {
  const quotations = findQuotations(root)
  for (const q of quotations) log(`${q.file}:${q.line}: ${q.anchor} "${q.quote}"`)
  const titles = quotations.filter((q) => q.kind === 'title').length
  log(`quotations: ${quotations.length - titles} comments and ${titles} titles`)
  return 0
}

/** Prints the result and returns the exit code (1 when anything is wrong). `--counts` and `--quotations` only report. */
export function runComments(
  root: string,
  options: CommentsOptions,
  log: (line: string) => void,
): number {
  if (options.counts) return runCounts(root, log)
  if (options.quotations) return runQuotations(root, log)
  const result = findCommentProblems(root)
  for (const p of result.problems) log(`${p.file}:${p.line}: ${p.what}: "${p.snippet}"`)
  if (result.problems.length > 0) {
    log(`comments: FAIL, ${result.problems.length} problems`)
    return 1
  }
  log(
    `comments: PASS, ${result.comments} comments and ${result.titles} titles in ${result.files} files`,
  )
  return 0
}
