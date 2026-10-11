# Step — Condense (design agent)

Command in Cowork: `/slice-condense <slice-id>` for round 1, then `/slice-condense <slice-id> <N>`
after the coding agent's `verify-r<N-1>.md`, in the same chat. Read `design-rules.md` first.

A condense slice is docs-only. It runs when a PR review took a living doc over its budget and
Duncan chose to condense it or split it by subsystem (`workflow/budgets.md#over-budget`), before
the next slice's kickoff. The roles swap: you write, the coding agent verifies (`/slice-verify`),
and Duncan merges when a verify round has no findings (`WORKFLOWS.md#condensing-a-doc-over-budget`).
Golden policy: byte-identical; the slice changes only `.claude/`.

## Pre-flight

- `main` has the previous slice merged and every doc sync committed.
- The working tree is on this slice's branch, cut from current `main`, with no uncommitted change
  to the files you condense. If not, ask Duncan.
- Read `workflow/design-rules.md#doc-edits` (what may be dropped, what is kept) and the slice's `brief.md`,
  which names the files and what grew.

## Round 1

1. **Before editing anything**, run
   `npm run docs:check -- inventory-skeleton <mailbox> <file>…`: the mailbox as
   `.claude/phases/<phase>/<slice>`, each file relative to `.claude/` (`spec/combat.md`). It lists
   the units of the files as committed at `HEAD`, writes the resolved sha into `inventory.md` as
   `Base:`, and refuses to overwrite an existing inventory. `HEAD` is the old text only until the
   condense is committed; after that, pass `--base <rev>`, the last commit before the condense.
2. Condense the files in place, per `workflow/design-rules.md#doc-edits`. Fill each inventory row as you go
   (format below); `Decided in` comes from the old text's own tags. Every sentence of the condensed
   text traces to a unit: no new rules.
3. A split moves units to a new file (fate `moved`, New home in the new file). Give the new file its
   "Read this when …" line, add it to `CLAUDE.md`'s file map and to `workflow/budgets.md`, and
   re-point every citation of a moved heading: `npm run docs:check -- citations` lists them. One in
   `src/` goes in a hand-out for the coding agent, since you never edit `src/`.
4. Run `npm run docs:check -- inventory <mailbox>` until it passes. It reads the units at the
   `Base:` sha, so it still sees the old text after Duncan commits the condense.
5. Where the spec and the code disagree, don't pick a side in the text: bring each case to Duncan
   with a recommendation (`workflow/design-rules.md#doc-edits`, "Spec and code disagree") and write his
   decision in before the verify.
6. Run `npm run docs:check -- budgets` and `-- citations`: every file is under budget and every
   citation resolves.
7. Write `verify-request.md` in the mailbox: the files condensed and the base sha; the row counts
   per fate; what to check hardest (every `dropped` as superseded, every large merge, every
   number); the decisions Duncan made in step 5.

## Inventory format

`inventory.md`, written by the skeleton: a `Base:` line, a `Files:` line, then one table with one
row per unit, in old-file order.

| Unit | Old label | Decided in | Fate | New home | Reason |
| --- | --- | --- | --- | --- | --- |
| spec/combat.md:212 | Damage channels and the Additional | 4.1-H2b2 | rewritten | `spec/combat.md#damage-channels-and-the-additional` | provenance dropped |

- **A unit** is a line of a base file that, outside code fences, is a heading, a top-level list item
  (`- ` at column 0), or the first line of a top-level paragraph (not indented, not a blockquote,
  table row or `---`). A paragraph starts only at the top of the file or after a blank line, so a
  paragraph directly under a heading belongs to the heading's unit. Nested bullets, tables and code
  belong to the unit above them.
- **The check:** every unit appears in exactly one row, with its own old label; Fate is one of
  `kept`, `rewritten`, `merged`, `moved`, `dropped`; New home is one or more backticked
  `<path>.md#<anchor>` that resolve today, for every fate but `dropped`; Reason is non-empty for
  every fate but `kept`.
- A `dropped` row names the home it duplicates, or why it goes, in its Reason, and leaves New home
  empty. A unit spread over several entries lists every entry's anchor in New home.

## Round N (after `verify-r<N-1>.md`)

1. Read `verify-r<N-1>.md`. Fix each finding, or say in this round why it isn't one.
2. Bring every "spec and code disagree" item to Duncan, as in round 1.
3. Re-run the inventory check, and append `## Round <N>` to `verify-request.md`: each finding and
   what changed.

When a verify round has no findings, tell Duncan the slice is ready to merge.

## Finish

A note for a later slice (a stale `src/` comment, a duplicate it should resolve) goes into that
slice's `brief.md`: the later slice reads its brief, not this mailbox. `verify-request.md` lists
the notes and where each went.

List every doc you edited, with a one-line reason each, at the end of `verify-request.md`.
