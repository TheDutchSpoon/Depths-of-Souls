// Golden: PR #64 review fix 6 -- Sporch Cinderlord's real `on-kill` trait writes `stacks: 1`
// explicitly in its `apply-status` StatusSpec (rather than relying on the default, also 1) --
// pins Burn's own stacking/cap/duration-refresh behavior against real content: a fresh target
// ends at 1 stack, a target already carrying stacks stacks further up to Burn's own cap (3),
// with duration refreshed to the full 3 either way.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). CINDERLORD (real Sporch
// Cinderlord base stats, speed 16) acts before VICTIM/ENEMY_A/ENEMY_B (speeds 5/4/3, all
// always-wait, never reached in 1 step). Violence-vs-Violence is always neutral (same affinity)
// -- x1.0, no complication. No random selectors anywhere -- SEED is inert.
//
//   CINDERLORD->VICTIM (off 22, def 0): core = 22. chip = 0.01*22 = 0.22. raw = 22.22 -> final =
//     floor(22.22) = 22. VICTIM (wounded to 5 post-createCombat) 5 - 22 -> 0, dies.
//   on-kill fires Immolate: apply-status(all-enemies, burn, stacks:1) -- VICTIM is already dead
//     and excluded from all-enemies (livingEnemiesOf filters `.alive`), leaving ENEMY_A and
//     ENEMY_B (living-enemies-of-self order, i.e. slot order among the living):
//     ENEMY_A (no prior Burn): newStacks = min(cap 3, 0 + 1) = 1 -- StatusApplied(ENEMY_A, burn,
//       1 stack, duration 3).
//     ENEMY_B (pre-applied 2 Burn stacks at duration:1 -- deliberately NOT Burn's own default of
//       3, so the refresh below is actually VISIBLE -- before any turn resolves, into a throwaway
//       events array): newStacks = min(cap 3, 2 + 1) = 3 (the cap) -- StatusApplied(ENEMY_B, burn,
//       3 stacks, duration REFRESHED 1 -> 3, per applyStatus's own re-application rule (the NEW
//       application carries no explicit duration, so it inherits Burn's own defaultDuration: 3,
//       overwriting the pre-existing 1).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SPORCH_CINDERLORD_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 88 // No RNG consumed anywhere in this fixture; seed is inert.

export const CINDERLORD = createCreatureId('sporch-cinderlord')
export const VICTIM = createCreatureId('victim')
export const ENEMY_A = createCreatureId('enemy-a')
export const ENEMY_B = createCreatureId('enemy-b')

/** Applied post-createCombat by the test -- see the header comment above. */
export const VICTIM_STARTING_HP = 5

export const playerParty = makeParty('player', [
  {
    id: 'sporch-cinderlord',
    health: 18,
    attack: 22,
    intelligence: 12,
    defence: 16,
    speed: 16,
    affinity: 'violence',
    scriptId: 'always-attack',
    innateTraitIds: [SPORCH_CINDERLORD_TRAIT.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'victim',
    health: 50,
    defence: 0,
    speed: 5,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
  {
    id: 'enemy-a',
    health: 50,
    defence: 0,
    speed: 4,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
  {
    id: 'enemy-b',
    health: 50,
    defence: 0,
    speed: 3,
    affinity: 'violence',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // CINDERLORD's turn only -- VICTIM dies mid-attack.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CINDERLORD },
  { type: 'AttackDeclared', attackerId: CINDERLORD, targetId: VICTIM },
  {
    type: 'DamageDealt',
    sourceId: CINDERLORD,
    targetId: VICTIM,
    rawDamage: 22.22,
    finalDamage: 22,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: VICTIM },
  {
    type: 'TriggerFired',
    sourceId: CINDERLORD,
    hook: 'on-kill',
    effectId: SPORCH_CINDERLORD_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: ENEMY_A,
    statusId: 'burn',
    stacks: 1,
    duration: 3,
    sourceId: CINDERLORD,
  },
  {
    type: 'StatusApplied',
    targetId: ENEMY_B,
    statusId: 'burn',
    stacks: 3,
    duration: 3,
    sourceId: CINDERLORD,
  },
  { type: 'TurnEnded', creatureId: CINDERLORD },
]
