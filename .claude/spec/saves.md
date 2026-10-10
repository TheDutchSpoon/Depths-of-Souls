# Spec — Saves

Read this when changing saving or loading.

## Design

## 11. Persistence

Saves are expected to be **large** (big creature rosters, many script templates, inventories,
progression state). Design for that from the start.

**Store:** IndexedDB is the **primary store** (via `idb`/Dexie); `localStorage` holds only tiny
things (settings, a last-save pointer) — never the main save.

**What the save contains** (instances + references only — never copies of static game data):
- **Player meta**: chosen specialization; perk spend (the earned total is derived from bosses
  defeated, never stored); deepest-reached floor; **last floor**; bosses defeated (first-clear
  tracking); biome discovery state; Biome Atlas assignments; the run seed and counter; the active
  party's slots.
- **Collection**: owned creature **instances**, each storing only its **source** (a creature id, or
  a fusion recipe), level/XP, its assigned script, and (until Phase 8) its rolled gem set; affinity,
  traits, stats and fused-ness are derived on load. Equipped gem and equipment references join with
  Phase 8. Plus **per-creature soul%**.
- **Inventory**: gem instances (level + augments), equipment instances (level + infusions),
  unlocked recipes, currency balances (Essence / Ore / Bricks / Lifeforce).
- **Facilities**: which are built + their upgrade tiers.
- **Scripts**: all script templates (each instance's assignment lives on the instance).

**References, not copies** (the key rule): instances reference static creatures/species **by
ID** (e.g. `creatureId: "black_spider"`) and read base stats/affinity/trait from shipped data.
This keeps saves lean and lets rebalancing flow into existing saves automatically.

**Fused creatures store a recipe, not a result.** A fused instance saves
`{ identityParent: creatureId, affinityParent: creatureId }` (two static creature IDs, ordered
by role). On load the engine derives the fused creature: **identity/species from
identityParent, affinity from affinityParent, base stats = per-stat average of the two, both
innate traits**. This is valid because **fusion is fuse-once** (a parent is never itself a
fusion) and fusion reads only **static per-creature data** (not level/gems/XP). *Consequence,
accepted as intended:* rebalancing a base creature later **does** retroactively change existing
fused creatures derived from it.

**Versioning & migration**: `{ version: number, data: {...} }` — **one global version number for
the whole save**, even though storage is partitioned (below); a migration step may touch only
the partition(s) it actually changes. On load, run a sequential migration chain
(`migrate_v1_to_v2(data)`, `migrate_v2_to_v3(data)`, …), each a pure function, up to current.
Never load an unversioned blob.

**Partitioning**: split the save into **logical records** (`meta`, `collection`, `inventory`,
`facilities`, `scripts`) so a small change (e.g. spending a perk point) rewrites only `meta`,
not the whole game. **Do not pre-optimize** to per-creature records; only split `collection`
finer *if* the collection write becomes a **measured** bottleneck on very large rosters. If a
partition is **missing or fails to parse** on load (corruption, manual tampering, a bug), the
engine resets **just that partition** to its default/empty shape and surfaces a warning to the
player — it does not fail the whole load. Losing one partition (e.g. `inventory`) should never
cost the player unrelated data (e.g. `collection`, `scripts`).

**Autosave**: on **meaningful events** (fight resolved, item crafted, fusion done, floor
descended, perk spent), **debounced** (a few seconds), plus a save on tab-close /
visibility-change. A fight is **atomic** — never save mid-fight; resolve, then save the result.
Never block the game loop on a save.

**Slots & file ops**: **single save slot** in v1 (the game is one continuous forward-only
descent). Provide **export to file** (compressed, e.g. native `CompressionStream`/gzip — large
saves warrant it for shareable/backup file size), **import from file** (decompresses and
migrates as needed), and **delete save** (a clean start-over escape hatch). **IndexedDB itself
stores uncompressed records** — compression is an export/import-boundary concern only, kept off
the hot autosave path.

## Engine rules

- **`snapshot()` / `hydrate()`** is the store's plain-data boundary (specified in the Phase 5
  brief): `snapshot` produces the serializable game state (the state uses `Map`/`Set`, so the codec
  needs a round-trip test), `hydrate` restores it.
- **Saves are large** — assume big rosters, large inventories, many script templates.
  **IndexedDB is the primary store** (via `idb`/Dexie); `localStorage` holds only tiny things
  (settings, a last-save pointer), never the main save.
- **Save = instances + references only**, never copies of static game data. Instances reference
  creatures/species by ID and read base stats/affinity/traits from shipped data. Fused
  instances store the **recipe** `{ identityParent, affinityParent }`, derived on load (above).
- **Partition by logical record**: `meta`, `collection`, `inventory`, `facilities`, `scripts`,
  so a small change rewrites only the relevant record. **Do not pre-optimize** to per-creature
  records — only split `collection` finer if it becomes a **measured** write bottleneck on very
  large rosters (a documented future trigger, not a v1 task). If a partition is missing/fails to
  parse on load, **reset just that partition to default and warn the player** — never fail the
  whole load over one bad partition.
- **Saves are versioned.** Shape: `{ version: number, data: SaveDataVX }` — **one global version
  number governs the whole save** (not per-partition), even though storage is partitioned. On
  load, run pure migrations `v(n) -> v(n+1)` in sequence up to current. Never load an
  unversioned blob.
- **Autosave** on meaningful events (fight resolved, craft, fusion, descend, perk spent, summon,
  party change),
  **debounced**, plus on tab-close/visibility-change. A fight is **atomic** — never save
  mid-fight; resolve then save. Never block the game loop on a save.
- **Single save slot** in v1. Provide **export** (compressed at the export boundary only, e.g.
  native `CompressionStream`; IndexedDB records themselves stay uncompressed), **import**
  (decompress + migrate), and **delete save**.

