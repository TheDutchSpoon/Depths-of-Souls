---
name: slice-verify
description: (Phase 4.2 only) Verify a Depths of Souls Phase 4.2 condensing slice against the old docs and the code, and write the verify report.
disable-model-invocation: true
argument-hint: <slice-id> <round, e.g. 4.2-B 1>
---

Slice and round: $ARGUMENTS (`<slice-id> <N>`). If either is missing, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` (its reading list does not apply here: read what this
   command names) and `.claude/phases/4.2/brief.md` ("Rules for the new spec", "Condensing rules",
   "Inventory format").
2. Read `verify-request.md` in the mailbox, the latest round. It names the files condensed and
   anything to check specially.
3. Run `npm run docs:check -- inventory <slice>` and record the result.
4. For every inventory row, check:
   - **the fate is honest:** a `dropped` unit really is superseded, duplicated, provenance, history,
     or arithmetic a named golden carries; a `merged` or `moved` unit's content is in its new home;
   - **nothing was lost or changed:** the new text says what the old unit said, read side by side
     (`git show 892f1b8:.claude/CONVENTIONS.md` / `GAME_DESIGN.md`);
   - **the spec matches `main`:** data shapes, names and numbers against `src/` (cite `file:line`).
5. Check the other direction too: no sentence in the condensed files that traces to no unit.
6. Write `verify-r<N>.md` in the mailbox:
   - the check's result and the counts (rows checked, findings);
   - **Findings**, one per problem: the row, what's wrong, the evidence;
   - **Spec and code disagree:** each case, both sides quoted, with `file:line`. Don't propose which
     is right;
   - **Stale comments in `src/`** found on the way, for 4.2-G.
7. Never edit the docs or the code, and never commit. Reply with one line: the report's path and
   the number of findings.
