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
  a "bring it back" signal (WORKFLOWS "The human's judgment call"): say so, don't resolve it inline.

## Output: `plan-review.md` in the mailbox

One section per round (`## Round 1`, `## Round 2`, …), each with:

- **Verdict:** approved, or changes needed;
- **Plan fixes:** what the coding agent must change in the plan;
- **Assumptions:** each checklist item with confirm / correct / decide-point;
- **Decide-points:** 1–3 at most, each with your recommendation and why.

Then wait for Duncan's calls. Write his decisions into the round as **Decisions**, and into the
living docs in place. End the round with **Docs edited** (file + one-line reason each).

If the verdict is "changes needed", Duncan runs `/slice-plan <slice-id>` again; the coding agent
revises `plan.md` and adds what changed at its top, and the next round reviews that. A third round
is a signal to pull the slice back into a design pass instead.

When the plan is approved, tell Duncan it's ready to commit: the kickoff, the plan, this review and
the doc edits go in as **the first commit on the slice branch**, so the PR carries the spec it was
built against.
