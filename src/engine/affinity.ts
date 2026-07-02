import type { Affinity } from './types'
import {
  AFFINITY_ADVANTAGE_MULTIPLIER,
  AFFINITY_DISADVANTAGE_MULTIPLIER,
  AFFINITY_NEUTRAL_MULTIPLIER,
} from './config'

/** Cycle order: each affinity beats the next, wrapping (Body > Spirit > Mind > Void > Primal > Body). */
const AFFINITY_CYCLE: readonly Affinity[] = ['body', 'spirit', 'mind', 'void', 'primal']

function beats(attacker: Affinity, defender: Affinity): boolean {
  const attackerIndex = AFFINITY_CYCLE.indexOf(attacker)
  const nextIndex = (attackerIndex + 1) % AFFINITY_CYCLE.length
  return AFFINITY_CYCLE[nextIndex] === defender
}

export function getAffinityMultiplier(attacker: Affinity, defender: Affinity): number {
  if (beats(attacker, defender)) return AFFINITY_ADVANTAGE_MULTIPLIER
  if (beats(defender, attacker)) return AFFINITY_DISADVANTAGE_MULTIPLIER
  return AFFINITY_NEUTRAL_MULTIPLIER
}
