// Golden: the single-instance re-application rule (Phase 4.1-H2b2, ASSUMPTIONS 113, 114, 8, 9).
// A re-application keeps the ONE instance, refreshes its timer to the new application's duration
// (even when shorter), and replaces the applier snapshot ONLY when the new potency is STRICTLY
// greater: a weaker one and a tie keep the current instance whole (applier included). Every
// application still emits StatusApplied (no `stacks` field) and fires on-status-applied.
//
// Hand-derived (independent `node -e` calculator). Poison's potency is 20% of the APPLIER's Attack
// at application (data/statuses.ts). The bearer E (enemy, health 1000, Defence 0, vitality) waits
// forever; all four appliers are vitality too, so every tick is neutral: tick = potency x 1.0 -
// 0.2 x 0 = potency (an integer, min 1 not reached). Players act before E (speeds 40/35/30/25 vs 5);
// each applies in ITS OWN turn, so E (another creature's turn) is not "born" and ticks at its own
// turn end that round, then counts down.
//
//   P1 Attack 30 -> potency floor(30 x 20 / 100) = 6;  round 1, Poison duration 2.
//   P2 Attack 50 -> potency 10 (STRONGER);             round 2, duration 3.
//   P3 Attack 20 -> potency 4  (WEAKER);               round 3, duration 4.
//   P4 Attack 50 -> potency 10 (a TIE with P2's);      round 5, duration 1.
//
//   R1: P1 applies (fresh instance, snapshot P1/6, remaining 2). E's turn end: tick 6 (source P1)
//       1000 -> 994; countdown 2 -> 1.
//   R2: P2 applies: same instance, remaining 1 -> 3; 10 > 6 so the snapshot is REPLACED (P2/10).
//       E's tick 10 (source P2) 994 -> 984; countdown 3 -> 2.
//   R3: P3 applies: remaining 2 -> 4 (the weaker one STILL refreshes the timer); 4 < 10 so the
//       snapshot stays P2/10. E's tick 10 (source P2) 984 -> 974; countdown 4 -> 3.
//   R4: nobody applies. E's tick 10 (source P2) 974 -> 964; countdown 3 -> 2. (Were the weaker
//       application not to refresh, the timer would be 2 -> 1 here and then 0: the status would
//       expire at R4's end. It does not.)
//   R5: P4 applies: remaining 2 -> 1; 10 is NOT strictly greater than 10, so the snapshot stays
//       P2/10 (a tie keeps the current applier). E's tick 10 (source P2) 964 -> 954; countdown
//       1 -> 0: StatusExpired.
// TURN_STEPS = 25 (five rounds of five turns).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent, FightResult } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 8301 // No RNG consumed; seed is inert.
export const TURN_STEPS = 25

const P1 = createCreatureId('p1')
const P2 = createCreatureId('p2')
const P3 = createCreatureId('p3')
const P4 = createCreatureId('p4')
const E = createCreatureId('e')

function poisonerAt(id: string, round: number, duration: number): Trait {
  return {
    id,
    name: `Poisoner round ${round} (fixture)`,
    effects: [
      {
        category: 'triggered',
        hook: 'on-turn-start',
        condition: { kind: 'round-number', comparator: '==', round },
        response: {
          kind: 'apply-status',
          target: { kind: 'all-enemies' },
          status: { statusId: 'poison', duration },
        },
      },
    ],
  }
}

export const T1 = poisonerAt('h2b2-reapply-p1', 1, 2)
export const T2 = poisonerAt('h2b2-reapply-p2', 2, 3)
export const T3 = poisonerAt('h2b2-reapply-p3', 3, 4)
export const T4 = poisonerAt('h2b2-reapply-p4', 5, 1)

export const playerParty = makeParty('player', [
  { id: 'p1', attack: 30, speed: 40, scriptId: 'always-wait', innateTraitIds: [T1.id] },
  { id: 'p2', attack: 50, speed: 35, scriptId: 'always-wait', innateTraitIds: [T2.id] },
  { id: 'p3', attack: 20, speed: 30, scriptId: 'always-wait', innateTraitIds: [T3.id] },
  { id: 'p4', attack: 50, speed: 25, scriptId: 'always-wait', innateTraitIds: [T4.id] },
])
export const enemyParty = makeParty('enemy', [
  { id: 'e', health: 1000, defence: 0, speed: 5, scriptId: 'always-wait' },
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map(
  [T1, T2, T3, T4].map((t) => [t.id, t]),
)
export const statuses = STATUS_REGISTRY

type Id = typeof E
const turn = (who: Id, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]
const waited = (who: Id): CombatEvent => ({ type: 'Waited', creatureId: who })
const apply = (who: Id, trait: Trait, duration: number): CombatEvent[] => [
  { type: 'TriggerFired', sourceId: who, hook: 'on-turn-start', effectId: trait.id },
  { type: 'StatusApplied', targetId: E, statusId: 'poison', duration, sourceId: who },
]
const tick = (source: Id, damage: number, remainingHp: number): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: source,
  targetId: E,
  rawDamage: damage,
  finalDamage: damage,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId: 'poison',
})
const round = (n: number): CombatEvent => ({ type: 'RoundStarted', round: n })

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  round(1),
  ...turn(P1, ...apply(P1, T1, 2), waited(P1)),
  ...turn(P2, waited(P2)),
  ...turn(P3, waited(P3)),
  ...turn(P4, waited(P4)),
  ...turn(E, waited(E), tick(P1, 6, 994)),
  round(2),
  ...turn(P1, waited(P1)),
  ...turn(P2, ...apply(P2, T2, 3), waited(P2)),
  ...turn(P3, waited(P3)),
  ...turn(P4, waited(P4)),
  ...turn(E, waited(E), tick(P2, 10, 984)),
  round(3),
  ...turn(P1, waited(P1)),
  ...turn(P2, waited(P2)),
  ...turn(P3, ...apply(P3, T3, 4), waited(P3)),
  ...turn(P4, waited(P4)),
  ...turn(E, waited(E), tick(P2, 10, 974)),
  round(4),
  ...turn(P1, waited(P1)),
  ...turn(P2, waited(P2)),
  ...turn(P3, waited(P3)),
  ...turn(P4, waited(P4)),
  ...turn(E, waited(E), tick(P2, 10, 964)),
  round(5),
  ...turn(P1, waited(P1)),
  ...turn(P2, waited(P2)),
  ...turn(P3, waited(P3)),
  ...turn(P4, ...apply(P4, T4, 1), waited(P4)),
  ...turn(E, waited(E), tick(P2, 10, 954), {
    type: 'StatusExpired',
    creatureId: E,
    statusId: 'poison',
  }),
]

export const expectedResult: FightResult | null = null
