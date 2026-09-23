// Golden: PR #64 review fix 4 -- a `deal-damage` response whose `magnitudeSource` resolves to
// exactly 0 is a FULL no-op (no DamageDealt, no downstream damage-path hooks), not a min-1-floor
// "hit for 1" the damage formula's own unconditional `MAX(1, floor(raw))` clamp would otherwise
// still produce even at 0 effective offense. Sporecloud Reaper's real `on-attack` bonus rider
// (Intelligence-scaled, magnitude a live count of Spored enemies) is the named example -- against
// an enemy with no Spore anywhere on the board, it must land NO bonus hit, just its ordinary
// attack.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). REAPER (real Sporecloud
// Reaper base stats, speed 20) acts before TARGET (speed 10, always-wait, never reached in 1
// step). Wit-vs-Wit is always neutral (same affinity) -- x1.0, no complication. No random
// selectors anywhere -- SEED is inert.
//
//   on-attack fires BEFORE the attack's own damage (CONVENTIONS): Bloomburst's bonus rider rolls
//     magnitudeSource count of enemies-with-status(spore) -> 0 (TARGET carries no Spore, and
//     nothing else on the board applies it in this fixture) -> fix 4: TriggerFired still fires
//     (fireHook emits it before executeResponse runs), but the response itself is a full no-op --
//     no DamageDealt for the bonus.
//   REAPER's own base attack (off 14, def 10): core = max(14-10,0) = 4. chip = 0.01*14 = 0.14.
//     raw = 4.14 -> final = floor(4.14) = 4. TARGET 100 - 4 = 96.
//   Exactly ONE DamageDealt in the whole turn: REAPER's own attack.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SPORECLOUD_REAPER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 55 // No RNG consumed anywhere in this fixture; seed is inert.

export const REAPER = createCreatureId('sporecloud-reaper')
export const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'sporecloud-reaper',
    health: 14,
    attack: 14,
    intelligence: 22,
    defence: 10,
    speed: 20,
    affinity: 'wit',
    scriptId: 'always-attack',
    innateTraitIds: [SPORECLOUD_REAPER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 10,
    speed: 10,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // REAPER's turn only -- TARGET is never reached.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: REAPER },
  { type: 'AttackDeclared', attackerId: REAPER, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: REAPER,
    hook: 'on-attack',
    effectId: SPORECLOUD_REAPER_TRAIT.id,
  },
  // No DamageDealt for the bonus rider -- magnitudeSource resolved to 0, a full no-op.
  {
    type: 'DamageDealt',
    sourceId: REAPER,
    targetId: TARGET,
    rawDamage: 4.14,
    finalDamage: 4,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 96,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: REAPER },
]
