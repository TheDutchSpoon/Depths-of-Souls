// Phase 4.1-H1: balance simulator tests. They assert determinism, report shape and the POLICY
// MECHANICS, never a balance value (ASSUMPTION 106), so the H2 tuning pass doesn't rewrite them.
// `npm run sim` (vitest --mode sim) runs the full report instead of these tests.

import { describe, expect, it } from 'vitest'
import { createCreatureId } from '../engine/ids'
import { ROUND_CAP } from '../engine/config'
import { contentFrontier } from '../engine/generation'
import type { StatusDef } from '../engine/effect-types'
import type { CombatEvent } from '../engine/types'
import { BIOMES } from '../data/biomes'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import {
  resolvePerkEffects,
  SORCERER,
  SPECIALIZATIONS,
  type Specialization,
} from '../data/specializations'
import { SORCERER_STARTER, UNICORN } from '../data/species/starters'
import { STATUS_REGISTRY } from '../data/statuses'
import { createInstanceId } from './ids'
import type { Instance } from './rewards'
import { createGameStore } from './store'
import {
  advanceProgress,
  analyzeFight,
  applyPartyOrder,
  applyPerkPlan,
  attributeStatModifiers,
  bossContext,
  bossLockStats,
  buildBossRows,
  buildReport,
  buildSimScripts,
  buildSpecReport,
  computeThresholds,
  firstRoundEnemyIds,
  formatReport,
  innateSpellCount,
  foldFightStacks,
  isFunctionalPerk,
  lockScopesByStatus,
  medianOfSeeds,
  NO_STACKS,
  nextRun,
  noteBossVisit,
  orderedParty,
  pickProbeCreature,
  planPerkLevels,
  playFloorRun,
  probeScriptId,
  runProbe,
  runSeed,
  SIM_SEEDS,
  SESSION_TARGET_FLOOR,
  SMOKE_SEEDS,
  spreadOf,
  splitFights,
  stopReason,
  summonPass,
  FIRST_SESSION_RUNS,
  INITIAL_PROGRESS,
  WALL_FAILED_PUSHES,
  type BossVisit,
  type FightMetrics,
  type RunRecord,
  type StackCount,
  type SeedResult,
} from './balance-sim'

const isSim = import.meta.env.MODE === 'sim'

// ---- helpers ----

const cid = createCreatureId

function instance(
  ordinal: number,
  level: number,
  gems: (string | null)[] = [],
): Instance {
  return {
    id: createInstanceId(`inst-${ordinal}`),
    source: { kind: 'creature', creatureId: SORCERER_STARTER.id },
    level,
    xp: 0,
    scriptId: null,
    gems,
  }
}

function collectionOf(...instances: Instance[]): Map<Instance['id'], Instance> {
  return new Map(instances.map((i) => [i.id, i]))
}

function freshStore(seed = 1, spec = 'sorcerer') {
  const store = createGameStore({ scripts: buildSimScripts() })
  store.getState().newGame({ seed })
  store.getState().setSpec(spec)
  store.getState().runScriptedIntro()
  return store
}

/** A level-30 party at floor 9 (the Seer survives to take its first turn on the floor-10 boss). */
function atBossFloor() {
  const store = freshStore(7)
  const collection = new Map(store.getState().collection)
  for (const [id, inst] of collection) collection.set(id, { ...inst, level: 30 })
  store.setState({ deepestFloor: 9, collection })
  return store
}

const FIRST_CREATURE_ID = BIOMES[0]!.speciesPool[0]!.creatures[0]!.id

// ---- the full report (npm run sim) ----

describe.skipIf(!isSim)('balance simulator: full report (npm run sim)', () => {
  it('prints the report', () => {
    const started = performance.now()
    const report = buildReport({ seeds: SIM_SEEDS })
    const seconds = (performance.now() - started) / 1000
    console.log(formatReport(report))
    console.log(`\nRuntime: ${seconds.toFixed(1)} s`)
  }, 7_200_000)
})

describe.skipIf(isSim)('balance simulator', () => {
  // ---- determinism and shape ----

  describe('determinism and report shape', () => {
    const options = { seeds: SMOKE_SEEDS, runCap: FIRST_SESSION_RUNS }

    it('same seeds give a deep-equal report, built twice', () => {
      expect(buildReport(options)).toEqual(buildReport(options))
    })

    it('has every spec, a row per content floor and the H1 report items', () => {
      const report = buildReport(options)
      expect(report.specs.map((s) => s.specId)).toEqual(SPECIALIZATIONS.map((s) => s.id))
      for (const spec of report.specs) {
        expect(spec.seeds).toBe(SMOKE_SEEDS.length)
        expect(spec.floors).toHaveLength(contentFrontier(BIOMES))
        expect(Object.keys(spec.t4.stopReasons).sort()).toEqual(['cap', 'frontier'])
        expect(spec.t4.stopReasons.cap).toBe(SMOKE_SEEDS.length)
        expect(spec.t4).toHaveProperty('firstWallFloors')
        expect(spec.t4).toHaveProperty('failedPushesByFloor')
        expect(spec.floors[0]).toHaveProperty('attemptedSeeds')
        expect(spec.floors[0]).toHaveProperty('clearedSeeds')
        expect(spec.thresholds).toHaveProperty('floor1Pass')
        expect(spec.thresholds).toHaveProperty('firstSoulPass')
        expect(spec.thresholds).toHaveProperty('floor5Pass')
        expect(spec.t3.partySizeCounts).toBeDefined()
        expect(spec.t4).toHaveProperty('worstFailedPushesBelow10')
        expect(spec.t4).toHaveProperty('runsToFirstFloor10Clear')
        expect(spec).toHaveProperty('largestStacks')
      }
      expect(formatReport(report)).toContain('ASSUMPTION 22')
    })
  })

  // ---- the inert registry ----

  it('a registered, unreferenced probe script is inert: the policy run equals the stock-registry run', () => {
    for (const specId of ['sorcerer', 'brute']) {
      for (const seed of [1, 2]) {
        const base = { runCap: FIRST_SESSION_RUNS, probeBosses: false }
        const stock = runSeed(specId, seed, {
          seeds: [seed],
          ...base,
          scripts: STOCK_SCRIPTS_BY_ID,
        })
        const extended = runSeed(specId, seed, {
          seeds: [seed],
          ...base,
          scripts: buildSimScripts(),
        })
        expect(extended).toEqual(stock)
      }
    }
  })

  // ---- policy mechanics ----

  describe('summon once (ASSUMPTION 96)', () => {
    it('summons a creature at 100% once, however many passes run', () => {
      const store = freshStore()
      store.setState({ soulProgress: new Map([[FIRST_CREATURE_ID, 100]]) })
      const summoned = new Set<string>()
      const sizeBefore = store.getState().collection.size
      expect(summonPass(store, summoned)).toEqual([FIRST_CREATURE_ID])
      expect(summonPass(store, summoned)).toEqual([])
      expect(summonPass(store, summoned)).toEqual([])
      expect(store.getState().collection.size).toBe(sizeBefore + 1)
    })

    it('does not summon a creature below 100%, or one whose id is already owned', () => {
      const store = freshStore()
      store.setState({
        soulProgress: new Map([
          [FIRST_CREATURE_ID, 95],
          [SORCERER_STARTER.id, 100],
        ]),
      })
      const summoned = new Set<string>([SORCERER_STARTER.id])
      const sizeBefore = store.getState().collection.size
      expect(summonPass(store, summoned)).toEqual([])
      expect(store.getState().collection.size).toBe(sizeBefore)
    })
  })

  describe('failed-push rule (ASSUMPTION 97)', () => {
    it('pushes to deepestFloor + 1 after a clear', () => {
      const p = advanceProgress({ ...INITIAL_PROGRESS, deepestFloor: 4 }, 5, 'push', true)
      expect(p.deepestFloor).toBe(5)
      expect(nextRun(p)).toEqual({ floor: 6, kind: 'push' })
    })

    it('re-farms deepestFloor after a failed push', () => {
      const p = advanceProgress(
        { ...INITIAL_PROGRESS, deepestFloor: 4 },
        5,
        'push',
        false,
      )
      expect(p.deepestFloor).toBe(4)
      expect(nextRun(p)).toEqual({ floor: 4, kind: 'farm' })
    })

    it('retries floor 1 after a failed floor-1 push (deepestFloor is 0)', () => {
      const p = advanceProgress(INITIAL_PROGRESS, 1, 'push', false)
      expect(nextRun(p)).toEqual({ floor: 1, kind: 'push' })
    })

    it('pushes again after a farm run, whatever its result', () => {
      let p = advanceProgress({ ...INITIAL_PROGRESS, deepestFloor: 4 }, 5, 'push', false)
      p = advanceProgress(p, 4, 'farm', false)
      expect(nextRun(p)).toEqual({ floor: 5, kind: 'push' })
    })

    it('a floor-1 failure in a real store run leads to a floor-1 run next', () => {
      // Seed 1 sorcerer with a level-1 party fails floor 1 or clears it; either way the run
      // sequence must follow the rule, never call descend(0).
      const result = runSeed('sorcerer', 1, { seeds: [1], runCap: 4 })
      for (let i = 0; i < result.runs.length - 1; i++) {
        const run = result.runs[i]!
        const next = result.runs[i + 1]!
        if (run.floor === 1 && !run.cleared && run.kind === 'push') {
          expect(next.floor).toBe(1)
        }
      }
      expect(result.runs[0]!.floor).toBe(1)
    })
  })

  describe('hard wall and the stop rule (ASSUMPTION 98)', () => {
    it('records the first wall floor at the 5th failed push, re-farm runs not resetting the count', () => {
      let p = { ...INITIAL_PROGRESS, deepestFloor: 2 }
      for (let i = 1; i <= WALL_FAILED_PUSHES; i++) {
        expect(p.firstWallFloor).toBeNull()
        p = advanceProgress(p, 3, 'push', false)
        if (i < WALL_FAILED_PUSHES) p = advanceProgress(p, 2, 'farm', true)
      }
      expect(p.failedPushes[3]).toBe(5)
      expect(p.firstWallFloor).toBe(3)
    })

    it('keeps going after a wall, and keeps the FIRST wall floor', () => {
      let p = { ...INITIAL_PROGRESS, deepestFloor: 2 }
      for (let i = 0; i < WALL_FAILED_PUSHES; i++)
        p = advanceProgress(p, 3, 'push', false)
      expect(stopReason(p, 30, 400)).toBeNull()
      p = advanceProgress(p, 3, 'push', true)
      for (let i = 0; i < WALL_FAILED_PUSHES; i++)
        p = advanceProgress(p, 4, 'push', false)
      expect(p.firstWallFloor).toBe(3)
      expect(p.failedPushes[4]).toBe(5)
      expect(stopReason(p, 30, 400)).toBeNull()
    })

    it('a farm failure is not a failed push', () => {
      const p = advanceProgress(
        { ...INITIAL_PROGRESS, deepestFloor: 2 },
        2,
        'farm',
        false,
      )
      expect(p.failedPushes).toEqual({})
      expect(p.lastRunFailedPush).toBe(false)
    })

    it('stops with `frontier` on clearing the frontier floor and `cap` at the run cap', () => {
      expect(
        stopReason({ ...INITIAL_PROGRESS, deepestFloor: 30, runs: 5 }, 30, 400),
      ).toBe('frontier')
      expect(
        stopReason({ ...INITIAL_PROGRESS, deepestFloor: 12, runs: 400 }, 30, 400),
      ).toBe('cap')
      expect(
        stopReason({ ...INITIAL_PROGRESS, deepestFloor: 12, runs: 399 }, 30, 400),
      ).toBeNull()
    })

    it('frontier wins when both apply', () => {
      expect(
        stopReason({ ...INITIAL_PROGRESS, deepestFloor: 30, runs: 400 }, 30, 400),
      ).toBe('frontier')
    })

    it('a seed run with a small cap reports `cap` and exactly that many runs', () => {
      const result = runSeed('brute', 1, { seeds: [1], runCap: 3 })
      expect(result.stop).toBe('cap')
      expect(result.runs).toHaveLength(3)
    })
  })

  describe('party order (ASSUMPTION 99)', () => {
    it('level descending, then ordinal ascending, top six', () => {
      const collection = collectionOf(
        instance(0, 3),
        instance(1, 5),
        instance(2, 3),
        instance(3, 5),
        instance(4, 1),
        instance(5, 4),
        instance(6, 1),
        instance(7, 2),
      )
      // Levels: 5(inst-1) 5(inst-3) 4(inst-5) 3(inst-0) 3(inst-2) 2(inst-7) | 1s left out.
      expect(orderedParty(collection).map(String)).toEqual([
        'inst-1',
        'inst-3',
        'inst-5',
        'inst-0',
        'inst-2',
        'inst-7',
      ])
    })

    it('applyPartyOrder sets slots 0-5 through setPartySlot, dropping the rest', () => {
      const store = freshStore()
      const collection = collectionOf(
        ...[0, 1, 2, 3, 4, 5, 6].map((n) => instance(n, n === 6 ? 9 : 1)),
      )
      store.setState({ collection })
      applyPartyOrder(store)
      expect(store.getState().activeParty.map(String)).toEqual([
        'inst-6',
        'inst-0',
        'inst-1',
        'inst-2',
        'inst-3',
        'inst-4',
      ])
    })
  })

  describe('functional perks and the greedy buy (ASSUMPTION 100)', () => {
    const effect = {
      category: 'action-instance',
      actionKind: 'cast',
      powerPercent: 100,
    } as const
    const synthetic: Specialization = {
      id: 'synthetic',
      name: 'Synthetic',
      starterCreatureId: SORCERER_STARTER.id,
      perks: [
        { id: 'inert', name: 'Inert', maxLevel: 2, costPerLevel: 10, effects: [] },
        { id: 'big', name: 'Big', maxLevel: 3, costPerLevel: 100, effects: [effect] },
        { id: 'small', name: 'Small', maxLevel: 1, costPerLevel: 50, effects: [effect] },
      ],
    }

    it('isFunctionalPerk is the non-empty max-level effect rule', () => {
      expect(isFunctionalPerk(synthetic.perks[0]!)).toBe(false)
      expect(isFunctionalPerk(synthetic.perks[1]!)).toBe(true)
    })

    it('fills each functional perk in data order, skipping inert ones', () => {
      expect(planPerkLevels(synthetic, 0)).toEqual([])
      // 350: big 3 (300), small 1 (50).
      expect(planPerkLevels(synthetic, 350)).toEqual([
        { perkId: 'big', level: 3 },
        { perkId: 'small', level: 1 },
      ])
      // 250: big 2 (200), small 1 (50).
      expect(planPerkLevels(synthetic, 250)).toEqual([
        { perkId: 'big', level: 2 },
        { perkId: 'small', level: 1 },
      ])
      // 120: big 1 (100); 20 left is below small's 50.
      expect(planPerkLevels(synthetic, 120)).toEqual([{ perkId: 'big', level: 1 }])
      // 40: nothing affordable.
      expect(planPerkLevels(synthetic, 40)).toEqual([])
    })

    it('applyPerkPlan refunds and re-buys from scratch through the store, never an inert perk', () => {
      const store = freshStore()
      store.setState({ bossesCleared: new Set(['a', 'b', 'c']) })
      applyPerkPlan(store)
      const first = new Map(store.getState().perkSpend)
      expect(first.size).toBeGreaterThan(0)
      for (const perkId of first.keys()) {
        const perk = SORCERER.perks.find((p) => p.id === perkId)!
        expect(resolvePerkEffects(perk, perk.maxLevel).length).toBeGreaterThan(0)
      }
      const spent = [...first].reduce(
        (sum, [id, level]) =>
          sum + level * SORCERER.perks.find((p) => p.id === id)!.costPerLevel,
        0,
      )
      expect(spent).toBeLessThanOrEqual(300)
      // Re-applying from a stale spend gives the same result (refund + re-buy from scratch).
      store.setState({ perkSpend: new Map([['stale-perk', 1]]) })
      applyPerkPlan(store)
      expect(store.getState().perkSpend).toEqual(first)
    })
  })

  // ---- the probe (ASSUMPTION 101) ----

  describe('probe creature and script', () => {
    it('picks the highest-level party instance holding Pacify; ties go to the lower ordinal', () => {
      const a = instance(2, 4, ['pacify'])
      const b = instance(1, 4, [null, 'pacify'])
      const c = instance(3, 9, ['fireball'])
      const d = instance(4, 3, ['pacify'])
      const state = {
        collection: collectionOf(a, b, c, d),
        activeParty: [a.id, b.id, c.id, d.id, null, null],
      }
      // c holds no Pacify; a and b tie at level 4; inst-1 (b) has the lower ordinal.
      expect(pickProbeCreature(state)?.instanceId).toBe(b.id)
    })

    it('ignores instances outside the active party, and is null with no Pacify holder', () => {
      const a = instance(1, 9, ['pacify'])
      const b = instance(2, 1, ['fireball'])
      expect(
        pickProbeCreature({
          collection: collectionOf(a, b),
          activeParty: [b.id, null, null, null, null, null],
        }),
      ).toBeNull()
    })

    it('counts the creature innate spells before the stored gem index', () => {
      const innate = innateSpellCount(SORCERER_STARTER)
      expect(innate).toBeGreaterThan(0)
      const a = instance(1, 1, [null, null, 'pacify'])
      const choice = pickProbeCreature({
        collection: collectionOf(a),
        activeParty: [a.id, null, null, null, null, null],
      })
      expect(choice?.castSlot).toBe(innate + 2)
    })

    it('the probe script keeps the creature role: Pacify first, the stock rules after', () => {
      const scripts = buildSimScripts()
      const probeId = probeScriptId('caster', 2)
      const probe = scripts.get(probeId)!
      const base = STOCK_SCRIPTS_BY_ID.get('caster')!
      expect(probe.rules[0]).toEqual({
        condition: { kind: 'always' },
        action: { kind: 'cast', gemSlot: 2 },
        targeting: { kind: 'highest-hp-enemy' },
      })
      expect(probe.rules.slice(1)).toEqual(base.rules)
      expect(probe.rules).toHaveLength(base.rules.length + 1)
    })

    it('the Seer qualifies on a fresh sorcerer game', () => {
      const store = freshStore()
      const choice = pickProbeCreature(store.getState())
      expect(choice).not.toBeNull()
    })
  })

  describe('boss-run restore and the probe never editing gems (ASSUMPTION 101)', () => {
    it('restores the state exactly, so the policy run fights the identical floor', () => {
      const store = atBossFloor()
      const before = store.getState()
      const probe = runProbe(store, 10)
      expect(probe).not.toBeNull()
      const after = store.getState()
      expect(after.runCounter).toBe(before.runCounter)
      expect(after.deepestFloor).toBe(before.deepestFloor)
      expect(after.bossesCleared).toEqual(before.bossesCleared)
      expect(after.collection).toEqual(before.collection)
      expect(after.soulProgress).toEqual(before.soulProgress)
      const policy = store.getState().descend(10)
      expect(policy.ok).toBe(true)
      if (!policy.ok || probe === null) return
      const probeEnemies = firstRoundEnemyIds(probe.events)
      expect(probeEnemies.length).toBeGreaterThan(0)
      expect(firstRoundEnemyIds(policy.outcome.events)).toEqual(probeEnemies)
    })

    it('the probe run really uses the probe script on the probe creature, gems untouched', () => {
      const store = atBossFloor()
      const original = store.getState()
      const choice = pickProbeCreature(original)!
      const seen: { scriptId: string | null; gems: readonly (string | null)[] }[] = []
      const realSetState = store.setState.bind(store)
      store.setState = ((partial: unknown, replace?: unknown) => {
        const next =
          typeof partial === 'function'
            ? undefined
            : (partial as { collection?: Map<Instance['id'], Instance> })
        const inst = next?.collection?.get(choice.instanceId)
        if (inst) seen.push({ scriptId: inst.scriptId, gems: inst.gems })
        return (realSetState as (p: unknown, r?: unknown) => void)(partial, replace)
      }) as typeof store.setState
      const probe = runProbe(store, 10)!
      // Two writes: the probe's script swap, then the restore of the snapshot.
      expect(seen).toHaveLength(2)
      const originalInstance = original.collection.get(choice.instanceId)!
      expect(seen[0]!.scriptId).toBe(probeScriptId(choice.baseScriptId, choice.castSlot))
      expect(seen[0]!.gems).toEqual(originalInstance.gems)
      expect(seen[1]!.scriptId).toBe(originalInstance.scriptId)
      // The probe's first rule fires on the creature's first turn: a SpellCast of that slot.
      const casts = probe.events.filter(
        (e): e is Extract<CombatEvent, { type: 'SpellCast' }> =>
          e.type === 'SpellCast' &&
          e.casterId.startsWith(`${SORCERER_STARTER.id}-player-`),
      )
      expect(casts.length).toBeGreaterThan(0)
      expect(casts[0]!.gemSlot).toBe(choice.castSlot)
    })

    it('is n/a when the party has no Pacify holder', () => {
      const store = atBossFloor()
      const state = store.getState()
      const stripped = new Map(state.collection)
      for (const [id, inst] of stripped)
        stripped.set(id, { ...inst, gems: [null, null, null] })
      store.setState({ collection: stripped })
      expect(runProbe(store, 10)).toBeNull()
    })
  })

  // ---- event analysis on hand-built lists ----

  describe('stat-modifier stack attribution (ASSUMPTION 103)', () => {
    const A = cid('a-player-0')
    const B = cid('b-player-1')
    const C = cid('c-player-2')
    const mod = (source: typeof A, target: typeof A): CombatEvent => ({
      type: 'StatModifierApplied',
      sourceId: source,
      targetId: target,
      stat: 'defence',
      factor: 1.35,
      effectiveBefore: 10,
      effectiveAfter: 14,
    })
    const trig = (source: typeof A, effectId: string): CombatEvent => ({
      type: 'TriggerFired',
      sourceId: source,
      hook: 'on-provoke',
      effectId,
    })
    const events: CombatEvent[] = [
      { type: 'FightStarted' },
      { type: 'RoundStarted', round: 1 },
      { type: 'TurnStarted', creatureId: A },
      trig(A, 'rally'), // marker[A] = rally
      mod(A, B), // rally|B = 1
      trig(A, 'rally'),
      mod(A, B), // rally|B = 2
      mod(A, C), // marker still rally -> rally|C = 1
      { type: 'SpellCast', targetShape: 'single', casterId: A, gemSlot: 0, targetId: B },
      mod(A, B), // marker[A] = (spell) -> (spell)|B = 1
      { type: 'TurnEnded', creatureId: A }, // markers clear
      mod(A, B), // no marker -> (unattributed)|B = 1
      { type: 'TurnStarted', creatureId: B },
      mod(B, B), // B has no marker -> (unattributed)|B = 2
      { type: 'TurnEnded', creatureId: B },
      { type: 'FightEnded', result: 'win' },
    ]

    it('attributes to the nearest preceding TriggerFired or SpellCast of the same source', () => {
      const result = attributeStatModifiers(events)
      const get = (target: string, attribution: string) =>
        result.stacks.find((s) => s.targetId === target && s.attribution === attribution)
          ?.count
      expect(get(B, 'rally')).toBe(2)
      expect(get(C, 'rally')).toBe(1)
      expect(get(B, '(spell)')).toBe(1)
      expect(get(B, '(unattributed)')).toBe(2)
      // 6 StatModifierApplied events, 2 of them unattributed.
      expect(result.applications).toBe(6)
      expect(result.unattributed).toBe(2)
    })

    it('a marker never leaks across turns', () => {
      const leak: CombatEvent[] = [
        { type: 'TurnStarted', creatureId: A },
        trig(A, 'rally'),
        { type: 'TurnEnded', creatureId: A },
        { type: 'TurnStarted', creatureId: A },
        mod(A, B),
      ]
      expect(attributeStatModifiers(leak).stacks).toEqual([
        { targetId: B, attribution: '(unattributed)', direction: 'growth', count: 1 },
      ])
    })

    it('analyzeFight reports the largest stack per side', () => {
      const ctx = {
        unicornId: null,
        bossId: null,
        bossTemplateId: null,
        bossTraitIds: [],
        lockScopes: new Map(),
      }
      const metrics = analyzeFight(events, ctx)
      // Every creature here is a player-side id, so the enemy side has no stack.
      expect(metrics.largestStacks['growth-player']).toEqual({
        targetId: B,
        attribution: 'rally',
        direction: 'growth',
        count: 2,
      })
      expect(metrics.largestStacks['growth-enemy']).toBeNull()
      expect(metrics.result).toBe('win')
    })
  })

  describe('boss locked-turn share (ASSUMPTION 102)', () => {
    const BOSS = cid('boss-enemy-0')
    const ALLY = cid('ally-enemy-1')
    const applied = (target: typeof BOSS, statusId: string): CombatEvent => ({
      type: 'StatusApplied',
      targetId: target,
      statusId,
      stacks: 1,
      duration: 3,
    })
    const expired = (statusId: string): CombatEvent => ({
      type: 'StatusExpired',
      creatureId: BOSS,
      statusId,
    })
    const turn = (id: typeof BOSS): CombatEvent => ({
      type: 'TurnStarted',
      creatureId: id,
    })
    const scopes = lockScopesByStatus(STATUS_REGISTRY)

    const events: CombatEvent[] = [
      turn(BOSS), // 1: no status
      applied(BOSS, 'pacified'),
      turn(BOSS), // 2: pacified (attack)
      applied(BOSS, 'stun'),
      turn(BOSS), // 3: stun (all) + pacified (attack)
      expired('stun'),
      turn(BOSS), // 4: pacified (attack)
      expired('pacified'),
      turn(BOSS), // 5: none
      applied(ALLY, 'pacified'), // another creature: not the boss
      turn(ALLY), // not a boss turn
      applied(BOSS, 'silenced'),
      { type: 'CreatureDied', creatureId: BOSS }, // death clears the holds
      turn(BOSS), // 6: dead, none held
    ]

    it('counts turns started while holding any action-lock status, by scope', () => {
      const stats = bossLockStats(events, BOSS, scopes)
      // Boss turns: 6. Locked: 2, 3, 4 = 3. Scopes: attack on 2, 3, 4 = 3; all on 3 = 1.
      expect(stats.bossTurns).toBe(6)
      expect(stats.lockedTurns).toBe(3)
      expect(stats.lockedByScope).toEqual({ all: 1, attack: 3, cast: 0 })
      // Pacified landed on the boss once (the ally's application is not counted).
      expect(stats.pacifyLands).toBe(1)
    })

    it('reads lock statuses from the registry, not from hard-coded ids', () => {
      expect(scopes.has('stun')).toBe(true)
      expect(scopes.has('sleep')).toBe(true)
      expect(scopes.get('silenced')).toEqual(['cast'])
      expect(scopes.get('pacified')).toEqual(['attack'])
      expect(scopes.has('poison')).toBe(false)
      const dazed: StatusDef = {
        statusId: 'dazed',
        cap: 1,
        polarity: 'debuff',
        defaultDuration: 2,
        effects: [{ category: 'action-lock', scope: 'all' }],
      }
      const custom = lockScopesByStatus(new Map([...STATUS_REGISTRY, ['dazed', dazed]]))
      const stats = bossLockStats(
        [applied(BOSS, 'dazed'), turn(BOSS), turn(BOSS)],
        BOSS,
        custom,
      )
      expect(stats.lockedTurns).toBe(2)
      // The stock registry doesn't know 'dazed', so the same events lock nothing.
      expect(
        bossLockStats([applied(BOSS, 'dazed'), turn(BOSS)], BOSS, scopes).lockedTurns,
      ).toBe(0)
    })

    it('splits fights at FightStarted', () => {
      const two: CombatEvent[] = [
        { type: 'FightStarted' },
        turn(BOSS),
        { type: 'FightStarted' },
        turn(BOSS),
        turn(ALLY),
      ]
      expect(splitFights(two).map((f) => f.length)).toEqual([2, 3])
    })
  })

  it('noteBossVisit: first visit per floor only (ASSUMPTION 102)', () => {
    const seen = new Set<number>()
    expect(noteBossVisit(seen, 10)).toBe(true)
    expect(noteBossVisit(seen, 10)).toBe(false)
    expect(noteBossVisit(seen, 20)).toBe(true)
    expect(noteBossVisit(seen, 10)).toBe(false)
  })

  describe('boss rows: first visits vs all visits, n/a counts (ASSUMPTION 102)', () => {
    const metrics = (locked: number, turns: number, lands: number) => ({
      bossTurns: turns,
      lockedTurns: locked,
      lockedByScope: { all: 0, attack: locked, cast: 0 },
      pacifyLands: lands,
      bossTemplateId: 'broodmother',
      attributedToBossTrait: 0,
      peakAttack: 0,
    })
    const visit = (firstVisit: boolean, probed: boolean): BossVisit => ({
      floor: 10,
      firstVisit,
      bossTemplateId: 'broodmother',
      policy: { cleared: false, metrics: metrics(0, 10, 0) },
      probe: probed ? { cleared: true, metrics: metrics(6, 10, 2) } : null,
      policyDeaths: 3,
    })
    // seed A: first visit probed, then a revisit probed; seed B: first visit n/a.
    const rows = buildBossRows([
      { bossVisits: [visit(true, true), visit(false, true)] },
      { bossVisits: [visit(true, false)] },
    ])
    const first = rows.find((r) => r.scope === 'first-visit')!
    const all = rows.find((r) => r.scope === 'all-visits')!

    it('first-visit rows count only first visits', () => {
      expect(first.visits).toBe(2)
      expect(first.probeAvailable).toBe(1)
      expect(first.probeNotAvailable).toBe(1)
      expect(first.probeClears).toBe(1)
      expect(first.probeLockedTurns).toBe(6)
      expect(first.probeBossTurns).toBe(10)
    })

    it('all-visit rows count every visit', () => {
      expect(all.visits).toBe(3)
      expect(all.probeAvailable).toBe(2)
      expect(all.probeNotAvailable).toBe(1)
      expect(all.probeLockedTurns).toBe(12)
      expect(all.probePacifyLands).toBe(4)
      expect(all.probeRunsWithPacifyLand).toBe(2)
      expect(all.policyLockedTurns).toBe(0)
      expect(all.policyBossTurns).toBe(30)
    })
  })

  // ---- PR #84 fixes: pin the report computation (F1-F6) ----

  describe('report computation on hand-built seed results (F1.1, F2, F4, F5)', () => {
    const zeroUnicorn = {
      fightsWithUnicorn: 0,
      winsWithUnicorn: 0,
      fightsWithoutUnicorn: 0,
      winsWithoutUnicorn: 0,
      revives: 0,
      fightsWithRevive: 0,
      maxRevivesInFight: 0,
      fightsAtCap: 0,
    }
    function seedResult(o: Partial<SeedResult> = {}): SeedResult {
      return {
        specId: 'sorcerer',
        seed: 1,
        stop: 'cap',
        runs: [],
        deepestFloor: 0,
        firstWallFloor: null,
        failedPushes: {},
        firstTryFloor1Clear: false,
        clearsToFirstSoul: null,
        runsToFirstSoul: null,
        partySizeAfterSession: null,
        deepestAfterSession: null,
        reachedFloor5InSession: false,
        fights: 0,
        draws: 0,
        capDraws: 0,
        largestStacks: NO_STACKS,
        unattributed: 0,
        applications: 0,
        unicorn: zeroUnicorn,
        bossVisits: [],
        ...o,
      }
    }
    const run = (index: number, floor: number, cleared: boolean): RunRecord => ({
      index,
      floor,
      kind: 'push',
      cleared,
      partyLevels: [1],
      fightsRun: 1,
      fightsWon: cleared ? 1 : 0,
    })
    const report = (results: SeedResult[]) =>
      buildSpecReport('sorcerer', results, 30, DEFAULT_BALANCE_CONFIG)
    const many = (n: number, o: (i: number) => Partial<SeedResult>) =>
      Array.from({ length: n }, (_, i) => seedResult({ seed: i + 1, ...o(i) }))

    it('T1: counts first-try clears and reports the rate', () => {
      const r = report(many(10, (i) => ({ firstTryFloor1Clear: i < 4 })))
      expect(r.t1).toEqual({ firstTryClears: 4, seeds: 10 })
      expect(r.thresholds.floor1ClearRatePct).toBe(40)
    })

    it('T2: lists the completing seeds only and counts the others', () => {
      const r = report([
        seedResult({ clearsToFirstSoul: 1, runsToFirstSoul: 3 }),
        seedResult({}),
        seedResult({ clearsToFirstSoul: 2, runsToFirstSoul: 7 }),
      ])
      expect(r.t2).toEqual({
        clearsToFirstSoul: [1, 2],
        runsToFirstSoul: [3, 7],
        seedsWithoutSoul: 1,
      })
    })

    it('T3: counts party sizes, skipping seeds that ended before the session', () => {
      const r = report(
        [6, 6, 4, null].map((n) => seedResult({ partySizeAfterSession: n })),
      )
      expect(r.t3.partySizeCounts).toEqual({ 6: 2, 4: 1 })
    })

    it('T4: stop reasons, first-wall floors, and a wall AT floor 10 is not before it', () => {
      const r = report([
        seedResult({ stop: 'frontier', firstWallFloor: 3, failedPushes: { 3: 5 } }),
        seedResult({ stop: 'cap', firstWallFloor: 3, failedPushes: { 3: 6, 4: 1 } }),
        seedResult({ stop: 'cap', firstWallFloor: 10, failedPushes: { 10: 5 } }),
        seedResult({ stop: 'cap', firstWallFloor: null }),
      ])
      expect(r.t4.stopReasons).toEqual({ frontier: 1, cap: 3 })
      expect(r.t4.firstWallFloors).toEqual({ 3: 2, 10: 1 })
      expect(r.t4.seedsWalled).toBe(3)
      // Walls at 3, 3 and 10: only the two at floor 3 are below floor 10.
      expect(r.t4.seedsWalledBeforeFloor10).toBe(2)
      expect(r.t4.failedPushesByFloor).toEqual({ 3: 11, 4: 1, 10: 5 })
    })

    it("F5: the walls' size, per seed, below floor 10 and to the first floor-10 clear", () => {
      const r = report([
        // Worst below 10: max(7 at floor 3, 2 at floor 9) = 7 (floor 10's own 20 is excluded).
        seedResult({
          failedPushes: { 3: 7, 9: 2, 10: 20 },
          runs: [run(1, 1, true), run(42, 10, true)],
        }),
        // No failed pushes: 0. Fought floor 10 but never cleared it.
        seedResult({ failedPushes: {}, runs: [run(1, 10, false)] }),
        // Worst 13 at floor 5. First floor-10 clear on run 12.
        seedResult({
          failedPushes: { 5: 13 },
          runs: [run(12, 10, true), run(13, 10, true)],
        }),
      ])
      // Worst-below-10 per seed: 7, 0, 13 -> sorted 0, 7, 13.
      expect(r.t4.worstFailedPushesBelow10).toEqual({ min: 0, median: 7, max: 13 })
      // First floor-10 clears at runs 42 and 12 -> 12, 42: median 27; one seed never.
      expect(r.t4.runsToFirstFloor10Clear).toEqual({
        spread: { min: 12, median: 27, max: 42 },
        neverClearing: 1,
      })
    })

    it('F5: spreadOf', () => {
      expect(spreadOf([])).toBeNull()
      expect(spreadOf([5, 1, 3, 2])).toEqual({ min: 1, median: 2.5, max: 5 })
    })

    describe('ASSUMPTION 107 thresholds, both sides of each boundary', () => {
      it('floor 1: 80% exactly passes, below fails, no seeds fail', () => {
        const at = (clears: number) =>
          computeThresholds(many(40, (i) => ({ firstTryFloor1Clear: i < clears })))
        expect(at(32).floor1ClearRatePct).toBe(80)
        expect(at(32).floor1Pass).toBe(true)
        expect(at(31).floor1Pass).toBe(false)
        expect(at(0).floor1Pass).toBe(false)
        expect(computeThresholds([]).floor1Pass).toBe(false)
      })

      it('first soul: a median of 30 floor runs passes, 31 fails', () => {
        const at = (runs: number) =>
          computeThresholds(many(40, () => ({ runsToFirstSoul: runs })))
        expect(at(30).medianRunsToFirstSoul).toBe(30)
        expect(at(30).firstSoulPass).toBe(true)
        expect(at(31).firstSoulPass).toBe(false)
      })

      it('first soul: never-completing seeds count as infinite (F2)', () => {
        // 40 seeds: 24 complete at 1..24 floor runs, 16 never do. Sorted, the 1-based positions
        // 20 and 21 (the two middles of 40) hold 20 and 21, so the median is 20.5. A median over
        // the completing seeds alone would be 12.5.
        const sixteenNever = computeThresholds(
          many(40, (i) => ({ runsToFirstSoul: i < 24 ? i + 1 : null })),
        )
        expect(sixteenNever.medianRunsToFirstSoul).toBe(20.5)
        expect(sixteenNever.seedsWithoutSoul).toBe(16)
        expect(sixteenNever.firstSoulPass).toBe(true)
        // 20 of 40 never complete: position 21 is infinite, so the median is infinite and fails.
        const twentyNever = computeThresholds(
          many(40, (i) => ({ runsToFirstSoul: i < 20 ? i + 1 : null })),
        )
        expect(twentyNever.medianRunsToFirstSoul).toBe(Infinity)
        expect(twentyNever.firstSoulPass).toBe(false)
      })

      it('medianOfSeeds treats null as +Infinity, odd and even counts', () => {
        expect(medianOfSeeds([3, null, 1])).toBe(3)
        expect(medianOfSeeds([1, null, null])).toBe(Infinity)
        expect(medianOfSeeds([1, 2, 3, 4])).toBe(2.5)
        expect(medianOfSeeds([])).toBe(Infinity)
      })

      it('floor 5: one seed passes, none fails', () => {
        const one = computeThresholds(
          many(5, (i) => ({ reachedFloor5InSession: i === 3 })),
        )
        expect(one.seedsReachingFloor5InSession).toBe(1)
        expect(one.floor5Pass).toBe(true)
        const none = computeThresholds(many(5, () => ({ reachedFloor5InSession: false })))
        expect(none.floor5Pass).toBe(false)
      })
    })

    it('the spec report carries the thresholds computed over its seeds', () => {
      const results = many(4, (i) => ({
        firstTryFloor1Clear: i < 3,
        runsToFirstSoul: 5,
        reachedFloor5InSession: i === 0,
      }))
      expect(report(results).thresholds).toEqual(computeThresholds(results))
    })

    it('R2: the spec fold keeps the larger stack per bucket, with its seed; a tie keeps the first seed', () => {
      const stack = (
        targetId: string,
        direction: 'growth' | 'shred',
        count: number,
        floor: number,
      ) => ({ targetId, attribution: 'trait', direction, count, floor })
      const r = report([
        seedResult({
          seed: 3,
          largestStacks: {
            ...NO_STACKS,
            'growth-player': stack('a-player-0', 'growth', 5, 2),
            'shred-enemy': stack('x-enemy-0', 'shred', 9, 4),
          },
        }),
        seedResult({
          seed: 7,
          largestStacks: {
            ...NO_STACKS,
            'growth-player': stack('b-player-1', 'growth', 8, 6),
            'growth-enemy': stack('y-enemy-1', 'growth', 3, 1),
            'shred-player': stack('c-player-2', 'shred', 2, 5),
          },
        }),
        seedResult({
          seed: 9,
          largestStacks: {
            ...NO_STACKS,
            'growth-player': stack('d-player-3', 'growth', 8, 7), // tie with seed 7
            'shred-enemy': stack('z-enemy-2', 'shred', 1, 3), // smaller than seed 3's
          },
        }),
      ])
      expect(r.largestStacks['growth-player']).toEqual({
        ...stack('b-player-1', 'growth', 8, 6),
        seed: 7,
      })
      expect(r.largestStacks['growth-enemy']).toEqual({
        ...stack('y-enemy-1', 'growth', 3, 1),
        seed: 7,
      })
      expect(r.largestStacks['shred-player']).toEqual({
        ...stack('c-player-2', 'shred', 2, 5),
        seed: 7,
      })
      expect(r.largestStacks['shred-enemy']).toEqual({
        ...stack('x-enemy-0', 'shred', 9, 4),
        seed: 3,
      })
    })

    it('the text report prints "never" for an infinite median, and the walls and per-side stacks', () => {
      const text = formatReport({
        seeds: [1],
        runCap: 400,
        frontier: 30,
        specs: [report([seedResult({})])],
      })
      expect(text).toContain('never')
      expect(text).toContain("T4 walls' size")
      expect(text).toContain('GROWTH stack')
      expect(text).toContain('SHRED stack')
    })
  })

  it("R2: runSeed folds each fight's stacks into the seed's maxima (the wiring, on a real run)", () => {
    // Enemy traits stack growth (Ancient Growth, Hive Mind) from the first floors, so a few real
    // runs hold stacks. Each bucket's stack names a floor the seed actually fought and has the
    // direction its bucket says; every stack is on its bucket's side.
    const r = runSeed('brute', 1, { seeds: [1], runCap: 3 })
    const fought = new Set(r.runs.map((x) => x.floor))
    const filled = Object.entries(r.largestStacks).filter(([, v]) => v !== null)
    expect(filled.length).toBeGreaterThan(0)
    for (const [bucket, stack] of filled) {
      expect(fought.has(stack!.floor)).toBe(true)
      expect(stack!.count).toBeGreaterThan(0)
      const [direction, side] = bucket.split('-')
      expect(stack!.direction).toBe(direction)
      expect(stack!.targetId).toMatch(new RegExp(`-${side}-\\d+$`))
    }
  })

  describe('per-seed derivations hold on real runs (F1.2)', () => {
    for (const specId of SPECIALIZATIONS.map((s) => s.id)) {
      for (const seed of SMOKE_SEEDS) {
        it(`${specId} seed ${seed}: the session readings match the run records`, () => {
          const r = runSeed(specId, seed, {
            seeds: [seed],
            runCap: FIRST_SESSION_RUNS + 1,
          })
          expect(r.runs).toHaveLength(FIRST_SESSION_RUNS + 1)
          const session = r.runs.slice(0, FIRST_SESSION_RUNS)
          expect(r.runs[0]!.floor).toBe(1)
          expect(r.firstTryFloor1Clear).toBe(r.runs[0]!.cleared)
          if (r.runsToFirstSoul !== null) {
            const firstRuns = r.runs.slice(0, r.runsToFirstSoul)
            expect(r.clearsToFirstSoul).toBe(firstRuns.filter((x) => x.cleared).length)
          } else {
            expect(r.clearsToFirstSoul).toBeNull()
          }
          expect(r.deepestAfterSession).toBe(
            Math.max(0, ...session.filter((x) => x.cleared).map((x) => x.floor)),
          )
          // Run 11's party is the party after run 10's summon and re-order.
          expect(r.partySizeAfterSession).toBe(
            r.runs[FIRST_SESSION_RUNS]!.partyLevels.length,
          )
          expect(r.reachedFloor5InSession).toBe(
            session.some((x) => x.floor >= SESSION_TARGET_FLOOR),
          )
        })
      }
    }
  })

  describe('analyzeFight on hand-built events (F1.3, F6)', () => {
    const noCtx = {
      unicornId: null,
      bossId: null,
      bossTemplateId: null,
      bossTraitIds: [],
      lockScopes: new Map(),
    }
    const round = (n: number): CombatEvent => ({ type: 'RoundStarted', round: n })
    const ended = (result: 'win' | 'loss' | 'draw'): CombatEvent => ({
      type: 'FightEnded',
      result,
    })

    it('capDraw: a draw whose last round is ROUND_CAP, not a draw before it or a loss at it', () => {
      const atCap = analyzeFight([round(ROUND_CAP), ended('draw')], noCtx)
      expect(atCap.capDraw).toBe(true)
      expect(atCap.maxRound).toBe(ROUND_CAP)
      expect(analyzeFight([round(ROUND_CAP - 1), ended('draw')], noCtx).capDraw).toBe(
        false,
      )
      expect(analyzeFight([round(ROUND_CAP), ended('loss')], noCtx).capDraw).toBe(false)
    })

    it('Unicorn revives count only its own, and maxRevivesOnOne is per target', () => {
      const U = 'unicorn-player-1'
      const revive = (source: string, target: string): CombatEvent => ({
        type: 'Revived',
        sourceId: cid(source),
        targetId: cid(target),
        currentHp: 5,
      })
      const events = [
        revive(U, 'x-player-0'),
        revive(U, 'x-player-0'),
        revive(U, 'y-player-2'),
        revive('other-player-3', 'x-player-0'),
      ]
      const m = analyzeFight(events, { ...noCtx, unicornId: U })
      // The Unicorn revived twice + once; the other source's revive doesn't count.
      expect(m.unicornRevives).toBe(3)
      // x was revived 3 times in all (2 + 1), y once.
      expect(m.maxRevivesOnOne).toBe(3)
      expect(analyzeFight(events, noCtx).unicornRevives).toBeNull()
    })

    it("the boss's own trait: only its TriggerFired effect counts, peakAttack is the largest attack", () => {
      const BOSS = cid('boss-enemy-0')
      const ALLY = cid('ally-enemy-1')
      const trig = (effectId: string): CombatEvent => ({
        type: 'TriggerFired',
        sourceId: BOSS,
        hook: 'on-turn-end',
        effectId,
      })
      const mod = (
        target: typeof BOSS,
        stat: 'attack' | 'defence',
        after: number,
      ): CombatEvent => ({
        type: 'StatModifierApplied',
        sourceId: BOSS,
        targetId: target,
        stat,
        factor: 1.1,
        effectiveBefore: 1,
        effectiveAfter: after,
      })
      const events: CombatEvent[] = [
        { type: 'TurnStarted', creatureId: BOSS },
        trig('boss-trait'),
        mod(BOSS, 'attack', 120), // boss-trait on the boss: counts (1)
        mod(ALLY, 'attack', 500), // boss-trait on an ally: not on the boss, not counted
        mod(BOSS, 'attack', 150), // boss-trait on the boss: counts (2)
        trig('other-trait'),
        mod(BOSS, 'attack', 90), // another trait: not counted
        mod(BOSS, 'defence', 999), // not an attack modifier: not in peakAttack
        { type: 'TurnEnded', creatureId: BOSS },
      ]
      const m = analyzeFight(events, {
        ...noCtx,
        bossId: 'boss-enemy-0',
        bossTemplateId: 'boss',
        bossTraitIds: ['boss-trait'],
      })
      expect(m.boss?.attributedToBossTrait).toBe(2)
      // Largest `attack` effectiveAfter ON THE BOSS: 150 (the ally's 500 is not the boss's).
      expect(m.boss?.peakAttack).toBe(150)
    })

    describe('R1: growth and shred stacks are separate, per side', () => {
      const P = cid('p-player-0')
      const Q = cid('q-player-1')
      const E = cid('sparkeater-enemy-0')
      const trig = (source: typeof P, effectId: string): CombatEvent => ({
        type: 'TriggerFired',
        sourceId: source,
        hook: 'on-attack',
        effectId,
      })
      const mod = (source: typeof P, target: typeof P, factor: number): CombatEvent => ({
        type: 'StatModifierApplied',
        sourceId: source,
        targetId: target,
        stat: 'defence',
        factor,
        effectiveBefore: 10,
        effectiveAfter: 10 * factor,
      })
      const stack = (
        targetId: string,
        attribution: string,
        direction: 'growth' | 'shred',
        count: number,
      ): StackCount => ({ targetId, attribution, direction, count })

      it('a Gorge-shaped case (enemy source, player target, factor 0.9) is a player shred, never a player growth stack', () => {
        const m = analyzeFight(
          [{ type: 'TurnStarted', creatureId: E }, trig(E, 'gorge'), mod(E, P, 0.9)],
          noCtx,
        )
        expect(m.largestStacks['shred-player']).toEqual(stack(P, 'gorge', 'shred', 1))
        expect(m.largestStacks['growth-player']).toBeNull()
        expect(m.largestStacks['growth-enemy']).toBeNull()
        expect(m.largestStacks['shred-enemy']).toBeNull()
      })

      it('a Rallying-Cry-shaped case (player source, player targets, factor 1.35) is a player growth stack', () => {
        const m = analyzeFight(
          [
            { type: 'TurnStarted', creatureId: P },
            trig(P, 'rally'),
            mod(P, P, 1.35), // rally|P = 1
            mod(P, Q, 1.35), // rally|Q = 1
            trig(P, 'rally'),
            mod(P, P, 1.35), // rally|P = 2
          ],
          noCtx,
        )
        expect(m.largestStacks['growth-player']).toEqual(stack(P, 'rally', 'growth', 2))
        expect(m.largestStacks['shred-player']).toBeNull()
      })

      it("one trait with both directions in one fight (Gorge's real shape) lands in both buckets on the two creatures", () => {
        const events: CombatEvent[] = [
          { type: 'TurnStarted', creatureId: E },
          trig(E, 'gorge'),
          mod(E, E, 1.1), // the Sparkeater itself: growth on an enemy
          mod(E, P, 0.9), // the player creature it hit: shred on a player
          trig(E, 'gorge'),
          mod(E, E, 1.1),
          mod(E, P, 0.9),
        ]
        const m = analyzeFight(events, noCtx)
        expect(m.largestStacks['growth-enemy']).toEqual(stack(E, 'gorge', 'growth', 2))
        expect(m.largestStacks['shred-player']).toEqual(stack(P, 'gorge', 'shred', 2))
        expect(m.largestStacks['growth-player']).toBeNull()
        expect(m.largestStacks['shred-enemy']).toBeNull()
      })

      it('one target and one trait in both directions are two stacks, not one', () => {
        const events: CombatEvent[] = [
          { type: 'TurnStarted', creatureId: E },
          trig(E, 'odd'),
          mod(E, E, 1.1),
          mod(E, E, 0.9),
          mod(E, E, 0.9),
        ]
        expect(attributeStatModifiers(events).stacks).toEqual([
          stack(E, 'odd', 'growth', 1),
          stack(E, 'odd', 'shred', 2),
        ])
      })

      it('a factor of exactly 1 is in no bucket (it changes nothing), though it is an application', () => {
        const events: CombatEvent[] = [
          { type: 'TurnStarted', creatureId: P },
          trig(P, 'noop'),
          mod(P, P, 1),
        ]
        const attribution = attributeStatModifiers(events)
        expect(attribution.stacks).toEqual([])
        expect(attribution.applications).toBe(1)
        expect(analyzeFight(events, noCtx).largestStacks).toEqual(NO_STACKS)
      })
    })

    describe('R2: foldFightStacks keeps the larger stack per bucket', () => {
      const stack = (
        targetId: string,
        direction: 'growth' | 'shred',
        count: number,
      ): StackCount => ({ targetId, attribution: 'trait', direction, count })
      const fight = (
        largestStacks: Partial<FightMetrics['largestStacks']>,
      ): Pick<FightMetrics, 'largestStacks'> => ({
        largestStacks: { ...NO_STACKS, ...largestStacks },
      })

      it('over two fights the larger wins in each bucket, with the floor it came from; a tie keeps the first', () => {
        const first = fight({
          'growth-player': stack('a-player-0', 'growth', 5),
          'growth-enemy': stack('x-enemy-0', 'growth', 2),
          'shred-player': stack('b-player-1', 'shred', 9),
        })
        const second = fight({
          'growth-player': stack('c-player-2', 'growth', 7), // larger: replaces
          'growth-enemy': stack('y-enemy-1', 'growth', 2), // tie: the first stays
          'shred-player': stack('d-player-3', 'shred', 3), // smaller: ignored
          'shred-enemy': stack('z-enemy-2', 'shred', 4), // first in its bucket
        })
        const folded = foldFightStacks(foldFightStacks(NO_STACKS, first, 3), second, 4)
        expect(folded['growth-player']).toEqual({
          ...stack('c-player-2', 'growth', 7),
          floor: 4,
        })
        expect(folded['growth-enemy']).toEqual({
          ...stack('x-enemy-0', 'growth', 2),
          floor: 3,
        })
        expect(folded['shred-player']).toEqual({
          ...stack('b-player-1', 'shred', 9),
          floor: 3,
        })
        expect(folded['shred-enemy']).toEqual({
          ...stack('z-enemy-2', 'shred', 4),
          floor: 4,
        })
      })

      it('does not mutate the maxima it was given', () => {
        const start = foldFightStacks(
          NO_STACKS,
          fight({ 'growth-player': stack('a-player-0', 'growth', 1) }),
          1,
        )
        const snapshot = structuredClone(start)
        foldFightStacks(
          start,
          fight({ 'growth-player': stack('b-player-1', 'growth', 9) }),
          2,
        )
        expect(start).toEqual(snapshot)
      })
    })
  })

  describe('the live wiring: playFloorRun on the level-30, floor-9 store (F1.4)', () => {
    it('the ids the analysis keys on are the ids in the fight, and the counts match the events', () => {
      const store = atBossFloor()
      const played = playFloorRun(
        store,
        { ...INITIAL_PROGRESS, deepestFloor: 9 },
        new Set<number>(),
      )
      const bossId = played.context.bossId
      const unicornId = played.context.unicornId
      expect(bossId).not.toBeNull()
      expect(unicornId).toBe(`${UNICORN.id}-player-1`)
      const turnStarters = new Set(
        played.events.flatMap((e) => (e.type === 'TurnStarted' ? [e.creatureId] : [])),
      )
      expect(turnStarters.has(cid(bossId!))).toBe(true)
      expect(turnStarters.has(cid(unicornId!))).toBe(true)

      const visit = played.bossVisit!
      expect(visit.bossTemplateId).toBe(BIOMES[0]!.boss!.creature.id)
      expect(visit.firstVisit).toBe(true)
      expect(visit.policy.metrics!.bossTurns).toBeGreaterThan(0)
      expect(visit.probe).not.toBeNull()

      const wins = played.events.filter(
        (e) => e.type === 'FightEnded' && e.result === 'win',
      ).length
      // A level-30 party beats the floor-10 boss under any sane tuning; the precondition keeps
      // the equality below from passing on a lost fight (0 = 0).
      expect(wins).toBeGreaterThan(0)
      expect(played.run.fightsWon).toBe(wins)
      expect(played.run.fightsRun).toBe(played.fights.length)
      expect(played.run.floor).toBe(10)
    })

    it('the analysis names the boss of the biome the store fights, pins included (L2)', () => {
      // Pin floor 10 to the second biome: the store then fights ITS boss, so the analysis must
      // name that boss, not the one an empty-pins lookup would give.
      const store = atBossFloor()
      store.setState({ atlasPins: new Map([[10, BIOMES[1]!.id]]) })
      const played = playFloorRun(
        store,
        { ...INITIAL_PROGRESS, deepestFloor: 9 },
        new Set<number>(),
      )
      expect(played.bossVisit!.bossTemplateId).toBe(BIOMES[1]!.boss!.creature.id)
      expect(played.bossVisit!.bossTemplateId).not.toBe(BIOMES[0]!.boss!.creature.id)
      const turnStarters = played.events.flatMap((e) =>
        e.type === 'TurnStarted' ? [e.creatureId] : [],
      )
      expect(turnStarters).toContain(played.context.bossId)
    })

    it('bossContext names the biome boss and its traits, reading the store pins', () => {
      const ctx = bossContext(10, BIOMES, new Map(), 7, null)!
      expect(ctx.bossId).toBe(`${BIOMES[0]!.boss!.creature.id}-enemy-0`)
      expect(ctx.bossTraitIds).toEqual(BIOMES[0]!.boss!.creature.innateTraitIds)
      expect(bossContext(9, BIOMES, new Map(), 7, null)).toBeNull()
    })
  })

  describe('the probe cannot leak into the policy run, end to end (F3)', () => {
    function plain(state: object): object {
      return Object.fromEntries(
        Object.entries(state).filter(([, value]) => typeof value !== 'function'),
      )
    }

    it('probe then policy equals the policy alone: the outcome and every data field', () => {
      const withProbe = atBossFloor()
      const probe = runProbe(withProbe, 10)
      expect(probe).not.toBeNull()
      const a = withProbe.getState().descend(10)

      const alone = atBossFloor()
      const b = alone.getState().descend(10)

      expect(a).toEqual(b)
      expect(plain(withProbe.getState())).toEqual(plain(alone.getState()))
    })

    it('the probe twice from the same state gives identical events', () => {
      const store = atBossFloor()
      const first = runProbe(store, 10)!
      const second = runProbe(store, 10)!
      expect(second.events).toEqual(first.events)
      expect(second.cleared).toBe(first.cleared)
    })
  })
})
