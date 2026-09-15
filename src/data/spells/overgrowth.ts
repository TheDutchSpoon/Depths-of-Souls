import type { Spell } from '../../engine/types'

// ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- 11 real spells, so any affinity-matched
// caster (this biome's own Pollenlord, or a player's own creature via Phase 8 equipping) has
// something to draw on. Wit carries a third spell (ARCANE_BOLT, see its own doc comment below) --
// every other affinity has two. Support-spell-model fields (targetSide/payload/statModifier --
// Slice E) exercised alongside plain damage spells. Grouped into this biome's own spellPool by
// data/species/overgrowth.ts's OVERGROWTH_SPELLS (imports these by name).

// Damage-spell power-coefficient convention for this biome (design-owner guidance): single-target
// damage-only spells land around 100% Intelligence; single-target spells that ALSO apply a status
// pull back to ~80-90%; AOE damage-only spells would land around 50% (none in this biome -- both
// AOE entries here carry a status too); AOE spells that also apply a status pull back to ~30-40%.

export const THORN_LASH: Spell = {
  id: 'thorn-lash',
  name: 'Thorn Lash',
  targetShape: 'single',
  spellPower: 1.0,
  affinity: 'violence',
}

/** Weakening Bite: Violence's second spell is a debuff, not a second damage spell (design-owner
 * guidance: no two damage-only spells sharing an affinity in this biome) -- permanently lowers a
 * single enemy's Defence for the rest of the fight, via the support-spell model's stat-modifier
 * payload (Slice E) with the default enemy targetSide. */
export const WEAKENING_BITE: Spell = {
  id: 'weakening-bite',
  name: 'Weakening Bite',
  targetShape: 'single',
  spellPower: 1, // unread in stat-modifier payload mode
  affinity: 'violence',
  payload: 'stat-modifier',
  statModifier: { stat: 'defence', factor: 0.8 },
}

/** Vine Snare: a spell-authored Web application (a second, independent producer of the status
 * alongside Spiders' Weaver trait -- statuses are never producer-exclusive). Single-target +
 * upside -> ~80-90% band. */
export const VINE_SNARE: Spell = {
  id: 'vine-snare',
  name: 'Vine Snare',
  targetShape: 'single',
  spellPower: 0.85,
  affinity: 'wit',
  appliesStatus: { statusId: 'web', duration: 3 },
}

/** Pollen Cloud: AOE, applies Sleep to everything it hits (a shorter duration than the
 * on-attack-chance route, since it lands on the WHOLE enemy side at once). AOE + upside -> ~30-40%
 * band. */
export const POLLEN_CLOUD: Spell = {
  id: 'pollen-cloud',
  name: 'Pollen Cloud',
  targetShape: 'aoe',
  spellPower: 0.35,
  affinity: 'wit',
  appliesStatus: { statusId: 'sleep', duration: 2 },
}

/** Arcane Bolt: a normal biome-1 Wit spawn-pool spell (data-layer carrier reorg -- previously
 * kept starter-local as the Sorcerer starter's one granted gem, and unreachable from the spawn
 * pool; there was never a design reason for that, so it's been promoted here like every other
 * spell). The Sorcerer starter (`data/species/starters.ts`) still references it directly for its
 * fixed slot-0 loadout; it also now rolls normally for any Wit-affinity caster. Single-target,
 * no upside -> the plain ~100% band. */
export const ARCANE_BOLT: Spell = {
  id: 'arcane-bolt',
  name: 'Arcane Bolt',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'wit',
}

/** Root Grasp: scales off Defence instead of Intelligence (Spell.scalingStat, Slice B) -- a
 * root-themed hit that reads the caster's own sturdiness. A stat-scaling swap isn't itself an
 * "upside" (no status/heal/buff riding along), so it stays in the single-target-no-upside ~100%
 * band, same as any plain damage spell. */
export const ROOT_GRASP: Spell = {
  id: 'root-grasp',
  name: 'Root Grasp',
  targetShape: 'single',
  spellPower: 1.0,
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
  spellPower: 1.0,
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
