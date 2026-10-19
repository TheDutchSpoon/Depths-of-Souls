// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import { MAX_RUN_SEED } from '../state/store'
import type {
  DescendFailureReason,
  SetPartySlotFailureReason,
  SetPerkLevelFailureReason,
  SummonFailureReason,
} from '../state/store'
import type { SeedRefusal } from './startRun'

/** `reach` is the farthest floor the player can enter (`farthestReachableFloor`): the
 * out-of-reach text names it. */
export function descendRefusalText(reason: DescendFailureReason, reach: number): string {
  switch (reason) {
    case 'no-spec':
      return 'Pick a specialization first.'
    case 'empty-party':
      return 'The party is empty: put a creature in it first.'
    case 'floor-out-of-reach':
      return `That floor is out of reach: enter a whole number from 1 to ${reach}, one past the deepest floor cleared.`
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled descend refusal: ${String(exhaustive)}`)
    }
  }
}

export function summonRefusalText(reason: SummonFailureReason): string {
  switch (reason) {
    case 'unknown-creature':
      return "That creature can't be summoned."
    case 'soul-incomplete':
      return 'Not enough soul: summoning needs 100%.'
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled summon refusal: ${String(exhaustive)}`)
    }
  }
}

export function partySlotRefusalText(reason: SetPartySlotFailureReason): string {
  switch (reason) {
    case 'slot-out-of-range':
      return "That party slot doesn't exist."
    case 'unknown-instance':
      return "You don't own that creature."
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled party slot refusal: ${String(exhaustive)}`)
    }
  }
}

export function perkRefusalText(reason: SetPerkLevelFailureReason): string {
  switch (reason) {
    case 'no-spec':
      return 'Pick a specialization first.'
    case 'perk-not-in-spec':
      return "That perk isn't in this specialization."
    case 'invalid-level':
      return "The level must be a whole number from 0 to the perk's maximum."
    case 'over-budget':
      return 'Not enough free perk points for that level.'
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled perk refusal: ${String(exhaustive)}`)
    }
  }
}

export function seedRefusalText(reason: SeedRefusal): string {
  switch (reason) {
    case 'not-a-whole-number':
      return 'The seed must be a whole number, or blank for a random one.'
    case 'seed-out-of-range':
      return `The seed must be between 0 and ${MAX_RUN_SEED}.`
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled seed refusal: ${String(exhaustive)}`)
    }
  }
}
