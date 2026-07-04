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
import { effectsForHook, effectiveMaxHp } from './effects'
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
  EffectInstanceId,
  EffectResponse,
  Hook,
  ResponseTarget,
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
  const { defence, takenFactors } = resolveDefenceAndTakenFactors(target)
  const damage = calculateDamage({
    offStat,
    defence,
    attackerAffinity: attacker.affinity,
    defenderAffinity: target.affinity,
    dealtMods: [],
    takenFactors,
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
    const self = findCreature(working, selfId)
    if (!self) continue
    // Dead creatures fire only on-death; everything else requires a living self.
    if (isDeathHook ? self.alive : !self.alive) continue

    for (const effect of effectsForHook(self, hook)) {
      if (cascade.activeInstances.has(effect.instanceId)) continue // self-re-entry guard

      if (cascade.depth + 1 > MAX_TRIGGER_CASCADE_DEPTH) {
        events.push({
          type: 'CascadeTruncated',
          creatureId: self.id,
          effectId: effect.sourceTraitId,
          depth: cascade.depth + 1,
        })
        continue
      }

      // A DoT tick (deal-damage, emitTriggerFired: false) announces itself via its own
      // StatusApplied, not a per-tick TriggerFired (Slice C); every other trigger emits one.
      const emitTriggerFired = !(
        effect.response.kind === 'deal-damage' &&
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

      cascade.activeInstances.add(effect.instanceId)
      cascade.depth += 1
      const result = executeResponse(
        effect.response,
        effect.sourceTraitId,
        { self: self.id, source },
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
      const damageSource = response.damageSource ?? response.offStat
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue // never strike a corpse
        working = dealDamage(
          context.self,
          targetId,
          response.offStat,
          response.spellPower,
          damageSource,
          working,
          events,
          cascade,
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
    case 'apply-status':
      // Statuses land in Slice C; no Slice-B content routes here.
      throw new Error('apply-status response is implemented in Slice C')
    case 'suppress-action':
      return { state, suppressed: true }
    default: {
      const exhaustive: never = response
      throw new Error(`Unhandled response kind: ${String(exhaustive)}`)
    }
  }
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
  const modifier: ActiveEffect = {
    category: 'stat-modifier',
    stat,
    factor,
    instanceId: createEffectInstanceId(`${targetId}#applied#${sourceTraitId}#${stat}`),
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
