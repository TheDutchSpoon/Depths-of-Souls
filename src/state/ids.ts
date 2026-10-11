// src/state's own branded id, distinct from every id space that already
// exists (`spec/creatures.md#instance`): an Instance gets its own branded InstanceId, distinct from the
// static creatureId it references (a plain string, SpeciesCreature.id) and from the engine's
// CreatureId (src/engine/ids.ts), a transient per-FIGHT identity, freshly derived by
// materializeCreature every combat and never reused for a persistent owned instance.

export type InstanceId = string & { readonly __brand: 'InstanceId' }

export function createInstanceId(value: string): InstanceId {
  return value as InstanceId
}
