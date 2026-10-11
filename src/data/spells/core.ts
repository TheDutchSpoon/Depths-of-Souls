import type { Spell } from '../../engine/types'

// Real shipped content, not test fixtures. The full Gem economy (`spec/creatures.md#gems-as-items`)
// will wrap these; for now Creature.equippedSpells holds bare Spells.

export const EMBER_LANCE: Spell = {
  id: 'ember-lance',
  name: 'Ember Lance',
  targetShape: 'single',
  affinity: 'violence',
  // These three core spells are reachable by the roll through `unlockedAtBiome: 1` plus
  // data/spells/index.ts's ALL_SPELLS aggregate (`spec/run.md#spells-unlock-cumulatively`).
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

// The "30%-Intelligence" spell anchor from `content/overgrowth.md#spell-power-convention`'s own example.
export const CINDER_NOVA: Spell = {
  id: 'cinder-nova',
  name: 'Cinder Nova',
  targetShape: 'aoe',
  affinity: 'violence',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.3,
    },
  ],
}

// A spell-applied status, per `spec/combat.md#spells-carry-responses`
export const VENOM_BOLT: Spell = {
  id: 'venom-bolt',
  name: 'Venom Bolt',
  targetShape: 'single',
  affinity: 'instinct',
  unlockedAtBiome: 1,
  targetSide: 'enemy',
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.4,
    },
    {
      kind: 'apply-status',
      target: { kind: 'cast-target' },
      status: { statusId: 'poison', duration: 3 },
    },
  ],
}
