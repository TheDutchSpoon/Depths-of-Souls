---
name: slice-plan
description: Write (or revise) the implementation plan for a Depths of Souls slice from its kickoff, then stop for design review.
disable-model-invocation: true
argument-hint: <slice-id, e.g. 4.1-H2b2>
---

Slice: $ARGUMENTS. If no slice id was given, ask for it and stop.

1. Read `.claude/workflow/coding-rules.md` and follow it throughout. It tells you which mailbox
   folder this slice id maps to and what to read.
2. Read `kickoff.md` in the mailbox. If it's missing, stop and say so.
3. If `plan.md` already exists, this is a revision: read the highest-numbered
   `plan-handout-r<N>.md` (not the review), fold every item into `plan.md`, and add a
   `## Revision <n>: what changed` section at its top. Re-read any kickoff or doc line it names.
4. Otherwise write `plan.md` in the mailbox:
   - approach and module changes, by file;
   - the golden policy, restated from the kickoff;
   - for each mechanism, the test that will fail with it removed, at every site;
   - every ASSUMPTION marked inline, and collected in an **Assumptions checklist** at the end.
5. **Stop.** No code before the plan is approved. Reply with one line: the plan's path and how many
   assumptions it lists.
