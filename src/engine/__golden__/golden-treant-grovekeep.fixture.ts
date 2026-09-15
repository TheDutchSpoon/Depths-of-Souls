// Golden: Treants' Grovekeep (data/traits.ts's TREANT_GROVEKEEP_TRAIT) -- a one-time, team-wide
// max-Health raise at fight-start, distinct from Sapling's self-only round-over-round growth and
// Elder's single-ally heal. Proves it lands on every living ally (GROVEKEEP included) and fires
// exactly ONCE (on-fight-start, not on-round-end/on-turn-start -- no accidental re-fire risk to
// prove against structurally, so a single resolveTurn call covering FightStarted -> on-fight-start
// -> RoundStarted -> the first turn is the whole proof).
//
// Hand-derived (independent `node -e` calculator: 20*1.15=23 exactly). Nobody attacks (always-wait
// throughout) -- isolates the buff mechanic from damage-formula arithmetic.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY, TREANT_GROVEKEEP_TRAIT } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 4004 // No RNG consumed anywhere in this fixture.

const GROVEKEEP = createCreatureId('grovekeep')
const ALLY = createCreatureId('ally')

export const playerParty = makeParty('player', [
  {
    id: 'grovekeep',
    health: 20,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-wait',
    innateTraitIds: [TREANT_GROVEKEEP_TRAIT.id],
  },
  {
    id: 'ally',
    health: 20,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, affinity: 'vitality', scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: GROVEKEEP,
    hook: 'on-fight-start',
    effectId: TREANT_GROVEKEEP_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GROVEKEEP,
    targetId: GROVEKEEP,
    stat: 'health',
    factor: 1.15,
    effectiveBefore: 20,
    effectiveAfter: 23,
  },
  {
    type: 'StatModifierApplied',
    sourceId: GROVEKEEP,
    targetId: ALLY,
    stat: 'health',
    factor: 1.15,
    effectiveBefore: 20,
    effectiveAfter: 23,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: GROVEKEEP },
  { type: 'Waited', creatureId: GROVEKEEP },
  { type: 'TurnEnded', creatureId: GROVEKEEP },
]
