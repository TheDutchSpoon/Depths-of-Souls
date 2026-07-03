import { describe, expect, it } from 'vitest'
import { evaluateCondition } from './conditions'
import { makeCreature, makeParty } from './__fixtures__/creatures'
import { createSeededRng } from './rng'
import type { CombatState } from './types'

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    rng: createSeededRng(1),
    playerParty: [],
    enemyParty: [],
    turnQueue: [],
    turnCursor: 0,
    round: 1,
    result: null,
    scripts: new Map(),
    ...overrides,
  }
}

describe('evaluateCondition -- always', () => {
  it('is always true', () => {
    const creature = makeCreature()
    expect(evaluateCondition({ kind: 'always' }, creature, makeState())).toBe(true)
  })
})

describe('evaluateCondition -- hp-percent', () => {
  it('uses integer cross-multiplication, not naive float division, at an exact-percent boundary', () => {
    // health=25, currentHp=1 -> exactly 4%. 1/25 is not exactly representable in binary
    // float, so currentHp/effMaxHp*100 can drift off 4 by an epsilon; cross-multiplication
    // (1*100 vs 4*25) must land exactly equal regardless.
    const creature = makeCreature({ health: 25, currentHp: 1 })
    const condition = {
      kind: 'hp-percent' as const,
      subject: 'self' as const,
      qualifier: 'any' as const,
      comparator: '==' as const,
      thresholdPercent: 4,
    }
    expect(evaluateCondition(condition, creature, makeState())).toBe(true)
  })

  it('is strict at the boundary for < and inclusive for <=', () => {
    const creature = makeCreature({ health: 50, currentHp: 25 }) // exactly 50%
    const state = makeState()
    const base = {
      kind: 'hp-percent' as const,
      subject: 'self' as const,
      qualifier: 'any' as const,
      thresholdPercent: 50,
    }
    expect(evaluateCondition({ ...base, comparator: '<' }, creature, state)).toBe(false)
    expect(evaluateCondition({ ...base, comparator: '<=' }, creature, state)).toBe(true)
    expect(evaluateCondition({ ...base, comparator: '>' }, creature, state)).toBe(false)
    expect(evaluateCondition({ ...base, comparator: '>=' }, creature, state)).toBe(true)
  })

  it('subject=ally, qualifier=lowest on a solo creature resolves to itself', () => {
    const player = makeParty('player', [{ id: 'solo', health: 20, currentHp: 10 }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const condition = {
      kind: 'hp-percent' as const,
      subject: 'ally' as const,
      qualifier: 'lowest' as const,
      comparator: '==' as const,
      thresholdPercent: 50,
    }
    expect(evaluateCondition(condition, player[0]!, state)).toBe(true)
  })

  it('qualifier=any is existential over the subject pool', () => {
    const player = makeParty('player', [{ id: 'me', health: 20, currentHp: 20 }])
    const enemy = makeParty('enemy', [
      { id: 'healthy', health: 20, currentHp: 20 },
      { id: 'hurt', health: 20, currentHp: 2 },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    const condition = {
      kind: 'hp-percent' as const,
      subject: 'enemy' as const,
      qualifier: 'any' as const,
      comparator: '<' as const,
      thresholdPercent: 20,
    }
    expect(evaluateCondition(condition, player[0]!, state)).toBe(true)
  })

  it('returns false when the subject pool is empty', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    const condition = {
      kind: 'hp-percent' as const,
      subject: 'enemy' as const,
      qualifier: 'any' as const,
      comparator: '>=' as const,
      thresholdPercent: 0,
    }
    expect(evaluateCondition(condition, player[0]!, state)).toBe(false)
  })
})

describe('evaluateCondition -- enemy-count / ally-count', () => {
  it('compares living enemy count at the exact boundary', () => {
    const player = makeParty('player', [{ id: 'me' }])
    const enemy = makeParty('enemy', [{ id: 'a' }, { id: 'b', alive: false }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      evaluateCondition(
        { kind: 'enemy-count', comparator: '==', count: 1 },
        player[0]!,
        state,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { kind: 'enemy-count', comparator: '>=', count: 2 },
        player[0]!,
        state,
      ),
    ).toBe(false)
  })

  it('compares living ally count, dead allies excluded', () => {
    const player = makeParty('player', [{ id: 'me' }, { id: 'dead-ally', alive: false }])
    const state = makeState({ playerParty: player, enemyParty: [] })
    // ally-count includes self, so a solo-surviving party has ally-count === 1.
    expect(
      evaluateCondition(
        { kind: 'ally-count', comparator: '==', count: 1 },
        player[0]!,
        state,
      ),
    ).toBe(true)
  })
})

describe('evaluateCondition -- round-number', () => {
  it('compares CombatState.round at the exact boundary', () => {
    const creature = makeCreature()
    const state = makeState({ round: 3 })
    expect(
      evaluateCondition(
        { kind: 'round-number', comparator: '<=', round: 3 },
        creature,
        state,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        { kind: 'round-number', comparator: '<=', round: 2 },
        creature,
        state,
      ),
    ).toBe(false)
  })
})

describe('evaluateCondition -- enemy-weak-to-me-exists', () => {
  it('is true when at least one living enemy is weak to the acting creature (existential, decoupled from targeting)', () => {
    const player = makeParty('player', [{ id: 'me', affinity: 'body' }])
    // body beats spirit (cycle: body > spirit > mind > void > primal > body)
    const enemy = makeParty('enemy', [{ id: 'weak', affinity: 'spirit' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      evaluateCondition({ kind: 'enemy-weak-to-me-exists' }, player[0]!, state),
    ).toBe(true)
  })

  it('is false when no living enemy is weak to the acting creature', () => {
    const player = makeParty('player', [{ id: 'me', affinity: 'body' }])
    const enemy = makeParty('enemy', [{ id: 'neutral', affinity: 'mind' }])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      evaluateCondition({ kind: 'enemy-weak-to-me-exists' }, player[0]!, state),
    ).toBe(false)
  })

  it('excludes dead enemies from the existential check', () => {
    const player = makeParty('player', [{ id: 'me', affinity: 'body' }])
    const enemy = makeParty('enemy', [
      { id: 'weak-but-dead', affinity: 'spirit', alive: false },
    ])
    const state = makeState({ playerParty: player, enemyParty: enemy })
    expect(
      evaluateCondition({ kind: 'enemy-weak-to-me-exists' }, player[0]!, state),
    ).toBe(false)
  })
})

describe('evaluateCondition -- is-provoking', () => {
  it("reflects the acting creature's own provoking flag directly", () => {
    const provoking = makeCreature({ provoking: true })
    const notProvoking = makeCreature({ provoking: false })
    const state = makeState()
    expect(evaluateCondition({ kind: 'is-provoking' }, provoking, state)).toBe(true)
    expect(evaluateCondition({ kind: 'is-provoking' }, notProvoking, state)).toBe(false)
  })
})
