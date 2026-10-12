import { readFileSync } from 'node:fs'
import { posix, resolve } from 'node:path'
import { git, showAt } from './git.ts'
import { identifiersOf, literalsOf } from './tokens.ts'
import { UsageError } from './usage.ts'

// The rename map of `comment-proof --renames`: the files, identifiers and string literals a
// change is allowed to rename. A rename is proved the way a mask is: the listed names are
// rewritten to one token on both sides and the rest of the code must then be equal, so a map
// entry that matches more, fewer or other occurrences than it lists fails.

export interface RenameFile {
  old: string
  new: string
  /** How many module specifiers, across the tree, name the old file; 0 when absent. */
  imports?: number
}

export interface RenameName {
  /** The working-tree path of the file the name is in. */
  file: string
  old: string
  new: string
  count?: number
}

export interface Renames {
  files: RenameFile[]
  identifiers: RenameName[]
  literals: RenameName[]
}

export function countOfName(entry: RenameName): number {
  return entry.count ?? 1
}

function fail(path: string, message: string): never {
  throw new UsageError(`renames ${path}: ${message}`)
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function loadNames(path: string, raw: unknown, key: string): RenameName[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return fail(path, `${key} is not an array`)
  const entries = raw.map((item: unknown, i): RenameName => {
    const e = item as Partial<RenameName> | null
    if (
      !e ||
      !isNonEmpty(e.file) ||
      !isNonEmpty(e.old) ||
      !isNonEmpty(e.new) ||
      (e.count !== undefined && (!Number.isInteger(e.count) || e.count < 1))
    )
      return fail(
        path,
        `${key} entry ${i} needs { file, old, new } and an optional count of 1 or more`,
      )
    return { file: e.file, old: e.old, new: e.new, count: e.count }
  })
  for (const e of entries) {
    const label = `${key} ${e.file}: ${JSON.stringify(e.old)}`
    if (e.old === e.new) fail(path, `${label} maps to itself`)
    for (const other of entries) {
      if (other === e) continue
      if (other.file === e.file && other.old === e.old)
        fail(path, `${label} has two entries (use count for the same new text)`)
      if (other.file === e.file && other.old === e.new)
        fail(path, `${label} maps to another entry's old text (a chain or swap)`)
      // Two different olds to one new would merge two names into one on both sides.
      if (other.new === e.new && other.old !== e.old)
        fail(
          path,
          `${key} ${JSON.stringify(e.old)} and ${JSON.stringify(other.old)} both map to ${JSON.stringify(e.new)} (the map must be injective)`,
        )
    }
  }
  return entries
}

/** Reads a rename map; every shape error is a usage error, raised before any file is compared. */
export function loadRenames(path: string): Renames {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(resolve(path), 'utf8'))
  } catch (e) {
    throw new UsageError(`renames ${path}: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return fail(path, 'not an object')
  const map = raw as Record<string, unknown>
  if (!Array.isArray(map.files)) return fail(path, 'files is not an array')
  const files = map.files.map((item: unknown, i): RenameFile => {
    const e = item as Partial<RenameFile> | null
    if (
      !e ||
      !isNonEmpty(e.old) ||
      !isNonEmpty(e.new) ||
      (e.imports !== undefined && (!Number.isInteger(e.imports) || e.imports < 0))
    )
      return fail(
        path,
        `files entry ${i} needs { old, new } and an optional imports of 0 or more`,
      )
    if (e.old === e.new) return fail(path, `files ${e.old} maps to itself`)
    return { old: e.old, new: e.new, imports: e.imports }
  })
  for (const e of files)
    for (const other of files) {
      if (other === e) continue
      if (other.old === e.old || other.new === e.new)
        fail(path, `files ${e.old} -> ${e.new} shares a path with another entry`)
      if (other.old === e.new)
        fail(path, `files ${e.old} -> ${e.new} chains into another entry`)
    }
  return {
    files,
    identifiers: loadNames(path, map.identifiers, 'identifiers'),
    literals: loadNames(path, map.literals, 'literals'),
  }
}

/** A path without its code extension: what a module specifier names. */
export function stemOf(path: string): string {
  return path.replace(/\.(?:tsx?|jsx?|[cm]js)$/, '')
}

/** The stem a relative module specifier names, resolved against the importing file's directory. */
export function specifierStem(dir: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  return stemOf(posix.normalize(posix.join(dir, specifier)))
}

/**
 * For each text, the first base file where it is an identifier (`kind: 'identifier'`) or a string
 * literal (`'literal'`). `git grep` finds the candidate files; a parse of each decides, so a text
 * that appears only in a comment is not a hit.
 */
export function baseHits(
  root: string,
  sha: string,
  scope: string[],
  kind: 'identifier' | 'literal',
  texts: string[],
): Map<string, string> {
  const wanted = new Set(texts)
  const found = new Map<string, string>()
  const candidates = new Set<string>()
  const list = [...wanted]
  for (let i = 0; i < list.length; i += 40) {
    const args = ['grep', '-l', '-z', '-F']
    for (const text of list.slice(i, i + 40)) args.push('-e', text)
    args.push(sha, '--', ...scope)
    let out: Buffer
    try {
      out = git(root, args)
    } catch (e) {
      if ((e as { status?: number }).status === 1) continue
      throw e
    }
    for (const entry of out.toString('utf8').split('\0').filter(Boolean))
      candidates.add(entry.slice(sha.length + 1))
  }
  for (const path of [...candidates].sort()) {
    const text = showAt(root, sha, path).replace(/\r/g, '')
    const names =
      kind === 'identifier'
        ? identifiersOf(path, text).map((t) => t.text)
        : literalsOf(path, text).map((t) => t.text)
    for (const name of names)
      if (wanted.has(name) && !found.has(name)) found.set(name, path)
  }
  return found
}

/** Each path that differs from an earlier one only in case, as `[path, earlier]`: a Windows checkout cannot hold both. */
export function caseCollisions(paths: string[]): [string, string][] {
  const seen = new Map<string, string>()
  const out: [string, string][] = []
  for (const path of [...paths].sort()) {
    const other = seen.get(path.toLowerCase())
    if (other === undefined) seen.set(path.toLowerCase(), path)
    else out.push([path, other])
  }
  return out
}
