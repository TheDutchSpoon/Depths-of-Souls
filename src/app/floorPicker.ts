// Throwaway demo: replaced by the real combat UI (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).
import type { FloorPreview } from '../state/store'

/** The field takes any text. Only trimmed digits are a floor: `Number()` would read `""` as 0 and
 * `"0x10"` or `"1e1"` as real floors. Anything else is `NaN`, which `canDescend` refuses. */
export function parseFloorField(text: string): number {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** Nothing has been fought while `lastFloor` is 0, so the field starts at 1. */
export function prefillFloor(lastFloor: number): number {
  return lastFloor >= 1 ? lastFloor : 1
}

export function floorInfoText(preview: FloorPreview): string {
  const fights = `${preview.fights} ${preview.fights === 1 ? 'fight' : 'fights'}`
  return preview.boss
    ? `${preview.biomeName}: boss floor, ${fights}`
    : `${preview.biomeName}: ${fights}`
}
