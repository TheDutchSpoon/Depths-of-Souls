# Hand-out r1 — Phase 4.5 — Slice A: two text fixes

Standing rules: `.claude/workflow/coding-rules.md`. Branch `4.5-a`, on top of the current build
(`1472a55`). Answer with `report-r2.md` in this folder.

The PR review found the code correct and the byte-identical claim proved. Two strings need
rewording. **Text only:** no behaviour change, no change to any golden fixture or test logic, and
the corpus digest stays as committed.

## Fix 1 — the Stun exemption reason is false

`src/engine/corpus-coverage.test.ts`, the `'stun'` entry of `STATUS_EXEMPTIONS`. Its reason ends
"the only trait that applies it is a test fixture (the mechanism-test trait that stuns its
bearer)". That is not true: three test traits apply `stun` (`REELING` in
`src/engine/__fixtures__/traits.ts`, `STUNNER_TRAIT` in
`golden-status-timing-stun-one-turn.fixture.ts` and `SELF_STUN_TRAIT` in
`golden-status-timing-turnstart-self-stun-once.fixture.ts`), two of them stun their bearer, and a
test spell (`self-stun-fixture` in `status-containers.test.ts`) applies it too.

Reword the reason to what is true and sufficient, for example:
`'applied by no shipped spell, perk or trait; only test fixtures apply it'`.
Keep the entry: the test checks exemptions both ways, so dropping it fails the test.

## Fix 2 — the `SplashingDef` doc sentence

`src/engine/effect-types.ts`, the `SplashingDef` doc comment. The sentence "The adjacency lookup is
`spec/combat.md#adjacency-targeting`." reads as if the lookup were a doc section. Keep the citation
and say what it is for, for example: "Adjacency is living adjacency
(`spec/combat.md#adjacency-targeting`)." Change nothing else in the comment.

## Proof for `report-r2.md`

- `git diff 1472a55 -- src` touches only these two places.
- `npm run docs:check -- comment-proof 1472a55` fails only on `corpus-coverage.test.ts` (Fix 1 is a
  string literal, not a comment); say so, and show that file's diff.
- All gates green: `npm run test` (still 1851 passed | 1 skipped), `lint`, `format:check`, `build`,
  `npx tsc -b`, `docs:check -- citations`, `docs:check -- comments`.
- `git diff 1472a55 -- src/engine/__corpus__/ src/engine/__golden__/` is empty.
