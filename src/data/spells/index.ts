import { validateSpellEffects } from '../../engine/effect-types'
import type { Spell } from '../../engine/types'
import { CINDER_NOVA, EMBER_LANCE, VENOM_BOLT } from './core'
import {
  ARCANE_BOLT,
  BRAMBLE_WARD,
  HOWLING_INSTINCT,
  LIFE_SIPHON,
  PACIFY,
  POLLEN_CLOUD,
  POUNCE,
  REGROWTH,
  ROOT_GRASP,
  SILENCE,
  STIFLING_WEIGHT,
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
  KINDRED_LIGHT,
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
 * change which spell a given seed rolls in real playthroughs (determinism is sacred). The one
 * deliberate exception so far: Phase 4.1-H2b1 deleted Overcharge (its Glow was deleted), which
 * shifts the indices after it -- visible only in pools that held it (Wit, biome 2 and deeper) --
 * and renamed Luminous Tide to Kindred Light in place.
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
  DISORIENT,
  BLINDING_FLARE,
  AFTERGLOW,
  KINDRED_LIGHT,
  SPORE_CYST,
  RASPING_CHANT,
  PUPPET_STRING,
  CHARNEL_FEAST,
  WITHERING_BOLT,
  // Phase 4.1-F3 (G2): appended LAST (append-only; order maps RNG rolls to spells).
  SILENCE,
  PACIFY,
  // Phase 4.1-G1 (D4): appended LAST, in this order (append-only; order maps RNG rolls to spells).
  POUNCE,
  STIFLING_WEIGHT,
  LIFE_SIPHON,
]

// Phase 4.1-D (A4): load-time check that every spell's effect list holds only what a spell may
// (deal-damage/heal in formula mode, apply-status, apply-stat-modifier, remove-status, each
// targeting cast-target or self). Throws at import, like the trait/status validators.
for (const spell of ALL_SPELLS) validateSpellEffects(spell)
