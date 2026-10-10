# Spec — Saves

Read this when changing saving or loading. None of it is built: Phase 5 builds it.

## Not built

### The store's plain-data boundary

- Phase 5 builds it (its brief specifies it). **`snapshot()`** produces the serializable game state
  and **`hydrate()`** restores it. The state uses `Map` and `Set`, so the codec needs a round-trip
  test.

### Saves are large

- Phase 5 builds it. Assume big rosters, large inventories and many script templates.
- **IndexedDB is the primary store** (via `idb` or Dexie); `localStorage` holds only tiny things
  (settings, a last-save pointer), never the main save.

### References, not copies

- Phase 5 builds it. A save holds **instances and references only**, never copies of static game
  data: instances reference creatures and species **by id** and read base stats, affinity and
  traits from shipped data, so saves stay lean and a rebalance reaches existing saves.
- A fused instance is saved as its recipe (`spec/creatures.md` "Fusion").

### What a save holds

- Phase 5 builds it.
- **Player meta**: the specialization; the perk spend (the earned total is derived from the bosses
  cleared, never stored); the deepest cleared floor and the **last floor**; the bosses cleared; the
  discovered biomes; the atlas pins; the run seed and counter; the party's slots.
- **Collection**: the instances (`spec/creatures.md` "Instance") and the **per-creature soul%**.
- **Inventory**: currency balances (Essence, Ore, Bricks, Lifeforce); from Phase 8, gem instances
  (level and augments), equipment instances (level and infusions) and unlocked recipes.
- **Facilities**: which are built and their tiers.
- **Scripts**: every script template; each instance's assignment lives on the instance.

### Partitions

- Phase 5 builds it. The save is split into **logical records**, `meta`, `collection`, `inventory`,
  `facilities` and `scripts`, so a small change (spending a perk point) rewrites only its record.
- **Don't pre-optimize** to per-creature records: split `collection` finer only if its write
  becomes a **measured** bottleneck on very large rosters.
- If a partition is **missing or fails to parse** on load (corruption, tampering, a bug), only that
  partition resets to its default and the player gets a warning; the load never fails over one bad
  partition, so losing `inventory` never costs `collection` or `scripts`.

### Versions and migrations

- Phase 5 builds it. A save is `{ version: number, data }`, with **one global version for the whole
  save**, partitions or not; a migration may touch only the partitions it changes.
- On load, pure migrations `v(n) → v(n+1)` run in sequence up to the current version. An
  unversioned blob is never loaded.

### Autosave

- Phase 5 builds it. Save on **meaningful events** (a fight resolved, a craft, a fusion, a descent,
  a perk spent, a summon, a party change), **debounced** by a few seconds, plus on tab close or
  visibility change.
- A fight is **atomic**: never save mid-fight; resolve, then save. A save never blocks the game
  loop.

### Slot and file operations

- Phase 5 builds it. **One save slot** in v1: the game is one continuous forward-only descent.
- **Export to file**, compressed (native `CompressionStream`, gzip) for a shareable backup;
  **import from file**, decompressed and migrated; **delete save**, a clean start-over.
- **IndexedDB records stay uncompressed**: compression belongs to the export and import boundary,
  off the autosave path.
