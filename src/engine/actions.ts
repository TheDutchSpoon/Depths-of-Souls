// Phase 4.1-C2a (A1): the one action pipeline. Every action source -- a script rule, the
// implicit fallback, a granted action (bonus-cast/echo today; `perform-action` from 4.1-E) --
// goes through this module: `checkLegality` (pure, draws nothing), `resolveIntent` (the only
// place action-level draws happen), `executeAction` (the executors, moved here from combat.ts).
// `createResolutionContext` builds the `ResolutionContext` (resolution-types.ts) that threads
// `runAction` down into resolution.ts, replacing the old `onEchoCast` callback.
//
// Phase 4.1-C2b (B1): `resolveIntent`'s default target is the side-aware one (`defaultTargetingFor`,
// derived from the RESOLVED action -- a `gemSlot: 'random'` cast defaults by the drawn spell's
// side), and `gemSlot: 'random'` draws over `castableGemSlots` (ASSUMPTION 13). `legacyDefaultTarget`
// (first-living-by-slot) survives ONLY for `resolveInstanceTarget`'s post-death fallback and
// `legacyGrantedTargeting` survives unchanged, until 4.1-C2c (B2.3/B2.4) deletes them.

import { getCreature, findCreature, updateCreature } from './creature-lookup'
import {
  gatherExtraInstances,
  hasAnnihilate,
  hasSplashing,
  hasStatusImmunity,
} from './effects'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import {
  applyHeal,
  applyStatModifier,
  applyStatus,
  dealDamage,
  dealDamageWithOffStat,
  fireHook,
} from './resolution'
import {
  getDefaultTarget,
  livingAlliesOf,
  livingEnemiesOf,
  resolveOffensiveTarget,
  shouldRedirectAoeToAllies,
} from './targeting'
import { resolveTargetSelector, targetSelectorHasCandidate } from './target-selectors'
import { nextRandom } from './rng'
import type {
  CascadeState,
  ResolutionContext,
  RunActionOptions,
} from './resolution-types'
import type { CreatureId } from './ids'
import type { Intent, RuleAction, TargetSelector } from './scripting-types'
import type { Action, CombatEvent, CombatState, Creature, Spell } from './types'
import type { StatusSpec } from './effect-types'

// ---- ResolutionContext factory ----

/**
 * Builds a fresh ResolutionContext over `events` (shared, mutated in place by push) and
 * `cascade` (fresh per top-level action; see resolveTurn's own "fresh cascade per top-level
 * action" discipline). `runAction` is the seam resolution.ts reaches actions.ts through: it
 * resolves `intent` for `actorId`, pushes `options.announce` (if the intent resolved) right
 * before executing, then executes -- a no-op if the actor is dead/unknown or the intent doesn't
 * resolve to an action (no castable gem, no valid target).
 */
export function createResolutionContext(
  events: CombatEvent[],
  cascade: CascadeState,
): ResolutionContext {
  const runAction = (
    actorId: CreatureId,
    intent: Intent,
    state: CombatState,
    options?: RunActionOptions,
  ): CombatState => {
    const actor = findCreature(state, actorId)
    if (!actor || !actor.alive) return state
    const action = resolveIntent(actor, intent, state, {
      legacyGrantedTargeting: options?.legacyGrantedTargeting,
    })
    if (!action) return state
    if (options?.announce) events.push(options.announce)
    return executeAction(actor, action, state, { events, cascade, runAction })
  }
  return { events, cascade, runAction }
}

// ---- Legality (pure, draws nothing) ----

/**
 * Phase 4 Slice B: scoped suppress-action (Silenced=Cast, Pacified=Attack) gates legality HERE,
 * not via resolution.ts's hook-fired `suppressed` flag (that flag stays reserved for
 * unscoped/'all' suppression -- Stun's existing whole-turn-skip mechanism, byte-identical). A
 * pure scan of the acting creature's active effects for a present suppress-action response
 * whose scope covers `kind` -- ASSUMPTION 8: only ever gates Attack/Cast; Defend/Provoke/Wait
 * are never suppressible in v1, so this is never consulted for those kinds.
 *
 * Phase 4 Slice C (Clear Mind / Aggressive): a status-carrying (condition-status) suppression
 * is skipped entirely when the creature carries a matching status-immunity -- per CONVENTIONS'
 * "immunity suppresses the effect, not the application", the status still applies/stacks/
 * counts for has-status; only its suppress-action effect is ignored here. A plain permanent
 * `triggered` suppression (no statusId to key immunity off) is never immune-gated.
 */
function isActionSuppressed(creature: Creature, kind: 'attack' | 'cast'): boolean {
  const matchesScope = (response: {
    kind: string
    scope?: 'all' | 'attack' | 'cast'
  }) => {
    if (response.kind !== 'suppress-action') return false
    const scope = response.scope ?? 'all'
    return scope === 'all' || scope === kind
  }
  return creature.activeEffects.some((e) => {
    if (e.category === 'triggered') return matchesScope(e.response)
    // Phase 4 Slice E2: a condition-status may carry MORE THAN ONE trigger (e.g. Sleep's
    // on-turn-start suppress + on-damage-taken wake-up) -- check every trigger's response, not
    // just one, regardless of which hook it's declared on (this scan doesn't care about hook,
    // matching its pre-Slice-E2 behavior for the single-trigger case).
    if (e.category !== 'condition-status') return false
    if (hasStatusImmunity(creature, e.statusId)) return false
    return e.triggers.some((t) => matchesScope(t.response))
  })
}

/** The `enemy`/`ally` pool for `intendedSide`, relative to `actor`'s own side (mirrors
 * livingEnemiesOf/livingAlliesOf's own "relative to the acting creature" convention). */
function livingPoolFor(
  actor: Creature,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): readonly Creature[] {
  return intendedSide === 'ally'
    ? livingAlliesOf(actor, state)
    : livingEnemiesOf(actor, state)
}

/** Existence-only (no RNG): does `targeting` (or, absent, the intended side's default) have a
 * candidate at all? Absent targeting is legal whenever the intended side has >=1 living member
 * (B1: the side-aware default always exists then). */
function hasValidTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): boolean {
  if (targeting) {
    if (targeting.kind === 'random')
      return livingPoolFor(actor, intendedSide, state).length > 0
    return targetSelectorHasCandidate(targeting, actor, state)
  }
  return livingPoolFor(actor, intendedSide, state).length > 0
}

/**
 * Phase 4.1-C2a (A1): every equipped slot (innate spells included -- they're bare entries in
 * `equippedSpells` like any gem, A8) whose spell is castable right now: non-empty, and (for a
 * single-target spell) has a valid target on its own intended side. An AOE spell is always
 * castable -- it "happens" even against an empty side (matches executeCastAoe's own contract).
 */
export function castableGemSlots(actor: Creature, state: CombatState): number[] {
  const slots: number[] = []
  actor.equippedSpells.forEach((spell, slot) => {
    if (!spell) return
    if (spell.targetShape === 'aoe') {
      slots.push(slot)
      return
    }
    const intendedSide = spell.targetSide === 'ally' ? 'ally' : 'enemy'
    if (livingPoolFor(actor, intendedSide, state).length > 0) slots.push(slot)
  })
  return slots
}

/**
 * `checkLegality(actor, intent, state)` -- pure, draws nothing. Can the actor take this action
 * at all: locks (scoped suppression), an empty slot, no castable gem for `gemSlot: 'random'`, no
 * valid target? Used by the interpreter's lookahead over script rules, and by the implicit
 * fallback to decide whether Attack is legal at all before resolving it.
 */
export function checkLegality(
  actor: Creature,
  intent: Intent,
  state: CombatState,
): boolean {
  switch (intent.action.kind) {
    case 'attack':
      if (isActionSuppressed(actor, 'attack')) return false
      return hasValidTarget(actor, intent.targeting, 'enemy', state)
    case 'cast': {
      if (isActionSuppressed(actor, 'cast')) return false
      const gemSlot = intent.action.gemSlot
      if (gemSlot === 'random') return castableGemSlots(actor, state).length > 0
      const spell = actor.equippedSpells[gemSlot]
      if (!spell) return false
      if (spell.targetShape === 'aoe') return true
      const intendedSide = spell.targetSide === 'ally' ? 'ally' : 'enemy'
      return hasValidTarget(actor, intent.targeting, intendedSide, state)
    }
    case 'defend':
    case 'provoke':
    case 'wait':
      return true
    default: {
      const exhaustive: never = intent.action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Default targeting (B1) ----

/**
 * The side-aware default target SELECTOR for `action` on `actor`: `lowest-hp-enemy` for Attack
 * and an enemy-side spell, `lowest-hp-ally` for an ally-side spell. `undefined` for an AOE cast
 * (no single default target -- the whole side is hit), a `gemSlot: 'random'` cast (which spell
 * ends up chosen, and therefore which side is "intended", isn't known until gem resolution), and
 * a self-only action (Defend/Provoke/Wait). `resolveIntent` calls it with the RESOLVED gem slot, so
 * the `gemSlot: 'random'` case never reaches it unresolved there; the interpreter's
 * `acted-before-target` peek calls it pre-draw and treats `undefined` as "no default, no peek". */
export function defaultTargetingFor(
  actor: Creature,
  action: RuleAction,
): TargetSelector | undefined {
  switch (action.kind) {
    case 'attack':
      return { kind: 'lowest-hp-enemy' }
    case 'cast': {
      if (action.gemSlot === 'random') return undefined
      const spell = actor.equippedSpells[action.gemSlot]
      if (!spell || spell.targetShape === 'aoe') return undefined
      return spell.targetSide === 'ally'
        ? { kind: 'lowest-hp-ally' }
        : { kind: 'lowest-hp-enemy' }
    }
    case 'defend':
    case 'provoke':
    case 'wait':
      return undefined
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Resolution (the only place action-level draws happen) ----

/** Phase 1's first-living-by-slot default. C2b (B1) retired it from `resolveIntent`; it survives
 * only as `resolveInstanceTarget`'s post-death fallback until 4.1-C2c (B2.4) replaces that with the
 * side-aware default + Provoke and deletes this (and `getDefaultTarget`). */
function legacyDefaultTarget(
  actor: Creature,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): CreatureId | null {
  return getDefaultTarget(livingPoolFor(actor, intendedSide, state))
}

/** The `'random'` selector's own draw: uniform over living creatures on `intendedSide`, same
 * pool/order as today's `random-enemy`/`random-ally` (`livingEnemiesOf`/`livingAlliesOf`). */
function resolveRandomTarget(
  actor: Creature,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): CreatureId | null {
  const pool = livingPoolFor(actor, intendedSide, state)
  if (pool.length === 0) return null
  const index = Math.floor(nextRandom(state.rng) * pool.length)
  return pool[index]?.id ?? null
}

/** Resolves an already-defaulted selector (`intent.targeting ?? defaultTargetingFor(...)`).
 * `'random'` draws over the intended side; an absent selector (no single default exists) is null. */
function resolveSelectorTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  intendedSide: 'enemy' | 'ally',
  state: CombatState,
): CreatureId | null {
  if (!targeting) return null
  if (targeting.kind === 'random') return resolveRandomTarget(actor, intendedSide, state)
  return resolveTargetSelector(targeting, actor, state)
}

/** Phase 4.1-C2b (ASSUMPTION 13): uniform among the actor's CASTABLE slots (innate included) --
 * `castableGemSlots`, the same set `checkLegality` uses. No castable slot means no draw. */
function resolveGemSlot(
  actor: Creature,
  gemSlot: number | 'random',
  state: CombatState,
): number | null {
  if (gemSlot !== 'random') return gemSlot
  const castable = castableGemSlots(actor, state)
  if (castable.length === 0) return null
  const index = Math.floor(nextRandom(state.rng) * castable.length)
  return castable[index] ?? null
}

/** The options `resolveIntent` itself reads -- a narrower shape than the full `RunActionOptions`
 * (which also carries `announce`, `runAction`'s own concern, never resolveIntent's). */
export interface ResolveIntentOptions {
  readonly legacyGrantedTargeting?: true
}

/** An enemy-side single target: the override pipeline (Confusion -> Tunnel Vision -> Provoke)
 * unless `legacyGrantedTargeting` is set, in which case it resolves the selector directly --
 * C2a-only, matching today's exact bonus-cast/echo behaviour (deleted in C2c, B2.3). */
function resolveEnemySingleTarget(
  actor: Creature,
  targeting: TargetSelector | undefined,
  state: CombatState,
  options: ResolveIntentOptions | undefined,
): CreatureId | null {
  if (options?.legacyGrantedTargeting) {
    return resolveSelectorTarget(actor, targeting, 'enemy', state)
  }
  return resolveOffensiveTarget(actor, state, () =>
    resolveSelectorTarget(actor, targeting, 'enemy', state),
  )
}

/**
 * `resolveIntent(actor, intent, state)` -- the single place action-level random draws happen.
 * Gem resolution (for a Cast) draws first, over the castable slots. Target resolution: explicit
 * selector (including `'random'`) -> the side-aware default of the RESOLVED action
 * (`defaultTargetingFor`) -> for an enemy-side single target, Confusion -> Tunnel Vision -> Provoke
 * (`resolveOffensiveTarget`) -- UNLESS `options.legacyGrantedTargeting` is set (C2a-only; see
 * `resolveEnemySingleTarget`). An ally-side single target skips that override pipeline entirely
 * regardless (GAME_DESIGN §7). Returns `null` when no legal action results.
 */
export function resolveIntent(
  actor: Creature,
  intent: Intent,
  state: CombatState,
  options?: ResolveIntentOptions,
): Action | null {
  switch (intent.action.kind) {
    case 'attack': {
      const targeting = intent.targeting ?? defaultTargetingFor(actor, intent.action)
      const targetId = resolveEnemySingleTarget(actor, targeting, state, options)
      return targetId ? { kind: 'attack', targetId } : null
    }
    case 'cast': {
      const gemSlot = resolveGemSlot(actor, intent.action.gemSlot, state)
      if (gemSlot === null) return null
      const spell = actor.equippedSpells[gemSlot]
      if (!spell) return null // defensive/unreachable -- a resolved numeric slot is always real
      if (spell.targetShape === 'aoe') {
        return { kind: 'cast', targetShape: 'aoe', gemSlot }
      }
      const targeting =
        intent.targeting ?? defaultTargetingFor(actor, { kind: 'cast', gemSlot })
      const targetSide = spell.targetSide ?? 'enemy'
      const targetId =
        targetSide === 'ally'
          ? resolveSelectorTarget(actor, targeting, 'ally', state)
          : resolveEnemySingleTarget(actor, targeting, state, options)
      return targetId ? { kind: 'cast', targetShape: 'single', gemSlot, targetId } : null
    }
    case 'defend':
      return { kind: 'defend' }
    case 'provoke':
      return { kind: 'provoke' }
    case 'wait':
      return { kind: 'wait' }
    default: {
      const exhaustive: never = intent.action
      throw new Error(`Unhandled rule action kind: ${String(exhaustive)}`)
    }
  }
}

// ---- Execution (the executors, moved from combat.ts unchanged) ----

/**
 * ASSUMPTION 31: every instance after the first targets the SAME resolved target as instance 1
 * (the selector is not re-run per instance) -- except when that target has since died, which
 * falls back to the normal default-target selection (matching the Brute starter's own wording).
 * Returns null once no living target remains (nothing further in the list can resolve).
 *
 * `targetSide` (Phase 4 Slice E, default 'enemy' -- Attack's own call site never passes it,
 * since v1 has no ally-targeting Attack) picks which party the post-death fallback default draws
 * from: the opposing side for an ordinary offensive instance, or the actor's OWN side for a
 * support-spell instance -- mirrors resolveOffensiveTarget's enemy-only contract not applying to
 * ally casts (GAME_DESIGN §7). Phase 4.1-C2b: unchanged (first-by-slot, no Provoke) -- C2c's
 * rule 4 replaces this with the side-aware default + Provoke.
 */
function resolveInstanceTarget(
  actor: Creature,
  previousTargetId: CreatureId | null,
  state: CombatState,
  targetSide: 'enemy' | 'ally' = 'enemy',
): CreatureId | null {
  if (previousTargetId) {
    const current = findCreature(state, previousTargetId)
    if (current?.alive) return previousTargetId
  }
  return legacyDefaultTarget(actor, targetSide, state)
}

/**
 * The action instance-list model (CONVENTIONS' "action instance-list", locked): an Attack or
 * Cast resolves as a list of powerPercent entries, assembled ONCE, up front, before any instance
 * resolves -- base [100], plus one entry per active action-instance passive matching
 * `actionKind` (or 'both'), in canonical active-effects order. Composition is LINEAR
 * ([100, 100, 30], never a re-multiplied entry). Nothing is spawned mid-resolution, so there is
 * no trigger/re-entrancy/loop-guard involvement here -- this is a pre-computed execution plan.
 */
function buildInstanceList(
  actor: Creature,
  actionKind: 'attack' | 'cast',
): readonly number[] {
  return [100, ...gatherExtraInstances(actor, actionKind)]
}

/**
 * Phase 4 Slice C (Proficient Warrior / Annihilate): the living enemies a Splashing actor's
 * main ATTACK hit against `mainTargetId` should also strike -- computed from `state` as it
 * stood BEFORE the main hit lands (so `mainTargetId` is still among the alive-filtered list
 * adjacentLivingTargets indexes into; looking this up AFTER the main hit could drop the just-
 * killed main target out of that list and break the adjacency lookup). Empty when the actor
 * has no active Splashing. Annihilate upgrades the set to every OTHER living enemy. Attacks
 * only -- brute.md defines Splashing as "attacks deal 100% of their damage to enemies
 * adjacent to the target"; only executeAttack (below) calls this, never executeCastSingle.
 */
function splashTargetIds(
  actor: Creature,
  mainTargetId: CreatureId,
  state: CombatState,
): CreatureId[] {
  if (!hasSplashing(actor)) return []
  const opposingParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  if (hasAnnihilate(actor)) {
    return opposingParty.filter((c) => c.alive && c.id !== mainTargetId).map((c) => c.id)
  }
  const mainTarget = findCreature(state, mainTargetId)
  if (!mainTarget) return []
  return adjacentLivingTargets(mainTarget, opposingParty).map((c) => c.id)
}

/**
 * Phase 4 Slice C (Splashing): the living neighbors of `target` within `party`, taken from
 * the alive-filtered, slot-ordered list (ASSUMPTION 14 -- living-adjacency, not raw
 * slot-index adjacency: a dead slot-neighbor would make Splashing whiff for no
 * player-visible reason, and living-adjacency degrades gracefully as a side thins out).
 * Returns up to two neighbors (one at each edge of the living list); empty when `target`
 * isn't alive-and-present in `party` or has no living neighbor.
 */
function adjacentLivingTargets(target: Creature, party: readonly Creature[]): Creature[] {
  const living = party.filter((c) => c.alive)
  const index = living.findIndex((c) => c.id === target.id)
  if (index === -1) return []
  const neighbors: Creature[] = []
  const before = living[index - 1]
  const after = living[index + 1]
  if (before) neighbors.push(before)
  if (after) neighbors.push(after)
  return neighbors
}

function executeAttack(
  actor: Creature,
  targetId: CreatureId,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'attack',
  ).entries()) {
    resolvedTargetId = resolveInstanceTarget(actor, resolvedTargetId, working)
    if (!resolvedTargetId) break // no living target left for this or any further instance

    const thisTargetId = resolvedTargetId
    const splashIds = splashTargetIds(actor, thisTargetId, working)
    ctx.events.push({
      type: 'AttackDeclared',
      attackerId: actor.id,
      targetId: thisTargetId,
    })
    working = fireHook('on-attack', [actor.id], thisTargetId, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): fires on ALL living creatures
    // (cheap -- effectsForHook returns nothing for non-observers), per instance, alongside the
    // actor's own on-attack hook above -- see CONVENTIONS' actor-vs-observer routing table.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'attack', instanceIndex },
    }).state
    working = dealDamage(
      actor.id,
      thisTargetId,
      'attack',
      powerPercent / 100,
      'attack',
      working,
      ctx,
    )
    // Splashing: recompute the SAME formula (own offStat/spellPower, each splash target's own
    // Defence/affinity/pools -- never a copy of the main hit's number, ASSUMPTION 15). No
    // TriggerFired -- it's the same action, not a triggered response. Re-checks aliveness in
    // case an earlier splash hit's own damage-path cascade (e.g. Retaliate) already killed a
    // later one.
    for (const splashId of splashIds) {
      if (!findCreature(working, splashId)?.alive) continue
      working = dealDamage(
        actor.id,
        splashId,
        'attack',
        powerPercent / 100,
        'attack',
        working,
        ctx,
      )
    }
  }
  return working
}

/**
 * Phase 4 Slice B: Spell.scalingStat resolution. Absent -> the pre-Slice-B remap-aware
 * Intelligence lookup (byte-identical to every existing spell, since getOffensiveStat's Cast
 * default IS Intelligence already). An explicit Stat reads it DIRECTLY via getEffectiveStat (no
 * stat-remap resolution), mirroring deal-damage's scalingStat. 'none' = flat/Int-independent:
 * offStat 0 (always chip-floor-only through the same formula -- not exercised by any v1
 * damage-dealing content).
 */
function resolveSpellOffStat(
  caster: Creature,
  spell: Spell,
  powerFraction: number,
): number {
  const spellPower = spell.spellPower * powerFraction
  if (spell.scalingStat === undefined) return getOffensiveStat(caster, 'cast', spellPower)
  if (spell.scalingStat === 'none') return 0
  return getEffectiveStat(caster, spell.scalingStat) * spellPower
}

/**
 * Phase 4 Slice E: routes a landed Cast instance to its payload's own execution path.
 * 'damage' (default, byte-identical to pre-Slice-E) reuses dealDamageWithOffStat. 'heal' reuses
 * applyHeal directly -- magnitude is the SAME resolveSpellOffStat a damage spell would compute,
 * just applied as HP restored. 'stat-modifier' reuses applyStatModifier directly with the
 * spell's own authored `statModifier` (NOT scaled by powerPercent -- see Spell.statModifier's
 * doc comment). Neither heal nor stat-modifier emits TriggerFired (not a triggered response --
 * Cast itself is the chosen-action context).
 */
function applyCastPayload(
  actor: Creature,
  spell: Spell,
  targetId: CreatureId,
  powerPercent: number,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const payload = spell.payload ?? 'damage'
  switch (payload) {
    case 'damage':
      // Splashing is an attacks-only mechanic (brute.md: "attacks deal 100% of their damage to
      // enemies adjacent to the target"; CONVENTIONS' "Splashing / Annihilate" bullet) -- Cast
      // never splashes, so there is no splash loop here (contrast executeAttack above).
      return dealDamageWithOffStat(
        actor.id,
        targetId,
        resolveSpellOffStat(actor, spell, powerPercent / 100),
        'cast',
        'cast',
        state,
        ctx,
      )
    case 'heal':
      return applyHeal(
        actor.id,
        targetId,
        resolveSpellOffStat(actor, spell, powerPercent / 100),
        state,
        ctx,
      )
    case 'stat-modifier': {
      if (!spell.statModifier) {
        throw new Error(
          'resolver invariant violated: stat-modifier-payload spell missing statModifier',
        )
      }
      return applyStatModifier(
        actor.id,
        targetId,
        spell.statModifier.stat,
        spell.statModifier.factor,
        spell.id,
        state,
        ctx,
      )
    }
    default: {
      const exhaustive: never = payload
      throw new Error(`Unhandled spell payload: ${String(exhaustive)}`)
    }
  }
}

/** Never applies a status to a corpse -- a cast's damage may have killed the target. */
function applyStatusIfAlive(
  sourceId: CreatureId,
  targetId: CreatureId,
  spec: StatusSpec,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const target = getCreature(state, targetId)
  if (!target.alive) return state
  return applyStatus(sourceId, targetId, spec, state, ctx)
}

function executeCastSingle(
  actor: Creature,
  gemSlot: number,
  targetId: CreatureId,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  const targetSide = spell.targetSide ?? 'enemy'
  let working = state
  let resolvedTargetId: CreatureId | null = targetId

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'cast',
  ).entries()) {
    resolvedTargetId = resolveInstanceTarget(actor, resolvedTargetId, working, targetSide)
    if (!resolvedTargetId) break

    const thisTargetId = resolvedTargetId
    ctx.events.push({
      type: 'SpellCast',
      targetShape: 'single',
      casterId: actor.id,
      gemSlot,
      targetId: thisTargetId,
    })
    working = fireHook('on-cast', [actor.id], thisTargetId, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): Resonants' own consumer shape
    // (relationship 'ally', actionKind 'cast') -- see CONVENTIONS' actor-vs-observer routing.
    // Phase 4 Slice H2 (PR #60 review, E2): an echoCast-flagged effect fires through
    // ctx.runAction now (resolution.ts's fireHook), inert everywhere no effect declares it.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'cast', instanceIndex },
    }).state
    working = applyCastPayload(actor, spell, thisTargetId, powerPercent, working, ctx)
    if (spell.appliesStatus) {
      working = applyStatusIfAlive(
        actor.id,
        thisTargetId,
        spell.appliesStatus,
        working,
        ctx,
      )
    }
  }
  return working
}

function executeCastAoe(
  actor: Creature,
  gemSlot: number,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const spell = actor.equippedSpells[gemSlot]
  if (!spell)
    throw new Error('resolver invariant violated: cast referencing an empty gem slot')

  const targetSide = spell.targetSide ?? 'enemy'
  let working = state

  for (const [instanceIndex, powerPercent] of buildInstanceList(
    actor,
    'cast',
  ).entries()) {
    // Phase 4 Slice E: an ally-targeting AOE spell always freezes the caster's OWN living side
    // -- no Confusion roll at all (Confusion's redirect is scoped to a "harmful action" per
    // CONVENTIONS; a support cast on your own side is never one, so it must never touch
    // state.rng here, mirroring targeting.ts's "draws nothing when inactive" discipline).
    // Provoke was already exempt for every AOE regardless of side (GAME_DESIGN §7).
    let resolvedParty: 'player' | 'enemy'
    if (targetSide === 'ally') {
      resolvedParty = actor.side
    } else {
      // Confusion (ASSUMPTION 13): one roll, per instance, decides whether this WHOLE AOE
      // instance retargets to the caster's own living side instead of the enemy side -- never
      // a per-target coin flip.
      const redirectToAllies = shouldRedirectAoeToAllies(actor, working)
      const opposingSide = actor.side === 'player' ? 'enemy' : 'player'
      resolvedParty = redirectToAllies ? actor.side : opposingSide
    }
    const targetParty =
      resolvedParty === 'player' ? working.playerParty : working.enemyParty
    // Frozen target list: all living members of the resolved side, slot order -- each AOE
    // instance independently re-freezes its OWN set at that instance's cast-start (no single
    // target to preserve across instances, unlike the single-target case above).
    const targetIds = targetParty.filter((c) => c.alive).map((c) => c.id)
    ctx.events.push({
      type: 'SpellCast',
      targetShape: 'aoe',
      casterId: actor.id,
      gemSlot,
      targetIds,
    })
    // AOE has no single target to name as the hook's `source` -- self only.
    working = fireHook('on-cast', [actor.id], undefined, working, ctx).state
    // Phase 4 Slice E2 (general action-observation system): source here IS the actor (needed
    // for relationship filtering), unlike on-cast's own source above.
    working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
      observed: { actionKind: 'cast', instanceIndex },
    }).state

    for (const targetId of targetIds) {
      // Skip a frozen-list target that's no longer alive by the time its hit lands (a prior
      // hit's on-death/reflect cascade may have killed it). The frozen target *set* is
      // unchanged; this only skips *hitting* an already-dead member.
      const target = getCreature(working, targetId)
      if (!target.alive) continue
      working = applyCastPayload(actor, spell, targetId, powerPercent, working, ctx)
      if (spell.appliesStatus) {
        working = applyStatusIfAlive(
          actor.id,
          targetId,
          spell.appliesStatus,
          working,
          ctx,
        )
      }
    }
  }

  return working
}

function executeDefend(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Defended', creatureId: actor.id })
  let working = fireHook('on-defend', [actor.id], undefined, state, ctx).state
  // Phase 4 Slice E2 (general action-observation system): Defend/Provoke are always
  // single-instance in v1 -- instanceIndex is always 0.
  working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
    observed: { actionKind: 'defend', instanceIndex: 0 },
  }).state
  // Phase 4 Slice D / ASSUMPTION 17: cumulative for the whole fight, never reset -- read fresh
  // from `working` (not the pre-hook `actor`) in case an on-defend response somehow touched it,
  // matching the project's existing "re-fetch before mutating" discipline (e.g. combat.ts's own
  // freshActor pattern).
  const afterHook = getCreature(working, actor.id)
  return updateCreature(working, actor.id, {
    defending: true,
    defendCount: afterHook.defendCount + 1,
  })
}

function executeProvoke(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Provoked', creatureId: actor.id })
  let working = fireHook('on-provoke', [actor.id], undefined, state, ctx).state
  working = fireHook('on-action-observed', livingIds(working), actor.id, working, ctx, {
    observed: { actionKind: 'provoke', instanceIndex: 0 },
  }).state
  return updateCreature(working, actor.id, { provoking: true })
}

function executeWait(
  actor: Creature,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  ctx.events.push({ type: 'Waited', creatureId: actor.id })
  return state
}

/** `executeAction`: the executors, moved here from combat.ts. */
export function executeAction(
  actor: Creature,
  action: Action,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  switch (action.kind) {
    case 'attack':
      return executeAttack(actor, action.targetId, state, ctx)
    case 'cast':
      switch (action.targetShape) {
        case 'single':
          return executeCastSingle(actor, action.gemSlot, action.targetId, state, ctx)
        case 'aoe':
          return executeCastAoe(actor, action.gemSlot, state, ctx)
        default: {
          const exhaustive: never = action
          throw new Error(`Unhandled cast shape: ${String(exhaustive)}`)
        }
      }
    case 'defend':
      return executeDefend(actor, state, ctx)
    case 'provoke':
      return executeProvoke(actor, state, ctx)
    case 'wait':
      return executeWait(actor, state, ctx)
    default: {
      const exhaustive: never = action
      throw new Error(`Unhandled action kind: ${String(exhaustive)}`)
    }
  }
}

/** All living creatures' ids in tie-break order (player slots, then enemy slots) -- the order
 * global phase-point hooks (fight-start, round-end) iterate; also on-action-observed's own
 * "every living creature" scope. Duplicated from combat.ts's own copy (kept private there too --
 * neither module imports the other's private helpers) rather than shared, since it's a one-line
 * derivation with no state of its own. */
function livingIds(state: CombatState): CreatureId[] {
  return [...state.playerParty, ...state.enemyParty]
    .filter((c) => c.alive)
    .map((c) => c.id)
}
