import { describe, expect, it } from 'vitest'
import { createSeededRng, type SeededRng } from './rng'
import type { BiomeId } from './ids'
import { scaleStatsToLevel } from './leveling'
import { ENEMY_PARTY_SIZE, enemyLevelRange, fightCount } from './curves'
import { biomeForFloor, canEquip, generateFloor, materializeCreature } from './generation'
import { DEFAULT_GEM_SLOT_COUNT } from './config'
import {
  FIXTURE_BIOME,
  FIXTURE_BIOME_SEQUENCE,
  FIXTURE_BRUISER,
  FIXTURE_CASTER,
  FIXTURE_VIOLENCE_BOLT,
  FIXTURE_WIT_BOLT,
} from './__fixtures__/biomes'

/** A stub SeededRng returning the same fixed value on every draw -- lets a whole generateFloor
 * call be traced by hand (every weighted pick and level roll becomes arithmetic, not a random
 * outcome), instead of only the first draw. */
function constantRng(value: number): SeededRng {
  return { next: () => value }
}

describe('canEquip', () => {
  it('matches when spell and creature affinity are identical', () => {
    expect(canEquip(FIXTURE_WIT_BOLT, 'wit')).toBe(true)
  })

  it('does not match a differing affinity', () => {
    expect(canEquip(FIXTURE_WIT_BOLT, 'violence')).toBe(false)
    expect(canEquip(FIXTURE_VIOLENCE_BOLT, 'wit')).toBe(false)
  })
})

describe('materializeCreature', () => {
  it('is pure -- identical inputs produce a deep-equal result', () => {
    const a = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 2)
    const b = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 2)
    expect(a).toEqual(b)
  })

  it('bakes the level into baseStats via scaleStatsToLevel', () => {
    const creature = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 0)
    expect(creature.baseStats).toEqual(scaleStatsToLevel(FIXTURE_BRUISER.baseStats, 5))
  })

  it('derives a deterministic id from speciesCreature id + side + slot', () => {
    const creature = materializeCreature(FIXTURE_BRUISER, 1, 'enemy', 2)
    expect(creature.id).toBe('fixture-bruiser-enemy-2')
  })

  it('copies affinity, defaultScriptId->scriptId, and innateTraitIds', () => {
    const creature = materializeCreature(FIXTURE_CASTER, 1, 'player', 0)
    expect(creature.affinity).toBe('wit')
    expect(creature.scriptId).toBe('always-cast')
    expect(creature.innateTraitIds).toEqual([])
  })

  it('leaves currentHp as a placeholder equal to baseStats.health -- createCombat owns real init', () => {
    const creature = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 0)
    expect(creature.currentHp).toBe(creature.baseStats.health)
  })

  it('starts defending/provoking false with no active effects', () => {
    const creature = materializeCreature(FIXTURE_BRUISER, 1, 'enemy', 0)
    expect(creature.defending).toBe(false)
    expect(creature.provoking).toBe(false)
    expect(creature.activeEffects).toEqual([])
  })

  it('defaults equippedSpells to all-null slots when omitted', () => {
    const creature = materializeCreature(FIXTURE_BRUISER, 1, 'enemy', 0)
    expect(creature.equippedSpells).toEqual(
      Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    )
  })

  it('passes through a supplied equippedSpells loadout unchanged', () => {
    const loadout = [FIXTURE_WIT_BOLT, null, null]
    const creature = materializeCreature(FIXTURE_CASTER, 1, 'enemy', 0, loadout)
    expect(creature.equippedSpells).toBe(loadout)
  })
})

describe('biomeForFloor', () => {
  const noPins = new Map<number, BiomeId>()

  it.each([
    [1, 0],
    [10, 0],
    [11, 1],
    [20, 1],
    [21, 2],
    [30, 2],
    [91, 9],
    [100, 9],
  ])('floor %i maps to fixed-sequence decade index %i', (floor, decadeIndex) => {
    const expected = FIXTURE_BIOME_SEQUENCE[decadeIndex]
    expect(expected).toBeDefined()
    expect(biomeForFloor(floor, FIXTURE_BIOME_SEQUENCE, noPins, 1)).toBe(expected?.id)
  })

  it('an atlas pin overrides the fixed sequence', () => {
    const rareBiome = FIXTURE_BIOME_SEQUENCE[9]
    expect(rareBiome).toBeDefined()
    const pins = new Map([[5, rareBiome!.id]])
    expect(biomeForFloor(5, FIXTURE_BIOME_SEQUENCE, pins, 1)).toBe(rareBiome!.id)
  })

  it('throws when no biome data exists for a floor <=100 decade (invariant)', () => {
    expect(() => biomeForFloor(5, [], noPins, 1)).toThrow(/generation invariant violated/)
  })

  it('floor 101+ re-derives per-floor rather than advancing a stream: order of calls does not matter', () => {
    const direct = biomeForFloor(101, FIXTURE_BIOME_SEQUENCE, noPins, 777)
    // Calling unrelated floors first must not perturb floor 101's own result.
    biomeForFloor(105, FIXTURE_BIOME_SEQUENCE, noPins, 777)
    biomeForFloor(999, FIXTURE_BIOME_SEQUENCE, noPins, 777)
    const afterOtherDraws = biomeForFloor(101, FIXTURE_BIOME_SEQUENCE, noPins, 777)
    expect(afterOtherDraws).toBe(direct)
  })

  it('floor 101+ is stable across repeated calls with the same (runSeed, floor)', () => {
    const first = biomeForFloor(150, FIXTURE_BIOME_SEQUENCE, noPins, 42)
    const second = biomeForFloor(150, FIXTURE_BIOME_SEQUENCE, noPins, 42)
    expect(second).toBe(first)
    expect(FIXTURE_BIOME_SEQUENCE.some((b) => b.id === first)).toBe(true)
  })

  it('an atlas pin overrides floor 101+ too', () => {
    const rareBiome = FIXTURE_BIOME_SEQUENCE[3]
    expect(rareBiome).toBeDefined()
    const pins = new Map([[150, rareBiome!.id]])
    expect(biomeForFloor(150, FIXTURE_BIOME_SEQUENCE, pins, 42)).toBe(rareBiome!.id)
  })
})

describe('generateFloor', () => {
  it('produces fightCount(floor) fights, each with ENEMY_PARTY_SIZE enemies', () => {
    const fights = generateFloor(5, FIXTURE_BIOME, createSeededRng(1))
    expect(fights).toHaveLength(fightCount(5))
    for (const fight of fights) {
      expect(fight.enemyParty).toHaveLength(ENEMY_PARTY_SIZE)
    }
  })

  it('is deterministic: the same seed produces a deep-equal floor', () => {
    const a = generateFloor(7, FIXTURE_BIOME, createSeededRng(42))
    const b = generateFloor(7, FIXTURE_BIOME, createSeededRng(42))
    expect(a).toEqual(b)
  })

  it('every enemy level falls within enemyLevelRange(floor)', () => {
    const { min, max } = enemyLevelRange(3)
    const minHealth = scaleStatsToLevel(FIXTURE_BRUISER.baseStats, min).health
    const maxHealth = scaleStatsToLevel(FIXTURE_BRUISER.baseStats, max).health
    const fights = generateFloor(3, FIXTURE_BIOME, createSeededRng(9))
    for (const fight of fights) {
      for (const enemy of fight.enemyParty) {
        // All fixture creatures share base health 20, so bounding on health alone is exact.
        expect(enemy.baseStats.health).toBeGreaterThanOrEqual(minHealth)
        expect(enemy.baseStats.health).toBeLessThanOrEqual(maxHealth)
      }
    }
  })

  // Hand-derived: FIXTURE_BIOME's speciesPool is [BRAWLERS(weight 1), CASTERS(weight 1)],
  // total weight 2. A constant rng.next() = 0.3 makes weightedPick roll = 0.3*2 = 0.6; that's
  // < BRAWLERS' weight (1), so BRAWLERS wins on every draw. BRAWLERS' creatures are
  // [BRUISER(common, weight 6), BRUISER_RARE(rare, weight 1)], total 7; roll = 0.3*7 = 2.1,
  // < 6, so BRUISER (common) wins every time too. floor=1 -> enemyLevelRange = {min:1, max:3}
  // (size 3); the level roll is 1 + floor(0.3*3) = 1 + floor(0.9) = 1 + 0 = 1 -- level 1, so
  // scaleStatsToLevel is a no-op (factor 1) and baseStats equals FIXTURE_BRUISER's own. BRUISER
  // is not cast-role, so every equipped-spell slot stays null.
  it('constant-rng trace: low roll picks the common non-caster at level 1 everywhere', () => {
    const fights = generateFloor(1, FIXTURE_BIOME, constantRng(0.3))
    for (const fight of fights) {
      for (const enemy of fight.enemyParty) {
        expect(enemy.baseStats).toEqual(FIXTURE_BRUISER.baseStats)
        expect(enemy.scriptId).toBe('always-attack')
        expect(enemy.equippedSpells).toEqual([null, null, null])
      }
    }
  })

  // Hand-derived: the same pool, but rng.next() = 0.9 -> species roll = 0.9*2 = 1.8, which
  // clears BRAWLERS' weight (1) leaving 0.8 (>=0, continue), then clears CASTERS' weight (1)
  // going negative -- CASTERS wins. CASTERS has one creature (FIXTURE_CASTER), so the
  // within-species draw is trivial. The level roll is 1 + floor(0.9*3) = 1 + floor(2.7) =
  // 1 + 2 = 3 -> scaleStatsToLevel factor = 1 + 0.25*2 = 1.5, so base 20 -> 30 and
  // intelligence 24 -> 36. FIXTURE_CASTER is cast-role: of the 2-spell pool, only
  // FIXTURE_WIT_BOLT matches its wit affinity (FIXTURE_VIOLENCE_BOLT is filtered out before
  // the roll), so slot 0 is WIT_BOLT regardless of the (single-item) roll.
  it('constant-rng trace: high roll picks the caster at level 3, loaded with its affinity-matched spell', () => {
    const fights = generateFloor(1, FIXTURE_BIOME, constantRng(0.9))
    const expectedStats = {
      health: 30,
      attack: 30,
      intelligence: 36,
      defence: 30,
      speed: 30,
    }
    for (const fight of fights) {
      for (const enemy of fight.enemyParty) {
        expect(enemy.baseStats).toEqual(expectedStats)
        expect(enemy.scriptId).toBe('always-cast')
        expect(enemy.equippedSpells[0]).toEqual(FIXTURE_WIT_BOLT)
        expect(enemy.equippedSpells[1]).toBeNull()
        expect(enemy.equippedSpells[2]).toBeNull()
      }
    }
  })
})
