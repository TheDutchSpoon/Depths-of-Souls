# Plan — 4.5-G1: The demo, descent loop and viewer

Read: `CLAUDE.md`, `coding-rules.md`, the kickoff and G1 brief, `CONVENTIONS.md` (the sections the
kickoff names), `spec/store.md`, the brief's demo sections, `src/ui/CombatDemo.tsx`, `src/app/*`,
`state/store.ts` (`checkDescend`, `checkSetPerkLevel`, `DEFAULT_DEPS`, `descend`),
`state/rewards.ts`, the start of `runSeed` in `balance-sim.ts`, `createCombat`, `generateFloor`'s
boss branch, `fightCount`, and the three biome files. No spec file beyond the kickoff's list is
reached. No conflict found between the docs and the kickoff.

## Approach

One screen state in `App`: `start` until `startRun` succeeds, then `run` (picker, latest descent's
result and viewer, side panel). Every rule the screen derives is a pure `src/app` module with a
unit test; the components in `src/ui` only call them and render. The demo holds UI state only
(screen, seed and floor fields, the latest descent, playback state). Game state is read from
`useGameStore`, with one selector per stable field (Sets and Maps are replaced immutably by the
store, so selecting them is stable). A component that needs several fields subscribes to the
whole state (`useGameStore()` with no selector returns the one state object, not a fresh one).

Playback is a **pure reducer** (`src/app/playback.ts`) over `{ phase, fight, revealed, speed }`.
The component owns the clock with **one effect** keyed on that state:
`const delay = pendingDelayMs(state); if (delay === null) return; const id = setTimeout(() =>
dispatch({ type: 'tick' | 'wait-elapsed' }), delay); return () => clearTimeout(id)`. Every
control dispatches an action, which changes the state, which re-runs the effect, whose cleanup
cleared the previous timeout first. Timers cannot stack by construction (StrictMode's double
effect run clears its own first), and a new descent unmounts the viewer (it is keyed by a descent
counter), whose cleanup clears the last one. No timer ref, no side effect in an updater.

**Deviation from "move 3.5's timer handling" (ASSUMPTION 1):** 3.5 used a `setInterval` ref and
`clearTimer()` called by each control. The viewer needs a wait, three speeds, jumps and playback
across fights, and an interval ref plus a hand-written `clearTimer()` in every control is the
shape the kickoff warns about ("every control clears both before scheduling"). A reducer plus a
single state-keyed effect keeps 3.5's two ideas (cosmetic reveal of a finished log; clearing in an
effect, not an updater) and makes the one owner structural. The 3.5 beat pace, `groupIntoBeats`
and `describeEvent` are moved as asked.

## Module changes, by file

### New, `src/app` (pure, all tested)

- **`startRun.ts`** (the start path; `newGame.ts` keeps `generateRunSeed` and `startNewGame`
  unchanged, so `newGame.test.ts` does not change):
  - `parseSeedField(text): { ok: true, seed: number | null } | { ok: false, reason:
    SeedRefusal }`. Trimmed blank → `seed: null` (the caller draws one). Otherwise the text must
    match `/^-?\d+$/` else `not-a-whole-number` ("abc", "1.5", "1e3", "0x10"); then `Number()` in
    `0 .. 2^32 − 1` else `seed-out-of-range` ("-1", "4294967296"). `SeedRefusal =
    'not-a-whole-number' | 'seed-out-of-range'`. The `2^32 − 1` bound is a named constant here
    (the store's `MAX_RUN_SEED` is not exported and may not be touched).
  - `startRun(store: Pick<GameActions, 'newGame' | 'setSpec' | 'runScriptedIntro'>, specId,
    seedText, source?): { ok: true, seed } | { ok: false, reason: SeedRefusal }`. Validates the
    seed first (so `newGame` never throws), draws with `generateRunSeed(source)` for a blank
    field, then calls `newGame({ seed })` → `setSpec(specId)` → `runScriptedIntro()`, in that
    order, nothing else. The Start button and the presence test both call this.
  - `SPEC_CHOICES`: `SPECIALIZATIONS.map(s => ({ id, name }))` (Brute, Shieldbarer, Sorcerer).
- **`registries.ts`**: `DEMO_REGISTRIES = { scripts: STOCK_SCRIPTS_BY_ID, traits: TRAIT_REGISTRY,
  statuses: STATUS_REGISTRY }`, the same three objects `DEFAULT_DEPS` gives `useGameStore`. Helpers
  take `registries` as an argument; only the components pass this constant.
- **`names.ts`**: `buildNameTable(standalone, biomes): ReadonlyMap<string, string>` over the
  standalone creatures (`STARTERS` from `data/species/starters`), every biome's species pool, and
  every biome's `boss.creature` and `boss.adds`, templateId → `name`. `DEMO_NAMES` is the table
  over `STARTERS` and `BIOMES`. `creatureName(table, templateId)` **throws** on a miss; there is
  no fallback to the id.
- **`fightView.ts`**:
  - `labelCreatures(playerParty, enemyParty, names): ReadonlyMap<CreatureId, string>`: name from
    `origin.templateId`; names counted over both parties together; a name seen more than once gets
    ` (ally n)` / ` (foe n)` (n = 1-based position in its own party) on every occurrence, a unique
    name stays bare. Lookup by exact `id` match.
  - `buildFightView(record, registries, names)`: runs `createCombat({ seed, player: { party:
    playerParty, effects: playerEffects }, enemy: { party: enemyParty }, registries })` once and
    returns `{ label(id) (throws on an id in neither party), lineUp: { side, label, level, hp }[],
    spellName(casterId, gemSlot) }`. `level` and `hp` come from the set-up creatures
    (`level`, `currentHp`); `spellName` reads `equippedSpells[gemSlot]` of the **set-up** caster
    and throws on `null`/missing.
- **`eventText.ts`**: `groupIntoBeats` (moved verbatim) and `describeEvent(event, view)` (moved;
  line templates unchanged, the `never` default included). Differences from `main` only:
  every creature id goes through `view.label`, and `casts slot N` becomes `casts <spell name>`
  (`view.spellName(casterId, gemSlot)`). Trait and status ids print as they did.
- **`fightList.ts`**: `fightRows(records, names)` → per fight `{ number, result, rounds, kills,
  xp, levelUps: string[] }`. Rounds = count of `RoundStarted`; kills = `CreatureDied` events whose
  id is in `enemyParty` (side read from the parties, exact id match); XP = `record.xpBanked`;
  level-ups = pairwise `partyLevelsAfter[i] − playerParty[i].level > 0`, text
  `"<label> 1 → 2"`. `fightHeader(record, index, total, names)` → `{ title: 'Fight n / N',
  levelsIn: string[] }` for the viewer header (levels going in from `record.playerParty`).
- **`descentText.ts`**: `floorResultLine(outcome)`, `bossResultLine(bossDefeated,
  bossesBefore, bossesAfter, biomes)`: null when `bossDefeated` is null; else
  `"Defeated <boss name>: first clear, +100 perk points"` when `bossesBefore` lacks it, else
  `"Defeated <boss name>: already cleared, no perk points"`. The boss's name is found by
  `bossId` over the biomes' `boss` (throws if none).
- **`floorPicker.ts`**: `parseFloorField(text): number` (trimmed `/^\d+$/` → `Number`, else `NaN`,
  so no input reaches `biomeForFloor` unvalidated and `canDescend` always gets a number);
  `prefillFloor(lastFloor)` (`lastFloor >= 1 ? lastFloor : 1`); `deepestPlusOne(deepest)`;
  `floorInfo(floor, ctx)` → `null` unless a whole number ≥ 1, else `{ biomeName, fights, boss }`
  with `ctx = { atlasPins, runSeed, biomes, config }`; `boss = isBossFloor(floor) &&
  biome.boss !== undefined`, `fights = boss ? 1 : fightCount(floor, config)`;
  `floorInfoText(info)`.
- **`refusals.ts`**: `descendRefusalText(reason: DescendFailureReason)` and
  `seedRefusalText(reason: SeedRefusal)`, each an exhaustive `switch` with a `never` default.
- **`perkPoints.ts`**: `perkPointSummary({ bossesCleared, perkSpend, chosenSpec }, specs)` →
  `{ earned: perkPointsFor(bossesCleared), spent: Σ level × costPerLevel over the spec's perks,
  free: earned − spent }`; no spec → spent 0.
- **`sidePanel.ts`**: `sidePanelRows(state, ctx)` → labelled rows (spec name, seed, deepest and
  last floor, discovered biome names, cleared boss names, perk points, the four currencies) and the
  two fixed lines `CURRENCY_NOTE = 'Nothing spends these yet'`, `SAVE_NOTE = 'No saving yet:
  reloading the page starts over'` (the strings the brief's assumption fixes).
- **`playback.ts`**: `SPEEDS = { 1: 500, 3: 167, 5: 100 }` (ms per beat), `START_WAIT_MS =
  3000`, `playbackReducer(state, action, beatCounts)`, `initialPlayback()`, `pendingDelayMs`.
  - `phase`: `waiting` (the 3 s), `playing`, `done`.
  - `wait-elapsed`: waiting → playing at `{ fight: 0, revealed: 0 }`.
  - `tick` (playing): `revealed < count` → +1; else a next fight exists → `{ fight + 1, revealed:
    0 }`; reaching the last beat of the last fight sets `done`, so the timer stops there.
  - `jump(i)`: `{ playing, fight: i, revealed: 0 }`, from any phase (a jump during the wait starts
    playback now; after `done` it restarts and runs on).
  - `skip-fight`: playing only; `revealed = count`, still `playing` (carries on into the next
    fight), `done` if it was the last fight; ignored while waiting or done.
  - `skip-floor`: `{ done, last fight, revealed = count }`.
  - `set-speed`: changes speed only; position kept. (ASSUMPTION 2: during the 3 s wait it restarts
    the wait, because the effect re-keys on state; harmless and unobservable after playback starts.)
  - `pendingDelayMs`: waiting → 3000, playing → `SPEEDS[speed]`, done → null.
- **`copyFight.ts`**: `fightToJson(record): string` = `JSON.stringify({ seed, player: { party:
  playerParty, effects: playerEffects }, enemy: { party: enemyParty } }, null, 2)`, the
  `createCombat` input without `registries`.

### New, `src/ui`

- **`StartScreen.tsx`**: spec radio/select over `SPEC_CHOICES`, seed text field, **Random**
  (`generateRunSeed()` into the field), **Start** (calls `startRun(useGameStore.getState(), …)`;
  on refusal shows `seedRefusalText`). The seed shown afterwards is the store's `runSeed`.
- **`RunScreen.tsx`** (picker + result + viewer): floor field (initial `prefillFloor(lastFloor)`),
  **Deepest + 1**, **Descend** (disabled by `canDescend(parseFloorField(text))`, the reason beside
  it via `descendRefusalText`), the info line. `Descend` snapshots `bossesCleared` **before**
  calling `descend`, then stores `{ id (counter), outcome, bossesBefore, bossesAfter }` as the one
  latest descent, replacing the previous one.
- **`DescentResult.tsx`**: floor result line, boss result line, the fight-list table; each row has
  a jump button (dispatches `jump`).
- **`DescentViewer.tsx`**: `src/ui/CombatDemo.tsx` moved here with a plain `mv`, then edited. Keeps
  the `<pre>` log, `BEAT_DELAY_MS`'s role (now `SPEEDS`), the "no side effect in an updater"
  comment's reasoning. Holds the `useReducer`, the single timer effect, speed buttons (1×/3×/5×,
  `aria-pressed`), **Skip to end of fight**, **Skip to end of floor**, the header, the line-up and
  the log of the current fight, and **Debug: Copy fight as JSON** (async `navigator.clipboard.
  writeText`, failure text shown on screen, kept out of every tested helper). Fight views are
  built once per descent with `useMemo`. Keyed by the descent id by `RunScreen`.
- **`SidePanel.tsx`**: always rendered; reads the store, `sidePanelRows`, the two notes.
- `src/app/App.tsx` composes them; `src/index.css` gets minimal layout rules only.
- Stale comments fixed: `newGame.ts` header ("Not wired into the UI yet…"); `CombatDemo.tsx`'s
  header (the "see demoFight.ts" line) is rewritten in the moved file.

### Not touched

Nothing under `src/engine`, `src/state` or `src/data`. No new dependency. No `__fixtures__`
import from any demo file (tests may use inline data). `pinBiome`, the hub, New game, Debug:
Record boss kill: G2 / not in scope.

### Rename map

`src/ui/CombatDemo.tsx` → `src/ui/DescentViewer.tsx` (plain `mv`). `groupIntoBeats` and
`describeEvent` move out of it to `src/app/eventText.ts`.

## Golden policy (from the kickoff)

**Byte-identical.** No file under `src/engine`, `src/state` or `src/data` changes, so every golden,
every store test, the three `balance-ci-*` tests and the corpus digest stay byte-identical; the
corpus digest is not regenerated. No new golden. New tests are focused unit tests in `src/app`
(jsdom project) on real content, with the arithmetic and setup stated in comments; the one
integration test (the replay) compares against the record's own events, not a pasted expected
value. `src/app/newGame.test.ts` is **not changed** (`startNewGame` keeps its contract).
Proof: `git diff --stat origin/main -- src/engine src/state src/data` empty. If anything seems to
need a change there, I stop and ask.

## Mechanisms and the test that fails without each

(Every file below is `src/app/<name>.test.ts`.)

| Mechanism | Test | Fails when |
| --- | --- | --- |
| Names, never ids | `fightView.test`: for each of the 3 specs, start at a pinned seed through `startRun`, descend floor 1 (and floor 2 at the end of the run if cleared), for every record render every event with `describeEvent` and the line-up; no output string contains any id of either party (ids collected from the parties), and the raw events do contain ids (the check is sensitive) | `label` returns the id |
| Name lookup covers bosses and adds | `names.test`: parties from `generateFloor` for floors 10, 20 and 30 over `BIOMES` (all three have a boss) are all named by `DEMO_NAMES`; a template in no table throws, no fallback | the boss/add rows removed from `buildNameTable` (throws on the Broodmother etc.) |
| Spell name from set-up | `fightView.test`: Sorcerer starter record, `spellName(starterId, 0)` is `Arcane Bolt`, slot 1 is the first regular gem's name (`record.playerParty` slot 0 is that regular gem, so the two reads differ); also any `SpellCast` slot-0 event in the real descent renders `Arcane Bolt` | spell read from `record.playerParty` |
| HP from set-up | `fightView.test`: inline registries with an inline passive trait (a `stat-modifier` on health, shape as in `effective-stats.test.ts`) on an inline creature: line-up HP = set-up effective max, not `baseStats.health` | HP read from the record's party |
| Level in the line-up | same test: level comes from the set-up creature | n/a beyond the above (equal today); asserted for completeness |
| Repeated-name labels | `fightView.test`: two same-name creatures on one side → `(ally 1)`/`(ally 2)`; same species on both sides → `(ally n)` and `(foe n)`; a unique name bare; counted over both parties (a name once per side is *repeated*); ids that are prefixes of each other (`x-1`, `x-10`) resolve by exact match | per-side counting; prefix matching; side/slot dropped |
| Event text moved, with labels | `eventText.test`: a `Record<CombatEvent['type'], CombatEvent>` table (compile-time exhaustive) with the expected 3.5 line for each type, labels substituted; `SpellCast` single and AoE print the spell name | any template changed; slot printed |
| Beat split | `eventText.test`: empty log; log without a beat start (one beat); leading events before the first `TurnStarted`; `TriggerFired` mid-turn starts a new beat; consecutive starts | any change to `isBeatStart` or the flush |
| Info line vs generation | `floorPicker.test`: for every floor 1..`contentFrontier(BIOMES)` (30), `floorInfo` boss flag and fight count equal `generateFloor`'s output (`fights.length`, `fights[0].boss` defined); an inline boss-less copy of the Overgrowth biome: floor 10 is ordinary (`fightCount(10)` fights, no boss). Floors 10/20/30 are boss floors with one fight | `fightCount` used on a boss floor (1 ≠ 19+); `isBossFloor` alone (boss-less floor 10 mis-flagged) |
| Picker never throws | `floorPicker.test`: `""`, `"abc"`, `"2.5"`, `"-3"`, `"0"`, `" "`, `"1e3"`, `"99999999999999999999"` and a 400-digit string through `parseFloorField` → real store `canDescend` and `floorInfo` never throw; each refused with the expected reason (`floor-out-of-reach`, or `beyond-content-frontier` for huge); info line `null` for ≤ 0 / non-whole | the parse removed (`biomeForFloor` throws on 0) |
| Pre-fill | `floorPicker.test`: `prefillFloor(0)` is 1, `prefillFloor(7)` is 7 (`deepestFloor` plays no part) | pre-fill from `deepestFloor` |
| Start path | `startRun.test`: spy store records calls: exactly `newGame({seed})`, `setSpec(id)`, `runScriptedIntro()`, in that order; on a real `createGameStore()` the resulting state (collection with starter + Unicorn, `chosenSpec`, `runSeed`, party XP) equals the three calls made by hand | a call dropped or reordered (spy order; `runScriptedIntro` throws without `setSpec`) |
| Seed field | `startRun.test`: `"abc"`, `"-1"`, `"1.5"`, `"4294967296"`, `"1e3"` refused, store untouched (spy sees no call); `"0"` and `"4294967295"` accepted; blank draws from the injected source; Random is `generateRunSeed` | validation removed (`newGame` throws) |
| Refusal text | `refusals.test`: `Record<DescendFailureReason, string>` and `Record<SeedRefusal, string>` tables (compile-time exhaustive) assert each text is non-empty, distinct, and carries no phase id | a case missing from the switch (type error) or merged |
| Fight rows | `fightList.test`: inline records with stated numbers: 3 `RoundStarted` → rounds 3; 2 enemy `CreatureDied` + 1 player `CreatureDied` → kills 2; XP 7 from `xpBanked` (kills would give another number); levels in `[1,1,3]`, after `[2,1,3]` → one level-up text; a duplicated name uses its label | kills by id string; XP recomputed; side guessed |
| Boss result line | `descentText.test`: `bossDefeated` null → null; `broodmother` absent from `before` → first clear (+100); present → not a first clear; unknown boss id throws | `before` ignored / read after |
| Snapshot before descend | `presence.test`: with a store where `recordBossKill('broodmother')` ran, a descent flow helper (below) reports not-first-clear | snapshot taken after `descend` |
| Perk points | `perkPoints.test`: earned = 100 × bosses; spent = Σ level × cost; free = difference; for every perk of every spec at a budget of 100, `canSetPerkLevel(perk, level + 1).ok` is true exactly when `cost ≤ free`, and a purchase reaching `spent > earned` is `over-budget` | spent restated wrongly (the boundary comparison breaks) |
| Side panel rows | `sidePanel.test`: after a real start and a descent, each row (spec name, seed, floors, biome names, bosses, points, currencies) equals the store's values; the two notes present | a row dropped |
| Playback | `playback.test`: wait→play; ticks cross fights; stops (`done`, delay null) on the floor's last beat; skip-fight lands on the fight's last beat and `playing` continues (and is `done` on the last fight); skip-floor → last fight fully revealed, `done`; jump during the wait → `playing` at fight i with delay = speed; speed change keeps `fight`/`revealed`; delays 3000 / 500 / 167 / 100 / null | any transition changed |
| Copy fight as JSON | `copyFight.test`: real-content store, `recordBossKill('broodmother')` and `setPerkLevel` on the spec's functional perks (data order, budget 100, as the simulator does) so `playerEffects` is non-empty, `descend(1)`; for **every** record: `fightToJson` → `JSON.parse` → `createCombat({ ...parsed, registries })` → `resolveFight` events deep-equal `record.events`; the same fight rebuilt **without** `effects` differs for at least one record (the test is sensitive) | effects left out of the JSON |
| Presence | `presence.test`: described under "The presence smoke test" | see there |

Mechanisms that live only in a component (the single timer effect, `useMemo` of views, the
clipboard call, the snapshot-then-descend call in `RunScreen`) have no unit test: the kickoff says
components aren't unit-tested (no Testing Library). Their pure parts are above, and the
click-through exercises the rest ("no stacked timers" run). To keep the snapshot rule testable,
the descend-and-snapshot step is a pure `src/app/descendFlow.ts`: `runDescent(store, floor)` →
`{ ok: true, outcome, bossesBefore, bossesAfter } | { ok: false, reason }`, which `RunScreen` calls
(ASSUMPTION 3).

### The presence smoke test (`src/app/presence.test.ts`)

At a pinned seed (found while building: one whose floor 1 clears for the default spec; the test
asserts `cleared`, so a seed that stops clearing fails loudly), on `createGameStore()` with the
default deps: `startRun` → the starter and the Unicorn owned; `runDescent(1)`: 10 `fightRecords`,
each with a numeric `seed`, non-empty `playerParty` and `enemyParty`, and a `playerEffects` array;
the last record's `partyLevelsAfter` each above the first record's `playerParty` levels;
`canDescend(31)` and `descend(31)` → `beyond-content-frontier`, with `descendRefusalText` text; all
six `setPartySlot(i, null)` then `descend(1)` → `empty-party`, with its text. Fails if the intro
grant, the per-fight record, or either refusal path is removed.

### Run start

`startRun.test`'s spy test plus the real-store equivalence test above (no `createCombat` is called
by `startRun` itself; the intro runs inside the store).

## Gates (all green before reporting)

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`. The report reconciles the test
count file by file against `main` (new tests only under `src/app`; `newGame.test.ts` unchanged),
with the rename map and the event-text diff against `main` showing only label and spell-name
changes. Comments cite `<path>.md#<anchor>` only, state why not what, and no string literal or
test title holds a phase id.

## Report extras

- The browser click-through, every item in the kickoff's list (run via the `run` skill),
  evidence in `evidence/` only if a script's table is cited.
- **Spec questions** to carry: `engine/generation.ts`'s "Never imported by src/ui/src/app"
  comment goes stale if the demo imports `BiomeData` / `SpeciesCreature` types (it does, for the
  name table); `MAX_RUN_SEED` is restated in `src/app` because the store does not export it.
- **Content changes:** none. **To delete:** none (`CombatDemo.tsx` is moved, not deleted).
- `record.md` written at the end.

## Assumptions checklist

- [ ] **ASSUMPTION 1:** playback uses a reducer and one state-keyed `setTimeout` effect instead of
      3.5's `setInterval` ref plus `clearTimer()`; 3.5's beat grouping, pace and event text are
      moved unchanged. (Deviates from "move the timer handling"; chosen to make a single clock
      owner structural.)
- [ ] **ASSUMPTION 2:** a speed change during the 3 s wait restarts the wait; elsewhere it keeps
      the position.
- [ ] **ASSUMPTION 3:** one more pure module than the kickoff lists, `descendFlow.ts`
      (`runDescent`: snapshot `bossesCleared`, call `descend`, return before/after), so the
      first-clear snapshot rule has a unit test.
- [ ] **ASSUMPTION 4:** the seed field accepts only `/^-?\d+$/` text (so `1e3`, `0x10`, `+5` are
      refused as not a whole number); a blank field draws a seed at Start.
- [ ] **ASSUMPTION 5:** the floor field accepts only trimmed `/^\d+$/`; any other text is `NaN` and
      is refused by `canDescend` as `floor-out-of-reach`.
- [ ] **ASSUMPTION 6:** the label slot `n` is the creature's 1-based position in its party array
      (equal to `slot + 1` for every generated party); side words are "ally" and "foe".
- [ ] **ASSUMPTION 7:** wording: `Defeated <boss>: first clear, +100 perk points` /
      `Defeated <boss>: already cleared, no perk points`; level-up text `<label> 1 → 2`; floor line
      `Floor n: cleared` / `Floor n: lost at fight k of N`. No phase ids in any string.
- [ ] **ASSUMPTION 8:** the viewer shows only the current fight's line-up and log (the log resets
      on each fight; the fight list is where earlier fights are revisited by jumping).
- [ ] **ASSUMPTION 9:** during the wait the viewer pane shows a "starting shortly" note and the
      jump controls; Skip to end of fight is disabled until playback starts.
- [ ] **ASSUMPTION 10:** Copy fight JSON is pretty-printed (2 spaces); its shape is exactly
      `{ seed, player: { party, effects }, enemy: { party } }`.
- [ ] **ASSUMPTION 11:** the Copy-as-JSON test's sensitivity check (the fight differs without the
      effects) holds for the perks bought; verified while building, and the perk choice adjusted
      if it does not.
- [ ] **ASSUMPTION 12:** a pinned seed exists whose default-spec floor 1 clears; found while
      building, asserted by the smoke test.
- [ ] **ASSUMPTION 13:** no component test (no Testing Library, per the kickoff); the timer effect
      is covered by the reducer tests plus the click-through's "no stacked timers" run.
- [ ] **ASSUMPTION 14:** the name table is built from `STARTERS` (the four standalone creatures) and
      `BIOMES`, importing `data/species/starters` directly, since `DEFAULT_DEPS` is not exported.
- [ ] **ASSUMPTION 15:** the kickoff's "once per viewed fight" for the set-up fight is met by
      building every fight's view once per descent in a `useMemo` (≤ 39 `createCombat` calls on the
      deepest authored floor), not lazily on first view.
