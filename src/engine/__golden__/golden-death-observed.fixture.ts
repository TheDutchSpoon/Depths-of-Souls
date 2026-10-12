// Golden: `on-death-observed` and its `relationship` filter (`ally`, `enemy`, `any`, absent) on a
// death, with a non-matching observer silent in each case, and the firing order: every living
// creature but the dead one, player side first then enemy side, each in slot order (side -> slot
// -> id), whichever side the dead creature was on. Hand-derived; four fixture-local traits, one
// per filter, each `apply-stat-modifier` on its own bearer with a distinct factor, so one firing
// is one `TriggerFired` plus one `StatModifierApplied` (effectiveBefore 20: every observer has the
// default Attack 20).
//
// The killer (Attack 40, speed 30, violence, always-attack at the lowest-HP enemy, level 11 -> no
// Additional) acts first; TURN_STEPS = 1 runs only its turn. Every creature is violence, so every
// affinity multiplier is x1.0. The victim V (health 20, Defence 10; every other creature has
// health 40, so V is the lowest-HP target): core 40 - 10 = 30, chip 0.01 x 40 = 0.4 -> raw 30.4
// -> final 30 >= 20, V dies (remainingHp 0). No RNG is consumed. V also carries the `any` trait:
// it is dead, and a creature never observes its own death, so it stays silent.
//
// Traits (effectiveAfter = 20 x factor, exact in JS): OBSERVE_ENEMY (`enemy`, x1.1 -> 22),
// OBSERVE_ALLY (`ally`, x1.2 -> 24), OBSERVE_ANY (`any`, x1.3 -> 26), OBSERVE_ABSENT (no filter,
// x1.4 -> 28: absent matches everything).
//
// CASE 1, `enemyDies`: players A (the killer, no trait, slot 0), PE (OBSERVE_ENEMY), PA
//   (OBSERVE_ALLY), PY (OBSERVE_ANY); enemies V (slot 0), EA (OBSERVE_ALLY), EE (OBSERVE_ENEMY),
//   EB (OBSERVE_ABSENT). The dead V is an enemy of the players and an ally of EA/EE/EB.
//   Observers in tie-break order: A (no trait), PE: `enemy`, V is its enemy -> fires (x1.1);
//   PA: `ally`, V is not its ally -> silent; PY: `any` -> fires (x1.3); then the enemy side:
//   V itself is left out; EA: `ally`, V is its ally -> fires (x1.2); EE: `enemy`, V is on its own
//   side -> silent; EB: no filter -> fires (x1.4).
//   Firing order: PE, PY, EA, EB. The player side first is the order change: V's allies (EA, EB)
//   used to fire before its enemies (PE, PY).
//
// CASE 2, `playerDies`: the mirror, so `ally` and `enemy` are read from the dead creature's side
//   in both directions. Players V (slot 0), PA (OBSERVE_ALLY), PE (OBSERVE_ENEMY), PB
//   (OBSERVE_ABSENT); enemies K (the killer, no trait, slot 0), EE (OBSERVE_ENEMY), EA
//   (OBSERVE_ALLY), EY (OBSERVE_ANY). V is dead; PA: `ally` -> fires (x1.2); PE: `enemy`, V is
//   its ally -> silent; PB: no filter -> fires (x1.4); K no trait; EE: `enemy`, V is its enemy ->
//   fires (x1.1); EA: `ally`, V is not its ally -> silent; EY: `any` -> fires (x1.3).
//   Firing order: PA, PB, EE, EY.

import { createCreatureId } from '../ids'
import { makeParty } from '../__fixtures__/creatures'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import type { CreatureOverrides } from '../__fixtures__/creatures'
import type { ObservationFilter, Trait } from '../effect-types'
import type { CombatEvent } from '../types'

function observer(
  id: string,
  filter: ObservationFilter | undefined,
  factor: number,
): Trait {
  return {
    id,
    name: id,
    effects: [
      {
        category: 'triggered',
        hook: 'on-death-observed',
        ...(filter ? { observationFilter: filter } : {}),
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'self' },
          stat: 'attack',
          factor,
        },
      },
    ],
  }
}

export const OBSERVE_ENEMY = observer('observe-enemy', { relationship: 'enemy' }, 1.1)
export const OBSERVE_ALLY = observer('observe-ally', { relationship: 'ally' }, 1.2)
export const OBSERVE_ANY = observer('observe-any', { relationship: 'any' }, 1.3)
export const OBSERVE_ABSENT = observer('observe-absent', undefined, 1.4)

const traits = new Map(
  [OBSERVE_ENEMY, OBSERVE_ALLY, OBSERVE_ANY, OBSERVE_ABSENT].map((t) => [t.id, t]),
)

const killer = (id: string): CreatureOverrides => ({
  id,
  health: 40,
  attack: 40,
  speed: 30,
  affinity: 'violence',
  scriptId: 'always-attack',
})

const victim = (id: string): CreatureOverrides => ({
  id,
  health: 20,
  defence: 10,
  affinity: 'violence',
  scriptId: 'always-wait',
  innateTraitIds: [OBSERVE_ANY.id],
})

const watcher = (id: string, trait: Trait): CreatureOverrides => ({
  id,
  health: 40,
  affinity: 'violence',
  scriptId: 'always-wait',
  innateTraitIds: [trait.id],
})

const A = createCreatureId('a')
const K = createCreatureId('k')
const V = createCreatureId('v')
const PE = createCreatureId('pe')
const PA = createCreatureId('pa')
const PY = createCreatureId('py')
const PB = createCreatureId('pb')
const EA = createCreatureId('ea')
const EE = createCreatureId('ee')
const EB = createCreatureId('eb')
const EY = createCreatureId('ey')

export const enemyDies = {
  SEED: 8301, // No RNG consumed; seed is inert.
  TURN_STEPS: 1,
  playerParty: makeParty('player', [
    { ...killer('a'), innateTraitIds: [] },
    watcher('pe', OBSERVE_ENEMY),
    watcher('pa', OBSERVE_ALLY),
    watcher('py', OBSERVE_ANY),
  ]),
  enemyParty: makeParty('enemy', [
    victim('v'),
    watcher('ea', OBSERVE_ALLY),
    watcher('ee', OBSERVE_ENEMY),
    watcher('eb', OBSERVE_ABSENT),
  ]),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits,
}

function fires(
  id: typeof PE,
  traitId: string,
  factor: number,
  effectiveAfter: number,
): CombatEvent[] {
  return [
    { type: 'TriggerFired', sourceId: id, hook: 'on-death-observed', effectId: traitId },
    {
      type: 'StatModifierApplied',
      sourceId: id,
      targetId: id,
      stat: 'attack',
      factor,
      effectiveBefore: 20,
      effectiveAfter,
    },
  ]
}

const lethalHit = (killerId: typeof K, victimId: typeof V): CombatEvent[] => [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: killerId },
  { type: 'AttackDeclared', attackerId: killerId, targetId: victimId },
  {
    type: 'DamageDealt',
    sourceId: killerId,
    targetId: victimId,
    rawDamage: 30.4,
    finalDamage: 30,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
  },
  { type: 'CreatureDied', creatureId: victimId },
]

export const enemyDiesExpected: CombatEvent[] = [
  ...lethalHit(A, V),
  // The player side first, in slot order: PE (`enemy`), PY (`any`); PA (`ally`) is silent.
  ...fires(PE, OBSERVE_ENEMY.id, 1.1, 22),
  ...fires(PY, OBSERVE_ANY.id, 1.3, 26),
  // Then the enemy side: EA (`ally`), EB (no filter); EE (`enemy`) is silent; V is left out.
  ...fires(EA, OBSERVE_ALLY.id, 1.2, 24),
  ...fires(EB, OBSERVE_ABSENT.id, 1.4, 28),
  { type: 'TurnEnded', creatureId: A },
]

export const playerDies = {
  SEED: 8302, // No RNG consumed; seed is inert.
  TURN_STEPS: 1,
  playerParty: makeParty('player', [
    victim('v'),
    watcher('pa', OBSERVE_ALLY),
    watcher('pe', OBSERVE_ENEMY),
    watcher('pb', OBSERVE_ABSENT),
  ]),
  enemyParty: makeParty('enemy', [
    { ...killer('k'), innateTraitIds: [] },
    watcher('ee', OBSERVE_ENEMY),
    watcher('ea', OBSERVE_ALLY),
    watcher('ey', OBSERVE_ANY),
  ]),
  scripts: FIXTURE_SCRIPTS_BY_ID,
  traits,
}

export const playerDiesExpected: CombatEvent[] = [
  ...lethalHit(K, V),
  // The player side: PA (`ally`), PB (no filter); PE (`enemy`) is silent; V is left out.
  ...fires(PA, OBSERVE_ALLY.id, 1.2, 24),
  ...fires(PB, OBSERVE_ABSENT.id, 1.4, 28),
  // The enemy side: EE (`enemy`), EY (`any`); EA (`ally`) is silent.
  ...fires(EE, OBSERVE_ENEMY.id, 1.1, 22),
  ...fires(EY, OBSERVE_ANY.id, 1.3, 26),
  { type: 'TurnEnded', creatureId: K },
]
