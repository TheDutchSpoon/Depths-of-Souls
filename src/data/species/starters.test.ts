import { describe, expect, it } from 'vitest'
import { materializeCreature } from '../../engine/generation'
import { createCombat } from '../../engine/combat'
import { decideAction } from '../../engine/interpreter'
import { resolveIntent } from '../../engine/actions'
import { ALWAYS_CAST_SCRIPT } from '../scripts'
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
import type { SpeciesCreature } from '../../engine/generation'

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

describe('Sorcerer starter loadout (Phase 4.1-B, A8)', () => {
  it("the granted spell is Wit-affinity, matching the starter's own affinity", () => {
    expect(ARCANE_BOLT.affinity).toBe('wit')
  })

  it('SpeciesCreature carries no equippedSpells field -- the fixed loadout is deleted', () => {
    expect('equippedSpells' in SORCERER_STARTER).toBe(false)
  })

  it('materializeCreature ALONE carries only the regular (default, all-null) gem slots -- the innate spell is granted by the trait, not the species', () => {
    const materialized = materializeCreature(SORCERER_STARTER, {
      level: 1,
      side: 'player',
      slot: 0,
      speciesId: 'sorcerer-starter-species',
    })
    expect(materialized.equippedSpells).toEqual([null, null, null])
  })

  it("createCombat prepends Arcane Surge's innate spell, giving the Seer [Bolt, null, null, null] -- byte-identical to the old fixed loadout", () => {
    const materialized = materializeCreature(SORCERER_STARTER, {
      level: 1,
      side: 'player',
      slot: 0,
      speciesId: 'sorcerer-starter-species',
    })
    const enemyStand = materializeCreature(BRUTE_STARTER, {
      level: 1,
      side: 'enemy',
      slot: 0,
      speciesId: 'brute-starter-species',
    })
    const state = createCombat({
      seed: 1,
      player: { party: [materialized] },
      enemy: { party: [enemyStand] },
      registries: { traits: TRAIT_REGISTRY },
    })
    expect(state.playerParty[0]!.equippedSpells).toEqual([ARCANE_BOLT, null, null, null])
  })

  it('a non-Wit "fused" creature carrying Arcane Surge still gets the innate Arcane Bolt and can cast it -- no equip gate applies', () => {
    const fusedFixture: SpeciesCreature = {
      id: 'fused-fixture',
      name: 'Fused Fixture',
      affinity: 'violence', // NOT Wit -- Arcane Bolt is a Wit-affinity spell
      baseStats: { health: 20, attack: 20, intelligence: 20, defence: 20, speed: 20 },
      defaultScriptId: 'always-cast',
      innateTraitIds: [SORCERER_STARTER_TRAIT.id],
      rarity: 'rare',
    }
    const materialized = materializeCreature(fusedFixture, {
      level: 1,
      side: 'player',
      slot: 0,
      speciesId: 'fused-fixture-species',
    })
    const enemyStand = materializeCreature(BRUTE_STARTER, {
      level: 1,
      side: 'enemy',
      slot: 0,
      speciesId: 'brute-starter-species',
    })
    const state = createCombat({
      seed: 1,
      player: { party: [materialized] },
      enemy: { party: [enemyStand] },
      registries: { traits: TRAIT_REGISTRY },
    })
    const fused = state.playerParty[0]!
    expect(fused.affinity).toBe('violence')
    expect(fused.equippedSpells[0]).toBe(ARCANE_BOLT)

    // Actually castable, not just present: always-cast (targets gemSlot 0) resolves to a real
    // cast action -- no affinity/equip check anywhere in the resolution path blocks it.
    const intent = decideAction(fused, ALWAYS_CAST_SCRIPT, state)
    const action = resolveIntent(fused, intent, state)
    expect(action).toMatchObject({ kind: 'cast', gemSlot: 0 })
  })
})

describe('signature traits', () => {
  it('Sorcerer starter: bonus-cast at 50% + an innate Arcane Bolt (Phase 4.1-B, A8)', () => {
    expect(SORCERER_STARTER_TRAIT.effects).toEqual([
      { category: 'bonus-cast', chancePercent: 50 },
      { category: 'innate-spell', spell: ARCANE_BOLT },
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
