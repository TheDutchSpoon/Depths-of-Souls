// Golden: Glimmerdark's Sparkeater Voidmaw (PR #60 review, C3) -- a max-HP parasite that feeds
// the whole team, superseding the initial submission's "steal Attack+Defence" (a diluted copy of
// Leech/Gorger, not a distinct mechanic). Against REAL shipped content (data/species/
// glimmerdark.ts's real SPARKEATER_VOIDMAW_TRAIT). Proves both halves of the asymmetry the
// review called out: stealing the TARGET's max HP also clamps its CURRENT hp down
// (resolution.ts's post-stat-modifier clamp, HpClamped event) -- it bites now; raising every
// living ALLY's max HP (including Voidmaw itself) only raises the ceiling, no auto-heal (no
// HpClamped/HealApplied for a RISE) -- it grows the team's pools over time.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). Both vitality -> neutral
// (x1.0, same-affinity). Single creature per side, so `all-allies` resolves to [VOIDMAW] alone.
//
//   on-attack fires before the base hit lands: TARGET's max Health 50 -> 45 (x0.9); TARGET was
//     at full HP (currentHp 50), so the clamp fires: HpClamped(previousHp 50, newHp 45,
//     effectiveMaxHealth 45). VOIDMAW's own max Health 20 -> 21 (x1.05, all-allies incl. self) --
//     currentHp (20, already full) is untouched, no clamp event (a RISE never triggers one).
//   Base attack (off 20, unaffected by either modifier -- neither touches Attack): def 0: core
//     20, chip 0.2 -> raw 20.2 -> final 20. TARGET 45 (post-clamp) - 20 = 25, survives.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SPARKEATER_VOIDMAW_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 9029 // No RNG consumed anywhere in this fixture; seed is inert.

const VOIDMAW = createCreatureId('sparkeater-voidmaw')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'sparkeater-voidmaw',
    health: 20,
    attack: 20,
    defence: 12,
    speed: 18,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: [SPARKEATER_VOIDMAW_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 50,
    defence: 0,
    speed: 1,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: VOIDMAW },
  { type: 'AttackDeclared', attackerId: VOIDMAW, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: VOIDMAW,
    hook: 'on-attack',
    effectId: SPARKEATER_VOIDMAW_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: VOIDMAW,
    targetId: TARGET,
    stat: 'health',
    factor: 0.9,
    effectiveBefore: 50,
    effectiveAfter: 45,
  },
  {
    type: 'HpClamped',
    creatureId: TARGET,
    previousHp: 50,
    newHp: 45,
    effectiveMaxHealth: 45,
  },
  {
    type: 'TriggerFired',
    sourceId: VOIDMAW,
    hook: 'on-attack',
    effectId: SPARKEATER_VOIDMAW_TRAIT.id,
  },
  {
    type: 'StatModifierApplied',
    sourceId: VOIDMAW,
    targetId: VOIDMAW,
    stat: 'health',
    factor: 1.05,
    effectiveBefore: 20,
    effectiveAfter: 21,
  },
  {
    type: 'DamageDealt',
    sourceId: VOIDMAW,
    targetId: TARGET,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 25,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: VOIDMAW },
]
