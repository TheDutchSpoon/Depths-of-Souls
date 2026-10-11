import { resolve } from 'node:path'
import { runBudgets } from './budgets.ts'
import { runCitations } from './citations.ts'
import { runInventory, runInventorySkeleton } from './inventory.ts'

export const USAGE = `usage: npm run docs:check -- <mode> [--root <dir>]
  citations                                          fail on a citation that is not a resolving <path>.md#<anchor>
  budgets                                            print each budgeted doc's size against workflow/budgets.md
  inventory-skeleton <mailbox> <file>... [--base <rev>]  write <mailbox>/inventory.md for living docs under .claude/
  inventory <mailbox>                                check <mailbox>/inventory.md`

export interface Io {
  log: (line: string) => void
  error: (line: string) => void
}

/** Takes `--name <value>` out of `args`; undefined when absent, an error when it has no value. */
function takeOption(args: string[], name: string): string | undefined {
  const at = args.indexOf(name)
  if (at < 0) return undefined
  const value = args[at + 1]
  if (value === undefined || value.startsWith('--'))
    throw new UsageError(`${name} needs a value`)
  args.splice(at, 2)
  return value
}

class UsageError extends Error {}

/**
 * Runs a mode and returns the exit code: 0 pass, 1 problems found or a tool error, 2 bad usage.
 * `defaultRoot` is the repo root; `--root <dir>` points a mode at another tree.
 */
export function main(argv: string[], defaultRoot: string, io: Io): number {
  const args = [...argv]
  try {
    const root = resolve(takeOption(args, '--root') ?? defaultRoot)
    const base = takeOption(args, '--base')
    const [mode, ...rest] = args
    if (rest.some((a) => a.startsWith('--')))
      throw new UsageError(`unknown option ${rest.find((a) => a.startsWith('--'))}`)
    if (base !== undefined && mode !== 'inventory-skeleton')
      throw new UsageError('--base belongs to inventory-skeleton')
    switch (mode) {
      case 'citations':
        if (rest.length > 0) throw new UsageError('citations takes no arguments')
        return runCitations(root, io.log)
      case 'budgets':
        if (rest.length > 0) throw new UsageError('budgets takes no arguments')
        return runBudgets(root, io.log)
      case 'inventory-skeleton': {
        const [mailbox, ...files] = rest
        if (!mailbox || files.length === 0)
          throw new UsageError('inventory-skeleton needs a mailbox and at least one file')
        return runInventorySkeleton(root, mailbox, files, base ?? 'HEAD', io.log)
      }
      case 'inventory':
        if (rest.length !== 1) throw new UsageError('inventory needs one mailbox')
        return runInventory(root, rest[0], io.log)
      default:
        throw new UsageError(mode ? `unknown mode ${mode}` : 'no mode given')
    }
  } catch (e) {
    if (e instanceof UsageError) {
      io.error(`${e.message}\n${USAGE}`)
      return 2
    }
    io.error(e instanceof Error ? e.message : String(e))
    return 1
  }
}
