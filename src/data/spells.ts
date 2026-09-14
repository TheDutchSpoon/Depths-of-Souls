import type { Spell } from '../engine/types'

// Real shipped content, not test fixtures. Phase 8 (Gem Forge/augments/leveling) will
// wrap these in the full Gem economy; for now Creature.equippedSpells holds bare Spells.

export const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'violence',
}

// The "30%-Intelligence" spell anchor from GAME_DESIGN.md §7's own example.
export const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
  affinity: 'violence',
}

// Slice C: a spell-applied status, per CONVENTIONS' "Spell gains an optional status-application."
export const VENOM_BOLT: Spell = {
  id: 'venom-bolt',
  name: 'Venom Bolt',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'instinct',
  appliesStatus: { statusId: 'poison', duration: 3 },
}

// ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- 10 real spells, 2 per affinity, so any
// affinity-matched caster (this biome's own Pollenlord, or a player's own creature via Phase 8
// equipping) has something to draw on. Support-spell-model fields (targetSide/payload/
// statModifier -- Slice E) exercised alongside plain damage spells. Grouped into this biome's
// own spellPool by data/species/overgrowth.ts's OVERGROWTH_SPELLS (imports these by name).

export const THORN_LASH: Spell = {
  id: 'thorn-lash',
  name: 'Thorn Lash',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'violence',
}

export const SNAPPING_BITE: Spell = {
  id: 'snapping-bite',
  name: 'Snapping Bite',
  targetShape: 'single',
  spellPower: 0.55,
  affinity: 'violence',
}

/** Vine Snare: a spell-authored Web application (a second, independent producer of the status
 * alongside Spiders' Weaver trait -- statuses are never producer-exclusive). */
export const VINE_SNARE: Spell = {
  id: 'vine-snare',
  name: 'Vine Snare',
  targetShape: 'single',
  spellPower: 0.3,
  affinity: 'wit',
  appliesStatus: { statusId: 'web', duration: 3 },
}

/** Pollen Cloud: AOE, applies Sleep to everything it hits (a shorter duration than the
 * on-attack-chance route, since it lands on the WHOLE enemy side at once). */
export const POLLEN_CLOUD: Spell = {
  id: 'pollen-cloud',
  name: 'Pollen Cloud',
  targetShape: 'aoe',
  spellPower: 0.25,
  affinity: 'wit',
  appliesStatus: { statusId: 'sleep', duration: 2 },
}

/** Root Grasp: scales off Defence instead of Intelligence (Spell.scalingStat, Slice B) -- a
 * root-themed hit that reads the caster's own sturdiness. */
export const ROOT_GRASP: Spell = {
  id: 'root-grasp',
  name: 'Root Grasp',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'endurance',
  scalingStat: 'defence',
}

export const BRAMBLE_WARD: Spell = {
  id: 'bramble-ward',
  name: 'Bramble Ward',
  targetShape: 'aoe',
  spellPower: 1, // unread in stat-modifier payload mode; see Spell.statModifier's own doc comment
  affinity: 'endurance',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 1.2 },
}

export const REGROWTH: Spell = {
  id: 'regrowth',
  name: 'Regrowth',
  targetShape: 'single',
  spellPower: 0.3,
  affinity: 'vitality',
  scalingStat: 'health',
  targetSide: 'ally',
  payload: 'heal',
}

export const WILD_VIGOR: Spell = {
  id: 'wild-vigor',
  name: 'Wild Vigor',
  targetShape: 'single',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'vitality',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'attack', factor: 1.15 },
}

export const STINGER_SWARM: Spell = {
  id: 'stinger-swarm',
  name: 'Stinger Swarm',
  targetShape: 'single',
  spellPower: 0.45,
  affinity: 'instinct',
}

export const HOWLING_INSTINCT: Spell = {
  id: 'howling-instinct',
  name: 'Howling Instinct',
  targetShape: 'aoe',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'instinct',
  targetSide: 'ally',
  payload: 'stat-modifier',
  statModifier: { stat: 'speed', factor: 1.1 },
}

export const STOCK_SPELLS: readonly Spell[] = [
  EMBER_LANCE,
  CINDER_NOVA,
  VENOM_BOLT,
  THORN_LASH,
  SNAPPING_BITE,
  VINE_SNARE,
  POLLEN_CLOUD,
  ROOT_GRASP,
  BRAMBLE_WARD,
  REGROWTH,
  WILD_VIGOR,
  STINGER_SWARM,
  HOWLING_INSTINCT,
]
