# 4.5-B2 one-helper grep

Run on the finished tree.

```
$ grep -rn "livingIdsOf" src            # no matches
$ grep -rn "turnOrderIdsOf(" src/engine/{actions,resolution,combat}.ts
src/engine/actions.ts:495:      turnOrderIdsOf(working),
src/engine/actions.ts:627:      turnOrderIdsOf(working),
src/engine/actions.ts:696:      turnOrderIdsOf(working),
src/engine/actions.ts:730:    turnOrderIdsOf(working),
src/engine/actions.ts:756:    turnOrderIdsOf(working),
src/engine/resolution.ts:381:    turnOrderIdsOf(working),
src/engine/resolution.ts:408:    turnOrderIdsOf(state).filter((id) => id !== deadId),
src/engine/combat.ts:198:  const bearerIds = turnOrderIdsOf(state)
src/engine/combat.ts:251:    turnOrderIdsOf(state),
src/engine/combat.ts:304:      turnOrderIdsOf(working),

$ the line above each call (fireHook second argument; hook name in the line before)
src/engine/actions.ts-494-      'on-action-observed',
src/engine/actions.ts-626-      'on-action-observed',
src/engine/actions.ts-695-      'on-action-observed',
src/engine/actions.ts-729-    'on-action-observed',
src/engine/actions.ts-755-    'on-action-observed',
src/engine/resolution.ts-380-    'on-damage-observed',
src/engine/resolution.ts-407-    'on-death-observed',
src/engine/combat.ts-250-    'on-round-end',
src/engine/combat.ts-303-      'on-fight-start',

$ grep -rn "playerParty, \.\.\.\|compareBySideSlotId" src/engine/*.ts   (non-test, outside tie-break.ts)
src/engine/creature-lookup.ts:6:  return [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
src/engine/turn-order.ts:5:import { compareBySideSlotId } from './tie-break'
src/engine/turn-order.ts:34:      return compareBySideSlotId(a.creature, b.creature)
src/engine/turn-order.ts:54:  for (const creature of [...playerParty, ...enemyParty]) {
```

- Nine hook calls, each `turnOrderIdsOf(<state>)` inline as `fireHook`'s second argument, neither
  filtered nor mapped, except `on-death-observed` (`resolution.ts:408`), which drops the dead
  creature by id.
- The Web roll has the single `const bearerIds = turnOrderIdsOf(state)` (`combat.ts:198`) before its
  loop. It is taken once at cleanup start by construction (no unit test can fail it: a roll that
  breaks free changes only the bearer that just rolled).
- `combat.ts` no longer sorts bearers and no longer imports `compareBySideSlotId`.
- The remaining list-of-living-creatures code is `findCreature` (a lookup), the ordering in
  `turn-order.ts` (the one helper) and nothing else. Hit order for AOE, `adjacentLivingTargets`,
  `pickExtremum` and every random pool are untouched.
