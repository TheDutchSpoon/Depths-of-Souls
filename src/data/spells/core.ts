import type { Spell } from '../../engine/types'

// Real shipped content, not test fixtures. Phase 8 (Gem Forge/augments/leveling) will
// wrap these in the full Gem economy; for now Creature.equippedSpells holds bare Spells.

export const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  spellPower: 0.5,
  affinity: 'violence',
  // Phase 4 interstitial slice (cumulative spell unlock): these three core spells were never
  // actually wired into any biome's roll before this slice (BiomeData.spellPool never
  // referenced data/spells/core.ts) -- unlockedAtBiome:1 plus data/spells/index.ts's new
  // ALL_SPELLS aggregate is what makes them reachable at all now.
  unlockedAtBiome: 1,
}

// The "30%-Intelligence" spell anchor from GAME_DESIGN.md §7's own example.
export const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
  affinity: 'violence',
  unlockedAtBiome: 1,
}

// Slice C: a spell-applied status, per CONVENTIONS' "Spell gains an optional status-application."
export const VENOM_BOLT: Spell = {
  id: 'venom-bolt',
  name: 'Venom Bolt',
  targetShape: 'single',
  spellPower: 0.4,
  affinity: 'instinct',
  appliesStatus: { statusId: 'poison', duration: 3 },
  unlockedAtBiome: 1,
}
