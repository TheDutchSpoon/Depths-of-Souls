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
import { livingAlliesOf, livingEnemiesOf } from './targeting'
import { resolveTargetSelector } from './target-selectors'
import {
  effectsForHook,
  effectiveMaxHp,
  gatherArmorPenetration,
  gatherCheatDeathChance,
  gatherCrossStatContribution,
  gatherDealtMods,
  gatherTakenFactors,
  instantiateCreatureEffects,
  instantiateStatus,
  resolveMagnitudeCount,
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
  ConditionalDamageBonusEffect,
  ConditionStatusEffect,
  DamageModifierEffect,
  EffectInstanceId,
  EffectResponse,
  FriendlyFireStatusEffect,
  Hook,
  ResponseTarget,
  StatusSpec,
  TurnOrderStatusEffect,
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
  /** The firing effect's statusId, when it's a status (condition-status); absent for a plain
   * triggered trait. Threaded onto DamageDealt so a DoT tick's causing status is attributable. */
  readonly statusId?: string
  /** Phase 4 Slice D: populated ONLY by a consume-stacks response's own wrapped-effect call
   * (the just-read, about-to-be-cleared stack count) -- absent everywhere else. A
   * `magnitudeSource: { kind: 'consumed-stacks' }` read outside this context is a resolver
   * invariant violation (resolveMagnitudeCount throws). */
  readonly consumedStacks?: number
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
    state,
    events,
    cascade,
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
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
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
    state,
    events,
    cascade,
    statusId,
  )
}

/**
 * Shared damage-formula core, ALSO exported directly for Spell.scalingStat (combat.ts): gathers
 * the attacker's armor-penetration + cross-stat (for `actionKind`) passives, runs
 * calculateDamage, applies + emits. `actionKind` also selects cross-stat's appliesTo bucket.
 * `offStat` is the caller's fully-resolved value (remap-aware for the default Cast path,
 * direct-stat for scalingStat, or 0 for a 'none'/flat-utility spell).
 */
export function dealDamageWithOffStat(
  attackerId: CreatureId,
  targetId: CreatureId,
  offStat: number,
  actionKind: 'attack' | 'cast',
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
  statusId?: string,
): CombatState {
  return dealDamageCore(
    attackerId,
    targetId,
    offStat,
    actionKind,
    damageSource,
    state,
    events,
    cascade,
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
  return attacker.activeEffects
    .filter(
      (e): e is ConditionalDamageBonusEffect => e.category === 'conditional-damage-bonus',
    )
    .filter((e) => {
      const applies = e.actionKind ?? 'both'
      return applies === actionKind || applies === 'both'
    })
    .filter((e) => evaluateCondition(e.condition, attacker, state, undefined, target.id))
    .map((e) => e.percent)
}

function dealDamageCore(
  attackerId: CreatureId,
  targetId: CreatureId,
  offStat: number,
  actionKind: 'attack' | 'cast',
  damageSource: 'attack' | 'cast' | 'dot',
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
  statusId?: string,
): CombatState {
  const attacker = getCreature(state, attackerId)
  const target = getCreature(state, targetId)
  const { defence, takenFactors: defendFactors } = resolveDefenceAndTakenFactors(target)
  const damage = calculateDamage({
    offStat,
    defence,
    armorPenetrationPercent: gatherArmorPenetration(attacker),
    crossStatBonus: gatherCrossStatContribution(attacker, actionKind),
    attackerAffinity: attacker.affinity,
    defenderAffinity: target.affinity,
    dealtMods: [
      ...gatherDealtMods(attacker, state),
      ...gatherConditionalDamageBonus(attacker, target, actionKind, state),
    ],
    takenFactors: [...defendFactors, ...gatherTakenFactors(target, state)],
  })
  return applyDamageAndEmit(
    attackerId,
    target,
    damage,
    damageSource,
    state,
    events,
    cascade,
    statusId,
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
    if (chancePercent > 0 && state.rng.next() < chancePercent / 100) {
      newHp = 1
      died = false
    }
  }

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
    statusId,
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
/** Phase 4 Slice H2 (PR #60 review, E2): combat.ts's injected escape hatch for `echoCast`-flagged
 * effects -- see `TriggeredDef.echoCast`'s own doc comment for why `executeResponse` can't reach
 * this itself. `observerId` is the effect's bearer (the Overtone-holder that granted the echo);
 * `casterId` is the hook's own `source` (the OBSERVED actor, who actually casts). The callback
 * threads the ambient `CascadeState` through (E2.2 -- never a fresh one, so depth keeps
 * accumulating across chained echoes). */
export type EchoCastExecutor = (
  observerId: CreatureId,
  casterId: CreatureId,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
) => CombatState

export function fireHook(
  hook: Hook,
  selfIds: readonly CreatureId[],
  source: CreatureId | undefined,
  state: CombatState,
  events: CombatEvent[],
  cascade: CascadeState,
  // Phase 4 Slice E2 (general action-observation system): supplied ONLY by the four action
  // executors' own 'on-action-observed' call (combat.ts), alongside their existing actor-self
  // hook call -- every other call site omits it. Consulted below to filter ObservationFilter-
  // carrying candidates; meaningless (and unread) for any other hook.
  observed?: {
    readonly actionKind: 'attack' | 'cast' | 'defend' | 'provoke'
    readonly instanceIndex: number
  },
  // Phase 4 Slice H2 (PR #60 review, E2): supplied ONLY by combat.ts's two `on-action-observed`
  // dispatch sites, alongside `observed` above -- every other call site omits it, so an
  // `echoCast`-flagged effect is inert (never fires) anywhere else.
  onEchoCast?: EchoCastExecutor,
): { state: CombatState; suppressed: boolean } {
  let working = state
  let suppressed = false
  const isDeathHook = hook === 'on-death'
  // Phase 4 Slice H2 (PR #60 review, E2.1): sourceTraitIds that have already claimed their one
  // `stacks: false` slot THIS fireHook call -- claimed the moment an effect is about to roll
  // chancePercent (see below), regardless of whether that roll succeeds, so the AGGREGATE chance
  // of firing stays exactly chancePercent no matter how many creatures carry the same effect.
  const claimedNonStacking = new Set<string>()

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

      // Phase 4 Slice E2: on-action-observed's own filter -- relationship (observer vs actor)/
      // actionKind/excludeActor. Absent fields match everything (permissive default). Checked
      // BEFORE the generic `condition` (a cheaper, more fundamental "is this candidate even
      // relevant" gate); a non-matching observer draws nothing and consumes no depth budget,
      // same silent-skip discipline as a false condition.
      if (effect.observationFilter && observed) {
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
        !evaluateCondition(effect.condition, self, working, undefined, source)
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
      // came from a TriggeredDef or a status's own StatusTrigger. Rolled AFTER the depth-cap
      // check (a depth-capped effect isn't firing, so it must draw zero RNG -- cheat-death's
      // "only when it actually fires" discipline), ONLY when chancePercent is present -- a plain
      // trigger never touches state.rng here. A failed roll skips silently, exactly like a false
      // condition (no TriggerFired, no depth/truncation accounting).
      if (
        effect.chancePercent !== undefined &&
        !(working.rng.next() < effect.chancePercent / 100)
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

      // Present only when the resolved trigger came from a status (condition-status); absent for
      // a plain permanent trait.
      const stacks = effect.stacks
      const statusId = effect.statusId

      // Phase 4 Slice H2 (PR #60 review, E2/E2.3): echoCast bypasses executeResponse entirely
      // (its `response` field is a structurally-required, functionally-inert placeholder -- see
      // TriggeredDef.echoCast's own doc comment) and is deliberately EXEMPTED from the
      // self-re-entry guard below (no `activeInstances.add`/`delete`) so a later chain hop can
      // revisit the SAME Overtone instance -- only `cascade.depth`/MAX_TRIGGER_CASCADE_DEPTH
      // bounds it, never self-re-entry.
      if (effect.echoCast) {
        if (onEchoCast && source) {
          cascade.depth += 1
          working = onEchoCast(self.id, source, working, events, cascade)
          cascade.depth -= 1
        }
        continue
      }

      cascade.activeInstances.add(effect.instanceId)
      cascade.depth += 1
      const result = executeResponse(
        effect.response,
        effect.sourceTraitId,
        { self: self.id, source, stacks, statusId },
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
    case 'all-allies':
      return livingAlliesOf(getCreature(state, context.self), state).map((c) => c.id)
    case 'all-allies-of-species': {
      const self = getCreature(state, context.self)
      return livingAlliesOf(self, state)
        .filter((c) => c.speciesId !== undefined && c.speciesId === self.speciesId)
        .map((c) => c.id)
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
      const deadAllies = party.filter((c) => !c.alive)
      if (deadAllies.length === 0) return []
      const index = Math.floor(state.rng.next() * deadAllies.length)
      const chosen = deadAllies[index]
      return chosen ? [chosen.id] : []
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
      const stacks = context.stacks ?? 1
      const bearer = getCreature(state, context.self)
      // Phase 4 Slice D: magnitudeSource, when present, REPLACES the repetition count this
      // response's magnitude is scaled by -- `stacks` in flat mode, or the implicit `×1` in
      // formula mode -- with a live resolveMagnitudeCount(...) reading (see MagnitudeSource's
      // own doc comment). Resolved ONCE up front (bearer/state don't change per target); the
      // single `count` feeds whichever mode below actually reads it (only one does per call).
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(
            bearer,
            state,
            response.magnitudeSource,
            context.consumedStacks,
          )
        : undefined
      // Absent -> exact pre-Slice-D values (byte-identical: `stacks`, or `1` -- a no-op
      // multiplier on spellPower).
      const flatCount = count ?? stacks
      const formulaMultiplier = count ?? 1
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue // never strike a corpse
        if (response.flatAmount !== undefined) {
          // Flat mode (DoT): own value from the source, bypassing the whole OffStat/Defence/
          // affinity/pools formula. Scales by the firing status's current stacks (or, with
          // magnitudeSource, the live count that replaces them).
          working = applyFlatDamage(
            context.self,
            targetId,
            response.flatAmount * flatCount,
            response.damageSource ?? 'dot',
            working,
            events,
            cascade,
            context.statusId,
          )
        } else if (response.scalingStat !== undefined) {
          const spellPower = (response.spellPower ?? 1.0) * formulaMultiplier
          working = dealDamageWithScalingStat(
            context.self,
            targetId,
            response.scalingStat,
            spellPower,
            response.damageSource ?? 'attack',
            working,
            events,
            cascade,
            context.statusId,
          )
        } else {
          const offStat = response.offStat ?? 'attack'
          const spellPower = (response.spellPower ?? 1.0) * formulaMultiplier
          working = dealDamage(
            context.self,
            targetId,
            offStat,
            spellPower,
            response.damageSource ?? offStat,
            working,
            events,
            cascade,
            context.statusId,
          )
        }
      }
      return { state: working, suppressed: false }
    }
    case 'heal': {
      // Phase 4 Slice E2 (Treants Elder / Necromoss): mirrors deal-damage's own mode-selection
      // exactly (ASSUMPTION 6-style exclusivity, magnitudeSource-as-repetition-count). Flat mode
      // (Regen, the pre-Slice-E2 default) scales `amountPerStack` by `stacks` (or the live count,
      // if magnitudeSource replaces it); `scalingStat` mode reads the HEALER's (firing
      // creature's) own effective stat × spellPower × the same live count -- never the target's.
      if (response.amountPerStack !== undefined && response.scalingStat !== undefined) {
        throw new Error(
          'resolver invariant violated: heal response set more than one of amountPerStack/scalingStat',
        )
      }
      const stacks = context.stacks ?? 1
      const bearer = getCreature(state, context.self)
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(
            bearer,
            state,
            response.magnitudeSource,
            context.consumedStacks,
          )
        : undefined
      // Absent -> exact pre-Slice-E2 values (byte-identical: `stacks`, or `1` -- a no-op
      // multiplier on spellPower), same composition as deal-damage's own magnitudeSource.
      const flatCount = count ?? stacks
      const formulaMultiplier = count ?? 1

      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const t = findCreature(working, targetId)
        if (!t || !t.alive) continue
        const amount =
          response.scalingStat !== undefined
            ? getEffectiveStat(bearer, response.scalingStat) *
              (response.spellPower ?? 1.0) *
              formulaMultiplier
            : (response.amountPerStack ?? 0) * flatCount
        working = applyHeal(context.self, targetId, amount, working, events)
      }
      return { state: working, suppressed: false }
    }
    case 'apply-stat-modifier': {
      // Phase 4 Slice E2 (Swarmhive Striker / Necromoss): FREEZE-AT-APPLICATION -- resolved
      // ONCE here (relative to the FIRING creature, context.self -- the bearer whose own
      // side/species/etc. the count reads), before the per-target loop; the resulting
      // finalFactor is a plain number baked into every target's new StatModifierEffect, never
      // recomputed later (contrast Bulwark's damage-modifier, which DOES live-recompute).
      const bearer = getCreature(state, context.self)
      const count = response.magnitudeSource
        ? resolveMagnitudeCount(
            bearer,
            state,
            response.magnitudeSource,
            context.consumedStacks,
          )
        : undefined
      const finalFactor =
        count === undefined ? response.factor : 1 + (response.factor - 1) * count

      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        working = applyStatModifier(
          context.self,
          targetId,
          response.stat,
          finalFactor,
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
      // Undeclared/'all' scope preserves the exact pre-Slice-B behavior (Stun: the whole turn
      // is skipped via resolveTurn's suppressed flag). A scoped suppression ('attack'/'cast')
      // does NOT set this flag -- it's read passively by the interpreter instead (see
      // interpreter.ts's isActionSuppressed), so the rest of the turn stays choosable.
      return { state, suppressed: (response.scope ?? 'all') === 'all' }
    case 'revive': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const target = findCreature(working, targetId)
        if (!target || target.alive) continue // target must be dead
        // Death-reset: a fresh instantiation of innateTraitIds + (for a player-side target) its
        // perks (no ramp preserved) -- ASSUMPTION 21: perks are as battle-start-permanent as
        // innate traits, so a revived player creature keeps them, unlike in-fight-ACCUMULATED
        // buffs/statuses. Then currentHp = round(baselineMaxHp * pct) computed from THAT fresh
        // baseline.
        const reset: Creature = {
          ...target,
          activeEffects: instantiateCreatureEffects(
            target,
            state.traits,
            state.playerWideEffects,
          ),
        }
        const baselineMaxHp = effectiveMaxHp(reset)
        const currentHp = Math.round(baselineMaxHp * response.pct)
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
        })
        events.push({
          type: 'Revived',
          sourceId: context.self,
          targetId,
          currentHp,
        })
      }
      return { state: working, suppressed: false }
    }
    case 'grant-action-state': {
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        working = updateCreature(working, targetId, {
          ...(response.defending ? { defending: true } : {}),
          ...(response.provoking ? { provoking: true } : {}),
        })
      }
      return { state: working, suppressed: false }
    }
    case 'consume-stacks': {
      // Phase 4 Slice D (Glowflies' Detonator). SELF-scoped: reads and clears the FIRING
      // creature's own statusId stacks (context.self), not a targeted creature's -- consume-
      // stacks has no `target` field, matching the self-scoped trigger-condition convention.
      const self = getCreature(state, context.self)
      const existing = self.activeEffects.find(
        (
          e,
        ): e is
          | ConditionStatusEffect
          | DamageModifierEffect
          | TurnOrderStatusEffect
          | FriendlyFireStatusEffect =>
          (e.category === 'condition-status' ||
            e.category === 'damage-modifier' ||
            e.category === 'turn-order-status' ||
            e.category === 'friendly-fire-status') &&
          e.statusId === response.statusId,
      )
      // 0/absent stacks is a full no-op (CONVENTIONS: "no status present" and "0 stacks" are the
      // same state) -- the wrapped `effect` never fires, mirroring `deal-damage`'s "never strike
      // a corpse" skip rather than firing it with a magnitude of 0.
      if (!existing) return { state, suppressed: false }

      const consumedStacks = existing.stacks
      const working = updateCreature(state, context.self, {
        activeEffects: self.activeEffects.filter(
          (e) => e.instanceId !== existing.instanceId,
        ),
      })
      // ASSUMPTION 18: StatusExpired, not a mere decrement -- the status is genuinely gone.
      events.push({
        type: 'StatusExpired',
        creatureId: context.self,
        statusId: response.statusId,
      })

      // The wrapped effect is executed DIRECTLY (not via fireHook) -- it's a continuation of the
      // SAME trigger firing, not a new hook point: no separate TriggerFired, no additional
      // cascade-depth increment/self-re-entry-guard bookkeeping (the outer consume-stacks
      // trigger's own instance already holds that). Consumes/clears state, so it cannot re-fire
      // itself even if the wrapped effect somehow re-triggered this same hook.
      return executeResponse(
        response.effect,
        sourceTraitId,
        { ...context, consumedStacks },
        working,
        events,
        cascade,
      )
    }
    case 'remove-status': {
      // Phase 4 Slice E2 (Sleep's on-damage-taken wake-up; future cleanse/dispel). Unlike
      // consume-stacks, this has a real `target` field -- reuses the full ResponseTarget
      // vocabulary, so "cleanse lowest-hp-ally" / "dispel all-enemies" get targeting for free.
      // A no-op, no-event when the target doesn't carry the statusId (mirrors revive's
      // "target must be dead" / consume-stacks' "0 stacks" skip style) -- reuses the exact
      // StatusExpired clear path so death-reset and the round-end sweep stay consistent.
      let working = state
      for (const targetId of resolveResponseTargets(response.target, context, state)) {
        const target = findCreature(working, targetId)
        if (!target) continue
        const existing = target.activeEffects.find(
          (
            e,
          ): e is
            | ConditionStatusEffect
            | DamageModifierEffect
            | TurnOrderStatusEffect
            | FriendlyFireStatusEffect =>
            (e.category === 'condition-status' ||
              e.category === 'damage-modifier' ||
              e.category === 'turn-order-status' ||
              e.category === 'friendly-fire-status') &&
            e.statusId === response.filter.statusId,
        )
        if (!existing) continue
        working = updateCreature(working, targetId, {
          activeEffects: target.activeEffects.filter(
            (e) => e.instanceId !== existing.instanceId,
          ),
        })
        events.push({
          type: 'StatusExpired',
          creatureId: targetId,
          statusId: response.filter.statusId,
        })
      }
      return { state: working, suppressed: false }
    }
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
  statusId?: string,
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
    statusId,
  )
}

/** Regen: a flat, stack-scaled heal, clamped to effective max Health -- no auto-heal past it.
 * Exported as of Phase 4 Slice E: a heal-payload Cast (combat.ts) calls this directly, the same
 * "not through a trigger" precedent already applied to apply-stat-modifier below. */
export function applyHeal(
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
 *
 * Phase 4 Slice F (review amendment): `spec.duration ?? def.defaultDuration` -- an omitted
 * duration inherits the status's own declared default; an explicit one overrides it. Every
 * pre-amendment `StatusSpec` in real content/goldens already sets `duration` explicitly, so this
 * is byte-identical there (`spec.duration` always wins when present).
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
  const duration = spec.duration ?? def.defaultDuration

  const target = getCreature(state, targetId)
  const existing = target.activeEffects.find(
    (
      e,
    ): e is
      | ConditionStatusEffect
      | DamageModifierEffect
      | TurnOrderStatusEffect
      | FriendlyFireStatusEffect =>
      (e.category === 'condition-status' ||
        e.category === 'damage-modifier' ||
        // Phase 4 Slice C: re-applying a turn-order-status/friendly-fire-status refreshes
        // duration and stacks exactly like any other status -- both are still status
        // instances, just read passively instead of hook-fired.
        e.category === 'turn-order-status' ||
        e.category === 'friendly-fire-status') &&
      e.statusId === spec.statusId,
  )

  const addedStacks = spec.stacks ?? 1
  const newStacks = Math.min(def.cap, (existing?.stacks ?? 0) + addedStacks)

  const nextEffects: ActiveEffect[] = existing
    ? target.activeEffects.map((e) =>
        e.instanceId === existing.instanceId
          ? // Phase 4 Slice H2 (PR #60 review): spread `existing` (already narrowed to the four
            // status variants by the `.find()` above), not the loop's own `e: ActiveEffect` --
            // now that `TriggeredEffect` also carries an UNRELATED `stacks?: boolean` field
            // (E2.1's dedup flag), spreading the raw union member no longer type-checks cleanly
            // against `ActiveEffect` (a real conflict TS now catches, not a spurious one: `e`
            // could type-widen to `TriggeredEffect`, whose `stacks` is a boolean, not this
            // status's numeric stack count). `existing` carries the exact same runtime value at
            // this index (that's how it was found) with a type that's actually correct.
            { ...existing, remainingDuration: duration, stacks: newStacks }
          : e,
      )
    : [
        ...target.activeEffects,
        instantiateStatus(
          def,
          createEffectInstanceId(`${targetId}#status#${spec.statusId}`),
          duration,
          newStacks,
        ),
      ]

  let working = updateCreature(state, targetId, { activeEffects: nextEffects })

  events.push({
    type: 'StatusApplied',
    targetId,
    statusId: spec.statusId,
    stacks: newStacks,
    duration,
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

/** Exported as of Phase 4 Slice E: a stat-modifier-payload Cast (combat.ts) calls this directly
 * (sourceTraitId = the spell's own id, for effect-instance-id/debugging legibility) -- the same
 * "reuse the response's execution path, not through a trigger" precedent as heal above. */
export function applyStatModifier(
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
