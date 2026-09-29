// Phase 4.1-C2a (A1): unit coverage for actions.ts's own plumbing beyond what
// interpreter.test.ts (checkLegality via decideAction's rule loop / the implicit fallback) and
// support-spells.test.ts (resolveIntent's ally-side path) already exercise.

import { describe, expect, it } from 'vitest'
import { castableGemSlots, defaultTargetingFor, resolveIntent } from './actions'
import { makeParty } from './__fixtures__/creatures'
import { createRngState, nextRandom } from './rng'
import type { CombatState, Spell } from './types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createRngState(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    statuses: new Map(),
    effectInstanceCounter: 0,
    ...overrides,
  }
}

const ENEMY_SPELL: Spell = {
  id: 'enemy-spell-fixture',
  name: 'Enemy Spell (fixture)',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'vitality',
}
const ALLY_SPELL: Spell = {
  id: 'ally-spell-fixture',
  name: 'Ally Spell (fixture)',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'vitality',
  targetSide: 'ally',
}
const AOE_SPELL: Spell = {
  id: 'aoe-spell-fixture',
  name: 'AOE Spell (fixture)',
  targetShape: 'aoe',
  spellPower: 0.3,
  affinity: 'vitality',
}

describe('defaultTargetingFor (Phase 4.1-C2a, A1; wired into resolveIntent in C2b/B1)', () => {
  it('Attack defaults to lowest-hp-enemy', () => {
    const player = makeParty('player', [{ id: 'me' }])
    expect(defaultTargetingFor(player[0]!, { kind: 'attack' })).toEqual({
      kind: 'lowest-hp-enemy',
    })
  })

  it('a single-target enemy-side Cast defaults to lowest-hp-enemy', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toEqual({
      kind: 'lowest-hp-enemy',
    })
  })

  it('a single-target ally-side Cast defaults to lowest-hp-ally', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ALLY_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toEqual({
      kind: 'lowest-hp-ally',
    })
  })

  it('an AOE Cast has no single default target', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [AOE_SPELL] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toBeUndefined()
  })

  it("gemSlot: 'random' has no default -- which spell (and side) it resolves to isn't known yet", () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    expect(
      defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 'random' }),
    ).toBeUndefined()
  })

  it('an empty gem slot has no default', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [null] }])
    expect(defaultTargetingFor(player[0]!, { kind: 'cast', gemSlot: 0 })).toBeUndefined()
  })

  it.each([
    [{ kind: 'defend' as const }],
    [{ kind: 'provoke' as const }],
    [{ kind: 'wait' as const }],
  ])('%o (self-only) has no default target', (action) => {
    const player = makeParty('player', [{ id: 'me' }])
    expect(defaultTargetingFor(player[0]!, action)).toBeUndefined()
  })
})

describe('castableGemSlots (Phase 4.1-C2a, A1)', () => {
  it('includes every non-empty slot whose spell has a valid target, innate slots included', () => {
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, null, ALLY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    // Slot 1 is empty; slot 2 (ally-side) always has a candidate ("ally" includes the actor).
    expect(castableGemSlots(player[0]!, state)).toEqual([0, 2])
  })

  it('excludes a single-target spell with no living creature on its own intended side', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(castableGemSlots(player[0]!, state)).toEqual([])
  })

  it('an AOE spell is always castable, even against an empty side', () => {
    const player = makeParty('player', [{ id: 'me', equippedSpells: [AOE_SPELL] }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    expect(castableGemSlots(player[0]!, state)).toEqual([0])
  })
})

describe("resolveIntent's gemSlot: 'random' draw order (Phase 4.1-C2a, A1)", () => {
  it('draws the gem slot BEFORE the target across seeds 0-19 -- pinned for byte-identity with bonus-cast/echo', () => {
    // Two DISTINCT slots (0/1) and three enemies (unequal pool sizes) so the gem-first and
    // target-first hypotheses can resolve to DIFFERENT concrete picks -- a discriminating proof,
    // not just a draw-count check (the rng's own position after N draws is the same regardless
    // of what order those draws were spent in). A single seed isn't enough either: at ONE seed
    // the gem-first prediction can coincidentally match a gem draw that always picks the last
    // slot, or happen to equal the target-first prediction -- looping and asserting BOTH slots
    // get chosen and at least one seed's two hypotheses diverge closes both gaps.
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, ENEMY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b' }, { id: 'c' }])

    const seenGemSlots = new Set<number>()
    let sawDivergence = false

    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        playerParty: player,
        enemyParty: enemy,
        rng: createRngState(seed),
      })

      const action = resolveIntent(
        player[0]!,
        { action: { kind: 'cast', gemSlot: 'random' }, targeting: { kind: 'random' } },
        state,
      )
      if (action?.kind !== 'cast' || action.targetShape !== 'single') {
        throw new Error(`expected a resolved single-target cast at seed ${seed}`)
      }

      const gemFirst = createRngState(seed)
      const gemFirstGemSlot = Math.floor(nextRandom(gemFirst) * 2)
      const gemFirstTargetIndex = Math.floor(nextRandom(gemFirst) * 3)

      const targetFirst = createRngState(seed)
      const targetFirstTargetIndex = Math.floor(nextRandom(targetFirst) * 3)
      const targetFirstGemSlot = Math.floor(nextRandom(targetFirst) * 2)

      // The gem-first prediction must hold at EVERY seed.
      expect(action.gemSlot).toBe(gemFirstGemSlot)
      expect(action.targetId).toBe(enemy[gemFirstTargetIndex]!.id)

      seenGemSlots.add(action.gemSlot)
      if (
        gemFirstGemSlot !== targetFirstGemSlot ||
        gemFirstTargetIndex !== targetFirstTargetIndex
      ) {
        sawDivergence = true
      }
    }

    expect(seenGemSlots).toEqual(new Set([0, 1]))
    expect(sawDivergence).toBe(true)
  })
})

describe('resolveIntent -- castable-filtered gem draw and resolved-side default (Phase 4.1-C2b)', () => {
  it("gemSlot 'random' draws over the castable slots only, and draws NOTHING when none is castable", () => {
    // Slot 0 = enemy spell, slot 1 = ally spell; the enemy side is empty, so only slot 1 castable.
    const player = makeParty('player', [
      { id: 'me', equippedSpells: [ENEMY_SPELL, ALLY_SPELL] },
    ])
    const enemy = makeParty('enemy', [{ id: 'dead', alive: false }])
    for (let seed = 0; seed < 20; seed++) {
      const state = makeState({
        rng: createRngState(seed),
        playerParty: player,
        enemyParty: enemy,
      })
      const action = resolveIntent(
        player[0]!,
        { action: { kind: 'cast', gemSlot: 'random' } },
        state,
      )
      expect(action).toEqual({
        kind: 'cast',
        targetShape: 'single',
        gemSlot: 1,
        targetId: player[0]!.id,
      })
    }
    // Nothing castable at all: null, and the RNG bookmark never moved.
    const onlyEnemy = makeParty('player', [{ id: 'me', equippedSpells: [ENEMY_SPELL] }])
    const state = makeState({ playerParty: onlyEnemy, enemyParty: enemy })
    const before = state.rng.position
    expect(
      resolveIntent(
        onlyEnemy[0]!,
        { action: { kind: 'cast', gemSlot: 'random' } },
        state,
      ),
    ).toBeNull()
    expect(state.rng.position).toBe(before)
  })

  it("a gemSlot 'random' cast with no targeting defaults by the DRAWN spell's side", () => {
    const player = makeParty('player', [
      { id: 'me', health: 40, equippedSpells: [ALLY_SPELL] },
      { id: 'hurt', health: 40, currentHp: 5 },
    ])
    const enemy = makeParty('enemy', [{ id: 'foe' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      resolveIntent(player[0]!, { action: { kind: 'cast', gemSlot: 'random' } }, state),
    ).toEqual({
      kind: 'cast',
      targetShape: 'single',
      gemSlot: 0,
      targetId: player[1]!.id,
    })
  })
})
