import { describe, expect, it } from 'vitest'
import {
  instantiateTraitEffects,
  effectiveMaxHp,
  clampedHp,
  gatherDealtMods,
  gatherTakenFactors,
  hasStatus,
  gatherArmorPenetration,
  gatherCrossStatContribution,
  gatherExtraInstances,
  hasStatusImmunity,
  hasProvokeImmunity,
  hasSplashing,
  hasAnnihilate,
  activeFriendlyFireStatus,
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

describe('gatherArmorPenetration (Phase 4 Slice B)', () => {
  function pen(percent: number, id: string): ActiveEffect {
    return {
      category: 'armor-penetration',
      percent,
      instanceId: createEffectInstanceId(id),
      sourceTraitId: id,
    }
  }

  it('is 0 for a creature with no armor-penetration effects', () => {
    expect(gatherArmorPenetration(makeCreature({}))).toBe(0)
  })

  it('sums across multiple sources, additive', () => {
    const c = makeCreature({ activeEffects: [pen(0.2, 'a'), pen(0.1, 'b')] })
    expect(gatherArmorPenetration(c)).toBeCloseTo(0.3)
  })

  it('clamps the total to [0, 1]', () => {
    const c = makeCreature({ activeEffects: [pen(0.7, 'a'), pen(0.7, 'b')] })
    expect(gatherArmorPenetration(c)).toBe(1)
  })
})

describe('gatherCrossStatContribution (Phase 4 Slice B)', () => {
  function crossStat(
    fromStat: 'defence' | 'attack',
    percentPerRank: number,
    appliesTo: 'attack' | 'cast' | 'both',
    id: string,
  ): ActiveEffect {
    return {
      category: 'cross-stat',
      fromStat,
      percentPerRank,
      appliesTo,
      instanceId: createEffectInstanceId(id),
      sourceTraitId: id,
    }
  }

  it('is 0 for a creature with no cross-stat effects', () => {
    expect(gatherCrossStatContribution(makeCreature({}), 'attack')).toBe(0)
  })

  it('sums percentPerRank * effective(fromStat) for effects matching the action kind', () => {
    // Shield Bash: 0.5 * Defence(40) = 20, feeding attacks.
    const c = makeCreature({
      defence: 40,
      activeEffects: [crossStat('defence', 0.5, 'attack', 'shield-bash')],
    })
    expect(gatherCrossStatContribution(c, 'attack')).toBeCloseTo(20)
    expect(gatherCrossStatContribution(c, 'cast')).toBe(0) // wrong action kind -- excluded
  })

  it("'both' applies to attack and cast alike", () => {
    const c = makeCreature({
      defence: 10,
      activeEffects: [crossStat('defence', 1, 'both', 'x')],
    })
    expect(gatherCrossStatContribution(c, 'attack')).toBeCloseTo(10)
    expect(gatherCrossStatContribution(c, 'cast')).toBeCloseTo(10)
  })
})

describe('gatherExtraInstances (Phase 4 Slice B)', () => {
  function instanceGrant(
    actionKind: 'attack' | 'cast' | 'both',
    powerPercent: number,
    id: string,
  ): ActiveEffect {
    return {
      category: 'action-instance',
      actionKind,
      powerPercent,
      instanceId: createEffectInstanceId(id),
      sourceTraitId: id,
    }
  }

  it('is empty for a creature with no action-instance effects (base-only list)', () => {
    expect(gatherExtraInstances(makeCreature({}), 'attack')).toEqual([])
  })

  it('returns one powerPercent entry per matching effect, in canonical order', () => {
    const c = makeCreature({
      activeEffects: [
        instanceGrant('attack', 100, 'echo'), // "an additional time"
        instanceGrant('attack', 30, 'brute-starter'), // "attack again for 30%"
      ],
    })
    expect(gatherExtraInstances(c, 'attack')).toEqual([100, 30])
  })

  it('filters by actionKind, including the shared "both" bucket', () => {
    const c = makeCreature({
      activeEffects: [
        instanceGrant('cast', 100, 'cast-only'),
        instanceGrant('both', 50, 'shared'),
      ],
    })
    expect(gatherExtraInstances(c, 'attack')).toEqual([50])
    expect(gatherExtraInstances(c, 'cast')).toEqual([100, 50])
  })
})

describe('hasStatusImmunity / hasProvokeImmunity / hasSplashing / hasAnnihilate (Phase 4 Slice C)', () => {
  it('hasStatusImmunity matches only a present status-immunity for the exact statusId', () => {
    const clearMind: ActiveEffect = {
      category: 'status-immunity',
      statusId: 'silenced',
      instanceId: createEffectInstanceId('cm'),
      sourceTraitId: 'clear-mind',
    }
    const c = makeCreature({ activeEffects: [clearMind] })
    expect(hasStatusImmunity(c, 'silenced')).toBe(true)
    expect(hasStatusImmunity(c, 'confusion')).toBe(false)
    expect(hasStatusImmunity(makeCreature({}), 'silenced')).toBe(false)
  })

  it('hasProvokeImmunity / hasSplashing / hasAnnihilate are simple boolean-presence checks', () => {
    const tunnelVision: ActiveEffect = {
      category: 'provoke-immunity',
      instanceId: createEffectInstanceId('tv'),
      sourceTraitId: 'tunnel-vision',
    }
    const splashing: ActiveEffect = {
      category: 'splashing',
      instanceId: createEffectInstanceId('sp'),
      sourceTraitId: 'proficient-warrior',
    }
    const annihilate: ActiveEffect = {
      category: 'annihilate',
      instanceId: createEffectInstanceId('an'),
      sourceTraitId: 'annihilate',
    }
    expect(hasProvokeImmunity(makeCreature({ activeEffects: [tunnelVision] }))).toBe(true)
    expect(hasProvokeImmunity(makeCreature({}))).toBe(false)
    expect(hasSplashing(makeCreature({ activeEffects: [splashing] }))).toBe(true)
    expect(hasSplashing(makeCreature({}))).toBe(false)
    expect(hasAnnihilate(makeCreature({ activeEffects: [annihilate] }))).toBe(true)
    expect(hasAnnihilate(makeCreature({}))).toBe(false)
  })
})

describe('activeFriendlyFireStatus (Phase 4 Slice C, Confusion)', () => {
  const confusion: ActiveEffect = {
    category: 'friendly-fire-status',
    statusId: 'confusion',
    cap: 1,
    chancePercent: 50,
    instanceId: createEffectInstanceId('confusion'),
    sourceTraitId: 'confusion',
    remainingDuration: 3,
    stacks: 1,
  }

  it('returns the active friendly-fire-status effect when present and not immune', () => {
    const c = makeCreature({ activeEffects: [confusion] })
    expect(activeFriendlyFireStatus(c)?.statusId).toBe('confusion')
  })

  it('returns undefined for a creature with no friendly-fire-status', () => {
    expect(activeFriendlyFireStatus(makeCreature({}))).toBeUndefined()
  })

  it('returns undefined when the bearer is immune to that specific status (Lucidity) -- immunity suppresses the effect, not the application', () => {
    const lucidity: ActiveEffect = {
      category: 'status-immunity',
      statusId: 'confusion',
      instanceId: createEffectInstanceId('lucidity'),
      sourceTraitId: 'lucidity',
    }
    const c = makeCreature({ activeEffects: [confusion, lucidity] })
    expect(activeFriendlyFireStatus(c)).toBeUndefined()
    // Still counts for has-status -- the status itself is untouched by immunity.
    expect(hasStatus(c, 'confusion')).toBe(true)
  })
})
