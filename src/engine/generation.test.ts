import { describe, expect, it } from 'vitest'
import { createSeededRng, type SeededRng } from './rng'
import type { BiomeId } from './ids'
import type { CombatState } from './types'
import { scaleStatsToLevel } from './leveling'
import { enemyLevelRange, enemyPartySize, fightCount } from './curves'
import {
  biomeForFloor,
  canEquip,
  generateFloor,
  materializeCreature,
  spellsUnlockedAt,
} from './generation'
import { resolveCount } from './effects'
import { DEFAULT_GEM_SLOT_COUNT } from './config'
import {
  FIXTURE_ALL_SPELLS,
  FIXTURE_BIOME,
  FIXTURE_BIOME_SEQUENCE,
  FIXTURE_BRUISER,
  FIXTURE_CASTER,
  FIXTURE_VIOLENCE_BOLT,
  FIXTURE_WIT_BOLT,
  FIXTURE_WIT_BOLT_TIER2,
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
    const a = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 2, 'fixture-species')
    const b = materializeCreature(FIXTURE_BRUISER, 5, 'enemy', 2, 'fixture-species')
    expect(a).toEqual(b)
  })

  it('bakes the level into baseStats via scaleStatsToLevel', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      5,
      'enemy',
      0,
      'fixture-species',
    )
    expect(creature.baseStats).toEqual(scaleStatsToLevel(FIXTURE_BRUISER.baseStats, 5))
  })

  it('derives a deterministic id from speciesCreature id + side + slot', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      1,
      'enemy',
      2,
      'fixture-species',
    )
    expect(creature.id).toBe('fixture-bruiser-enemy-2')
  })

  it('copies affinity, defaultScriptId->scriptId, and innateTraitIds', () => {
    const creature = materializeCreature(
      FIXTURE_CASTER,
      1,
      'player',
      0,
      'fixture-species',
    )
    expect(creature.affinity).toBe('wit')
    expect(creature.scriptId).toBe('always-cast')
    expect(creature.innateTraitIds).toEqual([])
  })

  it('leaves currentHp as a placeholder equal to baseStats.health -- createCombat owns real init', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      5,
      'enemy',
      0,
      'fixture-species',
    )
    expect(creature.currentHp).toBe(creature.baseStats.health)
  })

  it('starts defending/provoking false with no active effects', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      1,
      'enemy',
      0,
      'fixture-species',
    )
    expect(creature.defending).toBe(false)
    expect(creature.provoking).toBe(false)
    expect(creature.activeEffects).toEqual([])
  })

  it('defaults equippedSpells to all-null slots when omitted', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      1,
      'enemy',
      0,
      'fixture-species',
    )
    expect(creature.equippedSpells).toEqual(
      Array.from({ length: DEFAULT_GEM_SLOT_COUNT }, () => null),
    )
  })

  it('passes through a supplied equippedSpells loadout unchanged', () => {
    const loadout = [FIXTURE_WIT_BOLT, null, null]
    const creature = materializeCreature(
      FIXTURE_CASTER,
      1,
      'enemy',
      0,
      'fixture-species',
      loadout,
    )
    expect(creature.equippedSpells).toBe(loadout)
  })

  it('copies speciesId onto the materialized creature', () => {
    const creature = materializeCreature(
      FIXTURE_BRUISER,
      1,
      'enemy',
      0,
      'brawlers-fixture',
    )
    expect(creature.speciesId).toBe('brawlers-fixture')
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
  it('produces fightCount(floor) fights, each with enemyPartySize(floor) enemies', () => {
    const fights = generateFloor(
      5,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      createSeededRng(1),
    )
    expect(fights).toHaveLength(fightCount(5))
    for (const fight of fights) {
      expect(fight.enemyParty).toHaveLength(enemyPartySize(5))
    }
  })

  it('is deterministic: the same seed produces a deep-equal floor', () => {
    const a = generateFloor(7, FIXTURE_BIOME, 1, FIXTURE_ALL_SPELLS, createSeededRng(42))
    const b = generateFloor(7, FIXTURE_BIOME, 1, FIXTURE_ALL_SPELLS, createSeededRng(42))
    expect(a).toEqual(b)
  })

  it('every enemy level falls within enemyLevelRange(floor)', () => {
    const { min, max } = enemyLevelRange(3)
    const minHealth = scaleStatsToLevel(FIXTURE_BRUISER.baseStats, min).health
    const maxHealth = scaleStatsToLevel(FIXTURE_BRUISER.baseStats, max).health
    const fights = generateFloor(
      3,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      createSeededRng(9),
    )
    for (const fight of fights) {
      for (const enemy of fight.enemyParty) {
        // All fixture creatures share base health 20, so bounding on health alone is exact.
        expect(enemy.baseStats.health).toBeGreaterThanOrEqual(minHealth)
        expect(enemy.baseStats.health).toBeLessThanOrEqual(maxHealth)
      }
    }
  })

  // Hand-derived at floor=6 (enemyPartySize(6) === ENEMY_PARTY_SIZE, so every one of the 6
  // slots per fight is exercised, not just 1). FIXTURE_BIOME's speciesPool is
  // [BRAWLERS(weight 1), CASTERS(weight 1)], total weight 2. A constant rng.next() = 0.3 makes
  // weightedPick roll = 0.3*2 = 0.6; that's < BRAWLERS' weight (1), so BRAWLERS wins on every
  // draw. BRAWLERS' creatures are [BRUISER(common, weight 6), BRUISER_RARE(rare, weight 1)],
  // total 7; roll = 0.3*7 = 2.1, < 6, so BRUISER (common) wins every time too. floor=6 ->
  // enemyLevelRange = {min:6, max:8} (size 3); the level roll is 6 + floor(0.3*3) =
  // 6 + floor(0.9) = 6 + 0 = 6 -> scaleStatsToLevel factor = 1 + 0.25*5 = 2.25, so base 20 ->
  // 45 on every stat. BRUISER is not cast-role, so every equipped-spell slot stays null.
  it('constant-rng trace: low roll picks the common non-caster at level 6 everywhere', () => {
    const fights = generateFloor(
      6,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      constantRng(0.3),
    )
    const expectedStats = {
      health: 45,
      attack: 45,
      intelligence: 45,
      defence: 45,
      speed: 45,
    }
    for (const fight of fights) {
      expect(fight.enemyParty).toHaveLength(enemyPartySize(6))
      for (const enemy of fight.enemyParty) {
        expect(enemy.baseStats).toEqual(expectedStats)
        expect(enemy.scriptId).toBe('always-attack')
        expect(enemy.equippedSpells).toEqual([null, null, null])
      }
    }
  })

  // Hand-derived: the same pool, but rng.next() = 0.9 -> species roll = 0.9*2 = 1.8, which
  // clears BRAWLERS' weight (1) leaving 0.8 (>=0, continue), then clears CASTERS' weight (1)
  // going negative -- CASTERS wins. CASTERS has one creature (FIXTURE_CASTER), so the
  // within-species draw is trivial. floor=6 -> enemyLevelRange = {min:6, max:8} (size 3); the
  // level roll is 6 + floor(0.9*3) = 6 + floor(2.7) = 6 + 2 = 8 -> scaleStatsToLevel factor =
  // 1 + 0.25*7 = 2.75, so base 20 -> 55 and intelligence 24 -> 66. FIXTURE_CASTER is cast-role:
  // of the 2-spell pool, only FIXTURE_WIT_BOLT matches its wit affinity
  // (FIXTURE_VIOLENCE_BOLT is filtered out before the roll), so slot 0 is WIT_BOLT regardless
  // of the (single-item) roll.
  it('constant-rng trace: high roll picks the caster at level 8, loaded with its affinity-matched spell', () => {
    const fights = generateFloor(
      6,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      constantRng(0.9),
    )
    const expectedStats = {
      health: 55,
      attack: 55,
      intelligence: 66,
      defence: 55,
      speed: 55,
    }
    for (const fight of fights) {
      expect(fight.enemyParty).toHaveLength(enemyPartySize(6))
      for (const enemy of fight.enemyParty) {
        expect(enemy.baseStats).toEqual(expectedStats)
        expect(enemy.scriptId).toBe('always-cast')
        expect(enemy.equippedSpells[0]).toEqual(FIXTURE_WIT_BOLT)
        expect(enemy.equippedSpells[1]).toBeNull()
        expect(enemy.equippedSpells[2]).toBeNull()
      }
    }
  })

  it('speciesId is now real (Phase 4 Slice E2), so living-allies-of-species reads a nonzero count', () => {
    // Reuses the low-roll trace above: every one of the 6 enemy slots resolves to BRUISER
    // (BRAWLERS species), so every enemy in the fight shares the same speciesId --
    // living-allies-of-species was inert (always 0) before this slice wired it through
    // materializeCreature.
    const fights = generateFloor(
      6,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      constantRng(0.3),
    )
    const enemyParty = fights[0]!.enemyParty
    for (const enemy of enemyParty) {
      expect(enemy.speciesId).toBe('fixture-species-brawlers')
    }
    const state: CombatState = {
      rng: createSeededRng(1),
      playerParty: [],
      enemyParty,
      turnQueue: [],
      turnCursor: 0,
      round: 1,
      result: null,
      scripts: new Map(),
      statuses: new Map(),
      traits: new Map(),
      playerWideEffects: [],
    }
    expect(resolveCount(enemyParty[0]!, 'living-allies-of-species', state)).toBe(
      enemyParty.length,
    )
  })
})

describe('spellsUnlockedAt', () => {
  it('includes a spell only once biomeIndex reaches its unlockedAtBiome', () => {
    expect(spellsUnlockedAt(1, FIXTURE_ALL_SPELLS)).toEqual([
      FIXTURE_WIT_BOLT,
      FIXTURE_VIOLENCE_BOLT,
    ])
    expect(spellsUnlockedAt(2, FIXTURE_ALL_SPELLS)).toEqual(FIXTURE_ALL_SPELLS)
  })
})

describe('generateFloor: cumulative spell unlock', () => {
  // FIXTURE_WIT_BOLT (unlockedAtBiome:1) and FIXTURE_WIT_BOLT_TIER2 (unlockedAtBiome:2) are both
  // wit-affinity, matching FIXTURE_CASTER -- exercising the cumulative filter, not just the
  // affinity gate (already covered above).

  it('a biome-1 roll (biomeIndex=1) can NEVER surface a biome-2 spell', () => {
    // At biomeIndex 1, spellsUnlockedAt excludes the tier-2 spell entirely, so the
    // affinity-matched pool is the single-item [FIXTURE_WIT_BOLT] -- weightedPick trivially
    // returns it regardless of the rng value drawn (0.9 is deliberately the same "high roll"
    // value that DOES pick the tier-2 spell once biomeIndex reaches 2, below).
    const fights = generateFloor(
      6,
      FIXTURE_BIOME,
      1,
      FIXTURE_ALL_SPELLS,
      constantRng(0.9),
    )
    for (const fight of fights) {
      for (const enemy of fight.enemyParty) {
        if (enemy.scriptId === 'always-cast') {
          expect(enemy.equippedSpells[0]).toEqual(FIXTURE_WIT_BOLT)
        }
      }
    }
  })

  // Hand-derived: at biomeIndex 2 the wit-matching pool is [FIXTURE_WIT_BOLT,
  // FIXTURE_WIT_BOLT_TIER2] (weight 1 each, total 2). rng.next()=0.9 -> roll = 0.9*2 = 1.8;
  // weightedPick subtracts FIXTURE_WIT_BOLT's weight (1) first: 1.8-1=0.8, not <0, so it moves
  // on; subtracts FIXTURE_WIT_BOLT_TIER2's weight (1): 0.8-1=-0.2, <0 -> TIER2 wins.
  it('a biome-N roll (biomeIndex=2) CAN surface a biome-1 spell, and can also surface the newly-unlocked biome-2 spell', () => {
    const fights = generateFloor(
      6,
      FIXTURE_BIOME,
      2,
      FIXTURE_ALL_SPELLS,
      constantRng(0.9),
    )
    const casters = fights
      .flatMap((f) => f.enemyParty)
      .filter((enemy) => enemy.scriptId === 'always-cast')
    expect(casters.length).toBeGreaterThan(0)
    for (const caster of casters) {
      expect(caster.equippedSpells[0]).toEqual(FIXTURE_WIT_BOLT_TIER2)
    }

    // A lower LOADOUT roll at the same biomeIndex still reaches the biome-1 spell -- proves
    // inheritance, not a switch-over. Needs a sequence rng (not a single constant): floor 1 ->
    // enemyPartySize=1, fightCount=3 -> 3 slots, each drawing [species, within-species creature,
    // level, loadout] (loadout is only drawn for a cast-role creature, per rollLoadout's own
    // early return). species=0.9 -> weightedPick roll=0.9*2=1.8, clears BRAWLERS' weight(1)
    // leaving 0.8 (>=0, continue), then goes negative on CASTERS -- CASTERS wins (same math as
    // the "high roll picks the caster" trace above). CASTERS' one creature and the level roll
    // are both value-irrelevant (any roll resolves the same single-item pool). loadout=0.1 ->
    // roll=0.1*2=0.2, < FIXTURE_WIT_BOLT's weight(1) -> FIXTURE_WIT_BOLT wins over TIER2.
    let cursor = 0
    const sequence = [0.9, 0, 0, 0.1, 0.9, 0, 0, 0.1, 0.9, 0, 0, 0.1]
    const sequenceRng: SeededRng = { next: () => sequence[cursor++] ?? 0 }
    const lowRollFights = generateFloor(
      1,
      FIXTURE_BIOME,
      2,
      FIXTURE_ALL_SPELLS,
      sequenceRng,
    )
    const lowRollCasters = lowRollFights
      .flatMap((f) => f.enemyParty)
      .filter((enemy) => enemy.scriptId === 'always-cast')
    expect(lowRollCasters.length).toBeGreaterThan(0)
    for (const caster of lowRollCasters) {
      expect(caster.equippedSpells[0]).toEqual(FIXTURE_WIT_BOLT)
    }
  })
})
