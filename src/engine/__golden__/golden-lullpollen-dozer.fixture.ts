// Golden: Lullpollen's Dozer (data/traits.ts's LULLPOLLEN_DOZER_TRAIT) -- the exact same
// "payoff of the payoff" shape as Spiders' Broodwarden, mirrored for Sleep instead of Web: never
// puts anything to Sleep itself, only reads how many enemies are CURRENTLY Sleeping. Proves the
// on-attack bonus hit fires as a genuinely separate DamageDealt and scales with the LIVE
// Sleeping-enemy count (2 Sleeping enemies here, not 1, to prove the multiplication).
//
// Sleep is set up via a FIXTURE-ONLY second trait on Dozer herself (`SLEEP_SETUP_FIXTURE`,
// on-fight-start -> apply-status(all-enemies, sleep)) -- same reasoning as Broodwarden's own
// golden (createCombat recomputes activeEffects from innateTraitIds at fight-start, so a raw
// activeEffects preset would be silently wiped). Unlike Web, Sleep (`condition-status`) is never
// scanned by rollWebBreakFree, so this fixture draws ZERO RNG anywhere -- the seed is inert.
//
// Hand-derived (independent `node -e` calculator, identical arithmetic to Broodwarden's own
// golden -- same stats, same 0.25 base/2-count shape). All vitality -> neutral affinity x1.0.
//
//   Bonus hit first: off = 20(attack) * spellPower (0.25 base * 2 count = 0.5) = 10, def 0 ->
//     core 10, chip 0.1 -> raw 10.1 -> final 10. TARGET 30 - 10 -> 20.
//   Main hit: off 20, def 0 -> core 20, chip 0.2 -> raw 20.2 -> final 20. TARGET 20 - 20 -> 0 ->
//     dies. OTHERFOE (1000 HP) survives, so the fight is NOT over.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { LULLPOLLEN_DOZER_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 9009 // No RNG consumed anywhere in this fixture (Sleep is never scanned by
// rollWebBreakFree, and nothing else here draws).

const DOZER = createCreatureId('dozer')
const TARGET = createCreatureId('target')
const OTHERFOE = createCreatureId('otherfoe')

/** Fixture-only setup trait: Sleeps both enemies at fight-start so Dozer's own (real) on-attack
 * bonus has a live count to read. Never part of the shipped registry. */
export const SLEEP_SETUP_FIXTURE: Trait = {
  id: 'sleep-setup-fixture',
  name: 'Sleep Setup (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'sleep', duration: 3 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'dozer',
    attack: 20,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: [LULLPOLLEN_DOZER_TRAIT.id, SLEEP_SETUP_FIXTURE.id],
  },
])

export const enemyParty = makeParty('enemy', [
  {
    id: 'target',
    health: 30,
    defence: 0,
    speed: 10,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
  {
    id: 'otherfoe',
    health: 1000,
    defence: 0,
    speed: 5,
    affinity: 'vitality',
    scriptId: 'always-wait',
  },
])

export const scripts = STOCK_SCRIPTS_BY_ID
export const traits: ReadonlyMap<string, Trait> = new Map([
  ...TRAIT_REGISTRY,
  [SLEEP_SETUP_FIXTURE.id, SLEEP_SETUP_FIXTURE],
])
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: DOZER,
    hook: 'on-fight-start',
    effectId: SLEEP_SETUP_FIXTURE.id,
  },
  {
    type: 'StatusApplied',
    targetId: TARGET,
    statusId: 'sleep',
    stacks: 1,
    duration: 3,
    sourceId: DOZER,
  },
  {
    type: 'StatusApplied',
    targetId: OTHERFOE,
    statusId: 'sleep',
    stacks: 1,
    duration: 3,
    sourceId: DOZER,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: DOZER },
  { type: 'AttackDeclared', attackerId: DOZER, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: DOZER,
    hook: 'on-attack',
    effectId: LULLPOLLEN_DOZER_TRAIT.id,
  },
  {
    type: 'DamageDealt',
    sourceId: DOZER,
    targetId: TARGET,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'attack',
    statusId: undefined,
  },
  // The bonus hit itself is real damage -> Sleep's own on-damage-taken -> remove-status(self)
  // wakes TARGET right here, BEFORE the main hit lands (Sleep breaks on ANY damage taken, not
  // just the "killing" hit) -- this does not retroactively change the bonus hit's own magnitude
  // (already resolved), and Dozer's kit has no separate "+% dmg vs Sleeping" bonus on the main
  // hit to lose (that was Reaper's job alone, deliberately not Dozer's).
  { type: 'TriggerFired', sourceId: TARGET, hook: 'on-damage-taken', effectId: 'sleep' },
  { type: 'StatusExpired', creatureId: TARGET, statusId: 'sleep' },
  {
    type: 'DamageDealt',
    sourceId: DOZER,
    targetId: TARGET,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 0,
    damageSource: 'attack',
    statusId: undefined,
  },
  { type: 'CreatureDied', creatureId: TARGET },
  { type: 'TurnEnded', creatureId: DOZER },
]
