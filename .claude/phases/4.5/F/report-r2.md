# Report r2 — 4.5-F

Hand-out r1, three items. No game behaviour changed.

## Hand-out items

1. **`FightRecord` doc comment** (`src/state/store.ts`). Now says `createCombat` over the seed, the
   two parties and the player's effects, with the registries the store was given (`deps.scripts`,
   `deps.traits`, `deps.statuses`), gives back `events`, and cites
   `spec/store.md#a-descents-outcome`. Checked by `docs:check -- citations` (anchor resolves) and
   `-- comments` (both pass).
2. **Intro test** (`src/state/store.test.ts`). `crossing.outcome.result` and
   `below.outcome.result` are asserted `'win'`, with a one-line comment that the stock intro and
   the overwhelming-Unicorn case cover a won and a lost intro. The comment above the Unicorn case
   said "wins the intro fight" while the assertion is `'loss'`; it now says "loses". The test
   passes, so the stock intro is a win today.
3. **`CI_CD` in `TOP_LEVEL_DOCS`** (`scripts/docs-check/citations.ts`), plus the case
   `` `CI_CD.md` "Deploy" `` in the `(c) label forms` `it.each` of
   `scripts/docs-check/citations.test.ts`, beside the `CONVENTIONS` one. The mechanism: the label
   regex is built from `TOP_LEVEL_DOCS`; with `CI_CD` removed the case does not fail the check, so
   the test fails.

## Gates

`npm run test` (229 files, 1992 passed, 1 skipped), `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` (687 citations, 464 files) and `-- comments` (7487 comments, 1747
titles) all pass.

Per-file test count against the branch before these edits (1990 passed, 1 skipped): only
`scripts/docs-check/citations.test.ts` changes, +2 (the one new `it.each` case runs in both the
`src/` and the `.claude/` describe block). `store.test.ts` gains assertions, no tests.

Goldens, the corpus digest and every engine file are untouched (no fixture or `engine/` edit).

## Phase record

`record.md` is unchanged: it describes the built mechanism, none of which changed, and its test
count (1990) is the count at the slice's build; the branch now has 1992 with this round.

## Spec questions

None.

## Content changes

None.

## To delete

None.
