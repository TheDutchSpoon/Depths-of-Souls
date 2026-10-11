// specializations/perks (`spec/progression.md#specializations-are-data`: perks are
// effect-framework effect-carriers, v1 combat-only). Each spec's own `.claude/specializations/
// {sorcerer,brute,shieldbarer}.md` is the source of truth for every perk's exact cost and
// effect; this file is that table transcribed into data, reusing ONLY vocabulary the effect
// framework already has (confirmed perk-by-perk in the comments below).
//
// Leveled perks' effects are a FUNCTION of the purchased level (not a fixed
// definition) -- `effects: EffectDef[] | ((level: number) => EffectDef[])`. A load-time
// validator (`validateSpecialization`, called at the bottom of this module for all three specs)
// asserts each spec's perks sum to exactly 1000 -- throws at import time, not a
// runtime-reachable error, so a data-authoring mistake fails fast in tests.
//
// Inert perks (`spec/progression.md#inert-perks`: the gem-equip-economy Mastery family +
// Arcane Shields/Arcane Versatility/True Wit for Sorcerer, Shield Specialist for Shieldbarer,
// Proficient's half of Brute's Proficient Warrior) are authored as REAL PerkDefs (full
// cost/maxLevel, counted toward the 1000-point sum) whose `effects` are simply `[]` -- there is
// no engine primitive for equipping gems off-affinity or for an equipment Stat Slot benefit at all (the
// whole gem/equipment forge economy is unbuilt: `spec/creatures.md#gems-as-items`,
// `spec/creatures.md#equipment`), so `[]` is the honest, correct dormant reading, not a stub.
//
// Brute's "Brute Force" (+1% damage with ATTACKS per rank) and Sorcerer's "Spell Focus" (+1%
// SPELL damage per level) are each authored as `conditional-damage-bonus` with an unconditional
// `{kind: 'always'}` condition -- the only existing dealt-pool-percentage primitive.
// `ConditionalDamageBonusDef` carries an `actionKind?: 'attack' | 'cast' | 'both'` field
// (mirroring `CrossStatDef.appliesTo`), so each perk scopes to its own action kind and does NOT
// leak onto the other one.
//
// Bulwark ("-5% damage taken per Defend, cap 80%") is authored as a genuine permanent passive
// perk effect (`{ category: 'taken-reduction', ... }`) -- not a triggered
// `on-fight-start -> apply-status` smuggling a STATUS into a perk's own `effects: []`. See
// `TakenReductionDef`'s own doc comment (effect-types.ts).

import type { EffectDef } from '../engine/effect-types'
import {
  validateNoBreakChanceOutsideStatus,
  validateNoSnapshotPotencyOutsideStatus,
  validateNoRandomSelectorInResponseTargets,
  validateObservationFilters,
  validateStatModifierConditions,
} from '../engine/effect-types'
import { BRUTE_STARTER, SHIELDBARER_STARTER, SORCERER_STARTER } from './species/starters'

export interface PerkDef {
  readonly id: string
  readonly name: string
  readonly maxLevel: number
  readonly costPerLevel: number
  readonly effects: readonly EffectDef[] | ((level: number) => readonly EffectDef[])
}

export interface Specialization {
  readonly id: string
  readonly name: string
  readonly starterCreatureId: string
  readonly perks: readonly PerkDef[]
}

/** `spec/progression.md#specializations-are-data` stated invariant: a spec is valid iff `Σ(maxLevel × costPerLevel) === 1000`.
 * Throws at import time (called at the bottom of this module for all three specs) -- a
 * data-authoring mistake fails fast in tests, never reachable at runtime. */
export function validateSpecialization(spec: Specialization): void {
  const total = spec.perks.reduce((sum, p) => sum + p.maxLevel * p.costPerLevel, 0)
  if (total !== 1000) {
    throw new Error(
      `specialization invariant violated: ${spec.id}'s perks sum to ${total} points, expected exactly 1000`,
    )
  }
  // Perks are stat-modifier carriers too (e.g. Arcane Might's "+1%
  // Intelligence per level") -- run the same load-time validator over every perk's resolved
  // effects. A level-function's SHAPE (which stat, which condition) is level-invariant by
  // construction (only the factor magnitude varies with `level`), so level 1 is representative.
  // Also rejects the intent-only 'random' selector in any
  // trigger's response target -- perks are triggered-response carriers too.
  for (const perk of spec.perks) {
    const effects = typeof perk.effects === 'function' ? perk.effects(1) : perk.effects
    validateStatModifierConditions(effects)
    validateNoBreakChanceOutsideStatus(effects)
    validateNoSnapshotPotencyOutsideStatus(effects)
    validateNoRandomSelectorInResponseTargets(effects)
    // A perk is a trigger carrier too.
    validateObservationFilters(effects, `perk "${perk.id}"`)
  }
}

/** The effects a purchased `level` of `perk` contributes -- `0`/absent is a full no-op (an
 * unpurchased perk contributes nothing). A flat (non-leveled) perk's `effects` array is used
 * as-is for any `level >= 1` (its own `maxLevel` is 1, so "purchased" and "purchased at max" are
 * the same state). */
export function resolvePerkEffects(perk: PerkDef, level: number): readonly EffectDef[] {
  if (level <= 0) return []
  return typeof perk.effects === 'function' ? perk.effects(level) : perk.effects
}

/** The flattened, already-resolved effect list a `{chosenSpec, perkSpend}` pair produces --
 * ready to pass directly as `createCombat`'s `partyWidePlayerEffects` argument (exposed here so
 * tests and goldens can exercise the same integration path). */
export function resolveSpecializationEffects(
  spec: Specialization,
  perkSpend: ReadonlyMap<string, number>,
): readonly EffectDef[] {
  return spec.perks.flatMap((perk) =>
    resolvePerkEffects(perk, perkSpend.get(perk.id) ?? 0),
  )
}

// ---- Sorcerer ----

export const SORCERER: Specialization = {
  id: 'sorcerer',
  name: 'Sorcerer',
  starterCreatureId: SORCERER_STARTER.id,
  perks: [
    {
      // "Your creatures Cast spells an additional time." -- the action-instance model,
      // the same primitive the Echo/Flurry perk family runs on unchanged.
      id: 'echo',
      name: 'Echo',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'action-instance', actionKind: 'cast', powerPercent: 100 }],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#wit-mastery`
      id: 'wit-mastery',
      name: 'Wit Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#violence-mastery`
      id: 'violence-mastery',
      name: 'Violence Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#endurance-mastery`
      id: 'endurance-mastery',
      name: 'Endurance Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#vitality-mastery`
      id: 'vitality-mastery',
      name: 'Vitality Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#instinct-mastery`
      id: 'instinct-mastery',
      name: 'Instinct Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      effects: [],
    },
    {
      // "Your creatures are immune to the effect of Silenced." status-immunity --
      // suppresses Silenced's EFFECT only, per the immunity-suppresses-effect principle; the
      // status still applies/counts for has-status.
      id: 'clear-mind',
      name: 'Clear Mind',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'status-immunity', statusId: 'silenced' }],
    },
    {
      // "+1% Intelligence per level." Plain leveled stat-modifier.
      id: 'arcane-might',
      name: 'Arcane Might',
      maxLevel: 50,
      costPerLevel: 2,
      effects: (level) => [
        { category: 'stat-modifier', stat: 'intelligence', factor: 1 + 0.01 * level },
      ],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#arcane-shields`
      id: 'arcane-shields',
      name: 'Arcane Shields',
      maxLevel: 10,
      costPerLevel: 10,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#arcane-versatility`
      id: 'arcane-versatility',
      name: 'Arcane Versatility',
      maxLevel: 10,
      costPerLevel: 10,
      effects: [],
    },
    {
      // Inert (gem system): `specializations/sorcerer.md#true-wit`
      id: 'true-wit',
      name: 'True Wit',
      maxLevel: 5,
      costPerLevel: 20,
      effects: [],
    },
    {
      // "+1% spell damage per level." conditional-damage-bonus + {kind:'always'} standing in
      // for an unconditional dealt-% bonus, scoped to Cast only via actionKind.
      id: 'spell-focus',
      name: 'Spell Focus',
      maxLevel: 100,
      costPerLevel: 1,
      effects: (level) => [
        {
          category: 'conditional-damage-bonus',
          percent: 0.01 * level,
          condition: { kind: 'always' },
          actionKind: 'cast',
        },
      ],
    },
  ],
}

// ---- Brute ----

export const BRUTE: Specialization = {
  id: 'brute',
  name: 'Brute',
  starterCreatureId: BRUTE_STARTER.id,
  perks: [
    {
      // "Your creatures Attack an additional time." The instance-list model, attack side.
      id: 'flurry',
      name: 'Flurry',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 100 }],
    },
    {
      id: 'might',
      name: 'Might',
      maxLevel: 50,
      costPerLevel: 2,
      effects: (level) => [
        { category: 'stat-modifier', stat: 'attack', factor: 1 + 0.01 * level },
      ],
    },
    {
      // "+1% damage with attacks per rank." conditional-damage-bonus + {kind:'always'}, scoped
      // to Attack only via actionKind.
      id: 'brute-force',
      name: 'Brute Force',
      maxLevel: 100,
      costPerLevel: 1,
      effects: (level) => [
        {
          category: 'conditional-damage-bonus',
          percent: 0.01 * level,
          condition: { kind: 'always' },
          actionKind: 'attack',
        },
      ],
    },
    {
      // "Immune to the effect of Pacified." Mirror of Clear Mind, Brute's own control-immunity.
      id: 'aggressive',
      name: 'Aggressive',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'status-immunity', statusId: 'pacified' }],
    },
    {
      // Your creatures always have Splashing and Proficient (`specializations/brute.md#proficient-warrior`).
      // Splashing is real; Proficient (equipment Stat Slots, `spec/creatures.md#equipment`) has no
      // engine primitive to key off yet -- see
      // the note on inert perks at the top of this file.
      id: 'proficient-warrior',
      name: 'Proficient Warrior',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'splashing' }],
    },
    {
      // "Your creatures' Splashing now hits all enemies." Inert without Splashing also active,
      // but every Brute purchasing this alongside Proficient Warrior gets the real upgrade.
      id: 'annihilate',
      name: 'Annihilate',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'annihilate' }],
    },
    {
      // On a cast, +1% of the caster's Attack per level is added to the spell's damage
      // (`specializations/brute.md#aggressive-caster`). The textbook cross-stat consumer
      // (`spec/combat.md#cross-stat-contribution`).
      id: 'aggressive-caster',
      name: 'Aggressive Caster',
      maxLevel: 25,
      costPerLevel: 4,
      effects: (level) => [
        {
          category: 'cross-stat',
          fromStat: 'attack',
          percentPerRank: 0.01 * level,
          appliesTo: 'cast',
        },
      ],
    },
    {
      // "On attack, 1% chance per rank to Weaken the target." chancePercent gates a
      // triggered apply-status response; reuses the existing WEAKEN status verbatim, inheriting
      // its `defaultDuration` (3) -- no explicit duration to repeat here.
      id: 'concussive-blows',
      name: 'Concussive Blows',
      maxLevel: 25,
      costPerLevel: 4,
      effects: (level) => [
        {
          category: 'triggered',
          hook: 'on-attack',
          chancePercent: 1 * level,
          response: {
            kind: 'apply-status',
            target: { kind: 'triggering-source' },
            status: { statusId: 'weaken' },
          },
        },
      ],
    },
    {
      // +1% damage to Weakened targets per level (`specializations/brute.md#cull-the-weak`). The
      // textbook conditional-damage-bonus consumer (`spec/effects.md#conditional-damage-bonus`).
      id: 'cull-the-weak',
      name: 'Cull the Weak',
      maxLevel: 50,
      costPerLevel: 2,
      effects: (level) => [
        {
          category: 'conditional-damage-bonus',
          percent: 0.01 * level,
          condition: { kind: 'has-status', subject: 'target', statusId: 'weaken' },
        },
      ],
    },
    {
      // "Your creatures ignore enemy Provoke." provoke-immunity.
      id: 'tunnel-vision',
      name: 'Tunnel Vision',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'provoke-immunity' }],
    },
  ],
}

// ---- Shieldbarer ----

export const SHIELDBARER: Specialization = {
  id: 'shieldbarer',
  name: 'Shieldbarer',
  starterCreatureId: SHIELDBARER_STARTER.id,
  perks: [
    {
      // "-5% damage taken (cap 80%) for each time the creature has Defended this battle." A
      // genuine permanent passive (taken-reduction) -- not a status; its own
      // magnitudeSource (self-defend-count) drives the live scaling every read, no application
      // moment needed.
      id: 'bulwark',
      name: 'Bulwark',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [
        {
          category: 'taken-reduction',
          magnitude: 0.95,
          magnitudeSource: { kind: 'count', of: 'self-defend-count' },
          accumulation: 'additive',
          reductionCap: 0.8,
        },
      ],
    },
    {
      // "On provoke, the creature also defends." grant-action-state, reused verbatim.
      id: 'shield-up',
      name: 'Shield up',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [
        {
          category: 'triggered',
          hook: 'on-provoke',
          response: {
            kind: 'grant-action-state',
            target: { kind: 'self' },
            defending: true,
          },
        },
      ],
    },
    {
      // "Attacks and spells ignore 1% of the enemy's Defence per level." armor-penetration
      id: 'armor-piercer',
      name: 'Armor piercer',
      maxLevel: 25,
      costPerLevel: 4,
      effects: (level) => [{ category: 'armor-penetration', percent: 0.01 * level }],
    },
    {
      // Inert (equipment system): `specializations/shieldbarer.md#shield-specialist`
      id: 'shield-specialist',
      name: 'Shield Specialist',
      maxLevel: 100,
      costPerLevel: 1,
      effects: [],
    },
    {
      // "After taking damage from an attack or spell, deal damage to that enemy equal to 15% of
      // the creature's Defence." deal-damage's scalingStat -- a genuine retaliation
      // hit, its own instance, distinct from Shield Bash below.
      id: 'thorns',
      name: 'Thorns',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [
        {
          category: 'triggered',
          hook: 'on-damage-taken',
          response: {
            kind: 'deal-damage',
            target: { kind: 'triggering-source' },
            scalingStat: 'defence',
            spellPower: 0.15,
          },
        },
      ],
    },
    {
      // Attacks and spells deal additional damage equal to 3% of the creature's Defence per level
      // (`specializations/shieldbarer.md#shield-bash`). The textbook cross-stat consumer for BOTH
      // action kinds (`spec/combat.md#cross-stat-contribution`).
      id: 'shield-bash',
      name: 'Shield Bash',
      maxLevel: 10,
      costPerLevel: 10,
      effects: (level) => [
        {
          category: 'cross-stat',
          fromStat: 'defence',
          percentPerRank: 0.03 * level,
          appliesTo: 'both',
        },
      ],
    },
    {
      // "Immune to the effect of Confused." Shieldbarer's own control-immunity.
      id: 'lucidity',
      name: 'Lucidity',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'status-immunity', statusId: 'confusion' }],
    },
    {
      // "When taking damage that would kill the creature, 50% chance to be left at 1 HP."
      // cheat-death.
      id: 'last-stand',
      name: 'Last Stand',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [{ category: 'cheat-death', chancePercent: 50 }],
    },
    {
      // "Your creatures start each battle defending." grant-action-state, fired on-fight-start.
      id: 'phalanx',
      name: 'Phalanx',
      maxLevel: 1,
      costPerLevel: 100,
      effects: [
        {
          category: 'triggered',
          hook: 'on-fight-start',
          response: {
            kind: 'grant-action-state',
            target: { kind: 'self' },
            defending: true,
          },
        },
      ],
    },
    {
      // "On defend, +1% Defence per level." apply-stat-modifier fired on-defend, re-stacking
      // every Defend (the same repeated-trigger-apply shape traits.ts's GRUDGE already proves).
      id: 'defensive-stance',
      name: 'Defensive Stance',
      maxLevel: 10,
      costPerLevel: 10,
      effects: (level) => [
        {
          category: 'triggered',
          hook: 'on-defend',
          response: {
            kind: 'apply-stat-modifier',
            target: { kind: 'self' },
            stat: 'defence',
            factor: 1 + 0.01 * level,
          },
        },
      ],
    },
  ],
}

export const SPECIALIZATIONS: readonly Specialization[] = [SORCERER, BRUTE, SHIELDBARER]

export const SPECIALIZATIONS_BY_ID: ReadonlyMap<string, Specialization> = new Map(
  SPECIALIZATIONS.map((s) => [s.id, s]),
)

for (const spec of SPECIALIZATIONS) {
  validateSpecialization(spec)
}
