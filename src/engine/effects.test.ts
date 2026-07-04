import { describe, expect, it } from 'vitest'
import {
  instantiateTraitEffects,
  effectiveMaxHp,
  clampedHp,
  gatherDealtMods,
  gatherTakenFactors,
  hasStatus,
} from './effects'
import { createEffectInstanceId } from './effect-types'
import { makeCreature } from './__fixtures__/creatures'
import type { ActiveEffect, Trait } from './effect-types'

const REGISTRY: ReadonlyMap<string, Trait> = new Map([
  [
    'plus-attack',
    {
      id: 'plus-attack',
      name: '+Atk',
      effects: [{ category: 'stat-modifier', stat: 'attack', factor: 1.3 }],
    },
  ],
  [
    'big-health',
    {
      id: 'big-health',
      name: '+HP',
      effects: [{ category: 'stat-modifier', stat: 'health', factor: 1.5 }],
    },
  ],
  [
    'two-effects',
    {
      id: 'two-effects',
      name: 'Two',
      effects: [
        { category: 'stat-modifier', stat: 'attack', factor: 1.1 },
        { category: 'stat-remap', slot: 'attack', fromStat: 'speed' },
      ],
    },
  ],
] as [string, Trait][])

describe('instantiateTraitEffects', () => {
  it('assigns deterministic instance ids and preserves declaration order within a trait', () => {
    const c = makeCreature({ id: 'hero', innateTraitIds: ['two-effects'] })
    const effects = instantiateTraitEffects(c, REGISTRY)
    expect(effects.map((e) => e.instanceId)).toEqual([
      'hero#two-effects#0',
      'hero#two-effects#1',
    ])
    expect(effects.map((e) => e.category)).toEqual(['stat-modifier', 'stat-remap'])
  })

  it('orders innate-1 effects before innate-2 (canonical order)', () => {
    const c = makeCreature({ id: 'hero', innateTraitIds: ['plus-attack', 'big-health'] })
    const effects = instantiateTraitEffects(c, REGISTRY)
    expect(effects.map((e) => e.sourceTraitId)).toEqual(['plus-attack', 'big-health'])
  })

  it('skips unknown trait ids defensively', () => {
    const c = makeCreature({ id: 'hero', innateTraitIds: ['nope', 'plus-attack'] })
    expect(instantiateTraitEffects(c, REGISTRY)).toHaveLength(1)
  })

  it('returns an empty list for a trait-less creature', () => {
    expect(instantiateTraitEffects(makeCreature({}), REGISTRY)).toEqual([])
  })
})

describe('effectiveMaxHp / clampedHp', () => {
  it('equals base Health with no Health modifier', () => {
    expect(effectiveMaxHp(makeCreature({ health: 30 }))).toBe(30)
  })

  it('folds a Health modifier and floors to an integer', () => {
    const eff: ActiveEffect = {
      category: 'stat-modifier',
      stat: 'health',
      factor: 1.25,
      instanceId: createEffectInstanceId('h'),
      sourceTraitId: 't',
    }
    // 30 × 1.25 = 37.5 -> floored to 37 (HP is always integer).
    expect(effectiveMaxHp(makeCreature({ health: 30, activeEffects: [eff] }))).toBe(37)
  })

  it('clamps currentHp down to effective max, and never up', () => {
    const halved: ActiveEffect = {
      category: 'stat-modifier',
      stat: 'health',
      factor: 0.5,
      instanceId: createEffectInstanceId('h'),
      sourceTraitId: 't',
    }
    // Lowered max (15) pulls currentHp (30) down with it.
    expect(
      clampedHp(makeCreature({ health: 30, currentHp: 30, activeEffects: [halved] })),
    ).toBe(15)
    // Already below max: unchanged (no auto-heal).
    expect(clampedHp(makeCreature({ health: 30, currentHp: 10 }))).toBe(10)
  })
})

describe('gatherDealtMods / gatherTakenFactors', () => {
  const weaken: ActiveEffect = {
    category: 'damage-modifier',
    statusId: 'weaken',
    direction: 'dealt',
    magnitude: -0.2,
    cap: 1,
    instanceId: createEffectInstanceId('w'),
    sourceTraitId: 'weaken',
    remainingDuration: 2,
    stacks: 1,
  }
  const vulnerability: ActiveEffect = {
    category: 'damage-modifier',
    statusId: 'vulnerability',
    direction: 'taken',
    magnitude: 1.5,
    cap: 2,
    instanceId: createEffectInstanceId('v'),
    sourceTraitId: 'vulnerability',
    remainingDuration: 2,
    stacks: 2,
  }
  const unrelated: ActiveEffect = {
    category: 'stat-modifier',
    stat: 'attack',
    factor: 1.1,
    instanceId: createEffectInstanceId('s'),
    sourceTraitId: 'brutish',
  }

  it('gatherDealtMods sums magnitude*stacks for dealt damage-modifier effects only', () => {
    const c = makeCreature({ activeEffects: [weaken, vulnerability, unrelated] })
    expect(gatherDealtMods(c)).toEqual([-0.2])
  })

  it('gatherTakenFactors compounds magnitude ** stacks for taken damage-modifier effects only', () => {
    const c = makeCreature({ activeEffects: [weaken, vulnerability, unrelated] })
    expect(gatherTakenFactors(c)).toEqual([1.5 ** 2])
  })
})

describe('hasStatus', () => {
  it('is true only when a matching statusId is present among status-carrying effects', () => {
    const dot: ActiveEffect = {
      category: 'condition-status',
      statusId: 'poison',
      cap: 5,
      hook: 'on-round-end',
      response: { kind: 'deal-damage', target: { kind: 'self' }, flatAmount: 1 },
      instanceId: createEffectInstanceId('p'),
      sourceTraitId: 'poison',
      remainingDuration: 2,
      stacks: 1,
    }
    const c = makeCreature({ activeEffects: [dot] })
    expect(hasStatus(c, 'poison')).toBe(true)
    expect(hasStatus(c, 'stun')).toBe(false)
  })

  it('never matches a stat-modifier/stat-remap/plain-triggered effect', () => {
    const brutish: ActiveEffect = {
      category: 'stat-modifier',
      stat: 'attack',
      factor: 1.3,
      instanceId: createEffectInstanceId('b'),
      sourceTraitId: 'brutish',
    }
    const c = makeCreature({ activeEffects: [brutish] })
    expect(hasStatus(c, 'brutish')).toBe(false)
  })
})
