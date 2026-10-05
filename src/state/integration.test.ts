// Phase 4 Slice I: the phase's end-to-end integration tests, run against REAL content -- the
// default, zero-override store (`createGameStore()`, real biomes/specializations/starters, the
// fixed DEFAULT_RUN_SEED), never store.test.ts's fixture biome/spec data. Per CONVENTIONS'
// "two-tier golden discipline," these are the explicitly-labeled **generated-then-checkpoint-
// verified** cases: each scenario was run once, its actual output inspected, and the assertions
// below pin exactly what came back -- not a hand-traced log the way store.test.ts's own
// fixture-scoped goldens are. Per-mechanism correctness (the action instance-list, revive,
// count-scaling stat-modifiers, on-fight-start/on-attack/on-damage-taken hooks, the reward/XP/
// currency banking math) already rests on Slice A-H3's own focused goldens (and, for the
// Broodmother's Swarm Call specifically, golden-broodmother.test.ts's own hand-derived count-3/
// count-2 trace); these tests' job is only to prove the whole stack composes against real data,
// stays deterministic, and that real species-signature mechanics actually fire along the way.
//
// Phase 4.1-A (ASSUMPTION 3, A7): the two original scenarios below pin
// `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` so every non-XP number (fight count, enemy level range,
// soul gain, instance ids aside) stays exactly what it was under Phase 4 -- only the XP
// expectations changed (the per-kill basis moved from `10 * floor` to the victim's own level,
// and the level curve from `100 * level` to `20 * level^2`, per ASSUMPTION 5), each listed here.
// A separate "Phase 4.1-A defaults" describe block below exercises the REAL, zero-override store
// (the new default BalanceConfig) instead.
//
// The Brute spec is picked deliberately (not Sorcerer/Shieldbarer): its starter's signature
// trait is a direct, content-level exercise of Slice B's action instance-list model (Attack
// resolves as two full-power instances), so this same run also re-proves that mechanism against
// real content, not just Slice B's own fixture-scoped golden.
//
// Phase 4.1-G1 (regenerated; still generated-then-checkpoint-verified): enemy gem sets, role scripts
// and the 6v6 boss floor changed which creatures the fixed DEFAULT_RUN_SEED spawns (every enemy now
// draws a full gem set from the run stream, so the stream shifts) and what they do. Every pinned
// outcome below was regenerated and then checked against an independent invariant, noted inline;
// the species mechanics asserted are the ones the NEW draw exercises.
//
// Two cases: floor 1 (the original Slice I scenario, unchanged by the PR #65 review) and floor
// 10 -- the real Broodmother boss floor, added by that review to close the "boss-encounter
// runner" gap H1-H3 each deferred (see CONVENTIONS "Boss floors" and the Slice I phase-record
// section for the full history).

import { describe, expect, test } from 'vitest'
import type { CombatEvent } from '../engine/types'
import { contentFrontier } from '../engine/generation'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from '../engine/__fixtures__/balance'
import { OVERGROWTH_BIOME_ID } from '../data/species/overgrowth'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { BIOMES } from '../data/biomes'
import { ALL_SPELLS } from '../data/spells'
import { createInstanceId } from './ids'
import {
  SWARMHIVE_DRONE_TRAIT,
  TREANT_GROVEKEEP_TRAIT,
  SNAPJAW_JAWS_TRAIT,
} from '../data/traits/overgrowth'
import { enemyLevelRange } from '../engine/curves'
import { UNICORN_TRAIT } from '../data/traits/starters'
import { createGameStore, type DescendResult } from './store'

/** Narrows `descend()`'s `{ ok, ... }` union, failing loudly instead of silently continuing on
 * an unexpected refusal (Phase 4.1-A, G5/S5 -- descend no longer throws on success/failure). */
function expectOk(result: DescendResult): Extract<DescendResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected descend() to succeed, got refusal: ${result.reason}`)
  }
  return result
}

function triggersFor(events: readonly CombatEvent[], effectId: string): number {
  return events.filter((e) => e.type === 'TriggerFired' && e.effectId === effectId).length
}

/** Buckets AttackDeclared events by `attackerId`'s own TurnStarted...TurnEnded bracket -- one
 * entry per turn that creature actually took, each the count of attack INSTANCES it declared
 * that turn (Slice B's action instance-list model: a double-strike Attack fires AttackDeclared
 * once per instance, not once per action). */
function attacksPerTurn(events: readonly CombatEvent[], attackerId: string): number[] {
  const counts: number[] = []
  let inBracket = false
  let count = 0
  for (const event of events) {
    if (event.type === 'TurnStarted' && event.creatureId === attackerId) {
      inBracket = true
      count = 0
    } else if (
      event.type === 'AttackDeclared' &&
      inBracket &&
      event.attackerId === attackerId
    ) {
      count += 1
    } else if (
      event.type === 'TurnEnded' &&
      event.creatureId === attackerId &&
      inBracket
    ) {
      counts.push(count)
      inBracket = false
    }
  }
  return counts
}

describe('Slice I integration: real Brute party through real floor 1 (Overgrowth)', () => {
  test('descends floor 1 deterministically, banking rewards and firing real species mechanics', () => {
    const store = createGameStore({ balanceConfig: CFG })
    store.getState().setSpec('brute')

    const intro = store.getState().runScriptedIntro()
    expect(intro.result).toBe('win')
    // The scripted intro is a run-layer special case (ASSUMPTION 23) -- the Unicorn joins
    // regardless of outcome, but this seed happens to win it: the scripted Unicorn stand-in
    // (speed 20 > the Brute starter's 15) acts FIRST each round, chipping 1 dmg/round (a
    // chip-floor-only hit, x1.25 affinity advantage but far below 1 raw damage either way); the
    // Brute's double-strike (11+11) brings the stand-in from 25 HP to 3 in round 1, then kills
    // it with round 2's first instance alone (3-11<0) -- instance 2 has no living target left
    // and never fires (Slice B's action instance-list model, re-exercised here too).
    const afterIntro = store.getState()
    // Phase 4.1-A (A6): instance ids are opaque ('inst-<ordinal>'), never embedding the creature
    // id -- the Brute starter is the first grant (setSpec), the Unicorn the second
    // (runScriptedIntro). Review fix F7: the opaque ids alone don't show WHICH creature is
    // which, so assert each slot's own `source` too, not just the id strings.
    expect(afterIntro.activeParty.slice(0, 2)).toEqual(['inst-0', 'inst-1'])
    expect(afterIntro.collection.get(createInstanceId('inst-0'))?.source).toEqual({
      kind: 'creature',
      creatureId: 'brute-starter',
    })
    expect(afterIntro.collection.get(createInstanceId('inst-1'))?.source).toEqual({
      kind: 'creature',
      creatureId: 'unicorn',
    })

    const { outcome } = expectOk(store.getState().descend(1))

    // ---- Floor-level outcome ----
    expect(outcome.fightResults).toEqual(['win', 'win', 'win'])
    expect(outcome.cleared).toBe(true)
    expect(outcome.deepestFloorAdvanced).toBe(true)
    expect(store.getState().deepestFloor).toBe(1)
    expect(store.getState().lastFloor).toBe(1)
    expect(store.getState().discoveredBiomes.has(OVERGROWTH_BIOME_ID)).toBe(true)

    // ---- Reward banking (per-kill, three fights won -> three enemies killed) ----
    // floor 1 -> enemyPartySize(1)=1 enemy/fight, fightCount(1, CFG)=3 fights -> exactly 3 kills.
    expect([...outcome.soulGained.entries()].sort()).toEqual(
      [
        ['treant-grovekeep', 2], // rare -> CFG.soulGainPercent.rare = 2
        ['swarmhive-drone', 10], // common -> CFG.soulGainPercent.common = 10
        ['snapjaw-jaws', 5], // uncommon -> CFG.soulGainPercent.uncommon = 5
      ].sort(),
    )
    // Phase 4.1-A (ASSUMPTION 5): xpAwardForKill = the victim's own level, not 10*floor -- see
    // this file's own header comment. Generated-then-checkpoint-verified: the three victims'
    // own rolled levels (within enemyLevelRange(1, CFG) = {min:1, max:3}) sum to 6. Checkpoint:
    // three levels in 1..3 sum to 3..9.
    expect(outcome.xpBanked).toBe(6)
    expect(outcome.xpBanked).toBeGreaterThanOrEqual(3 * enemyLevelRange(1, CFG).min)
    expect(outcome.xpBanked).toBeLessThanOrEqual(3 * enemyLevelRange(1, CFG).max)
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
    // Swarmhive Drone (Final Sting): a trait that fires when the drone dies -- this floor's draw has
    // one drone, killed once in its fight, so the trigger fires exactly once.
    expect(triggersFor(outcome.events, SWARMHIVE_DRONE_TRAIT.id)).toBe(1)
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

    // ---- StatModifierApplied: the fight-start amplifier landed the exact documented rate ----
    // (Treant Grovekeep's +15% Health; the Swarmhive Striker's Attack amplifier is not in this
    // floor's draw any more.)
    const statMods = outcome.events.filter(
      (e): e is Extract<CombatEvent, { type: 'StatModifierApplied' }> =>
        e.type === 'StatModifierApplied',
    )
    expect(statMods).toHaveLength(1)
    const grovekeepMod = statMods.find((e) => e.stat === 'health')
    expect(grovekeepMod?.factor).toBe(1.15)

    // ---- Determinism: same fixed seed, same real data -> byte-identical outcome ----
    const replay = createGameStore({ balanceConfig: CFG })
    replay.getState().setSpec('brute')
    replay.getState().runScriptedIntro()
    const replayResult = expectOk(replay.getState().descend(1))
    expect(replayResult.outcome).toEqual(outcome)

    // ---- Slice B's action instance-list model, re-proven against real content (per this
    // test's own header comment) ----
    const perTurn = attacksPerTurn(outcome.events, 'brute-starter-player-0')
    expect(perTurn).toHaveLength(5) // 5 turns total across floor 1's 3 fights
    expect(perTurn.filter((n) => n === 2)).toHaveLength(4) // the double-strike, ordinarily
    // The lone exception is the LAST turn: instance 1 alone kills that fight's only enemy --
    // instance 2 then has no living target left (`resolveInstanceTarget` returns null, the instance
    // loop breaks per Slice B's own "falls back to default target... unless it's already died" rule
    // with nothing left to fall back TO), so only one AttackDeclared fires that turn.
    expect(perTurn.filter((n) => n !== 2)).toEqual([1])
    expect(perTurn[perTurn.length - 1]).toBe(1)
  })

  test('descends floor 10 -- the real Broodmother boss floor -- after leveling the party up to survive it', () => {
    const store = createGameStore({ balanceConfig: CFG })
    store.getState().setSpec('brute')
    store.getState().runScriptedIntro()
    expectOk(store.getState().descend(1))

    // Level 20 (scaleStatsToLevel factor 1+0.25*19=5.75) was chosen after checking level 50
    // first and rejecting it: at 50 the party's opening turn(s) kill EVERY enemy (both adds and
    // the boss herself) before the Broodmother's own queued turn ever arrives, so Swarm Call
    // never fires -- the fight is a "win" but proves nothing about her signature mechanic. Level
    // 20 still guarantees an eventual win (confirmed by this test) while leaving her enough
    // effective HP to survive long enough to take at least one action of her own.
    const LEVEL = 20
    store.setState((s) => {
      const collection = new Map(s.collection)
      for (const [instanceId, instance] of collection) {
        collection.set(instanceId, { ...instance, level: LEVEL })
      }
      return { collection, deepestFloor: 9 } // precondition: floor 9 already cleared
    })

    const { outcome } = expectOk(store.getState().descend(10))

    // ---- One fight, 6v6 (4.1-G1): the boss, her two real spiderling adds, and three fill
    // creatures drawn from the biome's own pool minus the Spiders (ids confirmed from the run) ----
    expect(outcome.fightResults).toEqual(['win'])
    const died = outcome.events
      .filter(
        (e): e is Extract<CombatEvent, { type: 'CreatureDied' }> =>
          e.type === 'CreatureDied',
      )
      .map((e) => e.creatureId)
      .filter((id) => id.includes('-enemy-'))
      .sort()
    expect(died).toEqual(
      [
        'broodmother-enemy-0', // the boss
        'spider-weaver-enemy-1', // her authored adds, first...
        'spider-ambusher-enemy-2',
        'treant-sapling-enemy-3', // ...then the three fill creatures, none of them Spiders
        'swarmhive-drone-enemy-4',
        'pollinator-beneficiary-enemy-5',
      ].sort(),
    )

    // ---- Swarm Call (the count-scaling on-attack trait golden-broodmother.test.ts hand-derives
    // in isolation) actually fires against this real, generated encounter ----
    expect(triggersFor(outcome.events, 'broodmother-swarm-call')).toBeGreaterThan(0)

    // ---- Boss-floor reward banking (CONVENTIONS: boss kill = XP/currency, no soul%; adds are
    // ordinary spawn-pool kills, soul% included) ----
    expect(outcome.bossDefeated).toBe('broodmother')
    expect(store.getState().bossesCleared).toEqual(new Set(['broodmother']))
    // bossesCleared.size(1) * 100 = 100 perk points (GAME_DESIGN §9), derived, never stored.
    expect(store.getState().bossesCleared.size * 100).toBe(100)
    // (Fill creatures are ordinary spawns with ordinary per-kill rewards, soul% included --
    // ASSUMPTION 80.)
    expect([...outcome.soulGained.keys()].sort()).toEqual(
      [
        'spider-ambusher',
        'spider-weaver',
        'treant-sapling',
        'swarmhive-drone',
        'pollinator-beneficiary',
      ].sort(),
    )
    expect(outcome.soulGained.has('broodmother')).toBe(false)
    // Phase 4.1-A (ASSUMPTION 5): xpAwardForKill = each victim's own level, not 10*floor.
    // Generated-then-checkpoint-verified: the boss's own level is FIXED (bossLevel(10, CFG) =
    // 16); the five other enemies' rolled levels (within enemyLevelRange(10, CFG) = {min:10,
    // max:13}) sum with it to 73. Checkpoint: five levels in 10..13 sum to 50..65, so 73 - 16 = 57
    // is inside it.
    expect(outcome.xpBanked).toBe(73)
    expect(outcome.xpBanked - 16).toBeGreaterThanOrEqual(5 * enemyLevelRange(10, CFG).min)
    expect(outcome.xpBanked - 16).toBeLessThanOrEqual(5 * enemyLevelRange(10, CFG).max)
    // currencyDropForKill(10, CFG) = {essence:10, ore:10, bricks:1, lifeforce:10} per kill, six kills.
    expect(outcome.currencyGained).toEqual({
      essence: 60,
      ore: 60,
      bricks: 6,
      lifeforce: 60,
    })
    expect(store.getState().deepestFloor).toBe(10)

    // ---- Re-clearing the same boss floor grants no further perk points (idempotent) ----
    const secondResult = expectOk(store.getState().descend(10))
    expect(secondResult.outcome.bossDefeated).toBe('broodmother')
    expect(store.getState().bossesCleared.size).toBe(1)

    // ---- Determinism: same fixed seed/levels, same real data -> byte-identical FIRST outcome --
    const replay = createGameStore({ balanceConfig: CFG })
    replay.getState().setSpec('brute')
    replay.getState().runScriptedIntro()
    expectOk(replay.getState().descend(1))
    replay.setState((s) => {
      const collection = new Map(s.collection)
      for (const [instanceId, instance] of collection) {
        collection.set(instanceId, { ...instance, level: LEVEL })
      }
      return { collection, deepestFloor: 9 }
    })
    const replayResult = expectOk(replay.getState().descend(10))
    expect(replayResult.outcome).toEqual(outcome)
  })
})

describe('Phase 4.1-A defaults: real store, real content, the new BalanceConfig', () => {
  test('the content frontier reflects the 3 authored biomes (Overgrowth/Glimmerdark/Rotcap Hollow)', () => {
    expect(contentFrontier(BIOMES)).toBe(30)
  })

  test('floor 1 runs the new default fight count (10) and grants soul% matching the new rarity table', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    store.getState().runScriptedIntro()

    const { outcome } = expectOk(store.getState().descend(1))

    // Generated-then-checkpoint-verified (this describe block's own header comment): under the
    // real default config, floor 1 is 10 fights (not CFG's 3). Before 4.1-G1 the level-1 Brute/
    // Unicorn party lost the 10th (CONVENTIONS' accepted "per-fight loss rate compounds" risk);
    // with this draw (roles and full gem sets shifted the stream) it wins all ten. `fightResults`
    // stops at the first non-win per CONVENTIONS, so ten wins means a cleared floor. Checkpoint:
    // one result per fight, ten fights.
    expect(outcome.fightResults).toEqual(Array.from({ length: 10 }, () => 'win'))
    expect(outcome.cleared).toBe(true)
    expect(store.getState().deepestFloor).toBe(1)

    // Every soul% gain this call must be a whole multiple of one of the new rarity percentages
    // (25/20/10) -- a creature can die more than once across the 9 won fights.
    const allowedGains = Object.values(DEFAULT_BALANCE_CONFIG.soulGainPercent)
    for (const gain of outcome.soulGained.values()) {
      expect(allowedGains.some((per) => gain % per === 0)).toBe(true)
    }
  })
})

// Phase 4.1-G2 (D4, ASSUMPTION 81-83): player creatures now hold a stored, rolled gem set, which a
// striker uses only on a turn it cannot Attack (rule 3: "Attack illegal (Pacified) -> cast a random
// gem"). The three tests above are the Brute party (the Cragfang Mauler and the Unicorn, both
// strikers) and every value they pin is UNCHANGED by G2. What does move is the floor-10 event log
// (137 events on main, 212 now), and exactly one thing moves it, from event 66 on: in round 3 the
// Unicorn, Pacified by the Pollinator Beneficiary in round 2, Waited on main (no gem to cast) and
// now casts its slot-0 gem, Life Siphon (15 damage to the Beneficiary, 30 healed), and every later
// event follows from that turn. Floor 1 (both stores) and the second floor-10 visit are identical
// to main, event for event: no party member is Pacified in them.
//
// Generated-then-checkpoint-verified: the pinned gem sets are what the roll returned for the
// default run seed; the independent checkpoints are (a) the Unicorn's set is exactly the three
// biome-1 Vitality spells, in any order, and (b) the Mauler's are three distinct biome-1 Violence
// spells, both from the spell registry rather than from this run.
describe('Phase 4.1-G2: stored player gems in the real floor-10 fight', () => {
  function floor10() {
    const store = createGameStore({ balanceConfig: CFG })
    store.getState().setSpec('brute')
    store.getState().runScriptedIntro()
    expectOk(store.getState().descend(1))
    store.setState((s) => {
      const collection = new Map(s.collection)
      for (const [instanceId, instance] of collection) {
        collection.set(instanceId, { ...instance, level: 20 })
      }
      return { collection, deepestFloor: 9 }
    })
    return { store, outcome: expectOk(store.getState().descend(10)).outcome }
  }

  test('the party holds the rolled sets, checked against the registry', () => {
    const { store } = floor10()
    const mauler = store.getState().collection.get(createInstanceId('inst-0'))!
    const unicorn = store.getState().collection.get(createInstanceId('inst-1'))!
    expect(mauler.gems).toEqual(['weakening-bite', 'cinder-nova', 'silence'])
    expect(unicorn.gems).toEqual(['life-siphon', 'wild-vigor', 'regrowth'])
    // Checkpoint: the Unicorn's set is exactly the biome-1 Vitality spells.
    const vitality = ALL_SPELLS.filter(
      (spell) => spell.affinity === 'vitality' && (spell.unlockedAtBiome ?? 1) <= 1,
    ).map((spell) => spell.id)
    expect([...unicorn.gems].sort()).toEqual([...vitality].sort())
    // Checkpoint: the Mauler's set is three distinct biome-1 Violence spells (allowed set derived
    // from the registry, not from this run).
    const violence = new Set(
      ALL_SPELLS.filter(
        (spell) => spell.affinity === 'violence' && (spell.unlockedAtBiome ?? 1) <= 1,
      ).map((spell) => spell.id),
    )
    expect(new Set(mauler.gems).size).toBe(3)
    for (const id of mauler.gems) expect(violence.has(id as string)).toBe(true)
  })

  test('the Pacified Unicorn casts its slot-0 gem instead of waiting', () => {
    const { outcome } = floor10()
    const events = outcome.events
    const pacifiedAt = events.findIndex(
      (e) =>
        e.type === 'StatusApplied' &&
        e.statusId === 'pacified' &&
        e.targetId === 'unicorn-player-1',
    )
    expect(pacifiedAt).toBeGreaterThan(-1)
    const turnStart = events.findIndex(
      (e, i) =>
        i > pacifiedAt && e.type === 'TurnStarted' && e.creatureId === 'unicorn-player-1',
    )
    const turnEnd = events.findIndex(
      (e, i) =>
        i > turnStart && e.type === 'TurnEnded' && e.creatureId === 'unicorn-player-1',
    )
    const turn = events.slice(turnStart, turnEnd + 1)
    expect(turn.some((e) => e.type === 'Waited')).toBe(false)
    const cast = turn.find((e) => e.type === 'SpellCast')
    expect(cast).toMatchObject({ casterId: 'unicorn-player-1', gemSlot: 0 })
    // Life Siphon: damage to the target and a heal on the caster.
    expect(turn.some((e) => e.type === 'DamageDealt' && e.damageSource === 'cast')).toBe(
      true,
    )
    expect(
      turn.some((e) => e.type === 'HealApplied' && e.targetId === 'unicorn-player-1'),
    ).toBe(true)
  })
})
