// Test-only: builds a fight-ready creature from a REAL Flickerling (data/species/glimmerdark.ts), so
// the Phase 4.1-H2b1 goldens are about the shipped content -- its base stats, affinity and innate
// trait -- not a copy of it. A golden still supplies its own script and any overrides; the stats and
// traits below are read from the species data.

import { makeCreature } from './creatures'
import type { CreatureOverrides } from './creatures'
import type { SpeciesCreature } from '../generation'
import type { Creature, Side } from '../types'

export function fromSpecies(
  species: SpeciesCreature,
  side: Side,
  slot: number,
  overrides: CreatureOverrides = {},
): Creature {
  return makeCreature({
    id: species.id.replace('flickerling-', ''),
    health: species.baseStats.health,
    attack: species.baseStats.attack,
    intelligence: species.baseStats.intelligence,
    defence: species.baseStats.defence,
    speed: species.baseStats.speed,
    affinity: species.affinity,
    innateTraitIds: species.innateTraitIds,
    scriptId: 'always-wait',
    ...overrides,
    side,
    slot,
  })
}
