// Phase 4 Slice I: the phase's one end-to-end integration test, run against REAL content --
// the default, zero-override store (`createGameStore()`, real biomes/specializations/starters,
// the fixed DEFAULT_RUN_SEED), never store.test.ts's fixture biome/spec data. Per CONVENTIONS'
// "two-tier golden discipline," this is the explicitly-labeled **generated-then-checkpoint-
// verified** case: the scenario (Brute starter + the scripted-intro Unicorn descending real
// floor 1's Overgrowth content) was run once, its actual output inspected, and the assertions
// below pin exactly what came back -- not a hand-traced log the way store.test.ts's own
// fixture-scoped goldens are. Per-mechanism correctness (the action instance-list, revive,
// count-scaling stat-modifiers, on-fight-start/on-attack/on-damage-taken hooks, the reward/XP/
// currency banking math) already rests on Slice A-H3's own focused goldens; this test's job is
// only to prove the whole stack composes against real data, stays deterministic, and that real
// species-signature mechanics actually fire along the way.
//
// The Brute spec is picked deliberately (not Sorcerer/Shieldbarer): its starter's signature
// trait is a direct, content-level exercise of Slice B's action instance-list model (Attack
// resolves as two full-power instances), so this same run also re-proves that mechanism against
// real content, not just Slice B's own fixture-scoped golden.

import { describe, expect, test } from 'vitest'
import type { CombatEvent } from '../engine/types'
import { OVERGROWTH_BIOME_ID } from '../data/species/overgrowth'
import {
  SWARMHIVE_STRIKER_TRAIT,
  TREANT_GROVEKEEP_TRAIT,
  SNAPJAW_JAWS_TRAIT,
} from '../data/traits/overgrowth'
import { UNICORN_TRAIT } from '../data/traits/starters'
import { createGameStore } from './store'

function triggersFor(events: readonly CombatEvent[], effectId: string): number {
  return events.filter((e) => e.type === 'TriggerFired' && e.effectId === effectId).length
}

describe('Slice I integration: real Brute party through real floor 1 (Overgrowth)', () => {
  test('descends floor 1 deterministically, banking rewards and firing real species mechanics', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')

    const intro = store.getState().runScriptedIntro()
    expect(intro.result).toBe('win')
    // The scripted intro is a run-layer special case (ASSUMPTION 23) -- the Unicorn joins
    // regardless of outcome, but this seed happens to win it (the starter one-shots the weaker
    // scripted Unicorn stand-in before it can act).
    const afterIntro = store.getState()
    expect(afterIntro.collection.get('unicorn')?.length).toBe(1)
    expect(afterIntro.activeParty.slice(0, 2)).toEqual(['brute-starter#0', 'unicorn#1'])

    const outcome = store.getState().descend(1)

    // ---- Floor-level outcome ----
    expect(outcome.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcome.cleared).toBe(true)
    expect(outcome.deepestFloorAdvanced).toBe(true)
    expect(store.getState().deepestFloor).toBe(1)
    expect(store.getState().currentFloor).toBe(1)
    expect(store.getState().discoveredBiomes.has(OVERGROWTH_BIOME_ID)).toBe(true)

    // ---- Reward banking (per-kill, three fights won -> three enemies killed) ----
    // floor 1 -> enemyPartySize(1)=1 enemy/fight, fightCount(1)=3 fights -> exactly 3 kills.
    expect([...outcome.soulGained.entries()].sort()).toEqual(
      [
        ['treant-grovekeep', 2], // rare -> SOUL_GAIN_PERCENT.rare = 2
        ['swarmhive-striker', 5], // uncommon -> SOUL_GAIN_PERCENT.uncommon = 5
        ['snapjaw-jaws', 5], // uncommon -> SOUL_GAIN_PERCENT.uncommon = 5
      ].sort(),
    )
    expect(outcome.xpBanked).toBe(30) // xpAwardForKill(floor=1)=10, 3 kills
    expect(outcome.currencyGained).toEqual({
      essence: 3,
      ore: 3,
      bricks: 3,
      lifeforce: 3,
    })
    expect(store.getState().currencies).toEqual({
      essence: 3,
      ore: 3,
      bricks: 3,
      lifeforce: 3,
    })

    // ---- Real species-signature mechanics actually fired (not merely "the fight resolved") ----
    // Treant Grovekeep (content/overgrowth.md: "at the start of the fight, this creature
    // permanently raises the whole team's maximum Health by 15%") -- fires exactly once, on
    // fight-start, for its own single-enemy fight.
    expect(triggersFor(outcome.events, TREANT_GROVEKEEP_TRAIT.id)).toBe(1)
    // Swarmhive Striker (content/overgrowth.md: "at fight-start, Attack permanently increases by
    // 20% for every living Swarmhive ally, itself included") -- the count-scaling primitive
    // (Slice D) against real content; one Swarmhive present (itself) -> fires once.
    expect(triggersFor(outcome.events, SWARMHIVE_STRIKER_TRAIT.id)).toBe(1)
    // Snapjaw Jaws (content/overgrowth.md: "whenever this creature takes damage, it attacks back
    // for 60% of its Attack") -- an on-damage-taken retaliation trigger, fires once per hit
    // landed on it before it dies.
    expect(triggersFor(outcome.events, SNAPJAW_JAWS_TRAIT.id)).toBeGreaterThan(0)
    // The Unicorn's own signature trait (species-locked.md: "whenever this creature attacks, it
    // resurrects a random dead ally at 20% of its baseline max HP") -- Slice B's `revive`
    // response/on-attack hook against real content, firing per attack instance across the floor.
    const unicornTriggers = triggersFor(outcome.events, UNICORN_TRAIT.id)
    expect(unicornTriggers).toBeGreaterThan(0)
    // Not every attack instance finds a dead ally to revive (the response's `random-dead-ally`
    // pool can be empty -- a targeting fizzle, per CONVENTIONS, not a suppressed trigger: the
    // TriggerFired above still fires either way). At least some of these DID resolve into a real
    // Revived consequence, proving the response executes end to end, not just that the hook fires.
    const revivedCount = outcome.events.filter((e) => e.type === 'Revived').length
    expect(revivedCount).toBeGreaterThan(0)
    expect(revivedCount).toBeLessThanOrEqual(unicornTriggers)

    // ---- StatModifierApplied: the two fight-start amplifiers landed the exact documented rates ----
    const statMods = outcome.events.filter(
      (e): e is Extract<CombatEvent, { type: 'StatModifierApplied' }> =>
        e.type === 'StatModifierApplied',
    )
    expect(statMods).toHaveLength(2)
    const grovekeepMod = statMods.find((e) => e.stat === 'health')
    expect(grovekeepMod?.factor).toBe(1.15)
    const strikerMod = statMods.find((e) => e.stat === 'attack')
    expect(strikerMod?.factor).toBe(1.2)

    // ---- Determinism: same fixed seed, same real data -> byte-identical outcome ----
    const replay = createGameStore()
    replay.getState().setSpec('brute')
    replay.getState().runScriptedIntro()
    const replayOutcome = replay.getState().descend(1)
    expect(replayOutcome).toEqual(outcome)
  })
})
