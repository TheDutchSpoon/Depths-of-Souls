import type { InstanceId } from '../state/ids'
import { staticCreatureIdFor } from '../state/rewards'
import type { Instance } from '../state/rewards'
import { creatureName } from './names'

/** The one label every owned instance shows under: "<name>, Lv <level>", with a 1-based "#<k>"
 * after the name when more than one owned instance shares it. The ordinal counts over the whole
 * collection, party and bench together, in collection order (the `Map`'s insertion order, which is
 * creation order: nothing removes an instance), so one name never has two "#1"s
 * (`spec/store.md#collection-shape`). */
export function labelInstances(
  collection: ReadonlyMap<InstanceId, Instance>,
  names: ReadonlyMap<string, string>,
): ReadonlyMap<InstanceId, string> {
  const named = [...collection.values()].map((instance) => ({
    instance,
    name: creatureName(names, staticCreatureIdFor(instance)),
  }))
  const totals = new Map<string, number>()
  for (const { name } of named) totals.set(name, (totals.get(name) ?? 0) + 1)
  const seen = new Map<string, number>()
  const labels = new Map<InstanceId, string>()
  for (const { instance, name } of named) {
    const ordinal = (seen.get(name) ?? 0) + 1
    seen.set(name, ordinal)
    const shown = (totals.get(name) ?? 0) > 1 ? `${name} #${ordinal}` : name
    labels.set(instance.id, `${shown}, Lv ${instance.level}`)
  }
  return labels
}

/** Throws on an id the map doesn't hold: an instance the collection can't label is a drift to
 * surface. */
export function labelOf(labels: ReadonlyMap<InstanceId, string>, id: InstanceId): string {
  const label = labels.get(id)
  if (label === undefined) throw new Error(`labelOf: no label for instance ${id}`)
  return label
}
