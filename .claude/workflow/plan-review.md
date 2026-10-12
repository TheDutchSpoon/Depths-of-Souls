# Step 3 — Plan review (design agent)

Command in Cowork: `/plan-review <slice-id>`. Read `design-rules.md` first. Fresh chat per slice.

## Inputs

`kickoff.md` and `plan.md` from the mailbox, the brief section the kickoff names, and the living
docs from the working tree.

## Review

- Check the plan against the docs and the brief, not against its own claims.
- Go through the plan's ASSUMPTION checklist item by item: **confirm**, **correct**, or flag a
  **decide-point** with your recommendation.
- Check the plan names, for each mechanism, the test that fails with it removed, at every site.
- Check the golden policy matches the kickoff.
- Anything in the brief's Assumptions checklist the plan wants to **change** (not merely confirm) is
  a "bring it back" signal (`WORKFLOWS.md#the-humans-judgment-call-these-dont-remove`): say so, don't resolve it inline.

## Output: `plan-review.md` in the mailbox

One section per round (`## Round 1`, `## Round 2`, …), each with:

- **Verdict:** approved, or changes needed;
- **Plan fixes:** what the coding agent must change in the plan;
- **Assumptions:** each checklist item with confirm / correct / decide-point;
- **Decide-points:** each with your recommendation and why.

Then wait for Duncan's calls. Write his decisions into the round as **Decisions**, and into the
living docs in place. End the round with **Docs edited** (file + one-line reason each).

## Output: `plan-handout-r<N>.md` in the mailbox

After Duncan's calls, write the round's hand-out (`N` is the round), every round: the coding agent
reads it and never this review. It holds the round's verdict, its plan fixes and every decision that
changes what is built, and nothing else:

- each item is the end state, standalone: what to build, not what changed or why;
- each item names the plan section or ASSUMPTION it amends;
- a kickoff or living-doc line a decision edited is named, for the coding agent to re-read.

A round approved with nothing to correct still gets one, saying so in a line: build `plan.md` as it
stands. A missing hand-out is then always a mistake, never a signal.

- **Changes needed:** Duncan runs `/slice-plan <slice-id>` again; the coding agent folds the
  hand-out into `plan.md`, adds what changed at its top, and the next round reviews that, the
  fold-in included. A third round is a signal to pull the slice back into a design pass instead.
- **Approved:** the build reads `plan.md` and this round's hand-out; where they disagree, the
  hand-out wins. Earlier rounds' hand-outs are already in the plan. Tell Duncan it's
  ready to commit: the kickoff, the plan, this review, the hand-outs and the doc edits go in as
  **the first commit on the slice branch**, so the PR carries the spec it was built against.

