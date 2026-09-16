// Golden: the Leech Sovereign, Glimmerdark's floor-20 boss (species-locked.md) -- "every hit
// steals a stat (permanent -you/+it, same as Sparkeaters); you hollow out over time" -- against
// REAL shipped content (data/species/glimmerdark.ts's real LEECH_SOVEREIGN_TRAIT). Proves the
// snowball across TWO hits: each attack both shrinks the target's Attack and grows the
// Sovereign's own, and both effects COMPOUND (fresh StatModifierEffects appended each firing,
// folding multiplicatively, never a refreshed single instance) -- so the second hit already
// lands harder than the first purely from the first hit's own steal.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). Instinct-vs-Wit is
// non-adjacent on the affinity cycle -> neutral (x1.0) throughout. SOVEREIGN (speed 22) acts
// before TARGET (speed 1, always-wait) each round.
//
//   Round 1: on-attack fires both halves of Vital Siphon before the hit lands -- TARGET's Attack
//     15 -> 12 (x0.8), SOVEREIGN's own Attack 26 -> 31.2 (x1.2). The hit itself then reads
//     SOVEREIGN's NOW-buffed Attack: off 31.2, def 0: core 31.2, chip 0.312 -> raw 31.512 ->
//     final 31. TARGET 100-31=69.
//   Round 2: the SAME two modifiers fire again, COMPOUNDING onto the round-1 fold -- TARGET's
//     Attack 12 -> 9.600000000000001 (x0.8 again, float-imprecise at full precision, per the
//     harness's own precision), SOVEREIGN's Attack 31.2 -> 37.44 (x1.2 again). The hit: off
//     37.44, def 0: core 37.44, chip 0.3744 -> raw 37.8144 -> final 37. TARGET 69-37=32, alive.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { LEECH_SOVEREIGN_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 8008 // No RNG consumed anywhere in this fixture; seed is inert.

const SOVEREIGN = createCreatureId('leech-sovereign')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'target',
    attack: 15,
    health: 100,
    defence: 0,
    speed: 1,
    affinity: 'wit',
    scriptId: 'always-wait',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'leech-sovereign',
    attack: 26,
    defence: 20,
    speed: 22,
    affinity: 'instinct',
    scriptId: 'always-attack',
    innateTraitIds: [LEECH_SOVEREIGN_TRAIT.id],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

// SOVEREIGN (r1), TARGET (r1, waits), SOVEREIGN (r2).
export const TURN_STEPS = 3

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: SOVEREIGN },
  { type: 'AttackDeclared', attackerId: SOVEREIGN, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-attack',
    effectId: LEECH_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: TARGET,
    stat: 'attack',
    factor: 0.8,
    effectiveBefore: 15,
    effectiveAfter: 12,
  },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-attack',
    effectId: LEECH_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: SOVEREIGN,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 26,
    effectiveAfter: 31.2,
  },
  {
    type: 'DamageDealt',
    sourceId: SOVEREIGN,
    targetId: TARGET,
    rawDamage: 31.512,
    finalDamage: 31,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 69,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: SOVEREIGN },
  { type: 'TurnStarted', creatureId: TARGET },
  { type: 'Waited', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: TARGET },
  { type: 'RoundStarted', round: 2 },
  { type: 'TurnStarted', creatureId: SOVEREIGN },
  { type: 'AttackDeclared', attackerId: SOVEREIGN, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-attack',
    effectId: LEECH_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: TARGET,
    stat: 'attack',
    factor: 0.8,
    effectiveBefore: 12,
    effectiveAfter: 9.600000000000001,
  },
  {
    type: 'TriggerFired',
    sourceId: SOVEREIGN,
    hook: 'on-attack',
    effectId: LEECH_SOVEREIGN_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: SOVEREIGN,
    targetId: SOVEREIGN,
    stat: 'attack',
    factor: 1.2,
    effectiveBefore: 31.2,
    effectiveAfter: 37.44,
  },
  {
    type: 'DamageDealt',
    sourceId: SOVEREIGN,
    targetId: TARGET,
    rawDamage: 37.8144,
    finalDamage: 37,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 32,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: SOVEREIGN },
]
