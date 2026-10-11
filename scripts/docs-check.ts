// Docs checks, run as `npm run docs:check -- <mode>` (Node's type stripping; the only import
// outside Node is `typescript`, a devDependency `npm ci` installs).
//
// Modes:
//   citations [<file>...]     blocking in CI: every citation is a resolving `<path>.md#<anchor>`;
//                             with files, checks exactly those by the living-doc rules
//   budgets                   reported in CI, never fails: each budgeted doc's size against
//                             `.claude/workflow/budgets.md`
//   comments                  fails on a comment or test title that records history (not in CI yet);
//                             `--counts` and `--quotations` only report
//   comment-proof <base>      by hand: fails unless the working tree differs from <base> only in
//                             comments, apart from the literals a `--mask <file>` lists
//   inventory-skeleton        write the inventory of a living-doc condense (the units of the files
//                             as committed at a base revision)
//   inventory                 check that inventory against the units at the base it records
//
// `citations`, `comments` and `budgets` read the working tree and never call git (CI's checkout is
// shallow). `comment-proof` and the inventory modes call git, read-only, to read the text at a base
// revision.
//
// The logic is in `scripts/docs-check/`: `anchors` (GitHub's heading slugs), `citations`, `comments`
// and `scanner` (the comment scanner it and `comment-proof` share), `comment-proof`, `budgets`,
// `inventory`, `git` and `text` (shared helpers), `usage` (the usage error) and `cli` (argument
// handling). This file only wires them to the process.

import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { main } from './docs-check/cli.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

process.exitCode = main(process.argv.slice(2), ROOT, {
  log: (line) => console.log(line),
  error: (line) => console.error(line),
})
