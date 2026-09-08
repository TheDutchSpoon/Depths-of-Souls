export type CreatureId = string & { readonly __brand: 'CreatureId' }

export function createCreatureId(value: string): CreatureId {
  return value as CreatureId
}

/** Identifies a biome (Phase 4 Slice A). Distinct brand from CreatureId/SpeciesId so the
 * three ID spaces can never be mixed up at the type level. */
export type BiomeId = string & { readonly __brand: 'BiomeId' }

export function createBiomeId(value: string): BiomeId {
  return value as BiomeId
}
