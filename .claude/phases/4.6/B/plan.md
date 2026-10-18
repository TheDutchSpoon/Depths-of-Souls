# Plan — 4.6-B: Game layer and the comment sweep

Branch `4.6-b`, off `main` after 4.6-A. Read for this plan: `coding-rules.md`, `CLAUDE.md`,
`CONVENTIONS.md`, the kickoff, the slice brief, `phases/4.6/brief.md` (the seven sections,
`#bs-listed-test-changes`, `#sequencing-rules`), `phases/4.6/review.md` (S1, S5, S11, L1, L14, L15,
V1–V5, V12, M1–M17), `spec/run.md`, `spec/store.md`, `spec/progression.md`, and
`spec/creatures.md#levels-and-xp`, `spec/statuses.md#timing`, `CI_CD.md#what-the-comments-check-reads`,
`content/overgrowth.md#trigger-words`, `phases/4.5/brief.md#trait-and-perk-text`. No spec file beyond
the kickoff's list is reached. I read the current `generation.ts`, `store.ts`, `rewards.ts`,
`leveling.ts`, `config.ts`, `balance-sim.ts`, the `src/app` and `src/ui` files named, the docs-check
`comments.ts`/`names.ts`, and the tests that pin each site. Line numbers below are from the current
tree.

## Needs a decision before approval

These are places where the kickoff's rules and the brief's test list pull apart. I plan the smaller
reading of each; the plan stops at them otherwise.

- **C1. Removing the simulator's id parsing changes tests the list doesn't name.** The list names
  `templateIdOf`'s test. But `analyzeFight`'s hand-built-event tests (`balance-sim.test.ts` ~625,
  ~1064–1260 and `balance-sim-report.test.ts` ~129) get the side of a creature from its id suffix
  (`'p-player-0'`, `'sparkeater-enemy-0'`) and pass the roster as bare id strings. With "sides from
  membership in `playerParty` / `enemyParty`" those tests must hand `analyzeFight` a roster. **Plan:**
  only the set-up of those tests changes (a small test helper builds the roster from the ids the
  test already uses); every assertion stays. `bossContext`'s own test changes with its signature.
  Please confirm this counts as direct fallout of the Known-bug-free requirement "no id regex
  remains", or tell me to keep a parser.
- **C2. `perkPointsFor` gains a config argument**, so the three `perkPointsFor` cases in
  `rewards.test.ts` (~218) pass `TEST_BALANCE_CONFIG`; expectations unchanged. Same fallout class.
- **C3. The floor rows' upper bound.** The kickoff recommends "the deepest floor any seed of the
  spec reached". I plan **the deepest floor any seed ran** (`max(run.floor)`), which is one past the
  deepest cleared for a seed that ended on a failed push. Reason: the failed-push and wall counts
  live on that last floor, and the report's "failed pushes by floor" watch point would silently lose
  the row where a wall is. See ASSUMPTION A1.

## Golden policy (restated)

**Byte-identical.** Every golden's expected values and the corpus digest fixture are unchanged; the
digest runs in the default suite and I never run `corpus:update`. Existing tests change only where
`#bs-listed-test-changes` lists (plus C1/C2 if approved). The one behaviour change an existing test
may see is the intro fight's own log, and only where the enemy Unicorn's *attack* is locked: its
script is `striker` (`UNICORN.defaultScriptId`), whose first rule is the attack and whose
`CAST_RANDOM_GEM` is the fallback, so gems matter only on a turn the attack is illegal (Pacified).
Every state after the intro is byte-identical. Anything beyond the list is a stop-and-ask.

## Order of work and the two pauses

1. **Mechanisms, one at a time, before any test is touched.** After each, run `npm run test` and
   `npx tsc -b`, and log the new failures; attribute by the delta between runs. Order: frontier →
   store guard → reach export → intro Unicorn → `recordBossKill` → numbers → small fixes. When all
   are in, the log is the **inventory of existing tests the slice changed**, each matched to a
   `#bs-listed-test-changes` entry (or C1/C2). A failure that matches none: stop and ask.
2. Adjust those tests, then write the new tests.
3. **Descriptions** (own change, so it can be its own commit before the sweep touches the data
   files).
4. **Widen the comment check** (patterns + tests), run it on the pre-sweep tree, write the hit
   inventory to `evidence/comment-check-hits.md`. The check is red on the tree until the sweep, so
   the gate list for this step is the check's own tests.
5. **PAUSE 1: I stop here and report.** Duncan commits everything so far; that commit is the
   sweep's base.
6. **The sweep**, on top of that commit, comments only; then `docs:check -- comment-proof <that
   commit>` and the full gate list. The report is written once, after the sweep, with the sweep's
   base named.

## Approach by file

### `src/engine/generation.ts`
- `export const LAST_FIXED_FLOOR = BIOME_COUNT * FLOORS_PER_BIOME`, beside the two constants it is
  built from (declared after both).
- `biomeForFloor`: the pin line stays first and is returned as is. For `floor <= LAST_FIXED_FLOOR`
  (the literal 100 goes): `decade = floor((floor − 1) / FLOORS_PER_BIOME)`; walk `d` from
  `min(decade, biomes.length − 1)` down to 0 and return the first biome with `biomeHasContent`; a
  decade past the end of the list is thereby "no content". Nothing authored at or before it throws
  the existing `generation invariant violated` error (an empty list still throws, as today's test
  expects). Past it: `authored = biomes.filter(biomeHasContent)`, same hash, same
  `min(n − 1, floor(roll × n))` with `n = authored.length`, indexing `authored` in list order; empty
  throws. A list with all ten authored draws exactly what `main` draws.
- Delete `contentFrontier`; its doc comment, and `biomeHasContent`'s mention of it, are reworded to
  name the remaining users (`pinBiome`, the store guard, the fallback). `biomeHasContent` and the
  generator's own throw stay. `FLOORS_PER_BIOME`/`BIOME_COUNT` doc comments unchanged.
- `floorPreview` can no longer throw because `biomeForFloor` has an answer for every floor of a
  list whose first biome has content (guarded in the store).
- **ASSUMPTION A2:** a list with fewer than ten entries is *valid input* to `biomeForFloor` (decades
  past its end fall back); only a list with nothing authored at or before the decade throws.

### `src/engine/leveling.ts`, `src/engine/config.ts`
- `config.ts`: `STAT_GROWTH_PER_LEVEL = 0.25`, with a comment citing
  `spec/creatures.md#levels-and-xp`. `leveling.ts` uses `1 + STAT_GROWTH_PER_LEVEL * (level − 1)`.
  Same IEEE arithmetic (0.25 is exact), so every materialized stat is identical.
- Fix M4 while there (`config.ts:27` says nothing reads `DEFAULT_GEM_SLOT_COUNT`); that is a sweep
  item and waits for the sweep.

### `src/engine/balance-types.ts`, `src/data/balance.ts`, `src/engine/__fixtures__/balance.ts`
- `BalanceConfig.perkPointsPerBoss: number`; `DEFAULT_BALANCE_CONFIG` = 100;
  `TEST_BALANCE_CONFIG` = 100 (the fixture is the only other literal of the type; checked by
  `summonCost` grep). **ASSUMPTION A3:** the field is named `perkPointsPerBoss`.

### `src/state/rewards.ts`, `src/data/specializations.ts`
- `perkPointsFor(bossesCleared, config)` = `bossesCleared.size × config.perkPointsPerBoss`.
- `specializations.ts`: `specializationPointTotal(config) = config.perkPointsPerBoss × BIOME_COUNT`
  (one boss per biome); `validateSpecialization(spec, config = DEFAULT_BALANCE_CONFIG)` compares
  against it and its message prints it. The default argument keeps the module's bottom-of-file calls
  as they are. Never derived from the bosses the data ships today (that would give 300).

### `src/state/store.ts`
- **Imports/exports:** drop `contentFrontier`, `FLOORS_PER_BIOME`; add `LAST_FIXED_FLOOR`.
  `export function farthestReachableFloor(deepestFloor: number): number { return deepestFloor + 1 }`
  — the one home of the reach rule (**A4**: name).
- `DescendFailureReason` = `'no-spec' | 'empty-party' | 'floor-out-of-reach'`. `checkDescend`:
  no-spec, empty-party, then `!Number.isInteger(floor) || floor < 1 || floor >
  farthestReachableFloor(state.deepestFloor)` → `floor-out-of-reach` (`1e20`, `Infinity`, `NaN`
  included). Stale comments rewritten: ~219, ~306–308, ~319–320, ~569–570, ~596–599, ~1066–1071.
- `unlockBiomeIndex`: `cap = LAST_FIXED_FLOOR`, drop the `deps.biomes.length × FLOORS_PER_BIOME`
  bound. Equivalence shown in the tests (one biome, deepest 25: today floor 10 → biome 1; after,
  floor 25 → fallback → biome 1). Comment rewritten.
- `resolveFloorBiome` already returns `indexOf` of the resolved biome; kept, with the comment
  saying why (the position, never the decade).
- `createGameStore`: before building the store, throw if `deps.biomes.length === 0` or
  `!biomeHasContent(deps.biomes[0])`, naming which. `pinBiome`'s `biome-has-no-content` check stays.
- `recordBossKill(bossId): RecordBossKillResult`; `canRecordBossKill(bossId)`;
  `RecordBossKillFailureReason = 'unknown-boss'`. Shared `checkRecordBossKill(deps, bossId)`:
  known ⇔ some `deps.biomes[i].boss?.bossId === bossId`. `recordBossKill`: on a refusal return it
  with no `set`; on an already-cleared known id return `{ ok: true }` with no `set` (so the state
  reference is unchanged; zustand's `set` would otherwise make a new object even for the same
  Set); else `set` with `withBossCleared`. `descend`'s boss path keeps `withBossCleared` directly.
  **A5:** result shape = `{ ok: true } | { ok: false; reason }`, the same as `pinBiome`/`canPinBiome`.
- `perkPointsFor(…, deps.balanceConfig)` at its four callers (`checkSetPerkLevel`,
  `perkPointSummary`, `descend`'s outcome ×2). Comments saying `× 100` rewritten.
- **Intro Unicorn** in `runScriptedIntro`: 
  `const gems = rollLoadout(unicornRef.speciesCreature, 1, deps.allSpells, deps.createRng(hashIntroUnicornDraw(state.runSeed)))`
  and `materializeCreature(..., { ..., gems })`. The biome number is the literal-free constant
  `INTRO_BIOME_NUMBER = 1` named for what it is (the 1-based number, not `deps.biomes[1]`).
  `hashIntroUnicornDraw(runSeed)` has its own constants, shaped like `hashGemDraw` with a fixed
  salt in place of the ordinal, and shares none with `hashRunDraw`/`hashGemDraw`/`hashFloorDraw`.
  `runCounter` still advances by exactly 1; no other state is touched. **A6:** the stream is that
  hash of the run seed alone (no ordinal, no counter). The Unicorn that joins keeps its own stored
  `rollPlayerGems` set, as today. Comment on `runScriptedIntro` and `GameActions.runScriptedIntro`
  updated (scaffolding until `spec/creatures.md#gems-as-items`).
- `floorPreview` doc comment loses "beyond the content frontier".
- Seed text (V4) lives in `refusals.ts`; `MAX_RUN_SEED` is already exported.

### `src/state/balance-sim.ts`
- **No frontier.** `StopReason = 'cap'`, `stopReason(progress, runCap)`; `runSeed` loses
  `contentFrontier`; `BalanceReport.frontier` and its header label go; `formatSpec` loses its
  `frontier` parameter ("Floors 20–<deepest>" takes the spec's last row). `t4.stopReasons` stays as
  `{ cap }`. **A7:** keep the always-`cap` field rather than widen the edit.
- **Rows:** `buildFloorRows(results, config)` and `buildFirstTryRows(results)` run `1..max(run.floor)`
  over the spec's seeds (A1). `RunRecord` gains `shape: { boss: boolean; fights: number }`, read in
  `playFloorRun` from the store's own `floorPreview(floor)` before the descent (so the pins and
  the seed are the store's, and the rule is `floorShape`'s). A row's `fightsPerFloor` is
  `shape.boss ? 1 : fightCount`… read straight from the first run on that floor in seed order
  (`shape.fights`), and its `bossLevel` is `bossLevel(floor, config)` iff that run's `shape.boss`.
  Past `LAST_FIXED_FLOOR` the biome is per seed, so seeds can disagree only if the authored biomes
  disagree on having a boss; the row then follows the first seed. **A8.** `isBossFloor` and
  `biomeForFloor` imports go from this file.
- **Ids from the record (V1).** `FightContext` keeps its fields but they are filled from the
  fight's record, never built by hand: `unicornId` = the id of the `playerParty` creature whose
  `origin.templateId === UNICORN.id`; `bossId`/`bossTemplateId` = `enemyParty[0]`'s `id` /
  `origin.templateId` on a boss floor (`spec/run.md#boss-floor-generation`: boss at slot 0);
  `bossTraitIds` from the biome the preview named. `bossContext(preview, record, biomes)` replaces
  the old signature; `unicornCombatId` becomes `unicornIdOf(playerParty)`.
  `analyzeFight(events, ctx, roster)` takes the roster `{ playerParty, enemyParty }` (a
  `Pick<FightRecord, …>`) instead of `enemyIds`; `stackBucket(stack, sides)` checks membership in
  the two id sets; `enemyTemplateIds` = distinct `origin.templateId` of `enemyParty`.
  `PLAYER_ID`, `ENEMY_ID`, `templateIdOf` and `unicornCombatId`'s hand-built string are deleted.
  `traitStackMaxima` takes the sides too.
- **Perk budget:** `applyPerkPlan(store)` reads `state.perkPointSummary().earned` instead of
  `perkPointsFor(...)`: the store's own config answers, no new parameter, no caller change.
  **A9.**
- **Rot Sovereign filter:** `.filter((v) => v.bossTemplateId === ROT_SOVEREIGN.id)` (the creature
  id, imported from `data/species/rotcap-hollow`); `bossTemplateId` is a creature id, so this
  compares like with like and survives a boss-id rebrand. **A10.**
- `runProbe`, `playFloorRun`: gate the probe on `preview.boss`; build the probe's context from the
  probe's own records.
- The file's header comment (frontier wording) is reworded.

### `src/app`, `src/ui`, `src/main.tsx`
- `refusals.ts`: `descendRefusalText(reason, reach)`; the `floor-out-of-reach` text names `reach`
  (`…enter a whole number from 1 to ${reach}, one past the deepest floor cleared.`; wording mine
  (**A11**)); the `beyond-content-frontier` case goes; the seed text interpolates `MAX_RUN_SEED`
  (string identical). `RunScreen.tsx` passes `farthestReachableFloor(game.deepestFloor)`.
- `floorPicker.ts`: `deepestPlusOne` deleted; `RunScreen.tsx` calls `farthestReachableFloor`.
- `eventText.ts`: `(${duration}r)` → `(1 turn)` / `(3 turns)`.
- `playback.ts`: `initialPlayback(fights = 1)` returns `phase: 'done'` when `fights === 0`;
  `playbackReducer` returns the state unchanged for every action except `set-speed` when
  `beatCounts.length === 0`, so no `beatCounts[last]!` is read unguarded (`timer-elapsed`,
  `skip-fight`, `skip-floor`; `jump` already throws a `RangeError` for any fight). **A12:** a
  zero-fight descent starts `done`.
- `DescentViewer.tsx`: `useReducer(…, records.length, initialPlayback)`; after all hooks, `if
  (records.length === 0)` return the floor line plus "No fights were played on this floor." — so
  `views[state.fight]!`, `header` and `records[state.fight]!` are never reached.
- **Throwaway marker (V3):** one header comment on every non-test file in `src/app` and `src/ui`
  and on `src/main.tsx`: `// Throwaway demo: replaced by the real combat UI
  (`CONVENTIONS.md#every-feature-phase-ships-a-demo`).` **A13:** CSS and tests are excluded;
  files that already open with a comment get the line as the first line of that block. It names no
  phase (the comment check).
- `debugBoss.ts`: the comment saying the perk points count every id goes; `recordBoss` returns the
  result. `bossChoices()` is unchanged (it already lists real ids).
- M3 is the duration label above.

### Descriptions (`src/data/traits/*.ts`, `src/data/specializations.ts`)
For each entry the kickoff lists: read the entry in the doc at HEAD and at `260fee3^`
(`git show`, read-only), apply `phases/4.5/brief.md#trait-and-perk-text` (effect sentences only; no
opener, no remark about the creature, no `**Known bug:**`; Markdown and citations stripped; numbers
are `src/data`'s, a doc number that disagrees goes in the report), and replace the `description`
string. An entry whose rewrite changed only its opener, a remark or a Known-bug line keeps its text
and is listed "unchanged" with the reason. Output: an entry → old → new table in the report. No
text is pinned by a new test beyond the existing `descriptions.test.ts` (**A14**: descriptions are
data, the 4.5 text rule has no mechanism; the proof is the table, and the three strings that test
pins must not move). Entries: Flickerling Wick, Flickerling Flare, Resonant Overtone, Shellback
Warden, Shellback Bulwark; Spider Broodwarden, Swarmhive Drone, Swarmhive Queen, Pollinator
Pollenlord, Snapjaw Lure, Snapjaw Jaws, Lullpollen Sleeper, Lullpollen Dozer, Broodmother, Unicorn
Lightbearer; Sporecloud Reaper, Hollowkin Wretch, Hollowkin Marionette, Sporch Igniter, Sporch
Cinderlord; the Glyphmoth Seer starter trait; Brute Force, Shield up, Armor piercer, Thorns,
Phalanx.

### `scripts/docs-check/comments.ts` (+ `comments.test.ts`)
Widened patterns, ids 21 upward (18–20 belong to the name guard), run on comments and test titles
only, **not** on string literals (**A15**: "new" and "legacy" are English a player-facing string can
hold; `names.ts` keeps reading patterns ≤ 9 there). Starting set, fitted to the review's real hits
and to the tree as grepped today (the inventory run decides the final regexes):

| id | what | regex | positive (real hit) | near-miss negative |
| --- | --- | --- | --- | --- |
| 21 | legacy path | `/\blegacy (?:\w+ )?path\b/` | "the legacy cast path" (`resolution.ts` ~924, ~1086, ~1366) | "no legacy of the old path" |
| 22 | moved from | `/\bmoved here from\b/` | "moved here from combat.ts" (`actions.ts:4`, ~774) | "the creature moved from slot 1" |
| 23 | first consumer | `/\bfirst real consumer\b/` | "the first real consumer" (`conditions.ts` ~141) | "the first consumer of the stream" |
| 24 | existing behaviour | `/\bexisting implicit behavio(?:u)?r\b/` | `effect-types.ts:108`, `effects.ts` ~574 | "an existing creature's behaviour" |
| 25 | importers | `/\bkeeps? working unchanged\b/` | `effects.ts` ~351 | "the lock keeps working" |
| 26 | file position | `/'s first file\b/` | "src/state's first file" (`store.ts:1`) | "the first file in the list" |
| 27 | the new code span | ``/\b[Tt]he new `/`` | "the new `all-allies`" (`starters.ts:59`, `overgrowth.ts:124`, `golden-shieldbarer-starter.fixture.ts:3`) | "the new maximum", "the new host" |

Each row gets a positive and a negative in `comments.test.ts`'s table (the test runs both as a
comment and as a title). One more test pins that a *string literal* holding "the new `x`" is not a
problem (A15). The unsure one is 21: a bare `legacy` also matches `rng.ts`/`spell-effects.test.ts`
wording that is an API or oracle name, not history; the inventory run shows which.
**Run:** `npm run docs:check -- comments` on the pre-sweep tree; every hit goes into
`evidence/comment-check-hits.md` as: in the review's V12/M list (fixed), outside it and provenance
(fixed in the sweep, listed), or false positive (pattern narrowed, with the narrowing). Hits in a
golden fixture are comment-only edits and listed per file for `comment-proof`.

### The sweep (after PAUSE 1)
Comments only. Locate each V12 hit and M1–M17 item on the current tree by its quoted text; fix it;
report "fixed" (before → after) or "already gone" (current text). Already known: M9 and M17's
phrases are rewritten/gone (kickoff); M3 is not in the sweep (above); M4 (`config.ts:27`) and the
data-file lines (`traits/glimmerdark.ts` ~134–135, `traits/overgrowth.ts` ~124,
`traits/starters.ts` ~59) are in it, after the descriptions change. The `comment-proof` base is the
commit Duncan makes at PAUSE 1.

## Tests (each fails with its mechanism removed, at every site)

Existing-test changes follow the inventory (list in the report). Expected from the code read:
- frontier tests (`store.test.ts` ~587–651, `generation.test.ts` `contentFrontier` block,
  `generation-floor-shape.test.ts`, `integration.test.ts` ~356, `balance-sim.test.ts` ~146/~305–320/
  ~846, `balance-sim-report.test.ts` ~249, `presence.test.ts` ~44–52, `floorPicker.test.ts` ~62,
  `refusals.test.ts` ~26);
- `FIXTURE_BIOME_SEQUENCE` gains content: each slot's `speciesPool` = `[FIXTURE_SPECIES_BRAWLERS]`;
  its comment is reworded; `generation.test.ts`'s sequence tests keep their assertions;
- boss-recording tests record a real id: `store-perks.test.ts` helper, `store-newgame.test.ts:57`,
  `store.test.ts` ~859–861 (two ids → `makeDeps({ biomes: BIOMES })`), assertions unchanged;
  `'broodmother'` recorded on the default store stays;
- intro log tests: `store.test.ts` intro block, `integration.test.ts`, per the inventory;
- `templateIdOf` test, the `(3r)` expectation in `eventText.test.ts:67`, the `descendRefusalText`
  call sites (`refusals.test.ts:59` **by hand**: `reasons.map((reason) => descendRefusalText(reason,
  5))`, since passing the function to `map` would feed the array index as the floor and still
  type-check), `deepestPlusOne`'s test, `perkPointsFor` tests (C2), analysis tests (C1).

New tests, mechanism by mechanism:

| Mechanism / site | Test | Fails when |
| --- | --- | --- |
| Fallback inside 1–`LAST_FIXED_FLOOR` (`generation.test.ts`) | gap list `[A, empty, C]`: 11–20 → A, 21–30 → C; one-biome list: floors 11, 25, 100 → A; `[]`/all-empty throws the invariant error | the walk-back is removed or reads only `biomes[decade]` |
| Authored-only draw past 100 (second site, same file) | list with empty slots: floors 101–400 × seeds never draw an empty biome and draw only list-order authored ones; **ten-authored table**: floors 101–140 × 6 seeds equal an inline copy of `main`'s draw (`hashFloorDraw`, `min(n−1, floor(roll×n))`) | the draw runs over `biomes.length` |
| `LAST_FIXED_FLOOR` | pinned to 100; 100 → fixed branch, 101 → draw (boundary table) | the constant or the `<=` is wrong |
| Pin still wins, returned as is | pin to an *empty* biome id is returned, not re-checked | `biomeForFloor` re-checks the pin |
| Store site (`store-frontier.test.ts`, new) | real store: `floorPreview(35)` = Rotcap, `deepestFloor` seeded 34 → `descend(35)` ok, no enemy holds a spell with `unlockedAtBiome` > 3 (a biome-4-only spell of every affinity is added to `allSpells`); `floorPreview(40)` boss with the Rot Sovereign, a repeat win adds no perk points (`bossFirstCleared` false; levels set high; falls back to a fixture boss store if the real fight is not a certain win — **A16**) | `biomeIndex` becomes the decade, or the frontier returns |
| `unlockBiomeIndex` | one-biome list, deepest 25 → pool of biome 1; real store deepest 150 → the same pool as deepest 100 over a seed table (the pool stops growing at `LAST_FIXED_FLOOR`) | cap removed (the pool follows the drawn biome and shrinks) |
| Store guard | `createGameStore({ biomes: [] })` and `{ biomes: [EMPTY, A] }` throw; `[A, EMPTY]` builds | guard removed |
| `checkDescend` | `canDescend(31)` ok at deepest 30; 32 refused; `1e20`, `Infinity`, `NaN`, 0, 2.5, −3 → `floor-out-of-reach`; the reasons record in `refusals.test.ts` has exactly three keys | a frontier or a wrong reach |
| Reach export, **each reader** | `checkDescend` boundary (deepest+1 ok, deepest+2 refused); `descendRefusalText('floor-out-of-reach', 13)` names 13 and differs from the text for 5; `RunScreen` source calls `farthestReachableFloor` — a raw-source guard test (`import.meta.glob('…', { query: '?raw' })`) asserts `deepestFloor + 1` appears in no non-test `src` file except the export (**A17**) | a reader restates the rule |
| `floorPreview` never throws | one-biome list: 1, 25, 100, 101, `1e20`; gap list; `null` cases kept | the fallback is removed |
| Intro Unicorn | three distinct biome-1 Vitality spells; same seed → same set; the set ignores `runCounter` (set to 7 first); a seed table where the sets differ per seed; `createRng` spy sees exactly one request during the intro; a **Pacified** intro Unicorn casts instead of waiting (fixture hero holds Pacify, fast; assert a `SpellCast` by the Unicorn after its `StatusApplied`) | the roll uses `rollPlayerGems`/the counter, or no gems |
| `recordBossKill` | unknown id refused, state *reference* and perk points unchanged; known id records; repeat is `ok` and the reference is unchanged; `canRecordBossKill` equals the action's result in all three cases, and for an injected biome list that holds a different boss than `BOSS_CREATURES_BY_ID` | check removed, or it reads the global map |
| Config reads | store: with `perkPointsPerBoss: 50` the summary's `earned`, `over-budget` and `perkPointsGained` follow it; simulator: `applyPerkPlan` on a 50-config store buys within 50; specialization total: `specializationPointTotal` of 50 → 500 and a 500-point spec validates under it only; defaults pin `perkPointsPerBoss` = 100, `STAT_GROWTH_PER_LEVEL` = 0.25, derived total 1000 | a literal returns |
| Zero fights | `initialPlayback(0)` is `done`; every action on `[]` returns without throwing and without a `NaN`/`undefined` `revealed` (`skip-floor` included); the viewer renders `<DescentViewer>` with zero records through `react-dom/server`'s `renderToString` (no testing library in the repo) and shows the no-fight text | the reducer or the viewer indexes `[last]`/`[0]` |
| Simulator ids | analysis tests use opaque ids (`'a1'`, `'b2'`) so any suffix parse fails; rows: a run whose `shape` is `{ boss: false, fights: 17 }` on floor 10 gives `fightsPerFloor` 17 and `bossLevel` null; `bossContext` returns null when the preview says `boss: false` on a ×10 floor | a regex, `templateIdOf` or `isBossFloor` returns |
| Rot Sovereign filter | a visit with `bossTemplateId: ROT_SOVEREIGN.id` is in the attrition rows, another template is not | the filter is dropped (it cannot tell the two id domains apart today: noted, not a gap I can close) |
| Seed text, `(3r)`, marker | `seedRefusalText('seed-out-of-range')` equals the literal string `main` has; `(1 turn)`/`(3 turns)`; the raw-glob test requires the marker citation in every demo module | each is reverted |
| Comment check | the table above, per pattern, as comment and as title | a pattern is removed or loosened |

Also: the grep checks the kickoff asks for (`contentFrontier`, `beyond-content-frontier`, the
listed literals, `templateIdOf`, the id regexes, `(3r)`) run in the report with their output.

## Evidence (`evidence/`, from a scratch copy of `main`)
Made with `git archive main` into the scratchpad plus a junction to this repo's `node_modules`
(read-only on the repo; nothing deleted). One script runs on both trees and prints JSON of the
state after `startGame` and the first descent for each spec × 20 seeds (Maps/Sets serialized);
a diff step compares them and prints `evidence/intro-equivalence.md`: state deep-equal; first
descent outcome deep-equal; for each differing intro log, the index of the first differing event
and whether it falls on or after a turn where the Unicorn held an attack-locking status
(`lockScopesByStatus`). Same copy prints `evidence/draw-table.md` (the ten-authored past-100 draw,
`main` vs branch) and `evidence/balance-ci.md` (the CI verdict numbers, `main` vs branch, equal).
The script is not kept; its printed table and rule go in the report. Also `evidence/test-inventory.md`
(the per-mechanism failure log) and `evidence/descriptions.md` (the table).

## Gates and reconciliation
`npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
`docs:check -- comments`, then `docs:check -- comment-proof <PAUSE-1 commit>`. Test counts per file
against `main` (new files and removed tests named). Golden policy shown by importing the fixtures
and comparing expected values, plus the corpus digest test passing unmodified. Hand-derived focused
tests carry their setup and arithmetic in comments; the ten-authored table and the seed tables are
labelled checkpoint-verified, with the scratch-copy evidence behind them. Nothing is committed or
deleted by me; renames: none.

## Spec questions the report will carry
- The three `**Known bug:**` lines (`spec/run.md#enemy-script-and-gem-set`,
  `spec/store.md#how-store-actions-fail`, `#store-actions`) as built; and `#store-actions`'
  `floorPreview` clause "past the content frontier it still previews".
- Stale: `spec/run.md#content-frontier`, `#biomes` ("a seeded draw from all 10"), `#biomeforfloor`,
  `#content-frontier-and-pins`, `#pins`, `#scripted-intro`; `spec/store.md#how-store-actions-fail`
  (the `beyond-content-frontier` reason, "`recordBossKill` has no failure", "× 100") and
  `#store-actions`; `spec/progression.md#specializations-are-data` (literal 1000, "× 100") and
  `#perk-points`; `CONVENTIONS.md#where-each-number-lives` (the three new numbers);
  `CI_CD.md#what-the-comments-check-reads` (patterns 21–27, not read in literals);
  `OPEN_QUESTIONS.md` frontier mentions; `spec/run.md#boss-floors` ("floors 40, 50 … repeat the last
  authored biome's boss").
- `curves.ts`'s `floor <= 100` is the level multiplier's pivot (its config fields name floor 100),
  left alone as the kickoff says.
- Any doc number that disagrees with `src/data` found while transcribing descriptions.
- **Content changes:** none to behaviour; the descriptions of the listed entries, as text.

## Assumptions checklist

- [ ] **A1.** Floor rows and first-try rows run to the deepest floor any seed *ran* (`max run.floor`),
      not the deepest cleared (C3).
- [ ] **A2.** `biomeForFloor` accepts any list; only "nothing authored at or before the decade" (or
      nothing authored past 100) throws.
- [ ] **A3.** The config field is `perkPointsPerBoss`; `STAT_GROWTH_PER_LEVEL` lives in
      `engine/config.ts`; `specializationPointTotal(config)` and `validateSpecialization(spec,
      config = DEFAULT_BALANCE_CONFIG)` carry the 1000.
- [ ] **A4.** The reach export is `farthestReachableFloor(deepestFloor)` in `store.ts`;
      `deepestPlusOne` is deleted, not kept as a delegate.
- [ ] **A5.** `recordBossKill` returns `{ ok: true } | { ok: false; reason: 'unknown-boss' }` (the
      `pinBiome` shape) and `canRecordBossKill` returns the same; a repeat of a known boss is `ok`
      with no `set`.
- [ ] **A6.** The intro Unicorn's stream is a hash of the run seed alone with its own constants and a
      fixed salt; the biome is the number 1.
- [ ] **A7.** `StopReason` stays as the one-member `'cap'` and `t4.stopReasons` as `{ cap }`.
- [ ] **A8.** A report row past `LAST_FIXED_FLOOR` takes `fightsPerFloor`/`bossLevel` from the first
      seed's run shape, read from the store's `floorPreview`.
- [ ] **A9.** `applyPerkPlan` reads `perkPointSummary().earned` (no new parameter).
- [ ] **A10.** The Rot Sovereign filter compares `bossTemplateId` with `ROT_SOVEREIGN.id`.
- [ ] **A11.** Out-of-reach text: "…enter a whole number from 1 to N, one past the deepest floor
      cleared."; duration labels `1 turn` / `3 turns`; zero-fight text "No fights were played on this
      floor."
- [ ] **A12.** A zero-fight playback starts `done` (`initialPlayback(fights = 1)`; the viewer passes
      `records.length`) and the viewer shows a no-fight line instead of the fight view.
- [ ] **A13.** The throwaway marker is one first-line comment on each non-test `src/app`, `src/ui`
      file and `src/main.tsx`, citing `CONVENTIONS.md#every-feature-phase-ships-a-demo` and naming no
      phase; CSS is excluded.
- [ ] **A14.** No new description string is pinned by a test; the proof is the old → new table and the
      three existing pinned strings staying put.
- [ ] **A15.** The widened patterns (ids 21+) read comments and test titles, not string literals.
- [ ] **A16.** The "repeat Rot Sovereign win" test uses the real store with a high-level party if that
      is a certain win, else a fixture boss store; the floor-35/40 resolution assertions stay on the
      real store either way.
- [ ] **A17.** A raw-source test (`import.meta.glob` with `?raw`) is acceptable as the "no reader
      restates the reach rule" proof, and likewise for the marker.
- [ ] **A18.** C1/C2: the test set-up changes described above count as direct fallout of the listed
      mechanisms; assertions never change.
