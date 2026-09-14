// Golden: the Shieldbarer starter's real signature trait (data/species/starters.ts's
// SHIELDBARER_STARTER_TRAIT) -- "on-provoke -> your creatures gain +35% Defence" (team-wide).
// ASSUMPTION 22: authored as an apply-stat-modifier response targeted at the new `all-allies`
// ResponseTarget (not grant-action-state -- it's a stat buff, not an action-state flag).
//
// Hand-derived (independent `node -e` calculator; no damage formula involved, just
// getEffectiveStat's multiplicative fold). PROVOKER (defence 30) acts first (speed 20); ALLY
// (defence 20, speed 10) and FOE (speed 1, always-wait) never get a turn in this one-step trace
// -- driven via a single explicit `resolveTurn` call, per CONVENTIONS' precedent for goldens
// whose target never dies (golden-on-action-hooks).
//
//   PROVOKER's own effective Defence: 30 * 1.35 = 40.5.
//   ALLY's effective Defence (never provokes itself, buffed purely by "your creatures" being
//   team-wide, including a non-provoking ally): 20 * 1.35 = 27.
//   `all-allies` resolves via livingAlliesOf(PROVOKER) = [PROVOKER, ALLY] in slot order --
//   PROVOKER's own StatModifierApplied fires before ALLY's.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { TRAIT_REGISTRY } from '../../data/traits'
import { SHIELDBARER_STARTER_TRAIT } from '../../data/species/starters'
import type { CombatEvent } from '../types'

export const SEED = 4004 // No RNG consumed; seed is inert.

const PROVOKER = createCreatureId('provoker')
const ALLY = createCreatureId('ally')

export const playerParty = makeParty('player', [
  {
    id: 'provoker',
    defence: 30,
    speed: 20,
    affinity: 'endurance',
    scriptId: 'always-provoke',
    innateTraitIds: [SHIELDBARER_STARTER_TRAIT.id],
  },
  {
    id: 'ally',
    defence: 20,
    speed: 10,
    affinity: 'endurance',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  { id: 'foe', speed: 1, affinity: 'endurance', scriptId: 'always-wait' },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedFirstTurnEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: PROVOKER },
  { type: 'Provoked', creatureId: PROVOKER },
  {
    type: 'TriggerFired',
    sourceId: PROVOKER,
    hook: 'on-provoke',
    effectId: 'shieldbarer-starter-rally',
  },
  {
    type: 'StatModifierApplied',
    sourceId: PROVOKER,
    targetId: PROVOKER,
    stat: 'defence',
    factor: 1.35,
    effectiveBefore: 30,
    effectiveAfter: 40.5,
  },
  {
    type: 'StatModifierApplied',
    sourceId: PROVOKER,
    targetId: ALLY,
    stat: 'defence',
    factor: 1.35,
    effectiveBefore: 20,
    effectiveAfter: 27,
  },
  { type: 'TurnEnded', creatureId: PROVOKER },
]
