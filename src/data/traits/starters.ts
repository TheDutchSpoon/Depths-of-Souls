import type { DescribedTrait } from './described'
import { ARCANE_BOLT } from '../spells'

// The three spec starter creatures' + the Unicorn's signature traits. Real,
// shipped content -- see `data/species/starters.ts` for the SpeciesCreature defs that reference
// these by id (this file only defines the carriers; the model is composition).

// ---- Sorcerer starter ----
// Wit affinity, high Intelligence (`specializations/sorcerer.md#starter-glyphmoth-seer`).

/** A 50% chance at the end of its turn to cast a random equipped spell: an ordinary
 * `on-turn-end` trigger whose `perform-action(self, cast gemSlot 'random')` response queues the
 * cast; it runs in the turn's granted-actions step (after the turn-end hooks), through the one
 * action pipeline (locks, Confusion -> Tunnel Vision -> Provoke, a skipped turn refuses it). The
 * chance is rolled at trigger time; the gem, then the target, are drawn when the grant runs.
 * The innate spell is an `innate-spell { spell: ARCANE_BOLT }` effect on the trait rather than a
 * fixed `SpeciesCreature.equippedSpells` loadout baked into the species template, so it travels
 * through fusion, whichever parent the Seer is. Not a gem: no level, no augments, no equip gate.
 * `createCombat`'s fight-setup prepends every `innate-spell` effect's spell onto the creature's
 * `equippedSpells`, innate slots first. */
export const SORCERER_STARTER_TRAIT: DescribedTrait = {
  id: 'sorcerer-starter-arcane-surge',
  name: 'Arcane Surge',
  description:
    'An innate spell, Arcane Bolt, dealing 100% of its Intelligence (not a gem: un-upgradeable, no affinity gate, an extra slot before the gem slots, kept through fusion), plus, at the end of each of its turns, a 50% chance to cast a random one of its spells, Arcane Bolt included.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-turn-end',
      chancePercent: 50,
      response: {
        kind: 'perform-action',
        actor: 'self',
        intent: { action: { kind: 'cast', gemSlot: 'random' } },
      },
    },
    { category: 'innate-spell', spell: ARCANE_BOLT },
  ],
}

// ---- Brute starter ----
// High Attack; Attack executes twice at 100%, each a real attack firing on-attack (same target as
// the first, default-target fallback if it died)
// (`specializations/brute.md#starter-cragfang-mauler`). A direct, content-level exercise of the
// action instance-list model -- no new resolver logic needed.

export const BRUTE_STARTER_TRAIT: DescribedTrait = {
  id: 'brute-starter-double-strike',
  name: 'Double Strike',
  description:
    "Its Attack resolves one additional instance: it attacks twice at 100%, each a real attack firing on-attack, at the first one's target (the default target if that one died).",
  effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 100 }],
}

// ---- Shieldbarer starter ----
// High Defence; on-provoke, your creatures gain +35% Defence (team-wide,
// `specializations/shieldbarer.md#starter-stonehorn-warden`). A
// stat-modifier (not grant-action-state -- it's a stat buff, not an action-state flag), targeted at
// the `all-allies` ResponseTarget. Permanent-for-fight and re-fired on every Provoke, so
// repeated provokes stack (a ramping team-Defence engine).

export const SHIELDBARER_STARTER_TRAIT: DescribedTrait = {
  id: 'shieldbarer-starter-rally',
  name: 'Rallying Cry',
  description:
    'Whenever it provokes, your creatures gain +35% Defence for the rest of the fight, so repeated provokes stack into a ramping team-Defence engine.',
  effects: [
    {
      category: 'triggered',
      hook: 'on-provoke',
      response: {
        kind: 'apply-stat-modifier',
        target: { kind: 'all-allies' },
        stat: 'defence',
        factor: 1.35,
      },
    },
  ],
}

// ---- The Unicorn ----
// Unique, permanent intro-helper party member (`content/overgrowth.md#unicorn-lightbearer`);
// joins via the scripted-intro encounter, a run-layer concern -- this file only authors
// the creature + trait content itself.

export const UNICORN_TRAIT: DescribedTrait = {
  id: 'unicorn-guardians-light',
  name: "Guardian's Light",
  description:
    "Whenever it attacks, it revives a random dead ally at 20% of that ally's baseline maximum HP. With Flurry it attacks twice, so it revives twice.",
  effects: [
    {
      category: 'triggered',
      hook: 'on-attack',
      response: { kind: 'revive', target: { kind: 'random-dead-ally' }, pct: 0.2 },
    },
  ],
}

export const STARTER_TRAITS: readonly DescribedTrait[] = [
  SORCERER_STARTER_TRAIT,
  BRUTE_STARTER_TRAIT,
  SHIELDBARER_STARTER_TRAIT,
  UNICORN_TRAIT,
]
