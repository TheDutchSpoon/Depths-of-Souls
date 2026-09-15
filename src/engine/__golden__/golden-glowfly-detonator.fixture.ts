// Golden: Glimmerdark's Glowflies signature combo (species-locked.md) -- Charger charges the
// team's hardest hitter with Glow -> Detonator's real, shipped consume-stacks (`GLOWFLY_
// DETONATOR_TRAIT`) reads and bursts it, end to end through REAL shipped content (data/species/
// glimmerdark.ts's real base stats via data/traits/glimmerdark.ts's real traits + data/
// statuses.ts's real GLOW), not a fixture stand-in -- matching the Slice H1 web-exploit golden's
// own precedent.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). CHARGER (speed 22) acts
// before DETONATOR (speed 20) before TARGET (speed 1, always-wait, never reached in 2 steps).
// Both attackers wit/instinct vs TARGET's wit affinity -- both neutral (x1.0): Wit-vs-Wit is
// always neutral (same affinity); Instinct-vs-Wit is non-adjacent on the cycle
// (vitality>violence>wit>endurance>instinct>vitality), so also neutral. No random selectors
// anywhere in this scenario (`highest-attack-ally`/`lowest-hp-enemy` are both deterministic
// extremum picks over a 2-member/1-member pool) -- SEED is inert.
//
//   CHARGER's on-turn-start: highest-attack-ally among [Charger(14), Detonator(16)] -> Detonator
//     (16 > 14) -- Glow applied, 1 stack, default duration 4.
//   CHARGER->TARGET (off 14, def 0): core 14, chip 0.14 -> raw 14.14 -> final 14. TARGET 100-14=86.
//   DETONATOR's on-attack fires before its own base hit: consume-stacks(glow) reads 1 stack (from
//     Charger), removes it (StatusExpired), then bursts: scalingStat 'intelligence' (22) x
//     spellPower (1.0 default x 1 consumed stack) = 22; vs def 0: core 22, chip 0.22 -> raw 22.22
//     -> final 22. TARGET 86-22=64.
//   DETONATOR's own base attack (off 16, def 0; Glow already consumed -> no dealt-mod contributes
//     to this hit either): core 16, chip 0.16 -> raw 16.16 -> final 16. TARGET 64-16=48, alive.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import {
  GLOWFLY_CHARGER_TRAIT,
  GLOWFLY_DETONATOR_TRAIT,
  TRAIT_REGISTRY,
} from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 4004 // No RNG consumed anywhere in this fixture; seed is inert.

const CHARGER = createCreatureId('glowfly-charger')
const DETONATOR = createCreatureId('glowfly-detonator')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'glowfly-charger',
    attack: 14,
    intelligence: 20,
    defence: 10,
    speed: 22,
    affinity: 'wit',
    scriptId: 'always-attack',
    innateTraitIds: [GLOWFLY_CHARGER_TRAIT.id],
  },
  {
    id: 'glowfly-detonator',
    attack: 16,
    intelligence: 22,
    defence: 10,
    speed: 20,
    affinity: 'instinct',
    scriptId: 'always-attack',
    innateTraitIds: [GLOWFLY_DETONATOR_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 0,
    speed: 1,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 2 // CHARGER's turn, then DETONATOR's -- TARGET never reached.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CHARGER },
  {
    type: 'TriggerFired',
    sourceId: CHARGER,
    hook: 'on-turn-start',
    effectId: GLOWFLY_CHARGER_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: DETONATOR,
    statusId: 'glow',
    stacks: 1,
    duration: 4,
    sourceId: CHARGER,
  },
  { type: 'AttackDeclared', attackerId: CHARGER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: CHARGER,
    targetId: TARGET,
    rawDamage: 14.14,
    finalDamage: 14,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 86,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: CHARGER },
  { type: 'TurnStarted', creatureId: DETONATOR },
  // Detonator's own on-turn-start is a no-op (its trait is on-attack-only) -- no event.
  { type: 'AttackDeclared', attackerId: DETONATOR, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: DETONATOR,
    hook: 'on-attack',
    effectId: GLOWFLY_DETONATOR_TRAIT.id,
  },
  { type: 'StatusExpired', creatureId: DETONATOR, statusId: 'glow' },
  {
    type: 'DamageDealt',
    sourceId: DETONATOR,
    targetId: TARGET,
    rawDamage: 22.22,
    finalDamage: 22,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 64,
    damageSource: 'attack',
  },
  {
    type: 'DamageDealt',
    sourceId: DETONATOR,
    targetId: TARGET,
    rawDamage: 16.16,
    finalDamage: 16,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 48,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: DETONATOR },
]
