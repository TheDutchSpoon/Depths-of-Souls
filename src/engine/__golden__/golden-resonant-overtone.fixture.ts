// Golden: Glimmerdark's Resonant Overtone (PR #60 review, E2) -- echo-cast, against REAL shipped
// content (data/species/glimmerdark.ts's real RESONANT_OVERTONE_TRAIT), at its real 10%
// chancePercent (not a fixture stand-in -- the mechanism's own dedup/depth-cap/self-re-entry edge
// cases are unit-tested directly against fireHook in resolution.test.ts's 'echo-cast' describe
// block, where a chancePercent:100 fixture is the right tool; THIS golden proves the real,
// shipped content actually fires end-to-end).
//
// Phase 4 interstitial slice (cumulative spell unlock): originally cast GLOWSPARK_BOLT
// (Glimmerdark, spellPower 1.0), since deleted as a near-dup of ARCANE_BOLT (Overgrowth, now
// inherited at every deeper biome -- see data/spells/glimmerdark.ts's own header comment).
// Retargeted to ARCANE_BOLT (same wit/single/damage shape) per design-owner call -- every damage
// number below is RECOMPUTED against the new spellPower, not preserved. Phase 4.1-H2c (ASSUMPTION
// 124) raised Arcane Bolt's spellPower from 0.5 to 1.0 and the numbers below were re-derived again.
//
// Hand-derived (independent `node -e` mulberry32 trace, verified via Bash -- SEED 7's exact
// sequence). Both wit -> neutral (x1.0, same-affinity). Party: CASTER (always-cast) + OVERTONE
// (the only observer) vs a single TARGET.
//
// CASTER's real cast triggers on-action-observed dispatch #1: OVERTONE's own chancePercent(10)
// roll is draw #1 = 0.0117 < 0.10 -> SUCCEEDS: TriggerFired, and (4.1-E) the response
// `perform-action(triggering-source)` only QUEUES the echo. The ORIGINAL cast's own damage lands
// first (TARGET 100 -> 80); then the grant runs as the CASTER: draw #2 = 0.0620 (gem index, only 1
// equipped -> slot 0 regardless of value), draw #3 = 0.9769 (target index, only 1 living enemy ->
// TARGET regardless of value) -- ActionGranted, then CASTER casts AGAIN (the echo), whose own
// on-action-observed dispatch #2 rolls OVERTONE AGAIN (the chain passes through the same
// Overtone): draw #4 = 0.6990 >= 0.10 -> FAILS, chain stops at exactly one echo. The echo's own
// damage then lands (TARGET 80 -> 60). Before 4.1-E the echo ran nested inside the original cast's
// pre-hit dispatch, so ITS damage came first; the draws and numbers are unchanged.
//
//   Both hits: off = Intelligence(20) x spellPower(1.0) = 20; vs def 0: core 20, chip 0.2 -> raw
//     20.2 -> final 20 (direct Cast; the fixture creatures are level 11, so no Additional).
//     TARGET 100 -20 (original) -20 (echo) = 60, survives. At 0.5 each hit would be 10 (80 left).

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { FIXTURE_SCRIPTS_BY_ID } from '../__fixtures__/scripts'
import { ARCANE_BOLT } from '../../data/spells'
import { RESONANT_OVERTONE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 7 // See the header trace above -- draw #1 < 10% (echo fires), draw #4 >= 10%
export const TURN_STEPS = 1
// (the echo's own re-observation fails to echo again).

const CASTER = createCreatureId('caster')
const OVERTONE = createCreatureId('overtone')
const TARGET = createCreatureId('target')

export const playerParty = makeParty('player', [
  {
    id: 'caster',
    intelligence: 20,
    defence: 10,
    speed: 20,
    affinity: 'wit',
    scriptId: 'always-cast',
    equippedSpells: [ARCANE_BOLT],
  },
  {
    id: 'overtone',
    defence: 10,
    speed: 15,
    affinity: 'wit',
    scriptId: 'always-wait',
    innateTraitIds: [RESONANT_OVERTONE_TRAIT.id],
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

export const scripts = FIXTURE_SCRIPTS_BY_ID
export const traits = TRAIT_REGISTRY

export const expectedEvents: CombatEvent[] = [
  { type: 'FightStarted' },
  { type: 'RoundStarted', round: 1 },
  { type: 'TurnStarted', creatureId: CASTER },
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: TARGET,
  },
  {
    type: 'TriggerFired',
    sourceId: OVERTONE,
    hook: 'on-action-observed',
    effectId: RESONANT_OVERTONE_TRAIT.id,
  },
  // The ORIGINAL cast's own damage lands first -- the echo is only queued by the trigger above.
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: TARGET,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 80,
    damageSource: 'cast',
  },
  // The queued grant runs (draws #2, #3) and is accepted.
  {
    type: 'ActionGranted',
    sourceId: OVERTONE,
    actorId: CASTER,
    effectId: RESONANT_OVERTONE_TRAIT.id,
  },
  // The echo's own SpellCast -- its on-action-observed dispatch rolls again and fails
  // (draw #4 >= 10%), so no further TriggerFired/ActionGranted appears.
  {
    type: 'SpellCast',
    targetShape: 'single',
    casterId: CASTER,
    gemSlot: 0,
    targetId: TARGET,
  },
  {
    type: 'DamageDealt',
    sourceId: CASTER,
    targetId: TARGET,
    rawDamage: 20.2,
    finalDamage: 20,
    affinityMultiplier: 1,
    wasChipOnly: false,
    remainingHp: 60,
    damageSource: 'cast',
  },
  { type: 'TurnEnded', creatureId: CASTER },
]
