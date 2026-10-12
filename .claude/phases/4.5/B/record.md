# Record — Phase 4.5 — Slice B: on-death-observed, and `createCombat` validates its trait registry

**Status: built.** Golden policy deliberate, listed: the hook name in three goldens, the firing
order on a death. Corpus digest regenerated once (143 of 527 rows). 1875 tests passed, 1 skipped
(net +24 against `main`).

## What was built

- **`on-death-observed`.** `on-ally-death` and `on-enemy-death` left the `Hook` union (17 hooks
  became 16). `fireDeathObservers` makes one `fireHook('on-death-observed', …)` call over every
  living creature in tie-break order minus the dead creature, excluded by id, with the dead
  creature as `source`. The player side reacts first, then the enemy side, each in slot order.
- **One filter, one helper.** `relationship` (`ally`, `enemy`, `any`) is compared by one private
  helper, `relationshipMatches` in `engine/resolution.ts`, used by all three observation hooks.
  The hook fails closed: a candidate whose dead creature can't be found is skipped, with or
  without a filter. `validateObservationFilters` accepts only `relationship` on the hook and
  rejects `self`.
- **One `livingIdsOf`.** Exported from `engine/creature-lookup.ts`; the copies in `actions.ts`,
  `combat.ts` and `resolution.ts` are gone.
- **Eight triggers moved.** Last Gleam, Myconet Warder, Myconet Gravedigger, Necromoss Thicket and
  Grudge (fixtures) to `ally`; Rotfeeder Scavenger to `enemy`; the Rot Sovereign's two triggers
  became one `any` trigger. Every filter is written out.
- **`validateTrait` in the engine.** Moved to `engine/effect-types.ts`, beside `validateStatusDef`;
  `createCombat` runs it over `registries.traits` after the status loop; `data/traits/index.ts`
  calls it in its `STOCK_TRAITS` load loop.

## Tests and goldens

- New: `engine/death-observed.test.ts` (filter table per relationship and dead side, the order,
  the by-id exclusion under a self-revive, the single call under a `stacks: false` carrier on each
  side, the alive gate, fail-closed), `data/traits/rotcap-hollow.test.ts` (written-out filters),
  `golden-death-observed` (cases `enemyDies`, `playerDies`).
- Changed: `golden-damage-observed-lethal`, `golden-last-gleam`, `golden-rot-sovereign` (the
  `hook` field and comments only), `golden-spore-spread` (comment only),
  `damage-observation.test.ts`, `resolution.test.ts` (Grudge re-stacking uses a real dead ally),
  `glimmerdark.test.ts`, `__fixtures__/traits.test.ts`, and the import of `validateTrait` in
  `status-snapshot.test.ts` and `status-containers.test.ts`.
- Corpus: 130 rows changed by the hook name alone, 13 by the name and the death-observer order.
  Attribution in `evidence/corpus-attribution.md`.

## Files changed

Edited: `engine/{actions,combat,creature-lookup,effect-types,resolution}.ts`,
`data/traits/{index,glimmerdark,rotcap-hollow}.ts`, `engine/__fixtures__/traits.ts`, the corpus
digest fixture, and the tests and goldens above. New: the three test/golden files above plus
`golden-death-observed.fixture.ts`. No living or content doc edited.
