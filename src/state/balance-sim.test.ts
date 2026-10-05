// Phase 4.1-H1: balance simulator tests. They assert determinism, report shape and the POLICY
// MECHANICS, never a balance value (ASSUMPTION 106), so the H2 tuning pass doesn't rewrite them.
// `npm run sim` (vitest --mode sim) runs the full report instead of these tests.

import { describe, expect, it } from 'vitest'
import { createCreatureId } from '../engine/ids'
import { contentFrontier } from '../engine/generation'
import type { StatusDef } from '../engine/effect-types'
import type { CombatEvent } from '../engine/types'
import { BIOMES } from '../data/biomes'
import { STOCK_SCRIPTS_BY_ID } from '../data/scripts'
import {
  resolvePerkEffects,
  SORCERER,
  SPECIALIZATIONS,
  type Specialization,
} from '../data/specializations'
import { SORCERER_STARTER } from '../data/species/starters'
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
  bossLockStats,
  buildBossRows,
  buildReport,
  buildSimScripts,
  firstRoundEnemyIds,
  formatReport,
  innateSpellCount,
  isFunctionalPerk,
  lockScopesByStatus,
  nextRun,
  noteBossVisit,
  orderedParty,
  pickProbeCreature,
  planPerkLevels,
  probeScriptId,
  runProbe,
  runSeed,
  SIM_SEEDS,
  SMOKE_SEEDS,
  splitFights,
  stopReason,
  summonPass,
  FIRST_SESSION_RUNS,
  INITIAL_PROGRESS,
  WALL_FAILED_PUSHES,
  type BossVisit,
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
    function atBossFloor() {
      const store = freshStore(7)
      // A level-30 party, so the Seer survives to take its first turn on the floor-10 boss.
      const collection = new Map(store.getState().collection)
      for (const [id, inst] of collection) collection.set(id, { ...inst, level: 30 })
      store.setState({ deepestFloor: 9, collection })
      return store
    }

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
        { targetId: B, attribution: '(unattributed)', count: 1 },
      ])
    })

    it('analyzeFight reports the largest stack', () => {
      const ctx = {
        unicornId: null,
        bossId: null,
        bossTemplateId: null,
        bossTraitIds: [],
        lockScopes: new Map(),
      }
      const metrics = analyzeFight(events, ctx)
      expect(metrics.largestStack).toEqual({
        targetId: B,
        attribution: 'rally',
        count: 2,
      })
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
})
