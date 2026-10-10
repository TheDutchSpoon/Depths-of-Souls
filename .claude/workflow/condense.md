# Step — Condense (design agent) (Phase 4.2 only)

Command in Cowork: `/slice-condense <slice-id>` for round 1, then `/slice-condense <slice-id> <N>`
after the coding agent's `verify-r<N-1>.md`, in the same chat. Read `design-rules.md` first. Used
only by Phase 4.2's condensing slices (B to F); see `.claude/phases/4.2/brief.md` "Process for 4.2".

## Pre-flight

- `main` has the previous slice merged and every doc-sync committed.
- The working tree is on this slice's branch, cut from current `main`. If not, ask Duncan.
- Read the phase brief ("Rules for the new spec", "Condensing rules", "Inventory format") and the
  slice's `brief.md`.
- Never run `docs:check -- move` or `line-proof` after 4.2-A. `move` rewrites the 13 files from
  the pinned commit with no check, over any condensed text, committed or not; `line-proof` fails by
  design once a file is condensed.

## Round 1

1. Run `npm run docs:check -- inventory-skeleton <slice>`. It writes `inventory.md` in the mailbox
   itself (it refuses to overwrite one) and prints the unit counts and the base.
2. Condense the slice's files in place, per the condensing rules. Fill each inventory row as you go;
   `Decided in` comes from the old text's own tags.
3. Run `npm run docs:check -- inventory <slice>` until it passes.
4. Where the spec and the code disagree, don't pick a side in the text: bring each case to Duncan
   with a recommendation, and write his decision in before the verify. Ask first whether it is a
   bug or a stale doc (phase brief, "Condensing rules"): for a stale doc the text says what `main`
   does and an intended change goes to a brief as "Decided, not built"; for a bug the text keeps
   the design and adds a `**Known bug:**` line pointing at the fix's listing.
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

A note for a later slice (a duplicate it should resolve, a link it must keep) goes into that
slice's `brief.md` under `## Known from earlier slices`: the later slice reads its brief, not this
mailbox. `verify-request.md` lists the notes and where each went.

List every doc you edited, with a one-line reason each, at the end of `verify-request.md`.
