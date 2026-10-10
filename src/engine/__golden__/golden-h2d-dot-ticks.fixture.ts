// Golden: one tick each of the real Poison, Burn and Spore (Phase 4.1-H2d, ASSUMPTION 152): Poison
// 40% of the applier's Attack, Burn 35% of its Intelligence, Spore 35% of its Speed. A content
// golden: its subject is the three statuses' numbers, on real data. The three statuses are applied in
// `setup` with the real `applyStatus` (source A, target the bearer), so each snapshot is computed from the real def (a
// hand-written snapshot would not fail at an old percentage). Each tick sits above the minimum of 1.
//
// Hand-derived (independent `node -e` calculator). Everyone is vitality (neutral x1.0), every
// fixture creature is level 11 (`DEFAULT_FIXTURE_LEVEL`), and no creature has any taken factor.
//   A (player; Attack 100, Intelligence 80, Speed 60, Defence 10) `always-wait`, acts first, and is
//     the APPLIER of all three statuses (duration 3, applied in `setup`, before any turn).
//   E1, E2, E3 (enemy; Health 1000, Defence 50, Speeds 3 / 2 / 1) `always-wait`, bearing Poison,
//     Burn and Spore respectively.
//
// Snapshots (potency = floor(applier's effective stat x percent / 100)):
//   Poison on E1: floor(100 x 40 / 100) = 40.   Burn on E2: floor(80 x 35 / 100) = 28.
//   Spore on E3: floor(60 x 35 / 100) = 21.
// A tick is INDIRECT damage at the bearer's turn end: MAX(1, floor(potency x affinity x 1 x 1 -
//   0.2 x Defence)), with the bearer's Defence 50 -> a term of 10, no chip, no dealt pool:
//   E1 Poison: 40 - 10 = 30, E1 1000 -> 970.   (At the old 20%: 20 - 10 = 10.)
//   E2 Burn:   28 - 10 = 18, E2 1000 -> 982.   (At the old 25%: floor(80 x 25 / 100) = 20 -> 10.)
//   E3 Spore:  21 - 10 = 11, E3 1000 -> 989.   (At the old 15%: floor(60 x 15 / 100) = 9 ->
//                                                MAX(1, floor(-1)) = 1.)
// Round 1: A waits; then E1, E2, E3 in Speed order each wait and tick at their own turn end. The
// statuses' countdowns (3 -> 2) emit nothing. TURN_STEPS = 4 (A, E1, E2, E3).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { STATUS_REGISTRY } from '../../data/statuses'
import { createResolutionContext } from '../actions'
import { applyStatus, newCascade } from '../resolution'
import type { CombatEvent, CombatState } from '../types'

export const SEED = 8402 // No RNG consumed; seed is inert.
export const TURN_STEPS = 4

export const A = createCreatureId('a')
export const E1 = createCreatureId('e1')
export const E2 = createCreatureId('e2')
export const E3 = createCreatureId('e3')

export const playerParty = makeParty('player', [
  {
    id: 'a',
    attack: 100,
    intelligence: 80,
    speed: 60,
    defence: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])
const bearer = (id: string, speed: number) => ({
  id,
  health: 1000,
  defence: 50,
  speed,
  affinity: 'vitality' as const,
  scriptId: 'always-wait',
})
export const enemyParty = makeParty('enemy', [
  bearer('e1', 3),
  bearer('e2', 2),
  bearer('e3', 1),
])

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const statuses = STATUS_REGISTRY

/** Applies the three REAL statuses from A, before any turn, into a throwaway events array. */
export const setup = (created: CombatState): CombatState => {
  let state = created
  for (const [target, statusId] of [
    [E1, 'poison'],
    [E2, 'burn'],
    [E3, 'spore'],
  ] as const) {
    state = applyStatus(
      A,
      target,
      { statusId, duration: 3 },
      state,
      createResolutionContext([], newCascade()),
    )
  }
  return state
}

const tick = (
  target: typeof E1,
  statusId: string,
  damage: number,
  remainingHp: number,
): CombatEvent => ({
  type: 'DamageDealt',
  sourceId: A,
  targetId: target,
  rawDamage: damage,
  finalDamage: damage,
  affinityMultiplier: 1,
  wasChipOnly: false,
  remainingHp,
  damageSource: 'dot',
  statusId,
})
const turn = (who: typeof E1, ...body: CombatEvent[]): CombatEvent[] => [
  { type: 'TurnStarted', creatureId: who },
  { type: 'Waited', creatureId: who },
  ...body,
  { type: 'TurnEnded', creatureId: who },
]

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  ...turn(A),
  ...turn(E1, tick(E1, 'poison', 30, 970)),
  ...turn(E2, tick(E2, 'burn', 18, 982)),
  ...turn(E3, tick(E3, 'spore', 11, 989)),
]
