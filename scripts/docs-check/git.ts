import { execFileSync } from 'node:child_process'

// Used by `comment-proof` and the inventory modes, read-only: `citations`, `comments` and `budgets`
// read the working tree, because CI's checkout is shallow and has no local branches.

/** Runs git with an argument array (never a shell string) from `root`. */
export function git(root: string, args: string[]): Buffer {
  return execFileSync('git', args, {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

/** Resolves a revision to its full commit sha. */
export function resolveRev(root: string, rev: string): string {
  return git(root, ['rev-parse', '--verify', `${rev}^{commit}`])
    .toString('utf8')
    .trim()
}

/** `git show <sha>:<path>` as text. */
export function showAt(root: string, sha: string, path: string): string {
  return git(root, ['show', `${sha}:${path}`]).toString('utf8')
}
