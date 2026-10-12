# Report r2 — 4.5-B2 (hand-out r1)

Four comment, title and evidence edits. No code, test logic or expected value changed; the corpus
fixture was not regenerated.

## Items

1. `src/engine/__golden__/golden-round-end-interaction.fixture.ts:80-81`: the heading now reads
   `round-end trait pass (turn order P2 20, E1 10, P1 5; only P1 carries an on-round-end trait)`.
2. `src/engine/__golden__/golden-death-observed.fixture.ts`:
   - header lines 3-6: the killer (Speed 30) is first, then the player side before the enemy side,
     each in slot order;
   - CASE 2 (lines ~32-37): observers listed in turn order, K (no trait) first, then PA, PE, PB, EE,
     EA, EY. The firing-order line (PA, PB, EE, EY) is unchanged.
3. `src/engine/pass-order.test.ts:198`: title is now `'on-death-observed'`.
4. `.claude/phases/4.5/B2/evidence/reversal.md`: the opening paragraph now says the run used the
   patch plus `main`'s committed corpus fixture swapped in and restored after. Result counts kept.

## Gates

- `npm run test`: 223 files, 1898 tests, 1897 passed, 1 skipped (same as r1).
- `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm run build`: clean.
- `npm run docs:check -- citations`: PASS (650 citations). `-- comments`: PASS.
- `npm run docs:check -- comment-proof origin/main`: `golden-round-end-interaction.fixture.ts` and
  `golden-death-observed.fixture.ts` are `OK` (comment-only), as are the other ten edited fixtures.
  The command still exits FAIL overall on the engine files, `death-observed.test.ts`,
  `status-timing.test.ts`, `turn-order.test.ts`, the corpus fixture and the new files: these are the
  slice's code and title changes, unchanged by this round.
- Golden policy: no expected values touched, so no fixture re-import comparison was needed.
- Corpus digest: unchanged from r1.

## Spec questions

None new; the stale-text list in `report-r1.md` stands.

## Content changes

None.

## To delete

Nothing.
