# Size budgets

Read by `npm run docs:check -- budgets`, which prints each file's size against its budget, and by
the PR review when a doc sync takes a file over (`workflow/pr-review.md`). Going over never fails CI.

A budget is the file's size when it was set, plus 20%, rounded up to a whole KB (1 KB = 1000
bytes). Only the design agent edits this table; raising a budget is Duncan's decision, with the
reason in that review's docs-edited list.

| File | Budget (KB) |
| --- | --- |
| `CLAUDE.md` | 7 |
| `CONVENTIONS.md` | 29 |
| `spec/combat.md` | 43 |
| `spec/creatures.md` | 22 |
| `spec/effects.md` | 39 |
| `spec/progression.md` | 6 |
| `spec/responses.md` | 15 |
| `spec/run.md` | 22 |
| `spec/saves.md` | 5 |
| `spec/scripting.md` | 14 |
| `spec/statuses.md` | 21 |
| `spec/store.md` | 4 |
