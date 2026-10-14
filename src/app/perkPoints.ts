import type { Specialization } from '../data/specializations'
import { perkPointsFor } from '../state/rewards'
import type { GameState } from '../state/store'

export interface PerkPointSummary {
  readonly earned: number
  readonly spent: number
  readonly free: number
}

/** The store has no exported helper for the spent figure: `checkSetPerkLevel` sums
 * `level x costPerLevel` over the spec's perks inline, so this restates it and a test holds it to
 * the store's own `over-budget` boundary (`spec/progression.md#spending-perk-points`). */
export function perkPointSummary(
  state: Pick<GameState, 'bossesCleared' | 'perkSpend' | 'chosenSpec'>,
  specs: ReadonlyMap<string, Specialization>,
): PerkPointSummary {
  const earned = perkPointsFor(state.bossesCleared)
  const spec = state.chosenSpec === null ? undefined : specs.get(state.chosenSpec)
  const spent = spec
    ? spec.perks.reduce(
        (sum, perk) => sum + (state.perkSpend.get(perk.id) ?? 0) * perk.costPerLevel,
        0,
      )
    : 0
  return { earned, spent, free: earned - spent }
}
