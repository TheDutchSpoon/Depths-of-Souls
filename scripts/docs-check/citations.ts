import { readdirSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { anchorsOfFile } from './anchors.ts'
import { lineOf } from './text.ts'
import { UsageError } from './usage.ts'

// `citations` reads the working tree only (no git), so it runs in CI's shallow checkout.
//
// A citation is `<path>.md#<anchor>`: the path is plain text rooted at `.claude/` (the same from
// `src/`, from a spec file or from a step file), not a Markdown link relative to the citing file.
// The check fails on
//   (a) an anchor that does not resolve to a heading of an existing file,
//   (b) an old form: `CONVENTIONS "…"`, `GAME_DESIGN §…`; in `src/` also any `GAME_DESIGN`,
//       `species-locked` or `CONVENTIONS` not followed by `.md#`,
//   (c) a label form: a backticked `<path>.md` or a top-level doc name followed by a quoted
//       heading name, or a backticked path followed by a parenthesised list of them.

const SKIPPED_DIRS = ['phases', 'archive']
const TOP_LEVEL_DOCS = 'CLAUDE|VISION|OPEN_QUESTIONS|ROADMAP|WORKFLOWS|CONVENTIONS|CI_CD'

interface Site {
  /** Whitespace, optionally a line break with a comment leader, between a name and its label. */
  gap: string
  /** True in `src/`, where a deleted doc's name has no reason to appear at all. */
  strictNames: boolean
}

const SITES: Record<'src' | 'claude', Site> = {
  src: { gap: String.raw`[ \t]*(?:\n[ \t]*(?://+|\*)?[ \t]*)?`, strictNames: true },
  claude: { gap: String.raw`\s*`, strictNames: false },
}

export const ANCHOR_CITATION =
  /(?<![A-Za-z0-9_./:@-])([A-Za-z0-9_./-]*\.md)#([\p{L}\p{N}\p{M}_-]+)/gu

export interface Problem {
  file: string
  line: number
  what: string
}

export interface CitationsResult {
  problems: Problem[]
  citations: number
  files: number
}

function walk(
  dir: string,
  keep: (name: string) => boolean,
  skip: string[] = [],
): string[] {
  const out: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isDirectory()) {
      if (!skip.includes(entry.name)) out.push(...walk(join(dir, entry.name), keep, []))
    } else if (keep(entry.name)) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

/** Every file the check reads, as root-relative paths with `/`. */
export function collectFiles(root: string): { src: string[]; claude: string[] } {
  const rel = (abs: string) => abs.slice(root.length + 1).replace(/\\/g, '/')
  return {
    src: walk(join(root, 'src'), (n) => /\.tsx?$/.test(n)).map(rel),
    claude: walk(join(root, '.claude'), (n) => n.endsWith('.md'), SKIPPED_DIRS).map(rel),
  }
}

interface Form {
  re: RegExp
  what: string
  /** A bare mention: skipped where a fuller form already reported the same text. */
  bare?: boolean
}

function oldForms(site: Site): Form[] {
  const { gap } = site
  const forms: Form[] = [
    {
      re: new RegExp(String.raw`CONVENTIONS(?:\.md)?(?:'s?)?[,:]?${gap}"`, 'g'),
      what: 'old form: CONVENTIONS "…" (cite `CONVENTIONS.md#<anchor>`)',
    },
    {
      re: new RegExp(String.raw`GAME_DESIGN(?:\.md)?[,:]?${gap}§`, 'g'),
      what: 'old form: GAME_DESIGN §… (cite the spec file by anchor)',
    },
  ]
  if (site.strictNames) {
    forms.push(
      {
        re: /GAME_DESIGN/g,
        what: 'names GAME_DESIGN, a deleted doc (cite the spec file by anchor)',
        bare: true,
      },
      {
        re: /species-locked/g,
        what: 'names species-locked, a deleted doc (cite the content doc by anchor)',
        bare: true,
      },
      {
        re: /CONVENTIONS(?!\.md#)/g,
        what: 'names CONVENTIONS without an anchor (cite `CONVENTIONS.md#<anchor>`)',
        bare: true,
      },
    )
  }
  return forms
}

function labelForms(site: Site): Form[] {
  const { gap } = site
  return [
    {
      re: new RegExp(String.raw`\`[A-Za-z0-9_./-]+\.md\`[,:]?${gap}"`, 'g'),
      what: 'label form: `<path>.md` "Label" (cite `<path>.md#<anchor>`)',
    },
    {
      re: new RegExp(String.raw`\`[A-Za-z0-9_./-]+\.md\`[,:]?${gap}\(\s*"`, 'g'),
      what: 'label form: `<path>.md` ("Label", …) (cite `<path>.md#<anchor>`)',
    },
    {
      re: new RegExp(String.raw`\b(?:${TOP_LEVEL_DOCS})(?:\.md)?[,:]?${gap}"`, 'g'),
      what: 'label form: <NAME> "Label" (cite `<NAME>.md#<anchor>`)',
      bare: true,
    },
  ]
}

/** Scans one file's text; `anchorsFor` resolves a `.claude/`-rooted path, or null when it has no such file. */
export function scanText(
  file: string,
  text: string,
  site: Site,
  anchorsFor: (path: string) => Set<string> | null,
  problems: Problem[],
): number {
  const report = (offset: number, what: string) =>
    problems.push({ file, line: lineOf(text, offset), what })

  const forms = [...oldForms(site), ...labelForms(site)]
  const covered: [number, number][] = []
  for (const bare of [false, true]) {
    for (const form of forms.filter((f) => !!f.bare === bare)) {
      for (const m of text.matchAll(form.re)) {
        if (bare && covered.some(([from, to]) => m.index >= from && m.index < to))
          continue
        if (!bare) covered.push([m.index, m.index + m[0].length])
        report(m.index, form.what)
      }
    }
  }

  let citations = 0
  for (const m of text.matchAll(ANCHOR_CITATION)) {
    citations++
    const raw = m[1]
    const anchor = m[2]
    const path = raw.startsWith('.claude/') ? raw.slice('.claude/'.length) : raw
    if (path.split('/').includes('..')) {
      report(
        m.index,
        `citation ${raw}#${anchor}: a path with ".." (paths are .claude/-rooted)`,
      )
      continue
    }
    const anchors = anchorsFor(path)
    if (!anchors)
      report(m.index, `citation ${raw}#${anchor}: no such file under .claude/`)
    else if (!anchors.has(anchor))
      report(m.index, `citation ${raw}#${anchor}: no such heading anchor in ${path}`)
  }
  return citations
}

export function findProblems(root: string): CitationsResult {
  const files = collectFiles(root)
  const cache = new Map<string, Set<string> | null>()
  const anchorsFor = (path: string) => {
    if (!cache.has(path)) cache.set(path, anchorsOfFile(join(root, '.claude', path)))
    return cache.get(path) ?? null
  }
  const problems: Problem[] = []
  let citations = 0
  for (const file of files.src) {
    const text = readFileSync(join(root, file), 'utf8').replace(/\r/g, '')
    citations += scanText(file, text, SITES.src, anchorsFor, problems)
  }
  for (const file of files.claude) {
    const text = readFileSync(join(root, file), 'utf8').replace(/\r/g, '')
    citations += scanText(file, text, SITES.claude, anchorsFor, problems)
  }
  sortProblems(problems)
  return { problems, citations, files: files.src.length + files.claude.length }
}

function sortProblems(problems: Problem[]): void {
  problems.sort((a, b) =>
    a.file !== b.file
      ? a.file < b.file
        ? -1
        : 1
      : a.line - b.line || (a.what < b.what ? -1 : 1),
  )
}

/**
 * Checks exactly the named files by the living-doc rules (`SITES.claude`), `phases/` included and
 * whatever the extension. A path is repo-relative or absolute under `root`; one that escapes the
 * root, is missing or is a directory is a `UsageError`.
 */
export function findProblemsForFiles(root: string, paths: string[]): CitationsResult {
  const rootAbs = resolve(root)
  const named = paths.map((path) => {
    const abs = resolve(rootAbs, path)
    const rel = relative(rootAbs, abs)
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel))
      throw new UsageError(`${path}: outside the root`)
    let stat
    try {
      stat = statSync(abs)
    } catch {
      throw new UsageError(`${path}: no such file`)
    }
    if (!stat.isFile()) throw new UsageError(`${path}: not a file`)
    return { abs, rel: rel.replace(/\\/g, '/') }
  })
  const cache = new Map<string, Set<string> | null>()
  const anchorsFor = (path: string) => {
    if (!cache.has(path)) cache.set(path, anchorsOfFile(join(root, '.claude', path)))
    return cache.get(path) ?? null
  }
  const problems: Problem[] = []
  let citations = 0
  for (const { abs, rel } of named) {
    const text = readFileSync(abs, 'utf8').replace(/\r/g, '')
    citations += scanText(rel, text, SITES.claude, anchorsFor, problems)
  }
  sortProblems(problems)
  return { problems, citations, files: named.length }
}

/** Prints the result and returns the exit code (1 when anything is wrong); `paths` limits it to those files. */
export function runCitations(
  root: string,
  log: (line: string) => void,
  paths?: string[],
): number {
  const { problems, citations, files } = paths?.length
    ? findProblemsForFiles(root, paths)
    : findProblems(root)
  for (const p of problems) log(`${p.file}:${p.line}: ${p.what}`)
  if (problems.length > 0) {
    log(`citations: FAIL, ${problems.length} problems`)
    return 1
  }
  log(`citations: PASS, ${citations} citations in ${files} files`)
  return 0
}
