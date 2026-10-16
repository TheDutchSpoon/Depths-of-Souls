import type { Trait } from '../../engine/effect-types'

/** A stock trait with its player-facing text. The text lives here, in data, and not on `Trait`:
 * the engine and the store never read it, and a `Trait` typed plain can't go into the stock
 * collections, so a stock trait can't ship without one. */
export interface DescribedTrait extends Trait {
  readonly description: string
}
