// Golden: Glimmerdark's Gloomjaw Ravager (PR #60 review, C4) -- armor-penetration IS its whole
// identity now (superseding the initial submission's "biggest execute bonus + armor-pen" combo,
// which was still numerically anchored to Stalker/Executioner's own conditional-damage-bonus
// verb): unconditionally ignores 30% of every target's Defence, against REAL shipped content
// (data/species/glimmerdark.ts's real GLOOMJAW_RAVAGER_TRAIT). A single hit against a
// non-trivial Defence value, proving the formula actually reduces the DEFENCE fed into the
// subtractive core (not a dealt-pool bonus) -- TARGET is at full HP (well above any execute
// threshold), so a conditional-damage-bonus alone would contribute nothing here; this hit's
// power comes entirely from armor-pen.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). Both violence -> neutral
// (x1.0, same-affinity).
//
//   RAVAGER->TARGET: effective Defence for the core = 20 x (1 - 0.3) = 14 (armor-penetration
//     applied before the subtractive core, per CONVENTIONS). off 26: core max(26-14,0)=12, chip
//     0.26 -> raw 12.26 -> final 12. TARGET 100-12=88, survives. (Without armor-pen this would
//     have been core max(26-20,0)=6, chip 0.26, raw 6.26, final 6 -- less than half.)

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { GLOOMJAW_RAVAGER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 9019 // No RNG consumed anywhere in this fixture; seed is inert.

const RAVAGER = createCreatureId('gloomjaw-ravager')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'gloomjaw-ravager',
    attack: 26,
    defence: 14,
    speed: 18,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [GLOOMJAW_RAVAGER_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 100,
    defence: 20,
    speed: 1,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: RAVAGER },
  { type: 'AttackDeclared', attackerId: RAVAGER, targetId: TARGET },
  {
    type: 'DamageDealt',
    sourceId: RAVAGER,
    targetId: TARGET,
    rawDamage: 12.26,
    finalDamage: 12,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 88,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'TurnEnded', creatureId: RAVAGER },
]
