// Golden: the `revive` response (Phase 4 Slice B), Unicorn-shaped -- a dead ally comes back
// mid-fight via an on-attack trigger, at the death-reset baseline + a pct of that baseline's
// max HP (20%, per CONVENTIONS' worked example), with NO special turn-queue handling (revive
// happens mid-round; the revived creature just re-enters normal aliveness checks).
//
// Hand-derived (independent `node -e` calculator). All vitality -> neutral affinity x1.0. FOE
// (speed 10) acts before UNICORN (speed 5) before ALLY (speed 1, never reached -- the fight ends
// on UNICORN's turn).
//
//   FOE->ALLY (off 20, def 0):     core 20, chip 0.01*20=0.2 -> raw 20.2 -> final 20.
//     ALLY health 20 - 20 -> 0 -> dies (createCombat inits currentHp to full effective max at
//     fight-start regardless of any per-creature currentHp override, so ALLY's base Health IS
//     its starting HP here -- picked at exactly 20 so this one hit is lethal).
//   UNICORN->FOE (off 10, def 0):  core 10, chip 0.01*10=0.1 -> raw 10.1 -> final 10.
//     FOE health 10 - 10 -> 0 -> dies. Fight ends in UNICORN's win before ALLY's queued turn.
//
//   Revive (fires on UNICORN's on-attack, BEFORE its main hit lands): only one dead ally (ALLY)
//   exists, so the `random-dead-ally` draw is deterministic regardless of its RNG value (pool
//   size 1 -> index always 0). ALLY carries no innateTraitIds, so the death-reset baseline is
//   just its base Health (20). currentHp = round(20 * 0.2) = 4.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 2002 // Consumes exactly one RNG draw (the revive target pick); pool size 1,
// so the result is deterministic regardless of the seed -- the seed itself is inert.

const FOE = createCreatureId('foe')
const UNICORN = createCreatureId('unicorn')
const ALLY = createCreatureId('ally')

export const REVIVE_ON_ATTACK: Trait = {
  id: 'revive-on-attack',
  name: 'Revive on Attack',
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'unicorn',
    health: 50,
    attack: 10,
    defence: 0,
    speed: 5,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: ['revive-on-attack'],
  },
  {
    id: 'ally',
    health: 20, // exactly FOE's hit -- one blow is lethal
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'foe',
    health: 10,
    attack: 20,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-attack',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [REVIVE_ON_ATTACK.id, REVIVE_ON_ATTACK],
])

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'AttackDeclared', attackerId: FOE, targetId: ALLY },
  {
    type: 'DamageDealt',
    sourceId: FOE,
    targetId: ALLY,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: ALLY },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'TurnStarted', creatureId: UNICORN },
  { type: 'AttackDeclared', attackerId: UNICORN, targetId: FOE },
  {
    type: 'TriggerFired',
    sourceId: UNICORN,
    hook: 'on-attack',
    effectId: 'revive-on-attack',
  },
  { type: 'Revived', sourceId: UNICORN, targetId: ALLY, currentHp: 4 },
  {
    type: 'DamageDealt',
    sourceId: UNICORN,
    targetId: FOE,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: FOE },
  { type: 'TurnEnded', creatureId: UNICORN },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
