import type { BiomeData } from '../engine/generation'
import { perkPointsFor } from '../state/rewards'
import type { FloorOutcome } from '../state/store'
import { bossName } from './names'

/** `fights` is the floor's fight count: the outcome stops at the first non-win, so its own
 * results don't give it. */
export function floorResultLine(
  outcome: Pick<FloorOutcome, 'floor' | 'cleared' | 'fightResults'>,
  fights: number,
): string {
  if (outcome.cleared) return `Floor ${outcome.floor}: cleared`
  const last = outcome.fightResults[outcome.fightResults.length - 1]
  if (last === undefined || last === 'win') {
    throw new Error('floorResultLine: an uncleared floor ends on a loss or a draw')
  }
  return `Floor ${outcome.floor}: ${last} at fight ${outcome.fightResults.length} of ${fights}`
}

/** A first clear is a `bossDefeated` the pre-descent snapshot lacks: by the time `descend`
 * returns, the store has already added the boss, and a repeat clear still reports it. */
export function bossResultLine(
  bossDefeated: string | null,
  bossesBefore: ReadonlySet<string>,
  bossesAfter: ReadonlySet<string>,
  biomes: readonly BiomeData[],
): string | null {
  if (bossDefeated === null) return null
  const name = bossName(biomes, bossDefeated)
  if (bossesBefore.has(bossDefeated)) {
    return `Defeated ${name}: already cleared, no perk points`
  }
  const points = perkPointsFor(bossesAfter) - perkPointsFor(bossesBefore)
  return `Defeated ${name}: first clear, +${points} perk points`
}
