# Guard forecast (plan review, round 1)

What each new 4.6-A check would reject in today's suite, measured before the build. Method: a
scratch clone of `4.6-a` at `a24e91e`, never this tree. `createCombat` was wrapped to **record**,
not throw, every input the planned guards and the two load-time checks would reject. The
deep-freeze helper was wrapped to record every `Map`/`Set` write after freezing. Then the full
suite ran: 257 files, 2235 passed, 1 skipped, so the probe changed no result. A second scratch test
swept every shipped perk at every level `1..maxLevel` through the existing perk validators and the
two new checks.

## Rejected inputs, by guard

| Guard | Tests | Where |
| --- | --- | --- |
| `emitTriggerFired: false` off a tick: `CATASTROPHIC_COLLAPSE` in the registry | 9 | goldens `round-end-interaction`, `conditional-passive`, `conditional-trigger`, `loop-safety`, `stun`, `triggered-damage`; `resolution.test.ts` ×3 (two loop-safety tests, apply-stat-modifier re-stacking) |
| `emitTriggerFired: false` off a tick: a test's inline status | 2 | `resolution.test.ts` "heal response (Regen)" (status `test-regen`, flat heal); `status-containers.test.ts` "deal-damage, flat mode … is a COST" (status `single`) |
| `alive: false` | 9 | goldens `necromoss-reclaim` (3 creatures), `heal-scaling-count` (1); `resolution.test.ts` ×7 (heal scaling, revive response ×3, all-allies, all-allies-of-species, revive cap) |
| `defendCount ≠ 0` | 2 | golden `defend-count-additive-cap`; `combat.test.ts` "taken-reduction passive (real Bulwark shape, as a perk)" |
| `defending` | 1 | `resolution.test.ts` "revive response > clears defending/provoking" |
| `provoking` | 3 | `combat.test.ts` "Provoke > redirects …", "turn-start cleanup > skips cleanup …"; `resolution.test.ts` "clears defending/provoking" |
| unknown `scriptId` | 10 | `combat.test.ts` "action instance-list composition" ×5 (`always-attack` / `always-wait`, registry `new Map()`); `data/species/starters.test.ts` ×2 (role ids `caster` / `striker`, `always-cast`; no registry); `state/store.test.ts` ×3 intro tests (the real Unicorn's `striker` against the test deps' `FIXTURE_SCRIPTS_BY_ID`) |
| slot range / duplicate / order | 0 | — |
| duplicate id | 0 | — |
| additive taken cap | 0 | — |
| `revivesUsed ≠ 0` | 0 | — |
| `Map`/`Set` write after freezing | 0 | — |
| perk sweep, every level | 0 | all shipped perks pass the existing and the new checks at every level |

## Candidate fixes, tried in the scratch clone

With the fixes below, the six files above plus every golden run green, except
`golden-round-end-interaction`. Its only diff is the one listed `TriggerFired`
(`p1`, `on-round-end`, `catastrophic-collapse`).

- `CATASTROPHIC_COLLAPSE` drops the flag.
- The two inline statuses drop the flag. Their assertions read `HealApplied` and `currentHp`, never
  a `TriggerFired` count.
- `combat.test.ts` instance-list: `scripts: FIXTURE_SCRIPTS_BY_ID` in place of `new Map()`.
- `starters.test.ts`: a registry holding the ids its creatures name (`STOCK_SCRIPTS_BY_ID`, plus
  `ALWAYS_CAST_SCRIPT` for the fused fixture). Neither test runs a turn.
- `store.test.ts`: `makeDeps`'s default `scripts` becomes `STOCK_SCRIPTS_BY_ID` merged with
  `FIXTURE_SCRIPTS_BY_ID`. The production deps (`DEFAULT_REGISTRIES.scripts`) already hold
  `striker`: the gap is in the test deps, not the store. The whole store file stays green, and the
  intro's Unicorn now runs its role script instead of the implicit fallback.

The freshness moves weren't tried here: the kickoff's `updateCreature` and `setup` rule covers them.
