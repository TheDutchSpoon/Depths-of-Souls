// Golden: the triggered `heal` response's `magnitudeSource` mode (Phase 4 Slice E2, Necromoss-
// shaped) -- a flat per-unit `amountPerStack` scaled by a LIVE count (dead-allies) instead of
// the firing status's own `stacks`, mirroring deal-damage's own magnitudeSource composition
// exactly. NECROMOSS self-heals via `on-turn-end` (no round-end sweep needed) -- fixture-shaped,
// not real Necromoss content (H3's job).
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// FOE (speed 20) acts before NECROMOSS (speed 10) in round 1. DEAD-ALLY starts the fight already
// dead (a pre-wiped party member, per CONVENTIONS "duplicate/dead slots" -- never gets a turn,
// buildTurnQueue filters it out) -- resolveCount's dead-allies reads it directly, no in-fight
// death needed for this fixture.
//
//   FOE->NECROMOSS (off 30, def 0): core 30, chip 0.01*30=0.3 -> raw 30.3 -> final 30.
//     NECROMOSS 100 - 30 -> 70.
//   NECROMOSS's own on-turn-end heal (self): dead-allies count = 1 (DEAD-ALLY) -> amount =
//     amountPerStack(5) x count(1) = 5. newHp = min(maxHp 100, 70+5=75) = 75 (no clamp).
//     HealApplied.amount = 5, remainingHp = 75.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 3232 // No RNG consumed anywhere in this fixture; seed is inert.

const FOE = createCreatureId('foe')
const NECROMOSS = createCreatureId('necromoss')

export const NECROMOSS_FIXTURE: Trait = {
  id: 'necromoss-fixture',
  name: 'Necromoss (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        amountPerStack: 5,
        magnitudeSource: { kind: 'count', of: 'dead-allies' },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'necromoss',
    health: 100,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: ['necromoss-fixture'],
  },
  {
    id: 'dead-ally',
    alive: false,
    affinity: 'vitality',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    attack: 30,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [NECROMOSS_FIXTURE.id, NECROMOSS_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'AttackDeclared', attackerId: FOE, targetId: NECROMOSS },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: NECROMOSS,
    rawDamage: 30.3,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 70,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'TurnStarted', creatureId: NECROMOSS },
  { type: 'Waited', creatureId: NECROMOSS },
  { type: 'TurnEnded', creatureId: NECROMOSS },
  {
    type: 'TriggerFired',
    sourceId: NECROMOSS,
    hook: 'on-turn-end',
    effectId: 'necromoss-fixture',
  },
  {
    type: 'HealApplied',
    sourceId: NECROMOSS,
    targetId: NECROMOSS,
    amount: 5,
    remainingHp: 75,
  },
]
