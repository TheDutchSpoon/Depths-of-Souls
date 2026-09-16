import type { Spell } from '../../engine/types'
import { CINDER_NOVA, EMBER_LANCE, VENOM_BOLT } from './core'
import {
  ARCANE_BOLT,
  BRAMBLE_WARD,
  HOWLING_INSTINCT,
  POLLEN_CLOUD,
  REGROWTH,
  ROOT_GRASP,
  STINGER_SWARM,
  THORN_LASH,
  VINE_SNARE,
  WEAKENING_BITE,
  WILD_VIGOR,
} from './overgrowth'
import { BEACON_CHARGE, DISORIENT, OVERCHARGE } from './glimmerdark'

// The library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every
// individual spell const from its grouping file.
export * from './core'
export * from './overgrowth'
export * from './glimmerdark'

/**
 * Phase 4 interstitial slice (cumulative spell unlock): the GLOBAL spell registry --
 * `generateFloor` no longer rolls a cast-role loadout from a per-biome `BiomeData.spellPool`
 * (removed; see engine/generation.ts), it rolls from THIS list filtered to `unlockedAtBiome <=
 * currentBiomeIndex` then by affinity (`spellsUnlockedAt`). Also what wires core.ts's three
 * spells into the roll for the first time -- previously unreferenced by any biome. Order is
 * cosmetic (never re-sorted; `spellsUnlockedAt`'s filter + `weightedPick`'s own iteration don't
 * care about registry order).
 */
export const ALL_SPELLS: readonly Spell[] = [
  EMBER_LANCE,
  CINDER_NOVA,
  VENOM_BOLT,
  THORN_LASH,
  WEAKENING_BITE,
  VINE_SNARE,
  POLLEN_CLOUD,
  ARCANE_BOLT,
  ROOT_GRASP,
  BRAMBLE_WARD,
  REGROWTH,
  WILD_VIGOR,
  STINGER_SWARM,
  HOWLING_INSTINCT,
  BEACON_CHARGE,
  OVERCHARGE,
  DISORIENT,
]
