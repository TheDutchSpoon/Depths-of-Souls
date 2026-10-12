# 4.5-B2 reversal proof: order alone

The patch below puts `main`'s two orders back: the helper returns party-array order, and
`rollWebBreakFree` sorts the helper's list by `compareBySideSlotId`. For the run, `main`'s committed
`src/engine/__corpus__/corpus-digest.fixture.ts` was swapped in (the finished tree's committed
fixture is the regenerated one, which the reversal can't match); the patch and that swap were
applied to the finished tree, run, and both restored; neither is in `src/`.

```diff
--- src/engine/turn-order.ts	2026-10-12 21:03:32.366493000 +0200
+++ src/engine/turn-order.ts	2026-10-12 21:03:37.002147300 +0200
@@ -81,5 +81,5 @@
  * pass.
  */
 export function turnOrderIdsOf(state: CombatState): CreatureId[] {
-  return buildTurnQueue(state.playerParty, state.enemyParty)
+  return [...state.playerParty, ...state.enemyParty].filter((c) => c.alive).map((c) => c.id)
 }
--- src/engine/combat.ts	2026-10-12 21:03:32.388403400 +0200
+++ src/engine/combat.ts	2026-10-12 21:03:37.064209400 +0200
@@ -2,6 +2,7 @@
 import { ROUND_CAP } from './config'
 import { buildTurnQueue, turnOrderIdsOf } from './turn-order'
 import { getCreature, updateCreature } from './creature-lookup'
+import { compareBySideSlotId } from './tie-break'
 import {
   resolveBaselineEffects,
   instantiateEffectDefs,
@@ -196,6 +197,9 @@
  */
 function rollWebBreakFree(state: CombatState, events: CombatEvent[]): CombatState {
   const bearerIds = turnOrderIdsOf(state)
+    .map((id) => getCreature(state, id))
+    .sort(compareBySideSlotId)
+    .map((c) => c.id)
 
   let working = state
   for (const bearerId of bearerIds) {
```

## Result with the patch applied

`npx vitest run`: 1898 tests, 1875 passed, 22 failed, 1 skipped.

- **Every pre-existing golden and unit test passes**, and so does `corpus-digest.test.ts`: the corpus
  digest equals `main`'s committed fixture. Order alone is the whole difference.
- **The 22 failures are all new tests**, each a mechanism check: `pass-order.test.ts` 11 (attack,
  single cast, AOE cast, defend, provoke, damage, death, fight start, round end, the in-pass status
  grant, the per-instance Speed read), `turn-order.test.ts` 3 (live parties, poles, party array out
  of slot order), and one test in each of the seven `golden-pass-order-*` files (`live` has two).

`main`'s corpus logs for `corpus-table.md` were dumped from this tree.
