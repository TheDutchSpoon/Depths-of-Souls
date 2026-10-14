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

/** The line for a defeated boss; `null` when the descent defeated none. A repeat clear still
 * reports the boss, with no points. */
export function bossResultLine(
  outcome: Pick<FloorOutcome, 'bossDefeated' | 'bossFirstCleared' | 'perkPointsGained'>,
): string | null {
  if (outcome.bossDefeated === null) return null
  const name = bossName(outcome.bossDefeated)
  return outcome.bossFirstCleared
    ? `Defeated ${name}: first clear, +${outcome.perkPointsGained} perk points`
    : `Defeated ${name}: already cleared, no perk points`
}
