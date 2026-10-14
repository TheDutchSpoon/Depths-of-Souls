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
 * Picks the tie-broken extremum of `pool` under `order` (negative when `a` sorts first ascending),
 * for a key that is not one number per creature (HP% is a ratio, compared by cross-multiplication).
 * `'desc'` reverses `order`; equal creatures fall back to the shared side/slot/id tie-break. The one
 * sort-and-tie-break site: `pickExtremum` is a wrapper over it. Undefined only for an empty pool --
 * callers must existence-check first (e.g. via a TargetSelector's has-candidate check) if
 * `undefined` isn't an acceptable outcome.
 */
export function pickExtremumBy(
  pool: readonly Creature[],
  order: (a: Creature, b: Creature) => number,
  direction: SortDirection,
): Creature | undefined {
  return [...pool].sort((a, b) => {
    const diff = direction === 'desc' ? order(b, a) : order(a, b)
    return diff !== 0 ? diff : compareBySideSlotId(a, b)
  })[0]
}

/** Picks the tie-broken extremum of `pool` by the numeric `keyOf`/`direction`. */
export function pickExtremum(
  pool: readonly Creature[],
  keyOf: (c: Creature) => number,
  direction: SortDirection,
): Creature | undefined {
  return pickExtremumBy(pool, (a, b) => keyOf(a) - keyOf(b), direction)
}
