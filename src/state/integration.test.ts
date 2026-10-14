// End-to-end integration tests, run against REAL content -- the
// default, zero-override store (`createGameStore()`, real biomes/specializations/starters, the
// fixed DEFAULT_RUN_SEED), never store.test.ts's fixture biome/spec data. Per `CONVENTIONS.md#two-tier-golden-discipline`,
// these are the explicitly-labeled **generated-then-checkpoint-
// verified** cases: each scenario was run once, its actual output inspected, and the assertions
// below pin exactly what came back -- not a hand-traced log the way store.test.ts's own
// fixture-scoped goldens are. Per-mechanism correctness (the action instance-list, revive,
// count-scaling stat-modifiers, on-fight-start/on-attack/on-damage-taken hooks, the reward/XP/
// currency banking math) already rests on focused goldens (and, for the
// Broodmother's Swarm Call specifically, golden-broodmother.test.ts's own hand-derived count-3/
// count-2 trace); these tests' job is only to prove the whole stack composes against real data,
// stays deterministic, and that real species-signature mechanics actually fire along the way.
//
// The two original scenarios below pin
// `TEST_BALANCE_CONFIG` so every non-XP number (fight count, enemy level range,
// soul gain, instance ids aside) is the placeholder config's; per-kill XP is the victim's own
// level (`spec/creatures.md#levels-and-xp`). A separate describe block below (the real defaults)
// exercises the REAL, zero-override store (the default BalanceConfig) instead.
//
// The Brute spec is picked deliberately (not Sorcerer/Shieldbarer): its starter's signature
// trait is a direct, content-level exercise of the action instance-list model (Attack
// resolves as two full-power instances), so this same run also re-proves that mechanism against
// real content, not just a fixture-scoped golden.
//
// Enemy gem sets, role scripts
// and the 6v6 boss floor decide which creatures the fixed DEFAULT_RUN_SEED spawns (every enemy
// draws a full gem set from the run stream) and what they do. Every pinned
// outcome below was generated and then checked against an independent invariant, noted inline;
// the species mechanics asserted are the ones the NEW draw exercises.
//
// Two cases: floor 1 and floor 10 -- the real Broodmother boss floor
// (`spec/run.md#boss-floor-generation`).

import { describe, expect, test } from 'vitest'
import type { CombatEvent } from '../engine/types'
import { contentFrontier } from '../engine/generation'
import { TEST_BALANCE_CONFIG as CFG } from '../engine/__fixtures__/balance'
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
 * an unexpected refusal (descend does not throw on success/failure). */
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
 * that turn (the action instance-list model: a double-strike Attack fires AttackDeclared
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

describe('integration: real Brute party through real floor 1 (Overgrowth)', () => {
  test('descends floor 1 deterministically, banking rewards and firing real species mechanics', () => {
    const store = createGameStore({ balanceConfig: CFG })
    store.getState().setSpec('brute')

    const intro = store.getState().runScriptedIntro()
    expect(intro.result).toBe('win')
    // The scripted intro is a run-layer special case -- the Unicorn joins
    // regardless of outcome, but this seed happens to win it: the scripted Unicorn stand-in
    // (speed 20 > the Brute starter's 15, 39 HP) acts FIRST each round, hitting for 7: raw
    // damage 0.1875 (chip only, x1.25 affinity) floors to the minimum of 1, plus the Additional
    // min(floor(0.2 x 33), 10) = 6 (the Brute starter has 33 HP), so the Brute goes 33 -> 26 ->
    // 19; the Brute's double-strike hits for 18+18 (raw 11.475 at x0.75 affinity floors to 11,
    // plus the Additional min(floor(0.2 x 39), 10) = 7), bringing the stand-in from 39 HP to 21
    // to 3 in round 1, then kills it with round 2's first instance alone (3-18<0) -- instance 2
    // has no living target left and never fires (the action instance-list model,
    // re-exercised here too).
    const afterIntro = store.getState()
    // Instance ids are opaque ('inst-<ordinal>'), never embedding the creature
    // id -- the Brute starter is the first grant (setSpec), the Unicorn the second
    // (runScriptedIntro). The opaque ids alone don't show WHICH creature is
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
    // xpAwardForKill = the victim's own level, not 10*floor -- see
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
    // Snapjaw Jaws (`content/overgrowth.md#snapjaw-jaws`) -- an on-damage-taken retaliation
    // trigger, fires once per hit landed on it before it dies.
    expect(triggersFor(outcome.events, SNAPJAW_JAWS_TRAIT.id)).toBeGreaterThan(0)
    // The Unicorn's own signature trait (`content/overgrowth.md#unicorn-lightbearer`) -- the
    // `revive` response/on-attack hook against real content, firing per attack instance across
    // the floor.
    const unicornTriggers = triggersFor(outcome.events, UNICORN_TRAIT.id)
    expect(unicornTriggers).toBeGreaterThan(0)
    // No Revived event: nobody dies in these fights, so the Unicorn's trigger fires on every
    // Unicorn attack but its `random-dead-ally` pool is empty: a targeting fizzle
    // (`spec/responses.md#fizzles`), not a suppressed trigger. The revive response itself stays
    // pinned end to end by golden-revive, golden-unicorn-starter and the golden-revive-cap-*
    // goldens.
    //
    // Generated-then-checkpoint-verified derivation of fight 2: the Snapjaw Jaws alone, effective
    // Attack 30 against Defence 15 on both the Brute and the Unicorn. A counter is 30 x 0.6 = 18,
    // times the affinity multiplier, minus a fifth of the Defence (3): on the Brute (x1) 15, on
    // the Unicorn (x0.75) 13.5 - 3 = 10.5 -> 10. The Unicorn's opening attack draws the 10 counter
    // (39 -> 29, 74% of its max HP), which takes it below 80%, so the striker's rule 1 ("any
    // enemy below 80% HP -> attack the lowest-HP enemy") aims the Snapjaw's one attack (18) at the
    // Unicorn (29 < the Brute's 33): Unicorn 29 -> 11. The Brute then takes only the two 15
    // counters of its double strike, 33 -> 18 -> 3, alive, and the Snapjaw dies to the Unicorn's
    // next attack. Nobody dies, so there is no Revived event. The checkpoint loop below checks any
    // Revived the fight produces.
    const revives = outcome.events.filter((e) => e.type === 'Revived')
    expect(revives).toHaveLength(0)
    // Independent checkpoint: every Revived is the Unicorn's, on a creature that had died earlier
    // in the SAME fight (a revive can only follow a death), not a number read off this run.
    for (const revive of revives) {
      const at = outcome.events.indexOf(revive)
      const fightStart = outcome.events.map((e) => e.type).lastIndexOf('FightStarted', at)
      expect(revive).toMatchObject({ sourceId: 'unicorn-player-1' })
      expect(
        outcome.events
          .slice(fightStart, at)
          .some(
            (e) =>
              e.type === 'CreatureDied' &&
              e.creatureId === (revive as { targetId: string }).targetId,
          ),
      ).toBe(true)
    }

    // ---- StatModifierApplied: the fight-start amplifier landed the exact documented rate ----
    // (Treant Grovekeep's +15% Health; the Swarmhive Striker's Attack amplifier is not in this
    // floor's draw.)
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

    // ---- the action instance-list model, re-proven against real content (per this
    // test's own header comment) ----
    const perTurn = attacksPerTurn(outcome.events, 'brute-starter-player-0')
    // Generated-then-checkpoint-verified: the Brute takes 4 turns across floor 1's 3 fights, each
    // the full double strike, [2, 2, 2, 2], because with Health on the 20-45 scale no lone
    // enemy dies to instance 1. The "instance 2 has no living target left" case
    // (`resolveInstanceTarget` returns null, the instance loop breaks) is not reached by this
    // run; `actions.test.ts` ('resolveInstanceTarget -- rule 4') pins it.
    expect(perTurn).toEqual([2, 2, 2, 2])
    // Independent checkpoint: a Brute turn is the double strike or, when instance 1 leaves no
    // living target, a single attack -- never anything else, and the double strike fires.
    for (const attacks of perTurn) expect([1, 2]).toContain(attacks)
    expect(perTurn).toContain(2)
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

    // ---- One fight, 6v6: the boss, her two real spiderling adds, and three fill
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

    // ---- Boss-floor reward banking (`spec/run.md#rewards`: boss kill = XP/currency, no soul%; adds are
    // ordinary spawn-pool kills, soul% included) ----
    expect(outcome.bossDefeated).toBe('broodmother')
    expect(store.getState().bossesCleared).toEqual(new Set(['broodmother']))
    // bossesCleared.size(1) * 100 = 100 perk points (`spec/progression.md#perk-points`), derived, never stored.
    expect(store.getState().bossesCleared.size * 100).toBe(100)
    // (Fill creatures are ordinary spawns with ordinary per-kill rewards, soul% included.)
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
    // xpAwardForKill = each victim's own level, not 10*floor.
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

describe('real defaults: real store, real content, the default BalanceConfig', () => {
  test('the content frontier reflects the 3 authored biomes (Overgrowth/Glimmerdark/Rotcap Hollow)', () => {
    expect(contentFrontier(BIOMES)).toBe(30)
  })

  test('floor 1 runs the new default fight count (10) and grants soul% matching the new rarity table', () => {
    const store = createGameStore()
    store.getState().setSpec('brute')
    store.getState().runScriptedIntro()

    const { outcome } = expectOk(store.getState().descend(1))

    // Generated-then-checkpoint-verified (this describe block's own header comment): under the
    // real default config, floor 1 is 10 fights (not CFG's 3). The level-1 Brute/
    // Unicorn party wins all ten with this draw (roles and full gem sets shift the stream; the
    // risk that a per-fight loss rate compounds is `OPEN_QUESTIONS.md#fight-count`). `fightResults`
    // stops at the first non-win per `spec/run.md#a-descent-is-atomic`, so ten wins means a cleared floor. Checkpoint:
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

// Player creatures hold a stored, rolled gem set, which a striker uses only on a turn it cannot
// Attack (rule 3: "Attack illegal (Pacified) -> cast a random gem"). The three tests above are
// the Brute party (the Cragfang Mauler and the Unicorn, both strikers), and none of the values
// they pin involves a gem cast. What the gems move is the floor-10 fight: the Pollinator
// Beneficiary Pacifies the Unicorn, which then takes its turn, does not Wait and casts instead.
// The gem draw over its castable slots lands on slot 1, Wild Vigor (a SpellCast, then a
// StatModifierApplied on itself: Attack x1.15): the draw is a generated pin on a random roll,
// not the rule. The test pins the drawn slot and its effect, and checks the cast gem is one of
// the Unicorn's stored set. Floor 1 and the second floor-10 visit never Pacify a party member.
//
// Generated-then-checkpoint-verified: the pinned gem sets are what the roll returned for the
// default run seed; the independent checkpoints are (a) the Unicorn's set is exactly the three
// biome-1 Vitality spells, in any order, and (b) the Mauler's are three distinct biome-1 Violence
// spells, both from the spell registry rather than from this run.
describe('Stored player gems in the real floor-10 fight', () => {
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
    expect(mauler.gems).toEqual(['weakening-bite', 'thorn-lash', 'silence'])
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

  test('the Pacified Unicorn casts one of its stored gems instead of waiting (slot 1, Wild Vigor)', () => {
    const { store, outcome } = floor10()
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
    expect(cast).toMatchObject({ casterId: 'unicorn-player-1' })
    // Independent checkpoint: the cast slot holds a gem from the Unicorn's stored set (the sibling
    // test pins that set), whichever slot the draw picked.
    const unicorn = store.getState().collection.get(createInstanceId('inst-1'))!
    const slot = (cast as { gemSlot: number }).gemSlot
    expect(slot).toBeGreaterThanOrEqual(0)
    expect(slot).toBeLessThan(unicorn.gems.length)
    expect(['life-siphon', 'wild-vigor', 'regrowth']).toContain(unicorn.gems[slot])
    // Generated pin: the draw lands on slot 1, Wild Vigor, which raises the caster's own Attack
    // (x1.15) and deals no damage.
    expect(cast).toMatchObject({ gemSlot: 1 })
    expect(unicorn.gems[1]).toBe('wild-vigor')
    expect(turn.find((e) => e.type === 'StatModifierApplied')).toMatchObject({
      sourceId: 'unicorn-player-1',
      targetId: 'unicorn-player-1',
      stat: 'attack',
      factor: 1.15,
    })
    expect(turn.some((e) => e.type === 'DamageDealt')).toBe(false)
  })
})
