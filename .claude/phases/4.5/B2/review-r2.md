# PR review r2 — 4.5-B2: every pass over the living creatures in turn order

Branch `4.5-b2` at `4041310` (`4041310875bd`), against `main` at `f81af3f` and r1's commit
`9336a8e` (whose `src/` is r1's reviewed `de197d1`). Reviews `report-r2.md`, the answer to
`handout-r1.md`.

## Verdict

**Approved.** All four hand-out items are fixed as asked, and each new comment is true against its
fixture's setup. The fix diff is three comment edits, one test title and one evidence paragraph: no
code, test logic, expected value or corpus row changed. Every gate is green with r1's counts, and
every export of every golden fixture is identical to r1's commit (and, for the 135 old ones, to
`main`).

## Real fixes

None.

## Scope and labeling

None left. Each hand-out item, checked in the code:

1. **`golden-round-end-interaction.fixture.ts:80–81`** now reads `turn order P2 20, E1 10, P1 5;
   only P1 carries an on-round-end trait`. The setup gives P1 Speed 5, P2 20, E1 10, and only P1
   has `innateTraitIds` (`catastrophic-collapse`). True.
2. **`golden-death-observed.fixture.ts`.** The header puts the killer (Speed 30, `killer()`) first,
   then the default-Speed rest, player side before enemy side, each in slot order. CASE 2 now walks
   K first, then PA, PE, PB, EE, EA, EY, matching `playerDies`' parties; the firing line (PA, PB,
   EE, EY) and `playerDiesExpected` are unchanged. CASE 1 already listed the killer A first and
   needed nothing.
3. **`pass-order.test.ts:198`** is titled `'on-death-observed'`; the test body is unchanged. The
   by-id exclusion stays pinned by `death-observed.test.ts`'s self-revive test (r1's mutant).
4. **`evidence/reversal.md`** now says the run swapped `main`'s committed
   `corpus-digest.fixture.ts` in, and that both the patch and the swap were restored. Result counts
   (1898; 1875 passed, 22 failed, 1 skipped) are kept, consistent with r1's reversal run.

## Decide-points

None from this round. r1's decide-point 2 (the new `spec/effects.md#pass-order` rule and its
design-intent sentence, "acting first and reacting first are one rule") went in with r1's commit
`9336a8e`; if you read that sentence and it says what you meant, nothing is open.

## Verified, and how

All in my own clone (`git clone` + worktrees of `4041310`, `9336a8e` and `origin/main`), `npm ci`
on the branch and on `main`.

- **Gates on the branch:** `vitest run --reporter=json` (the `npm run test` gate): 1898 tests,
  1897 passed, 1 skipped, 0 failed, 223 files. `lint`, `format:check`, `npx tsc -b`, `build`:
  clean. `docs:check` citations PASS (650 in 454 files), comments PASS (7240 comments, 1684 titles;
  r1 had 7237, the +3 being the three added comment lines), budgets 0 over. Matches the report.
- **Test count, file by file** against `main` (1876 in 215 files): the only differences are
  `pass-order.test.ts` +11, `turn-order.test.ts` 9 → 12, and the seven `golden-pass-order-*` tests
  +8 (`live` has two). Same as r1.
- **Goldens, every export:** a throwaway `import.meta.glob` test serialized every export of every
  `__golden__/*.fixture.ts` (Maps, Sets and function sources included) on all three trees. Branch
  vs `main`: 135 old fixtures, 0 exports changed, 7 new fixtures. Branch vs `9336a8e`: 142
  fixtures, 0 exports changed.
- **Comment proof:** `docs:check -- comment-proof 9336a8e`: both edited fixtures `OK`;
  `pass-order.test.ts` differs only at the retitled `it(...)` line. Against `origin/main`: all
  eleven edited old fixtures and `effect-types.ts` `OK`; every `FAIL` is the slice's engine code,
  test changes, corpus fixture or a new file, as the report says.
- **Corpus digest:** `src/engine/__corpus__/` has no diff since `9336a8e`; r1's 97-of-527 rows and
  the one result change (row 185) stand.
- **Mutation (step 5):** the fix diff adds or changes no mechanism, and the hand-out asked for no
  new pin, so there is nothing to mutate this round. The retitled test's body is byte-identical, so
  r1's `on-death-observed` site mutant still fails it.
- **Leftover sweep, final commit** (`src/` and `.claude/` minus `phases/` and `archive/`):
  `livingIdsOf` 0 hits (`livingIds` only `resolution.test.ts:2020`, a local list that test hands
  `fireHook` itself); "tie-break order", "standard tie-break", "never called again", "canonical
  side" 0 hits; "side → slot → id" only in `tie-break.ts`, `spec/scripting.md#target-selectors-in-the-engine`,
  `spec/combat.md#turn-queue` (the tie-break itself) and the new goldens' contrasts with it; "party
  order" / "slot order" hits are all response target sets, AOE hit order or party setup, none
  narrating a pass. Nothing to fix.
- **Mailbox:** step files plus the six `evidence/` files, each cited. Nothing to delete.
- **Content docs:** the slice changes no content (the report agrees), so nothing to fold in.

## Docs edited

None this round.
