// Phase 4 Slice G: src/state's own branded id, distinct from every id space that already
// exists -- ASSUMPTION 25: "an Instance gets its own branded InstanceId (distinct from the
// static creatureId it references and from the engine's CreatureId, which is a per-fight
// identity)". The static creatureId an Instance references is a plain string (SpeciesCreature.id
// -- no branding pinned for that by the brief); the engine's CreatureId (src/engine/ids.ts) is a
// transient per-FIGHT identity, freshly derived by materializeCreature every combat and never
// reused for a persistent owned instance.

export type InstanceId = string & { readonly __brand: 'InstanceId' }

export function createInstanceId(value: string): InstanceId {
  return value as InstanceId
}
