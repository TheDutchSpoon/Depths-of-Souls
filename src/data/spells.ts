import type { Spell } from '../engine/types'

// Real shipped content, not test fixtures. Phase 8 (Gem Forge/augments/leveling) will
// wrap these in the full Gem economy; for now Creature.equippedSpells holds bare Spells.

export const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  spellPower: 0.5,
}

// The "30%-Intelligence" spell anchor from GAME_DESIGN.md §7's own example.
export const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  spellPower: 0.3,
}

export const STOCK_SPELLS: readonly Spell[] = [EMBER_LANCE, CINDER_NOVA]
