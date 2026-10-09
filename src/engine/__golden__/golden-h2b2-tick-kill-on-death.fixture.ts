// Golden: a tick that KILLS its bearer offers no `triggering-source` to the bearer's `on-death`
// either (Phase 4.1-H2b2, ASSUMPTION 6). `on-death` is the second bearer-side site of the tick
// origin (the first is `on-damage-taken`, golden-h2b2-tick-no-retaliation). A fixture trait on the
// bearer answers its own death by striking `triggering-source`: after a tick-kill from a living
// applier it fires (TriggerFired) and resolves to nothing -- the applier takes no damage.
//
// Hand-derived (independent `node -e` calculator). Player: A (the applier; Attack 100, speed 50).
// Enemies: B (the bearer; health 100 wounded to 10, Defence 20, speed 5, carries the fixture
// "Last Words": on-death -> deal-damage at triggering-source, Attack x1.0) and E2 (speed 4, keeps
// the enemy side alive). A applies Poison (duration 3) to B before any turn: snapshot = applier A,
// vitality, potency floor(100 x 20 / 100) = 20. All vitality (neutral): tick = 20 - 0.2 x 20 = 16.
//   R1 A waits. R1 B turn end: tick 16 from the LIVING applier A, B 10 -> 0, dies. CreatureDied(B);
//   on-death fires Last Words (TriggerFired) and `triggering-source` resolves to nothing: NO
//   DamageDealt on A. (Were the applier offered as the source, A would take an indirect hit of
//   20 - 0.2 x 20 = 16 and the log would show it.) E2 waits.
// TURN_STEPS = 3 (A, B, E2).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { updateCreature } from '../creature-lookup'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { applyStatus, newCascade } from '../resolution'
import { createResolutionContext } from '../actions'
import type { CombatEvent, CombatState, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8308 // No RNG consumed; seed is inert.
export const TURN_STEPS = 3

const A = createCreatureId('a')
const B = createCreatureId('b')
const E2 = createCreatureId('e2')

export const LAST_WORDS: Trait = {
  id: 'h2b2-last-words',
  name: 'Last Words (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-death',
      response: {
        kind: 'deal-damage',
        target: { kind: 'triggering-source' },
        offStat: 'attack',
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  { id: 'a', attack: 100, speed: 50, scriptId: 'always-wait' },
])
export const enemyParty = makeParty('enemy', [
  {
    id: 'b',
    health: 100,
    defence: 20,
    speed: 5,
    scriptId: 'always-wait',
    innateTraitIds: [LAST_WORDS.id],
  },
  { id: 'e2', speed: 4, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([[LAST_WORDS.id, LAST_WORDS]])
export const statuses = STATUS_REGISTRY

export const setup = (created: CombatState): CombatState => {
  const state = applyStatus(
    A,
    B,
    { statusId: 'poison', duration: 3 },
    created,
    createResolutionContext([], newCascade()),
  )
  return updateCreature(state, B, { currentHp: 10 })
}

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'Waited', creatureId: A },
  { type: 'TurnEnded', creatureId: A },
  { type: 'TurnStarted', creatureId: B },
  { type: 'Waited', creatureId: B },
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: B,
    rawDamage: 16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'dot',
    statusId: 'poison',
  },
  { type: 'CreatureDied', creatureId: B },
  { type: 'TriggerFired', sourceId: B, hook: 'on-death', effectId: LAST_WORDS.id },
  // (no DamageDealt on A: a tick offers no triggering-source to on-death either)
  { type: 'TurnEnded', creatureId: B },
  { type: 'TurnStarted', creatureId: E2 },
  { type: 'Waited', creatureId: E2 },
  { type: 'TurnEnded', creatureId: E2 },
]

export const expectedResult: FightResult | null = null
