# Hand-out r2 — 4.5-G1: The demo, descent loop and viewer

Branch `4.5-g1`, from `4a89ff0`. Three small items: a stale test title, a pin, and the record.

**Before you start:** Duncan has deleted `src/app/descendFlow.ts`, `src/app/descendFlow.test.ts`,
`src/app/perkPoints.ts`, `src/app/perkPoints.test.ts` and `src/app/registries.ts`. If any of them is
still in the tree, stop and say so in the report: with `descendFlow.test.ts` present, `npx tsc -b`,
`npm run build` and `npm run test` fail, and the gates must be run on the tree as it will be
committed, not with files moved aside.

## Golden policy

Byte-identical. Only the two `src/app` test files below and `record.md` change; no file under
`src/engine`, `src/state`, `src/data` or `src/ui` changes.

## C1. `src/app/startRun.test.ts`: the seed-bound test's title is stale

The title reads "the restated seed bound meets the store: …". `startRun.ts` no longer restates
the bound: it imports `MAX_RUN_SEED` from the store. Retitle it to say what it checks, for
example "the field accepts the largest seed newGame does, and refuses the next". Change nothing
else in the test.

## C2. `src/app/descentText.test.ts`: pin that the boss line prints the outcome's points

`bossResultLine` prints `+${outcome.perkPointsGained}`. Every first-clear case in the test uses
`perkPointsGained: 100`, so with the line hard-coding `+100 perk points` every test still passes:
the line would restate the store's "100 per boss" instead of reading the outcome. Add a case on a
hand-built outcome `{ bossDefeated: 'broodmother', bossFirstCleared: true, perkPointsGained: 250 }`
that expects `` `Defeated ${name}: first clear, +250 perk points` `` (the figure is not one the
store produces today; the test is about the line reading the field). It fails with the literal.

## C3. `.claude/phases/4.5/G1/record.md` reflects the slice as built

- **Files changed:** replace "**Obsolete, to delete:** …" with the five files as deleted
  (`src/app/descendFlow.ts` and its test, `perkPoints.ts` and its test, `registries.ts`): their
  rules moved to the store and the data.
- **Not verified:** the side-heading line-up was checked in the browser by the PR review, in
  `.claude/phases/4.5/G1/evidence/click-through-r2.md`; keep the pointer to
  `evidence/click-through-r1.md` for the rest.
- **Shape:** the test count is 2152 against `main`'s 1993 once C2 lands (2151 + 1).

## Report

`report-r3.md`: each item and what changed; the gate results on the committed tree (`npm run
test`, `lint`, `format:check`, `build`, `npx tsc -b`, `npm run docs:check -- citations` and
`-- comments`); the per-file test count against round 2 (only `descentText.test.ts` 8 → 9);
for C2, that the new case fails with the line printing a literal `+100`; and any `ASSUMPTION`.
