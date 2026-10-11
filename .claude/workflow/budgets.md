# Size budgets

Read by `npm run docs:check -- budgets`, which prints each file's size against its budget, and by
the PR review when a doc sync takes a file over (`workflow/pr-review.md#over-budget`). Going over
never fails CI.

A budget is the file's size when it was set, plus 20%, rounded up to a whole KB (1 KB = 1000
bytes). Only the design agent edits this table. Raising a budget is Duncan's decision (below).

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

## Over budget

The PR review whose doc sync takes a file over its budget resolves it, as a decide-point with the
design agent's recommendation. Prefer the first two where they make sense: they cut what every chat
that reads the file pays for.

- **Condense** it, if the growth is accretion (history, duplicates, restated rules).
- **Split it by subsystem**, if it is genuinely new rules that stand apart from the rest of the
  file.
- **Raise the budget**, when neither makes sense: the growth is new rules that belong with the
  file's others, so a split would scatter one subsystem across files a slice must read together.
  Duncan's decision: the review edits the table above and gives the reason in its **Docs edited**.

Going over is a prompt to choose, not an order to cut rules. A condense or a split runs as a
docs-only slice before the next kickoff (`WORKFLOWS.md#condensing-a-doc-over-budget`,
`workflow/condense.md`): the review writes its `brief.md` (the files, their sizes, what grew) in the
next free slice id's mailbox.
