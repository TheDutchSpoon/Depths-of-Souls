# Report r2 — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

Built to `handout-r1.md`. No `src/` code changed: comments, one doc comment and tests only. Nothing
committed, nothing deleted. Evidence additions are appended to the existing files in `evidence/`
under a "Round 2" heading.

## Hand-out items

### 1. Nine citations re-pointed

Anchor only changed, rest of each comment kept, except where the row said so.

| Site | Now cites |
| --- | --- |
| `engine/__golden__/golden-dot.fixture.ts` (two sites) | `spec/statuses.md#health-is-a-modifiable-stat`; the old quotation after the first one is dropped and the line rewrapped |
| `golden-spore-spread.fixture.ts`, `golden-sporecloud-reaper-no-spore.fixture.ts` | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` |
| `data/traits/glimmerdark.ts` | `per the example in \`spec/responses.md#magnitude-modes\`` |
| `state/integration.test.ts` | `OPEN_QUESTIONS.md#fight-count` |
| `golden-shieldbarer-starter.fixture.ts` | `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` |
| `data/species/overgrowth.ts` | `spec/creatures.md#affinity` |
| `data/species/starters.ts` (stats comment) | the three `specializations/*.md#starter-*` anchors, the whole parenthesis replaced |

Checked: `npm run docs:check -- citations` resolves every one (PASS), and the comment-only proof below.

### 2. Starters' affinity comment rewritten whole

`data/species/starters.ts`: the `ASSUMPTION (Slice F)` affinity block is now a plain comment, no marker,
tag, quotation or history. It says the three starters' affinities are set in their specialization docs
(cited) and the Unicorn's (Vitality) in `content/overgrowth.md#unicorn-lightbearer`, and that each
starter's affinity matches its high stat through `spec/creatures.md#affinity`. Claims checked against the
`affinity` fields: `wit` (Intelligence 30), `violence` (Attack 30), `endurance` (Defence 30), `vitality`.
Row 23 added to `evidence/stale-comments.md`. The stats `ASSUMPTION (Slice F)` block above it is kept
(the hand-out asked only for the affinity block).

### 3. `src/` wrap tests (`scripts/docs-check/citations.test.ts`)

- The test that asserted a failure is retitled `fails an old form wrapped over a block-comment leader in src/`.
- New: `fails a label form wrapped over a block-comment leader in src/` (`/**\n * see \`spec/combat.md\`\n * "Damage formula"\n */`, expects `label form`). Both sit in `citations: where it looks`, not under `describe.each`, so +1 test.
- Mutation: removing `|\*` from `SITES.src.gap` fails exactly these two (`evidence/mutation-check.txt`, appended); the file is restored.

### 4. `parseBudgets` doc comment

Now: "Every table row of `workflow/budgets.md` whose first cell is a backticked path and second a number."

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 207 files, 1478 tests: 1477 passed, 1 skipped |
| `npm run lint`, `format:check`, `build`, `npx tsc -b` | clean / passes |
| `npm run docs:check -- citations` | `PASS, 545 citations in 436 files` (542 at HEAD `1068845`; the 532 in report r1 predates the review commit) |
| `npm run docs:check -- budgets` | 12 files, 0 over budget, exit 0 |

**Test count vs r1:** 1477 → 1478, 207 files unchanged. The only difference is +1 in
`scripts/docs-check/citations.test.ts` (59 → 60). Files under `src/` still match `main` file by file.

## Golden policy: byte-identical

- **Comment-and-title-only proof** (same script and rules as r1, `evidence/comment-proof.txt`): all
  **88 of 88** changed files identical; 290 masked strings as before. Output for the touched files
  (golden-dot, spore-spread, sporecloud-reaper-no-spore, shieldbarer-starter fixtures, `data/traits/glimmerdark.ts`,
  `data/species/overgrowth.ts`, `data/species/starters.ts`, `state/integration.test.ts`) is appended: all `OK`.
- **Fixture exports deep-equal to `main`** for the four golden fixtures touched, imported from a `git archive`
  of `main` and the branch (`evidence/fixtures-compare.txt`): 4 of 4.
- Corpus digest unchanged (`corpus:update` not run; `corpus-digest.test.ts` passes).

## Mechanism → test that fails with it removed

Only the `*`-leader gap changed meaning of coverage: removed `|\*` from the `src` gap → the two block-comment
wrap tests fail (2 failed, 58 passed). Nothing else added.

## Evidence updated

`mapping-src.md` (nine rows' anchors, source `review-r1 fix 1`; `starters.ts:22` marked rewritten whole),
`stale-comments.md` (row 23), `mutation-check.txt`, `comment-proof.txt`, `fixtures-compare.txt`, `gates.txt`,
`test-counts.txt`. `record.md`: a Round 2 line, and the totals (1478 / 121 docs-check tests).

## Spec questions

None new. One staleness note: `evidence/stale-comments.md` and report r1 call the rewrite "22 comments plus
Splashing"; the starters block is now a 23rd (row 23).

## Content changes

None.

## To delete

None.
