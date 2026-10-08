---
name: slice-build
description: Build an approved Depths of Souls slice to its plan, run every gate, and write the build report.
disable-model-invocation: true
argument-hint: <slice-id, e.g. 4.1-H2b2>
---

Slice: $ARGUMENTS. If no slice id was given, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` and follow it throughout.
2. Read `kickoff.md`, `plan.md` and `plan-review.md` in the mailbox. If the last round of
   `plan-review.md` is not **approved**, stop and say so.
3. Re-read the living docs from the working tree: the plan review may have changed them.
4. Build to the approved plan, including its corrections and decisions. Anything you'd have to
   decide that the plan and docs don't cover: stop and ask, don't guess.
5. Green every gate, then write `report-r1.md` in the mailbox (format in `coding-rules.md`) and the
   slice's phase record.
6. Never commit. Reply with a short summary: gates, test count, golden policy outcome, and any
   spec questions.
