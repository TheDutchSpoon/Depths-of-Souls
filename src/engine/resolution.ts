// The trigger / cascade resolution core (Phase 3, Slice B). This is the mutually-recursive heart
// of the effect framework: applyDamageAndEmit fires the damage-path hooks, a hook's response can
// deal more damage (re-entering applyDamageAndEmit), and a transient CascadeState bounds the chain.
//
// CascadeState (depth + the self-re-entry guard) lives on the CALL STACK only — never in
// CombatState, never serialized (same principle as effective stats: derived/momentary values do
// not live in authoritative state). combat.ts creates a fresh CascadeState per top-level
// action/hook point; depth resets to 0 there.

import { calculateDamage } from './damage'
import { getEffectiveStat, getOffensiveStat } from './effective-stats'
import { getCreature, findCreature, updateCreature } from './creature-lookup'
import { livingEnemiesOf } from './targeting'
import { resolveTargetSelector } from './target-selectors'
import {
  effectsForHook,
  effectiveMaxHp,
  gatherDealtMods,
  gatherTakenFactors,
  instantiateStatus,
} from './effects'
import { evaluateCondition } from './conditions'
import { createEffectInstanceId } from './effect-types'
import {
  MAX_TRIGGER_CASCADE_DEPTH,
  DEFEND_DEFENCE_MULTIPLIER,
  DEFEND_TAKEN_FACTOR,
} from './config'
import type { DamageResult } from './damage'
import type { CreatureId } from './ids'
import type { CombatEvent, CombatState, Creature, Stat } from './types'
import type {
  ActiveEffect,
  ConditionStatusEffect,
  DamageModifierEffect,
  EffectInstanceId,
  EffectResponse,
  Hook,
  ResponseTarget,
  StatusSpec,
} from './effect-types'

export interface CascadeState {
  depth: number
  readonly activeInstances: Set<EffectInstanceId>
}

export function newCascade(): CascadeState {
  return { depth: 0, activeInstances: new Set() }
}

interface HookContext {
  readonly self: CreatureId
  /** The other creature involved in the trigger (attacker for on-damage-taken, victim for
   * on-damage-dealt/on-kill, dead ally for on-ally-death, ...). */
  readonly source?: CreatureId
  /** The firing effect's current stack count, when it's a status (condition-status); absent
   * for a plain (unstacked) triggered trait. Scales flat deal-damage/heal magnitudes. */
  readonly stacks?: number
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
 * applies it. Shared by chosen actions (Attack/Cast, from combat.ts) and triggered deal-damage
 * responses — "attack"/"cast" in a trait mean the real actions, same formula.
 */
export function dealDamage(
  attackerId: CreatureId,
  targetId: CreatureId,
  offStatKind: 'attack' | 'cast',
  spellPower: number,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const attacker = getCreature(state, attackerId)
  const target = getCreature(state, targetId)
  const offStat = getOffensiveStat(attacker, offStatKind, spellPower)
  const { defence, takenFactors: defendFactors } = resolveDefenceAndTakenFactors(target)
  const damage = calculateDamage({
    offStat,
    defence,
    attackerAffinity: attacker.affinity,
    defenderAffinity: target.affinity,
    dealtMods: gatherDealtMods(attacker),
    takenFactors: [...defendFactors, ...gatherTakenFactors(target)],
  })
  return applyDamageAndEmit(
    attackerId,
    target,
    damage,
    damageSource,
    state,
    events,
    cascade,
  )
}

/**
 * Applies a computed damage result, emits DamageDealt, then fires the damage-path hooks in the
 * pinned order: on-damage-dealt (source, UNCONDITIONAL — even on a lethal hit) → on-damage-taken
 * (self, survived only) → if it died: CreatureDied → on-death → on-kill → on-ally-death /
 * on-enemy-death (observers). Death pre-empts the victim's on-damage-taken; hit-reactions resolve
 * before death-reactions.
 */
export function applyDamageAndEmit(
  sourceId: CreatureId,
  target: Creature,
  damage: DamageResult,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const newHp = Math.max(target.currentHp - damage.finalDamage, 0)
  const died = newHp === 0 && target.alive
  let working = updateCreature(state, target.id, { currentHp: newHp, alive: newHp > 0 })

  events.push({
    type: 'DamageDealt',
    sourceId,
    targetId: target.id,
    rawDamage: damage.rawDamage,
    finalDamage: damage.finalDamage,
    affinityMultiplier: damage.affinityMultiplier,
    wasChipOnly: damage.wasChipOnly,
    remainingHp: newHp,
    damageSource,
  })

  working = fireHook(
    'on-damage-dealt',
    [sourceId],
    target.id,
    working,
    events,
    cascade,
  ).state

  if (!died) {
    working = fireHook(
      'on-damage-taken',
      [target.id],
      sourceId,
      working,
      events,
      cascade,
    ).state
    return working
  }

  events.push({ type: 'CreatureDied', creatureId: target.id })
  working = fireHook('on-death', [target.id], sourceId, working, events, cascade).state
  working = fireHook('on-kill', [sourceId], target.id, working, events, cascade).state
  working = fireDeathObservers(target.id, working, events, cascade)
  return working
}

function fireDeathObservers(
  deadId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const dead = findCreature(state, deadId)
  if (!dead) return state
  const sameSide = dead.side === 'player' ? state.playerParty : state.enemyParty
  const otherSide = dead.side === 'player' ? state.enemyParty : state.playerParty
  const allies = sameSide.filter((c) => c.alive && c.id !== deadId).map((c) => c.id)
  const enemies = otherSide.filter((c) => c.alive).map((c) => c.id)

  let working = state
  for (const id of allies) {
    working = fireHook('on-ally-death', [id], deadId, working, events, cascade).state
  }
  for (const id of enemies) {
    working = fireHook('on-enemy-death', [id], deadId, working, events, cascade).state
  }
  return working
}

// ---- Hook firing ----

/**
 * Fires `hook` for each creature in `selfIds` (the caller supplies the order: a single creature,
 * or tie-break order for a global point). Alive-gated — only on-death fires on a dead creature.
 * Threads the cascade: an effect instance already unwinding on the stack is skipped (self-loop
 * guard), and MAX_TRIGGER_CASCADE_DEPTH bounds chain depth (emitting CascadeTruncated at the cap
 * and NOT executing the over-cap trigger). Returns whether any response suppressed the action
 * (only meaningful for on-turn-start / Stun).
 *
 * The alive-check is re-evaluated FRESH before every individual effect (not once per creature):
 * if a creature's own first on-round-end effect kills it (e.g. a lethal DoT tick), its OWN
 * remaining not-yet-reached effects in this same pass (that would otherwise affect someone else)
 * are skipped -- a creature killed mid-sweep fires only on-death, per GAME_DESIGN's round-end
 * interaction rule.
 */
export function fireHook(
  hook: Hook,
  selfIds: readonly CreatureId[],
  source: CreatureId | undefined,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): { state: CombatState; suppressed: boolean } {
  let working = state
  let suppressed = false
  const isDeathHook = hook === 'on-death'

  for (const selfId of selfIds) {
    const initial = findCreature(working, selfId)
    if (!initial) continue
    // Effects are looked up once per creature (the active-effects LIST itself doesn't change
    // mid-pass in v1 content); aliveness is re-checked fresh below, per effect.
    const candidates = effectsForHook(initial, hook)

    for (const effect of candidates) {
      const self = findCreature(working, selfId)
      if (!self) continue
      // Dead creatures fire only on-death; everything else requires a living self.
      if (isDeathHook ? self.alive : !self.alive) continue

      if (cascade.activeInstances.has(effect.instanceId)) continue // self-re-entry guard

      // Optional trigger condition (self-scoped, reusing the scripting Condition union). Evaluated
      // against the LIVE self -- `working` may have changed since `self` was snapshotted, so an
      // earlier same-hook effect's HP change is visible. A false condition means the trigger simply
      // isn't firing: it emits nothing and consumes none of the depth/truncation budget.
      // evaluateCondition is pure (never draws RNG), safe to call for every candidate effect.
      if (effect.condition && !evaluateCondition(effect.condition, self, working)) {
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

      // Present only on a status (condition-status); absent for a plain permanent trait.
      const stacks = effect.category === 'condition-status' ? effect.stacks : undefined

      cascade.activeInstances.add(effect.instanceId)
      cascade.depth += 1
      const result = executeResponse(
        effect.response,
        effect.sourceTraitId,
        { self: self.id, source, stacks },
        working,
        events,
        cascade,
      )
      cascade.depth -= 1
      cascade.activeInstances.delete(effect.instanceId)

      working = result.state
      if (result.suppressed) suppressed = true
    }
  }

  return { state: working, suppressed }
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
      return context.source ? [context.source] : []
    case 'all-enemies':
      return livingEnemiesOf(getCreature(state, context.self), state).map((c) => c.id)
    case 'selector': {
      const id = resolveTargetSelector(
        target.selector,
        getCreature(state, context.self),
        state,
      )
      return id ? [id] : []
    }
    default: {
      const exhaustive: never = target
      throw new Error(`Unhandled response target: ${String(exhaustive)}`)
    }
  }
}

export function executeResponse(
  response: EffectResponse,
  sourceTraitId: string,
  context: HookContext,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): { state: CombatState; suppressed: boolean } {
  switch (response.kind) {
    case 'deal-damage': {
      const stacks = context.stacks ?? 1
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue // never strike a corpse
        if (response.flatAmount !== undefined) {
          // Flat mode (DoT): own value from the source, bypassing the whole OffStat/Defence/
          // affinity/pools formula. Scales by the firing status's current stacks.
          working = applyFlatDamage(
            context.self,
            targetId,
            response.flatAmount * stacks,
            response.damageSource ?? 'dot',
            working,
            events,
            cascade,
          )
        } else {
          const offStat = response.offStat ?? 'attack'
          const spellPower = response.spellPower ?? 1.0
          working = dealDamage(
            context.self,
            targetId,
            offStat,
            spellPower,
            response.damageSource ?? offStat,
            working,
            events,
            cascade,
          )
        }
      }
      return { state: working, suppressed: false }
    }
    case 'heal': {
      const stacks = context.stacks ?? 1
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue
        working = applyHeal(
          context.self,
          targetId,
          response.amountPerStack * stacks,
          working,
          events,
        )
      }
      return { state: working, suppressed: false }
    }
    case 'apply-stat-modifier': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        working = applyStatModifier(
          context.self,
          targetId,
          response.stat,
          response.factor,
          sourceTraitId,
          working,
          events,
        )
      }
      return { state: working, suppressed: false }
    }
    case 'apply-status': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        working = applyStatus(
          context.self,
          targetId,
          response.status,
          working,
          events,
          cascade,
        )
      }
      return { state: working, suppressed: false }
    }
    case 'suppress-action':
      return { state, suppressed: true }
    default: {
      const exhaustive: never = response
      throw new Error(`Unhandled response kind: ${String(exhaustive)}`)
    }
  }
}

/** DoT: a flat, stack-scaled magnitude, independent of any stat, bypassing the whole formula
 * (Defence/affinity/pools). Still real damage application -- fires the same damage-path hooks
 * (on-damage-dealt/-taken/-death/-kill/-ally-death/-enemy-death) as any other damage source. */
function applyFlatDamage(
  sourceId: CreatureId,
  targetId: CreatureId,
  amount: number,
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const target = getCreature(state, targetId)
  const finalDamage = Math.max(1, Math.floor(amount))
  const damage: DamageResult = {
    rawDamage: amount,
    finalDamage,
    affinityMultiplier: 1,
    wasChipOnly: false,
  }
  return applyDamageAndEmit(
    sourceId,
    target,
    damage,
    damageSource,
    state,
    events,
    cascade,
  )
}

/** Regen: a flat, stack-scaled heal, clamped to effective max Health -- no auto-heal past it. */
function applyHeal(
  sourceId: CreatureId,
  targetId: CreatureId,
  amount: number,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  const target = getCreature(state, targetId)
  const maxHp = effectiveMaxHp(target)
  const newHp = Math.min(maxHp, target.currentHp + Math.max(0, Math.floor(amount)))
  const working = updateCreature(state, targetId, { currentHp: newHp })
  events.push({
    type: 'HealApplied',
    sourceId,
    targetId,
    amount: newHp - target.currentHp,
    remainingHp: newHp,
  })
  return working
}

/**
 * Applies (or re-applies) a status. Single instance per (statusId, creature): a fresh
 * application creates a new instance at the status's declared duration/stacks; re-applying
 * REFRESHES duration to the new application's value and increments stacks up to the status
 * definition's declared cap. Emits StatusApplied, then fires on-status-applied (event-before-hook).
 */
export function applyStatus(
  sourceId: CreatureId,
  targetId: CreatureId,
  spec: StatusSpec,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
): CombatState {
  const def = state.statuses.get(spec.statusId)
  if (!def) {
    throw new Error(`resolver invariant violated: unknown statusId ${spec.statusId}`)
  }

  const target = getCreature(state, targetId)
  const existing = target.activeEffects.find(
    (e): e is ConditionStatusEffect | DamageModifierEffect =>
      (e.category === 'condition-status' || e.category === 'damage-modifier') &&
      e.statusId === spec.statusId,
  )

  const addedStacks = spec.stacks ?? 1
  const newStacks = Math.min(def.cap, (existing?.stacks ?? 0) + addedStacks)

  const nextEffects: ActiveEffect[] = existing
    ? target.activeEffects.map((e) =>
        e.instanceId === existing.instanceId
          ? { ...e, remainingDuration: spec.duration, stacks: newStacks }
          : e,
      )
    : [
        ...target.activeEffects,
        instantiateStatus(
          def,
          createEffectInstanceId(`${targetId}#status#${spec.statusId}`),
          spec.duration,
          newStacks,
        ),
      ]

  let working = updateCreature(state, targetId, { activeEffects: nextEffects })

  events.push({
    type: 'StatusApplied',
    targetId,
    statusId: spec.statusId,
    stacks: newStacks,
    duration: spec.duration,
    sourceId,
  })

  working = fireHook(
    'on-status-applied',
    [targetId],
    sourceId,
    working,
    events,
    cascade,
  ).state
  return working
}

function applyStatModifier(
  sourceId: CreatureId,
  targetId: CreatureId,
  stat: Stat,
  factor: number,
  sourceTraitId: string,
  state: CombatState,
  events: CombatEvent[],
): CombatState {
  const target = getCreature(state, targetId)
  const effectiveBefore = getEffectiveStat(target, stat)
  // Fold a per-target application ordinal into the id so re-stacking the SAME modifier (e.g. Grudge
  // firing on each ally death) yields distinct, deterministic (never-RNG) EffectInstanceIds --
  // effect identity is meant to be unique, and Slice C's statuses lean on it.
  const idPrefix = `${targetId}#applied#${sourceTraitId}#${stat}#`
  const ordinal = target.activeEffects.filter((e) =>
    e.instanceId.startsWith(idPrefix),
  ).length
  const modifier: ActiveEffect = {
    category: 'stat-modifier',
    stat,
    factor,
    instanceId: createEffectInstanceId(`${idPrefix}${ordinal}`),
    sourceTraitId,
  }
  let working = updateCreature(state, targetId, {
    activeEffects: [...target.activeEffects, modifier],
  })
  const updated = getCreature(working, targetId)
  const effectiveAfter = getEffectiveStat(updated, stat)
  events.push({
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
      events.push({
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
