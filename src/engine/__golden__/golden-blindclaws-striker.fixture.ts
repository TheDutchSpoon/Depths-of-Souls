// Golden: Glimmerdark's Blindclaws signature combo (species-locked.md) -- Setter grants the
// team's hardest hitter the initiative (`grant-act-first`) -> Striker's real, shipped
// `conditional-damage-bonus` on `acted-before-target` (PR #60 review, C1/E1 -- superseding the
// initial submission's `ambush-strike` script, which wrongly put a creature's signature mechanic
// in the scripting layer). Real shipped content throughout (data/species/glimmerdark.ts's real
// BLINDCLAWS_SETTER_TRAIT/BLINDCLAWS_STRIKER_TRAIT, data/statuses.ts's real GRANT_ACT_FIRST),
// stats overridden via the fixture (same methodology as golden-spider-broodwarden -- a clean
// scenario, real trait objects) to force the round-1-negative / round-2-positive contrast into
// one small golden.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). All three creatures
// instinct-affinity -> always neutral (x1.0).
//
// Round 1 queue (no statuses yet, raw Speed desc): TARGET(15) -> SETTER(10) -> STRIKER(8).
//   TARGET Waits.
//   SETTER's on-turn-start grants act-first to the highest-attack ally among [Setter(18),
//     Striker(24)] -> STRIKER (24 > 18); SETTER then attacks TARGET (off 18, def 0): core 18,
//     chip 0.18 -> raw 18.18 -> final 18. TARGET 100-18=82.
//   STRIKER's turn: round 1's queue was already frozen BEFORE the grant landed, so STRIKER is
//     still queue-index 2, its target (TARGET, the only enemy) is index 0 -> acted-before-target
//     is FALSE -> no dealt-mod. off 24, def 0: core 24, chip 0.24 -> raw 24.24 -> final 24.
//     TARGET 82-24=58.
//
// Round 2 queue: STRIKER's grant-act-first (applied round 1, still active) puts it in the
// act-first pole alone; the normal pool (no turn-order-status) is TARGET(15)/SETTER(10) sorted
// desc. Queue: STRIKER -> TARGET -> SETTER.
//   STRIKER's turn: now queue-index 0 vs TARGET's index 1 -> acted-before-target is TRUE -> +35%
//     dealt (conditional-damage-bonus). off 24, def 0: core 24, chip 0.24 -> (24.24) x 1.35 ->
//     raw 32.724 -> final 32. TARGET 58-32=26, survives.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import {
  BLINDCLAWS_SETTER_TRAIT,
  BLINDCLAWS_STRIKER_TRAIT,
  TRAIT_REGISTRY,
} from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 5005 // No RNG consumed anywhere in this fixture; seed is inert.

const SETTER = createCreatureId('blindclaws-setter')
const STRIKER = createCreatureId('blindclaws-striker')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'blindclaws-setter',
    attack: 18,
    defence: 10,
    speed: 10,
    affinity: 'instinct',
    scriptId: 'always-attack',
    innateTraitIds: [BLINDCLAWS_SETTER_TRAIT.id],
  },
  {
    id: 'blindclaws-striker',
    attack: 24,
    defence: 10,
    speed: 8,
    affinity: 'instinct',
    scriptId: 'always-attack',
    innateTraitIds: [BLINDCLAWS_STRIKER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 0,
    speed: 15,
    affinity: 'instinct',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

// Round 1: TARGET, SETTER, STRIKER (no bonus). Round 2: STRIKER again (now first, +35% bonus).
export const TURN_STEPS = 4

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'TurnStarted', creatureId: SETTER },
  {
    type: 'TriggerFired',
    sourceId: SETTER,
    hook: 'on-turn-start',
    effectId: BLINDCLAWS_SETTER_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: STRIKER,
    statusId: 'grant-act-first',
    stacks: 1,
    duration: 3,
    sourceId: SETTER,
  },
  { type: 'AttackDeclared', attackerId: SETTER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: SETTER,
    targetId: TARGET,
    rawDamage: 18.18,
    finalDamage: 18,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 82,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: SETTER },
  { type: 'TurnStarted', creatureId: STRIKER },
  // acted-before-target is false this round (queue was frozen before the grant landed) -- no
  // conditional-damage-bonus contribution.
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: TARGET,
    rawDamage: 24.24,
    finalDamage: 24,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 58,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: STRIKER },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: STRIKER },
  // Now first in queue (grant-act-first, still active) -- acted-before-target is true -> +35%.
  { type: 'AttackDeclared', attackerId: STRIKER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: STRIKER,
    targetId: TARGET,
    rawDamage: 32.724,
    finalDamage: 32,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 26,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: STRIKER },
]
