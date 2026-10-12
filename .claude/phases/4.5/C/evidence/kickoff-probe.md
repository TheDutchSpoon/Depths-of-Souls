# Kickoff probe: what the dead-slot skip moves on `main`

Scratch clone of `dd703a4` (`main`), outside the repo, engine, data and state suites only
(`npx vitest run src/engine src/data src/state`; `main`: 1401 passed, 1 skipped). It is a
measurement, not the build: the plan designs the change.

## Variants

All edit `resolveTurn` in `engine/combat.ts` and nothing else.

| Variant | Dead slot does |
| --- | --- |
| **A** (the slice) | nothing: `resolveTurn` loops past dead entries to the next living one, crossing the round boundary |
| B | nothing, but the call returns `{ state, events: [] }` (rejected at kickoff) |
| D | no bracket; still bumps the clock and runs the Web roll |
| E | no bracket, no Web roll; still bumps the clock |

## Full suite under A

11 failed, 1390 passed, 1 skipped. The three `balance-ci-*` threshold tests stay green.

| Test | Why |
| --- | --- |
| `combat.test.ts` "emits an empty TurnStarted/TurnEnded bracket …" | pins the old rule |
| `status-timing.test.ts` "a dead actor's empty bracket still bumps the clock and rolls …" | pins the old rule |
| `golden-6v6-scripted` (generated, checkpoint-verified) | 3 dead slots; brackets only |
| `golden-fallback-attacks-lowest-hp` | 1 dead slot; brackets only |
| `golden-random-selector` | 2 dead slots; brackets only |
| `golden-broodmother` (`TURN_STEPS` 5) | 1 dead slot; runs one turn further |
| `golden-gloomjaw-executioner` (`TURN_STEPS` 4) | 1 dead slot; the 4th call runs on a finished fight and emits a second `FightEnded` |
| `golden-provoke-stun-cleanup` (`TURN_STEPS` 6) | 1 dead slot; runs one turn further |
| `golden-pass-order-live` `revived` (`TURN_STEPS` 6) | 1 dead slot; runs one turn further |
| `corpus-digest.test.ts` | below |
| `balance-sim.test.ts` "restores the state exactly …" | `firstRoundEnemyIds` reads the roster from round-1 `TurnStarted` brackets; an enemy killed before its first turn drops out |

With `TURN_STEPS` lowered by one, each of the four stepped goldens differs from `main` by its
removed bracket alone, with the same result and RNG position. No hand-derived golden has a Web
roll inside a dead bracket.

## Corpus digest under A

393 of 527 fights change: 319 by removed brackets alone, 74 diverge. A and B give identical
full-fight logs.

Attribution, over all 527 fights:

- **D equals `main` with its empty brackets removed** (their Web `StatusExpired` kept in place):
  removing the bracket changes nothing else.
- **E equals A**: the missing clock bumps change nothing, as the brief argues.
- So every divergence comes from the dead slots' Web draws: 75 fights drew in a dead slot (D ≠ E),
  74 of them diverge.

First differing event of the 74 diverging fights (main with brackets removed vs A):

| main | A | Fights |
| --- | --- | --- |
| `AttackDeclared` | `AttackDeclared` | 26 |
| `SpellCast` | `SpellCast` | 20 |
| `StatusExpired` | `TurnEnded` | 11 |
| `TurnEnded` | `StatusExpired` | 6 |
| `RoundStarted` | `TriggerFired` | 3 |
| `TriggerFired` | `TriggerFired` | 2 |
| `DamageDealt` | `DamageDealt` | 2 |
| other (one each) | | 4 |

Result changes (corpus index, `main` → A, event counts):

| Fight | Result | Events |
| --- | --- | --- |
| 35 | win → draw | 1651 → 3074 |
| 135 | win → draw | 464 → 1945 |
| 185 | loss → win | 535 → 1160 |
| 457 | win → loss | 967 → 2329 |

## Stepping past the end

On `main`, each corpus fight was run to its result and `resolveTurn` called once more:

| The extra call | Fights |
| --- | --- |
| a living creature's new bracket, then a second `FightEnded` | 376 |
| a second `FightEnded` only | 73 |
| a dead creature's empty bracket, no `FightEnded` | 72 |
| round-end triggers firing (`HealApplied`, `StatModifierApplied`), then a second `FightEnded` | 4 |
| a Web roll's `StatusExpired` inside a bracket | 2 |

The RNG position moved in 5 fights; the result never changed. With a guard that throws on a state
with a result: `main` plus the guard passes every engine, data and state test; A plus the guard
fails the same 11 tests as A.
