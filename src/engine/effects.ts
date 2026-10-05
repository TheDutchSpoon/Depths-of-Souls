// Effect-framework runtime helpers (pure). Slice A: instantiate innate-trait effects onto a
// creature's active-effects list, and the HP-vs-effective-max-Health helpers. Grows in
// Slices B/C (status apply/stack/decrement/expire, gatherDealtMods/gatherTakenFactors).
//
// Dependency direction is one-way: effects.ts -> effective-stats.ts (for getEffectiveStat,
// hasStatus). effective-stats.ts never imports this module, so there is no cycle.

import { getEffectiveStat, hasStatus as hasStatusImpl } from './effective-stats'
import { createEffectInstanceId } from './effect-types'
import type {
  ActiveEffect,
  BaselineEffectEntry,
  CountOf,
  EffectDef,
  EffectInstanceId,
  FlatEffect,
  FriendlyFireEffect,
  Hook,
  MagnitudeSource,
  ResolvedHookEffect,
  StatusDef,
  Trait,
} from './effect-types'
import type { CombatState, Creature } from './types'

/**
 * Phase 4.1-B (S1): resolves a creature's baseline effect list -- innate traits' effects, in
 * trait-then-declaration order, then this side's own `sideEffects` -- WITHOUT instantiating
 * instance ids yet (that's `instantiateEffectDefs` below). `sourceTraitId` is paired with each
 * def here (a trait-sourced def's owning trait id; a side-effect def's `<sideLabel>-<ordinal>`
 * label) since a bare `EffectDef[]` would lose it. `createCombat` stores the result as
 * `Creature.baselineEffects`; `revive`'s death-reset re-instantiates the SAME stored list
 * directly, needing no registry lookup.
 *
 * Phase 4.1-B review (PR #69, R1/D3): `sideEffects` applies UNCONDITIONALLY to every creature
 * passed in here -- the caller (`createCombat`) already knows which side's list it's threading
 * through which party, so there is no `creature.side` re-check to get wrong; `sideLabel` picks
 * the sourceTraitId prefix (`'perk'` for the player side, `'enemy-effect'` for the enemy side --
 * distinct so a TriggerFired.effectId can't collide across sides). An unknown trait id THROWS
 * (never silently skipped, matching S1's own "no silent drop" rationale) -- a caller that forgot
 * to pass `registries.traits` used to strip every innate trait with no signal at all.
 */
export function resolveBaselineEffects(
  creature: Pick<Creature, 'innateTraitIds'>,
  traits: ReadonlyMap<string, Trait>,
  sideEffects: readonly EffectDef[] = [],
  sideLabel: string = 'perk',
): BaselineEffectEntry[] {
  const entries: BaselineEffectEntry[] = []
  for (const traitId of creature.innateTraitIds) {
    const trait = traits.get(traitId)
    if (!trait) {
      throw new Error(
        `resolveBaselineEffects: unknown trait id "${traitId}" -- not in the trait registry`,
      )
    }
    for (const def of trait.effects) {
      entries.push({ def, sourceTraitId: traitId })
    }
  }
  // Phase 4 Slice F / ASSUMPTION 21: side effects (perks today; biome/boss effects later)
  // appended AFTER a creature's own innate-trait effects -- the canonical per-creature effect
  // order: innate-1 -> innate-2 -> side effects -> infusions (Phase 8, none yet) -> statuses.
  sideEffects.forEach((def, ordinal) => {
    entries.push({ def, sourceTraitId: `${sideLabel}-${ordinal}` })
  })
  return entries
}

/**
 * Phase 4.1-B (B3/B4): instantiates a resolved baseline effect list onto fresh `ActiveEffect`s,
 * issuing each one a unique id from the per-fight counter (`eff-<n>`, `CombatState.
 * effectInstanceCounter` -- the ONLY production issuer of effect instance ids; never
 * deterministic/derived-from-content, so a removed-then-reapplied or revived instance always gets
 * a genuinely fresh id, never a reused one). Called by `createCombat`'s fight-assembly (from
 * `resolveBaselineEffects`'s output) and directly by `revive`'s death-reset (from the target's
 * already-stored `baselineEffects` -- no registry lookup needed there).
 */
export function instantiateEffectDefs(
  entries: readonly BaselineEffectEntry[],
  counter: number,
): { effects: ActiveEffect[]; nextCounter: number } {
  let next = counter
  const effects = entries.map(({ def, sourceTraitId }) => {
    const instanceId = createEffectInstanceId(`eff-${next}`)
    next += 1
    return withInstance(def, instanceId, sourceTraitId)
  })
  return { effects, nextCounter: next }
}

function withInstance(
  def: EffectDef,
  instanceId: EffectInstanceId,
  sourceTraitId: string,
): ActiveEffect {
  switch (def.category) {
    case 'stat-modifier':
      return { ...def, instanceId, sourceTraitId }
    case 'stat-remap':
      return { ...def, instanceId, sourceTraitId }
    case 'triggered':
      return { ...def, instanceId, sourceTraitId }
    case 'armor-penetration':
      return { ...def, instanceId, sourceTraitId }
    case 'cross-stat':
      return { ...def, instanceId, sourceTraitId }
    case 'action-instance':
      return { ...def, instanceId, sourceTraitId }
    case 'status-immunity':
      return { ...def, instanceId, sourceTraitId }
    case 'provoke-immunity':
      return { ...def, instanceId, sourceTraitId }
    case 'splashing':
      return { ...def, instanceId, sourceTraitId }
    case 'annihilate':
      return { ...def, instanceId, sourceTraitId }
    case 'cheat-death':
      return { ...def, instanceId, sourceTraitId }
    case 'conditional-damage-bonus':
      return { ...def, instanceId, sourceTraitId }
    case 'taken-reduction':
      return { ...def, instanceId, sourceTraitId }
    case 'innate-spell':
      return { ...def, instanceId, sourceTraitId }
    case 'action-lock':
      return { ...def, instanceId, sourceTraitId }
    case 'turn-order':
      return { ...def, instanceId, sourceTraitId }
    case 'friendly-fire':
      return { ...def, instanceId, sourceTraitId }
    case 'damage-modifier':
      return { ...def, instanceId, sourceTraitId }
    default: {
      const exhaustive: never = def
      throw new Error(`Unknown effect def category: ${String(exhaustive)}`)
    }
  }
}

/**
 * Phase 4.1-F1 (A3): THE effect iterator -- the one way every reader sees a creature's effects.
 * A trait/perk effect is yielded as is. A status (a timed container, `category: 'status'`) is
 * flattened in place into its own `effects`, in order, each tagged with the status it came from
 * (`statusId`, `statusStacks` -- the default count the effect scales by -- and
 * `sourceInstanceId`) and given its own guard identity `${statusInstanceId}#effect#${index}`
 * (PR #64: a trigger's self-re-entry guard is scoped to ONE trigger, never the whole status).
 *
 * **Immunity is checked here, once** (CONVENTIONS "Immunity"): every effect, of every kind, of a
 * status the bearer is immune to is skipped -- locks, friendly-fire, triggers (a tick included),
 * damage-modifiers, turn-order (so the Web roll draws nothing). The status itself still exists,
 * stacks, counts down and counts for `has-status` (those read `activeEffects` directly, never
 * this). Immunity is read only from non-status carriers (a status may not carry
 * `status-immunity`, `validateStatusDef`), so it can't depend on itself.
 *
 * `getEffectiveStat`/`resolveRemappedStat` read `activeEffects` raw instead: the validator bans
 * `stat-modifier`/`stat-remap` inside a status, so there is nothing for them to flatten.
 */
export function flatEffects(creature: Creature): readonly FlatEffect[] {
  const effects = creature.activeEffects
  if (!effects.some((e) => e.category === 'status')) {
    return effects as readonly FlatEffect[] // no container: nothing to flatten
  }
  const out: FlatEffect[] = []
  for (const e of effects) {
    if (e.category !== 'status') {
      out.push(e)
      continue
    }
    if (hasStatusImmunity(creature, e.statusId)) continue
    e.effects.forEach((def, index) => {
      out.push({
        ...def,
        instanceId: createEffectInstanceId(`${e.instanceId}#effect#${index}`),
        sourceTraitId: e.statusId,
        statusId: e.statusId,
        statusStacks: e.stacks,
        sourceInstanceId: e.instanceId,
      })
    })
  }
  return out
}

/**
 * The creature's hook reactions registered for `hook`, in canonical effect order (the iterator's
 * order: trait/perk effects, then each status's effects in application order), resolved to a
 * uniform `ResolvedHookEffect` shape regardless of source -- a trait's own trigger or a trigger
 * inside a status container (Sleep's wake-up, a DoT tick, Spore's spread). `fireHook`
 * (resolution.ts) reads this shape without caring which one supplied it. Scan-and-filter (a
 * hook-type index is deferred until profiling shows it's needed). The alive/death gating is the
 * caller's (fireHook) responsibility, not this lookup's.
 */
export function effectsForHook(creature: Creature, hook: Hook): ResolvedHookEffect[] {
  const results: ResolvedHookEffect[] = []
  for (const e of flatEffects(creature)) {
    if (e.category !== 'triggered' || e.hook !== hook) continue
    results.push({
      instanceId: e.instanceId,
      sourceTraitId: e.sourceTraitId,
      condition: e.condition,
      chancePercent: e.chancePercent,
      observationFilter: e.observationFilter,
      response: e.response,
      // Phase 4 Slice H2 (PR #60 review, E2.1): the dedup flag (`stacks: false`).
      nonStacking: e.stacks === false ? true : undefined,
      // Present only when the trigger came out of a status container.
      stacks: e.statusStacks,
      statusId: e.statusId,
      // Phase 4.1-B (B4): the REAL owning instance's id -- a plain trigger's own id, or the
      // status's shared instance id (distinct from the derived per-trigger guard `instanceId`).
      // fireHook checks it against the creature's LIVE activeEffects before firing: a status
      // removed (cleansed) or replaced earlier in the SAME hook pass must not let a stale
      // candidate captured at list-build time still fire.
      sourceInstanceId: e.sourceInstanceId ?? e.instanceId,
    })
  }
  return results
}

/**
 * A creature's effective maximum HP: effective Health folded from base + stat-modifiers,
 * floored to an integer (HP is always an integer). For a creature with no Health modifier
 * this equals base Health.
 */
export function effectiveMaxHp(creature: Creature): number {
  return Math.floor(getEffectiveStat(creature, 'health'))
}

/**
 * Clamps currentHp down to the effective maximum, returning the (possibly reduced) currentHp.
 * Used at fight-start (init to full) and whenever effective max Health changes (Slice B/C).
 * A rise in max never auto-heals — currentHp only ever moves down here.
 */
export function clampedHp(creature: Creature): number {
  return Math.min(creature.currentHp, effectiveMaxHp(creature))
}

/** Phase 4 Slice F (review amendment): the shared structural shape `damageModifierCount`/
 * `takenFactorFor` read -- satisfied by BOTH `damage-modifier` and `taken-reduction` entries.
 * `stacks` is the carrying status's stack count (4.1-F1: the default repetition count); absent
 * outside a status. */
interface TakenReductionSource {
  readonly magnitude: number
  readonly magnitudeSource?: MagnitudeSource
  readonly accumulation?: 'multiplicative' | 'additive'
  readonly reductionCap?: number
  readonly stacks?: number
}

function modifierSource(e: FlatEffect & TakenReductionSource): TakenReductionSource {
  return {
    magnitude: e.magnitude,
    magnitudeSource: e.magnitudeSource,
    accumulation: e.accumulation,
    reductionCap: e.reductionCap,
    stacks: e.statusStacks,
  }
}

/** Phase 4 Slice D: the live repetition count a damage-modifier's `magnitude` is
 * multiplied/exponentiated by -- the carrying status's `stacks` (4.1-F1: a status's effects get
 * its stacks as their default count) unless the effect declares a `magnitudeSource`, in which
 * case the live resolveCount(...) reading is used instead (recomputed every read). `?? 1`: the
 * flat single application for an effect carried outside a status. */
function damageModifierCount(
  bearer: Creature,
  state: CombatState,
  e: TakenReductionSource,
): number {
  return e.magnitudeSource
    ? resolveMagnitudeCount(bearer, state, e.magnitudeSource)
    : (e.stacks ?? 1)
}

/** Attacker's additive dealt-mod pool contribution from active `damage-modifier` effects
 * (e.g. Weaken: -20%/stack). Read passively, like getEffectiveStat -- never fired via a hook. */
export function gatherDealtMods(creature: Creature, state: CombatState): number[] {
  const mods: number[] = []
  for (const e of flatEffects(creature)) {
    if (e.category !== 'damage-modifier' || e.direction !== 'dealt') continue
    mods.push(e.magnitude * damageModifierCount(creature, state, modifierSource(e)))
  }
  return mods
}

/** Phase 4 Slice D, PR #47 review amendment: collapses one `taken`-direction modifier to its
 * single contributed factor, per its `accumulation` mode (CONVENTIONS' "Taken-reduction
 * accumulation"). `'multiplicative'` (default/absent): `magnitude ** count`, asymptoting toward
 * 0, never clamped. `'additive'` (Bulwark): the per-unit reduction `(1 - magnitude)` summed ×
 * count, hard-clamped at `reductionCap` (default 1 -- unclamped -- if somehow omitted). The
 * collapsed factor enters the multiplicative `Π(takenFactors)` pool alongside every other source
 * -- additive WITHIN a source, multiplicative ACROSS sources. */
function takenFactorFor(
  bearer: Creature,
  state: CombatState,
  e: TakenReductionSource,
): number {
  const count = damageModifierCount(bearer, state, e)
  if (e.accumulation === 'additive') {
    const perUnitReduction = 1 - e.magnitude
    const totalReduction = Math.min(perUnitReduction * count, e.reductionCap ?? 1)
    return 1 - totalReduction
  }
  return e.magnitude ** count
}

/** Defender's multiplicative taken-pool contribution from active `damage-modifier` (taken)
 * effects (e.g. Vulnerability: x1.5/stack) AND permanent perk-granted `taken-reduction`
 * passives (Bulwark) -- both share the same hard-cap shape, so both collapse via
 * `takenFactorFor`. Order is part of the contract (float multiplication is not associative):
 * every damage-modifier first, then every taken-reduction, each in iterator order. */
export function gatherTakenFactors(creature: Creature, state: CombatState): number[] {
  const effects = flatEffects(creature)
  const factors: number[] = []
  for (const e of effects) {
    if (e.category === 'damage-modifier' && e.direction === 'taken') {
      factors.push(takenFactorFor(creature, state, modifierSource(e)))
    }
  }
  for (const e of effects) {
    if (e.category === 'taken-reduction') {
      factors.push(takenFactorFor(creature, state, modifierSource(e)))
    }
  }
  return factors
}

/** Phase 4.1-B (B-8): re-exported from effective-stats.ts, which now owns the canonical
 * implementation (so `SelfCondition`'s `has-status` branch can read it without effects.ts ->
 * effective-stats.ts becoming a cycle -- see its own doc comment there). Every existing importer
 * of `hasStatus` from THIS module keeps working unchanged. */
export const hasStatus = hasStatusImpl

/** Attacker's summed armor-penetration passives (additive across sources, clamped [0,1]) --
 * read passively by dealDamage/dealDamageWithScalingStat, never fired via a hook. */
export function gatherArmorPenetration(creature: Creature): number {
  let total = 0
  for (const e of flatEffects(creature)) {
    if (e.category === 'armor-penetration') total += e.percent
  }
  return Math.min(1, Math.max(0, total))
}

/** Attacker's summed cross-stat contribution for `actionKind` (its own effOffStat, added
 * post-spellPower, before the subtractive core) -- sums `percentPerRank ×
 * getEffectiveStat(creature, fromStat)` over matching effects whose appliesTo covers actionKind. */
export function gatherCrossStatContribution(
  creature: Creature,
  actionKind: 'attack' | 'cast',
): number {
  let total = 0
  for (const e of flatEffects(creature)) {
    if (
      e.category === 'cross-stat' &&
      (e.appliesTo === actionKind || e.appliesTo === 'both')
    ) {
      total += e.percentPerRank * getEffectiveStat(creature, e.fromStat)
    }
  }
  return total
}

/** The powerPercent of each active action-instance passive matching `actionKind` (or 'both'),
 * in canonical effect order -- appended after the base [100] entry to build an Attack/Cast's
 * instance list (actions.ts's buildInstanceList). See ActionInstanceDef's own doc comment for the
 * inline ASSUMPTION this primitive's exact shape rests on. */
export function gatherExtraInstances(
  creature: Creature,
  actionKind: 'attack' | 'cast',
): number[] {
  const out: number[] = []
  for (const e of flatEffects(creature)) {
    if (
      e.category === 'action-instance' &&
      (e.actionKind === actionKind || e.actionKind === 'both')
    ) {
      out.push(e.powerPercent)
    }
  }
  return out
}

/** Instantiates a status definition into a container `ActiveEffect` with fresh duration/stack
 * bookkeeping (4.1-F1: ONE instance shape; the def's `effects` are embedded on it). */
export function instantiateStatus(
  def: StatusDef,
  instanceId: EffectInstanceId,
  remainingDuration: number,
  stacks: number,
  appliedAt: number,
): ActiveEffect {
  return {
    ...def,
    category: 'status',
    instanceId,
    sourceTraitId: def.statusId,
    remainingDuration,
    stacks,
    appliedAt,
  }
}

// ---- Phase 4 Slice C: permanent-passive checks + status-carrying lookups ----

/** True iff `creature` carries a status-immunity for `statusId` (Clear Mind/Aggressive/
 * Lucidity). Read only from NON-status carriers (the raw list, never the iterator), and only
 * consulted by the effect iterator (`flatEffects`) -- never at applyStatus, per "immunity
 * suppresses the effect, not the application". */
export function hasStatusImmunity(creature: Creature, statusId: string): boolean {
  return creature.activeEffects.some(
    (e) => e.category === 'status-immunity' && e.statusId === statusId,
  )
}

/** Tunnel Vision: true iff `creature`'s single-target offensive actions skip the enemy Provoke
 * redirect entirely (targeting.ts's override pipeline). */
export function hasProvokeImmunity(creature: Creature): boolean {
  return flatEffects(creature).some((e) => e.category === 'provoke-immunity')
}

/** Proficient Warrior: true iff `creature`'s single-target Attack/Cast main hits also splash
 * onto adjacent (or, with Annihilate, all other living) enemies. */
export function hasSplashing(creature: Creature): boolean {
  return flatEffects(creature).some((e) => e.category === 'splashing')
}

/** Annihilate: true iff `creature`'s Splashing (when also present) hits all other living
 * enemies instead of just adjacent ones. Inert alone -- callers must check hasSplashing too. */
export function hasAnnihilate(creature: Creature): boolean {
  return flatEffects(creature).some((e) => e.category === 'annihilate')
}

/**
 * Confusion: `creature`'s first active `friendly-fire` effect (carried by the Confusion status).
 * Immunity (Lucidity) needs no check here -- the iterator already hid an immune status's effects,
 * so an immune bearer has no friendly-fire at all and its roll (and RNG draw) never happens. At
 * most one such effect is expected in v1 content; the first in canonical order wins.
 */
export function activeFriendlyFireStatus(
  creature: Creature,
): (FriendlyFireEffect & { readonly statusId?: string }) | undefined {
  for (const e of flatEffects(creature)) {
    if (e.category === 'friendly-fire') return e
  }
  return undefined
}

/** The action kinds an action lock can refuse (every `Action['kind']`). */
export type LockableKind = 'attack' | 'cast' | 'defend' | 'provoke' | 'wait'

/**
 * Phase 4.1-F1 (A3, CONVENTIONS "Action locks"): true iff an active `action-lock` makes `kind`
 * illegal for `creature` -- an `'all'` lock refuses EVERY kind (Attack, Cast, Defend, Provoke,
 * Wait), a scoped lock only its own. Read through the iterator, so an immune bearer's status lock
 * doesn't count. `checkLegality` (actions.ts) is the one caller on the action path.
 */
export function isActionLocked(creature: Creature, kind: LockableKind): boolean {
  return flatEffects(creature).some(
    (e) => e.category === 'action-lock' && (e.scope === 'all' || e.scope === kind),
  )
}

/**
 * The first active `'all'` action-lock in canonical effect order, as the id of its carrier's
 * definition (the status id for a status, the trait id for a trait-borne lock -- the value
 * `TriggerFired.effectId` carries), or `undefined`. `resolveTurn` reads it to skip a turn and to
 * name the `TurnSkipped` event.
 */
export function firstAllLock(
  creature: Creature,
): { readonly effectId: string } | undefined {
  for (const e of flatEffects(creature)) {
    if (e.category === 'action-lock' && e.scope === 'all') {
      return { effectId: e.sourceTraitId }
    }
  }
  return undefined
}

// ---- Phase 4 Slice D: resource & counter primitives ----

/**
 * CONVENTIONS' count-scaling primitive: one of the six live "board counts" a `magnitudeSource`
 * of kind 'count' can read, resolved relative to `bearer`'s OWN side/affinity/species and
 * recomputed fresh on every call (never cached -- killing an ally mid-fight changes the reading
 * on the very next read, same fight). `living-allies`/`-of-affinity`/`-of-species` INCLUDE
 * `bearer` itself while it's alive, matching targeting.ts's livingAlliesOf convention ("ally"
 * includes the acting creature). `living-allies-of-species` is inert (0) for any creature with no
 * `speciesId` set -- true of every Phase 1-3/Slice A-D creature today (see Creature.speciesId's
 * own doc comment). `enemies-with-status` requires `statusId` (thrown otherwise, mirroring
 * applyStatus's unknown-statusId invariant throw).
 */
export function resolveCount(
  bearer: Creature,
  of: CountOf,
  state: CombatState,
  statusId?: string,
): number {
  const ownParty = bearer.side === 'player' ? state.playerParty : state.enemyParty
  const opposingParty = bearer.side === 'player' ? state.enemyParty : state.playerParty

  switch (of) {
    case 'living-allies':
      return ownParty.filter((c) => c.alive).length
    case 'living-allies-of-affinity':
      return ownParty.filter((c) => c.alive && c.affinity === bearer.affinity).length
    case 'living-allies-of-species':
      return ownParty.filter(
        (c) => c.alive && c.speciesId !== undefined && c.speciesId === bearer.speciesId,
      ).length
    case 'dead-allies':
      return ownParty.filter((c) => !c.alive).length
    case 'enemies-with-status': {
      if (!statusId) {
        throw new Error(
          'resolver invariant violated: enemies-with-status magnitudeSource requires a statusId',
        )
      }
      return opposingParty.filter((c) => c.alive && hasStatus(c, statusId)).length
    }
    case 'self-defend-count':
      return bearer.defendCount
    default: {
      const exhaustive: never = of
      throw new Error(`Unhandled count kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * Resolves a MagnitudeSource to a live number. 'flat' is "the existing implicit behavior, made
 * explicit" (CONVENTIONS); 'count' delegates to resolveCount above; 'consumed-stacks' has no
 * meaning read cold -- it's populated only by a consume-stacks response's own wrapped-effect
 * call (resolution.ts), so resolving it without that context is a resolver-invariant violation
 * (mirrors applyStatus's unknown-statusId throw), not a silent 0.
 */
export function resolveMagnitudeCount(
  bearer: Creature,
  state: CombatState,
  source: MagnitudeSource,
  consumedStacks?: number,
): number {
  switch (source.kind) {
    case 'flat':
      return source.value
    case 'count':
      return resolveCount(bearer, source.of, state, source.statusId)
    case 'consumed-stacks':
      if (consumedStacks === undefined) {
        throw new Error(
          'resolver invariant violated: consumed-stacks magnitudeSource resolved outside a consume-stacks response',
        )
      }
      return consumedStacks
    default: {
      const exhaustive: never = source
      throw new Error(`Unhandled magnitude source kind: ${String(exhaustive)}`)
    }
  }
}

/** Last Stand: summed chancePercent across active cheat-death passives (additive across
 * sources, clamped to [0, 100] -- the percent-scale mirror of gatherArmorPenetration's [0, 1]
 * clamp). 0 for a creature with no cheat-death effect -- applyDamageAndEmit (resolution.ts)
 * skips the RNG draw entirely in that case, never rolling for an ordinary creature. */
export function gatherCheatDeathChance(creature: Creature): number {
  let total = 0
  for (const e of flatEffects(creature)) {
    if (e.category === 'cheat-death') total += e.chancePercent
  }
  return Math.min(100, Math.max(0, total))
}
