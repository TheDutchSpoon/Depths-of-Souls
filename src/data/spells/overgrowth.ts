import type { Spell } from '../../engine/types'

// ---- The Overgrowth (floors 1-10) -- at least three spells per affinity, so any
// affinity-matched caster (this biome's own Pollenlord, or a player's own creature once equipping
// exists, `spec/creatures.md#gems-as-items`) has something to draw on. Support spells (an ally
// targetSide, `heal` and `apply-stat-modifier` effects) sit alongside plain damage spells. Listed by
// data/species/overgrowth.ts's OVERGROWTH_SPELLS (imports these by name).

// Damage-spell power coefficients follow `content/overgrowth.md#spell-power-convention`.

/** Thorn Volley: the biome's plain AOE damage spell, the area sibling of single-target Thorn
 * Lash. Damage-only AOE sits in the ~50% band (`content/overgrowth.md#spell-power-convention`). */
export const THORN_VOLLEY: Spell = {
  id: 'thorn-volley',
  name: 'Thorn Volley',
  targetShape: 'aoe',
  affinity: 'violence',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.45,
    },
  ],
}

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

/** Weakening Bite: Violence's second spell is a debuff, not a second damage spell (no two
 * damage-only spells sharing an affinity in this biome) -- permanently lowers a
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
 * on-attack-chance route, since it lands on the WHOLE enemy side at once). A control spell with NO
 * damage, like Pacify and Silence. */
export const POLLEN_CLOUD: Spell = {
  id: 'pollen-cloud',
  name: 'Pollen Cloud',
  targetShape: 'aoe',
  affinity: 'wit',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'sleep', duration: 2 },
    },
  ],
}

/** Arcane Bolt: a normal biome-1 Wit spawn-pool spell. The Sorcerer starter's innate spell
 * (`SORCERER_STARTER_TRAIT`, `data/traits/starters.ts`) is this spell; it also rolls normally for
 * any Wit-affinity caster. Single-target, no upside -> the plain ~100% band: spell power 1.0. */
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
      spellPower: 1.0,
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

/** Silence -- a pure status spell (no damage): the target cannot Cast for its
 * next 3 turns (Silenced's own `defaultDuration`, inherited: the effect omits a duration).
 * Violence's control spell. It authors no numbers of its own. */
export const SILENCE: Spell = {
  id: 'silence',
  name: 'Silence',
  targetShape: 'single',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'silenced' },
    },
  ],
}

/** Pacify -- Silence's Wit mirror: the target cannot Attack for its next 3
 * turns. A pure status spell, duration inherited from Pacified's `defaultDuration`. */
export const PACIFY: Spell = {
  id: 'pacify',
  name: 'Pacify',
  targetShape: 'single',
  affinity: 'wit',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'pacified' },
    },
  ],
}

/** Pounce, Instinct's third
 * biome-1 spell and its only one that scales off Speed instead of Intelligence. Single-target, no
 * upside, so it sits in the ~100% band. */
export const POUNCE: Spell = {
  id: 'pounce',
  name: 'Pounce',
  targetShape: 'single',
  affinity: 'instinct',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      scalingStat: 'speed',
      spellPower: 1.0,
      damageSource: 'cast',
    },
  ],
}

/** Stifling Weight, Endurance's third biome-1 spell -- a pure status spell:
 * Weakens a single enemy (-20% damage dealt) for Weaken's inherited 3 turns. No damage. */
export const STIFLING_WEIGHT: Spell = {
  id: 'stifling-weight',
  name: 'Stifling Weight',
  targetShape: 'single',
  affinity: 'endurance',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'weaken' },
    },
  ],
}

/** Life Siphon, Vitality's third biome-1 spell and its only damage spell: a
 * single-target hit (70% Intelligence) that heals the caster for 35% of its Intelligence. */
export const LIFE_SIPHON: Spell = {
  id: 'life-siphon',
  name: 'Life Siphon',
  targetShape: 'single',
  affinity: 'vitality',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.7,
    },
    {
      kind: 'heal',
      target: { kind: 'self' },
      scalingStat: 'intelligence',
      spellPower: 0.35,
    },
  ],
}
