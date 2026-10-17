// The unified effect framework's type surface (`spec/effects.md#one-effect-framework`).
// Traits, statuses, and (later) gem augments / artifact infusions are all
// instances of this ONE data-driven, hook-based model.
//
// Statuses are containers of these same effects (`StatusDef.effects`), read
// through the one effect iterator (effects.ts `flatEffects`).

import type { Affinity, Spell, Stat } from './types'
import type { CreatureId } from './ids'
import type { ComparatorOp, Condition, Intent, TargetSelector } from './scripting-types'

// Stable per-fight identity for an effect instance. Deterministic (never RNG) so goldens
// reproduce; the stack-scoped self-re-entry guard keys on this.
export type EffectInstanceId = string & { readonly __brand: 'EffectInstanceId' }

export function createEffectInstanceId(value: string): EffectInstanceId {
  return value as EffectInstanceId
}

/**
 * Which damage channel a `deal-damage` response runs in, and which channel an `on-damage-taken`
 * trigger answers (`TriggeredDef.damageChannel`).
 * `'direct'` = an Attack or Cast action (a spell's own effect list; a granted action runs through
 * the same executors) -- the chip-floor formula plus the Additional. `'indirect'` = any other
 * damage (a trait, status or perk response) -- the magnitude formula against a fifth of Defence.
 * Stated explicitly by every caller; it is never inferred from `damageSource` (a display tag) or
 * from `castTarget`.
 */
export type DamageChannel = 'direct' | 'indirect'

// The v1 hook vocabulary (16 in all, `spec/effects.md#hooks`).
// on-wait is deliberately omitted. A single general on-action-observed (see the
// actor-vs-observer routing rule, `spec/effects.md#action-reactions-actor-self-hooks-or-observation`)
// covers what an on-ally-action/on-enemy-action pair would, and a single on-death-observed what
// a per-side pair of death observers would.
export type Hook =
  | 'on-fight-start'
  | 'on-turn-start'
  | 'on-turn-end'
  | 'on-round-end'
  | 'on-damage-dealt'
  | 'on-damage-taken'
  | 'on-kill'
  | 'on-death'
  | 'on-action-observed'
  | 'on-damage-observed'
  | 'on-death-observed'
  | 'on-status-applied'
  | 'on-attack'
  | 'on-cast'
  | 'on-defend'
  | 'on-provoke'

// A damage-formula slot whose source stat a `stat-remap` can redirect. Structurally identical
// to effective-stats' ActionKind ('attack' | 'cast').
export type RemapSlot = 'attack' | 'cast'

/** An alternative to a literal flat-mode magnitude (`deal-damage.flatAmount` / `heal.flatAmount`)
 * -- a percentage of a creature's effective stat. Two readers: a response's own cost or heal reads
 * the FIRING creature's stat live (the Wick's burn and heal); a status's
 * `potency` reads the APPLIER's stat once, at application (`snapshotFor`, effects.ts).
 * `percent` is a positive integer, not a float fraction: `floor(floor(stat) * percent * count /
 * 100)` is exact in integer arithmetic, whereas a float fraction (e.g. `stat * 0.03`) can land
 * just below an integer and floor one too low (180 * 0.03 * 5 = 26.999999999999996 -> 26, not
 * 27). See resolveFlatTotal (resolution.ts) for the composition with the magnitudeSource count. */
export type StatPercent = {
  readonly ofStat: Stat
  readonly percent: number
}

/** The magnitude marker of a status's tick -- "the instance's
 * potency". A `deal-damage` / `heal` whose `flatAmount` is this IS the status's tick: indirect
 * damage (or a heal) from the instance's applier snapshot (`StatusSnapshot`), never the bearer's
 * stat. Valid only inside a status that declares `StatusDef.potency` (`validateStatusDef`); a
 * trait, perk or spell may not carry it. Any other self-damage inside a status is a cost. */
export type SnapshotPotency = { readonly kind: 'snapshot-potency' }

/** What a ticking status instance records at
 * application and never re-reads from the applier: who applied it, the applier's affinity then,
 * and the potency (`StatusDef.potency`'s percent of the applier's effective stat then, floored
 * once). Present on an instance iff its def declares `potency`. */
export type StatusSnapshot = {
  readonly applierId: CreatureId
  readonly affinity: Affinity
  readonly potency: number
}

// ---- the count-scaling / resource-primitive vocabulary ----
// `spec/effects.md#count-scaling`'s magnitudeSource.

/** The six live "board counts" resolveCount (effects.ts) reads, all resolved relative to the
 * READING creature's own side/affinity/species (matching targeting.ts's livingAlliesOf
 * convention: "ally" includes the acting creature) -- recomputed fresh on every read, never
 * cached. 'enemies-with-status' additionally needs a statusId (MagnitudeSource's own sibling
 * field below), since the count itself doesn't say WHICH status. */
export type CountOf =
  | 'living-allies'
  | 'living-allies-of-affinity'
  | 'living-allies-of-species'
  | 'enemies-with-status'
  | 'dead-allies'
  | 'self-defend-count'

/** The SOURCE of the repetition count a host field multiplies/exponentiates its own authored
 * rate by (deal-damage's spellPower, damage-modifier's magnitude×count or magnitude**count;
 * `spec/effects.md#count-scaling`). Absent means a count of one, so every call site is
 * byte-identical when magnitudeSource is absent. The count is a LIVE board count, recomputed on
 * every read. `flat` is the existing implicit behavior, made explicit. `stat-modifier`'s
 * `factor` is NOT wired to this source on the standalone EffectDef (see StatModifierDef's own
 * comment); `apply-stat-modifier` carries it instead. */
export type MagnitudeSource =
  | { readonly kind: 'flat'; readonly value: number }
  | { readonly kind: 'count'; readonly of: CountOf; readonly statusId?: string }

export type ResponseTarget =
  | { readonly kind: 'self' }
  | { readonly kind: 'triggering-source' }
  | { readonly kind: 'all-enemies' }
  // The ally-side mirror of all-enemies, resolved via livingAlliesOf(self) --
  // "ally" includes the firing creature itself, matching every other ally-side convention.
  | { readonly kind: 'all-allies' }
  // The species-scoped mirror of all-allies: resolved via livingAlliesOf(self) further filtered to
  // creatures sharing the firing creature's own speciesId (the filter resolveCount's
  // 'living-allies-of-species' count kind uses, now as a target list). Includes the firing
  // creature itself, matching every other ally-side convention. Empty only for a bearer with no
  // speciesId (a hand-built creature; `materializeCreature` sets it).
  | { readonly kind: 'all-allies-of-species' }
  | { readonly kind: 'selector'; readonly selector: TargetSelector }
  // v1 TargetSelectors are alive-only, so `revive` (whose target
  // must be DEAD) needs its own resolution path -- a random dead member of the firing creature's
  // OWN side (the Unicorn's "resurrects a random dead ally" wording).
  | { readonly kind: 'random-dead-ally' }
  // No existing TargetSelector can
  // express "excluding a status" -- a `random-ally-without-status` variant, a genuinely new
  // ResponseTarget. Resolved like `random-dead-ally` above -- a
  // random pick among the firing creature's own LIVING allies (self naturally excluded once
  // dead, since livingAlliesOf filters on `alive`) that do NOT carry `statusId`, via `hasStatus`
  // (effects.ts). Empty pool -> no targets: the owning trigger's `TriggerFired` still fires (this
  // is a targeting fizzle, not a suppressed trigger), but nothing follows it -- the same "no
  // valid target after TriggerFired" discipline as revive's "target must be dead" skip -- this
  // is what makes Spore's contagion infect only fresh hosts instead of endlessly refreshing
  // the same one.
  | { readonly kind: 'random-ally-without-status'; readonly statusId: string }
  // Valid ONLY inside `Spell.effects` (rejected in trait/perk/status responses
  // by `throwIfRandomSelectorTarget`'s validators). The spell's current landed target -- the
  // single target, or the AOE member being hit -- alive or not. A dead landed target gets nothing
  // because no verb acts on a corpse (`revive` excepted; the verb rule in `executeResponse`), not
  // because this target kind filters it -- which is why an `apply-status` after a killing hit
  // lands nowhere. Outside a cast context (no `castTarget` on the HookContext) resolving it is a
  // resolver-invariant error.
  | { readonly kind: 'cast-target' }
  // The lowest-current-HP living ally
  // OTHER than the firing creature that is below its effective max Health. Reads the SAME pool
  // (`injuredOtherAlliesOf`, targeting.ts) as the trigger-only `other-ally-injured` condition, so
  // the gate and the target cannot disagree. A response target, deliberately NOT a player-facing
  // `TargetSelector`. RNG-free; ties by the standard order.
  | { readonly kind: 'lowest-hp-injured-other-ally' }

// Applied via a spell or a triggered apply-status response.
export interface StatusSpec {
  readonly statusId: string
  /** OPTIONAL -- an omitted duration inherits the target
   * status's own `StatusDef.defaultDuration`; an explicit value here overrides it. Lets the same
   * status land with a consistent duration everywhere it's applied without every producer
   * (traits/perks/spells) having to repeat the same number. */
  readonly duration?: number
}

// The v1 triggered-response vocabulary. Each is parameterized by target + magnitude.
export type EffectResponse =
  | {
      readonly kind: 'deal-damage'
      readonly target: ResponseTarget
      // Formula mode (the default): a real Attack/Cast-flavored hit -- reads the source's live
      // effective Attack/Intelligence through the real damage formula (OffStat, Defence,
      // affinity, pools). Used by trait retaliation etc.
      readonly offStat?: RemapSlot
      readonly spellPower?: number
      // An alternative to offStat -- an arbitrary Stat (e.g. Defence for
      // Thorns/Shield Bash), read directly via getEffectiveStat (no stat-remap resolution,
      // unlike offStat/RemapSlot) then × spellPower, through the SAME downstream formula.
      // Mutually exclusive with offStat/flatAmount -- setting more than one of
      // offStat/scalingStat/flatAmount throws a resolver-invariant error, mirroring how
      // applyStatus treats an unknown statusId, rather than silently picking one.
      readonly scalingStat?: Stat
      // Flat mode: a fixed magnitude -- a number, a `StatPercent` of the FIRING creature's stat
      // (a cost when it targets itself), or the `snapshot-potency` marker (a status's tick: the
      // applier's snapshot, never the bearer's stat). Always indirect (no true-damage channel),
      // scaled by the magnitudeSource count when one is declared.
      // Mutually exclusive with offStat/scalingStat (enforced -- see above);
      // presence of flatAmount selects this mode and its sibling spellPower field is simply never
      // read. Deliberately NOT `scalingStat` mode: a tick has its own formula (resolution.ts
      // `applyTickDamage`) over the snapshot's inputs.
      readonly flatAmount?: number | StatPercent | SnapshotPotency
      /** DoT ticks emit no TriggerFired (their StatusApplied already announced them); default true. */
      readonly emitTriggerFired?: boolean
      /** Overrides the DamageDealt tag; default derived from offStat ('dot' when flatAmount is set). */
      readonly damageSource?: 'attack' | 'cast' | 'dot'
      /** The source of the repetition count this response's own magnitude is
       * scaled by (flat mode's `amount × count`, or in offStat/scalingStat mode spellPower's own
       * `× 1`) -- see MagnitudeSource's doc comment for the exact composition. Absent (the common
       * case) is a count of one. */
      readonly magnitudeSource?: MagnitudeSource
    }
  | {
      readonly kind: 'heal'
      readonly target: ResponseTarget
      /** Flat heal amount (stat-percent or flat). A
       * number, a `StatPercent` of the FIRING creature's stat (the Wick's heal), or the
       * `snapshot-potency` marker (Regen's tick: the applier's snapshot). Mutually
       * exclusive with `scalingStat` -- setting both throws a resolver-invariant error rather than silently
       * picking one, as deal-damage does. See resolveFlatTotal (resolution.ts). */
      readonly flatAmount?: number | StatPercent | SnapshotPotency
      /** The remap-aware formula slot, mirroring deal-damage's
       * own `offStat` -- `getOffensiveStat(HEALER, offStat, spellPower × count)`, so `'cast'` is
       * the default Intelligence lookup a heal SPELL always used (a `stat-remap` redirects it;
       * `scalingStat` reads its stat raw). The three magnitude modes (`flatAmount` /
       * `scalingStat` / `offStat`) are mutually exclusive -- a resolver-invariant error otherwise. */
      readonly offStat?: RemapSlot
      /** stat-scaled mode -- `getEffectiveStat(HEALER,
       * scalingStat) × (spellPower ?? 1)`, mirroring deal-damage's own scalingStat/spellPower
       * pairing exactly. Reads the HEALER's (the firing creature's) own stat, never the
       * target's -- same "attacker's own stat" precedent as deal-damage; target-%-max-HP heals
       * (reading the TARGET's max HP) are deferred, no content needs them. */
      readonly scalingStat?: Stat
      /** Coefficient on `scalingStat` / `offStat`; only read in those modes. Default 1.0. */
      readonly spellPower?: number
      /** The source of the repetition count this response's own
       * magnitude is scaled by -- `flatAmount`'s `× count` (flat mode) or, in `scalingStat` mode,
       * `spellPower`'s own implicit `× 1` -- see deal-damage's own `magnitudeSource` doc comment
       * for the exact composition (identical shape here). Absent is a count of one. */
      readonly magnitudeSource?: MagnitudeSource
      /** Regen ticks emit no TriggerFired, matching DoT; default true. */
      readonly emitTriggerFired?: boolean
    }
  | {
      readonly kind: 'apply-status'
      readonly target: ResponseTarget
      readonly status: StatusSpec
    }
  | {
      readonly kind: 'apply-stat-modifier'
      readonly target: ResponseTarget
      readonly stat: Stat
      readonly factor: number
      /** FREEZE-AT-APPLICATION -- when
       * present, the live resolveMagnitudeCount(...) reading is resolved ONCE, at the moment
       * this response executes (e.g. an on-fight-start trigger), and combined with `factor` as
       * `finalFactor = 1 + (factor - 1) * count` -- `factor` is reinterpreted as "the per-unit
       * rate" only in this mode (mirrors how a magnitudeSource substitutes for a
       * repetition count elsewhere, never the rate itself). The resulting StatModifierEffect
       * carries only the flat, already-computed `finalFactor` -- there is no live recompute
       * afterward (contrast Bulwark's damage-modifier, which DOES recompute on every read); a
       * later change in the live count (e.g. an ally dying) does NOT retroactively change an
       * already-applied modifier. Absent -- `factor` used directly. This is why Striker is authored
       * as an apply-stat-modifier RESPONSE (fires once), not a live passive `StatModifierDef`
       * sitting directly in `Trait.effects` (which
       * would fold LIVE on every getEffectiveStat read -- no "application moment" to freeze at). */
      readonly magnitudeSource?: MagnitudeSource
    }
  // Target must be DEAD (see ResponseTarget's random-dead-ally). Returns the
  // target to its slot at the DEATH-RESET baseline (a fresh instantiation of innateTraitIds --
  // no ramp preserved) with currentHp = round(baselineMaxHp * pct), computed from that fresh
  // baseline (Unicorn: pct 0.2).
  | { readonly kind: 'revive'; readonly target: ResponseTarget; readonly pct: number }
  // Sets `defending`/`provoking` true on the target(s) -- reuses Defend's
  // existing ×1.5/×0.65 math and Provoke's existing redirect verbatim; only ever sets true
  // (never clears), mirroring the resolver's existing "until its next turn" expiry.
  | {
      readonly kind: 'grant-action-state'
      readonly target: ResponseTarget
      readonly defending?: boolean
      readonly provoking?: boolean
    }
  // Clears a status from a target, reusing the existing StatusExpired path (death-reset and
  // turn-end cleanup stay consistent) -- a no-op, no-event when the target doesn't carry it
  // (mirrors revive's "target must be dead" skip style). `target` reuses the full ResponseTarget
  // vocabulary, so "cleanse lowest-hp-ally" / "dispel all-enemies" get targeting for free. The
  // verb set is not closed: a new verb needs a review, and must route through the one response
  // path (`spec/responses.md#no-side-doors`). `filter` is a plain statusId for now -- a
  // polarity-based filter (`'buff' | 'debuff'`, reading StatusDef.polarity) is a natural future
  // widening for the first cleanse/dispel spell, not built until there's a real producer/consumer
  // to test against (no dead union branch).
  | {
      readonly kind: 'remove-status'
      readonly target: ResponseTarget
      readonly filter: { readonly statusId: string }
    }
  // Make `actor` take a REAL action through the one action pipeline. It does not
  // execute anything itself: fireHook's response runs, `executeResponse` QUEUES a grant on the
  // `ResolutionContext` (`ctx.grants`), and the scope that created the context drains it at its end
  // (actions.ts `drainGrantedActions`) -- actions are atomic, so the granted action starts only after
  // the granting action (all its instances) has completed. `actor: 'self'` is the bearer;
  // `'triggering-source'` is the hook's source INCLUDING the bearer itself (Overtone echoes its own
  // casts -- `spec/responses.md#triggering-source-is-never-the-firing-creature` covers response TARGETS, not
  // this field). Legal on trait/perk effects and status triggers only: a spell's effect list rejects it at load time. RNG draw order: the trigger's
  // `chancePercent` roll at trigger time; then, when the grant runs, the gem draw, the target draw,
  // and any Confusion/Provoke draws.
  | {
      readonly kind: 'perform-action'
      readonly actor: 'self' | 'triggering-source'
      readonly intent: Intent
    }

// ---- Effect definitions (as authored in a Trait; no instance identity yet) ----

// read-time activation condition for a conditional passive -- DATA, not a
// function (the one thing that made
// combat state non-plain-data). Self-only: evaluated against the single creature bearing the
// effect, never CombatState. `hp-percent` mirrors the scripting Condition's own integer
// cross-multiplication (see effective-stats.ts's hpPercentSatisfied, shared with conditions.ts).
// A load-time validator (data/traits/index.ts, data/specializations.ts) rejects a `hp-percent`
// condition on a `stat: 'health'` StatModifierDef -- the one shape that would read the stat it
// gates (a read-cycle in getEffectiveStat's own folding loop). `has-status`/`always` never read
// a stat, so they're unconditionally safe regardless of which stat they gate.
export type SelfCondition =
  | { readonly kind: 'always' }
  | {
      readonly kind: 'hp-percent'
      readonly comparator: ComparatorOp
      readonly thresholdPercent: number
    }
  | { readonly kind: 'has-status'; readonly statusId: string }

// NOTE: `magnitudeSource` is deliberately NOT wired HERE, on the standalone EffectDef
// (`spec/effects.md#stat-modifier-counts-freeze-at-application`). getEffectiveStat(creature, stat)
// is called from ~15+ sites across the codebase (conditions.ts, turn-order.ts,
// target-selectors.ts, ...), several of which have no CombatState in scope at all; giving it
// access to live board counts would mean an invasive, CombatState-aware signature change to a
// function the whole damage-formula/scripting pipeline depends on. It lives on the
// `apply-stat-modifier` EffectResponse (see its own doc comment) instead -- Swarmhive Striker
// (`content/overgrowth.md#swarmhive-striker`) and Necromoss are authored as a triggered response
// (fires once, e.g. on-fight-start), never as a live-folding passive `StatModifierDef` sitting
// directly in a Trait's `effects` array.
export type StatModifierDef = {
  readonly category: 'stat-modifier'
  readonly stat: Stat
  readonly factor: number
  readonly condition?: SelfCondition
}

/** The load-time validator -- throws (mirrors `validateSpecialization`'s
 * own "throws at import time, not a data test" precedent) if `def` carries a read-cycle: an
 * `hp-percent` condition gating the very stat (`health`) it reads. `has-status`/`always` never
 * read a stat, so every other combination is safe. Called eagerly wherever `StatModifierDef`s are
 * assembled into a registry -- `data/traits/index.ts` (over every trait's effects) AND
 * `data/specializations.ts` (over every perk's effects -- perks are stat-modifier carriers
 * too). */
export function validateStatModifierCondition(def: StatModifierDef): void {
  if (def.condition?.kind === 'hp-percent' && def.stat === 'health') {
    throw new Error(
      'effect invariant violated: a stat-modifier cannot gate on hp-percent while modifying health (read-cycle)',
    )
  }
}

/** Runs `validateStatModifierCondition` over every `stat-modifier` effect in `defs`. A small
 * shared iteration helper so both call sites (traits, perks) scan the same way. */
export function validateStatModifierConditions(defs: readonly EffectDef[]): void {
  for (const def of defs) {
    if (def.category === 'stat-modifier') validateStatModifierCondition(def)
  }
}

/** The load-time validator for observation filters (`spec/effects.md#damage-observation`) --
 * throws if `actionKind`/`excludeActor` sit on a trigger that is not `on-action-observed`,
 * `selfInflicted` on one that is not `on-damage-observed`, `relationship: 'self'` on
 * `on-death-observed` (its own death is `on-death`), or an `observationFilter` of any kind on a
 * hook that is none of the three. Absent fields stay permissive. Called over EVERY trigger carrier
 * at import: every trait's effects (`data/traits/index.ts`), every perk's effects
 * (`data/specializations.ts`) and every status in the registry (`validateStatusDef`, called from
 * `data/statuses.ts`). */
export function validateObservationFilters(
  defs: readonly EffectDef[],
  context = 'a trigger',
): void {
  for (const def of defs) {
    if (def.category !== 'triggered' || def.observationFilter === undefined) continue
    const filter = def.observationFilter
    const where = `${context} on "${def.hook}"`
    if (
      def.hook !== 'on-action-observed' &&
      def.hook !== 'on-damage-observed' &&
      def.hook !== 'on-death-observed'
    ) {
      throw new Error(
        `effect invariant violated: ${where} carries an observationFilter, which only an observation hook may carry`,
      )
    }
    if (
      def.hook !== 'on-action-observed' &&
      (filter.actionKind !== undefined || filter.excludeActor !== undefined)
    ) {
      throw new Error(
        `effect invariant violated: ${where} carries actionKind/excludeActor, which belong to on-action-observed`,
      )
    }
    if (def.hook !== 'on-damage-observed' && filter.selfInflicted !== undefined) {
      throw new Error(
        `effect invariant violated: ${where} carries selfInflicted, which belongs to on-damage-observed`,
      )
    }
    if (def.hook === 'on-death-observed' && filter.relationship === 'self') {
      throw new Error(
        `effect invariant violated: ${where} carries relationship 'self', and a creature never observes its own death (its own death is on-death)`,
      )
    }
  }
}

/** The load-time validator for `damageChannel` (`spec/effects.md#validators`) -- throws if the
 * field sits on a trigger whose hook is not `on-damage-taken`: no other hook has an incoming
 * damage channel to match. Called over EVERY trigger carrier, as `validateObservationFilters` is:
 * every trait (`validateTrait`), every perk (`data/specializations.ts`) and every status
 * (`validateStatusDef`). */
export function validateDamageChannels(
  defs: readonly EffectDef[],
  context = 'a trigger',
): void {
  for (const def of defs) {
    if (def.category !== 'triggered' || def.damageChannel === undefined) continue
    if (def.hook !== 'on-damage-taken') {
      throw new Error(
        `effect invariant violated: ${context} on "${def.hook}" carries a damageChannel, which only an "on-damage-taken" trigger may carry`,
      )
    }
  }
}

/**
 * `'random'` is an INTENT-only `TargetSelector` variant (`spec/combat.md#one-action-pipeline`) --
 * it needs the action's intended side, which only an intent (a rule, the fallback, a grant)
 * carries; a response target (`{ kind: 'selector', selector }` on a trait, status, or perk
 * effect) has no such side to resolve it against. `resolveTargetSelector` throws
 * on it at RESOLUTION time (target-selectors.ts); this is the load-time counterpart, so a data
 * mistake fails fast at import (mirrors `validateStatModifierCondition`'s own precedent) instead
 * of throwing mid-fight the first time the response actually fires. Every response kind either
 * carries a `target` field or none at all (`perform-action`).
 */
function throwIfRandomSelectorTarget(target: ResponseTarget, context: string): void {
  // `cast-target` only means something inside a spell's own effect list (it reads
  // the cast's landed target), so every trait/perk/status site that runs this validator rejects it.
  if (target.kind === 'cast-target') {
    throw new Error(
      `effect invariant violated: ${context} targets 'cast-target', which is only valid inside a spell's effect list`,
    )
  }
  if (target.kind === 'selector' && target.selector.kind === 'random') {
    throw new Error(
      `effect invariant violated: ${context} targets the intent-only 'random' selector -- a response target has no intended side to resolve it against; use an explicit selector instead`,
    )
  }
}

function validateResponseTargetNoRandomSelector(
  response: EffectResponse,
  context: string,
): void {
  switch (response.kind) {
    case 'deal-damage':
    case 'heal':
    case 'apply-status':
    case 'apply-stat-modifier':
    case 'revive':
    case 'grant-action-state':
    case 'remove-status':
      throwIfRandomSelectorTarget(response.target, context)
      return
    case 'perform-action': // no response target (its `intent.targeting` MAY be `'random'`)
      return
    default: {
      const exhaustive: never = response
      throw new Error(`Unhandled response kind: ${String(exhaustive)}`)
    }
  }
}

/** Runs the `'random'`-selector check over every `triggered` effect's response in `defs`. Shares
 * `validateStatModifierConditions`'s own iteration/call-site convention (traits, perks). */
export function validateNoRandomSelectorInResponseTargets(
  defs: readonly EffectDef[],
): void {
  for (const def of defs) {
    if (def.category === 'triggered') {
      validateResponseTargetNoRandomSelector(
        def.response,
        `a "${def.hook}" trigger's response`,
      )
    }
  }
}

/** The status-registry counterpart: a status carries ordinary effects, so its triggers'
 * responses are checked exactly like a trait's, with the status named in the message. */
export function validateStatusNoRandomSelectorInResponseTargets(def: StatusDef): void {
  for (const effect of def.effects) {
    if (effect.category === 'triggered') {
      validateResponseTargetNoRandomSelector(
        effect.response,
        `status "${def.statusId}"'s "${effect.hook}" trigger's response`,
      )
    }
  }
}

/** The load-time validator for a status's effects. Throws if a status carries `stat-modifier` /
 * `stat-remap` (`spec/effects.md#no-temporary-stat-modifier`), `status-immunity` (immunity is read
 * only from non-status carriers, so it can't depend on itself) or `innate-spell` (innate spells
 * are placed at fight setup, so a status's could never take effect), then runs
 * `validateEffectList` as a status carrier and the potency check. Called over every stock status at
 * import (`data/statuses.ts`) and over the status registry `createCombat` is given. */
export function validateStatusDef(def: StatusDef): void {
  for (const effect of def.effects) {
    switch (effect.category) {
      case 'stat-modifier':
      case 'stat-remap':
      case 'status-immunity':
      case 'innate-spell':
        throw new Error(
          `effect invariant violated: status "${def.statusId}" carries a '${effect.category}' effect, which a status may not carry`,
        )
      default:
        break
    }
    // Round end has no status work. A status trigger on
    // `on-round-end` would be exactly that (and would tick outside the bearer's own turn), so
    // ticks live on `on-turn-end`.
    if (effect.category === 'triggered' && effect.hook === 'on-round-end') {
      throw new Error(
        `effect invariant violated: status "${def.statusId}" carries an 'on-round-end' trigger; round end has no status work (use 'on-turn-end')`,
      )
    }
  }
  validateEffectList(def.effects, `status "${def.statusId}"`, 'status')
  validateStatusPotency(def)
}

/** The load-time validator for a trait's effects: `validateEffectList` as a permanent carrier (a
 * stat-modifier may not read the stat it gates, a response target may not be the intent-only
 * 'random' selector, `turn-order.breakChancePercent` and `snapshot-potency` are status-only, each
 * observation-filter field sits on its own hook, `damageChannel` sits on `on-damage-taken`, an
 * additive taken reduction carries a cap and `emitTriggerFired: false` is a tick's alone). Called
 * over every stock trait at import (`data/traits/index.ts`) and over every trait in the registry
 * `createCombat` is given, as `validateStatusDef` is over the statuses. */
export function validateTrait(trait: Trait): void {
  validateEffectList(trait.effects, `trait "${trait.id}"`, 'permanent')
}

/** The kinds of effect carrier `validateEffectList` tells apart: a `'status'` (a timed container)
 * and a `'permanent'` one (a trait, a perk or a side effect). */
export type EffectCarrier = 'status' | 'permanent'

/**
 * THE effect-list validator: every carrier's list goes through this one function, so a check added
 * here reaches traits, perks (at import and as the side effects `createCombat` is given) and
 * statuses together (`spec/effects.md#validators`). `label` names the carrier in an error (`trait
 * "x"`, `perk "x"`, `status "x"`).
 *
 * Every carrier: the intent-only `'random'` selector in a response target, a misplaced
 * observation filter or `damageChannel`, an additive taken-pool reduction without a cap below 1 and
 * `emitTriggerFired: false` off a status tick. A `'permanent'` carrier additionally: a
 * stat-modifier gating on the stat it changes, the status-only `breakChancePercent` and
 * `snapshot-potency`. A status carries none of the second group (`validateStatusDef` bans the
 * stat-modifier and runs the potency check apart).
 */
export function validateEffectList(
  defs: readonly EffectDef[],
  label: string,
  carrier: EffectCarrier,
): void {
  if (carrier === 'permanent') {
    validateStatModifierConditions(defs)
    validateNoBreakChanceOutsideStatus(defs)
    validateNoSnapshotPotencyOutsideStatus(defs)
  }
  for (const def of defs) {
    if (def.category !== 'triggered') continue
    validateResponseTargetNoRandomSelector(
      def.response,
      carrier === 'status'
        ? `${label}'s "${def.hook}" trigger's response`
        : `a "${def.hook}" trigger's response`,
    )
  }
  const context = carrier === 'status' ? `${label}'s trigger` : label
  validateObservationFilters(defs, context)
  validateDamageChannels(defs, context)
  validateAdditiveTakenCaps(defs, label)
  validateEmitTriggerFired(defs, label)
}

/** An additive taken-pool reduction (a `taken-reduction`, or a `damage-modifier` with `direction:
 * 'taken'`) must carry a `reductionCap` below 1: without one a count-scaled reduction reaches
 * 100% (`spec/effects.md#taken-reduction-accumulation`). A multiplicative source and a `dealt`
 * modifier are not capped. A negative cap is not rejected. */
export function validateAdditiveTakenCaps(
  defs: readonly EffectDef[],
  label: string,
): void {
  for (const def of defs) {
    const takenPool =
      def.category === 'taken-reduction' ||
      (def.category === 'damage-modifier' && def.direction === 'taken')
    if (!takenPool || def.accumulation !== 'additive') continue
    if (!(typeof def.reductionCap === 'number' && def.reductionCap < 1)) {
      throw new Error(
        `effect invariant violated: ${label} carries an additive '${def.category}' without a reductionCap below 1`,
      )
    }
  }
}

/** `emitTriggerFired: false` is legal only on a status's tick (`isSnapshotTick`, read off the
 * response, not the carrier): every other trigger announces itself with a `TriggerFired`
 * (`spec/effects.md#hook-execution`). */
export function validateEmitTriggerFired(
  defs: readonly EffectDef[],
  label: string,
): void {
  for (const def of defs) {
    if (def.category !== 'triggered') continue
    const response = def.response
    if (
      (response.kind === 'deal-damage' || response.kind === 'heal') &&
      response.emitTriggerFired === false &&
      !isSnapshotTick(response)
    ) {
      throw new Error(
        `effect invariant violated: ${label}'s "${def.hook}" trigger sets emitTriggerFired: false, which only a status tick (a snapshot-potency magnitude) may`,
      )
    }
  }
}

/** True iff `response` is a tick: a `deal-damage` / `heal` whose `flatAmount` is the
 * `snapshot-potency` marker. */
export function isSnapshotTick(response: EffectResponse): boolean {
  return (
    (response.kind === 'deal-damage' || response.kind === 'heal') &&
    typeof response.flatAmount === 'object' &&
    'kind' in response.flatAmount
  )
}

/** A status that declares `potency` carries EXACTLY ONE tick (a
 * `snapshot-potency` `deal-damage` or `heal` targeting `self`, with no `magnitudeSource`), its
 * `potency.percent` a positive integer; a status that declares none carries no tick. */
function validateStatusPotency(def: StatusDef): void {
  const ticks = def.effects.filter(
    (e): e is TriggeredDef => e.category === 'triggered' && isSnapshotTick(e.response),
  )
  if (def.potency === undefined) {
    if (ticks.length > 0) {
      throw new Error(
        `effect invariant violated: status "${def.statusId}" carries a snapshot-potency tick but declares no potency`,
      )
    }
    return
  }
  if (!Number.isInteger(def.potency.percent) || def.potency.percent <= 0) {
    throw new Error(
      `effect invariant violated: status "${def.statusId}" potency.percent must be a positive integer`,
    )
  }
  if (ticks.length !== 1) {
    throw new Error(
      `effect invariant violated: status "${def.statusId}" declares a potency, so it must carry exactly one snapshot-potency tick (found ${ticks.length})`,
    )
  }
  const response = ticks[0]?.response
  if (
    response === undefined ||
    (response.kind !== 'deal-damage' && response.kind !== 'heal') ||
    response.target.kind !== 'self' ||
    response.magnitudeSource !== undefined
  ) {
    throw new Error(
      `effect invariant violated: status "${def.statusId}"'s snapshot-potency tick must target self and carry no magnitudeSource`,
    )
  }
}

/** The trait / perk counterpart -- a `snapshot-potency` marker
 * means "the instance's potency", which only a status instance has, so a trait or perk effect
 * list carrying one is rejected at load. (A spell's own list rejects every `flatAmount`:
 * `validateSpellEffects`.) */
export function validateNoSnapshotPotencyOutsideStatus(defs: readonly EffectDef[]): void {
  for (const def of defs) {
    if (def.category === 'triggered' && isSnapshotTick(def.response)) {
      throw new Error(
        `effect invariant violated: a "${def.hook}" trigger carries a snapshot-potency magnitude, which is only valid inside a status that declares a potency`,
      )
    }
  }
}

/** `turn-order.breakChancePercent` is status-only (breaking free removes the status
 * instance), so a trait or perk effect list carrying it is rejected at load. */
export function validateNoBreakChanceOutsideStatus(defs: readonly EffectDef[]): void {
  for (const def of defs) {
    if (def.category === 'turn-order' && def.breakChancePercent !== undefined) {
      throw new Error(
        'effect invariant violated: turn-order.breakChancePercent is only valid inside a status (breaking free removes the status instance)',
      )
    }
  }
}

/** The "real guard" a `perform-action` trigger must carry (`spec/responses.md#perform-action`): a
 * `chancePercent` strictly below 100, or a `condition` other than `{ kind: 'always' }`. A lint
 * against unconditional self-perpetuating grants -- termination is guaranteed by the cascade-depth
 * bound, not by this. `chancePercent: 100` and `always` are trivially-true guards, so they don't count. */
export function hasRealGuard(trigger: {
  readonly chancePercent?: number
  readonly condition?: TriggerCondition
}): boolean {
  if (trigger.chancePercent !== undefined && trigger.chancePercent < 100) return true
  return trigger.condition !== undefined && trigger.condition.kind !== 'always'
}

/** Every `perform-action` trigger carried by `defs` (a trait's or a perk's effects). */
export function performActionTriggers(defs: readonly EffectDef[]): TriggeredDef[] {
  return defs.filter(
    (def): def is TriggeredDef =>
      def.category === 'triggered' && def.response.kind === 'perform-action',
  )
}

/** The status-registry counterpart: a status's trigger effects that carry `perform-action`. */
export function statusPerformActionTriggers(def: StatusDef): TriggeredDef[] {
  return performActionTriggers(def.effects)
}

/** Data-test helper: the `perform-action` triggers in `defs` WITHOUT a real guard. */
export function findUnguardedPerformActions(defs: readonly EffectDef[]): TriggeredDef[] {
  return performActionTriggers(defs).filter((t) => !hasRealGuard(t))
}

/** The status-registry counterpart of `findUnguardedPerformActions`. */
export function findUnguardedStatusPerformActions(def: StatusDef): TriggeredDef[] {
  return statusPerformActionTriggers(def).filter((t) => !hasRealGuard(t))
}

export type StatRemapDef = {
  readonly category: 'stat-remap'
  readonly slot: RemapSlot
  readonly fromStat: Stat
}

// permanent-for-fight passives, additive across stacked sources, never
// surfaced as a status (the stat-modifier-adjacent treatment) -- gathered read-time by
// gatherArmorPenetration/gatherCrossStatContribution (effects.ts), consulted by
// calculateDamage/dealDamage (damage.ts/resolution.ts), never fired via a hook.

/** Ignore `percent` of the TARGET's Defence, applied before the subtractive core
 * (`effDefForCore = effDef × (1 − Σpercent)`). Summed across sources, clamped to [0,1]. */
export type ArmorPenetrationDef = {
  readonly category: 'armor-penetration'
  readonly percent: number
}

/** Adds `percentPerRank × getEffectiveStat(bearer, fromStat)` to the bearer's own effOffStat,
 * post-spellPower, before the subtractive core -- for actions matching `appliesTo`
 * ('attack' | 'cast' | 'both'). E.g. Shield Bash: fromStat 'defence' feeds attacks & spells. */
export type CrossStatDef = {
  readonly category: 'cross-stat'
  readonly fromStat: Stat
  readonly percentPerRank: number
  readonly appliesTo: 'attack' | 'cast' | 'both'
}

// The action instance-list model's own gather primitive (`spec/combat.md#action-instance-list`).
// A permanent-for-fight passive, structurally identical to armor-penetration/cross-stat
// above (never a status, additive across stacked sources -- each matching effect appends exactly
// one instance), gathered by gatherExtraInstances(creature, actionKind) in canonical
// active-effects order and appended AFTER the base [100] entry -- which gives the linear
// composition (e.g. Echo's "an additional time" = {actionKind:'attack', powerPercent:100}; an
// "attack again for 30%" = {actionKind:'attack', powerPercent:30}).
export type ActionInstanceDef = {
  readonly category: 'action-instance'
  readonly actionKind: 'attack' | 'cast' | 'both'
  readonly powerPercent: number
}

// A triggered effect fires its response on `hook`. An optional `condition` gates it, reusing the
// serializable scripting `Condition` union, evaluated against live state at fire time (omission =
// unconditional). A condition can reference the triggering source through the `'target'` subject,
// which `fireHook` resolves to that source (e.g. "retaliate only if the attacker is Vitality").
/** The filter (`on-action-observed`, `on-damage-observed`, `on-death-observed`)
 * of an observation hook's candidate. Reacting effects filter on THEMSELVES, not on the hook name
 * -- absent fields match everything (permissive default, matching this project's "unspecified
 * magnitude means 100%" convention). Which field belongs to which hook (enforced at load time by
 * `validateObservationFilters`):
 *  - `actionKind`, `excludeActor`: `on-action-observed` only.
 *  - `relationship` alone: `on-death-observed` (no other field; `'self'` is rejected there).
 *  - `selfInflicted`: `on-damage-observed` only. true = only a COST (a creature's own response
 *    damaging itself, `applyCostDamage`); false = only damage that is not a cost. The flag is
 *    carried from the branch that chose the cost path, never derived from `source === target`.
 *  - `relationship`: shared. On `on-action-observed` it compares the OBSERVER (self) to the ACTOR
 *    (the hook's `source`); on `on-damage-observed` it compares the observer to the DAMAGED
 *    creature (the hook's `source` there); on `on-death-observed` it compares the observer to the
 *    DEAD creature (the hook's `source`), which is never an observer itself. 'ally' includes self
 *    (matches livingAlliesOf's own convention). `excludeActor` drops the case where the observer
 *    IS the actor.
 * Resonants are the `on-action-observed` consumer: `{ relationship: 'ally', actionKind:
 * 'cast' }`; the Flickerling Flare is the `on-damage-observed` one: `{ relationship: 'ally',
 * selfInflicted: true }`. */
export type ObservationFilter = {
  readonly relationship?: 'self' | 'ally' | 'enemy' | 'any'
  readonly actionKind?: 'attack' | 'cast' | 'defend' | 'provoke'
  readonly excludeActor?: boolean
  readonly selfInflicted?: boolean
}

/** A condition only a trigger can carry. `other-ally-injured` =
 * a living ally other than the bearer is below its effective max Health (integer comparison). It
 * is NOT part of the scripting `Condition` union: players author scripts, and the type keeps this
 * kind out of a rule. Evaluated by `evaluateTriggerCondition` (conditions.ts); `evaluateCondition`
 * never sees it. */
export type OtherAllyInjuredCondition = { readonly kind: 'other-ally-injured' }

/** What a trigger's `condition` may be: any scripting `Condition`, or a trigger-only kind. */
export type TriggerCondition = Condition | OtherAllyInjuredCondition

export type TriggeredDef = {
  readonly category: 'triggered'
  readonly hook: Hook
  readonly condition?: TriggerCondition
  /** Meaningful only when `hook` is an observation hook (`'on-action-observed'` /
   * `'on-damage-observed'` / `'on-death-observed'`). See ObservationFilter's own doc comment. */
  readonly observationFilter?: ObservationFilter
  /** Valid on `'on-damage-taken'` only (`validateDamageChannels`). The trigger answers only
   * damage that ran in this channel; absent = answers any damage. A mismatch skips silently,
   * before `condition`, the chance roll and the `stacks: false` claim. Every retaliator sets
   * `'direct'`, so it answers an attack or a spell and never a response, tick or cost
   * (`spec/effects.md#damagechannel`). */
  readonly damageChannel?: DamageChannel
  /** An optional probabilistic gate, a sibling of
   * `condition` -- one is deterministic, the other a roll. Plain number, baked at instantiation
   * (the perk/trait model does any rank arithmetic and stores the result; the engine carries no
   * rank concept, mirroring cross-stat's percentPerRank). Rolled ONCE per firing, at execution on
   * the winning path, AFTER the cascade-depth check (a depth-capped effect isn't firing, so it
   * must draw zero RNG -- cheat-death's "only when it actually fires" discipline) and BEFORE
   * TriggerFired/execution -- a failed roll skips silently, exactly like a false `condition`. Only
   * ever rolled when present; a creature/effect without it never touches state.rng here. */
  readonly chancePercent?: number
  /** A general dedup flag -- default absent/`true`
   * (today's behavior, every matching effect fires independently). `false` means: across ALL
   * living creatures, at most ONE instance of this exact effect (matched by its definition's claim
   * key, `ResolvedHookEffect.claimKey`) is even given a chance to roll `chancePercent` per firing
   * of this hook -- the "claim" happens BEFORE the roll (fireHook, resolution.ts), not just on success, so the AGGREGATE probability
   * of the effect firing at all stays exactly `chancePercent` regardless of how many creatures
   * carry it (two Overtones must not raise the echo chance above 10% -- branching factor stays
   * 1). Kept general (not echo-cast-specific), though Resonant Overtone is its only v1 consumer. */
  readonly stacks?: boolean
  readonly response: EffectResponse
}

// permanent-for-fight passives (the same treatment as ArmorPenetrationDef/
// CrossStatDef/ActionInstanceDef above) -- always perk-granted in the shipped
// content, never surfaced as a status themselves, gathered read-time and consulted at each
// mechanism's own site (never a hook, never applyStatus).

/** Clear Mind / Aggressive / Lucidity: consulted in ONE place, the effect iterator
 * (effects.ts `flatEffects`), which skips every effect of an immune status -- its locks,
 * friendly-fire, triggers, damage-modifiers and turn-order -- never at applyStatus. Per
 * `spec/statuses.md#immunity-suppresses-the-effect-not-the-application`: the status still
 * applies/refreshes/counts down/counts for has-status; only its effects are skipped for an immune
 * bearer. Read only from non-status carriers (a status may not carry one). */
export type StatusImmunityDef = {
  readonly category: 'status-immunity'
  readonly statusId: string
}

/** Tunnel Vision: the bearer's single-target offensive actions skip the enemy Provoke redirect
 * entirely at target-selection (targeting.ts's override pipeline), going straight to normal
 * resolution. Distinct from StatusImmunityDef -- Provoke is a redirect BY the enemy, not a
 * status ON the bearer, so there is no statusId to key off. */
export type ProvokeImmunityDef = {
  readonly category: 'provoke-immunity'
}

/** Proficient Warrior: after a single-target Attack's main hit resolves, also strike each
 * living enemy ADJACENT to that target for its own recomputed damage -- own Defence/affinity/
 * pools, never a copy of the main hit's number. Attacks only; a Cast never splashes
 * (`specializations/brute.md#proficient-warrior`). Upgraded to all-other-living-enemies by a
 * simultaneously-active AnnihilateDef. Adjacency is living adjacency
 * (`spec/combat.md#adjacency-targeting`). Never emits TriggerFired --
 * it's the same action, not a triggered response. */
export type SplashingDef = {
  readonly category: 'splashing'
}

/** Annihilate: upgrades an active SplashingDef's target set from "adjacent" to "all other
 * living enemies". Inert without Splashing also active on the same bearer. */
export type AnnihilateDef = {
  readonly category: 'annihilate'
}

/** "+% damage to
 * [Weakened / Webbed / Sleeping / low-HP] targets" -- a permanent-for-fight passive, structurally
 * identical to ArmorPenetrationDef/CrossStatDef (additive across stacked sources, never a status,
 * never fired via a hook), DEALT-only. `condition` is evaluated with `subject: 'target'` bound to
 * the CURRENT damage target (gatherConditionalDamageBonus, effects.ts) -- this is what lets the
 * bonus land as ONE clean modified hit (folded into dealtMods alongside gatherDealtMods) rather
 * than a second on-damage-dealt follow-up instance, which would re-fire on-damage-dealt,
 * re-splash, and double-count on-hit effects (`spec/effects.md#conditional-damage-bonus`). */
export type ConditionalDamageBonusDef = {
  readonly category: 'conditional-damage-bonus'
  readonly percent: number
  readonly condition: Condition
  /** Which action kind(s) this bonus applies to, mirroring
   * `CrossStatDef.appliesTo`. Absent = `'both'`, which Cull the Weak, Ambusher, Lullpollen's Reaper,
   * Hollowkin Puppeteer, Sporch Ashborn and Gloomjaw Stalker leave. Scoped consumers: Brute Force
   * (`'attack'`), Spell Focus (`'cast'`) and the Blindclaws Striker (`'attack'`) -- each a
   * "+% damage" source that must NOT leak onto the other action kind. */
  readonly actionKind?: 'attack' | 'cast' | 'both'
}

/** The TAKEN-pool mirror of `ConditionalDamageBonusDef` --
 * a permanent-for-fight passive damage REDUCTION, never a status (no `statusId`/`polarity`,
 * unlike `DamageModifierDef`; not surfaced as a status icon). Carries the exact same
 * accumulation shape `DamageModifierDef`'s own `taken` direction already proved
 * (`golden-defend-count-additive-cap`): `magnitude` (the per-unit factor), an optional
 * `magnitudeSource` (a live count -- absent means a flat single application, count 1),
 * `accumulation` (`'multiplicative'` default /
 * `'additive'`-with-`reductionCap`), and `reductionCap` (meaningful only for `'additive'`).
 * First (and so far only) consumer: Bulwark, authored as a genuine perk-granted PASSIVE
 * (`{ category: 'taken-reduction', magnitude: 0.95, magnitudeSource: {kind:'count',
 * of:'self-defend-count'}, accumulation: 'additive', reductionCap: 0.8 }`) rather than a status
 * applied via an `on-fight-start` trigger -- a perk's own effect belongs directly in `effects:
 * []`, like every other perk, not smuggled in as a triggered status application. Gathered by
 * `gatherTakenFactors` (effects.ts) alongside `DamageModifierDef`'s own `taken` entries, reusing
 * the exact same `takenFactorFor`/`damageModifierCount` helpers (both generalized to a shared
 * structural shape so neither DamageModifierEffect's nor this type's behavior changes). */
export type TakenReductionDef = {
  readonly category: 'taken-reduction'
  readonly magnitude: number
  readonly magnitudeSource?: MagnitudeSource
  readonly accumulation?: 'multiplicative' | 'additive'
  readonly reductionCap?: number
}

/** Checked inside applyDamageAndEmit (resolution.ts) at the
 * instant a hit would reduce a living target to 0 HP, BEFORE CreatureDied/on-death fire -- one
 * seeded RNG roll (drawn only when the summed chancePercent is > 0 and the hit would otherwise
 * be lethal, mirroring Confusion's "draws nothing when inactive" discipline); on success,
 * currentHp is set to EXACTLY 1 (not finalDamage-1 or any other derived value)
 * and no death events/hooks fire at all -- resolution continues exactly as a non-lethal hit
 * would. Additive across stacked sources, clamped to [0, 100] (gatherCheatDeathChance,
 * effects.ts) -- the percent-scale mirror of ArmorPenetrationDef's [0,1] clamp. Never surfaced
 * as a status, gathered read-time like ArmorPenetrationDef/ProvokeImmunityDef. */
export type CheatDeathDef = {
  readonly category: 'cheat-death'
  readonly chancePercent: number
}

/** The Sorcerer starter's granted spell (Arcane Bolt), carried by Arcane Surge as a passive,
 * permanent-for-fight `EffectDef` rather than baked into the species data -- so it
 * travels with the trait through fusion (`spec/creatures.md#fusion`) instead of the template.
 * NOT a gem: no level, no augments, un-upgradeable by construction, and NO equip gate
 * (canEquip/affinity) applies, since it's never equipped. `createCombat`'s fight-setup reads every
 * `innate-spell` effect off a creature's just-instantiated `activeEffects`, in canonical order, and
 * PREPENDS their spells
 * onto `equippedSpells` (innate slots first, then the regular gem slots) -- see combat.ts. */
export type InnateSpellDef = {
  readonly category: 'innate-spell'
  readonly spell: Spell
}

// ---- the passives statuses carry. Like every effect they are carrier-agnostic
// (a trait or perk may carry one; a status carries them in `StatusDef.effects`). ----

/** `spec/statuses.md#action-locks`: read by `checkLegality` (every action source) and by
 * `resolveTurn`'s skip read. `'all'` makes every action kind illegal and skips the turn; a
 * scoped lock makes only its own kind illegal. */
export type ActionLockDef = {
  readonly category: 'action-lock'
  readonly scope: 'all' | 'attack' | 'cast'
}

/** Web (act-last) / Grant Act First (act-first): read by the turn order (turn-order.ts), which
 * the round-start queue and every multi-creature hook pass share.
 * `breakChancePercent` is the global per-turn break-free roll (combat.ts's `rollWebBreakFree`, in turn-end cleanup,
 * its bearers in turn order):
 * status-only, since breaking free removes the status instance
 * (`validateNoBreakChanceOutsideStatus`). A bearer carrying both poles resolves to 'first'. */
export type TurnOrderDef = {
  readonly category: 'turn-order'
  readonly position: 'first' | 'last'
  readonly breakChancePercent?: number
}

/** Confusion: a `chancePercent` roll, consulted once per the bearer's harmful offensive action,
 * that redirects the whole action to the bearer's own living side (targeting.ts). */
export type FriendlyFireDef = {
  readonly category: 'friendly-fire'
  readonly chancePercent: number
}

export type DamageModifierDirection = 'dealt' | 'taken'

/** Weaken/Vulnerability: read PASSIVELY by the damage formula's pools. The repetition count
 * is `magnitudeSource` if declared, else 1 (a status is single-instance). */
export type DamageModifierDef = {
  readonly category: 'damage-modifier'
  readonly direction: DamageModifierDirection
  /** Per-unit term: for 'dealt', an ADDITIVE contribution to (1 + Σ dealtMods); for 'taken', a
   * MULTIPLICATIVE factor compounding via magnitude ** count into Π(takenFactors). */
  readonly magnitude: number
  /** When present, the live resolveCount(...) reading is the
   * exponent/multiplier `magnitude` is raised to/multiplied by (absent: 1), recomputed every read. */
  readonly magnitudeSource?: MagnitudeSource
  /** How a count combines with `magnitude` for a 'taken'
   * effect. 'multiplicative' (default): `magnitude ** count`. 'additive': `factor = 1 -
   * min((1 - magnitude) × count, reductionCap)`. Taken-only; dealt is already additive across
   * sources. */
  readonly accumulation?: 'multiplicative' | 'additive'
  /** Meaningful only when `accumulation` is 'additive': the hard clamp on TOTAL reduction. */
  readonly reductionCap?: number
}

// EffectDef is what a TRAIT authors (permanent-for-fight passives/triggers -- timed statuses are
// a separate, parallel concept below, never authored directly on a Trait).
export type EffectDef =
  | StatModifierDef
  | StatRemapDef
  | TriggeredDef
  | ArmorPenetrationDef
  | CrossStatDef
  | ActionInstanceDef
  | StatusImmunityDef
  | ProvokeImmunityDef
  | SplashingDef
  | AnnihilateDef
  | CheatDeathDef
  | ConditionalDamageBonusDef
  | TakenReductionDef
  | InnateSpellDef
  | ActionLockDef
  | TurnOrderDef
  | FriendlyFireDef
  | DamageModifierDef

// ---- Statuses: timed containers of effects applied IN-FIGHT by a trait's apply-status
// response or a spell's `apply-status` effect, never innate. Declared in a separate status registry
// (data/statuses.ts), looked up by statusId at application time. ----

/** A status is a timed, single-instance CONTAINER of ordinary effects. The
 * status owns the lifecycle (apply, refresh, count down, expire, `has-status`); its `effects` own
 * the behaviour, read through the one effect iterator (effects.ts `flatEffects`), which skips
 * them all for an immune bearer. Single instance: a re-application
 * keeps the stronger snapshot and refreshes the timer, it never adds a stack. The bright line
 * (`validateStatusDef`): no stat-modifier / stat-remap / status-immunity / innate-spell inside a
 * status. */
export type StatusDef = {
  readonly statusId: string
  readonly effects: readonly EffectDef[]
  /** Declared by a TICKING status (Poison, Burn, Regen,
   * Spore) -- which applier stat and what percent of it the instance's tick is worth. Recorded
   * once, at application, as the instance's `StatusSnapshot`. Exactly one `snapshot-potency`
   * response per such status (`validateStatusDef`); none in a status that declares no potency. */
  readonly potency?: StatPercent
  /** A status's beneficial/harmful nature isn't mechanically derivable, so it's declared on every
   * status -- consumed by `remove-status`'s future polarity-filter branch (cleanse/dispel). */
  readonly polarity: 'buff' | 'debuff'
  /** The duration a fresh application (or re-application)
   * uses when its own `StatusSpec.duration` is omitted; an explicit one always overrides it. See
   * `applyStatus` (resolution.ts) for the `spec.duration ?? def.defaultDuration` resolution. */
  readonly defaultDuration: number
}

// ---- Active effect instances (what lives on Creature.activeEffects) ----

interface InstanceIdentity {
  readonly instanceId: EffectInstanceId
  /** Stable definition id (the owning trait, or the statusId for a status) for TriggerFired
   * legibility / debugging. */
  readonly sourceTraitId: string
}

/** Statuses additionally carry live, mutable duration bookkeeping (absent from the static
 * StatusDef, which only declares the mechanism). */
interface StatusInstanceState {
  readonly remainingDuration: number
  /** The applier snapshot, present iff the def declares `potency`. Frozen at
   * application; a re-application replaces it only when strictly stronger. */
  readonly snapshot?: StatusSnapshot
  /** `CombatState.turnClock` when this instance was applied or last
   * refreshed. Born this turn iff it equals the current clock (no tick, no countdown, no Web roll
   * this turn). Invisible in events. */
  readonly appliedAt: number
}

export type StatModifierEffect = StatModifierDef & InstanceIdentity
export type StatRemapEffect = StatRemapDef & InstanceIdentity
/** A trigger instance. `claimKey` is present only on a `stacks: false` trigger: the key of its
 * definition, stamped where the effect is instantiated (`resolveBaselineEffects` for a trait or
 * side effect, `flatEffects` for a status's), never an instance id. See
 * `ResolvedHookEffect.claimKey`. */
export type TriggeredEffect = TriggeredDef &
  InstanceIdentity & { readonly claimKey?: string }
/** A status instance: the `StatusDef` (its `effects` embedded, as a def spread) plus live duration
 * bookkeeping and the snapshot. `sourceTraitId` is the statusId. */
export type StatusEffect = StatusDef &
  InstanceIdentity &
  StatusInstanceState & { readonly category: 'status' }
export type DamageModifierEffect = DamageModifierDef & InstanceIdentity
export type ActionLockEffect = ActionLockDef & InstanceIdentity
export type TurnOrderEffect = TurnOrderDef & InstanceIdentity
export type FriendlyFireEffect = FriendlyFireDef & InstanceIdentity
export type ArmorPenetrationEffect = ArmorPenetrationDef & InstanceIdentity
export type CrossStatEffect = CrossStatDef & InstanceIdentity
export type ActionInstanceEffect = ActionInstanceDef & InstanceIdentity
export type StatusImmunityEffect = StatusImmunityDef & InstanceIdentity
export type ProvokeImmunityEffect = ProvokeImmunityDef & InstanceIdentity
export type SplashingEffect = SplashingDef & InstanceIdentity
export type AnnihilateEffect = AnnihilateDef & InstanceIdentity
export type CheatDeathEffect = CheatDeathDef & InstanceIdentity
export type ConditionalDamageBonusEffect = ConditionalDamageBonusDef & InstanceIdentity
export type TakenReductionEffect = TakenReductionDef & InstanceIdentity
export type InnateSpellEffect = InnateSpellDef & InstanceIdentity

/** What `effectsForHook` (effects.ts) returns -- a single hook reaction,
 * already resolved down to a uniform shape regardless of whether it came from a trait's
 * `TriggeredEffect` or a `triggered` effect inside a status container. `fireHook` (resolution.ts) consumes this shape uniformly, never branching on
 * which one supplied it. `statusId` is present only when the source was a status. */
export type ResolvedHookEffect = {
  readonly instanceId: EffectInstanceId
  readonly sourceTraitId: string
  readonly condition?: TriggerCondition
  readonly chancePercent?: number
  /** Meaningful only when this resolved trigger's hook is an observation hook
   * ('on-action-observed' / 'on-damage-observed' / 'on-death-observed'). A status carries ordinary
   * effects and `flatEffects` spreads a status trigger's fields through, so a status trigger can
   * carry one too; it is undefined only when none was authored. */
  readonly observationFilter?: ObservationFilter
  /** Meaningful only for an `'on-damage-taken'` trigger: the channel of the damage it answers.
   * See `TriggeredDef.damageChannel`. */
  readonly damageChannel?: DamageChannel
  readonly response: EffectResponse
  readonly statusId?: string
  /** Derived from a `TriggeredDef`'s own `stacks: false`
   * (the dedup flag; not a status stack count) --
   * `true` iff this effect must claim a fireHook-call-scoped dedup slot
   * before it's even allowed to roll `chancePercent`. Always undefined for a status-sourced
   * entry (no v1 status declares it). */
  readonly nonStacking?: boolean
  /** The key a `stacks: false` effect claims its one slot under: `<kind>:<carrierId>#<index>`,
   * the carrier kind (`trait`, `side` for a side effect, `status`), its id, and the trigger's
   * position in that carrier's own effect list. It names the DEFINITION, so every creature
   * carrying the same trigger shares one claim, while two triggers in one trait, or a trait and a
   * status with one id, are separate claims. Present on every `nonStacking` entry. */
  readonly claimKey?: string
  /** The REAL owning instance's id -- for a TriggeredDef-sourced entry this
   * equals `instanceId` above (same value used for the cascade self-re-entry guard); for a
   * status-trigger-sourced entry this is the status's own SHARED instance id (`e.instanceId`),
   * distinct from `instanceId` above (which is the derived per-trigger guard id,
   * `${e.instanceId}#effect#${index}`, scoped to cascade dedup only). `fireHook` re-checks this
   * against the creature's LIVE `activeEffects` immediately before firing each candidate -- an
   * effect reacts only if its exact owning instance still exists at that moment (the exact-
   * instance rule: a candidate list built once at the top of a hook pass can otherwise fire a
   * status instance an EARLIER candidate in the same pass already removed or replaced). */
  readonly sourceInstanceId: EffectInstanceId
}

export type ActiveEffect =
  | StatModifierEffect
  | StatRemapEffect
  | TriggeredEffect
  | StatusEffect
  | DamageModifierEffect
  | ArmorPenetrationEffect
  | CrossStatEffect
  | ActionInstanceEffect
  | StatusImmunityEffect
  | ProvokeImmunityEffect
  | SplashingEffect
  | AnnihilateEffect
  | CheatDeathEffect
  | TurnOrderEffect
  | FriendlyFireEffect
  | ActionLockEffect
  | ConditionalDamageBonusEffect
  | TakenReductionEffect
  | InnateSpellEffect

/** One entry of the effect iterator (effects.ts `flatEffects`) -- an ordinary
 * effect instance, plus, when it came out of a status container, the status it belongs to. For a
 * status-borne entry `instanceId` is the per-effect guard id (`${statusInstanceId}#effect#${index}`)
 * and `sourceInstanceId` is the status's real instance id; for a plain entry
 * `sourceInstanceId` is absent (read `instanceId`). */
type FlatOf<T> = T extends unknown
  ? T & {
      readonly statusId?: string
      readonly sourceInstanceId?: EffectInstanceId
    }
  : never
export type FlatEffect = FlatOf<Exclude<ActiveEffect, StatusEffect>>

// ---- Trait ----

export interface Trait {
  readonly id: string
  readonly name: string
  readonly effects: readonly EffectDef[]
}

/** One entry of a creature's resolved `baselineEffects` -- an `EffectDef` paired
 * with the `sourceTraitId` label it must carry once instantiated (a bare `EffectDef[]` would lose
 * this: a trait-sourced def's label is its owning trait's id, e.g. `'flickerling-wick-burn-bright'`; a side-effect
 * def's label is `'<sideLabel>-<ordinal>'` -- `'perk-<ordinal>'` for the player side,
 * `'enemy-effect-<ordinal>'` for the enemy side) -- see effects.ts's
 * `resolveBaselineEffects`). Plain data (no functions -- `SelfCondition` is what
 * makes this possible), so `Creature.baselineEffects: readonly
 * BaselineEffectEntry[]` can live inside `CombatState`. */
export type BaselineEffectEntry = {
  readonly def: EffectDef
  readonly sourceTraitId: string
  /** The claim key of a `stacks: false` trigger (`ResolvedHookEffect.claimKey`); absent on every
   * other entry. Kept here so a revive's re-instantiation carries it. */
  readonly claimKey?: string
}

/**
 * The load-time validator for `Spell.effects` (called by
 * `data/spells/index.ts` over the registry; also unit-tested directly). A spell's list may hold
 * `deal-damage` / `heal` in FORMULA mode (`offStat` or `scalingStat`; no `flatAmount`,
 * no `magnitudeSource`), `apply-status`, `apply-stat-modifier` and
 * `remove-status`, each targeting `cast-target` or `self`. Other verbs and targets join when
 * content needs them. Throws at import time, like `validateStatModifierConditions`.
 */
export function validateSpellEffects(spell: Spell): void {
  for (const [index, effect] of spell.effects.entries()) {
    const context = `spell "${spell.id}" effect #${index} (${effect.kind})`
    switch (effect.kind) {
      case 'deal-damage':
        if (effect.flatAmount !== undefined || effect.magnitudeSource !== undefined) {
          throw new Error(
            `spell invariant violated: ${context} must be formula mode (offStat/scalingStat), with no flatAmount/magnitudeSource`,
          )
        }
        if (effect.offStat === undefined && effect.scalingStat === undefined) {
          throw new Error(
            `spell invariant violated: ${context} needs an offStat or a scalingStat`,
          )
        }
        if (effect.offStat !== undefined && effect.scalingStat !== undefined) {
          throw new Error(
            `spell invariant violated: ${context} sets both offStat and scalingStat`,
          )
        }
        if (effect.offStat !== undefined && effect.offStat !== 'cast') {
          throw new Error(
            `spell invariant violated: ${context} must use offStat 'cast' (a spell's damage is cast damage)`,
          )
        }
        // The RESOLVED damage source (executeResponse): `damageSource`, else 'attack' in
        // scalingStat mode, else the offStat value. A spell's damage is a cast: it must resolve to
        // 'cast' (cross-stat / conditional-damage-bonus / the DamageDealt tag all key on it).
        if (
          (effect.damageSource ??
            (effect.scalingStat !== undefined ? 'attack' : effect.offStat)) !== 'cast'
        ) {
          throw new Error(
            `spell invariant violated: ${context} must resolve to damageSource 'cast' (a scalingStat effect needs damageSource: 'cast' explicitly)`,
          )
        }
        break
      case 'heal':
        if (effect.flatAmount !== undefined || effect.magnitudeSource !== undefined) {
          throw new Error(
            `spell invariant violated: ${context} must be formula mode (offStat/scalingStat), with no flatAmount/magnitudeSource`,
          )
        }
        if (effect.offStat === undefined && effect.scalingStat === undefined) {
          throw new Error(
            `spell invariant violated: ${context} needs an offStat or a scalingStat`,
          )
        }
        if (effect.offStat !== undefined && effect.scalingStat !== undefined) {
          throw new Error(
            `spell invariant violated: ${context} sets both offStat and scalingStat`,
          )
        }
        if (effect.offStat !== undefined && effect.offStat !== 'cast') {
          throw new Error(
            `spell invariant violated: ${context} must use offStat 'cast' (a spell's heal reads the cast slot)`,
          )
        }
        break
      case 'apply-status':
      case 'apply-stat-modifier':
      case 'remove-status':
        break
      default:
        throw new Error(`spell invariant violated: ${context} is not allowed in a spell`)
    }
    // Every verb that survived the switch carries a `target`.
    const target = effect.target
    if (target.kind !== 'cast-target' && target.kind !== 'self') {
      throw new Error(
        `spell invariant violated: ${context} must target cast-target or self, not ${target.kind}`,
      )
    }
  }
}
