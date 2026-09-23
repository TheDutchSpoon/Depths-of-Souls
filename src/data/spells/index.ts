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
import {
  AFTERGLOW,
  BEACON_CHARGE,
  BLINDING_FLARE,
  DISORIENT,
  LUMINOUS_TIDE,
  OVERCHARGE,
} from './glimmerdark'
import {
  CHARNEL_FEAST,
  PUPPET_STRING,
  RASPING_CHANT,
  SPORE_CYST,
  WITHERING_BOLT,
} from './rotcap-hollow'

// The library barrel (CONVENTIONS "Data layer — carriers vs. composition"): re-exports every
// individual spell const from its grouping file.
export * from './core'
export * from './overgrowth'
export * from './glimmerdark'
export * from './rotcap-hollow'

/**
 * Phase 4 interstitial slice (cumulative spell unlock): the GLOBAL spell registry --
 * `generateFloor` no longer rolls a cast-role loadout from a per-biome `BiomeData.spellPool`
 * (removed; see engine/generation.ts), it rolls from THIS list filtered to `unlockedAtBiome <=
 * currentBiomeIndex` then by affinity (`spellsUnlockedAt`). Also what wires core.ts's three
 * spells into the roll for the first time -- previously unreferenced by any biome. Order IS
 * determinism-relevant: `weightedPick` (generation.ts) walks the affinity-filtered slice of this
 * list in order, subtracting weights, so registry order maps each RNG roll to a spell -- the
 * generation tests rely on exactly that. Keep this list APPEND-ONLY; reordering it would silently
 * change which spell a given seed rolls in real playthroughs (determinism is sacred).
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
  BLINDING_FLARE,
  AFTERGLOW,
  LUMINOUS_TIDE,
  SPORE_CYST,
  RASPING_CHANT,
  PUPPET_STRING,
  CHARNEL_FEAST,
  WITHERING_BOLT,
]
