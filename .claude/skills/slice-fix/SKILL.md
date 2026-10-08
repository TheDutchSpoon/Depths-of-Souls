---
name: slice-fix
description: Apply a Depths of Souls PR-review fix hand-out to a slice and write the next report.
disable-model-invocation: true
argument-hint: <slice-id> <round, e.g. 4.1-H2b2 1>
---

Slice and round: $ARGUMENTS (`<slice-id> <N>`). If either is missing, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` and follow it throughout.
2. Read `handout-r<N>.md` in the mailbox. It is the whole task: don't read the review notes, and
   don't go beyond what the hand-out asks. If something in it conflicts with the docs, stop and
   say so.
3. Re-read any living doc the hand-out names: the review may have changed it.
4. Apply the fixes, green every gate, and update the slice's phase record to match.
5. Write `report-r<N+1>.md` in the mailbox: each hand-out item with what changed and how it was
   checked, plus the standard report sections from `coding-rules.md`.
6. Never commit. Reply with a short summary.
