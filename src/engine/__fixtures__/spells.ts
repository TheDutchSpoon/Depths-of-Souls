import type { Spell } from '../types'

// The three mechanism-test spells: one per spell shape a mechanism golden or unit test needs,
// test-only and never registered in game data
// (`CONVENTIONS.md#mechanism-goldens-vs-content-goldens`). Their numbers are pinned by the goldens
// that cast them, so a tuning change to a shipped spell never reaches them.

/** A single-target Violence damage spell at 50% of the caster's Intelligence. */
export const SINGLE_VIOLENCE_SPELL: Spell = {
  id: 'fixture-single-violence',
  name: 'Single Violence Spell',
  targetShape: 'single',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.5,
    },
  ],
}

/** An AOE Violence damage spell at 30% of the caster's Intelligence. */
export const AOE_VIOLENCE_SPELL: Spell = {
  id: 'fixture-aoe-violence',
  name: 'AOE Violence Spell',
  targetShape: 'aoe',
  affinity: 'violence',
  targetSide: 'enemy',
  unlockedAtBiome: 1,
  effects: [
    {
      kind: 'deal-damage',
      target: { kind: 'cast-target' },
      offStat: 'cast',
      spellPower: 0.3,
    },
  ],
}

/** A single-target Instinct damage spell at 40% that applies Poison for 3 turns. */
export const POISON_INSTINCT_SPELL: Spell = {
  id: 'fixture-poison-instinct',
  name: 'Poison Instinct Spell',
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
