// Phase 4 Slice F: specializations/perks (CONVENTIONS "Specializations are data... perks are
// effect-framework effect-carriers -- v1 combat-only"). Each spec's own `.claude/specializations/
// {sorcerer,brute,shieldbarer}.md` is the source of truth for every perk's exact cost/effect/
// Phase tag; this file is that table transcribed into data, reusing ONLY vocabulary already
// built by Slices A-E2 (per the plan's own "Response reuse check" -- confirmed perk-by-perk in
// the comments below).
//
// ASSUMPTION 20: leveled perks' effects are a FUNCTION of the purchased level (not a fixed
// definition) -- `effects: EffectDef[] | ((level: number) => EffectDef[])`. A load-time
// validator (`validateSpecialization`, called at the bottom of this module for all three specs)
// asserts each spec's perks sum to exactly 1000 -- throws at import time, not a
// runtime-reachable error, so a data-authoring mistake fails fast in tests.
//
// ASSUMPTION 24: Phase-8-inert perks (the gem-equip-economy Mastery family + Arcane Shields/
// Arcane Versatility/True Wit for Sorcerer, Shield Specialist for Shieldbarer, Proficient's half
// of Brute's Proficient Warrior) are authored as REAL PerkDefs (full cost/maxLevel, counted
// toward the 1000-point sum) whose `effects` are simply `[]` -- there is no engine primitive for
// "equip gems off-affinity" / "equipment Stat Slot benefit" at all yet (the whole gem/equipment
// forge economy is Phase 8), so `[]` is the honest, correct dormant reading, not a stub.
//
// Review amendment (post-initial-submission): Brute's "Brute Force" (+1% damage with ATTACKS per
// rank) and Sorcerer's "Spell Focus" (+1% SPELL damage per level) are each authored as
// `conditional-damage-bonus` (Slice E2) with an unconditional `{kind: 'always'}` condition -- the
// only existing dealt-pool-percentage primitive. `ConditionalDamageBonusDef` now carries an
// `actionKind?: 'attack' | 'cast' | 'both'` field (mirroring `CrossStatDef.appliesTo`), so each
// perk correctly scopes to its own action kind and does NOT leak onto the other one (the initial
// submission's own flagged caveat, now resolved rather than accepted).
//
// Review amendment: Bulwark ("-5% damage taken per Defend, cap 80%") is authored as a genuine
// permanent passive perk effect (`{ category: 'taken-reduction', ... }`) -- not, as the initial
// submission had it, a triggered `on-fight-start -> apply-status` smuggling a STATUS into a
// perk's own `effects: []`. See `TakenReductionDef`'s own doc comment (effect-types.ts).

import type { EffectDef } from '../engine/effect-types'
import { BRUTE_STARTER, SHIELDBARER_STARTER, SORCERER_STARTER } from './species/starters'

export interface PerkDef {
  readonly id: string
  readonly name: string
  readonly maxLevel: number
  readonly costPerLevel: number
  /** 'p4' = functional now; 'p8' = authored in full but always-zero-effect until the Phase 8
   * gem/equipment economy exists (ASSUMPTION 24). */
  readonly phase: 'p4' | 'p8'
  readonly effects: readonly EffectDef[] | ((level: number) => readonly EffectDef[])
}

export interface Specialization {
  readonly id: string
  readonly name: string
  readonly starterCreatureId: string
  readonly perks: readonly PerkDef[]
}

/** CONVENTIONS' stated invariant: a spec is valid iff `Σ(maxLevel × costPerLevel) === 1000`.
 * Throws at import time (called at the bottom of this module for all three specs) -- a
 * data-authoring mistake fails fast in tests, never reachable at runtime. */
export function validateSpecialization(spec: Specialization): void {
  const total = spec.perks.reduce((sum, p) => sum + p.maxLevel * p.costPerLevel, 0)
  if (total !== 1000) {
    throw new Error(
      `specialization invariant violated: ${spec.id}'s perks sum to ${total} points, expected exactly 1000`,
    )
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
 * ready to pass directly as `createCombat`'s `partyWidePlayerEffects` argument (the Slice G
 * store's own eventual job; exposed here so this slice's own tests/goldens can exercise the same
 * integration path). */
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
      // "Your creatures Cast spells an additional time." -- Slice B's action-instance model,
      // the same primitive the Echo/Flurry perk family runs on unchanged.
      id: 'echo',
      name: 'Echo',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
      effects: [{ category: 'action-instance', actionKind: 'cast', powerPercent: 100 }],
    },
    {
      id: 'wit-mastery',
      name: 'Wit Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'violence-mastery',
      name: 'Violence Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'endurance-mastery',
      name: 'Endurance Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'vitality-mastery',
      name: 'Vitality Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'instinct-mastery',
      name: 'Instinct Mastery',
      maxLevel: 1,
      costPerLevel: 60,
      phase: 'p8',
      effects: [],
    },
    {
      // "Your creatures are immune to the effect of Silenced." status-immunity (Slice C) --
      // suppresses Silenced's EFFECT only, per the immunity-suppresses-effect principle; the
      // status still applies/counts for has-status.
      id: 'clear-mind',
      name: 'Clear Mind',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
      effects: [{ category: 'status-immunity', statusId: 'silenced' }],
    },
    {
      // "+1% Intelligence per level." Plain leveled stat-modifier.
      id: 'arcane-might',
      name: 'Arcane Might',
      maxLevel: 50,
      costPerLevel: 2,
      phase: 'p4',
      effects: (level) => [
        { category: 'stat-modifier', stat: 'intelligence', factor: 1 + 0.01 * level },
      ],
    },
    {
      id: 'arcane-shields',
      name: 'Arcane Shields',
      maxLevel: 10,
      costPerLevel: 10,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'arcane-versatility',
      name: 'Arcane Versatility',
      maxLevel: 10,
      costPerLevel: 10,
      phase: 'p8',
      effects: [],
    },
    {
      id: 'true-wit',
      name: 'True Wit',
      maxLevel: 5,
      costPerLevel: 20,
      phase: 'p8',
      effects: [],
    },
    {
      // "+1% spell damage per level." conditional-damage-bonus + {kind:'always'} standing in
      // for an unconditional dealt-% bonus, scoped to Cast only via actionKind.
      id: 'spell-focus',
      name: 'Spell Focus',
      maxLevel: 100,
      costPerLevel: 1,
      phase: 'p4',
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
      phase: 'p4',
      effects: [{ category: 'action-instance', actionKind: 'attack', powerPercent: 100 }],
    },
    {
      id: 'might',
      name: 'Might',
      maxLevel: 50,
      costPerLevel: 2,
      phase: 'p4',
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
      phase: 'p4',
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
      phase: 'p4',
      effects: [{ category: 'status-immunity', statusId: 'pacified' }],
    },
    {
      // "Your creatures always have Splashing and Proficient." Splashing (Slice C) is real;
      // Proficient (equipment Stat Slots, P8) has no engine primitive to key off yet -- see
      // top-of-file ASSUMPTION 24.
      id: 'proficient-warrior',
      name: 'Proficient Warrior',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
      effects: [{ category: 'splashing' }],
    },
    {
      // "Your creatures' Splashing now hits all enemies." Inert without Splashing also active,
      // but every Brute purchasing this alongside Proficient Warrior gets the real upgrade.
      id: 'annihilate',
      name: 'Annihilate',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
      effects: [{ category: 'annihilate' }],
    },
    {
      // "On cast, +1% of the caster's Attack per rank is added to the spell's damage." The
      // textbook cross-stat consumer (CONVENTIONS names this exact perk under "Cross-stat
      // contribution").
      id: 'aggressive-caster',
      name: 'Aggressive Caster',
      maxLevel: 25,
      costPerLevel: 4,
      phase: 'p4',
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
      // "On attack, 1% chance per rank to Weaken the target." chancePercent (Slice E2) gates a
      // triggered apply-status response; reuses the existing WEAKEN status verbatim, inheriting
      // its `defaultDuration` (3) -- no explicit duration to repeat here.
      id: 'concussive-blows',
      name: 'Concussive Blows',
      maxLevel: 25,
      costPerLevel: 4,
      phase: 'p4',
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
      // "+1% damage to Weakened targets per level." The textbook conditional-damage-bonus
      // consumer (CONVENTIONS names this exact perk under that primitive).
      id: 'cull-the-weak',
      name: 'Cull the Weak',
      maxLevel: 50,
      costPerLevel: 2,
      phase: 'p4',
      effects: (level) => [
        {
          category: 'conditional-damage-bonus',
          percent: 0.01 * level,
          condition: { kind: 'has-status', subject: 'target', statusId: 'weaken' },
        },
      ],
    },
    {
      // "Your creatures ignore enemy Provoke." provoke-immunity (Slice C).
      id: 'tunnel-vision',
      name: 'Tunnel Vision',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
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
      // genuine permanent passive (taken-reduction, review amendment) -- not a status; its own
      // magnitudeSource (self-defend-count) drives the live scaling every read, no application
      // moment needed.
      id: 'bulwark',
      name: 'Bulwark',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
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
      // "On provoke, the creature also defends." grant-action-state (Slice B), reused verbatim.
      id: 'shield-up',
      name: 'Shield up',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
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
      // (Slice B).
      id: 'armor-piercer',
      name: 'Armor piercer',
      maxLevel: 25,
      costPerLevel: 4,
      phase: 'p4',
      effects: (level) => [{ category: 'armor-penetration', percent: 0.01 * level }],
    },
    {
      id: 'shield-specialist',
      name: 'Shield Specialist',
      maxLevel: 100,
      costPerLevel: 1,
      phase: 'p8',
      effects: [],
    },
    {
      // "After taking damage from an attack or spell, deal damage to that enemy equal to 15% of
      // the creature's Defence." deal-damage's scalingStat (Slice B) -- a genuine retaliation
      // hit, its own instance, distinct from Shield Bash below.
      id: 'thorns',
      name: 'Thorns',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
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
      // "Attacks and spells deal additional damage equal to 3% of Defence per level." The
      // textbook cross-stat consumer for BOTH action kinds (CONVENTIONS names this exact perk).
      id: 'shield-bash',
      name: 'Shield Bash',
      maxLevel: 10,
      costPerLevel: 10,
      phase: 'p4',
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
      phase: 'p4',
      effects: [{ category: 'status-immunity', statusId: 'confusion' }],
    },
    {
      // "When taking damage that would kill the creature, 50% chance to be left at 1 HP."
      // cheat-death (Slice D).
      id: 'last-stand',
      name: 'Last Stand',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
      effects: [{ category: 'cheat-death', chancePercent: 50 }],
    },
    {
      // "Your creatures start each battle defending." grant-action-state, fired on-fight-start.
      id: 'phalanx',
      name: 'Phalanx',
      maxLevel: 1,
      costPerLevel: 100,
      phase: 'p4',
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
      phase: 'p4',
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
