// Golden: Swarmhive Queen's real shipped Hive Anchor trait (data/traits.ts's
// SWARMHIVE_QUEEN_TRAIT) -- the ONLY consumer of the `all-allies-of-species` ResponseTarget
// (effect-types.ts / resolution.ts). Proves, end to end through createCombat/resolveTurn against
// the REAL registered content: the buff lands on every living Swarmhive ally INCLUDING Queen
// herself, skips a same-side ally of a DIFFERENT species, skips the enemy side entirely (even a
// same-speciesId enemy), and COMPOUNDS across the rounds Queen acts (a fresh StatModifierEffect
// appended each firing, not a single refreshed one).
//
// Hand-derived (independent `node -e` calculator: 20*1.1=22 exactly; 22*1.1=24.200000000000003,
// a float, per getEffectiveStat's own sequential `value *= factor` fold). Nobody attacks in this
// fixture (every script is always-wait) -- the whole point is isolating the buff mechanic from
// any damage-formula arithmetic. QUEEN (speed 40) acts before HIVEMATE (30) before OUTSIDER (20)
// before FOE (10) every round.
//
// Driven via 5 explicit resolveTurn steps (QUEEN/HIVEMATE/OUTSIDER/FOE x round 1, then QUEEN's
// round-2 turn) -- NOT resolveFight: nobody ever takes damage, so the fight never naturally ends.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SWARMHIVE_QUEEN_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 3003 // No RNG consumed anywhere in this fixture (no Web, no random
// selectors, no chancePercent).

const QUEEN = createCreatureId('queen')
const HIVEMATE = createCreatureId('hive-mate')
const OUTSIDER = createCreatureId('outsider')
const FOE = createCreatureId('foe')

export const playerParty = makeParty('player', [
  {
    id: 'queen',
    attack: 20,
    speed: 40,
    affinity: 'violence',
    scriptId: 'always-wait',
    innateTraitIds: [SWARMHIVE_QUEEN_TRAIT.id],
    speciesId: 'swarmhive',
  },
  {
    id: 'hive-mate',
    attack: 20,
    speed: 30,
    affinity: 'violence',
    scriptId: 'always-wait',
    speciesId: 'swarmhive',
  },
  {
    // A same-SIDE ally of a DIFFERENT species -- must never be touched by Queen's buff.
    id: 'outsider',
    attack: 20,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-wait',
    speciesId: 'treants',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    // Deliberately shares the SAME speciesId as Queen's own side -- proves the target set is
    // side-scoped (livingAlliesOf), not a bare speciesId match across both parties.
    id: 'foe',
    speed: 10,
    affinity: 'violence',
    scriptId: 'always-wait',
    speciesId: 'swarmhive',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const TURN_STEPS = 5 // round 1: QUEEN, HIVEMATE, OUTSIDER, FOE; round 2: QUEEN only.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: QUEEN },
  {
    type: 'TriggerFired',
    sourceId: QUEEN,
    hook: 'on-turn-start',
    effectId: SWARMHIVE_QUEEN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: QUEEN,
    targetId: QUEEN,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 20,
    effectiveAfter: 22,
  },
  {
    type: 'StatModifierApplied',
    sourceId: QUEEN,
    targetId: HIVEMATE,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 20,
    effectiveAfter: 22,
  },
  { type: 'Waited', creatureId: QUEEN },
  { type: 'TurnEnded', creatureId: QUEEN },
  { type: 'TurnStarted', creatureId: HIVEMATE },
  { type: 'Waited', creatureId: HIVEMATE },
  { type: 'TurnEnded', creatureId: HIVEMATE },
  { type: 'TurnStarted', creatureId: OUTSIDER },
  { type: 'Waited', creatureId: OUTSIDER },
  { type: 'TurnEnded', creatureId: OUTSIDER },
  { type: 'TurnStarted', creatureId: FOE },
  { type: 'Waited', creatureId: FOE },
  { type: 'TurnEnded', creatureId: FOE },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: QUEEN },
  {
    type: 'TriggerFired',
    sourceId: QUEEN,
    hook: 'on-turn-start',
    effectId: SWARMHIVE_QUEEN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: QUEEN,
    targetId: QUEEN,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 22,
    effectiveAfter: 24.200000000000003,
  },
  {
    type: 'StatModifierApplied',
    sourceId: QUEEN,
    targetId: HIVEMATE,
    stat: 'attack',
    factor: 1.1,
    effectiveBefore: 22,
    effectiveAfter: 24.200000000000003,
  },
  { type: 'Waited', creatureId: QUEEN },
  { type: 'TurnEnded', creatureId: QUEEN },
]
