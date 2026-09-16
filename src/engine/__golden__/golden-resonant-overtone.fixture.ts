// Golden: Glimmerdark's Resonant Overtone (PR #60 review, E2) -- echo-cast, against REAL shipped
// content (data/species/glimmerdark.ts's real RESONANT_OVERTONE_TRAIT, data/spells/glimmerdark.ts's
// real GLOWSPARK_BOLT), at its real 10% chancePercent (not a fixture stand-in -- the mechanism's
// own dedup/depth-cap/self-re-entry edge cases are unit-tested directly against fireHook in
// resolution.test.ts's 'echo-cast' describe block, where a chancePercent:100 fixture is the
// right tool; THIS golden proves the real, shipped content actually fires end-to-end).
//
// Hand-derived (independent `node -e` mulberry32 trace, verified via Bash -- SEED 7's exact
// sequence). Both wit -> neutral (x1.0, same-affinity). Party: CASTER (always-cast) + OVERTONE
// (the only observer) vs a single TARGET.
//
// CASTER's real cast triggers on-action-observed dispatch #1: OVERTONE's own chancePercent(10)
// roll is draw #1 = 0.0117 < 0.10 -> SUCCEEDS. echoCast fires (bypassing its own placeholder
// response entirely -- no StatModifierApplied/etc., see RESONANT_OVERTONE_TRAIT's own doc
// comment): draw #2 = 0.0620 (gem index, only 1 equipped -> slot 0 regardless of value), draw
// #3 = 0.9769 (target index, only 1 living enemy -> TARGET regardless of value) -- EchoCastGranted,
// then CASTER casts AGAIN (the echo), which fires its OWN nested on-action-observed dispatch #2
// BEFORE its own damage lands (recursion precedes payload, same as any instance): OVERTONE rolls
// AGAIN, draw #4 = 0.6990 >= 0.10 -> FAILS, chain stops at exactly one echo. The echo's own damage
// then lands (nested), and only THEN does the ORIGINAL cast's own damage land (the outer call
// resumes after the whole nested chain unwinds) -- so the echo's DamageDealt appears BEFORE the
// original cast's own, even though the original cast was declared first.
//
//   Both hits: off = Intelligence(20) x spellPower(1.0); vs def 0: core 20, chip 0.2 -> raw 20.2
//     -> final 20. TARGET 100 -20 (echo) -20 (original) = 60, survives.

import { makeParty } from '../__fixtures__/creatures'
import { createCreatureId } from '../ids'
import { STOCK_SCRIPTS_BY_ID } from '../../data/scripts'
import { GLOWSPARK_BOLT } from '../../data/spells'
import { RESONANT_OVERTONE_TRAIT, TRAIT_REGISTRY } from '../../data/traits'
import type { CombatEvent } from '../types'

export const SEED = 7 // See the header trace above -- draw #1 < 10% (echo fires), draw #4 >= 10%
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
    equippedSpells: [GLOWSPARK_BOLT],
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

export const scripts = STOCK_SCRIPTS_BY_ID
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
  { type: 'EchoCastGranted', sourceId: OVERTONE, casterId: CASTER },
  // The echo's own nested SpellCast -- its on-action-observed dispatch rolls again and fails
  // (draw #4 >= 10%), so no TriggerFired/EchoCastGranted appears for it.
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
    remainingHp: 80,
    damageSource: 'cast',
  },
  // Only now does the ORIGINAL cast's own damage land -- the whole echo chain resolved and
  // unwound first (on-action-observed fires before that instance's own payload, recursively).
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
