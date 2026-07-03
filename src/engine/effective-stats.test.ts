import { describe, expect, it } from 'vitest'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { createCreatureId } from './ids'
import { createEffectInstanceId } from './effect-types'
import { makeCreature } from './__fixtures__/creatures'
import type { ActiveEffect, ActivationPredicate, RemapSlot } from './effect-types'
import type { Creature, Stat } from './types'

function statMod(
  stat: Stat,
  factor: number,
  predicate?: ActivationPredicate,
): ActiveEffect {
  return {
    category: 'stat-modifier',
    stat,
    factor,
    ...(predicate ? { predicate } : {}),
    instanceId: createEffectInstanceId(`sm-${stat}-${factor}`),
    sourceTraitId: 'test-trait',
  }
}

function remap(slot: RemapSlot, fromStat: Stat): ActiveEffect {
  return {
    category: 'stat-remap',
    slot,
    fromStat,
    instanceId: createEffectInstanceId(`rm-${slot}-${fromStat}`),
    sourceTraitId: 'test-trait',
  }
}

const creature: Creature = {
  id: createCreatureId('test'),
  side: 'player',
  slot: 0,
  baseStats: { health: 30, attack: 22, intelligence: 18, defence: 14, speed: 25 },
  affinity: 'body',
  currentHp: 30,
  alive: true,
  scriptId: null,
  equippedSpells: [],
  defending: false,
  provoking: false,
  innateTraitIds: [],
  activeEffects: [],
}

describe('getEffectiveStat', () => {
  it.each(Object.keys(creature.baseStats) as Stat[])(
    'is a passthrough to baseStats.%s (Phase 1 has no stat-modifier effects)',
    (stat) => {
      expect(getEffectiveStat(creature, stat)).toBe(creature.baseStats[stat])
    },
  )
})

describe('getOffensiveStat', () => {
  it('falls back to effective Attack for the attack action kind (no stat-remap effects)', () => {
    expect(getOffensiveStat(creature, 'attack')).toBe(
      getEffectiveStat(creature, 'attack'),
    )
  })

  it('defaults spellPower to 1.0, so an omitted 3rd arg is exactly Attack parity', () => {
    expect(getOffensiveStat(creature, 'attack')).toBe(
      getOffensiveStat(creature, 'attack', 1.0),
    )
  })

  it('scales effective Intelligence by spellPower for the cast action kind', () => {
    expect(getOffensiveStat(creature, 'cast', 0.3)).toBe(
      getEffectiveStat(creature, 'intelligence') * 0.3,
    )
  })
})

describe('getEffectiveStat — stat-modifier folding', () => {
  it('folds a single modifier multiplicatively', () => {
    const c = makeCreature({ attack: 20, activeEffects: [statMod('attack', 1.3)] })
    expect(getEffectiveStat(c, 'attack')).toBe(26)
  })

  it('stacks modifiers multiplicatively; reductions approach but never reach zero', () => {
    const c = makeCreature({
      attack: 20,
      activeEffects: [statMod('attack', 0.8), statMod('attack', 0.8)],
    })
    expect(getEffectiveStat(c, 'attack')).toBeCloseTo(12.8, 10)
    expect(getEffectiveStat(c, 'attack')).toBeGreaterThan(0)
  })

  it('only folds modifiers whose stat matches', () => {
    const c = makeCreature({
      attack: 20,
      defence: 10,
      activeEffects: [statMod('attack', 2)],
    })
    expect(getEffectiveStat(c, 'defence')).toBe(10)
  })

  it('includes a conditional modifier only when its read-time predicate holds', () => {
    const atFullHp: ActivationPredicate = (cr) => cr.currentHp >= cr.baseStats.health
    const full = makeCreature({
      attack: 20,
      health: 30,
      currentHp: 30,
      activeEffects: [statMod('attack', 1.25, atFullHp)],
    })
    const hurt = makeCreature({
      attack: 20,
      health: 30,
      currentHp: 29,
      activeEffects: [statMod('attack', 1.25, atFullHp)],
    })
    expect(getEffectiveStat(full, 'attack')).toBe(25)
    expect(getEffectiveStat(hurt, 'attack')).toBe(20)
  })
})

describe('getOffensiveStat — stat-remap', () => {
  it('redirects the slot to read the remapped stat (effective)', () => {
    const c = makeCreature({
      attack: 10,
      speed: 30,
      activeEffects: [remap('attack', 'speed')],
    })
    expect(getOffensiveStat(c, 'attack')).toBe(30)
  })

  it("does not transfer the slot's own stat-modifiers to the substituted stat", () => {
    const c = makeCreature({
      attack: 10,
      speed: 30,
      activeEffects: [remap('attack', 'speed'), statMod('attack', 2)],
    })
    expect(getOffensiveStat(c, 'attack')).toBe(30) // the +100% Attack is ignored (slot reads Speed)
  })

  it('reads the substituted stat through getEffectiveStat, so ITS modifiers apply', () => {
    const c = makeCreature({
      attack: 10,
      speed: 30,
      activeEffects: [remap('attack', 'speed'), statMod('speed', 1.5)],
    })
    expect(getOffensiveStat(c, 'attack')).toBe(45)
  })

  it('resolves multiple remaps on one slot last-writer-wins in canonical order', () => {
    const c = makeCreature({
      attack: 10,
      speed: 30,
      intelligence: 5,
      activeEffects: [remap('attack', 'speed'), remap('attack', 'intelligence')],
    })
    expect(getOffensiveStat(c, 'attack')).toBe(5)
  })
})
