import { describe, expect, it } from 'vitest'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { createCreatureId } from './ids'
import type { Creature, Stat } from './types'

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
