// Tests for the report additions (the floor-5 window, the matchup table and the per-trait
// stack fold). Like the base report tests they run on HAND-BUILT events and seed results and assert no
// balance value, so tuning doesn't rewrite them.

import { describe, expect, it } from 'vitest'
import type { CombatEvent } from '../engine/types'
import { bossLevel } from '../engine/curves'
import { DEFAULT_BALANCE_CONFIG } from '../data/balance'
import { ROT_SOVEREIGN } from '../data/species/rotcap-hollow'
import { rosterOf } from './__fixtures__/roster'
import {
  analyzeFight,
  buildFirstTryRows,
  buildMatchupRows,
  buildSpecReport,
  firstRunOnFloor,
  FLOOR5_WINDOW_RUNS,
  foldTraitStacks,
  formatReport,
  formatTally,
  fullPartyBySeedFloor,
  FULL_PARTY_BY_FLOOR,
  MATCHUP_MAX_FLOOR,
  NO_STACKS,
  NO_TRAIT_STACKS,
  reachedFloorInWindow,
  sidesOf,
  SOUL_BY_FLOOR,
  soulBySeedFloor,
  tallyReads,
  topTraitStacks,
  traitStackMaxima,
  type EarlyFight,
  type FightMetrics,
  type RunRecord,
  type BossVisit,
  type SeedResult,
  type StackCount,
} from './balance-sim'

const run = (index: number, floor: number, cleared: boolean): RunRecord => ({
  index,
  floor,
  kind: 'push',
  cleared,
  partyLevels: [1],
  fightsRun: 1,
  fightsWon: cleared ? 1 : 0,
  shape: { boss: false, fights: 1 },
})

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
    reachedFloor5InWindow: false,
    earlyFights: [],
    fights: 0,
    draws: 0,
    capDraws: 0,
    largestStacks: NO_STACKS,
    traitStacks: NO_TRAIT_STACKS,
    unattributed: 0,
    applications: 0,
    unicorn: zeroUnicorn,
    bossVisits: [],
    ...o,
  }
}

const fight = (
  floor: number,
  enemyTemplateIds: string[],
  result: 'win' | 'loss' | 'draw',
  capDraw = false,
): EarlyFight => ({ floor, enemyTemplateIds, result, capDraw })

describe('the floor-5 window', () => {
  it('the window is 20 floor runs', () => {
    expect(FLOOR5_WINDOW_RUNS).toBe(20)
  })

  const onFloors = (floors: number[]): RunRecord[] =>
    floors.map((floor, i) => run(i + 1, floor, true))

  it('floor 5 on run 15 counts (it would not in a 10-run window)', () => {
    const floors = Array.from({ length: 20 }, () => 1)
    floors[14] = 5
    expect(reachedFloorInWindow(onFloors(floors))).toBe(true)
  })

  it('floor 5 on run 20 counts, on run 21 does not', () => {
    const floors = Array.from({ length: 25 }, () => 1)
    floors[19] = 5
    expect(reachedFloorInWindow(onFloors(floors))).toBe(true)
    const late = Array.from({ length: 25 }, () => 1)
    late[20] = 5
    expect(reachedFloorInWindow(onFloors(late))).toBe(false)
  })

  it('a deeper floor counts, and a seed that stopped before the window is read as it stands', () => {
    expect(reachedFloorInWindow(onFloors([1, 2, 7]))).toBe(true)
    expect(reachedFloorInWindow(onFloors([1, 2, 3]))).toBe(false)
    expect(reachedFloorInWindow([])).toBe(false)
  })
})

describe('the matchup table', () => {
  it('analyzeFight lists the DISTINCT enemy templates of the whole enemy party', () => {
    const noCtx = {
      unicornId: null,
      bossId: null,
      bossTemplateId: null,
      bossTraitIds: [],
      lockScopes: new Map(),
    }
    // Only the hero and one weaver ever get a turn: the treant and the second weaver die before
    // their slots, so no TurnStarted names them. The roster is the party, not the brackets.
    const events: CombatEvent[] = [
      { type: 'FightStarted' },
      { type: 'RoundStarted', round: 1 },
      { type: 'TurnStarted', creatureId: 'a1' as never },
      { type: 'TurnStarted', creatureId: 'b1' as never },
      { type: 'FightEnded', result: 'win' },
    ]
    // Opaque ids: the templates come from each creature's origin, not from the id.
    const roster = rosterOf(
      ['a1'],
      [
        { id: 'b1', templateId: 'spider-weaver' },
        { id: 'b2', templateId: 'spider-weaver' },
        { id: 'b3', templateId: 'treant-elder' },
      ],
    )
    expect(analyzeFight(events, noCtx, roster).enemyTemplateIds).toEqual([
      'spider-weaver',
      'treant-elder',
    ])
    expect(analyzeFight(events, noCtx, rosterOf([], [])).enemyTemplateIds).toEqual([])
  })

  it("counts a fight once per distinct template, with the fight's own result, keyed by floor", () => {
    const rows = buildMatchupRows([
      seedResult({
        earlyFights: [
          fight(1, ['a'], 'win'),
          fight(1, ['a'], 'loss'),
          fight(1, ['b'], 'loss'),
          fight(2, ['a', 'a', 'b'], 'win'), // a duplicate template counts once
          fight(2, ['b'], 'draw', true),
          fight(2, ['b'], 'draw', false),
        ],
      }),
      seedResult({ seed: 2, earlyFights: [fight(1, ['a'], 'win')] }),
    ])
    expect(rows).toEqual([
      {
        floor: 1,
        enemyTemplateId: 'a',
        fights: 3,
        wins: 2,
        losses: 1,
        capDraws: 0,
        otherDraws: 0,
      },
      {
        floor: 1,
        enemyTemplateId: 'b',
        fights: 1,
        wins: 0,
        losses: 1,
        capDraws: 0,
        otherDraws: 0,
      },
      {
        floor: 2,
        enemyTemplateId: 'a',
        fights: 1,
        wins: 1,
        losses: 0,
        capDraws: 0,
        otherDraws: 0,
      },
      {
        floor: 2,
        enemyTemplateId: 'b',
        fights: 3,
        wins: 1,
        losses: 0,
        capDraws: 1,
        otherDraws: 1,
      },
    ])
  })

  it('leaves out floors past the matchup range', () => {
    const rows = buildMatchupRows([
      seedResult({
        earlyFights: [
          fight(MATCHUP_MAX_FLOOR, ['a'], 'win'),
          fight(MATCHUP_MAX_FLOOR + 1, ['a'], 'win'),
        ],
      }),
    ])
    expect(rows.map((r) => r.floor)).toEqual([MATCHUP_MAX_FLOOR])
  })
})

describe('the first-try clear rate per floor', () => {
  it("reads each seed's FIRST run on the floor: a failed first run then a clear is a miss", () => {
    const rows = buildFirstTryRows([
      seedResult({ runs: [run(1, 1, true), run(2, 2, false), run(3, 2, true)] }),
      seedResult({ seed: 2, runs: [run(1, 1, false), run(2, 1, true)] }),
      seedResult({ seed: 3, runs: [run(1, 1, true)] }),
    ])
    expect(rows).toEqual([
      { floor: 1, seeds: 3, firstTryClears: 2 },
      { floor: 2, seeds: 1, firstTryClears: 0 },
    ])
  })

  it('a farm run counts when it is the first on its floor, and a floor nobody ran has no row', () => {
    const farmFirst: RunRecord = { ...run(1, 3, true), kind: 'farm' }
    expect(buildFirstTryRows([seedResult({ runs: [farmFirst] })])).toEqual([
      { floor: 3, seeds: 1, firstTryClears: 1 },
    ])
    expect(buildFirstTryRows([seedResult()])).toEqual([])
  })

  it('has no content bound: a floor past 30 has a row, and a floor nobody ran has none', () => {
    const rows = buildFirstTryRows([
      seedResult({ runs: [run(1, 1, true), run(2, 31, true)] }),
    ])
    expect(rows.map((r) => r.floor)).toEqual([1, 31])
  })
})

describe('per-trait stack maxima', () => {
  const stack = (
    targetId: string,
    attribution: string,
    direction: 'growth' | 'shred',
    count: number,
  ): StackCount => ({ targetId, attribution, direction, count })
  // Opaque ids: which side a creature is on comes from the roster, never from its id.
  const sides = sidesOf(rosterOf(['p1', 'p2'], ['e1']))

  it('keeps every trait in a bucket, so the smaller one is not lost behind the larger', () => {
    const maxima = traitStackMaxima(
      [
        stack('p1', 'rally', 'growth', 9),
        stack('p2', 'rally', 'growth', 4),
        stack('p1', 'taking-root', 'growth', 30),
        stack('e1', 'flare', 'growth', 12),
        stack('p1', 'gorge', 'shred', 2),
        stack('somebody', 'ignored', 'growth', 99), // neither side: no bucket
      ],
      sides,
    )
    expect(maxima['growth-player']).toEqual({
      rally: stack('p1', 'rally', 'growth', 9),
      'taking-root': stack('p1', 'taking-root', 'growth', 30),
    })
    expect(maxima['growth-enemy']).toEqual({
      flare: stack('e1', 'flare', 'growth', 12),
    })
    expect(maxima['shred-player']).toEqual({
      gorge: stack('p1', 'gorge', 'shred', 2),
    })
    expect(maxima['shred-enemy']).toEqual({})
  })

  it('folds fights into a seed: the larger wins per (bucket, trait) with its floor; a tie keeps the first', () => {
    const fightOf = (stacks: StackCount[]): Pick<FightMetrics, 'traitStacks'> => ({
      traitStacks: traitStackMaxima(stacks, sides),
    })
    const first = fightOf([
      stack('p1', 'rally', 'growth', 5),
      stack('p1', 'root', 'growth', 8),
    ])
    const second = fightOf([
      stack('p2', 'rally', 'growth', 7), // larger: replaces
      stack('p2', 'root', 'growth', 8), // tie: the first stays
      stack('e1', 'flare', 'growth', 3), // new trait
    ])
    const folded = foldTraitStacks(foldTraitStacks(NO_TRAIT_STACKS, first, 3), second, 4)
    expect(folded['growth-player']['rally']).toEqual({
      ...stack('p2', 'rally', 'growth', 7),
      floor: 4,
    })
    expect(folded['growth-player']['root']).toEqual({
      ...stack('p1', 'root', 'growth', 8),
      floor: 3,
    })
    expect(folded['growth-enemy']['flare']).toEqual({
      ...stack('e1', 'flare', 'growth', 3),
      floor: 4,
    })
  })

  it("the spec report keeps each trait's largest stack across seeds, with the seed", () => {
    const withStacks = (seed: number, count: number): SeedResult =>
      seedResult({
        seed,
        traitStacks: {
          ...NO_TRAIT_STACKS,
          'growth-player': {
            rally: { ...stack('p1', 'rally', 'growth', count), floor: 2 },
            root: { ...stack('p1', 'root', 'growth', 50), floor: 2 },
          },
        },
      })
    const spec = buildSpecReport(
      'sorcerer',
      [withStacks(1, 4), withStacks(2, 9), withStacks(3, 9)],
      DEFAULT_BALANCE_CONFIG,
    )
    expect(spec.traitStacks['growth-player']['rally']).toMatchObject({
      count: 9,
      seed: 2,
    })
    expect(spec.traitStacks['growth-player']['root']).toMatchObject({
      count: 50,
      seed: 1,
    })
  })

  it('topTraitStacks orders largest first (ties by name) and truncates', () => {
    const bucket = {
      b: { ...stack('p1', 'b', 'growth', 3), floor: 1 },
      a: { ...stack('p1', 'a', 'growth', 3), floor: 1 },
      c: { ...stack('p1', 'c', 'growth', 9), floor: 1 },
    }
    expect(topTraitStacks(bucket, 2).map((t) => t.attribution)).toEqual(['c', 'a'])
  })
})

describe('the printed report carries the additions', () => {
  it('prints the first-try rows, the matchup rows and the top traits', () => {
    const results = [
      seedResult({
        runs: [run(1, 1, true)],
        earlyFights: [
          fight(1, ['spider-weaver'], 'loss'),
          fight(1, ['spider-weaver'], 'win'),
        ],
        traitStacks: {
          ...NO_TRAIT_STACKS,
          'growth-player': {
            'shieldbarer-starter-rally': {
              ...{ targetId: 'p1', attribution: 'shieldbarer-starter-rally' },
              direction: 'growth',
              count: 7,
              floor: 2,
            },
          },
        },
      }),
    ]
    const spec = buildSpecReport('sorcerer', results, DEFAULT_BALANCE_CONFIG)
    const text = formatReport({ seeds: [1], runCap: 30, specs: [spec] })
    expect(text).toContain('First-try clear per floor')
    expect(text).toMatch(/floor\s+1:\s+1\/\s*1 = 100\.0%/)
    expect(text).toContain('Matchups on floors 1-5')
    expect(text).toMatch(/spider-weaver\s+2\s+1\s+1\s+0\s+0\s+50\.0%/)
    expect(text).toContain('shieldbarer-starter-rally 7x (floor 2, seed 1)')
    expect(text).toContain('in its first 20 floor runs')
  })
})

// ---- T2 and T3 as floor-read ceilings ----

describe('T2 and T3 floor reads', () => {
  const party = (n: number): number[] => Array.from({ length: n }, () => 1)
  const runWith = (index: number, floor: number, size: number): RunRecord => ({
    ...run(index, floor, true),
    partyLevels: party(size),
  })

  it('the bands name floors 3 and 6', () => {
    expect(SOUL_BY_FLOOR).toBe(3)
    expect(FULL_PARTY_BY_FLOOR).toBe(6)
  })

  it('firstRunOnFloor is the FIRST run on the floor, or null', () => {
    const runs = [run(1, 1, true), run(2, 3, false), run(3, 3, true)]
    expect(firstRunOnFloor(runs, 3)?.index).toBe(2)
    expect(firstRunOnFloor(runs, 6)).toBeNull()
  })

  describe('soulBySeedFloor (T2)', () => {
    const runs = [run(1, 1, true), run(2, 2, true), run(3, 3, false), run(4, 3, true)]

    it('a soul completed in an earlier run is met', () => {
      expect(soulBySeedFloor({ runs, runsToFirstSoul: 2 }, 3)).toBe('met')
    })
    it('a soul completing DURING the first floor-3 run does not count', () => {
      expect(soulBySeedFloor({ runs, runsToFirstSoul: 3 }, 3)).toBe('missed')
    })
    it('a soul completed between the first and a later floor-3 run is missed (reads the FIRST run)', () => {
      expect(soulBySeedFloor({ runs, runsToFirstSoul: 4 }, 3)).toBe('missed')
    })
    it('a seed that never completes a soul is missed, not skipped', () => {
      expect(soulBySeedFloor({ runs, runsToFirstSoul: null }, 3)).toBe('missed')
    })
    it('a seed that never runs the floor did not reach it, whatever its soul', () => {
      const short = [run(1, 1, false), run(2, 1, false)]
      expect(soulBySeedFloor({ runs: short, runsToFirstSoul: 1 }, 3)).toBe(
        'did-not-reach',
      )
      expect(soulBySeedFloor({ runs: short, runsToFirstSoul: null }, 3)).toBe(
        'did-not-reach',
      )
    })
  })

  describe('fullPartyBySeedFloor (T3)', () => {
    it('a party of six on the first floor-6 run is met', () => {
      expect(fullPartyBySeedFloor({ runs: [runWith(1, 6, 6)] }, 6)).toBe('met')
    })
    it('five is missed', () => {
      expect(fullPartyBySeedFloor({ runs: [runWith(1, 6, 5)] }, 6)).toBe('missed')
    })
    it('full only on a LATER floor-6 run is missed (reads the first)', () => {
      expect(
        fullPartyBySeedFloor({ runs: [runWith(1, 6, 5), runWith(2, 6, 6)] }, 6),
      ).toBe('missed')
    })
    it('no floor-6 run is did-not-reach, not missed', () => {
      expect(fullPartyBySeedFloor({ runs: [runWith(1, 5, 6)] }, 6)).toBe('did-not-reach')
    })
  })

  it('tallyReads: reached is met + missed, did-not-reach is apart', () => {
    expect(
      tallyReads([
        'met',
        'met',
        'missed',
        'did-not-reach',
        'did-not-reach',
        'did-not-reach',
      ]),
    ).toEqual({ met: 2, reached: 3, didNotReach: 3 })
    expect(tallyReads([])).toEqual({ met: 0, reached: 0, didNotReach: 0 })
  })

  it('buildSpecReport folds both tallies from the seeds, keeping the first-soul lists', () => {
    const r = buildSpecReport(
      'sorcerer',
      [
        // soul done in run 1; party full at floor 6's first run: both met
        seedResult({
          runs: [run(1, 1, true), runWith(2, 3, 1), runWith(3, 6, 6)],
          clearsToFirstSoul: 1,
          runsToFirstSoul: 1,
        }),
        // no soul, five at floor 6: both missed
        seedResult({ runs: [run(1, 1, true), runWith(2, 3, 1), runWith(3, 6, 5)] }),
        // never leaves floor 1: didn't reach either
        seedResult({ runs: [run(1, 1, false)] }),
      ],
      DEFAULT_BALANCE_CONFIG,
    )
    expect(r.t2.atFloor3).toEqual({ met: 1, reached: 2, didNotReach: 1 })
    expect(r.t3.atFloor6).toEqual({ met: 1, reached: 2, didNotReach: 1 })
    expect(r.t2.runsToFirstSoul).toEqual([1])
    expect(r.t2.seedsWithoutSoul).toBe(2)
  })

  it('the printer says met / reached with the did-not-reach count on the T2 and T3 lines', () => {
    expect(formatTally({ met: 40, reached: 28, didNotReach: 12 })).toBe(
      "40 / 28 (didn't reach 12)",
    )
    const spec = buildSpecReport(
      'sorcerer',
      [seedResult({ runs: [run(1, 1, false)] })],
      DEFAULT_BALANCE_CONFIG,
    )
    const lines = formatReport({
      seeds: [1],
      runCap: 30,
      specs: [spec],
    }).split('\n')
    const t2 = lines.find((l) => l.startsWith('T2 '))!
    const t3 = lines.find((l) => l.startsWith('T3 '))!
    expect(t2).toContain(
      "T2 a soul completed by the first run on floor 3 (ceiling: sooner is fine): met 0 / 0 (didn't reach 1);",
    )
    expect(t2).toContain('first soul (target ~10): floor runs, median over all seeds')
    expect(t3).toBe(
      "T3 a full party of 6 by the first run on floor 6 (ceiling): met 0 / 0 (didn't reach 1)",
    )
  })
})

// ---- The floor rows have no content bound ----

describe('the floor rows run to the deepest floor any seed ran', () => {
  const CONFIG = DEFAULT_BALANCE_CONFIG
  const shaped = (
    index: number,
    floor: number,
    cleared: boolean,
    shape: RunRecord['shape'],
  ): RunRecord => ({ ...run(index, floor, cleared), shape })
  const ordinary = { boss: false, fights: 3 }

  it('a gap: floors 1 and 3 run, floor 2 not, gives rows for 1 and 3 and no row for 2', () => {
    const results = [
      seedResult({ runs: [shaped(1, 1, true, ordinary), shaped(2, 3, true, ordinary)] }),
    ]
    const spec = buildSpecReport('sorcerer', results, CONFIG)
    expect(spec.floors.map((row) => row.floor)).toEqual([1, 3])
    expect(spec.firstTry.map((row) => row.floor)).toEqual([1, 3])
  })

  it('the last row is the deepest floor run, and a floor with only a failed push keeps its row', () => {
    const results = [
      seedResult({
        runs: [shaped(1, 1, true, ordinary), shaped(2, 2, false, ordinary)],
        failedPushes: { 2: 1 },
      }),
    ]
    const spec = buildSpecReport('sorcerer', results, CONFIG)
    expect(spec.floors.map((row) => row.floor)).toEqual([1, 2])
    expect(spec.floors[1]).toMatchObject({
      floor: 2,
      runs: 1,
      clears: 0,
      failedPushes: 1,
    })
    expect(spec.firstTry.map((row) => row.floor)).toEqual([1, 2])
  })

  it('has rows past floor 30: nothing but the runs bounds it', () => {
    const results = [seedResult({ runs: [shaped(1, 140, true, ordinary)] })]
    const spec = buildSpecReport('sorcerer', results, CONFIG)
    expect(spec.floors.map((row) => row.floor)).toEqual([140])
  })

  it('a floor 10 run that was not a boss floor gives its own fight count and no boss level', () => {
    const results = [
      seedResult({ runs: [shaped(1, 10, true, { boss: false, fights: 17 })] }),
    ]
    const row = buildSpecReport('sorcerer', results, CONFIG).floors[0]!
    expect(row.fightsPerFloor).toBe(17)
    expect(row.bossLevel).toBeNull()
  })

  it('a boss floor run gives the boss level; the shape is the first run on the floor in seed order', () => {
    const asBoss = seedResult({
      seed: 1,
      runs: [shaped(1, 12, true, { boss: true, fights: 1 })],
    })
    const asOrdinary = seedResult({
      seed: 2,
      runs: [shaped(1, 12, true, { boss: false, fights: 9 })],
    })
    const bossFirst = buildSpecReport('sorcerer', [asBoss, asOrdinary], CONFIG).floors[0]!
    expect(bossFirst.fightsPerFloor).toBe(1)
    expect(bossFirst.bossLevel).toBe(bossLevel(12, CONFIG))
    const ordinaryFirst = buildSpecReport('sorcerer', [asOrdinary, asBoss], CONFIG)
      .floors[0]!
    expect(ordinaryFirst.fightsPerFloor).toBe(9)
    expect(ordinaryFirst.bossLevel).toBeNull()
  })
})

describe('the attrition rows read the Rot Sovereign only', () => {
  const visit = (
    bossTemplateId: string,
    cleared: boolean,
    deaths: number,
  ): BossVisit => ({
    floor: 30,
    firstVisit: true,
    bossTemplateId,
    policy: { cleared, metrics: null },
    probe: null,
    policyDeaths: deaths,
  })

  it('a Rot Sovereign visit counts, another boss’s does not', () => {
    const spec = buildSpecReport(
      'sorcerer',
      [
        seedResult({
          bossVisits: [
            visit(ROT_SOVEREIGN.id, true, 2),
            visit('some-other-boss', false, 4),
          ],
        }),
      ],
      DEFAULT_BALANCE_CONFIG,
    )
    expect(spec.attrition.visits).toBe(1)
    expect(spec.attrition.policyClears).toBe(1)
    expect(spec.attrition.meanDeaths).toBe(2)
  })

  it('with only other bosses there are no visits', () => {
    const spec = buildSpecReport(
      'sorcerer',
      [seedResult({ bossVisits: [visit('some-other-boss', true, 1)] })],
      DEFAULT_BALANCE_CONFIG,
    )
    expect(spec.attrition.visits).toBe(0)
    expect(spec.attrition.meanDeaths).toBeNull()
  })
})
