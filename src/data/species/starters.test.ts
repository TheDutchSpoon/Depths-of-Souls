import { describe, expect, it } from 'vitest'
import { materializeCreature } from '../../engine/generation'
import {
  TRAIT_REGISTRY,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  SORCERER_STARTER_TRAIT,
  UNICORN_TRAIT,
} from '../traits'
import { ARCANE_BOLT } from '../spells'
import {
  BRUTE_STARTER,
  SHIELDBARER_STARTER,
  SORCERER_STARTER,
  STARTERS,
  UNICORN,
} from './starters'

describe('starter + Unicorn shape', () => {
  it('every starter/Unicorn references a trait id that actually exists in TRAIT_REGISTRY', () => {
    for (const creature of STARTERS) {
      for (const traitId of creature.innateTraitIds) {
        expect(TRAIT_REGISTRY.has(traitId)).toBe(true)
      }
    }
  })

  it('carries exactly one innate trait each (a starter creature, not a fused instance)', () => {
    for (const creature of STARTERS) {
      expect(creature.innateTraitIds).toHaveLength(1)
    }
  })

  it("base stats fall within GAME_DESIGN's 10-30 range for every stat", () => {
    for (const creature of STARTERS) {
      for (const value of Object.values(creature.baseStats)) {
        expect(value).toBeGreaterThanOrEqual(10)
        expect(value).toBeLessThanOrEqual(30)
      }
    }
  })

  it('the three specs settle on distinct affinities (species-locked.md: "ideally distinct")', () => {
    const affinities = new Set(
      [SORCERER_STARTER, BRUTE_STARTER, SHIELDBARER_STARTER].map((c) => c.affinity),
    )
    expect(affinities.size).toBe(3)
  })

  it("each starter's affinity matches its own high stat via CLAUDE.md's soft-mapping", () => {
    expect(SORCERER_STARTER.affinity).toBe('wit') // -> Intelligence
    expect(SORCERER_STARTER.baseStats.intelligence).toBe(30)
    expect(BRUTE_STARTER.affinity).toBe('violence') // -> Attack
    expect(BRUTE_STARTER.baseStats.attack).toBe(30)
    expect(SHIELDBARER_STARTER.affinity).toBe('endurance') // -> Defence
    expect(SHIELDBARER_STARTER.baseStats.defence).toBe(30)
  })
})

describe('Sorcerer starter loadout', () => {
  it('is granted exactly one extra gem slot (4, not the default 3), gem in slot 0', () => {
    expect(SORCERER_STARTER.equippedSpells).toHaveLength(4)
    expect(SORCERER_STARTER.equippedSpells?.[0]).toBe(ARCANE_BOLT)
    expect(SORCERER_STARTER.equippedSpells?.slice(1)).toEqual([null, null, null])
  })

  it("the granted spell is Wit-affinity, matching the starter's own affinity", () => {
    expect(ARCANE_BOLT.affinity).toBe('wit')
  })

  it('materializeCreature (the REAL path) carries the fixed loadout through, not just the raw data', () => {
    const materialized = materializeCreature(
      SORCERER_STARTER,
      1,
      'player',
      0,
      'sorcerer-starter-species',
    )
    expect(materialized.equippedSpells).toHaveLength(4)
    expect(materialized.equippedSpells[0]).toBe(ARCANE_BOLT)
  })
})

describe('signature traits', () => {
  it('Sorcerer starter: bonus-cast at 50%', () => {
    expect(SORCERER_STARTER_TRAIT.effects).toEqual([
      { category: 'bonus-cast', chancePercent: 50 },
    ])
  })

  it('Brute starter: a second FULL-power attack instance (species-locked.md: "twice at 100%")', () => {
    expect(BRUTE_STARTER_TRAIT.effects).toEqual([
      { category: 'action-instance', actionKind: 'attack', powerPercent: 100 },
    ])
  })

  it('Shieldbarer starter: on-provoke grants the whole team +35% Defence', () => {
    expect(SHIELDBARER_STARTER_TRAIT.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-provoke',
        response: {
          kind: 'apply-stat-modifier',
          target: { kind: 'all-allies' },
          stat: 'defence',
          factor: 1.35,
        },
      },
    ])
  })

  it('Unicorn: on-attack revives a random dead ally at 20% baseline max HP', () => {
    expect(UNICORN_TRAIT.effects).toEqual([
      {
        category: 'triggered',
        hook: 'on-attack',
        response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
      },
    ])
    expect(UNICORN.innateTraitIds).toEqual([UNICORN_TRAIT.id])
  })
})
