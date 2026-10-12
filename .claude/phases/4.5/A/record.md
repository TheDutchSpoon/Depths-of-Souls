# Record — Phase 4.5 — Slice A: placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

**Status: built.** Golden policy byte-identical; corpus digest untouched; 1851 tests passed, 1
skipped (net +1 against `main`).

## What was built

- **The nine placeholder traits left game data.** `src/data/traits/core.ts` moved to
  `src/engine/__fixtures__/traits.ts` with a new `FIXTURE_TRAITS` array and `FIXTURE_TRAITS_BY_ID`
  map. The trait library is one file per biome plus `starters.ts`; `data/traits/index.ts` no longer
  imports, re-exports or registers the nine.
- **Tests follow the traits.** `core.test.ts` moved to `__fixtures__/traits.test.ts` (eight
  behaviour tests plus a `validateTrait` test over all nine). The two registry-assembly tests moved
  to the new `data/traits/index.test.ts`, which also asserts no fixture trait id is in
  `TRAIT_REGISTRY`.
- **Six goldens** (`conditional-passive`, `conditional-trigger`, `loop-safety`,
  `round-end-interaction`, `stun`, `triggered-damage`) and three `resolution.test.ts` cases resolve
  the traits through `FIXTURE_TRAITS_BY_ID`. Their expected values are unchanged.
- **One Splashing lookup.** `actions.ts` imports `adjacentLivingTargets` from `targeting.ts`; its
  private copy is deleted.
- **The 3.5 demo retired.** `App.tsx` renders only `<main><h1>Depths of Souls</h1></main>`;
  `demoFight.ts` and its test are deleted. `src/ui/CombatDemo.tsx` is byte-unchanged and unused.
- **Comments reworded** to cite the fixture or the rule, not game data: `data/statuses.ts` (Regen,
  Stun fallback durations), `data/specializations.ts` (Defensive Stance), `engine/resolution.ts`,
  `engine/effect-types.ts` (`StatPercent`, `BaselineEffectEntry`, `SplashingDef`), and the Stun
  exemption reason in `corpus-coverage.test.ts`.

## Files changed

Moved: `data/traits/core.ts`, `core.test.ts` (to `engine/__fixtures__/`). New:
`data/traits/index.test.ts`. Edited: `data/traits/index.ts`, `data/statuses.ts`,
`data/specializations.ts`, `engine/actions.ts`, `engine/resolution.ts`, `engine/effect-types.ts`,
`engine/resolution.test.ts`, `engine/corpus-coverage.test.ts`, the six golden fixtures,
`app/App.tsx`. Deleted by Duncan: `app/demoFight.ts`, `app/demoFight.test.ts`. No living or content
doc edited; `__corpus__` untouched.

## Not changed

Ember Lance, Venom Bolt and Cinder Nova stay (4.5-E); Grudge's hook stays `on-ally-death` (4.5-B);
`CombatDemo.tsx` is moved on by 4.5-G1.
