import type { Creature, Side } from './types'

/** Player side wins ties over enemy side. */
const SIDE_TIE_RANK: Record<Side, number> = { player: 0, enemy: 1 }

/**
 * The shared side -> slot -> id tie-break, used by turn order and every extremum
 * TargetSelector/HP-qualifier condition. Plain codepoint compare on id, NEVER
 * localeCompare: localeCompare is locale/ICU-dependent and can order differently across
 * machines (local vs CI), which would silently break byte-identical golden-replay output.
 */
export function compareBySideSlotId(a: Creature, b: Creature): number {
  const sideDiff = SIDE_TIE_RANK[a.side] - SIDE_TIE_RANK[b.side]
  if (sideDiff !== 0) return sideDiff
  const slotDiff = a.slot - b.slot
  if (slotDiff !== 0) return slotDiff
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export type SortDirection = 'asc' | 'desc'

/** Orders by `keyOf`, then falls back to the shared side/slot/id tie-break. */
export function compareByKey(
  a: Creature,
  b: Creature,
  keyOf: (c: Creature) => number,
  direction: SortDirection,
): number {
  const keyA = keyOf(a)
  const keyB = keyOf(b)
  if (keyA !== keyB) return direction === 'desc' ? keyB - keyA : keyA - keyB
  return compareBySideSlotId(a, b)
}

/**
 * Picks the tie-broken extremum of `pool` by `keyOf`/`direction`. Undefined only for an
 * empty pool -- callers must existence-check first (e.g. via a TargetSelector's
 * has-candidate check) if `undefined` isn't an acceptable outcome.
 */
export function pickExtremum(
  pool: readonly Creature[],
  keyOf: (c: Creature) => number,
  direction: SortDirection,
): Creature | undefined {
  return [...pool].sort((a, b) => compareByKey(a, b, keyOf, direction))[0]
}
