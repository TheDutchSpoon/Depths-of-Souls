// Golden: Spore's spread-on-death fizzles when every living member of the dying host's own side
// is already Spored -- species-locked.md's own "fizzles if none [qualify]" loop-guard. The
// trigger's own `TriggerFired` still fires (it's a targeting fizzle, not a suppressed trigger),
// but nothing follows it: no `StatusApplied`, and no RNG draw at all (the empty-pool check in
// `resolveResponseTargets`'s `random-ally-without-status` case returns before ever calling
// `state.rng.next()`).
//
// Hand-derived (independent `node -e` calculator, verified via Bash). Both BEARER and its only
// living ally, ALLY, are pre-applied Spore before any turn resolves (a throwaway events array),
// so `random-ally-without-status` relative to BEARER has zero candidates once BEARER dies. No
// random selectors anywhere in this scenario either (ATTACKER's `always-attack` deterministically
// targets the lower-HP BEARER) -- SEED is inert.
//
//   ATTACKER->BEARER (off 20, def 0): core = 20. chip = 0.01*20 = 0.2. raw = 20.2 -> final =
//     floor(20.2) = 20. BEARER (wounded to 10 post-createCombat) 10 - 20 -> 0, dies.
//   on-death fires Spore's spread trigger: TriggerFired(BEARER, on-death, spore) -> pool =
//     livingAlliesOf(BEARER) = [ALLY], filtered to exclude Spored -> [] -> empty, no draw, no
//     StatusApplied.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 42 // No RNG consumed anywhere in this fixture (empty pool); seed is inert.

export const ATTACKER = createCreatureId('attacker')
export const BEARER = createCreatureId('bearer')
export const ALLY = createCreatureId('ally')

/** Applied post-createCombat by the test -- see the header comment above. */
export const BEARER_STARTING_HP = 10

export const playerParty = makeParty('player', [
  { id: 'attacker', attack: 20, defence: 10, speed: 30, scriptId: 'always-attack' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'bearer', health: 100, defence: 0, speed: 20, scriptId: 'always-wait' },
  { id: 'ally', health: 50, defence: 0, speed: 5, scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // ATTACKER's turn only -- BEARER dies mid-attack.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: BEARER },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: BEARER,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: BEARER },
  { type: 'TriggerFired', sourceId: BEARER, hook: 'on-death', effectId: 'spore' },
  // No StatusApplied -- the pool is empty, so the trigger fizzles right here.
  { type: 'TurnEnded', creatureId: ATTACKER },
]
