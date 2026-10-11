import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const made: string[] = []

/** A scratch tree with the given files (root-relative paths); removed by `cleanUp`. */
export function makeTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'))
  made.push(root)
  writeTree(root, files)
  return root
}

export function writeTree(root: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text, 'utf8')
  }
}

export function cleanUp(): void {
  for (const root of made.splice(0)) rmSync(root, { recursive: true, force: true })
}

/** Runs git in `root` with an identity, so a scratch repo can commit anywhere. */
export function gitIn(root: string, ...args: string[]): string {
  return execFileSync(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
    {
      cwd: root,
      encoding: 'utf8',
    },
  ).trim()
}

/** Collects what a mode logs, so a test can read it back. */
export function capture(): {
  lines: string[]
  errors: string[]
  io: { log: (l: string) => void; error: (l: string) => void }
} {
  const lines: string[] = []
  const errors: string[] = []
  return {
    lines,
    errors,
    io: { log: (l) => lines.push(l), error: (l) => errors.push(l) },
  }
}
