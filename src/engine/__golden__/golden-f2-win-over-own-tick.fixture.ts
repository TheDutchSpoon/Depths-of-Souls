// Golden: the PR #70 case -- the winning side's last creature empties the other side, then would
// die to its own turn-end tick. With the win checked right after the action (Phase 4.1-F2,
// ASSUMPTION 19) it is a WIN, with no tick; an end-only check made it a draw. Hand-derived.
//
// P (player, speed 20, max HP 100, wounded to 3 after fight setup) carries a fixture trait that
// Poisons itself (3 turns) at fight start; Poison ticks 3% of max HP = 3 = lethal for P at 3 HP.
// E (enemy, speed 10, health 5, defence 5) waits. P always-attacks: off 20, def 5 -> core 15,
// chip 0.2 -> raw 15.2 -> final 15; E 5 -> 0, dies. The enemy side is empty: the fight ends at
// once. P's turn-end hooks never run (so no tick), its cleanup never runs: TurnEnded, FightEnded.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 4206 // No RNG consumed; seed is inert.

const P = createCreatureId('p')
const E = createCreatureId('e')

export const SELF_POISON_FIGHT_START: Trait = {
  id: 'f2-self-poison-at-start-fixture',
  name: 'Self Poison at start (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'self' },
        status: { statusId: 'poison', duration: 3 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'p',
    attack: 20,
    speed: 20,
    scriptId: 'always-attack',
    innateTraitIds: [SELF_POISON_FIGHT_START.id],
  },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 5, defence: 5, speed: 10, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  [SELF_POISON_FIGHT_START.id, SELF_POISON_FIGHT_START],
])
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState =>
  updateCreature(created, P, { currentHp: 3 })

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: P,
    hook: 'on-fight-start',
    effectId: SELF_POISON_FIGHT_START.id,
  },
  {
    type: 'StatusApplied',
    targetId: P,
    statusId: 'poison',
    stacks: 1,
    duration: 3,
    sourceId: P,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: P },
  { type: 'AttackDeclared', attackerId: P, targetId: E },
  {
    type: 'DamageDealt',
    sourceId: P,
    targetId: E,
    rawDamage: 15.2,
    finalDamage: 15,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: E },
  { type: 'TurnEnded', creatureId: P },
  { type: 'FightEnded', result: 'win' },
]

export const expectedResult: FightResult = 'win'
