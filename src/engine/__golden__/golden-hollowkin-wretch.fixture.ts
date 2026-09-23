// Golden: Rotcap Hollow's Hollowkin Wretch (species-locked.md's "Puppet" mechanic) -- the real,
// shipped `HOLLOWKIN_WRETCH_TRAIT` retaliates against whoever strikes it by confusing them,
// proving Confusion's real data (data/statuses.ts's CONFUSION -- a `friendly-fire-status` built
// in Slice C, given its first real producer here) applies correctly end to end against real
// content. The redirect ROLL itself (the 50%/harmful-action friendly-fire mechanism) is already
// covered generically against fixture content in confusion.test.ts (Slice C) -- this golden
// exercises the APPLICATION chain (on-damage-taken -> triggering-source -> apply-status), not a
// re-proof of the roll.
//
// Hand-derived (independent `node -e` calculator, verified via Bash). ATTACKER (speed 20) acts
// before WRETCH (speed 14, always-wait, never reached in 1 step). Violence-vs-Endurance is
// neutral (neither is the other's next-in-cycle per CLAUDE.md's
// vitality>violence>wit>endurance>instinct>vitality) -- x1.0, no complication. No random
// selectors anywhere in this scenario -- SEED is inert.
//
//   ATTACKER->WRETCH (off 20, def 20): core = max(20-20,0) = 0 (chip-only). chip = 0.01*20 =
//     0.2. raw = 0.2 -> final = MAX(1, floor(0.2)) = 1 (the unconditional min-1 floor).
//     WRETCH 20 - 1 = 19, survives.
//   WRETCH survived -> on-damage-taken fires: Madness Touch applies Confusion to
//     triggering-source (ATTACKER, the one who just hit it).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { HOLLOWKIN_WRETCH_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'

export const SEED = 2121 // No RNG consumed anywhere in this fixture; seed is inert.

export const ATTACKER = createCreatureId('attacker')
export const WRETCH = createCreatureId('hollowkin-wretch')

export const playerParty = makeParty('player', [
  {
    id: 'attacker',
    attack: 20,
    defence: 10,
    speed: 20,
    affinity: 'violence',
    scriptId: 'always-attack',
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'hollowkin-wretch',
    health: 20,
    attack: 14,
    intelligence: 12,
    defence: 20,
    speed: 14,
    affinity: 'endurance',
    scriptId: 'always-wait',
    innateTraitIds: [HOLLOWKIN_WRETCH_TRAIT.id],
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY
export const statuses = STATUS_REGISTRY

export const TURN_STEPS = 1 // ATTACKER's turn only -- WRETCH is never reached.

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: ATTACKER },
  { type: 'AttackDeclared', attackerId: ATTACKER, targetId: WRETCH },
  {
    type: 'DamageDealt',
    sourceId: ATTACKER,
    targetId: WRETCH,
    rawDamage: 0.2,
    finalDamage: 1,
    affinityMultiplier: 1,
    wasChipOnly: true,
    remainingHp: 19,
    damageSource: 'attack',
    statusId: undefined,
  },
  {
    type: 'TriggerFired',
    sourceId: WRETCH,
    hook: 'on-damage-taken',
    effectId: HOLLOWKIN_WRETCH_TRAIT.id,
  },
  {
    type: 'StatusApplied',
    targetId: ATTACKER,
    statusId: 'confusion',
    stacks: 1,
    duration: 3,
    sourceId: WRETCH,
  },
  { type: 'TurnEnded', creatureId: ATTACKER },
]
