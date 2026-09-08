import { activeFriendlyFireStatus, hasProvokeImmunity } from './effects'
import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'

/**
 * First living enemy by slot index, ascending. Deterministic, no RNG. Phase 1's only
 * targeting rule (no scripting/selectors yet); still the implicit fallback's rule in Phase 2.
 *
 * Returns null if the enemy side has no living creatures. That's structurally unreachable
 * when called from resolveTurn (win/loss is checked after every action, so a turn never
 * starts against an already-empty enemy side) — but this function stays honest about its
 * own contract rather than throwing.
 */
export function getDefaultTarget(enemyParty: readonly Creature[]): CreatureId | null {
  const target = enemyParty.find((c) => c.alive)
  return target ? target.id : null
}

/** The enemy side relative to `creature`, alive-filtered. */
export function livingEnemiesOf(
  creature: Creature,
  state: CombatState,
): readonly Creature[] {
  const party = creature.side === 'player' ? state.enemyParty : state.playerParty
  return party.filter((c) => c.alive)
}

/** The ally side relative to `creature`, alive-filtered. Always includes `creature` itself. */
export function livingAlliesOf(
  creature: Creature,
  state: CombatState,
): readonly Creature[] {
  const party = creature.side === 'player' ? state.playerParty : state.enemyParty
  return party.filter((c) => c.alive)
}

/** Alive members of `party` currently marked as provoking. */
export function getProvokingMembers(party: readonly Creature[]): readonly Creature[] {
  return party.filter((c) => c.alive && c.provoking)
}

/**
 * Phase 4 Slice C: the targeting-override pipeline for a single-target offensive action, in
 * pinned order: (1) Tunnel Vision -- if the actor is provoke-immune, skip straight to normal
 * resolution, ignoring enemy Provoke entirely. (2) Confusion -- ASSUMPTION 12: checked BEFORE
 * Provoke, so a confused actor's 50% friendly-fire roll can redirect the action at its own
 * side regardless of whether the enemy side has a provoker; only when the roll doesn't
 * trigger (or the actor isn't confused) does Provoke get a chance to apply. (3) Provoke --
 * the pre-Slice-C mechanism, unchanged: if the opposing side has >=1 provoking member, draws
 * one seeded-RNG index among them and returns that provoker, `resolveNormally` NEVER CALLED
 * in that case (a selector's own RNG draw, e.g. random-enemy, never happens when it would
 * just be discarded); only when no provoker exists does the normal selector/default-target
 * resolution run.
 *
 * RNG draws are no longer capped at exactly one (Confusion may draw up to two of its own,
 * always BEFORE any Provoke draw), but each step still draws at most what its own mechanism
 * requires, and a step that isn't active for this actor draws nothing.
 *
 * Never called for AOE Cast, Defend, Provoke, or Wait -- Provoke only narrows single-target
 * selection (AOE's own Confusion handling lives in shouldRedirectAoeToAllies below).
 */
export function resolveOffensiveTarget(
  actor: Creature,
  state: CombatState,
  resolveNormally: () => CreatureId | null,
): CreatureId | null {
  if (hasProvokeImmunity(actor)) return resolveNormally()

  const confusion = resolveConfusionRedirect(actor, state)
  if (confusion.redirected) return confusion.targetId

  return resolveProvoke(actor, state, resolveNormally)
}

function resolveProvoke(
  actor: Creature,
  state: CombatState,
  resolveNormally: () => CreatureId | null,
): CreatureId | null {
  const opposingParty = actor.side === 'player' ? state.enemyParty : state.playerParty
  const provokers = getProvokingMembers(opposingParty)
  if (provokers.length > 0) {
    const index = Math.floor(state.rng.next() * provokers.length)
    return provokers[index]?.id ?? null
  }
  return resolveNormally()
}

type ConfusionOutcome =
  | { readonly redirected: false }
  | { readonly redirected: true; readonly targetId: CreatureId | null }

/**
 * Phase 4 Slice C (Confusion): if `actor` carries no active, non-immune friendly-fire status,
 * returns `{redirected: false}` WITHOUT touching state.rng at all (an unconfused or Lucidity-
 * immune actor's harmful action never rolls). Otherwise draws exactly one RNG value for the
 * chancePercent roll (always drawn for a confused, non-immune actor's harmful action -- win
 * or lose, per species-locked.md's "Confusion consumes combat RNG"); on success, draws a
 * second RNG value to pick which living ally is hit instead, returning that (or null in the
 * defensively-unreachable case of zero living allies -- livingAlliesOf always includes the
 * acting creature itself while alive).
 */
function resolveConfusionRedirect(actor: Creature, state: CombatState): ConfusionOutcome {
  const status = activeFriendlyFireStatus(actor)
  if (!status) return { redirected: false }

  const roll = state.rng.next()
  if (roll >= status.chancePercent / 100) return { redirected: false }

  const allies = livingAlliesOf(actor, state)
  if (allies.length === 0) return { redirected: true, targetId: null }
  const index = Math.floor(state.rng.next() * allies.length)
  return { redirected: true, targetId: allies[index]?.id ?? null }
}

/**
 * Phase 4 Slice C (Confusion, AOE case -- ASSUMPTION 13): the roll is per-ACTION, not
 * per-target -- one roll decides whether the whole AOE cast retargets to the caster's own
 * living side (frozen the same way enemy-AOE targeting freezes) instead of proceeding
 * normally, never a per-target coin flip. A separate entry point from
 * resolveConfusionRedirect since AOE never goes through resolveOffensiveTarget (Provoke is
 * likewise exempt for AOE, for the same "no single target to narrow" reason). Same
 * draws-nothing-when-not-confused contract.
 */
export function shouldRedirectAoeToAllies(actor: Creature, state: CombatState): boolean {
  const status = activeFriendlyFireStatus(actor)
  if (!status) return false
  return state.rng.next() < status.chancePercent / 100
}

/**
 * Phase 4 Slice C (Splashing): the living neighbors of `target` within `party`, taken from
 * the alive-filtered, slot-ordered list (ASSUMPTION 14 -- living-adjacency, not raw
 * slot-index adjacency: a dead slot-neighbor would make Splashing whiff for no
 * player-visible reason, and living-adjacency degrades gracefully as a side thins out).
 * Returns up to two neighbors (one at each edge of the living list); empty when `target`
 * isn't alive-and-present in `party` or has no living neighbor.
 */
export function adjacentLivingTargets(
  target: Creature,
  party: readonly Creature[],
): Creature[] {
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
