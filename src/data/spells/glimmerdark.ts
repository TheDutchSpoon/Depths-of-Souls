import type { Spell } from '../../engine/types'

// ---- Phase 4 Slice H2: Glimmerdark (floors 11-20) -- 10 real spells (two per affinity, mirroring
// H1's density/pattern exactly). Grouped into this biome's own spellPool by
// data/species/glimmerdark.ts's GLIMMERDARK_SPELLS (imports these by name).

// Same damage-spell power-coefficient convention as Overgrowth (data/spells/overgrowth.ts):
// single-target damage-only ~100% Intelligence; single-target + upside ~80-90%; AOE + upside
// ~30-40% (no plain AOE-damage-only entry in this biome either).

export const CRYSTAL_SHARD: Spell = {
  id: 'crystal-shard',
  name: 'Crystal Shard',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'violence',
}

/** Violence's second spell is a debuff, not a second damage spell (same convention as
 * Overgrowth's Weakening Bite) -- permanently lowers a single enemy's Defence. */
export const FRACTURE_STRIKE: Spell = {
  id: 'fracture-strike',
  name: 'Fracture Strike',
  targetShape: 'single',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'violence',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 0.8 },
}

export const GLOWSPARK_BOLT: Spell = {
  id: 'glowspark-bolt',
  name: 'Glowspark Bolt',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'wit',
}

/** Beacon Charge: a small heal (the support-spell model's `heal` payload) that ALSO charges the
 * target with a stack of Glow (`appliesStatus`, applied after the heal lands) -- ties the
 * Glowflies' resource into the shared spell pool, per species-locked.md's own "a spell may apply
 * any status, including another species' signature one" rule. Single-target + upside -> ~80-90%
 * band. */
export const BEACON_CHARGE: Spell = {
  id: 'beacon-charge',
  name: 'Beacon Charge',
  targetShape: 'single',
  spellPower: 0.3,
  affinity: 'wit',
  targetSide: 'ally',
  payload: 'heal',
  appliesStatus: { statusId: 'glow' },
}

/** Root Grasp's mirror for this biome: scales off Defence instead of Intelligence
 * (Spell.scalingStat). No upside riding along -> the plain ~100% band. */
export const STONESHELL_BASH: Spell = {
  id: 'stoneshell-bash',
  name: 'Stoneshell Bash',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'endurance',
  scalingStat: 'defence',
}

export const BASTION_CHANT: Spell = {
  id: 'bastion-chant',
  name: 'Bastion Chant',
  targetShape: 'aoe',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'endurance',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 1.2 },
}

export const ECHO_FANG: Spell = {
  id: 'echo-fang',
  name: 'Echo Fang',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'instinct',
}

export const PACK_HOWL: Spell = {
  id: 'pack-howl',
  name: 'Pack Howl',
  targetShape: 'aoe',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'instinct',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'speed', factor: 1.1 },
}

export const BIOGLOW_MEND: Spell = {
  id: 'bioglow-mend',
  name: 'Bioglow Mend',
  targetShape: 'single',
  spellPower: 0.3,
  affinity: 'vitality',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
}

export const LUMINOUS_VIGOR: Spell = {
  id: 'luminous-vigor',
  name: 'Luminous Vigor',
  targetShape: 'single',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'attack', factor: 1.15 },
}
