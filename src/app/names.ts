import type { BiomeData, SpeciesCreature } from '../engine/generation'
import { BIOMES } from '../data/biomes'
import { STARTERS } from '../data/species/starters'

/** Template id to display name. A creature's name comes from its `origin.templateId`, never from
 * parsing a `CreatureId`. A boss is in no species
 * pool, only in its biome's `boss`, so the table reads that too. Boss adds are pool members
 * (`generateFloor` enforces it), so they need no row of their own. */
export function buildNameTable(
  standalone: readonly SpeciesCreature[],
  biomes: readonly BiomeData[],
): ReadonlyMap<string, string> {
  const table = new Map<string, string>()
  for (const creature of standalone) table.set(creature.id, creature.name)
  for (const biome of biomes) {
    for (const species of biome.speciesPool) {
      for (const creature of species.creatures) table.set(creature.id, creature.name)
    }
    if (biome.boss) table.set(biome.boss.creature.id, biome.boss.creature.name)
  }
  return table
}

export const DEMO_NAMES = buildNameTable(STARTERS, BIOMES)

/** Throws on a miss: a creature the table can't name is a data drift to surface, and the id is
 * never a fallback label. */
export function creatureName(
  table: ReadonlyMap<string, string>,
  templateId: string,
): string {
  const name = table.get(templateId)
  if (name === undefined)
    throw new Error(`creatureName: no name for template ${templateId}`)
  return name
}

/** The display name of the boss a `bossDefeated` id names, over the biomes' `boss` entries. */
export function bossName(biomes: readonly BiomeData[], bossId: string): string {
  for (const biome of biomes) {
    if (biome.boss?.bossId === bossId) return biome.boss.creature.name
  }
  throw new Error(`bossName: no biome has boss ${bossId}`)
}
