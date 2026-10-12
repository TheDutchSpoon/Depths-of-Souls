import { existsSync, readFileSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import ts from 'typescript'
import { git, resolveRev } from './git.ts'
import {
  baseHits,
  caseCollisions,
  countOfName,
  loadRenames,
  specifierStem,
  stemOf,
} from './renames.ts'
import type { RenameFile, RenameName } from './renames.ts'
import { fullName, parse, scanSource, scriptKind } from './scanner.ts'
import { identifiersOf, literalsOf } from './tokens.ts'
import type { Literal } from './tokens.ts'
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
//
// `--renames <file>` also lets the change rename files, identifiers and string literals
// (`renames.ts`). A listed file pair is one file: the importers' specifiers for it, and each listed
// identifier or literal, are read as one token on both sides, and the rest of the code must be
// equal. A listed name that matches more or fewer occurrences than it says, a new name that is
// already a name in the base, or a pair that is not a rename fails. With `--renames` the line
// wrapping and trailing commas of the code are not compared: a renamed import is a different
// width, so the formatter wraps it differently.

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

function occurrences(literals: Literal[], text: string): number {
  return literals.filter((l) => l.text === text).length
}

interface Edit {
  from: number
  to: number
  text: string
}

/** `text` with each edit's span replaced; the edits must not overlap. */
function applyEdits(text: string, edits: Edit[]): string {
  let out = text
  for (const e of [...edits].sort((a, b) => b.from - a.from))
    out = out.slice(0, e.from) + e.text + out.slice(e.to)
  return out
}

/** `text` with every literal that has a token replaced by it: quoted for a string, bare inside a template. */
function literalEdits(
  literals: Literal[],
  tokenOf: (literal: Literal) => string | undefined,
): Edit[] {
  const edits: Edit[] = []
  for (const l of literals) {
    const token = tokenOf(l)
    if (token !== undefined)
      edits.push({ from: l.from, to: l.to, text: l.quoted ? `'${token}'` : token })
  }
  return edits
}

/** The tokens of a printed file, one statement or block edge per line, without trailing commas. */
function layoutFree(file: string, printedText: string): string {
  const tokens: string[] = []
  const sf = parse(file, printedText)
  const visit = (node: ts.Node) => {
    const children = node
      .getChildren(sf)
      .filter(
        (c) =>
          c.kind < ts.SyntaxKind.FirstJSDocNode || c.kind > ts.SyntaxKind.LastJSDocNode,
      )
    if (children.length === 0) {
      if (
        node.kind !== ts.SyntaxKind.SyntaxList &&
        node.kind !== ts.SyntaxKind.EndOfFileToken
      )
        tokens.push(node.getText(sf))
      return
    }
    for (const child of children) visit(child)
  }
  visit(sf)
  return tokens
    .filter((t, i) => !(t === ',' && /^[)\]}>]$/.test(tokens[i + 1] ?? '')))
    .map((t) => (/^[;{}]$/.test(t) ? `${t}\n` : `${t} `))
    .join('')
}

/**
 * The file printed without its comments. With `layoutFree`, line wrapping and trailing commas
 * are dropped as well: the printer keeps the source's line breaks, and a longer or shorter name
 * makes the formatter wrap a line differently. The printer ends every statement with a semicolon,
 * so joining its tokens loses no statement boundary.
 */
function printed(file: string, text: string, layout: boolean): string {
  const out = ts.createPrinter({ removeComments: true }).printFile(parse(file, text))
  return layout ? layoutFree(file, out) : out
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

interface RenameScope {
  baseDir: string
  headDir: string
  /** The listed file renames that passed their own check; a specifier token is an index into this. */
  files: RenameFile[]
  identifiers: RenameName[]
  literals: RenameName[]
}

interface FileVerdict {
  reasons: string[]
  masked: number
  pairs: string[]
  specifiers: number
  identifiers: number
  literals: number
}

function groupByNew(entries: RenameName[]): Map<string, RenameName[]> {
  const groups = new Map<string, RenameName[]>()
  for (const e of entries) groups.set(e.new, [...(groups.get(e.new) ?? []), e])
  return groups
}

function compareCode(
  file: string,
  base: string,
  head: string,
  entries: MaskEntry[],
  rename?: RenameScope,
): FileVerdict {
  const verdict: FileVerdict = {
    reasons: [],
    masked: 0,
    pairs: [],
    specifiers: 0,
    identifiers: 0,
    literals: 0,
  }
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

  // The rename map: each listed literal and identifier is one token on both sides, a name that
  // is not listed stays as it is, so it must be equal.
  const idBase = new Map<string, string>()
  const idHead = new Map<string, string>()
  const baseIds = rename ? identifiersOf(file, base) : []
  const headIds = rename ? identifiersOf(file, head) : []
  if (rename) {
    let r = 0
    for (const [newText, group] of groupByNew(rename.literals)) {
      const token = `RENLIT${r++}`
      for (const e of group) {
        tokens.set(e.old, token)
        const found = occurrences(baseLits, e.old)
        if (found !== countOfName(e))
          countReasons.push(
            `renames literal ${shown(e.old)} -> ${shown(e.new)} expects ${countOfName(e)} in the base, found ${found}`,
          )
      }
      headTokens.set(newText, token)
      const expected = group.reduce((sum, e) => sum + countOfName(e), 0)
      const found = occurrences(headLits, newText)
      if (found !== expected)
        countReasons.push(
          `renames: literal ${shown(newText)} occurs ${found} times in the working tree, expected ${expected}`,
        )
      verdict.literals += expected
    }
    for (const [newText, group] of groupByNew(rename.identifiers)) {
      const token = `RENID${r++}`
      for (const e of group) {
        idBase.set(e.old, token)
        const found = baseIds.filter((t) => t.text === e.old).length
        if (found !== countOfName(e))
          countReasons.push(
            `renames identifier ${e.old} -> ${e.new} expects ${countOfName(e)} in the base, found ${found}`,
          )
      }
      idHead.set(newText, token)
      const expected = group.reduce((sum, e) => sum + countOfName(e), 0)
      const found = headIds.filter((t) => t.text === newText).length
      if (found !== expected)
        countReasons.push(
          `renames: identifier ${newText} occurs ${found} times in the working tree, expected ${expected}`,
        )
      verdict.identifiers += expected
    }
  }
  verdict.reasons.push(...countReasons)

  if (countReasons.length === 0) {
    const specifierToken = (dir: string, side: 'old' | 'new') => (l: Literal) => {
      if (!rename || l.context !== 'specifier') return undefined
      const stem = specifierStem(dir, l.text)
      const i = rename.files.findIndex((f) => stemOf(f[side]) === stem)
      return i < 0 ? undefined : `SPEC${i}`
    }
    const baseSpec = specifierToken(rename?.baseDir ?? '', 'old')
    const headSpec = specifierToken(rename?.headDir ?? '', 'new')
    const baseEdits = literalEdits(baseLits, (l) => baseSpec(l) ?? tokens.get(l.text))
    const headEdits = literalEdits(headLits, (l) => headSpec(l) ?? headTokens.get(l.text))
    verdict.specifiers = baseLits.filter((l) => baseSpec(l) !== undefined).length
    for (const t of baseIds) {
      const token = idBase.get(t.text)
      if (token !== undefined) baseEdits.push({ from: t.from, to: t.to, text: token })
    }
    for (const t of headIds) {
      const token = idHead.get(t.text)
      if (token !== undefined) headEdits.push({ from: t.from, to: t.to, text: token })
    }
    const a = printed(file, applyEdits(base, baseEdits), rename !== undefined)
    const b = printed(file, applyEdits(head, headEdits), rename !== undefined)
    if (a !== b) verdict.reasons.push(`code differs at ${firstDifference(a, b)}`)
    for (const e of entries) {
      verdict.masked += countOf(e)
      verdict.pairs.push(
        `  ${shown(e.old)} -> ${shown(e.new)}${countOf(e) > 1 ? ` (x${countOf(e)})` : ''}`,
      )
    }
    for (const e of rename?.identifiers ?? [])
      verdict.pairs.push(
        `  identifier ${e.old} -> ${e.new}${countOfName(e) > 1 ? ` (x${countOfName(e)})` : ''}`,
      )
    for (const e of rename?.literals ?? [])
      verdict.pairs.push(
        `  literal ${shown(e.old)} -> ${shown(e.new)}${countOfName(e) > 1 ? ` (x${countOfName(e)})` : ''}`,
      )
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

/** Why a listed file rename is not a rename, or undefined when it is one. */
function pairProblem(
  f: RenameFile,
  baseFiles: Set<string>,
  headFiles: Set<string>,
  baseRev: string,
): string | undefined {
  if (!baseFiles.has(f.old)) return `${f.old} is not in ${baseRev}`
  if (headFiles.has(f.old)) return `${f.old} is still in the working tree`
  if (!headFiles.has(f.new)) return `${f.new} is not in the working tree`
  if (baseFiles.has(f.new)) return `${f.new} is already in ${baseRev}`
  if (posix.dirname(f.old) !== posix.dirname(f.new)) return 'the directory changes'
  if (posix.extname(f.old) !== posix.extname(f.new)) return 'the extension changes'
  if (!CODE.test(f.new)) return 'not a code file'
  return undefined
}

interface Loaded {
  basePath: string
  headPath: string
  baseText: string
  headText: string
  pair: boolean
}

/** Runs the proof and returns the exit code: 0 when every file is OK, 1 on any FAIL or git error. */
export function runCommentProof(
  root: string,
  baseRev: string,
  maskPath: string | undefined,
  log: (line: string) => void,
  renamesPath?: string,
): number {
  const entries = maskPath === undefined ? [] : loadMask(maskPath)
  const renames = renamesPath === undefined ? undefined : loadRenames(renamesPath)
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

  // The listed renames that are renames; the rest fail here and, being unpaired, as deleted or added.
  const pairs: RenameFile[] = []
  const byNew = new Map<string, RenameFile>()
  const byOld = new Set<string>()
  if (renames) {
    for (const f of renames.files) {
      const problem = pairProblem(f, baseFiles, headFiles, baseRev)
      if (problem !== undefined) {
        fails.push(
          `FAIL ${f.new}: renames entry ${f.old} -> ${f.new} not consumed (${problem})`,
        )
        continue
      }
      byNew.set(f.new, f)
      byOld.add(f.old)
      pairs.push(f)
    }
    for (const [path, other] of caseCollisions([
      ...new Set([...baseFiles, ...headFiles]),
    ]))
      fails.push(`FAIL ${path}: differs from ${other} only in case`)
    const collide = (
      kind: 'identifier' | 'literal',
      names: RenameName[],
      label: string,
    ) => {
      const hits = baseHits(root, sha, SCOPE, kind, [...new Set(names.map((n) => n.new))])
      for (const e of names) {
        const where = hits.get(e.new)
        if (where !== undefined)
          fails.push(
            `FAIL ${e.file}: ${label} ${shown(e.new)} already exists in ${baseRev} (${where})`,
          )
      }
    }
    collide('identifier', renames.identifiers, 'new identifier')
    collide('literal', renames.literals, 'new literal')
  }

  const loaded: Loaded[] = []
  for (const path of [...new Set([...baseFiles, ...headFiles])].sort()) {
    if (byOld.has(path)) continue
    if (!headFiles.has(path)) {
      fails.push(`FAIL ${path}: deleted (in ${baseRev}, not in the working tree)`)
      continue
    }
    const pair = byNew.get(path)
    const basePath = pair?.old ?? path
    if (!baseFiles.has(basePath)) {
      fails.push(`FAIL ${path}: added (not in ${baseRev})`)
      continue
    }
    const baseBytes = git(root, ['show', `${sha}:${basePath}`])
    const headBytes = readFileSync(join(root, path))
    if (!CODE.test(path)) {
      if (!baseBytes.equals(headBytes)) fails.push(`FAIL ${path}: non-code file changed`)
      continue
    }
    loaded.push({
      basePath,
      headPath: path,
      baseText: baseBytes.toString('utf8').replace(/\r/g, ''),
      headText: headBytes.toString('utf8').replace(/\r/g, ''),
      pair: pair !== undefined,
    })
  }

  // Specifiers are counted over the whole tree, changed or not: an importer left on the old name
  // is a break the importer's own diff would not show.
  const specBase = pairs.map(() => 0)
  const specHead = pairs.map(() => 0)
  if (pairs.length > 0) {
    const needles = pairs.flatMap((f) => [
      posix.basename(stemOf(f.old)),
      posix.basename(stemOf(f.new)),
    ])
    const specifiersOf = (path: string, text: string, dir: string) =>
      needles.some((n) => text.includes(n))
        ? literalsOf(path, text)
            .filter((l) => l.context === 'specifier')
            .map((l) => specifierStem(dir, l.text))
        : []
    for (const l of loaded) {
      for (const stem of specifiersOf(l.basePath, l.baseText, posix.dirname(l.basePath)))
        pairs.forEach((f, i) => {
          if (stem === stemOf(f.old)) specBase[i]++
        })
      for (const stem of specifiersOf(l.headPath, l.headText, posix.dirname(l.headPath)))
        pairs.forEach((f, i) => {
          if (stem === stemOf(f.new)) specHead[i]++
          if (stem === stemOf(f.old))
            fails.push(
              `FAIL ${l.headPath}: imports ${f.old}, which was renamed to ${f.new}`,
            )
        })
    }
    pairs.forEach((f, i) => {
      const expected = f.imports ?? 0
      if (specBase[i] !== expected || specHead[i] !== expected)
        fails.push(
          `FAIL ${f.new}: renames entry ${f.old} -> ${f.new} expects ${expected} importing specifiers, found ${specBase[i]} in the base and ${specHead[i]} in the working tree`,
        )
    })
  }

  for (const l of loaded) {
    if (!l.pair && l.baseText === l.headText) continue
    visited.add(l.headPath)
    const scope: RenameScope | undefined = renames && {
      baseDir: posix.dirname(l.basePath),
      headDir: posix.dirname(l.headPath),
      files: pairs,
      identifiers: renames.identifiers.filter((e) => e.file === l.headPath),
      literals: renames.literals.filter((e) => e.file === l.headPath),
    }
    const verdict = compareCode(
      l.headPath,
      l.baseText,
      l.headText,
      entries.filter((e) => e.file === l.headPath),
      scope,
    )
    if (verdict.reasons.length > 0)
      for (const reason of verdict.reasons) fails.push(`FAIL ${l.headPath}: ${reason}`)
    else {
      const notes: string[] = []
      if (l.pair) {
        const i = pairs.findIndex((f) => f.new === l.headPath)
        notes.push(`renamed from ${l.basePath}`, `imports ${specBase[i]}`)
      } else if (verdict.specifiers > 0) notes.push(`specifiers ${verdict.specifiers}`)
      if (verdict.identifiers > 0) notes.push(`identifiers ${verdict.identifiers}`)
      if (verdict.literals > 0) notes.push(`literals ${verdict.literals}`)
      if (verdict.masked > 0) notes.push(`masked ${verdict.masked}`)
      oks.push(`OK ${l.headPath}${notes.length > 0 ? ` (${notes.join('; ')})` : ''}`)
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
  for (const e of renames?.identifiers ?? [])
    if (!visited.has(e.file))
      fails.push(
        `FAIL ${e.file}: renames identifier ${e.old} -> ${e.new} not consumed (no code change in that path, or it is not a file in scope)`,
      )
  for (const e of renames?.literals ?? [])
    if (!visited.has(e.file))
      fails.push(
        `FAIL ${e.file}: renames literal ${shown(e.old)} -> ${shown(e.new)} not consumed (no code change in that path, or it is not a file in scope)`,
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
