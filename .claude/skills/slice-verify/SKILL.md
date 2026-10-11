---
name: slice-verify
description: Verify a Depths of Souls condense slice (a living doc condensed or split to fit its size budget) against its base text and the code, and write the verify report.
disable-model-invocation: true
argument-hint: <slice-id> <round, e.g. 4.5-C 1>
---

Slice and round: $ARGUMENTS (`<slice-id> <N>`). If either is missing, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` (its reading list does not apply here: read what this
   command names), `.claude/workflow/design-rules.md#doc-edits` (what a condense may drop and must
   keep) and `.claude/workflow/condense.md#inventory-format`.
2. Read `verify-request.md` in the mailbox, the latest round. It names the files condensed, the
   base sha, and anything to check specially.
3. Run `npm run docs:check -- inventory <mailbox>` (the mailbox as `.claude/phases/<phase>/<slice>`)
   and record the result; then `npm run docs:check -- citations`, `-- comments` and `-- budgets`.
4. For every inventory row, check:
   - **the fate is honest:** a `dropped` unit really is superseded, duplicated, provenance, history,
     or arithmetic a named golden carries; a `merged` or `moved` unit's content is in its new home;
   - **nothing was lost or changed:** the new text says what the old unit said, read side by side
     with the base (`git show <base sha>:.claude/<file>`, the sha from `inventory.md`);
   - **the spec matches `main`:** data shapes, names and numbers against `src/` (cite `file:line`).
5. Check the other direction too: no sentence in the condensed files that traces to no unit.
6. Write `verify-r<N>.md` in the mailbox:
   - the checks' results and the counts (rows checked, findings);
   - **Findings**, one per problem: the row, what's wrong, the evidence;
   - **Spec and code disagree:** each case, both sides quoted, with `file:line`. Don't propose which
     is right;
   - **Stale comments in `src/`** found on the way, for the design agent to list for a later slice.
7. Never edit the docs or the code, and never commit. Reply with one line: the report's path and
   the number of findings.
