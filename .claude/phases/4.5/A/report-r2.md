# Report r2 — Phase 4.5 — Slice A: two text fixes

Answers `handout-r1.md`. Branch `4.5-a`, on top of `1472a55`. Text only; nothing committed.

## Hand-out items

**Fix 1: Stun exemption reason.** `src/engine/corpus-coverage.test.ts`, the `'stun'` entry of
`STATUS_EXEMPTIONS`, now reads `'applied by no shipped spell, perk or trait; only test fixtures apply it'`.
The entry stays. Prettier collapses it onto one line (`['stun', '...']`), so the diff is the
reason string plus that reflow. Checked: `corpus-coverage.test.ts` passes (7 tests), and the
full suite is green.

**Fix 2: `SplashingDef` doc.** `src/engine/effect-types.ts`: "The adjacency lookup is
`spec/combat.md#adjacency-targeting`." became "Adjacency is living adjacency
(`spec/combat.md#adjacency-targeting`)." Nothing else in the comment changed. Checked: the
`citations` and `comments` gates pass, and comment-proof reports `OK` for this file.

## Proof

- `git diff 1472a55 --stat -- src`: only `corpus-coverage.test.ts` (1 insertion, 5 deletions) and
  `effect-types.ts` (2 insertions, 2 deletions).
- `npm run docs:check -- comment-proof 1472a55` fails only on `corpus-coverage.test.ts`: "code
  differs at printed line 11: base `[`, working tree `['stun', ...]`". Fix 1 is a string literal
  and its reflow, not a comment. `effect-types.ts` is `OK`. The diff of the failing file:

  ```diff
  -  [
  -    'stun',
  -    'applied by no shipped spell, perk or trait; the only trait that applies it is a test ' +
  -      'fixture (the mechanism-test trait that stuns its bearer)',
  -  ],
  +  ['stun', 'applied by no shipped spell, perk or trait; only test fixtures apply it'],
  ```

- Gates: `npm run test` 212 files, 1851 passed | 1 skipped (unchanged from the build);
  `lint`, `format:check` (after the Prettier reflow above), `build`, `npx tsc -b`,
  `docs:check -- citations` (636 citations, pass) and `docs:check -- comments` (pass) are all green.
- `git diff 1472a55 -- src/engine/__corpus__/ src/engine/__golden__/` is empty (0 lines). The
  corpus digest is unchanged; no fixture or test logic changed.
- Test-count reconciliation: unchanged, since no test was added, removed or renamed.
- Mechanism tests: none new; no mechanism changed.

## Phase record

`record.md` only names `corpus-coverage.test.ts` and `effect-types.ts` as touched files. Both
are still accurate, so it is unchanged.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.
