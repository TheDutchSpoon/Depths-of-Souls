# Hand-out r1 — 4.5-G1: The demo, descent loop and viewer

Branch `4.5-g1`, from `51a955d`. Two parts. **Part A** gives six rules the demo restates in
`src/app` one home in the engine, the store or the data, and points the demo at them. **Part B**
fixes the viewer's line-up and closes test and comment gaps. Re-read first, all changed:
`phases/4.5/brief.md#the-demos-game-layer-homes` (new, Part A's design),
`phases/4.5/brief.md#demo-golden-rule`, `phases/4.5/brief.md#floor-picker-g1`,
`phases/4.5/brief.md#descent-result-and-viewer-g1` and `phases/4.5/G1/brief.md`.

## Golden policy for this round

Additive. No `__golden__` fixture, no corpus digest and no existing test under `src/engine`,
`src/state` or `src/data` changes, with one exception: `src/data/species/names.test.ts` reads the
new template list (A5) and keeps every assertion. The three `balance-ci-*` tests stay
byte-identical. New engine, store and data tests are added. `src/app` tests whose code moves out
are deleted or moved with it; the report lists each one and its new home. Any choice this
hand-out doesn't pin is an `ASSUMPTION` in the report, never a silent call.

## Part A — one home per rule

**A1. Floor preview (`src/engine/generation.ts`, `src/state/store.ts`).**
- The engine exports `floorShape(floor, biome, config)` returning `{ boss, fights }`: `boss` is
  `isBossFloor(floor)` and the biome has a `boss`; `fights` is 1 on a boss floor, else
  `fightCount(floor, config)`. `generateFloor` takes its branch and its fight count from it (it may
  still narrow `biome.boss` for the type checker). Every golden and the corpus digest staying
  byte-identical is the proof that generation didn't change.
- The store's `GameActions` gains `floorPreview(floor): FloorPreview | null`, with `FloorPreview`
  `{ biomeId, biomeName, fights, boss }`. It is `null` for anything but a whole number ≥ 1, and
  never throws (`NaN`, `0`, `-3`, `2.5`, `Infinity`). Otherwise it resolves the biome exactly as
  `descend` does (`deps.biomes`, the state's `atlasPins` and `runSeed`), through one private helper
  that `descend` and `floorPreview` both call, and reads `floorShape` with `deps.balanceConfig`.
- Tests. Engine: `floorShape` agrees with `generateFloor`'s output (boss flag and fight count) for
  every floor from 1 to the content frontier on real content; floors 10, 20 and 30 are one-fight
  boss floors; an inline boss-less biome's tenth floor is ordinary (`fightCount`). Store: the null
  inputs above return `null` without throwing; `1e20` returns a preview; after `pinBiome(floor,
  id)`, the preview names the pinned biome (fails with `floorPreview` ignoring `atlasPins`); on a
  real-content run, a cleared floor's `fightRecords.length` equals its preview's `fights`.

**A2. Perk points (`src/state/store.ts`).**
- Export a pure `perkPointsSpent(spec, perkSpend)`: Σ `level × costPerLevel` over the spec's perks.
  `checkSetPerkLevel` computes its spend with it, over `perkSpend` with the proposed change applied.
- `GameActions` gains `perkPointSummary()`: `{ earned, spent, free }`, earned
  `perkPointsFor(bossesCleared)`, spent `perkPointsSpent` over the chosen spec (0 with none), free
  the difference.
- Tests: `src/app/perkPoints.test.ts`'s cases move to a store test, the boundary sweep included
  (`canSetPerkLevel(perk, level + 1).ok` equals `costPerLevel ≤ free`, with at least one allowed
  and one `over-budget` answer per spec).

**A3. A boss clear in the outcome (`src/state/store.ts`).**
- `FloorOutcome` gains `bossFirstCleared: boolean` (a boss was defeated and wasn't in
  `bossesCleared` before this descent) and `perkPointsGained: number` (`perkPointsFor` after the
  descent minus before). Both are `false` / `0` on a floor with no boss defeated.
- Tests: a first boss-floor win is `true` / `100`; winning it again is `false` / `0`;
  `recordBossKill` of that boss and then a win is `false` / `0`; a non-boss floor is `false` / `0`.
  Use the store tests' existing boss-floor setup.

**A4. The fight registries (`src/data/registries.ts`, new).**
- Export `DEFAULT_REGISTRIES`: `{ scripts: STOCK_SCRIPTS_BY_ID, traits: TRAIT_REGISTRY, statuses:
  STATUS_REGISTRY }`, typed `Required<CreateCombatRegistries>`. The store's default deps take
  `scripts`, `traits` and `statuses` from it. `src/app/registries.ts` is deleted and its importers
  read `DEFAULT_REGISTRIES`. `copyFight.test`'s replays through it are the pin.

**A5. Creature templates (`src/data/creatures.ts`, new).**
- Export `ALL_CREATURE_TEMPLATES`: the starters and the Unicorn (`STARTERS`), then every biome's
  pool creatures, then every biome's boss creature, in `BIOMES` order. Export
  `BOSS_CREATURES_BY_ID`: boss id → the boss's creature, for every biome with a boss.
- `src/data/species/names.test.ts` builds its list from `ALL_CREATURE_TEMPLATES`; its assertions,
  the 61 count included, stay as they are. A data test asserts every biome's boss is in both
  exports.
- `src/app/names.ts` builds its name table from `ALL_CREATURE_TEMPLATES` (`creatureName` still
  throws on a miss) and `bossName` reads `BOSS_CREATURES_BY_ID` (still throws on an unknown id).
  `buildNameTable`'s per-biome walk goes.

**A6. The run-seed bound (`src/state/store.ts`).**
- Export `MAX_RUN_SEED`; `newGame` keeps using it. `src/app/startRun.ts` imports it and its own
  `MAX_SEED` goes. `startRun.test`'s seed-bound test stays as it is.

**A7. The demo reads the new homes (`src/app`, `src/ui`).**
- `floorInfo` is deleted from `floorPicker.ts`; `floorInfoText` takes a `FloorPreview`, and
  `RunScreen` calls the store's `floorPreview`. `parseFloorField`, `prefillFloor` and
  `deepestPlusOne` stay with their tests; the `floorInfo` tests go (A1 holds them now).
- `perkPoints.ts` and its test are deleted (A2); the side panel reads `perkPointSummary()`.
- `descendFlow.ts` and its test are deleted (A3): `RunScreen` calls `descend` directly, and the
  descent it keeps holds the outcome and the floor's fight count from `floorPreview`, read before
  the descent. `bossResultLine` takes the outcome: `null` when `bossDefeated` is `null`; `Defeated
  <boss>: first clear, +<perkPointsGained> perk points` when `bossFirstCleared`; otherwise
  `Defeated <boss>: already cleared, no perk points`. `descentText.test` keeps a first and a
  repeat clear over hand-built outcomes.
- `presence.test` drives `descend` through the store the same way `RunScreen` now does.

## Part B — the viewer and the gaps

**B1. The line-up shows each side under its own heading (`src/app/fightView.ts`,
`src/ui/DescentViewer.tsx`).** Today both parties print in one block, and a label carries its side
only when its name repeats, so in most fights nothing says which creatures are allies and which are
foes. `fightView.ts` exports a pure helper that splits a `FightView`'s `lineUp` by `side` into the
allies (`'player'`) and the foes (`'enemy'`), each in line-up order. The viewer renders an
**Allies** heading with the allies' `lineUpText` lines, then a **Foes** heading with the foes'.
`fightView.test` adds: on an inline record with two player creatures and one enemy creature, all
names unique, the allies are exactly the two player entries and the foes the one enemy entry.
Fails with every entry put in one group.

**B2. Pin the perk effects in the viewer's set-up fight (`src/app/fightView.test.ts`).** No test
fails if `effects: record.playerEffects` is dropped from `buildFightView`'s `createCombat` call: no
shipped perk changes Health or adds a spell. Add a `buildFightView` case on an inline record (one
player creature and one enemy creature, base Health 20, no traits) whose `playerEffects` is
`[{ category: 'stat-modifier', stat: 'health', factor: 1.5 }]`: line-up HP 30 for the player
creature, 20 for the enemy. Fails with the effects dropped.

**B3. Pin the fight list's labels across both parties (`src/app/fightList.test.ts`).** `fightRow`
and `fightHeader` each call `labelCreatures(record.playerParty, record.enemyParty, names)`; with
either given the player party alone, the tests still pass. Add a record whose player party and
enemy party each hold one creature of the same template (a player `rat` at slot 0, an enemy `rat`
at slot 0), the player rat rising from level 1 to 2: `fightRows` gives the level-up
`Rat (ally 1) 1 → 2`, and `fightHeader`'s `levelsIn` gives `Rat (ally 1): level 1`. Fails with
either call given the player party alone.

**B4. `fightView.ts`'s comment cites the rules it states.** It cites `spec/combat.md#fight-setup`
for "setup prepends innate spells to `equippedSpells`" and "sets HP to effective max Health"; that
rule states neither. Cite `spec/creatures.md#innate-spells` for the prepend and
`spec/statuses.md#health-is-a-modifiable-stat` for the HP.

**B5. A false sentence in `src/engine/generation.ts`.** The comment above the static content
shapes ends "Never imported by src/ui/src/app."; `src/app` imports from it. Delete that sentence.

**B6. `record.md` reflects the slice as built.** **Files changed** lists every file this round adds,
deletes or changes, under `src/engine`, `src/state` and `src/data` as well. **Shape** says the demo
reads the store's floor preview, perk-point summary and boss-clear fields, the data's registries and
creature templates, and that the line-up has side headings; update its test count. Replace
**Not verified**: the browser click-through was run by the PR review, in
`.claude/phases/4.5/G1/evidence/click-through-r1.md`.

## Report

`report-r2.md`: each item and what changed; the gate results (`npm run test`, `lint`,
`format:check`, `build`, `npx tsc -b`, `npm run docs:check -- citations` and `-- comments`); the
per-file test count against `main` and against round 1, with every deleted or moved `src/app` test
and its new home; `git diff --stat 51a955d -- src/engine src/state src/data` with every file
attributed to an item; confirmation that no `__golden__` fixture, corpus digest or existing engine,
state or data test changed but `names.test.ts` (A5); for each new test, the mutation that fails
it; and any `ASSUMPTION`. The browser check of B1 is the next review's.
