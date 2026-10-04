import type { Spell } from '../../engine/types'

// ---- Phase 4 Slice H1: The Overgrowth (floors 1-10) -- 11 real spells, so any affinity-matched
// caster (this biome's own Pollenlord, or a player's own creature via Phase 8 equipping) has
// something to draw on. Wit carries a third spell (ARCANE_BOLT, see its own doc comment below) --
// every other affinity has two. Support spells (an ally targetSide, `heal` and
// `apply-stat-modifier` effects) sit alongside plain damage spells. Grouped into this biome's own spellPool by
// data/species/overgrowth.ts's OVERGROWTH_SPELLS (imports these by name).

// Damage-spell power-coefficient convention for this biome (design-owner guidance): single-target
// damage-only spells land around 100% Intelligence; single-target spells that ALSO apply a status
// pull back to ~80-90%; AOE damage-only spells would land around 50% (none in this biome -- both
// AOE entries here carry a status too); AOE spells that also apply a status pull back to ~30-40%.

export const THORN_LASH: Spell = {
  id: 'thorn-lash',
  name: 'Thorn Lash',
  targetShape: 'single',
  affinity: 'violence',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1.0,
    },
  ],
}

/** Weakening Bite: Violence's second spell is a debuff, not a second damage spell (design-owner
 * guidance: no two damage-only spells sharing an affinity in this biome) -- permanently lowers a
 * single enemy's Defence for the rest of the fight, via an `apply-stat-modifier`
 * effect with the enemy targetSide. */
export const WEAKENING_BITE: Spell = {
  id: 'weakening-bite',
  name: 'Weakening Bite',
  targetShape: 'single',
  affinity: 'violence',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'apply-stat-modifier',
      target: { kind: 'cast-target' },
      stat: 'defence',
      factor: 0.8,
    },
  ],
}

/** Vine Snare: a spell-authored Web application (a second, independent producer of the status
 * alongside Spiders' Weaver trait -- statuses are never producer-exclusive). Single-target +
 * upside -> ~80-90% band. */
export const VINE_SNARE: Spell = {
  id: 'vine-snare',
  name: 'Vine Snare',
  targetShape: 'single',
  affinity: 'wit',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.85,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'web', duration: 3 },
    },
  ],
}

/** Pollen Cloud: AOE, applies Sleep to everything it hits (a shorter duration than the
 * on-attack-chance route, since it lands on the WHOLE enemy side at once). AOE + upside -> ~30-40%
 * band. */
export const POLLEN_CLOUD: Spell = {
  id: 'pollen-cloud',
  name: 'Pollen Cloud',
  targetShape: 'aoe',
  affinity: 'wit',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.35,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'sleep', duration: 2 },
    },
  ],
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
  affinity: 'wit',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

/** Root Grasp: scales off Defence instead of Intelligence (a `scalingStat` damage effect) -- a
 * root-themed hit that reads the caster's own sturdiness. A stat-scaling swap isn't itself an
 * "upside" (no status/heal/buff riding along), so it stays in the single-target-no-upside ~100%
 * band, same as any plain damage spell. */
export const ROOT_GRASP: Spell = {
  id: 'root-grasp',
  name: 'Root Grasp',
  targetShape: 'single',
  affinity: 'endurance',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      scalingStat: 'defence',
      spellPower: 1.0,
      damageSource: 'cast',
    },
  ],
}

export const BRAMBLE_WARD: Spell = {
  id: 'bramble-ward',
  name: 'Bramble Ward',
  targetShape: 'aoe',
  affinity: 'endurance',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-stat-modifier',
      target: { kind: 'cast-target' },
      stat: 'defence',
      factor: 1.2,
    },
  ],
}

export const REGROWTH: Spell = {
  id: 'regrowth',
  name: 'Regrowth',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'heal',
      target: { kind: 'cast-target' },
      scalingStat: 'health',
      spellPower: 0.3,
    },
  ],
}

export const WILD_VIGOR: Spell = {
  id: 'wild-vigor',
  name: 'Wild Vigor',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-stat-modifier',
      target: { kind: 'cast-target' },
      stat: 'attack',
      factor: 1.15,
    },
  ],
}

export const STINGER_SWARM: Spell = {
  id: 'stinger-swarm',
  name: 'Stinger Swarm',
  targetShape: 'single',
  affinity: 'instinct',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 1.0,
    },
  ],
}

export const HOWLING_INSTINCT: Spell = {
  id: 'howling-instinct',
  name: 'Howling Instinct',
  targetShape: 'aoe',
  affinity: 'instinct',
  targetSide: 'ally',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-stat-modifier',
      target: { kind: 'cast-target' },
      stat: 'speed',
      factor: 1.1,
    },
  ],
}
