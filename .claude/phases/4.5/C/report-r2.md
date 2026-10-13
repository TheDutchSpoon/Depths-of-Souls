# Report r2 — 4.5-C

Fixes for `handout-r1.md`. No engine code changed; no existing expected value changed; the corpus
fixture is not regenerated.

## Hand-out items

1. **Turn-clock pin.** `golden-dead-slot-skip.fixture.ts` gains `expectedTurnClock = 2` (with its
   doc) beside `expectedDraws`; `golden-dead-slot-skip.test.ts` imports it and asserts
   `state.turnClock`. Checked in a scratch clone outside the repo with a clock bump added to the
   dead-slot branch of `resolveTurn`'s dequeue loop: the test fails (`expected 3 to be 2`). Row M13
   added to `evidence/mechanism-removal.md`.
2. **Corpus split 318 / 75.** `record.md` ("Corpus") and `evidence/corpus-table.md` now give
   318 brackets only / 75 at a removed Web draw under stage 1's reading; fight 126 sits in the
   Web-draw class with its one-line explanation; the first-differing-event table stays for the 74;
   the kickoff's 319 / 74 is noted once. `report-r1.md` untouched.
3. **`main` named `dd703a4`** in `evidence/corpus-table.md`, `guard-alone.md`,
   `balance-and-roster.md`.
4. **`combat.test.ts` title:** "… one roll per turn (count == …)".
5. **`golden-spider-broodwarden.fixture.ts`:** "per living Web-bearer at every living creature's
   turn end".
6. **`golden-rot-sovereign.fixture.ts`:** "WEAK's and ADD's own queue slots (both dead) are never
   reached."
7. **Rewraps, words unchanged:** `statuses.ts` (`WEB` doc), `golden-broodmother.fixture.ts`
   (`TURN_STEPS`), `golden-provoke-stun-cleanup.fixture.ts` (both comments), `combat.ts`
   (`rollWebBreakFree` doc and the turn-start-hooks comment).

## Gates

`npm run test`: 1908 tests, 1907 passed, 1 skipped, 226 files, same as r1 (an assertion was added
to an existing test, no test added). `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` (651) and `-- comments` all pass.
`docs:check -- comment-proof 2f11823` passes for every file except `golden-dead-slot-skip.fixture.ts`,
`golden-dead-slot-skip.test.ts` (item 1) and `combat.test.ts` (title, item 4), as the hand-out
predicted.

- Golden policy: no expected value changed except the added `expectedTurnClock = 2`, hand-derived
  (HERO and E bump once each; D's dead slot none).
- Corpus digest: unchanged this round.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.
