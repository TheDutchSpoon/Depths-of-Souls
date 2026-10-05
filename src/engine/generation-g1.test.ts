import { describe, expect, it } from 'vitest'
import { createSeededRng, type SeededRng } from './rng'
import { createBiomeId } from './ids'
import { enemyLevelRange } from './curves'
import {
  CAST_ROLE_SCRIPT_IDS,
  generateFloor,
  type BiomeData,
  type BossEncounter,
  type SpeciesCreature,
} from './generation'
import type { Spell } from './types'
import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as CFG } from './__fixtures__/balance'
import {
  FIXTURE_ALL_SPELLS,
  FIXTURE_BIOME,
  FIXTURE_BIOME_WITH_BOSS,
  FIXTURE_BOSS,
  FIXTURE_BOSS_ADD,
  FIXTURE_CASTER,
  FIXTURE_SPECIES_BRAWLERS,
  FIXTURE_SPECIES_CASTERS,
  FIXTURE_VIOLENCE_BOLT,
  FIXTURE_WIT_BOLT,
  FIXTURE_WIT_BOLT_TIER2,
} from './__fixtures__/biomes'

// Phase 4.1-G1: generation's enemy-behaviour rules, split from generation.test.ts so the slice's
// tests read together -- full distinct gem sets (D4), the cast-role check, and the 6v6 boss fill.

function constantRng(value: number): SeededRng {
  return { next: () => value }
}

/** An rng that returns `values` in order (then 0) and counts every draw. */
function countingRng(values: readonly number[] = []): SeededRng & { draws: number } {
  const rng = {
    draws: 0,
    next: () => values[rng.draws++] ?? 0,
  }
  return rng
}

const witSpell = (id: string): Spell => ({
  id,
  name: id,
  targetShape: 'single',
  affinity: 'wit',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.4,
    },
  ],
})
const WIT_A = witSpell('wit-a')
const WIT_B = witSpell('wit-b')
const WIT_C = witSpell('wit-c')
const WIT_D = witSpell('wit-d')

/** A one-species, one-creature biome: every slot spawns exactly `creature`. */
function soloBiome(creature: SpeciesCreature): BiomeData {
  return {
    id: createBiomeId('fixture-solo-biome'),
    name: 'Solo Biome',
    speciesPool: [
      { id: 'fixture-solo-species', name: 'Solo', weight: 1, creatures: [creature] },
    ],
  }
}

const asRole = (creature: SpeciesCreature, role: string): SpeciesCreature => ({
  ...creature,
  defaultScriptId: role,
})

describe('generateFloor: full distinct gem sets (Phase 4.1-G1, ASSUMPTION 70)', () => {
  it('a pool of 4 gives every enemy 3 DISTINCT affinity-matched spells, across seeds', () => {
    const spells = [WIT_A, WIT_B, WIT_C, WIT_D, FIXTURE_VIOLENCE_BOLT]
    for (let seed = 1; seed <= 40; seed++) {
      const fights = generateFloor(
        6,
        soloBiome(FIXTURE_CASTER),
        1,
        spells,
        createSeededRng(seed),
        CFG,
      )
      for (const enemy of fights.flatMap((f) => f.enemyParty)) {
        const ids = enemy.equippedSpells.map((s) => s?.id)
        expect(ids).not.toContain(undefined)
        expect(new Set(ids).size).toBe(3)
        for (const spell of enemy.equippedSpells) expect(spell?.affinity).toBe('wit')
      }
    }
  })

  // Hand-derived. Pool [A, B, C, D] (weight 1 each). Constant rng 0.9: slot 0 rolls 0.9*4 = 3.6 ->
  // past A, B, C (3.6-3 = 0.6 < 1) -> D. Slot 1 draws over what is left, [A, B, C]: 0.9*3 = 2.7 ->
  // C. Slot 2 over [A, B]: 0.9*2 = 1.8 -> B. Set: [D, C, B]. With 0.1: slot 0: 0.4 -> A; slot 1
  // over [B, C, D]: 0.3 -> B; slot 2 over [C, D]: 0.2 -> C. Set: [A, B, C].
  it('draws one pick per slot over the pool minus the spells already chosen', () => {
    const spells = [WIT_A, WIT_B, WIT_C, WIT_D]
    const sets = ([0.9, 0.1] as const).map((value) => {
      const fights = generateFloor(
        1,
        soloBiome(FIXTURE_CASTER),
        1,
        spells,
        constantRng(value),
        CFG,
      )
      return fights[0]!.enemyParty[0]!.equippedSpells.map((s) => s?.id)
    })
    expect(sets).toEqual([
      ['wit-d', 'wit-c', 'wit-b'],
      ['wit-a', 'wit-b', 'wit-c'],
    ])
  })

  // Hand-derived, a fixture pool of 2: [A, B]. Constant 0.1: slot 0 over [A, B]: 0.2 -> A. Slot 1
  // over [B]: -> B. Slot 2 over nothing: the safety net draws the FULL pool: 0.2 -> A. A pool smaller
  // than the slot count is the only way a duplicate appears.
  it('safety net: a pool of 2 fills the third slot with a duplicate from the full pool', () => {
    const fights = generateFloor(
      1,
      soloBiome(FIXTURE_CASTER),
      1,
      [WIT_A, WIT_B],
      constantRng(0.1),
      CFG,
    )
    expect(fights[0]!.enemyParty[0]!.equippedSpells.map((s) => s?.id)).toEqual([
      'wit-a',
      'wit-b',
      'wit-a',
    ])
  })

  it('every enemy draws, whatever its role: 3 loadout draws on top of species, creature and level', () => {
    const spells = [WIT_A, WIT_B, WIT_C]
    for (const role of ['striker', 'guardian', 'warden', 'taunter', 'caster']) {
      const rng = countingRng()
      // floor 1: partySize 1, 3 fights -> 3 spawns of [species, creature, level, 3 gems] = 6 draws.
      generateFloor(1, soloBiome(asRole(FIXTURE_CASTER, role)), 1, spells, rng, CFG)
      expect(rng.draws, role).toBe(3 * 6)
    }
  })

  it('an enemy whose affinity has no unlocked spell keeps empty slots and draws nothing for them (non-cast role)', () => {
    const rng = countingRng()
    const fights = generateFloor(
      1,
      soloBiome(asRole(FIXTURE_CASTER, 'striker')),
      1,
      [FIXTURE_VIOLENCE_BOLT], // no wit spell
      rng,
      CFG,
    )
    expect(fights[0]!.enemyParty[0]!.equippedSpells).toEqual([null, null, null])
    expect(rng.draws).toBe(3 * 3) // species, creature, level per spawn; no loadout draws
  })
})

describe('generateFloor: the cast-role check (Phase 4.1-G1, ASSUMPTION 67)', () => {
  it('the cast roles are caster, support and opener', () => {
    expect([...CAST_ROLE_SCRIPT_IDS]).toEqual(['caster', 'support', 'opener'])
  })

  it('a cast-role creature with no usable spell throws at generation, for every cast role', () => {
    for (const role of CAST_ROLE_SCRIPT_IDS) {
      expect(() =>
        generateFloor(
          1,
          soloBiome(asRole(FIXTURE_CASTER, role)),
          1,
          [FIXTURE_VIOLENCE_BOLT], // wit creature, no wit spell
          createSeededRng(1),
          CFG,
        ),
      ).toThrow(/cast-role creature fixture-caster has no wit spell/)
    }
  })

  it('"usable" means unlocked at the biome: a wit caster at biome 1 with only a biome-2 wit spell throws', () => {
    expect(() =>
      generateFloor(
        1,
        soloBiome(FIXTURE_CASTER),
        1,
        [FIXTURE_WIT_BOLT_TIER2],
        createSeededRng(1),
        CFG,
      ),
    ).toThrow(/has no wit spell unlocked at biome 1/)
  })

  it('no other role is a cast role, and always-cast no longer is: an empty pool is fine', () => {
    for (const role of ['striker', 'guardian', 'warden', 'taunter', 'always-cast']) {
      expect(() =>
        generateFloor(
          1,
          soloBiome(asRole(FIXTURE_CASTER, role)),
          1,
          [FIXTURE_VIOLENCE_BOLT],
          createSeededRng(1),
          CFG,
        ),
      ).not.toThrow()
    }
  })
})

describe('generateFloor: the boss fill (Phase 4.1-G1, 6v6 boss floors, ASSUMPTION 72)', () => {
  const bossBiome = (
    boss: Partial<BossEncounter>,
    pool = FIXTURE_BIOME.speciesPool,
  ): BiomeData => ({
    id: createBiomeId('fixture-fill-biome'),
    name: 'Fill Biome',
    speciesPool: pool,
    boss: { ...FIXTURE_BOSS, ...boss },
  })

  // Hand-derived draw order for FIXTURE_BIOME_WITH_BOSS at floor 10 (CFG): the boss, one authored
  // add (FIXTURE_BRUISER), then partySize(10) - 2 = 4 fill creatures. `values` is consumed in
  // order:
  //   0-2   the boss's three loadout draws        (the boss draws no level of her own)
  //   3     the add's level                        0.999 -> the range maximum
  //   4-6   the add's three loadout draws
  //   7-12  fill 1: species 0.9 (roll 1.8 -> CASTERS), creature, level 0 -> the range minimum, 3 gems
  //   13-18 fill 2: species 0.1 (roll 0.2 -> BRAWLERS), ...
  //   19-24 fill 3: species 0.9 (CASTERS)    25-30 fill 4: species 0.1 (BRAWLERS)
  // 31 draws in all. Were the fill drawn BEFORE the add, the add's level would read draw 3 as a
  // species roll and its loadout draws would shift -- the assertions below would fail.
  it('draws the boss, then the adds, then the fill, from the one run stream', () => {
    const values = [
      ...[0.5, 0.5, 0.5, 0.999, 0.5, 0.5, 0.5],
      ...[0.9, 0.5, 0, 0.5, 0.5, 0.5],
      ...[0.1, 0.5, 0.5, 0.5, 0.5, 0.5],
      ...[0.9, 0.5, 0.5, 0.5, 0.5, 0.5],
      ...[0.1, 0.5, 0.5, 0.5, 0.5, 0.5],
    ]
    const rng = countingRng(values)
    const [fight] = generateFloor(
      10,
      FIXTURE_BIOME_WITH_BOSS,
      1,
      FIXTURE_ALL_SPELLS,
      rng,
      CFG,
    )
    const party = fight!.enemyParty
    expect(rng.draws).toBe(31)
    expect(party).toHaveLength(6)

    const { min, max } = enemyLevelRange(10, CFG)
    expect(party[1]!.origin.level).toBe(max) // draw 3, 0.999 -> max
    expect(party[1]!.origin.templateId).toBe(FIXTURE_BOSS_ADD.id)
    expect(party[2]!.origin.level).toBe(min) // fill 1's level: draw 9, 0 -> min
    expect(party.slice(2).map((e) => e.speciesId)).toEqual([
      'fixture-species-casters',
      'fixture-species-brawlers',
      'fixture-species-casters',
      'fixture-species-brawlers',
    ])
    expect(party.map((e) => e.slot)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it("never fills with the boss's own species, over 100 seeds", () => {
    // The boss shares FIXTURE_SPECIES_CASTERS' id, so the fill pool is the Brawlers alone.
    const biome = bossBiome({ speciesId: FIXTURE_SPECIES_CASTERS.id })
    for (let seed = 1; seed <= 100; seed++) {
      const [fight] = generateFloor(
        10,
        biome,
        1,
        FIXTURE_ALL_SPELLS,
        createSeededRng(seed),
        CFG,
      )
      const fill = fight!.enemyParty.slice(2)
      expect(fill).toHaveLength(4)
      for (const creature of fill) {
        expect(creature.speciesId).toBe(FIXTURE_SPECIES_BRAWLERS.id)
      }
    }
  })

  it('fills nothing, and throws nothing, when the pool minus the boss species has no species', () => {
    const biome = bossBiome({ speciesId: FIXTURE_SPECIES_BRAWLERS.id }, [
      FIXTURE_SPECIES_BRAWLERS,
    ])
    const [fight] = generateFloor(
      10,
      biome,
      1,
      FIXTURE_ALL_SPELLS,
      createSeededRng(3),
      CFG,
    )
    expect(fight!.enemyParty).toHaveLength(2) // the boss and her one add
  })

  it('adds beyond the party size are all kept, and nothing is filled', () => {
    const adds = Array.from({ length: 6 }, () => FIXTURE_BOSS_ADD)
    const [fight] = generateFloor(
      10,
      bossBiome({ adds }),
      1,
      FIXTURE_ALL_SPELLS,
      createSeededRng(3),
      CFG,
    )
    expect(fight!.enemyParty).toHaveLength(7) // boss + 6 authored adds, no fill
  })

  it('the boss holds a full gem set even though her role never casts as a main action', () => {
    const [fight] = generateFloor(
      10,
      FIXTURE_BIOME_WITH_BOSS,
      1,
      [WIT_A, WIT_B, WIT_C, FIXTURE_WIT_BOLT],
      createSeededRng(9),
      CFG,
    )
    const boss = fight!.enemyParty[0]!
    expect(boss.scriptId).toBe('always-attack')
    expect(boss.equippedSpells).toHaveLength(3)
    expect(new Set(boss.equippedSpells.map((s) => s?.id)).size).toBe(3)
    for (const spell of boss.equippedSpells) expect(spell?.affinity).toBe('wit')
  })
})
