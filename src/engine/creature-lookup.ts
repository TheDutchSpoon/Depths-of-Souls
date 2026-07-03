import type { CombatState, Creature } from './types'
import type { CreatureId } from './ids'

/** Linear search across both party arrays. Shared by combat.ts and targeting.ts. */
export function findCreature(state: CombatState, id: CreatureId): Creature | undefined {
  return [...state.playerParty, ...state.enemyParty].find((c) => c.id === id)
}
