import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'
import { git, resolveRev } from './git.ts'
import { fullName, parse, scanSource, scriptKind } from './scanner.ts'
import { UsageError } from './usage.ts'

// `comment-proof <base>` proves a change is comment-only: the working tree's code is the same as
// `<base>`'s once comments are removed. It is run by hand, never in CI, and the only mode besides
// the inventory modes that calls git, which it only ever reads.
//
// For each changed `.ts`/`.tsx`/`.js` file under the scope, both sides are printed with
// `ts.createPrinter({ removeComments: true })` and compared byte for byte; a file with a syntax
// error on either side fails first, because the parser skips a stray token and the prints agree.
// Pragma comments (`@ts-…`, `eslint-…`, `/// <`, `#__PURE__` and the like) are compared apart,
// because removing comments strips them: a pragma is its exact text plus the index of the token it
// governs. A mask lists the string literals (test titles, a fixture template) the change is allowed
// to reword.

const SCOPE = ['src', 'vite.config.ts', 'eslint.config.js']
const CODE = /\.(?:tsx?|jsx?|[cm]js)$/

export interface MaskEntry {
  file: string
  old: string
  new: string
  count?: number
}

/** A mask text for a report line: quoted, newlines escaped, long ones clipped. */
function shown(text: string): string {
  const quoted = JSON.stringify(text)
  return quoted.length > 140 ? `${quoted.slice(0, 139)}…"` : quoted
}

function countOf(entry: MaskEntry): number {
  return entry.count ?? 1
}

/** Reads a mask file; every shape error is a usage error, raised before any file is compared. */
export function loadMask(path: string): MaskEntry[] {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(resolve(path), 'utf8'))
  } catch (e) {
    throw new UsageError(`mask ${path}: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!Array.isArray(raw)) throw new UsageError(`mask ${path}: not an array`)
  const entries = raw.map((item: unknown, i): MaskEntry => {
    const e = item as Partial<MaskEntry> | null
    if (
      !e ||
      typeof e.file !== 'string' ||
      e.file === '' ||
      typeof e.old !== 'string' ||
      typeof e.new !== 'string' ||
      (e.count !== undefined && (!Number.isInteger(e.count) || e.count < 1))
    )
      throw new UsageError(
        `mask ${path}: entry ${i} needs { file, old, new } and an optional count of 1 or more`,
      )
    return { file: e.file, old: e.old, new: e.new, count: e.count }
  })
  for (const e of entries) {
    const label = `${e.file}: ${shown(e.old)}`
    if (e.old === e.new) throw new UsageError(`mask ${path}: ${label} maps to itself`)
    for (const other of entries) {
      if (other === e || other.file !== e.file) continue
      if (other.old === e.old)
        throw new UsageError(
          `mask ${path}: ${label} has two entries (use count for the same new text; two new texts cannot be paired)`,
        )
      if (other.old === e.new)
        throw new UsageError(
          `mask ${path}: ${label} maps to ${shown(e.new)}, which is another entry's old text (a chain or swap cannot be masked)`,
        )
    }
  }
  return entries
}

interface Literal {
  /** Cooked text. */
  text: string
  /** The span a mask replaces: the whole literal for a string, the inside of a template part. */
  from: number
  to: number
  quoted: boolean
}

function literalsOf(file: string, text: string): Literal[] {
  const out: Literal[] = []
  const visit = (node: ts.Node, sf: ts.SourceFile) => {
    const start = node.getStart(sf)
    if (ts.isStringLiteral(node))
      out.push({ text: node.text, from: start, to: node.end, quoted: true })
    else if (ts.isNoSubstitutionTemplateLiteral(node))
      out.push({ text: node.text, from: start + 1, to: node.end - 1, quoted: false })
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node))
      out.push({ text: node.text, from: start + 1, to: node.end - 2, quoted: false })
    else if (ts.isTemplateTail(node))
      out.push({ text: node.text, from: start + 1, to: node.end - 1, quoted: false })
    ts.forEachChild(node, (child) => visit(child, sf))
  }
  const sf = parse(file, text)
  visit(sf, sf)
  return out
}

function occurrences(literals: Literal[], text: string): number {
  return literals.filter((l) => l.text === text).length
}

/** `text` with every literal whose cooked text is in `tokens` replaced by that token. */
function maskLiterals(
  text: string,
  literals: Literal[],
  tokens: Map<string, string>,
): string {
  let out = text
  for (const l of [...literals].sort((a, b) => b.from - a.from)) {
    const token = tokens.get(l.text)
    if (token === undefined) continue
    out = out.slice(0, l.from) + (l.quoted ? `'${token}'` : token) + out.slice(l.to)
  }
  return out
}

function printed(file: string, text: string): string {
  return ts.createPrinter({ removeComments: true }).printFile(parse(file, text))
}

function firstDifference(a: string, b: string): string {
  const x = a.split('\n')
  const y = b.split('\n')
  const at = x.findIndex((line, i) => line !== y[i])
  const i = at < 0 ? x.length : at
  const clip = (s: string | undefined) =>
    s === undefined ? '(end)' : s.trim().slice(0, 100)
  return `printed line ${i + 1}: base \`${clip(x[i])}\`, working tree \`${clip(y[i])}\``
}

function duplicates(names: string[]): { names: string[]; excess: number } {
  const seen = new Map<string, number>()
  for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1)
  const repeated = [...seen].filter(([, n]) => n > 1)
  return {
    names: repeated.map(([name]) => name),
    excess: repeated.reduce((sum, [, n]) => sum + n - 1, 0),
  }
}

/** True when the working tree has more duplicated full names, or more excess copies, than the base. */
export function duplicatesGrew(baseNames: string[], headNames: string[]): boolean {
  const base = duplicates(baseNames)
  const head = duplicates(headNames)
  return head.names.length > base.names.length || head.excess > base.excess
}

/**
 * The first syntax error of a file, as `line <n>: <message>`: the parser skips a stray token
 * silently. It reads the syntactic diagnostics of a one-file program, which works for a `.d.ts`
 * too (`ts.transpileModule` throws on a declaration file).
 */
function syntaxError(file: string, text: string): string | undefined {
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    false,
    scriptKind(file),
  )
  const host: ts.CompilerHost = {
    ...ts.createCompilerHost({}),
    getSourceFile: (name) => (name === file ? sf : undefined),
    fileExists: (name) => name === file,
    readFile: (name) => (name === file ? text : undefined),
  }
  const program = ts.createProgram(
    [file],
    { noLib: true, noResolve: true, allowJs: true },
    host,
  )
  const d = program.getSyntacticDiagnostics(sf)[0]
  if (!d) return undefined
  const line =
    d.file && d.start !== undefined
      ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
      : 1
  return `line ${line}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`
}

interface FileVerdict {
  reasons: string[]
  masked: number
  pairs: string[]
}

function compareCode(
  file: string,
  base: string,
  head: string,
  entries: MaskEntry[],
): FileVerdict {
  const verdict: FileVerdict = { reasons: [], masked: 0, pairs: [] }
  const headBroken = syntaxError(file, head)
  const baseBroken = headBroken === undefined ? syntaxError(file, base) : undefined
  if (headBroken !== undefined || baseBroken !== undefined) {
    verdict.reasons.push(
      headBroken !== undefined
        ? `syntax error in the working tree at ${headBroken}`
        : `syntax error in the base at ${baseBroken}`,
    )
    return verdict
  }
  const baseLits = literalsOf(file, base)
  const headLits = literalsOf(file, head)

  const groups = new Map<string, MaskEntry[]>()
  for (const e of entries) groups.set(e.new, [...(groups.get(e.new) ?? []), e])
  const tokens = new Map<string, string>()
  const headTokens = new Map<string, string>()
  let g = 0
  for (const [newText, group] of groups) {
    const token = `MASK${g++}`
    for (const e of group) tokens.set(e.old, token)
    tokens.set(newText, token)
    headTokens.set(newText, token)
  }

  const countReasons: string[] = []
  for (const e of entries) {
    const found = occurrences(baseLits, e.old)
    if (found !== countOf(e))
      countReasons.push(
        `mask entry ${shown(e.old)} -> ${shown(e.new)} expects ${countOf(e)} in the base, found ${found}`,
      )
  }
  for (const [newText, group] of groups) {
    const expected =
      occurrences(baseLits, newText) + group.reduce((sum, e) => sum + countOf(e), 0)
    const found = occurrences(headLits, newText)
    if (found !== expected)
      countReasons.push(
        `mask: ${shown(newText)} occurs ${found} times in the working tree, expected ${expected}`,
      )
  }
  verdict.reasons.push(...countReasons)

  if (countReasons.length === 0) {
    const a = printed(file, maskLiterals(base, baseLits, tokens))
    const b = printed(file, maskLiterals(head, headLits, headTokens))
    if (a !== b) verdict.reasons.push(`code differs at ${firstDifference(a, b)}`)
    for (const e of entries) {
      verdict.masked += countOf(e)
      verdict.pairs.push(
        `  ${shown(e.old)} -> ${shown(e.new)}${countOf(e) > 1 ? ` (x${countOf(e)})` : ''}`,
      )
    }
  }

  const baseScan = scanSource(file, base)
  const headScan = scanSource(file, head)
  const bp = baseScan.pragmas
  const hp = headScan.pragmas
  const at = bp.findIndex(
    (p, i) => hp[i]?.text !== p.text || hp[i]?.tokenIndex !== p.tokenIndex,
  )
  if (at >= 0 || bp.length !== hp.length) {
    const i = at < 0 ? bp.length : at
    const show = (p: { text: string; tokenIndex: number } | undefined) =>
      p ? `\`${p.text.slice(0, 80)}\` before token ${p.tokenIndex}` : '(none)'
    verdict.reasons.push(
      `pragma differs: base ${show(bp[i])}, working tree ${show(hp[i])}`,
    )
  }

  const baseNames = baseScan.titles.map(fullName)
  const headNames = headScan.titles.map(fullName)
  if (duplicatesGrew(baseNames, headNames))
    verdict.reasons.push(
      `duplicate test name: ${duplicates(headNames)
        .names.map((n) => `"${n}"`)
        .join(', ')}`,
    )
  return verdict
}

function lines(output: Buffer): string[] {
  return output.toString('utf8').split('\0').filter(Boolean)
}

/** Runs the proof and returns the exit code: 0 when every file is OK, 1 on any FAIL or git error. */
export function runCommentProof(
  root: string,
  baseRev: string,
  maskPath: string | undefined,
  log: (line: string) => void,
): number {
  const entries = maskPath === undefined ? [] : loadMask(maskPath)
  const sha = resolveRev(root, baseRev)
  const baseFiles = new Set(
    lines(git(root, ['ls-tree', '-r', '-z', '--name-only', sha, '--', ...SCOPE])),
  )
  // Git's own ignore rules decide what is part of the tree: an ignored file (`.DS_Store`) is in
  // neither set, an untracked file that is not ignored is in the working set and fails as added.
  const headFiles = new Set(
    lines(
      git(root, [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        '--',
        ...SCOPE,
      ]),
    ).filter((path) => existsSync(join(root, path))),
  )

  const fails: string[] = []
  const oks: string[] = []
  const visited = new Set<string>()
  for (const path of [...new Set([...baseFiles, ...headFiles])].sort()) {
    if (!headFiles.has(path)) {
      fails.push(`FAIL ${path}: deleted (in ${baseRev}, not in the working tree)`)
      continue
    }
    if (!baseFiles.has(path)) {
      fails.push(`FAIL ${path}: added (not in ${baseRev})`)
      continue
    }
    const baseBytes = git(root, ['show', `${sha}:${path}`])
    const headBytes = readFileSync(join(root, path))
    if (!CODE.test(path)) {
      if (!baseBytes.equals(headBytes)) fails.push(`FAIL ${path}: non-code file changed`)
      continue
    }
    const baseText = baseBytes.toString('utf8').replace(/\r/g, '')
    const headText = headBytes.toString('utf8').replace(/\r/g, '')
    if (baseText === headText) continue
    visited.add(path)
    const verdict = compareCode(
      path,
      baseText,
      headText,
      entries.filter((e) => e.file === path),
    )
    if (verdict.reasons.length > 0)
      for (const reason of verdict.reasons) fails.push(`FAIL ${path}: ${reason}`)
    else {
      oks.push(`OK ${path}${verdict.masked > 0 ? ` (masked ${verdict.masked})` : ''}`)
      oks.push(...verdict.pairs)
    }
  }
  // An entry for a file that did not change (or is not in the scope, or is spelled with `\`) is
  // never consumed: say so rather than skip it.
  for (const e of entries)
    if (!visited.has(e.file))
      fails.push(
        `FAIL ${e.file}: mask entry ${shown(e.old)} -> ${shown(e.new)} not consumed (no code change in that path, or it is not a file in scope)`,
      )

  for (const line of oks) log(line)
  for (const line of fails) log(line)
  if (fails.length > 0) {
    log(`comment-proof: FAIL, ${fails.length} problems`)
    return 1
  }
  log(
    `comment-proof: PASS, ${oks.filter((l) => l.startsWith('OK ')).length} changed files`,
  )
  return 0
}
