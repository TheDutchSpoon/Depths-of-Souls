// Golden: 4.1-E (A2, ASSUMPTION 2) -- the grant queue is FIRST IN, FIRST OUT: a grant raised BY a
// granted action goes to the BACK of the queue, behind grants already waiting. Hand-derived.
//
// SETUP (player side, slot order A, O1, O2, O3; all chancePercent 100, so every roll passes and no
// draw VALUE matters; the only draws are the three chance rolls, #1 O1, #2 O2 at the cast's
// observation and #3 O3 at the Defend's observation -- gem/target draws don't occur: the granted
// intents are Defend / Provoke / Wait, which draw nothing).
//   A  (speed 30, Int 20, `always-cast`, [BOLT]): casts at FOE on its turn.
//   O1 (T1): on-action-observed, ally, cast -> perform-action(triggering-source, DEFEND)   [G1]
//   O2 (T2): on-action-observed, ally, cast -> perform-action(triggering-source, PROVOKE)  [G2]
//   O3 (T3): on-action-observed, ally, DEFEND -> perform-action(self, WAIT)                [G3]
//   FOE (HP 100, defence 0, speed 1, always-wait).
//
// TURN 1 (A; TURN_STEPS = 1). A casts BOLT: Int 20 x 0.5 = 10 vs defence 0 -> raw 10.1 -> 10; FOE
// 100 -> 90. Observation fires on every living creature in slot order [A, O1, O2, O3]: A has no
// trait; O1 rolls -> TriggerFired, queues G1; O2 rolls -> TriggerFired, queues G2; O3 watches
// DEFEND only (not a cast) -> nothing. The original's hit lands. QUEUE: [G1, G2].
// Drain: G1 runs -> ActionGranted(O1 -> A), Defended(A); A's Defend is observed: O3 rolls ->
// TriggerFired, queues G3 at the BACK. QUEUE: [G2, G3]. G2 -> ActionGranted(O2 -> A), Provoked(A);
// its observation (provoke) matches nobody. G3 -> ActionGranted(O3 -> O3), Waited(O3).
//   FIFO order of the three granted actions: Defended, Provoked, Waited.
//   (A nested/LIFO queue would run G3 right after G1: Defended, Waited, Provoked.)
// TurnEnded(A). FOE never acts (TURN_STEPS = 1).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CombatEvent, Spell } from '../types'
import type { EffectDef, Trait } from '../effect-types'

export const SEED = 4102
export const TURN_STEPS = 1

const A = createCreatureId('a')
const O1 = createCreatureId('o1')
const O2 = createCreatureId('o2')
const O3 = createCreatureId('o3')
const FOE = createCreatureId('foe')

export const BOLT: Spell = {
  id: 'bolt-fixture',
  name: 'Bolt (fixture)',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

function observer(
  id: string,
  actionKind: 'cast' | 'defend',
  actor: 'self' | 'triggering-source',
  action: { kind: 'defend' } | { kind: 'provoke' } | { kind: 'wait' },
): Trait {
  const effect: EffectDef = {
    category: 'triggered',
    hook: 'on-action-observed',
    observationFilter: { relationship: 'ally', actionKind },
    chancePercent: 100,
    response: { kind: 'perform-action', actor, intent: { action } },
  }
  return { id, name: `${id} (fixture)`, effects: [effect] }
}

export const T1 = observer('e-t1-defend-fixture', 'cast', 'triggering-source', {
  kind: 'defend',
})
export const T2 = observer('e-t2-provoke-fixture', 'cast', 'triggering-source', {
  kind: 'provoke',
})
export const T3 = observer('e-t3-wait-fixture', 'defend', 'self', { kind: 'wait' })

export const playerParty = makeParty('player', [
  {
    id: 'a',
    health: 100,
    intelligence: 20,
    speed: 30,
    scriptId: 'always-cast',
    equippedSpells: [BOLT],
  },
  { id: 'o1', speed: 5, scriptId: 'always-wait', innateTraitIds: [T1.id] },
  { id: 'o2', speed: 4, scriptId: 'always-wait', innateTraitIds: [T2.id] },
  { id: 'o3', speed: 3, scriptId: 'always-wait', innateTraitIds: [T3.id] },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', health: 100, defence: 0, speed: 1, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [T1, T2, T3].map((t) => [t.id, t]),
)

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: A },
  { type: 'SpellCast', targetShape: 'single', casterId: A, gemSlot: 0, targetId: FOE },
  { type: 'TriggerFired', sourceId: O1, hook: 'on-action-observed', effectId: T1.id },
  { type: 'TriggerFired', sourceId: O2, hook: 'on-action-observed', effectId: T2.id },
  {
    type: 'DamageDealt',
    sourceId: A,
    targetId: FOE,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 90,
    damageSource: 'cast',
  },
  // Drain: G1 ...
  { type: 'ActionGranted', sourceId: O1, actorId: A, effectId: T1.id },
  { type: 'Defended', creatureId: A },
  // ... whose Defend is observed by O3, queueing G3 at the BACK (behind G2).
  { type: 'TriggerFired', sourceId: O3, hook: 'on-action-observed', effectId: T3.id },
  // G2 (raised before G3) runs next ...
  { type: 'ActionGranted', sourceId: O2, actorId: A, effectId: T2.id },
  { type: 'Provoked', creatureId: A },
  // ... then G3.
  { type: 'ActionGranted', sourceId: O3, actorId: O3, effectId: T3.id },
  { type: 'Waited', creatureId: O3 },
  { type: 'TurnEnded', creatureId: A },
]
