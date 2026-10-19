# Spec — Store

Read this when changing the store or the state the UI reads.

## Engine rules

### One store

- One Zustand store (`src/state/store.ts`). The UI subscribes to it; the engine never depends on it.

### The store owns navigation and ownership

- The store holds the run's navigation and ownership, the `GameState`: `deepestFloor`, `lastFloor`,
  `discoveredBiomes`, `atlasPins`, `collection`, `activeParty`, `soulProgress` (per creature),
  `chosenSpec`, `perkSpend`, `bossesCleared`, `currencies`, and the run's RNG position (`runSeed`,
  `runCounter`) and `nextInstanceOrdinal`.
- It **calls** the generator and never owns the deterministic derivation of a floor's contents
  (`spec/run.md#generation-is-a-pure-seeded-module`).

### Collection shape

- `collection: Map<InstanceId, Instance>`, keyed by opaque instance ids (`spec/creatures.md#instance`), not buckets keyed by static creature id.

### newGame

- A new game starts from **`newGame({ seed })`**, the seed a whole number in `0..MAX_RUN_SEED`
  (`2^32-1`, exported; any other throws). The seed is generated in `src/app`, never in the store
  or the engine.
- **`startGame({ seed, specId })`** is the one run start: `newGame({ seed })`, then
  `setSpec(specId)`, then `runScriptedIntro()` (the starter must be owned before the intro fight),
  throwing where those throw. The demo's Start and the balance simulator both call it, so a demo
  run and a simulated one match for the same seed and spec.

### How store actions fail

- A **player-reachable failure** returns `{ ok: false, reason }` and leaves state unchanged; an
  **impossible state** (a broken invariant) throws.
- Each such action has a pure **`can…` query** sharing its check (`canDescend(floor)`), so the UI
  greys out an option for the same reason the action would refuse it.
- `descend` returns `{ ok: true, outcome } | { ok: false, reason }`, with reasons `no-spec`,
  `empty-party` and `floor-out-of-reach` (not a whole number, below 1, or past the reach,
  `spec/run.md#floor-runs`). `pinBiome` returns `{ ok:
  true } | { ok: false, reason }`, with reasons `floor-out-of-range`, `unknown-biome` and
  `biome-has-no-content` (`spec/run.md#authored-biomes-and-pins`). `setPerkLevel` returns `{ ok:
  false, reason }` with `no-spec`, `perk-not-in-spec`, `invalid-level` (not a whole number in
  `0..maxLevel`) or `over-budget` (total spend over the points earned,
  `spec/progression.md#specializations-are-data`). `summon` refuses with
  `unknown-creature` or `soul-incomplete`, `setPartySlot` with `slot-out-of-range` or
  `unknown-instance`. `recordBossKill` refuses with `unknown-boss` an id that is no `boss.bossId`
  in the store's own biome list; a boss already cleared is `{ ok: true }` and changes nothing.

### Store actions

- `newGame({ seed })`, `startGame({ seed, specId })`, `setSpec`, `descend`, `runScriptedIntro`, `recordBossKill`, `pinBiome`,
  `setPerkLevel`, `refundAllPerks`, `summon(creatureId)` and `setPartySlot(slot, instanceId |
  null)`, plus the `can…` queries (`canRecordBossKill` among them) and two read-only answers for
  the UI:
  - `floorPreview(floor)`: the floor's biome, resolved as `descend` resolves it (pins and run seed
    included), its fight count and whether it is a boss floor
    (`spec/run.md#boss-floor-generation`). `null` for anything but a whole number ≥ 1, never a
    throw, whatever biome list the store was given; it previews a floor past the reach too.
  - `perkPointSummary()`: `{ earned, spent, free }` for the chosen spec (spent 0 with none). The
    spend is one sum, `perkPointsSpent(spec, perkSpend)`, which the `over-budget` check uses too.
- `setPerkLevel(perkId, level)` sets an absolute level, so buying and refunding are one call;
  `refundAllPerks()` clears the whole spend (`spec/progression.md#specializations-are-data`).
- `setPartySlot` swaps: placing an instance on an occupied slot sends the occupant to the placed
  instance's old place (its slot if it was in the party, the bench if it wasn't), so the party can
  be freely adjusted and reordered.
- Nothing removes an instance from the collection: the Unicorn is **permanently owned**, though not
  locked into the party.

### A descent's outcome

- `descend`'s outcome (`FloorOutcome`) holds the floor it was, its results and totals (`floor`, `fightResults`,
  `cleared`, `deepestFloorAdvanced`, `bossDefeated`, `bossFirstCleared` (that boss wasn't in
  `bossesCleared` before the descent), `perkPointsGained`, `xpBanked`, `soulGained`,
  `currencyGained`, the concatenated `events`) and **`fightRecords`**: one `FightRecord` per fight
  resolved, in fight order. The records' events concatenate to `events`, their XP sums to
  `xpBanked` and their results are `fightResults`.
- A `FightRecord` holds the fight's `events`, `result`, `xpBanked` and `partyLevelsAfter` (the
  active party's levels after its XP, in `playerParty` order), and what `createCombat` was given:
  `seed`, `playerParty`, `enemyParty` and `playerEffects` (the perk effects). `playerParty` is the
  party materialized for that fight, not the `CombatState`'s, which carries fight-setup output.
- A record reproduces its fight outside the store: `createCombat` over its seed, parties and perk
  effects, with the registries the store was given (the default store's are `DEFAULT_REGISTRIES`,
  `src/data/registries.ts`), then `resolveFight`, gives its `events`
  (`CONVENTIONS.md#every-failing-fight-is-reproducible-from-its-seed`).
