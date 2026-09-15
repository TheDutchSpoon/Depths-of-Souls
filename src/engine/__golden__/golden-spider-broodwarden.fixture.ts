// Golden: Spiders' Broodwarden (data/traits.ts's SPIDER_BROODWARDEN_TRAIT) -- a "payoff of the
// payoff" that never applies Web itself, only reads how many enemies are CURRENTLY Webbed. Proves
// the on-attack bonus hit fires as a genuinely SEPARATE DamageDealt (not folded into the main
// hit's own number) and that its power scales with the LIVE Webbed-enemy count (2 Webbed enemies
// here, not 1, to prove the multiplication, not just presence/absence).
//
// Web is set up via a FIXTURE-ONLY second trait on Broodwarden herself (`WEB_SETUP_FIXTURE`,
// on-fight-start -> apply-status(all-enemies, web)) -- a real `applyStatus` call, not a raw
// activeEffects preset (createCombat's own fight-start step recomputes activeEffects from
// innateTraitIds, so a raw preset would be silently wiped before round 1 even starts). Broodwarden's
// OWN real trait (SPIDER_BROODWARDEN_TRAIT) is exercised unmodified; only the SETUP is
// fixture-authored, the same "real mechanism, fixture-scoped setup" split the project's other
// goldens use.
//
// Because Web is now genuinely applied (not preset), it carries its real breakChancePercent (10)
// -- rollWebBreakFree (Slice E2) rolls once per Web-bearer at EVERY creature's turn-start,
// including Broodwarden's own (the very next turn after fight-start). SEED 2's mulberry32
// sequence: draw #1 (TARGET's roll) = 0.7343, draw #2 (OTHERFOE's roll) = 0.3250 -- both >= 0.10,
// so neither breaks, verified via an independent `node -e` trace of the exact rng.ts algorithm.
//
// Hand-derived (independent `node -e` calculator). All vitality -> neutral affinity x1.0.
// BROODWARDEN attacks TARGET (lowest-HP enemy, health 30, defence 0); OTHERFOE (health 1000,
// never chosen) stays alive and Webbed throughout, keeping the count at 2 for the whole hit.
//
//   Bonus hit first (on-attack fires BEFORE the main hit): off = 20(attack) * spellPower
//     (0.25 base * 2 count = 0.5) = 10, def 0 -> core 10, chip 0.01*10=0.1 -> raw 10.1 -> final 10.
//     TARGET 30 - 10 -> 20.
//   Main hit (off 20, def 0): core 20, chip 0.2 -> raw 20.2 -> final 20. TARGET 20 - 20 -> 0 ->
//     dies. OTHERFOE (1000 HP) survives, so the fight is NOT over (state.result stays null).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { SPIDER_BROODWARDEN_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import { STATUS_REGISTRY } from '../../data/statuses'
import type { CombatEvent } from '../types'
import type { Trait } from '../effect-types'

export const SEED = 2 // Consumes exactly two RNG draws (Web's own break-free roll against TARGET
// then OTHERFOE, at Broodwarden's turn-start) -- see the header comment above for the trace.

const BROODWARDEN = createCreatureId('broodwarden')
const TARGET = createCreatureId('target')
const OTHERFOE = createCreatureId('otherfoe')

/** Fixture-only setup trait: Webs both enemies at fight-start so Broodwarden's own (real)
 * on-attack bonus has a live count to read. Never part of the shipped registry. */
export const WEB_SETUP_FIXTURE: Trait = {
  id: 'web-setup-fixture',
  name: 'Web Setup (fixture)',
  effects: [
    {
      category: 'triggered',
      hook: 'on-fight-start',
      response: {
        kind: 'apply-status',
        target: { kind: 'all-enemies' },
        status: { statusId: 'web', duration: 3 },
      },
    },
  ],
}

export const playerParty = makeParty('player', [
  {
    id: 'broodwarden',
    attack: 20,
    defence: 0,
    speed: 20,
    affinity: 'vitality',
    scriptId: 'always-attack',
    innateTraitIds: [SPIDER_BROODWARDEN_TRAIT.id, WEB_SETUP_FIXTURE.id],
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
  [WEB_SETUP_FIXTURE.id, WEB_SETUP_FIXTURE],
])
export const statuses = STATUS_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  {
    type: 'TriggerFired',
    sourceId: BROODWARDEN,
    hook: 'on-fight-start',
    effectId: WEB_SETUP_FIXTURE.id,
  },
  {
    type: 'StatusApplied',
    targetId: TARGET,
    statusId: 'web',
    stacks: 1,
    duration: 3,
    sourceId: BROODWARDEN,
  },
  {
    type: 'StatusApplied',
    targetId: OTHERFOE,
    statusId: 'web',
    stacks: 1,
    duration: 3,
    sourceId: BROODWARDEN,
  },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: BROODWARDEN },
  // rollWebBreakFree's two draws (TARGET then OTHERFOE) both fail -- see header trace.
  { type: 'AttackDeclared', attackerId: BROODWARDEN, targetId: TARGET },
  {
    type: 'TriggerFired',
    sourceId: BROODWARDEN,
    hook: 'on-attack',
    effectId: SPIDER_BROODWARDEN_TRAIT.id,
  },
  {
    type: 'DamageDealt',
    sourceId: BROODWARDEN,
    targetId: TARGET,
    rawDamage: 10.1,
    finalDamage: 10,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 20,
    damageSource: 'attack',
    statusId: undefined,
  },
  {
    type: 'DamageDealt',
    sourceId: BROODWARDEN,
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
  { type: 'TurnEnded', creatureId: BROODWARDEN },
]
