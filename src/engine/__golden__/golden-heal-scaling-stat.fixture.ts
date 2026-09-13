// Golden: the triggered `heal` response's `scalingStat` mode (Phase 4 Slice E2, Treants
// Elder-shaped) -- magnitude = getEffectiveStat(HEALER, scalingStat) x spellPower, mirroring
// deal-damage's own scalingStat/spellPower pairing exactly, clamped to effective max HP AFTER
// scaling (the overheal rule already existed; this proves it composes correctly with the new
// scaling mode). ELDER self-heals via `on-turn-end` (its own turn's aftermath, no round-end
// sweep needed) -- fixture-shaped, not real Elder content (H1's job).
//
// Hand-derived (independent `node -e` calculator). Both vitality -> neutral affinity x1.0.
// FOE (speed 20) acts before ELDER (speed 10) in round 1.
//
//   FOE->ELDER (off 40, def 0): core 40, chip 0.01*40=0.4 -> raw 40.4 -> final 40.
//     ELDER 100 - 40 -> 60.
//   ELDER's own on-turn-end heal (self): amount = getEffectiveStat(elder,'health') x
//     spellPower(1.0) = 100. newHp = min(maxHp 100, 60+100=160) = 100 (clamped -- the "no
//     overheal" rule, now exercised through the NEW scaling mode). HealApplied.amount =
//     100-60 = 40, remainingHp = 100.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 3131 // No RNG consumed anywhere in this fixture; seed is inert.

const FOE = createCreatureId('foe')
const ELDER = createCreatureId('elder')

export const ELDER_FIXTURE: Trait = {
  id: 'elder-fixture',
  name: 'Elder (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      response: {
        kind: 'heal',
        target: { kind: 'self' },
        scalingStat: 'health',
        spellPower: 1.0,
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'elder',
    health: 100,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: ['elder-fixture'],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    attack: 40,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [ELDER_FIXTURE.id, ELDER_FIXTURE],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'AttackDeclared', attackerId: FOE, targetId: ELDER },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: ELDER,
    rawDamage: 40.4,
    finalDamage: 40,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 60,
    damageSource: 'attack',
  },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'TurnStarted', creatureId: ELDER },
  { type: 'Waited', creatureId: ELDER },
  { type: 'TurnEnded', creatureId: ELDER },
  {
    type: 'TriggerFired',
    sourceId: ELDER,
    hook: 'on-turn-end',
    effectId: 'elder-fixture',
  },
  {
    type: 'HealApplied',
    sourceId: ELDER,
    targetId: ELDER,
    amount: 40,
    remainingHp: 100,
  },
]
