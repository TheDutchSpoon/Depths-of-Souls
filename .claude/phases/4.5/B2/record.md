# Record — Phase 4.5 — Slice B2: every pass over the living creatures in turn order

**Status: built.** Golden policy deliberate, listed: every existing golden and unit test unchanged
in expectation. Corpus digest regenerated once (97 of 527 rows). 1897 tests passed, 1 skipped (net
+22 against `main`).

## What was built

- **One ordering, one helper.** `engine/turn-order.ts` has a private `orderedLiving` (act-first
  pole, normal group, act-last pole, each by descending effective Speed, ties side → slot → id; each
  creature's pole and Speed read once). `buildTurnQueue` and the new `turnOrderIdsOf(state)` are
  both built on it. `turnOrderIdsOf` reads the live parties, never `state.turnQueue`.
- **Nine passes and the Web roll take it.** The five `on-action-observed` calls (`actions.ts`),
  `on-damage-observed` and `on-death-observed` (`resolution.ts`, the latter still leaving the dead
  creature out by id), `on-fight-start` and `on-round-end` (`combat.ts`) call `turnOrderIdsOf` at
  the pass. `rollWebBreakFree` takes one `bearerIds` list at cleanup start. Nothing is cached,
  hoisted or prefiltered.
- **`livingIdsOf` deleted** from `engine/creature-lookup.ts`, so no random pool can source from it.
  AOE hit order, Splashing adjacency, extremum picks and every random pool are unchanged.
- **Stale comments** in the engine and in eleven golden headers updated.

## Tests and goldens

- New: `engine/pass-order.test.ts` (each site, the in-pass status grant, the per-instance read),
  three cases in `turn-order.test.ts`, seven goldens
  `golden-pass-order-{observed,poles,speed-change,web-rolls,non-stacking,fight-start,live}`.
- Corpus: 97 rows changed (59 reorders, 38 divergences); fight 185 flips win → loss at a Web roll.
  Attribution in `evidence/corpus-table.md`.
- Balance: no CI verdict flipped; simulator +39% wall time (`evidence/balance-and-runtime.md`).

## Files changed

Edited: `engine/{actions,combat,creature-lookup,effect-types,resolution,turn-order}.ts`, the corpus
digest fixture, `turn-order.test.ts`, comment and title edits in `death-observed.test.ts`,
`status-timing.test.ts` and eleven golden fixtures. New: `pass-order.test.ts`, the seven golden
pairs, and the evidence files. No living or content doc edited.
