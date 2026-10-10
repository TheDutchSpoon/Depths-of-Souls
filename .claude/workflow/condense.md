# Step — Condense (design agent) (Phase 4.2 only)

Command in Cowork: `/slice-condense <slice-id>` for round 1, then `/slice-condense <slice-id> <N>`
after the coding agent's `verify-r<N-1>.md`, in the same chat. Read `design-rules.md` first. Used
only by Phase 4.2's condensing slices (B to F); see `.claude/phases/4.2/brief.md` "Process for 4.2".

## Pre-flight

- `main` has the previous slice merged and every doc-sync committed.
- The working tree is on this slice's branch, cut from current `main`. If not, ask Duncan.
- Read the phase brief ("Rules for the new spec", "Condensing rules", "Inventory format") and the
  slice's `brief.md`.

## Round 1

1. Run `npm run docs:check -- inventory-skeleton <slice>` and start `inventory.md` in the mailbox
   from its output.
2. Condense the slice's files in place, per the condensing rules. Fill each inventory row as you go;
   `Decided in` comes from the old text's own tags.
3. Run `npm run docs:check -- inventory <slice>` until it passes.
4. Where the spec and the code disagree, don't pick a side in the text: bring each case to Duncan
   with a recommendation, and write his decision in before the verify (the spec says what `main`
   does; an intended change goes to a brief as "Decided, not built").
5. Write `verify-request.md` in the mailbox: the files condensed; the row counts per fate; what to
   check hardest (every `dropped` as superseded, every large merge, every number); the decisions
   Duncan made in step 4.

## Round N (after `verify-r<N-1>.md`)

1. Read `verify-r<N-1>.md`. Fix each finding, or say in this round why it isn't one.
2. Bring every "spec and code disagree" item to Duncan, as in round 1.
3. Re-run the inventory check, and append `## Round <N>` to `verify-request.md`: each finding and
   what changed.

When a verify round has no findings, tell Duncan the slice is ready to merge.

## Finish

List every doc you edited, with a one-line reason each, at the end of `verify-request.md`.
