import type {
  DescendFailureReason,
  SetPartySlotFailureReason,
  SetPerkLevelFailureReason,
  SummonFailureReason,
} from '../state/store'
import type { SeedRefusal } from './startRun'

export function descendRefusalText(reason: DescendFailureReason): string {
  switch (reason) {
    case 'no-spec':
      return 'Pick a specialization first.'
    case 'empty-party':
      return 'The party is empty: put a creature in it first.'
    case 'floor-out-of-reach':
      return 'That floor is out of reach: enter a whole number from 1 to one past the deepest floor cleared.'
    case 'beyond-content-frontier':
      return 'No floors that deep exist yet.'
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
      return 'The seed must be between 0 and 4294967295.'
    default: {
      const exhaustive: never = reason
      throw new Error(`Unhandled seed refusal: ${String(exhaustive)}`)
    }
  }
}
