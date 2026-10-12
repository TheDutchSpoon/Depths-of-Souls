---
name: slice-build
description: Build an approved Depths of Souls slice to its plan, run every gate, and write the build report.
disable-model-invocation: true
argument-hint: <slice-id, e.g. 4.1-H2b2>
---

Slice: $ARGUMENTS. If no slice id was given, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` and follow it throughout.
2. Check the **Verdict** of the last round of `plan-review.md`, `## Round <N>`: if it is not
   **approved**, stop and say so. Read nothing else of the review: its notes are for the design
   agent and Duncan.
3. Read `kickoff.md`, `plan.md` and that round's `plan-handout-r<N>.md`: the corrections the build
   applies to the plan, or a line saying there are none. If it is missing, stop and say so. Where
   it and the plan disagree, the hand-out wins. An earlier round's hand-out is already folded into
   the plan: don't apply it again.
4. Re-read the living docs from the working tree, and any line the hand-out names: the plan review
   may have changed them.
5. Build to the plan as the hand-out corrects it. Anything you'd have to decide that the plan, the
   hand-out and the docs don't cover: stop and ask, don't guess.
6. Green every gate, then write `report-r1.md` in the mailbox (format in `coding-rules.md`) and the
   slice's phase record.
7. Never commit. Reply with a short summary: gates, test count, golden policy outcome, and any
   spec questions.
