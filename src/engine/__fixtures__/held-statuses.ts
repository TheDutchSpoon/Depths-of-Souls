// Phase 4.1-H2d (ASSUMPTION 147): a mechanism golden (or a rule's unit test) that reads a real
// status's DoT/Regen percentage pins it in its own fixture, so a tuning pass never changes its
// expected values. `holdPotency` returns a copy of the registry in which each named status is the
// REAL `StatusDef` spread with only `potency.percent` replaced: the effects, polarity, duration and
// `ofStat` stay the real ones, so the golden still exercises the real status.

import type { StatusDef } from '../effect-types'

export function holdPotency(
  registry: ReadonlyMap<string, StatusDef>,
  held: Readonly<Record<string, number>>,
): ReadonlyMap<string, StatusDef> {
  const out = new Map(registry)
  for (const [statusId, percent] of Object.entries(held)) {
    const real = registry.get(statusId)
    if (real === undefined) throw new Error(`holdPotency: unknown status "${statusId}"`)
    if (real.potency === undefined) {
      throw new Error(`holdPotency: status "${statusId}" declares no potency to hold`)
    }
    out.set(statusId, { ...real, potency: { ...real.potency, percent } })
  }
  return out
}
