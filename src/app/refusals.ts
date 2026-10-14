import type { DescendFailureReason } from '../state/store'
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
