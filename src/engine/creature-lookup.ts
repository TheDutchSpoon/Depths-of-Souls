import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'

/** Linear search across both party arrays. Shared by combat.ts, resolution.ts, and targeting.ts. */
export function findCreature(state: CombatState, id: CreatureId): Creature | undefined {
  return [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
}

/** Like findCreature but throws on an unknown id (a resolver-invariant violation, not a normal case). */
export function getCreature(state: CombatState, id: CreatureId): Creature {
  const creature = findCreature(state, id)
  if (!creature) throw new Error(`resolver invariant violated: unknown creature id ${id}`)
  return creature
}

/** Returns a new state with the matching creature patched (both party arrays rebuilt). */
export function updateCreature(
  state: CombatState,
  id: CreatureId,
  patch: Partial<
    Pick<Creature, 'currentHp' | 'alive' | 'defending' | 'provoking' | 'activeEffects'>
  >,
): CombatState {
  const updateSide = (party: readonly Creature[]) =>
    party.map((c) => (c.id === id ? { ...c, ...patch } : c))
  return {
    ...state,
    playerParty: updateSide(state.playerParty),
    enemyParty: updateSide(state.enemyParty),
  }
}
