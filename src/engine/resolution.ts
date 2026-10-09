// The trigger / cascade resolution core (Phase 3, Slice B). This is the mutually-recursive heart
// of the effect framework: applyDamageAndEmit fires the damage-path hooks, a hook's response can
// deal more damage (re-entering applyDamageAndEmit), and a transient CascadeState bounds the chain.
//
// CascadeState (depth + the self-re-entry guard) lives on the CALL STACK only — never in
// CombatState, never serialized (same principle as effective stats: derived/momentary values do
// not live in authoritative state). combat.ts/actions.ts create a fresh CascadeState per
// top-level action/hook point (via ResolutionContext); depth resets to 0 there.
//
// Phase 4.1-C2a (A1): every function below threads a `ResolutionContext` (`resolution-types.ts`)
// instead of separate `events`/`cascade` arguments. This module imports NOTHING from
// `actions.ts` or `combat.ts`, not even a type — it never runs an action: a `perform-action`
// response (4.1-E) only enqueues a grant on `ctx.grants`, and the scope that created the context
// drains it (actions.ts `drainGrantedActions`). `newCascade` stays here (a plain factory, not a type) since `actions.ts` and
// `combat.ts` both need to call it to build a fresh `ResolutionContext`.

import {
  calculateAdditional,
  calculateCost,
  calculateDamage,
  calculateIndirectDamage,
  withAdditional,
} from './damage'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { getCreature, findCreature, updateCreature } from './creature-lookup'
import { livingAlliesOf, livingEnemiesOf } from './targeting'
import {
  resolveLowestHpInjuredOtherAlly,
  resolveTargetSelector,
} from './target-selectors'
import {
  effectsForHook,
  effectiveMaxHp,
  flatEffects,
  gatherArmorPenetration,
  gatherCheatDeathChance,
  gatherCrossStatContribution,
  gatherDealtMods,
  gatherTakenFactors,
  hasStatus,
  instantiateEffectDefs,
  instantiateStatus,
  resolveMagnitudeCount,
  snapshotFor,
} from './effects'
import { evaluateCondition, evaluateTriggerCondition } from './conditions'
import { createEffectInstanceId } from './effect-types'
import {
  MAX_TRIGGER_CASCADE_DEPTH,
  MAX_REVIVES_PER_CREATURE,
  DEFEND_DEFENCE_MULTIPLIER,
  DEFEND_TAKEN_FACTOR,
} from './config'
import { nextRandom } from './rng'
import type { DamageResult } from './damage'
import type { CreatureId } from './ids'
import type {
  CascadeState,
  DamageChannel,
  DamageOrigin,
  ResolutionContext,
} from './resolution-types'
import type { CombatState, Creature, Stat } from './types'
import type {
  ActiveEffect,
  EffectInstanceId,
  EffectResponse,
  Hook,
  ResponseTarget,
  SnapshotPotency,
  StatPercent,
  StatusEffect,
  StatusSnapshot,
  StatusSpec,
} from './effect-types'

export type {
  CascadeState,
  DamageChannel,
  DamageOrigin,
  ResolutionContext,
} from './resolution-types'

export function newCascade(): CascadeState {
  return { depth: 0, activeInstances: new Set() }
}

interface HookContext {
  /** Phase 4.1-H2a (ASSUMPTION 130): REQUIRED -- the channel this context's damage runs in.
   * `fireHook` builds `'indirect'` (a trait/status/perk response); a spell's own effect loop
   * (`actions.ts` `executeSpellEffects`) builds `'direct'`. */
  readonly channel: DamageChannel
  readonly self: CreatureId
  /** The other creature involved in the trigger (attacker for on-damage-taken, victim for
   * on-damage-dealt/on-kill, dead ally for on-ally-death, ...). */
  readonly source?: CreatureId
  /** The firing effect's statusId, when it's a status; absent for a plain
   * triggered trait. Threaded onto DamageDealt so a DoT tick's causing status is attributable. */
  readonly statusId?: string
  /** Phase 4.1-H2b2 (ASSUMPTION 143): the firing status INSTANCE's applier snapshot, read from
   * the live owning instance by `fireHook`; absent for a trait/perk/spell and for a status that
   * declares no potency. A `snapshot-potency` magnitude reads it (a tick), and a status's OWN
   * `apply-status` of that same status copies it (Spore's spread) -- nothing else does. */
  readonly snapshot?: StatusSnapshot
  /** Phase 4.1-D (A4): populated ONLY by a spell's own effect loop (actions.ts
   * `executeSpellEffects`) -- the current landed target `cast-target` resolves to. Absent for
   * every trigger; resolving `cast-target` without it is a resolver-invariant error. */
  readonly castTarget?: CreatureId
  /** Phase 4.1-D: the cast instance's `powerPercent / 100`, populated with `castTarget`. Scales
   * a spell's `deal-damage` and `heal` ONLY (the instance list's rule); never a stat-modifier or a
   * status. Replaces the magnitude `count` a `magnitudeSource` would supply (a spell may not carry
   * one -- `validateSpellEffects`). */
  readonly castPowerFraction?: number
}

// ---- Damage application + damage-path hooks ----

/** Defend: +50% effective Defence (inside the core) and a ×0.65 taken-pool factor, until the
 * defender's next turn. Relocated here from combat.ts alongside the damage core. */
function resolveDefenceAndTakenFactors(target: Creature): {
  defence: number
  takenFactors: readonly number[]
} {
  const baseDefence = getEffectiveStat(target, 'defence')
  if (!target.defending) return { defence: baseDefence, takenFactors: [] }
  return {
    defence: baseDefence * DEFEND_DEFENCE_MULTIPLIER,
    takenFactors: [DEFEND_TAKEN_FACTOR],
  }
}

/**
 * Computes one hit via the real damage formula (Attack/Cast OffStat, affinity, pools, min-1) and
 * applies it. Shared by chosen actions (Attack/Cast, from actions.ts) and triggered deal-damage
 * responses — "attack"/"cast" in a trait mean the real actions, same formula.
 */
export function dealDamage(
  attackerId: CreatureId,
  targetId: CreatureId,
  offStatKind: 'attack' | 'cast',
  spellPower: number,
  damageSource: 'attack' | 'cast' | 'dot',
  channel: DamageChannel,
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const attacker = getCreature(state, attackerId)
  const offStat = getOffensiveStat(attacker, offStatKind, spellPower)
  return dealDamageCore(
    attackerId,
    targetId,
    offStat,
    offStatKind,
    damageSource,
    channel,
    state,
    ctx,
    statusId,
  )
}

/**
 * Phase 4 Slice B: the deal-damage response's `scalingStat` mode -- reads an ARBITRARY Stat
 * directly via getEffectiveStat (no stat-remap resolution, unlike offStatKind/RemapSlot), then
 * × spellPower, through the SAME downstream formula as dealDamage (armor-pen, cross-stat,
 * affinity, pools, min-1 floor). E.g. Thorns/Shield Bash scaling off Defence instead of Attack.
 */
export function dealDamageWithScalingStat(
  attackerId: CreatureId,
  targetId: CreatureId,
  stat: Stat,
  spellPower: number,
  damageSource: 'attack' | 'cast' | 'dot',
  channel: DamageChannel,
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const attacker = getCreature(state, attackerId)
  const offStat = getEffectiveStat(attacker, stat) * spellPower
  // ASSUMPTION (Slice B, not pinned by the brief): a scalingStat-based deal-damage response is
  // treated as Attack-flavored for cross-stat's `appliesTo` gating unless damageSource says
  // 'cast' -- content examples (Thorns/Shield Bash) are reactive "strike back" responses, not
  // spell-shaped.
  return dealDamageCore(
    attackerId,
    targetId,
    offStat,
    damageSource === 'cast' ? 'cast' : 'attack',
    damageSource,
    channel,
    state,
    ctx,
    statusId,
  )
}

/**
 * Phase 4 Slice E2 (Cull the Weak / Ambusher / Gloomjaws / Sporch's Reaper): the attacker's
 * summed `conditional-damage-bonus` passives whose condition (subject 'target') holds against
 * the CURRENT damage target -- folded directly into dealtMods alongside gatherDealtMods, so the
 * bonus lands as one clean modified hit rather than a second on-damage-dealt instance. Lives
 * here (not effects.ts, unlike the other gatherers) because it needs evaluateCondition, and
 * conditions.ts already imports hasStatus FROM effects.ts -- effects.ts importing back from
 * conditions.ts would be a cycle; resolution.ts already sits above both.
 *
 * Phase 4 Slice F (review amendment): also filters on `actionKind` (absent -> `'both'`, so every
 * pre-amendment effect -- none of which set the field -- is unaffected), mirroring
 * `gatherCrossStatContribution`'s own `appliesTo` gate. Brute Force (`'attack'`)/Spell Focus
 * (`'cast'`) need this so their unconditional "+% damage" doesn't leak onto the OTHER action kind.
 */
function gatherConditionalDamageBonus(
  attacker: Creature,
  target: Creature,
  actionKind: 'attack' | 'cast',
  state: CombatState,
): number[] {
  const bonuses: number[] = []
  for (const e of flatEffects(attacker)) {
    if (e.category !== 'conditional-damage-bonus') continue
    const applies = e.actionKind ?? 'both'
    if (applies !== actionKind && applies !== 'both') continue
    if (!evaluateCondition(e.condition, attacker, state, undefined, target.id)) continue
    bonuses.push(e.percent)
  }
  return bonuses
}

function dealDamageCore(
  attackerId: CreatureId,
  targetId: CreatureId,
  offStat: number,
  actionKind: 'attack' | 'cast',
  damageSource: 'attack' | 'cast' | 'dot',
  channel: DamageChannel,
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const attacker = getCreature(state, attackerId)
  const target = getCreature(state, targetId)
  const { defence, takenFactors: defendFactors } = resolveDefenceAndTakenFactors(target)
  const dealtMods = [
    ...gatherDealtMods(attacker, state),
    ...gatherConditionalDamageBonus(attacker, target, actionKind, state),
  ]
  const takenFactors = [...defendFactors, ...gatherTakenFactors(target, state)]
  let damage: DamageResult
  if (channel === 'direct') {
    // The Additional is folded into finalDamage HERE, before applyDamageAndEmit, so Last Stand's
    // lethal check, remainingHp and every hook see one number (ASSUMPTION 135).
    damage = withAdditional(
      calculateDamage({
        offStat,
        defence,
        armorPenetrationPercent: gatherArmorPenetration(attacker),
        crossStatBonus: gatherCrossStatContribution(attacker, actionKind),
        attackerAffinity: attacker.affinity,
        defenderAffinity: target.affinity,
        dealtMods,
        takenFactors,
      }),
      calculateAdditional(attacker.level, effectiveMaxHp(target)),
    )
  } else {
    // Indirect: cross-stat contribution is direct-only (ASSUMPTION 134).
    damage = calculateIndirectDamage({
      magnitude: offStat,
      defence,
      armorPenetrationPercent: gatherArmorPenetration(attacker),
      attackerAffinity: attacker.affinity,
      defenderAffinity: target.affinity,
      dealtMods,
      takenFactors,
    })
  }
  // A hit routed through the damage formula is never a cost, even when attacker === target
  // (a Confusion redirect, a spell effect on its own caster).
  return applyDamageAndEmit(
    attackerId,
    target,
    damage,
    damageSource,
    { kind: 'hit' },
    state,
    ctx,
    statusId,
  )
}

/**
 * Applies a computed damage result, emits DamageDealt, then fires the damage-path hooks in the
 * pinned order: on-damage-dealt (source, UNCONDITIONAL — even on a lethal hit) → on-damage-taken
 * (self, survived only) → on-damage-observed (every living creature, UNCONDITIONAL — even on a
 * lethal hit; Phase 4.1-H2b1) → if it died: CreatureDied → on-death → on-kill → on-ally-death /
 * on-enemy-death (observers). Death pre-empts the victim's on-damage-taken; hit-reactions
 * (including the observation of the hit) resolve before death-reactions.
 *
 * `origin` (Phase 4.1-H2b2, ASSUMPTIONS 5, 17, 146; it replaces H2b1's `selfInflicted` boolean) is
 * REQUIRED, with no default, so the compiler finds every caller. It is stated by the branch that
 * chose the path and NEVER derived from `sourceId === target.id` (a tick's self-applied bearer and
 * a direct action landing on its own actor have equal ids and are not costs):
 *  - `cost` (only `applyCostDamage`) is the one origin the damage observer reports as self-inflicted.
 *  - `tick` (only `applyTickDamage`) offers NO source to the bearer's `on-damage-taken` /
 *    `on-death` -- so `triggering-source` resolves to nothing and no retaliator answers a tick,
 *    while the hooks themselves still fire (Sleep wakes) -- and fires the dealer-side hooks
 *    (`on-damage-dealt`, `on-kill`) only for `origin.dealerId`, the living applier.
 */
export function applyDamageAndEmit(
  sourceId: CreatureId,
  target: Creature,
  damage: DamageResult,
  damageSource: 'attack' | 'cast' | 'dot',
  origin: DamageOrigin,
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const rawNewHp = Math.max(target.currentHp - damage.finalDamage, 0)
  const wouldDie = rawNewHp === 0 && target.alive

  // Phase 4 Slice D (Last Stand): checked at the instant a lethal hit would land, BEFORE any
  // death event/hook fires -- one seeded RNG roll, drawn only when the bearer actually carries
  // a nonzero cheat-death chance (an ordinary creature never touches state.rng here, mirroring
  // targeting.ts's Confusion "draws nothing when inactive" discipline). ASSUMPTION 19: on
  // success currentHp becomes EXACTLY 1 (not finalDamage-1) and `died` flips to false --
  // resolution below proceeds through the ordinary non-lethal path (DamageDealt's remainingHp
  // reflects 1, on-damage-taken fires since the target survived, no CreatureDied/on-death).
  let newHp = rawNewHp
  let died = wouldDie
  if (wouldDie) {
    const chancePercent = gatherCheatDeathChance(target)
    if (chancePercent > 0 && nextRandom(state.rng) < chancePercent / 100) {
      newHp = 1
      died = false
    }
  }

  let working = updateCreature(state, target.id, { currentHp: newHp, alive: newHp > 0 })

  ctx.events.push({
    type: 'DamageDealt',
    sourceId,
    targetId: target.id,
    rawDamage: damage.rawDamage,
    finalDamage: damage.finalDamage,
    affinityMultiplier: damage.affinityMultiplier,
    wasChipOnly: damage.wasChipOnly,
    remainingHp: newHp,
    damageSource,
    statusId,
  })

  // The dealer-side hooks (on-damage-dealt, on-kill) run on the creature that dealt the damage; a
  // tick's dealer is its living applier or no one (a dead applier's fallback bearer is only the
  // logged source). The bearer-side hooks (on-damage-taken, on-death) see the dealer as their
  // `source`, except for a tick, which offers none.
  const dealerIds: readonly CreatureId[] =
    origin.kind === 'tick' ? (origin.dealerId ? [origin.dealerId] : []) : [sourceId]
  const bearerSideSource = origin.kind === 'tick' ? undefined : sourceId

  working = fireHook('on-damage-dealt', dealerIds, target.id, working, ctx).state

  if (!died) {
    working = fireHook(
      'on-damage-taken',
      [target.id],
      bearerSideSource,
      working,
      ctx,
    ).state
  }

  // Phase 4.1-H2b1: the damage observation sits between the hit-reactions and the death chain. The
  // hook's `source` is the DAMAGED creature (what `relationship` compares against); a creature
  // killed by this hit is already `alive: false`, so it does not observe its own death blow.
  working = fireHook(
    'on-damage-observed',
    livingIdsOf(working),
    target.id,
    working,
    ctx,
    { observedDamage: { selfInflicted: origin.kind === 'cost' } },
  ).state

  if (!died) return working

  ctx.events.push({ type: 'CreatureDied', creatureId: target.id })
  working = fireHook('on-death', [target.id], bearerSideSource, working, ctx).state
  working = fireHook('on-kill', dealerIds, target.id, working, ctx).state
  working = fireDeathObservers(target.id, working, ctx)
  return working
}

/** All living creatures' ids in tie-break order (player slots, then enemy slots): the scope of an
 * observation hook. (actions.ts keeps its own private copy for `on-action-observed`.) */
function livingIdsOf(state: CombatState): CreatureId[] {
  return [...state.playerParty, ...state.enemyParty]
    .filter((c) => c.alive)
    .map((c) => c.id)
}

function fireDeathObservers(
  deadId: CreatureId,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const dead = findCreature(state, deadId)
  if (!dead) return state
  const sameSide = dead.side === 'player' ? state.playerParty : state.enemyParty
  const otherSide = dead.side === 'player' ? state.enemyParty : state.playerParty
  const allies = sameSide.filter((c) => c.alive && c.id !== deadId).map((c) => c.id)
  const enemies = otherSide.filter((c) => c.alive).map((c) => c.id)

  let working = state
  for (const id of allies) {
    working = fireHook('on-ally-death', [id], deadId, working, ctx).state
  }
  for (const id of enemies) {
    working = fireHook('on-enemy-death', [id], deadId, working, ctx).state
  }
  return working
}

// ---- Hook firing ----

/** Phase 4.1-C2a (A1): fireHook's per-call specifics, out of the positional parameter list. */
export interface FireHookOptions {
  /** Phase 4 Slice E2 (general action-observation system): supplied ONLY by the four action
   * executors' own 'on-action-observed' call (actions.ts), alongside their existing actor-self
   * hook call -- every other call site omits it. Consulted below to filter ObservationFilter-
   * carrying candidates; meaningless (and unread) for any other hook. */
  readonly observed?: {
    readonly actionKind: 'attack' | 'cast' | 'defend' | 'provoke'
    readonly instanceIndex: number
  }
  /** Phase 4.1-H2b1 (CONVENTIONS "Damage observation"): supplied ONLY by `applyDamageAndEmit`'s
   * `on-damage-observed` call. `selfInflicted` is the cost classification carried from the branch
   * that chose the cost path. Both observation hooks FAIL CLOSED: a candidate on
   * `on-damage-observed` is skipped when this is absent, one on `on-action-observed` when
   * `observed` is. */
  readonly observedDamage?: { readonly selfInflicted: boolean }
  /** Phase 4.1-F2 (ASSUMPTION 52): the born-this-turn tick gate, supplied ONLY by `resolveTurn`'s
   * `on-turn-end` call. Consulted for every STATUS-sourced candidate (trait-sourced triggers are
   * never gated): true means the bearer's status instance (`statusInstanceId`) was applied or
   * refreshed since this turn's action slot, so its trigger does not fire this turn. Skips
   * silently, like a false `condition` -- no TriggerFired, no depth/truncation accounting.
   * `fireHook` itself has no hook-specific rule. */
  readonly skipStatusTrigger?: (
    bearer: Creature,
    statusInstanceId: EffectInstanceId,
  ) => boolean
  /** Phase 4.1-F2 (ASSUMPTION 19): "the fight is over" predicate, supplied by `resolveTurn` for
   * its in-fight hook passes. Checked BETWEEN top-level candidates only (never inside a
   * cascade -- nested `fireHook` calls get no options): once true the pass stops, so a later
   * firing (e.g. a lethal tick) cannot follow the firing that wiped a side. */
  readonly stopWhen?: (state: CombatState) => boolean
}

/**
 * Fires `hook` for each creature in `selfIds` (the caller supplies the order: a single creature,
 * or tie-break order for a global point). Alive-gated — only on-death fires on a dead creature.
 * Threads the cascade: an effect instance already unwinding on the stack is skipped (self-loop
 * guard), and MAX_TRIGGER_CASCADE_DEPTH bounds chain depth (emitting CascadeTruncated at the cap
 * and NOT executing the over-cap trigger).
 *
 * The alive-check is re-evaluated FRESH before every individual effect (not once per creature):
 * if a creature's own earlier effect in this pass kills it (e.g. a lethal DoT tick in its
 * turn-end hooks), its remaining not-yet-reached effects in this pass are skipped. A creature
 * killed mid-pass fires only `on-death`.
 */
export function fireHook(
  hook: Hook,
  selfIds: readonly CreatureId[],
  source: CreatureId | undefined,
  state: CombatState,
  ctx: ResolutionContext,
  options?: FireHookOptions,
): { state: CombatState } {
  const { observed, observedDamage, skipStatusTrigger, stopWhen } = options ?? {}
  const { events, cascade } = ctx
  let working = state
  const isDeathHook = hook === 'on-death'
  // Phase 4 Slice H2 (PR #60 review, E2.1): sourceTraitIds that have already claimed their one
  // `stacks: false` slot THIS fireHook call -- claimed the moment an effect is about to roll
  // chancePercent (see below), regardless of whether that roll succeeds, so the AGGREGATE chance
  // of firing stays exactly chancePercent no matter how many creatures carry the same effect.
  const claimedNonStacking = new Set<string>()

  for (const selfId of selfIds) {
    const initial = findCreature(working, selfId)
    if (!initial) continue
    // Candidates are looked up ONCE per creature, from `initial` -- a snapshot at this creature's
    // pass start. The list CAN change mid-pass (an earlier candidate's own response may cleanse
    // or replace a status this creature also carries -- that's exactly what B4's exact-instance
    // check below exists to catch), so aliveness AND each candidate's real owning instance are
    // both re-checked fresh, per effect, against the LIVE creature below -- never trusted off
    // this snapshot.
    const candidates = effectsForHook(initial, hook)

    for (const effect of candidates) {
      if (stopWhen?.(working)) return { state: working } // a wipe ends the pass (F2)
      const self = findCreature(working, selfId)
      if (!self) continue
      // Dead creatures fire only on-death; everything else requires a living self.
      if (isDeathHook ? self.alive : !self.alive) continue

      // Phase 4.1-B (B4): the exact-instance rule -- `candidates` was built ONCE, from `initial`,
      // at the top of this creature's pass; an EARLIER candidate in this SAME pass may since have
      // removed or replaced (cleanse, then reapply) the status this candidate came from. Re-check
      // against the LIVE `self` (not `initial`) that the effect's REAL owning instance
      // (`sourceInstanceId` -- for a status trigger this is the status's shared id, not the
      // derived per-trigger guard id used for the cascade check below) is still present.
      const owner = self.activeEffects.find(
        (a) => a.instanceId === effect.sourceInstanceId,
      )
      if (!owner) continue

      if (cascade.activeInstances.has(effect.instanceId)) continue // self-re-entry guard

      // F2: see skipStatusTrigger's own doc comment above.
      if (
        effect.statusId !== undefined &&
        skipStatusTrigger?.(self, effect.sourceInstanceId)
      ) {
        continue
      }

      // Phase 4 Slice E2: on-action-observed's own filter -- relationship (observer vs actor)/
      // actionKind/excludeActor. Absent fields match everything (permissive default). Checked
      // BEFORE the generic `condition` (a cheaper, more fundamental "is this candidate even
      // relevant" gate); a non-matching observer draws nothing and consumes no depth budget,
      // same silent-skip discipline as a false condition.
      // Phase 4.1-H2b1: BOTH observation hooks fail closed. A candidate on `on-action-observed` is
      // skipped when the caller passed no `observed`, one on `on-damage-observed` when it passed
      // no `observedDamage` -- a call site that forgets its option can never make every observer
      // fire on every event. (All five action call sites and the one damage call site pass theirs.)
      if (hook === 'on-action-observed') {
        if (!observed) continue
        if (effect.observationFilter) {
          const actor = source ? findCreature(working, source) : undefined
          const {
            relationship = 'any',
            actionKind,
            excludeActor = false,
          } = effect.observationFilter
          if (actionKind && actionKind !== observed.actionKind) continue
          if (excludeActor && actor && actor.id === self.id) continue
          if (relationship !== 'any' && actor) {
            if (relationship === 'self' && actor.id !== self.id) continue
            if (relationship === 'ally' && actor.side !== self.side) continue
            if (relationship === 'enemy' && actor.side === self.side) continue
          }
        }
      } else if (hook === 'on-damage-observed') {
        if (!observedDamage) continue
        if (effect.observationFilter) {
          // `source` is the DAMAGED creature; one that cannot be found is no match, so the
          // relationship check can never fall through (it cannot happen at the one call site).
          const damaged = source ? findCreature(working, source) : undefined
          if (!damaged) continue
          const { relationship = 'any', selfInflicted } = effect.observationFilter
          if (
            selfInflicted !== undefined &&
            selfInflicted !== observedDamage.selfInflicted
          ) {
            continue
          }
          if (relationship === 'self' && damaged.id !== self.id) continue
          if (relationship === 'ally' && damaged.side !== self.side) continue
          if (relationship === 'enemy' && damaged.side === self.side) continue
        }
      }

      // Optional trigger condition (self-scoped, reusing the scripting Condition union). Evaluated
      // against the LIVE self -- `working` may have changed since `self` was snapshotted, so an
      // earlier same-hook effect's HP change is visible. A false condition means the trigger simply
      // isn't firing: it emits nothing and consumes none of the depth/truncation budget.
      // evaluateCondition is pure (never draws RNG), safe to call for every candidate effect.
      // Phase 4 Slice E2: `source` (the trigger's OTHER creature -- attacker for on-damage-taken,
      // dead ally for on-ally-death, etc.) is threaded through as the 'target'-subject condition's
      // resolving-against creature; absent for hooks with no such creature (on-round-end,
      // on-fight-start), in which case 'target' simply evaluates false, same as scripting lookahead.
      if (
        effect.condition &&
        !evaluateTriggerCondition(effect.condition, self, working, source)
      ) {
        continue
      }

      if (cascade.depth + 1 > MAX_TRIGGER_CASCADE_DEPTH) {
        events.push({
          type: 'CascadeTruncated',
          creatureId: self.id,
          effectId: effect.sourceTraitId,
          depth: cascade.depth + 1,
        })
        continue
      }

      // Phase 4 Slice H2 (PR #60 review, E2.1): a `stacks: false` effect claims its one dedup
      // slot HERE -- before the chancePercent roll below, not just on success -- so a second
      // matching effect (e.g. a second Overtone) never gets to roll at all this firing, keeping
      // the aggregate chance at exactly chancePercent regardless of how many creatures carry it.
      if (effect.nonStacking) {
        if (claimedNonStacking.has(effect.sourceTraitId)) continue
        claimedNonStacking.add(effect.sourceTraitId)
      }

      // Phase 4 Slice E2 (Concussive Blows / Sleeper): an optional probabilistic gate, a sibling
      // of `condition`, read uniformly off the resolved-trigger record regardless of whether it
      // came from a trait's TriggeredDef or a triggered effect inside a status. Rolled AFTER the depth-cap
      // check (a depth-capped effect isn't firing, so it must draw zero RNG -- cheat-death's
      // "only when it actually fires" discipline), ONLY when chancePercent is present -- a plain
      // trigger never touches state.rng here. A failed roll skips silently, exactly like a false
      // condition (no TriggerFired, no depth/truncation accounting).
      if (
        effect.chancePercent !== undefined &&
        !(nextRandom(working.rng) < effect.chancePercent / 100)
      ) {
        continue
      }

      // A DoT/Regen tick (emitTriggerFired: false) announces itself via its own StatusApplied,
      // not a per-tick TriggerFired; every other trigger emits one.
      const emitTriggerFired = !(
        (effect.response.kind === 'deal-damage' || effect.response.kind === 'heal') &&
        effect.response.emitTriggerFired === false
      )
      if (emitTriggerFired) {
        events.push({
          type: 'TriggerFired',
          sourceId: self.id,
          hook,
          effectId: effect.sourceTraitId,
        })
      }

      // Present only when the resolved trigger came from a status; absent for
      // a plain permanent trait. The snapshot is read from the LIVE owning instance (ASSUMPTION 7:
      // the safe read -- unobservable today, a same-pass refresh makes the instance born so its
      // tick is skipped, and a corpse can't be re-applied), never carried on the candidate.
      const statusId = effect.statusId
      const snapshot = owner.category === 'status' ? owner.snapshot : undefined

      // A `perform-action` response only ENQUEUES its grant (executeResponse), so the self-re-entry
      // guard below is released before the granted action ever starts: an echo chain can pass
      // through the same Overtone again, and only `cascade.depth` bounds it (4.1-E, A2).
      cascade.activeInstances.add(effect.instanceId)
      cascade.depth += 1
      const result = executeResponse(
        effect.response,
        effect.sourceTraitId,
        { channel: 'indirect', self: self.id, source, statusId, snapshot },
        working,
        ctx,
      )
      cascade.depth -= 1
      cascade.activeInstances.delete(effect.instanceId)

      working = result.state
    }
  }

  return { state: working }
}

// ---- Response execution ----

function resolveResponseTargets(
  target: ResponseTarget,
  context: HookContext,
  state: CombatState,
): CreatureId[] {
  switch (target.kind) {
    case 'self':
      return [context.self]
    case 'triggering-source':
    case 'triggering-ally':
      // PR #64 review fix 3: never resolves to the firing creature itself. A creature's own cost
      // damages itself (applyCostDamage), so on-damage-taken's hook context has context.source ===
      // context.self, and without this check a retaliatory trait (e.g. Hollowkin Wretch's
      // on-damage-taken -> apply-status(triggering-source, confusion)) would apply its response to
      // its OWN bearer. TriggerFired has already been emitted by the time this resolves (fireHook,
      // before executeResponse runs) -- only the response's actual effect fizzles, the same "no
      // valid target -> empty list -> no-op" discipline every other ResponseTarget already uses.
      // 4.1-H2b2: a status TICK offers no source at all (applyDamageAndEmit, origin 'tick'), so a
      // living applier's tick reaches no retaliator either; on-damage-taken itself still fires
      // for a tick (Sleep's wake-on-damage depends on it) -- this only narrows targeting, never
      // hook firing.
      return context.source && context.source !== context.self ? [context.source] : []
    case 'all-enemies':
      return livingEnemiesOf(getCreature(state, context.self), state).map((c) => c.id)
    case 'all-allies':
      return livingAlliesOf(getCreature(state, context.self), state).map((c) => c.id)
    case 'all-allies-of-species': {
      const self = getCreature(state, context.self)
      return livingAlliesOf(self, state)
        .filter((c) => c.speciesId !== undefined && c.speciesId === self.speciesId)
        .map((c) => c.id)
    }
    case 'cast-target': {
      if (context.castTarget === undefined) {
        throw new Error(
          'resolver invariant violated: cast-target resolved outside a spell cast (no castTarget in context)',
        )
      }
      // The landed target, alive or not: a dead one gets nothing from the rest of the list
      // because NO verb acts on a corpse except `revive` (the verb rule in executeResponse), not
      // because this target kind filters it (4.1-D review item 3).
      return [context.castTarget]
    }
    case 'selector': {
      const id = resolveTargetSelector(
        target.selector,
        getCreature(state, context.self),
        state,
      )
      return id ? [id] : []
    }
    case 'random-dead-ally': {
      const self = getCreature(state, context.self)
      const party = self.side === 'player' ? state.playerParty : state.enemyParty
      // Phase 4.1-B (D3): dead allies at the revive cap are excluded from the pool -- an empty
      // pool draws no random number (the check below runs BEFORE the draw).
      const deadAllies = party.filter(
        (c) => !c.alive && c.revivesUsed < MAX_REVIVES_PER_CREATURE,
      )
      if (deadAllies.length === 0) return []
      const index = Math.floor(nextRandom(state.rng) * deadAllies.length)
      const chosen = deadAllies[index]
      return chosen ? [chosen.id] : []
    }
    case 'lowest-hp-injured-other-ally': {
      // Phase 4.1-H2b1 (ASSUMPTION 140): the same pool as the `other-ally-injured` condition.
      const id = resolveLowestHpInjuredOtherAlly(getCreature(state, context.self), state)
      return id ? [id] : []
    }
    case 'random-ally-without-status': {
      // Phase 4 Slice H3 (Spore's spread-on-death, ASSUMPTION 30): livingAlliesOf resolves off
      // `self.side` only (never `self.alive`), so this works correctly even when self is the
      // just-died Spore bearer firing its own on-death trigger.
      const self = getCreature(state, context.self)
      const pool = livingAlliesOf(self, state).filter(
        (c) => !hasStatus(c, target.statusId),
      )
      if (pool.length === 0) return []
      const index = Math.floor(nextRandom(state.rng) * pool.length)
      const chosen = pool[index]
      return chosen ? [chosen.id] : []
    }
    default: {
      const exhaustive: never = target
      throw new Error(`Unhandled response target: ${String(exhaustive)}`)
    }
  }
}

/** True iff a flat magnitude is the `snapshot-potency` marker (a status's tick, 4.1-H2b2). */
function isSnapshotPotency(
  amount: number | StatPercent | SnapshotPotency,
): amount is SnapshotPotency {
  return typeof amount === 'object' && 'kind' in amount
}

/** The firing status instance's snapshot, or a resolver-invariant THROW: a tick with no snapshot
 * (an instance built by hand without one, a future path that forgets it) must never fall back to
 * 0 or to the bearer's stat -- that would silently reintroduce the bearer-relative tick. */
function requireSnapshot(context: HookContext): StatusSnapshot {
  if (context.snapshot === undefined) {
    throw new Error(
      "resolver invariant violated: a snapshot-potency magnitude fired with no snapshot in context (a tick needs its status instance's applier snapshot)",
    )
  }
  return context.snapshot
}

/** The creature a tick credits (4.1-H2b2, ASSUMPTIONS 113, 146): its applier WHILE IT LIVES --
 * judged at tick time, so a revived applier is the source again -- else the bearer, which is only
 * the logged source (`dealerId` is then null: no dealer-side hook fires). One rule for the damage
 * tick and Regen's heal. */
function tickDealer(
  snapshot: StatusSnapshot,
  state: CombatState,
): { sourceOf: (bearerId: CreatureId) => CreatureId; dealerId: CreatureId | null } {
  const applier = findCreature(state, snapshot.applierId)
  const dealerId = applier?.alive ? applier.id : null
  return { sourceOf: (bearerId) => dealerId ?? bearerId, dealerId }
}

/** Flat mode's magnitude (deal-damage's / heal's `flatAmount`, never the snapshot marker -- that
 * is a tick, handled before this is reached), scaled by `count` (the live magnitudeSource count,
 * else 1), also accepting a `StatPercent`. Reads the FIRING creature's (`context.self`) own
 * stat, floored (the integer value the game actually uses -- an
 * effective stat can be fractional under modifiers, e.g. 240 * 1.1 = 264.00000000000006),
 * multiplies in the integer `percent` and `count` BEFORE dividing by 100 -- `percent` is a
 * positive integer specifically so this is exact in floating point (a float fraction like `*
 * 0.03` can land just below an integer, e.g. 180 * 0.03 * 5 = 26.999999999999996, and floor one
 * too low). The one remaining floor (over the whole `stat * percent * count / 100`, never
 * per-unit) stays where it already lived: applyCostDamage's `Math.floor` and applyHeal's
 * `Math.floor` (clamped to effective max HP) -- this function returns an
 * unfloored value on purpose so that single downstream floor is the only one. */
function resolveFlatTotal(
  bearer: Creature,
  amount: number | StatPercent,
  count: number,
): number {
  if (typeof amount === 'number') return amount * count
  if (!Number.isInteger(amount.percent) || amount.percent <= 0) {
    throw new Error(
      'resolver invariant violated: stat-derived flat amount needs a positive integer percent',
    )
  }
  return (
    (Math.floor(getEffectiveStat(bearer, amount.ofStat)) * amount.percent * count) / 100
  )
}

export function executeResponse(
  response: EffectResponse,
  sourceTraitId: string,
  context: HookContext,
  state: CombatState,
  ctx: ResolutionContext,
): { state: CombatState } {
  switch (response.kind) {
    case 'deal-damage': {
      // ASSUMPTION 6: offStat/scalingStat/flatAmount are mutually exclusive -- setting more
      // than one is a resolver-invariant error, mirroring applyStatus's unknown-statusId throw,
      // rather than silently picking one.
      const modesSet = [
        response.offStat !== undefined,
        response.scalingStat !== undefined,
        response.flatAmount !== undefined,
      ].filter(Boolean).length
      if (modesSet > 1) {
        throw new Error(
          'resolver invariant violated: deal-damage response set more than one of offStat/scalingStat/flatAmount',
        )
      }
      const bearer = getCreature(state, context.self)
      // Phase 4 Slice D: magnitudeSource, when present, is the repetition count this response's
      // magnitude is scaled by, a live resolveMagnitudeCount(...) reading (see MagnitudeSource's
      // own doc comment); absent, the count stays the implicit 1, in flat AND formula mode (a
      // status is single-instance, 4.1-H2b2). Resolved ONCE up front (bearer/state don't change
      // per target); the single `count` feeds whichever mode below actually reads it (only one
      // does per call).
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(bearer, state, response.magnitudeSource)
        : undefined
      // A status's tick (4.1-H2b2): its snapshot is required up front (the invariant throw), read
      // once -- the bearer is the one target (the validator pins `self`).
      const tickSnapshot =
        response.flatAmount !== undefined && isSnapshotPotency(response.flatAmount)
          ? requireSnapshot(context)
          : undefined
      // PR #64 review fix 4: a magnitudeSource resolving to exactly 0 is a FULL no-op -- no
      // DamageDealt, no downstream damage-path hooks (on-damage-dealt/on-damage-taken/death). The
      // damage formula's own MIN(1, floor(raw)) floor would otherwise still deal 1 damage even at
      // 0 effective offense (0 * spellPower = 0 through the whole formula, but the "a hit always
      // removes >=1 HP" floor doesn't know this was never really a hit). TriggerFired was already
      // emitted by fireHook before executeResponse runs, so it is NOT retracted here -- only the
      // response's own consequence is skipped. Absent magnitudeSource is untouched (count stays
      // undefined, this branch never taken) -- byte-identical to pre-fix-4 behavior.
      if (response.magnitudeSource && count === 0) {
        return { state }
      }
      // No count (a trait's own trigger, no magnitudeSource): the implicit 1 -- exact pre-Slice-D
      // values (a no-op multiplier on spellPower).
      const flatCount = count ?? 1
      // Phase 4.1-D: a spell's cast-instance fraction (`castPowerFraction`) takes the place of the
      // implicit `1`, in the SAME multiplication order as the pre-4.1-D `spell.spellPower * pf`.
      const formulaMultiplier = count ?? context.castPowerFraction ?? 1
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue // never strike a corpse
        const damageSource = response.damageSource ?? 'dot'
        if (tickSnapshot !== undefined) {
          // A status tick (ASSUMPTION 144): recognised by its marker, never by the 'dot' label or
          // by statusId + self (CATASTROPHIC_COLLAPSE carries that label and is a cost).
          working = applyTickDamage(
            targetId,
            tickSnapshot,
            damageSource,
            working,
            ctx,
            context.statusId,
          )
        } else if (response.flatAmount !== undefined) {
          const amount = resolveFlatTotal(
            bearer,
            response.flatAmount as number | StatPercent,
            flatCount,
          )
          if (context.channel === 'indirect' && targetId === context.self) {
            working = applyCostDamage(
              context.self,
              amount,
              damageSource,
              working,
              ctx,
              context.statusId,
            )
          } else {
            // Flat mode is always indirect (no true-damage channel, ASSUMPTION 112): the flat
            // amount is the magnitude, Attack-flavoured unless tagged 'cast'.
            working = dealDamageCore(
              context.self,
              targetId,
              amount,
              damageSource === 'cast' ? 'cast' : 'attack',
              damageSource,
              'indirect',
              working,
              ctx,
              context.statusId,
            )
          }
        } else if (response.scalingStat !== undefined) {
          const spellPower = (response.spellPower ?? 1.0) * formulaMultiplier
          const scalingSource = response.damageSource ?? 'attack'
          if (context.channel === 'indirect' && targetId === context.self) {
            working = applyCostDamage(
              context.self,
              getEffectiveStat(bearer, response.scalingStat) * spellPower,
              scalingSource,
              working,
              ctx,
              context.statusId,
            )
          } else {
            working = dealDamageWithScalingStat(
              context.self,
              targetId,
              response.scalingStat,
              spellPower,
              scalingSource,
              context.channel,
              working,
              ctx,
              context.statusId,
            )
          }
        } else {
          const offStat = response.offStat ?? 'attack'
          const spellPower = (response.spellPower ?? 1.0) * formulaMultiplier
          const offSource = response.damageSource ?? offStat
          if (context.channel === 'indirect' && targetId === context.self) {
            working = applyCostDamage(
              context.self,
              getOffensiveStat(bearer, offStat, spellPower),
              offSource,
              working,
              ctx,
              context.statusId,
            )
          } else {
            working = dealDamage(
              context.self,
              targetId,
              offStat,
              spellPower,
              offSource,
              context.channel,
              working,
              ctx,
              context.statusId,
            )
          }
        }
      }
      return { state: working }
    }
    case 'heal': {
      // Phase 4 Slice E2 (Treants Elder / Necromoss): mirrors deal-damage's own mode-selection
      // exactly (ASSUMPTION 6-style exclusivity, magnitudeSource-as-repetition-count). Flat mode
      // (the Wick's heal; Regen's tick via the `snapshot-potency` marker, 4.1-H2b2) reads
      // `flatAmount`; `scalingStat` mode reads the HEALER's (firing creature's) own effective stat
      // × spellPower × the same live count -- never the target's.
      // Phase 4.1-D (F2): offStat joins as the third mode; all three are mutually exclusive.
      const healModesSet = [
        response.flatAmount !== undefined,
        response.scalingStat !== undefined,
        response.offStat !== undefined,
      ].filter(Boolean).length
      if (healModesSet > 1) {
        throw new Error(
          'resolver invariant violated: heal response set more than one of flatAmount/scalingStat/offStat',
        )
      }
      const bearer = getCreature(state, context.self)
      // Same count composition as deal-damage (magnitudeSource, else the implicit 1).
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(bearer, state, response.magnitudeSource)
        : undefined
      // PR #64 review fix 4: mirrors deal-damage's own zero-count no-op -- see its comment above.
      // A heal has no min-1 floor to worry about (applyHeal's own Math.max(0, ...) already
      // allows a 0 heal), but this still skips emitting a HealApplied event for a "heal" that
      // never really happened.
      if (response.magnitudeSource && count === 0) {
        return { state }
      }
      // No count: the implicit 1 (byte-identical for a trait's own trigger), same composition as
      // deal-damage's own magnitudeSource.
      const flatCount = count ?? 1
      const formulaMultiplier = count ?? context.castPowerFraction ?? 1
      // Regen's tick (4.1-H2b2): the snapshot is required up front, like deal-damage's.
      const tickSnapshot =
        response.flatAmount !== undefined && isSnapshotPotency(response.flatAmount)
          ? requireSnapshot(context)
          : undefined

      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue
        if (tickSnapshot !== undefined) {
          // The healer's potency, frozen at application; credited to the applier while it lives,
          // else the bearer -- the damage tick's rule (ASSUMPTION 146, one tick rule).
          working = applyHeal(
            tickDealer(tickSnapshot, working).sourceOf(targetId),
            targetId,
            tickSnapshot.potency,
            working,
            ctx,
          )
          continue
        }
        let amount: number
        if (response.offStat !== undefined) {
          // Remap-aware (a stat-remap redirects the slot), the lookup a heal SPELL always used;
          // `spellPower × multiplier` is associated exactly as the pre-4.1-D `sp * pf`.
          amount = getOffensiveStat(
            bearer,
            response.offStat,
            (response.spellPower ?? 1.0) * formulaMultiplier,
          )
        } else if (response.scalingStat !== undefined) {
          // One formula for every formula-mode magnitude, trait or spell: `stat * (spellPower *
          // multiplier)`, the order deal-damage uses in every mode and `offStat` gets through
          // getOffensiveStat above (4.1-D review item 2; CONVENTIONS, heal).
          amount =
            getEffectiveStat(bearer, response.scalingStat) *
            ((response.spellPower ?? 1.0) * formulaMultiplier)
        } else {
          amount = resolveFlatTotal(
            bearer,
            (response.flatAmount ?? 0) as number | StatPercent,
            flatCount,
          )
        }
        working = applyHeal(context.self, targetId, amount, working, ctx)
      }
      return { state: working }
    }
    case 'apply-stat-modifier': {
      // Phase 4 Slice E2 (Swarmhive Striker / Necromoss): FREEZE-AT-APPLICATION -- resolved
      // ONCE here (relative to the FIRING creature, context.self -- the bearer whose own
      // side/species/etc. the count reads), before the per-target loop; the resulting
      // finalFactor is a plain number baked into every target's new StatModifierEffect, never
      // recomputed later (contrast Bulwark's damage-modifier, which DOES live-recompute).
      const bearer = getCreature(state, context.self)
      // No magnitudeSource keeps `factor` verbatim instead of the float-lossy
      // `1 + (factor - 1) * 1`.
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(bearer, state, response.magnitudeSource)
        : undefined
      const finalFactor =
        count === undefined ? response.factor : 1 + (response.factor - 1) * count

      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        // The verb rule: no response acts on a dead creature, except `revive` (4.1-D item 3).
        if (!findCreature(working, targetId)?.alive) continue
        working = applyStatModifier(
          context.self,
          targetId,
          response.stat,
          finalFactor,
          sourceTraitId,
          working,
          ctx,
        )
      }
      return { state: working }
    }
    case 'apply-status': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        // The verb rule: no response acts on a dead creature, except `revive` (4.1-D item 3).
        if (!findCreature(working, targetId)?.alive) continue
        // Pass-on by rule (ASSUMPTIONS 143, 145): a status's OWN effect applying that same status
        // copies the firing instance's snapshot (Spore's spread, the dying bearer's whole
        // snapshot). A trait, perk or spell has no `statusId` in its context, so a carrier can
        // never pass a snapshot on -- it snapshots its own stat fresh.
        const inherited =
          context.statusId === response.status.statusId ? context.snapshot : undefined
        working = applyStatus(
          context.self,
          targetId,
          response.status,
          working,
          ctx,
          inherited,
        )
      }
      return { state: working }
    }
    case 'perform-action': {
      // Phase 4.1-E (A2): ENQUEUE only -- actions are atomic, so the granted action starts after the
      // granting action completes, when the scope that owns `ctx` drains `ctx.grants`
      // (actions.ts `drainGrantedActions`). `'triggering-source'` is the hook's source INCLUDING
      // the bearer (the PR #64 "never the firing creature" rule is for response targets). No
      // actor-state check here: only the actor's state WHEN THE GRANT RUNS decides it (dead,
      // locked, skipped turn), and the bearer dying afterwards doesn't cancel it. `depth` is the
      // granting trigger's depth (fireHook already added its +1), so a chain stays depth-bounded.
      const actorId = response.actor === 'self' ? context.self : context.source
      if (actorId) {
        ctx.grants.push({
          sourceId: context.self,
          actorId,
          intent: response.intent,
          effectId: sourceTraitId,
          depth: ctx.cascade.depth,
        })
      }
      return { state }
    }
    case 'revive': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const target = findCreature(working, targetId)
        // Phase 4.1-B (D3): target must be dead AND under the revive cap -- the RNG-avoidance
        // half of the cap lives in resolveResponseTargets' random-dead-ally branch above; this is
        // the defensive re-check for any OTHER ResponseTarget a future revive might use.
        if (!target || target.alive || target.revivesUsed >= MAX_REVIVES_PER_CREATURE)
          continue
        // Death-reset: re-instantiate the target's OWN already-resolved `baselineEffects` (S1) --
        // fresh instance ids from the shared per-fight counter, no registry lookup needed (no
        // ramp preserved: innate traits + perks come back exactly as they were at fight-start).
        // Then currentHp = round(baselineMaxHp * pct) computed from THAT fresh baseline.
        const { effects: activeEffects, nextCounter } = instantiateEffectDefs(
          target.baselineEffects,
          working.effectInstanceCounter,
        )
        const reset: Creature = { ...target, activeEffects }
        const baselineMaxHp = effectiveMaxHp(reset)
        const currentHp = Math.round(baselineMaxHp * response.pct)
        working = { ...working, effectInstanceCounter: nextCounter }
        working = updateCreature(working, targetId, {
          alive: true,
          currentHp,
          activeEffects: reset.activeEffects,
          // Death-reset also clears any stale action-state: a creature that died WHILE
          // defending/provoking (killed before its own next turn, which is the only place
          // these flags normally expire) must not come back still carrying them -- "no ramp
          // preserved" applies to Defend's ×0.65 taken-factor and Provoke's redirect too, not
          // just stat-modifiers/statuses.
          defending: false,
          provoking: false,
          // Phase 4.1-B (D3): counts up, NEVER reset by death or by this very revive's own reset
          // -- it's the thing MAX_REVIVES_PER_CREATURE bounds.
          revivesUsed: target.revivesUsed + 1,
        })
        ctx.events.push({
          type: 'Revived',
          sourceId: context.self,
          targetId,
          currentHp,
        })
      }
      return { state: working }
    }
    case 'grant-action-state': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        // The verb rule: no response acts on a dead creature, except `revive` (4.1-D round 2).
        if (!findCreature(working, targetId)?.alive) continue
        working = updateCreature(working, targetId, {
          ...(response.defending ? { defending: true } : {}),
          ...(response.provoking ? { provoking: true } : {}),
        })
      }
      return { state: working }
    }
    case 'remove-status': {
      // Phase 4 Slice E2 (Sleep's on-damage-taken wake-up; future cleanse/dispel). It has a real
      // `target` field -- reuses the full ResponseTarget
      // vocabulary, so "cleanse lowest-hp-ally" / "dispel all-enemies" get targeting for free.
      // A no-op, no-event when the target doesn't carry the statusId (mirrors revive's
      // "target must be dead" skip style) -- reuses the exact
      // StatusExpired clear path so death-reset and the turn-end cleanup stay consistent.
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const target = findCreature(working, targetId)
        // The verb rule: no response acts on a dead creature, except `revive` (4.1-D item 3).
        if (!target || !target.alive) continue
        const existing = target.activeEffects.find(
          (e): e is StatusEffect =>
            e.category === 'status' && e.statusId === response.filter.statusId,
        )
        if (!existing) continue
        working = updateCreature(working, targetId, {
          activeEffects: target.activeEffects.filter(
            (e) => e.instanceId !== existing.instanceId,
          ),
        })
        ctx.events.push({
          type: 'StatusExpired',
          creatureId: targetId,
          statusId: response.filter.statusId,
        })
      }
      return { state: working }
    }
    default: {
      const exhaustive: never = response
      throw new Error(`Unhandled response kind: ${String(exhaustive)}`)
    }
  }
}

/**
 * Phase 4.1-H2b2 (ASSUMPTIONS 113, 143, 144, 146; CONVENTIONS "DoT and Regen from the applier's
 * snapshot"): a status's damage tick -- INDIRECT damage computed from the instance's applier
 * snapshot, through the ONE indirect formula (`calculateIndirectDamage`, no third formula):
 * `potency × affinity(snapshot vs bearer) × Π(bearer's taken factors) − 0.2 × bearer's effective
 * Defence`, `MAX(1, floor(...))`. Defend's ×1.5 Defence and ×0.65 taken factor apply, as for all
 * indirect damage. There is NO dealt pool (so no `conditional-damage-bonus`), no cross-stat, no
 * armour penetration and no Additional: those are the applier's live build, absent from the
 * snapshot. The source is the applier while it lives, else the bearer (`tickDealer`); the origin
 * is a `tick` carrying that dealer, so the bearer's hooks see no `triggering-source` and the
 * dealer-side hooks fire only for a living applier. Never self-inflicted.
 */
function applyTickDamage(
  bearerId: CreatureId,
  snapshot: StatusSnapshot,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const bearer = getCreature(state, bearerId)
  const { defence, takenFactors: defendFactors } = resolveDefenceAndTakenFactors(bearer)
  const damage = calculateIndirectDamage({
    magnitude: snapshot.potency,
    defence,
    attackerAffinity: snapshot.affinity,
    defenderAffinity: bearer.affinity,
    dealtMods: [],
    takenFactors: [...defendFactors, ...gatherTakenFactors(bearer, state)],
  })
  const { sourceOf, dealerId } = tickDealer(snapshot, state)
  return applyDamageAndEmit(
    sourceOf(bearerId),
    bearer,
    damage,
    damageSource,
    { kind: 'tick', dealerId },
    state,
    ctx,
    statusId,
  )
}

/**
 * Phase 4.1-H2a (ASSUMPTIONS 116, 132): a COST -- a creature's own trait/status/perk response
 * damaging itself. The exact magnitude, floored once, no Defence/pools/affinity/Additional. A cost
 * of 0 is a full no-op (no event, no hooks): the minimum of 1 exists so a hit always lands, and a
 * cost isn't a hit. Still a damage event with the creature as its own source, through
 * `applyDamageAndEmit` (Last Stand, `on-damage-taken` and death all apply).
 */
function applyCostDamage(
  selfId: CreatureId,
  magnitude: number,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  ctx: ResolutionContext,
  statusId?: string,
): CombatState {
  const damage = calculateCost(magnitude)
  if (damage.finalDamage === 0) return state
  // The ONLY caller that passes origin 'cost' (Phase 4.1-H2b1, ASSUMPTIONS 115, 132, 137): the
  // cost classification is the choice of this branch, carried -- not re-derived from the ids.
  return applyDamageAndEmit(
    selfId,
    getCreature(state, selfId),
    damage,
    damageSource,
    { kind: 'cost' },
    state,
    ctx,
    statusId,
  )
}

/** Regen tick / spell heal: a flat or stat-scaled heal, clamped to effective max Health -- no
 * auto-heal past it. Reached through `executeResponse`'s `heal` (a trigger's or a spell's own
 * effect list); exported so the 4.1-D equivalence oracle (spell-effects.test.ts) can replay the
 * pre-4.1-D cast path on the same primitive. */
export function applyHeal(
  sourceId: CreatureId,
  targetId: CreatureId,
  amount: number,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const target = getCreature(state, targetId)
  const maxHp = effectiveMaxHp(target)
  const newHp = Math.min(maxHp, target.currentHp + Math.max(0, Math.floor(amount)))
  const working = updateCreature(state, targetId, { currentHp: newHp })
  ctx.events.push({
    type: 'HealApplied',
    sourceId,
    targetId,
    amount: newHp - target.currentHp,
    remainingHp: newHp,
  })
  return working
}

/**
 * Applies (or re-applies) a status. Single instance per (statusId, creature) (4.1-H2b2, ASSUMPTION
 * 114): a fresh application creates a new instance at the status's declared duration; re-applying
 * keeps the instance (and its id), REFRESHES the timer to the new application's duration (even
 * when shorter) and resets `appliedAt` (born this turn), and replaces the applier snapshot ONLY
 * when the new one's potency is STRICTLY greater -- a tie or a weaker one keeps the current
 * instance whole (applier, affinity and potency), so the source of later ticks does not move on a
 * tie. A fixed-magnitude status carries no snapshot and just refreshes. Every application emits
 * StatusApplied (`sourceId` = the applying creature, ASSUMPTION 9) and fires on-status-applied
 * (event-before-hook), weaker or tied included.
 *
 * The candidate snapshot is `inherited` when the caller passes one (a status's own effect applying
 * the same status: Spore's spread, ASSUMPTION 143) and otherwise the APPLYING creature's own,
 * taken fresh now (`snapshotFor`) -- even when that creature carries the status itself.
 *
 * Phase 4 Slice F (review amendment): `spec.duration ?? def.defaultDuration` -- an omitted
 * duration inherits the status's own declared default; an explicit one overrides it.
 */
export function applyStatus(
  sourceId: CreatureId,
  targetId: CreatureId,
  spec: StatusSpec,
  state: CombatState,
  ctx: ResolutionContext,
  inherited?: StatusSnapshot,
): CombatState {
  const def = state.statuses.get(spec.statusId)
  if (!def) {
    throw new Error(`resolver invariant violated: unknown statusId ${spec.statusId}`)
  }
  const duration = spec.duration ?? def.defaultDuration

  const target = getCreature(state, targetId)
  const existing = target.activeEffects.find(
    (e): e is StatusEffect => e.category === 'status' && e.statusId === spec.statusId,
  )

  const candidate: StatusSnapshot | undefined = def.potency
    ? (inherited ?? snapshotFor(getCreature(state, sourceId), def.potency))
    : undefined

  // Phase 4.1-B (B4): refreshing keeps the existing instance and its id (no new counter draw);
  // only a genuinely FRESH application issues a new id, from the shared per-fight counter (the
  // ONLY production issuer -- never a derived/deterministic string, so a removed-then-reapplied
  // status always gets a truly new id, never the old one back).
  let counter = state.effectInstanceCounter
  const nextEffects: ActiveEffect[] = existing
    ? target.activeEffects.map((e) =>
        e.instanceId === existing.instanceId
          ? // Phase 4 Slice H2 (PR #60 review): spread `existing` (already narrowed to the status
            // container by the `.find()` above), not the loop's own `e: ActiveEffect` --
            // `TriggeredEffect` carries an UNRELATED `stacks?: boolean` field (E2.1's dedup
            // flag), so spreading the raw union member no longer type-checks cleanly against
            // `ActiveEffect`. `existing` carries the exact same runtime value at this index.
            {
              ...existing,
              remainingDuration: duration,
              appliedAt: state.turnClock, // F2: a refresh is born this turn too
              ...(candidate &&
              (existing.snapshot === undefined ||
                candidate.potency > existing.snapshot.potency)
                ? { snapshot: candidate }
                : {}),
            }
          : e,
      )
    : [
        ...target.activeEffects,
        instantiateStatus(
          def,
          createEffectInstanceId(`eff-${counter++}`),
          duration,
          candidate,
          state.turnClock,
        ),
      ]

  let working = { ...state, effectInstanceCounter: counter }
  working = updateCreature(working, targetId, { activeEffects: nextEffects })

  ctx.events.push({
    type: 'StatusApplied',
    targetId,
    statusId: spec.statusId,
    duration,
    sourceId,
  })

  working = fireHook('on-status-applied', [targetId], sourceId, working, ctx).state
  return working
}

/** Reached through `executeResponse`'s `apply-stat-modifier` (sourceTraitId = the firing trait's
 * id, or the spell's own id for a spell's effect, for effect-instance-id/debugging legibility);
 * exported for the 4.1-D equivalence oracle, like `applyHeal` above. */
export function applyStatModifier(
  sourceId: CreatureId,
  targetId: CreatureId,
  stat: Stat,
  factor: number,
  sourceTraitId: string,
  state: CombatState,
  ctx: ResolutionContext,
): CombatState {
  const target = getCreature(state, targetId)
  const effectiveBefore = getEffectiveStat(target, stat)
  // Phase 4.1-B (B4): a fresh id from the shared per-fight counter -- the counter alone already
  // guarantees distinct ids across re-applications (e.g. Grudge firing on each ally death), so
  // the old ordinal-scan-over-a-deterministic-prefix trick is no longer needed.
  const modifier: ActiveEffect = {
    category: 'stat-modifier',
    stat,
    factor,
    instanceId: createEffectInstanceId(`eff-${state.effectInstanceCounter}`),
    sourceTraitId,
  }
  let working: CombatState = {
    ...state,
    effectInstanceCounter: state.effectInstanceCounter + 1,
  }
  working = updateCreature(working, targetId, {
    activeEffects: [...target.activeEffects, modifier],
  })
  const updated = getCreature(working, targetId)
  const effectiveAfter = getEffectiveStat(updated, stat)
  ctx.events.push({
    type: 'StatModifierApplied',
    sourceId,
    targetId,
    stat,
    factor,
    effectiveBefore,
    effectiveAfter,
  })

  // Lowering effective max Health pulls currentHp down with it (never up — no auto-heal).
  if (stat === 'health') {
    const maxHp = effectiveMaxHp(updated)
    if (updated.currentHp > maxHp) {
      working = updateCreature(working, targetId, { currentHp: maxHp })
      ctx.events.push({
        type: 'HpClamped',
        creatureId: targetId,
        previousHp: updated.currentHp,
        newHp: maxHp,
        effectiveMaxHealth: maxHp,
      })
    }
  }
  return working
}
