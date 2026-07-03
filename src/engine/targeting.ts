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
 * Resolves a single-target offensive action's target, honoring Provoke. If the opposing
 * side has >=1 provoking member, draws one seeded-RNG index among them and returns that
 * provoker -- `resolveNormally` is NEVER CALLED in that case, so a selector's own RNG
 * draw (e.g. random-enemy) never happens when it would just be discarded. Only when no
 * provoker exists does the normal selector/default-target resolution run (and only then
 * can it consume RNG). Exactly one RNG draw for a single-target offensive action, ever.
 *
 * Never called for AOE Cast, Defend, Provoke, or Wait -- Provoke only narrows
 * single-target selection.
 */
export function resolveOffensiveTarget(
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
