# Report r3 — 4.5-F

Three comment/test cleanups from `handout-r2.md`. No behaviour change.

## Hand-out items

1. **Intro test comment** (`src/state/store.test.ts`, ~line 1349): now reads "An overwhelming enemy
   Unicorn wins the intro fight (a loss for the player); the grant is the same." Assertions untouched.
   Checked: test file still green.
2. **`CI_CD` label-form case** (`scripts/docs-check/citations.test.ts`): the case
   `` `CI_CD.md` "Deploy" `` is replaced (not added to) by the bare form `CI_CD.md "Deploy"`.
   **Mutation:** with `CI_CD` removed from `TOP_LEVEL_DOCS` (`citations.ts:19`), 2 tests fail, one per
   describe block: `citations in src/ > (c) label forms > fails CI_CD.md "Deploy"` and
   `citations in .claude/ > (c) label forms > fails CI_CD.md "Deploy"` (2 failed, 67 passed). With
   `CI_CD` restored, all 69 pass. `citations.ts` is restored byte-for-byte (git shows it unmodified).
3. **`FightRecord` doc comment** (`src/state/store.ts`, ~line 153): now "`createCombat` over the seed,
   the two parties and the player's effects, with the registries the store was given
   (`deps.scripts`, `deps.traits`, `deps.statuses`), then `resolveFight`, gives back `events`
   (`spec/store.md#a-descents-outcome`)". Citation kept; comment-only.

Files changed: `src/state/store.ts`, `src/state/store.test.ts`, `scripts/docs-check/citations.test.ts`.
The phase record (`record.md`) mentions none of these details, so it is unchanged.

## Gates

- `npm run test`: 229 files, 1992 passed, 1 skipped — unchanged from `main`/r2; `citations.test.ts`
  stays at 69 tests; other files unchanged.
- `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`: pass.
- `npm run docs:check -- citations`: PASS (687 citations in 464 files).
- `npm run docs:check -- comments`: PASS.

## Golden policy / corpus

No golden or fixture touched; corpus digest unchanged (no engine change).

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.
