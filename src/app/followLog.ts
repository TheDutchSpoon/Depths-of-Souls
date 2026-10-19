// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
// The log box follows new beats while the reader is at its bottom and holds where the reader has
// scrolled up. Both questions are pure, so the edges are unit-tested; the box only feeds them.

/** Display scaling and zoom give fractional scroll positions (Windows at 125% does), so "at the
 * bottom" cannot be exact to the pixel. */
export const FOLLOW_TOLERANCE_PX = 4

export interface ScrollMetrics {
  readonly scrollTop: number
  readonly clientHeight: number
  readonly scrollHeight: number
}

/** Whether the box is scrolled to within `tolerancePx` of its end. Read from the last scroll
 * position, before the next beat is added: once the log has grown it is never at the bottom. */
export function isAtBottom(metrics: ScrollMetrics, tolerancePx: number): boolean {
  return metrics.scrollHeight - (metrics.scrollTop + metrics.clientHeight) <= tolerancePx
}

export interface LogPosition {
  readonly fight: number
  readonly revealed: number
}

/** A new fight, or fewer beats shown than before (a jump, even to the same fight), empties the
 * box, and an empty box is at its bottom: following starts again. */
export function shouldResetFollow(previous: LogPosition, next: LogPosition): boolean {
  return next.fight !== previous.fight || next.revealed < previous.revealed
}
