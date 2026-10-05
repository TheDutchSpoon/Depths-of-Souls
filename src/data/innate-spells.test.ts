// Phase 4.1-G2 (ASSUMPTION 81): the player gem roll excludes the spells a creature holds innately
// (a rule in the store, which has the trait registry). Two data facts keep that rule sufficient:
// no spawnable creature carries an innate spell (so the enemy roll needs no copy of the rule), and
// every creature that does (the starters and the Unicorn) still has a full distinct pool left.

import { describe, expect, test } from 'vitest'
import type { Trait } from '../engine/effect-types'
import { canEquip, spellsUnlockedAt, type SpeciesCreature } from '../engine/generation'
import { DEFAULT_GEM_SLOT_COUNT } from '../engine/config'
import { BIOMES } from './biomes'
import { ALL_SPELLS } from './spells'
import { STARTERS } from './species/starters'
import { TRAIT_REGISTRY } from './traits'

function innateSpellIds(creature: SpeciesCreature): string[] {
  return creature.innateTraitIds.flatMap((traitId) => {
    const trait: Trait | undefined = TRAIT_REGISTRY.get(traitId)
    if (!trait) throw new Error(`${creature.id}: unknown trait ${traitId}`)
    return trait.effects.flatMap((e) =>
      e.category === 'innate-spell' ? [e.spell.id] : [],
    )
  })
}

describe('innate spells and the gem roll', () => {
  test('no spawnable creature or boss (adds included) carries an innate-spell effect', () => {
    const spawnable = BIOMES.flatMap((biome) => [
      ...biome.speciesPool.flatMap((species) => species.creatures),
      ...(biome.boss ? [biome.boss.creature, ...biome.boss.adds] : []),
    ])
    expect(spawnable.length).toBeGreaterThan(50) // the real roster, not an empty loop
    for (const creature of spawnable) {
      expect(innateSpellIds(creature), creature.id).toEqual([])
    }
  })

  test('every starter and the Unicorn has >= 3 spells left at biome 1 after its innate spells', () => {
    expect(STARTERS).toHaveLength(4)
    let sawInnate = false
    for (const creature of STARTERS) {
      const innate = new Set(innateSpellIds(creature))
      if (innate.size > 0) sawInnate = true
      const pool = spellsUnlockedAt(1, ALL_SPELLS).filter(
        (spell) => canEquip(spell, creature.affinity) && !innate.has(spell.id),
      )
      expect(pool.length, creature.id).toBeGreaterThanOrEqual(DEFAULT_GEM_SLOT_COUNT)
    }
    expect(sawInnate).toBe(true) // the Seer's Arcane Bolt: the exclusion is exercised
  })
})
