# Kickoff — Phase 4.2 — Slice A: The mechanical restructure

Build ONLY this slice. Standing rules: `.claude/workflow/coding-rules.md`, including its Phase 4.2
exception: `move` writes `CONVENTIONS.md`, `VISION.md`, `OPEN_QUESTIONS.md` and `spec/`, and you
edit no other living doc.

## Read (in addition to the standing list)

- `.claude/phases/4.2/A/brief.md`, all of it.
- `.claude/phases/4.2/brief.md`: "Target layout", "The file map", "Checks", "Inventory format",
  "Process for 4.2", "Phase-4.2-only text". Read "Rules for the new spec" for context only: you write
  none of it.
- The pinned inputs, `git show 892f1b8:.claude/CONVENTIONS.md` and `…:.claude/GAME_DESIGN.md`. For
  this slice they're data: read them for structure (headings, fences, blank lines), not content.
- The tooling the script plugs into: `package.json` scripts, `tsconfig.node.json`,
  `eslint.config.js`, `.prettierignore`, `.gitattributes` (`* text=auto eol=lf`).
- No spec reading: nothing in `src/` changes.

## Scope

One script, `scripts/docs-check.ts`, run by Node's type stripping as `npm run docs:check -- <mode>`,
with four modes: `move`, `line-proof`, `inventory-skeleton <slice>` and `inventory <slice>`, each
as the phase and slice briefs specify. Running `move` once produces the 13 files of the target
layout. `tsconfig.node.json` gains `scripts` in its `include`, so `tsc -b` type-checks the script.
Not in scope: any wording, heading-level or citation change in the moved text; `src/`; CI; deleting
`GAME_DESIGN.md` (list it under **To delete**); any living doc outside the 13 files (the doc map in
`CLAUDE.md`, `WORKFLOWS.md` and `workflow/` is mine, at the PR review).

## Golden policy

**Byte-identical.** `src/` is untouched, so every golden and the corpus digest fixture are
unchanged, and the test count equals `main`'s, file by file.

## Traps

1. **The unit definition has one reading that matches the brief's counts.** A paragraph starts
   only at the top of a file or after a blank line. A paragraph directly under a heading (no blank
   line between) belongs to the heading's unit, and a numbered item (`1. `) after a blank line is
   a paragraph start. That gives CONVENTIONS 261 and GAME_DESIGN 262. A Markdown parser's reading
   gives 264 and 270, so don't use one. The script asserts 261/262. The phase brief now says this
   explicitly ("Inventory").
2. **The brief's size table measures the moved rows only** (decimal kB, without the title,
   read-when line and half headings). A whole file is about 0.1 kB larger. Report both numbers; only
   the rows-only bytes should match the table to 0.1 kB.
3. **One map shared by `move` and `line-proof` defeats the independence the brief asks for.** If
   both read the same hand-copied constant, a typo in a line range passes both checks.
   Recommendation (mark it an ASSUMPTION): `line-proof` parses the two map tables out of
   `phases/4.2/brief.md`, and `move` uses its own constant. Both assert that each row's first line
   contains its label (with `…` stripped and `\|` unescaped: row C:555 has escaped pipes).
4. **How rows join is unpinned, and only the placement check can catch damage there.** Many rows
   end mid-bullet with no trailing blank line (for example C:1021–1023, which in
   `spec/statuses.md` is followed by C:1610's heading). The multiset check ignores blank lines and
   strips trailing whitespace, so it cannot see a dropped blank line or a trimmed space inside a
   row. Pin one separator rule in the plan (ASSUMPTION). Recommendation: nothing inserted between
   rows; one blank line after each `## <half>` heading, and one before it unless the previous line
   is already blank. Make the placement check exact against that rule: whole lines, blank lines and
   trailing whitespace included. `move` copies rows byte for byte and never trims.
5. **Never read the old text from the working tree.** `move` overwrites `CONVENTIONS.md`, so a
   second run that read the tree would read its own output. Every mode reads the pinned files
   with `git show 892f1b8:…` and asserts the sha256 prefixes (`91455dd2026ba18d`,
   `0970f347753833df`) of the blob bytes. Call git with `execFileSync` and an argument array, not a
   shell string (Duncan is on Windows). Write UTF-8 without a BOM and `\n` line endings. Strip `\r`
   from any working-tree file you read.
6. **The inventory base is `git merge-base HEAD main`, not a fixed commit** (decided today; the
   phase brief now says so). B's and F's other files are read and glob-expanded at that base with
   `git ls-tree`/`git show`, never from the working tree, which the slice is rewriting. During this
   PR the base is `ba18fa0`, so `inventory-skeleton B` works with no flag. Unit ids for those files
   are `<path>:<line>`. Pin whether `<path>` is relative to the repo root or to `.claude/`
   (recommendation: `.claude/`, as the briefs name the files). B's glob does not include
   `species/_species-backlog.md`.
7. **Units of the spec slices come from the pinned files**, assigned by their map row's target.
   F's "spec files" include `CONVENTIONS.md`, `VISION.md` and `OPEN_QUESTIONS.md`. Across C to F the
   pinned units must sum to 523 (261 + 262), with each one in exactly one slice. Use that as an
   assertion.
8. **`inventory` resolves `file#anchor` with GitHub's heading-anchor rules**, and 4.2-G turns the
   same resolver into a blocking CI check, so build it once, here, without a dependency: lowercase;
   inline markup stripped; punctuation other than `-` and `_` removed; spaces become `-`; a
   repeated heading gets `-1`, `-2`. Pin how New home lists several anchors (recommendation:
   backticked, comma-separated), and accept the brief's own example row as written. Table cells may
   hold `\|` and backticks.
9. **The 4.2-only modes carry the marker.** Under "Phase-4.2-only text", `move`, `line-proof`,
   `inventory-skeleton` and `inventory` are each marked `(Phase 4.2 only)` in the script, so 4.2-G's
   grep finds them. The `docs:check` npm script itself stays (4.2-G adds lasting modes), so it gets
   no marker.
10. **Leave the moved headings alone.** `## Design` sits beside moved headings like
    `## 5. Creatures`. That's expected, because heading levels change in B to F. Don't "fix" it.
11. **Type stripping limits the TypeScript.** No enums, namespaces or parameter properties
    (`tsconfig.node.json` already sets `erasableSyntaxOnly`). Check `node --version` against the
    lockfile's engines (`^22.22.2 || ^24.15.0`) and CI's Node 24. If eslint or any config other
    than `tsconfig.node.json` needs a change for `scripts/` (Node globals, say), make it an
    ASSUMPTION in the plan, and I'll widen the brief's allowed diff at the plan review.

## Must stay green

- `npm run test`, `lint`, `format:check`, `build` and `npx tsc -b`.
- Every golden and the corpus digest fixture, unchanged.
- `git diff main -- src` is empty.

## The PR must prove

- **`line-proof` passes,** with its full output in `evidence/line-proof.txt`: line and non-blank
  counts per old file, per-file rows-only bytes next to the brief's table, and whole-file bytes.
- **`move` is deterministic:** two runs, the same sha256 for each of the 13 files.
- **Each check fails on a planted fault,** run in a scratch clone outside the repo, with output
  in `evidence/`:
  - `line-proof`: a line deleted, a line duplicated, two rows swapped within a file, a row in the
    wrong half, a row in the wrong file, one byte changed inside a row, a blank line dropped
    inside a row (show that the placement check catches it and the multiset check doesn't);
  - the pinned-source guard: a wrong sha prefix stops the run;
  - `inventory`, on small hand-made inventories: a unit missing, a unit twice, a unit from another
    slice, an unknown fate, a New home whose anchor doesn't exist, a non-`dropped` row with no New
    home, a non-`kept` row with no Reason; and a passing one that includes the brief's example row.
    Anchor cases cover inline code, punctuation and a repeated heading.
- **Unit counts:** 261 and 262, and `inventory-skeleton` for B, C, D, E and F with each count. My
  independent count, from the rule in trap 1: B 228 (content 140, specializations 42,
  `species-locked.md` 46), C 154, D 172, E 87, and 110 for F's pinned files. If yours differ,
  say which reading differs. Don't adjust either count to fit.
- **The diff touches only** the 13 files, `scripts/docs-check.ts`, `package.json`,
  `tsconfig.node.json` (its `include`) and the mailbox. `GAME_DESIGN.md` is listed under
  **To delete**.
- All gates green, with the test count reconciled file by file against `main`.

## Docs edited

- `phases/4.2/brief.md`, "Checks": the size table measures moved rows only. "Inventory": the
  paragraph-start rule that gives 261/262, and the inventory base, now `git merge-base HEAD main`
  instead of A's merge commit (Duncan's call, 2026-10-10: it works during A's PR with no flag, and
  F's inventory covers what B to E add to ROADMAP).
- `phases/4.2/A/brief.md`: the script is `scripts/docs-check.ts`, type-checked through
  `tsconfig.node.json`, which joins the allowed diff (Duncan's call, 2026-10-10: the script
  becomes a blocking CI check in 4.2-G, and today no gate checks code outside `src/`).
