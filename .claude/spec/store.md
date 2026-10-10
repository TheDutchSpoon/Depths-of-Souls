# Spec — Store

Read this when changing the store or the state the UI reads.

## Design

**The store's boundary**: a new game starts from `newGame({ seed })` (the seed comes from the app
layer, never the engine); `snapshot()` / `hydrate()` convert the live game state to and from plain
data (specified with Phase 5).

## Engine rules

## State & persistence

- One store (Zustand recommended). UI subscribes; engine does not depend on the store.
- **How store actions fail** (Phase 4.1-A, S5): a **player-reachable failure** returns `{ ok:
  false, reason }` and leaves state unchanged; an **impossible state** (a broken invariant) throws.
  Each action has a pure **`can…` query** sharing its check (e.g. `canDescend(floor)`), so the UI
  greys out an option for the same reason the action would refuse it. `descend` returns `{ ok:
  true, outcome } | { ok: false, reason }` with reasons `no-spec`, `empty-party`,
  `floor-out-of-reach`, `beyond-content-frontier`. `pinBiome` returns `{ ok: true } | { ok: false,
  reason }` with reasons `floor-out-of-range`, `unknown-biome` and `biome-has-no-content` (4.1-A;
  a pin to a biome with no content is refused, so a pin never makes a floor inside the content
  frontier unplayable). The same rule covers `setPerkLevel`, `summon` and `setPartySlot` (4.1-G).
- **Store actions after Phase 4.1:** `newGame({ seed })` (4.1-G; the seed is generated in `src/app`,
  never in the store or engine), `setSpec`, `descend`, `runScriptedIntro`, `recordBossKill`,
  `pinBiome`, `setPerkLevel`, `refundAllPerks`, `summon(creatureId)` and `setPartySlot(slot,
  instanceId | null)` (swap semantics: placing an instance already in another slot swaps the two;
  the party can be freely adjusted and reordered). `travelTo` is deleted (G6). The Unicorn is
  **permanently owned** (never removable from the collection) but **not locked into the party**.
- **Collection shape** (Phase 4.1-A, A6): `collection: Map<InstanceId, Instance>` with opaque
  instance ids (see "Data-driven content" for the `Instance` shape), not buckets keyed by static
  creature id.
