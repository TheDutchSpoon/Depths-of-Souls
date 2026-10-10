# Report r1 — Phase 4.2 — Slice A: The mechanical restructure

Built to `plan.md` as amended by plan fixes 1–8 in `plan-review.md` (Duncan's decision 1: fold). All
gates green; `src/` untouched. Nothing committed. Evidence is in `evidence/` (plain text, listed at
the end).

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 201 files, 1357 tests: 1356 passed, 1 skipped |
| `npm run lint` | clean (it now also lints `scripts/`) |
| `npm run format:check` | clean |
| `npm run build` | passes |
| `npx tsc -b` | passes; it type-checks `scripts/docs-check.ts` through `tsconfig.node.json` |
| `git diff main -- src` | empty |

**Test count reconciled file by file against `main`'s `src`** (`evidence/test-reconciliation.txt`).
Both runs used vitest's JSON reporter and compared per-file assertion counts. The `main` run was
in a scratch clone at HEAD (its `src/` equals `main`'s, see the empty diff above). Result: 201 files and
1357 tests on both sides, **0 files with a different count**. I added no vitest test (A1): the count
would have moved.

## Golden policy: byte-identical

`src/` is unchanged, so no golden and no fixture can differ. Checked by import, not by reading
diffs: the golden runner and the corpus digest test (`src/engine/corpus-digest.test.ts`) run inside
the 1356 passing tests, against the committed fixtures. `npm run corpus:update` was not run. Corpus
digest: unchanged.

## What the diff touches

`git status` shows exactly: `.claude/CONVENTIONS.md` (overwritten in place), the new
`.claude/VISION.md`, `.claude/OPEN_QUESTIONS.md` and the ten `.claude/spec/*.md`, `scripts/docs-check.ts`,
`package.json` (one script: `docs:check`), `tsconfig.node.json` (`include` gains `scripts`), and the
mailbox. The lockfile is unchanged (no dependency). No ESLint or Prettier change (A2): `process` is
imported from `node:process`, and `.prettierignore` already excludes `.claude`.

## The script, `scripts/docs-check.ts`

Four modes (`move`, `line-proof`, `inventory-skeleton <slice>`, `inventory <slice>`), no dependency,
run by Node's type stripping (Node 24.19.0 here; CI 24; engines `^22.22.2 || ^24.15.0`). Plan fix 6:
every 4.2-only declaration carries `(Phase 4.2 only)` — `PINNED_COMMIT`, `PINNED`, `readPinned`,
`HALF_ORDER`, `MAP`, `rowLabelOk`, `READ_WHEN`, all four mode functions, the brief-table parsers,
`countLines`, `SLICES`, `unitsOf`, `makeLabel`, `pinnedUnits`, `assertUnitPartition`,
`inventoryBase`, `otherFiles`, `sliceUnits`, `sliceArg`, `normalise`, `inventoryLabelOk` and the usage
lines. **Lasting** (no marker): `git`, `splitLines`, `readWorkingLines`, `splitCells`, `FENCE`,
`resolveAnchors`, and the dispatch (`main`). `capitalise`, `sha256`, `SPEC_NAMES`, `FATES`,
`INVENTORY_HEADER` and the interfaces are small 4.2-only helpers with no marker of their own; 4.2-G's
grep will leave them behind unless it also removes what is unused. I'd call that out in G's brief.

Pinned inputs: every mode reads through `readPinned`, which runs `git show 892f1b8:…` with an
argument array, checks the sha256 prefix of the blob bytes and the line count, and stops on a
mismatch. `move` and `line-proof` share no map, assembly or read-when code (A3): `move` has its own
`MAP`; `line-proof` parses the two map tables, the size column and the read-when table out of the
briefs, and builds expected line arrays row by row.

## `line-proof`: passes (`evidence/line-proof.txt`)

`map PASS, multiset PASS, placement PASS`. Old files: CONVENTIONS 2160 lines / 2089 non-blank,
GAME_DESIGN 1347 / 1248. Rows-only bytes (decimal kB) match the brief's size table for **all 13 files
(13 × `MATCH`)**; whole-file bytes are 0.1 kB-ish larger, as the kickoff said:

| File | Rows-only | Brief | Whole file |
| --- | ---: | ---: | ---: |
| CONVENTIONS.md | 25324 B (25.3) | 25.3 | 25393 B |
| VISION.md | 4359 B (4.4) | 4.4 | 4396 B |
| OPEN_QUESTIONS.md | 5151 B (5.2) | 5.2 | 5235 B |
| spec/effects.md | 61352 B (61.4) | 61.4 | 61465 B |
| spec/combat.md | 52825 B (52.8) | 52.8 | 52931 B |
| spec/statuses.md | 28946 B (28.9) | 28.9 | 29044 B |
| spec/creatures.md | 27418 B (27.4) | 27.4 | 27524 B |
| spec/run.md | 26252 B (26.3) | 26.3 | 26367 B |
| spec/scripting.md | 19813 B (19.8) | 19.8 | 19910 B |
| spec/responses.md | 17782 B (17.8) | 17.8 | 17873 B |
| spec/progression.md | 9384 B (9.4) | 9.4 | 9469 B |
| spec/store.md | 1983 B (2.0) | 2.0 | 2091 B |
| spec/saves.md | 6325 B (6.3) | 6.3 | 6415 B |

## `move` is deterministic (`evidence/move-determinism.txt`)

Two runs, the same sha256 for each of the 13 files, and the on-disk `sha256sum` agrees. `move`
copies rows byte for byte, never trims, and inserts only the title, the read-when line and the half
headings (A4). The read-when line goes in `CONVENTIONS.md` and `VISION.md` after old line 1, with
old line 2 as the trailing blank (A5). `GAME_DESIGN.md` is not touched.

## Mechanism → the test that fails with it removed

All faults were planted in scratch clones in the session scratchpad (outside the repo), by a
harness that is not kept. Each fault's evidence shows where it was planted and the non-empty diff it
made, before the check's output (plan fix 3). A fault whose diff came out empty would print
`EMPTY: invalid`; none did (`grep -c "EMPTY\|INVALID"` over the line-proof evidence returns 0).

| Mechanism | Fault | Result | Evidence |
| --- | --- | --- | --- |
| Pinned-source guard (one site, `readPinned`) | wrong sha prefix, once per blob | all four modes stop before any output or write: `pinned source differs: stop` (8 runs); the stopped `move` leaves CONVENTIONS.md unchanged and the stopped skeleton writes nothing | `planted-faults-guard.txt` |
| multiset check | a line deleted; a line duplicated; one byte changed | multiset **and** placement fail | `planted-faults-line-proof.txt` |
| placement, order | two rows swapped within a file (C:349–379 ↔ C:502–513) | placement only | same |
| placement, half | C:1021–1023 moved to the To fold half | placement only | same |
| placement, file | C:1021–1023 moved into `spec/store.md` | placement only; multiset passes | same |
| separator rule inside a row | a blank line dropped inside C:244–348 | **placement fails, multiset passes** | same |
| trailing whitespace | a trailing space added (generated file) | placement fails, multiset passes | same |
| verbatim copy in `move` (fix 3) | `move` drops each row's trailing blank line | placement fails, multiset passes | same |
| verbatim copy in `move` (fix 3) | `trimStart` on row lines | multiset and placement fail | same |
| allowed-additions | read-when line removed; a half heading removed | multiset reports `old×0 new×-1`, placement fails | same |
| map tiling | a gap, then an overlap, in the brief's table | map check fails; multiset and placement report `SKIPPED` | same |
| row label check | a wrong label in the brief | map check fails | same |
| independence of the maps | a typo in `move`'s own `MAP` that keeps tiling and labels valid (C:1021–1023 retargeted) | `move` succeeds; **line-proof placement** catches it, the map check does not | same |
| independence (range typo) | `move`'s `MAP` row 1021–1022 | `move` stops at its own tiling check, writes nothing | same |
| stray file | `.claude/spec/x.md` | placement fails | same |
| unit rule + 261/262 | parser-style paragraph rule (no "after a blank line") | every inventory mode stops: `CONVENTIONS 339 (expected 261), GAME_DESIGN 447 (expected 262)` | `planted-faults-inventory.txt` |
| 523 partition | slice E loses `spec/scripting.md` | stops: `494 … expected 523` | same |
| inventory rule 1 | a unit missing; a unit twice | each reported separately | same |
| rule 2 | a slice-E unit in D's inventory; an id that is no unit (`C:2`) | `belongs to slice E`; `is not a unit of any slice` | same |
| rule 3 | `replaced` | unknown fate | same |
| rule 4 | anchor missing; file missing; non-`dropped` with no New home; a `dropped` row with a wrong New home (A13); New home not backticked | each fails | same |
| rule 5 | non-`kept` with no Reason | fails | same |
| rule 6 | wrong Old label | fails | same |
| rule 7 | five cells | fails | same |
| passing inventory | all 172 D units, a mix of fates, **the brief's example row as written** | exit 0 | same |
| anchor resolver | inline code, punctuation, em dash, `Repeat` ×3 (`repeat`, `repeat-1`, `repeat-2`) | all resolve (exit 0) | same |
| anchor resolver | heading inside a code fence; `repeat-3`; `repeat-0`; code span left in the slug | each fails | same |
| stale base (fix 1) | B inventory passes; commit on the clone's `main` shifting `content/overgrowth.md` | **still passes** (merge-base unchanged, `ba18fa0…`); after `git merge main` into the slice branch the base moves to `56b414e…` and it fails: 85 problems, by rule `{1: 41, 2: 41, 6: 3}` | same |
| packaging | a type error appended to the script | `npx tsc -b` exit 2 (`TS2322` in `scripts/docs-check.ts`); the clean script passes | `planted-faults-guard.txt` |

## Unit counts (`evidence/unit-counts.txt`)

Skeletons were written in a scratch clone, never in the repo, with no flag (base = `ba18fa0`).
**CONVENTIONS 261 and GAME_DESIGN 262** (asserted on every inventory run). Per slice:
**B 228** (content 140 = 22 + 37 + 45 + 36, specializations 42 = 17 + 15 + 10, `species-locked.md`
46), **C 154, D 172, E 87**, **F 110 pinned** (68 + 42) plus `CLAUDE.md` 24, `ROADMAP.md` 100,
`WORKFLOWS.md` 34 = 268. C + D + E + F pinned = 523 with 523 distinct ids (261 from C, 262 from G).
Every figure equals the kickoff's. **No reading differs; I adjusted nothing.** I did not run a real
Markdown parser, so I cannot confirm the kickoff's 264/270 for that reading.

The unedited skeletons for B to F: rules 1, 2 and 6 never fire (0 failures each); only 3, 4 and 5 do,
on every row, as they should (fix 5). C:119's label is cut mid-backtick-span and C:555's holds `\|`;
both pass.

## Plan fixes: how each was applied

1. **Stale base** — planted as the review wrote it (original base, commit on `main`, still passes,
   merge, fails). The result is in `planted-faults-inventory.txt`, last section.
2. **Clone heading** — `### DoT and Regen tick from the applier's snapshot`; the brief's example row
   passes exactly as written.
3. **Whitespace faults** — replaced by the three the review lists, plus the trailing-space fault in
   a generated file; every fault shows its diff first (`planted-faults-line-proof.txt`).
4. **Skeleton output** — `inventory-skeleton <slice>` writes
   `.claude/phases/4.2/<slice>/inventory.md` itself (UTF-8, `\n`, no BOM), refuses to overwrite, and
   prints counts per source, the total and the base to stdout. The file is a `# Inventory — Phase
   4.2 — Slice <X>` line, a blank line, then the table; `Decided in`, `Fate`, `New home` and
   `Reason` are empty. Evidence in `unit-counts.txt`.
5. **Rule 6** — both sides normalised the same way, `\|` unescaped, then the pieces-in-order rule.
   The unedited skeletons pass it (above).
6. **Markers** — listed under "The script".
7. **Slice case** — `inventory d` passes and `inventory-skeleton b` is routed to B (it stopped at
   B's existing file, naming `…/B/inventory.md`).
8. **Resolver** — heading text is trimmed before slugging. The known gaps (HTML entities;
   `_emphasis_` in a heading, whose underscores the resolver keeps as it must for `snake_case`) are
   in the doc comment on `resolveAnchors`.

## Assumptions (all as planned)

A1 to A15 hold as the plan review confirmed them. Two small additions, both marked here instead of
in the plan: the unit-id path in `inventory` messages is shown relative to the repo
(`.claude/phases/4.2/<slice>/inventory.md`), and the skeleton file carries a title line above the
table (A15 means a reader ignores it).

## Spec questions

- **Stale living-doc text this slice makes true** (the design agent's, at the PR review):
  `CLAUDE.md:93` ("Full design: `.claude/GAME_DESIGN.md`", which `move` does not delete);
  `WORKFLOWS.md:36` (the living-docs list); `workflow/coding-rules.md:24` (the reading list). The
  93 `CONVENTIONS "…"` / `GAME_DESIGN §…` citations under `src/` still name the pinned files until
  4.2-G, as the phase brief says. `.claude/CONVENTIONS.md` is now the 3-section engineering file, so
  a citation of a moved `CONVENTIONS "…"` section resolves only through the map.
- **Headings with an em dash** slug with a double hyphen (`# Spec — Statuses` is
  `spec--statuses`), per GitHub's rule as the kickoff stated it. Anyone writing a New home for a
  heading with ` — ` in it should expect `--`.
- **For 4.2-G's brief:** the helpers listed without a marker (see "The script") need either a marker
  or a removal note, so the grep for `Phase 4.2 only` doesn't leave dead code.

## Content changes

None.

## To delete

`.claude/GAME_DESIGN.md` (Duncan deletes; `move` never touches it). The scratch clones live in the
session scratchpad, outside the repo. `dist/` from `npm run build` is gitignored.

## Evidence (all in `evidence/`)

`line-proof.txt`, `move-determinism.txt`, `unit-counts.txt`, `test-reconciliation.txt`,
`planted-faults-line-proof.txt`, `planted-faults-guard.txt` (guard and packaging),
`planted-faults-inventory.txt` (inventory modes, resolver, 261/262/523, stale base). No scratch
script is kept.
