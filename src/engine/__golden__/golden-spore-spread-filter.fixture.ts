// Golden: Spore's spread-on-death filters OUT already-Spored allies before drawing, leaving a
// genuine multi-candidate pool to pick from (not the single-candidate degenerate case
// golden-spore-spread.fixture.ts and golden-spore-spread-dot-kill.fixture.ts both exercise,
// where the draw's OUTCOME is forced regardless of the RNG value).
//
// Hand-derived (independent `node -e` calculator, verified via Bash). BEARER itself is
// pre-applied Spore (its own on-death spread trigger only exists while it carries the status),
// and so is ALLY_SPORED -- both via a direct `applyStatus` call before any turn resolves, into a
// throwaway events array. BEARER's side has THREE living allies once it dies: ALLY_SPORED
// (already carries Spore) and ALLY_A/ALLY_B (both fresh). `random-ally-without-status` filters
// `livingAlliesOf(BEARER)` = [ALLY_SPORED, ALLY_A, ALLY_B] (slot order, BEARER itself excluded
// once dead) down to [ALLY_A, ALLY_B] (a real 2-candidate pool), then draws
// `Math.floor(state.rng.next() * 2)`.
//
// SEED 1's first (and only) draw in this fixture -- verified via an independent mulberry32
// replica, `node -e`, matching src/engine/rng.ts's own createSeededRng exactly -- is
// 0.6270739405881613, and floor(0.6270739405881613 * 2) = 1 -> ALLY_B (index 1 of the filtered
// pool), not the filtered pool's first entry -- proving the draw is a genuine index pick, not a
// degenerate always-index-0 case.
//
//   ATTACKER->BEARER (off 20, def 0): core = 20. chip = 0.01*20 = 0.2. raw = 20.2 -> final =
//     floor(20.2) = 20. BEARER (wounded to 10 post-createCombat) 10 - 20 -> 0, dies.
//   on-death fires Spore's spread trigger: TriggerFired(BEARER, on-death, spore) -> filtered pool
//     [ALLY_A, ALLY_B] -> draw index 1 -> StatusApplied(ALLY_B, spore, 1 stack, duration 3,
//     source BEARER). ALLY_SPORED (filtered out) and ALLY_A (not drawn) receive nothing.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 1 // Verified: first draw 0.6270739405881613 -> floor(x*2) = 1 -> ALLY_B.

export const ATTACKER = createCreatureId('attacker')
export const BEARER = createCreatureId('bearer')
export const ALLY_SPORED = createCreatureId('ally-spored')
export const ALLY_A = createCreatureId('ally-a')
export const ALLY_B = createCreatureId('ally-b')

/** Applied post-createCombat by the test -- see the header comment above. */
export const BEARER_STARTING_HP = 10

export const playerParty = makeParty('player', [
  { id: 'attacker', attack: 20, defence: 10, speed: 30, scriptId: 'always-attack' },
])

export const enemyParty = makeParty('enemy', [
  { id: 'bearer', health: 100, defence: 0, speed: 20, scriptId: 'always-wait' },
  { id: 'ally-spored', health: 50, defence: 0, speed: 5, scriptId: 'always-wait' },
  { id: 'ally-a', health: 50, defence: 0, speed: 4, scriptId: 'always-wait' },
  { id: 'ally-b', health: 50, defence: 0, speed: 3, scriptId: 'always-wait' },
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
  {
    type: 'StatusApplied',
    targetId: ALLY_B,
    statusId: 'spore',
    stacks: 1,
    duration: 3,
    sourceId: BEARER,
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
