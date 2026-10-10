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
  (`spec/run.md` "Generation is a pure seeded module").

### Collection shape

- `collection: Map<InstanceId, Instance>`, keyed by opaque instance ids (`spec/creatures.md`
  "Instance"), not buckets keyed by static creature id.

### newGame

- A new game starts from **`newGame({ seed })`**. The seed is generated in `src/app`, never in the
  store or the engine.

### How store actions fail

- A **player-reachable failure** returns `{ ok: false, reason }` and leaves state unchanged; an
  **impossible state** (a broken invariant) throws.
- Each such action has a pure **`can…` query** sharing its check (`canDescend(floor)`), so the UI
  greys out an option for the same reason the action would refuse it.
- `descend` returns `{ ok: true, outcome } | { ok: false, reason }`, with reasons `no-spec`,
  `empty-party`, `floor-out-of-reach` and `beyond-content-frontier`. `pinBiome` returns `{ ok:
  true } | { ok: false, reason }`, with reasons `floor-out-of-range`, `unknown-biome` and
  `biome-has-no-content` (`spec/run.md` "Content frontier and pins"). `setPerkLevel`, `summon` and
  `setPartySlot` follow the same rule.

### Store actions

- `newGame({ seed })`, `setSpec`, `descend`, `runScriptedIntro`, `recordBossKill`, `pinBiome`,
  `setPerkLevel`, `refundAllPerks`, `summon(creatureId)` and `setPartySlot(slot, instanceId |
  null)`, plus the `can…` queries.
- `setPartySlot` swaps: placing an instance that is already in another slot swaps the two, so the
  party can be freely adjusted and reordered.
- Nothing removes an instance from the collection: the Unicorn is **permanently owned**, though not
  locked into the party.
