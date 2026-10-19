import { validateSpellEffects } from '../../engine/effect-types'
import type { Spell } from '../../engine/types'
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
  THORN_VOLLEY,
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

// The library barrel (`CONVENTIONS.md#effect-carriers-live-in-libraries`): re-exports every
// individual spell const from its grouping file.
export * from './overgrowth'
export * from './glimmerdark'
export * from './rotcap-hollow'

/**
 * The GLOBAL spell registry (`spec/run.md#spells-unlock-cumulatively`): `generateFloor` rolls a
 * every enemy's gem set from THIS list filtered to `unlockedAtBiome <= currentBiomeIndex` then by
 * affinity (`spellsUnlockedAt`). Order IS
 * determinism-relevant: `weightedPick` (generation.ts) walks the affinity-filtered slice of this
 * list in order, subtracting weights, so registry order maps each RNG roll to a spell -- the
 * generation tests rely on exactly that. Keep this list APPEND-ONLY; reordering it would silently
 * change which spell a given seed rolls in real playthroughs (determinism is sacred). Deleting a
 * spell is a deliberate content change: it shifts the rolls of the affinity it leaves.
 */
export const ALL_SPELLS: readonly Spell[] = [
  THORN_VOLLEY,
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
  // Appended LAST (append-only; order maps RNG rolls to spells).
  SILENCE,
  PACIFY,
  // Appended LAST, in this order (append-only; order maps RNG rolls to spells).
  POUNCE,
  STIFLING_WEIGHT,
  LIFE_SIPHON,
]

// load-time check that every spell's effect list holds only what a spell may
// (deal-damage/heal in formula mode, apply-status, apply-stat-modifier, remove-status, each
// targeting cast-target or self). Throws at import, like the trait/status validators.
for (const spell of ALL_SPELLS) validateSpellEffects(spell)
