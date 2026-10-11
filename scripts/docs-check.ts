// Docs checks, run as `npm run docs:check -- <mode>` (Node's type stripping, no dependencies).
//
// Modes:
//   citations                 blocking in CI: every citation is a resolving `<path>.md#<anchor>`
//   budgets                   reported in CI, never fails: each budgeted doc's size against
//                             `.claude/workflow/budgets.md`
//   inventory-skeleton        write the inventory of a living-doc condense (the units of the files
//                             as committed at a base revision)
//   inventory                 check that inventory against the units at the base it records
//
// `citations` and `budgets` read the working tree and never call git (CI's checkout is shallow).
// Only the inventory modes call git, to read the pre-condense text at the recorded base sha.
//
// The logic is in `scripts/docs-check/`: `anchors` (GitHub's heading slugs), `citations`,
// `budgets`, `inventory`, `git` and `text` (shared helpers), and `cli` (argument handling). This
// file only wires them to the process.

import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { main } from './docs-check/cli.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

process.exitCode = main(process.argv.slice(2), ROOT, {
  log: (line) => console.log(line),
  error: (line) => console.error(line),
})
