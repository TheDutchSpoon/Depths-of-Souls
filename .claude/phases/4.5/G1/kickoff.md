# Kickoff — Phase 4.5 — Slice G1: The demo, descent loop and viewer

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/store.md` (all of it: every action, query and refusal reason the demo drives,
  and `spec/store.md#a-descents-outcome`, the record the viewer reads); in `spec/run.md`:
  `spec/run.md#a-descent-is-atomic`, `spec/run.md#content-frontier`,
  `spec/run.md#fights-per-floor`, `spec/run.md#boss-floors`, `spec/run.md#rewards`,
  `spec/run.md#currencies`, `spec/run.md#scripted-intro`, `spec/run.md#biomeforfloor`,
  `spec/run.md#boss-floor-generation`; `spec/progression.md#perk-points` and
  `spec/progression.md#spending-perk-points` (the side panel's perk points);
  `spec/creatures.md#innate-spells` and `spec/combat.md#fight-setup` (why the viewer reads a
  set-up fight).
- `CONVENTIONS.md#every-feature-phase-ships-a-demo` (the baseline demo UX),
  `CONVENTIONS.md#source-folders`, `CONVENTIONS.md#test-environments`,
  `CONVENTIONS.md#comment-why-not-what` (string literals included),
  `CONVENTIONS.md#every-failing-fight-is-reproducible-from-its-seed`.
- The brief: G1's parts of `phases/4.5/brief.md#the-demo` (`phases/4.5/brief.md#store-use`,
  `phases/4.5/brief.md#start-screen-g1`, `phases/4.5/brief.md#floor-picker-g1`,
  `phases/4.5/brief.md#descent-result-and-viewer-g1`, `phases/4.5/brief.md#side-panel-g1`, and
  G1's share of `phases/4.5/brief.md#tests-and-verification`);
  `phases/4.5/brief.md#demo-golden-rule`; the G1 lines of `phases/4.5/brief.md#assumptions`;
  `phases/4.5/G1/brief.md`. The hub sections are G2's.
- Code, before planning: `src/ui/CombatDemo.tsx` (unused since the 3.5 demo was retired: its
  `groupIntoBeats` and `describeEvent` are what this slice moves; its timer handling is replaced,
  `phases/4.5/G1/brief.md#known`); `src/app/App.tsx`
  (the stub), `src/app/newGame.ts` and its test, `src/main.tsx`; in `state/store.ts`,
  `GameActions`, `FightRecord`, `FloorOutcome`, `checkDescend`, `checkSetPerkLevel`, `DEFAULT_DEPS`
  and `useGameStore`; `findStaticCreature` and `perkPointsFor` in `state/rewards.ts`; the start of
  `runSeed` in `state/balance-sim.ts` (the run start the demo matches); `createCombat` in
  `engine/combat.ts` (what fight setup does to the parties); `biomeForFloor`, `isBossFloor`,
  `generateFloor`'s boss branch and `contentFrontier` in `engine/generation.ts`; `fightCount` in
  `engine/curves.ts`; `OVERGROWTH_BOSS` and `OVERGROWTH_BIOME.boss` in
  `data/species/overgrowth.ts`.

## Scope

The first half of the run-loop demo, replacing the stub on the live site:

- one real store (`useGameStore`), the demo holding UI state only;
- the **start screen**: spec pick, seed field with **Random**, and Start, which runs `newGame` →
  `setSpec` → `runScriptedIntro` silently;
- the **floor picker**: the field, **Deepest + 1**, **Descend**, the info line, every refusal as
  text;
- the **descent result** with its fight list, then the paced **viewer**: 3.5's beats and event text
  moved over, three speeds, skip to end of fight, skip to end of floor, jump to a fight, a line-up
  per fight, creature and spell names, the boss result line, **Debug: Copy fight as JSON**;
- the always-visible **side panel**;
- the pure helpers in `src/app` with their unit tests, and the presence smoke test.

**Not in this slice:** the hub (party, collection, souls, perks, the spec switcher, New game,
Debug: Record boss kill: all 4.5-G2); any change under `src/engine`, `src/state` or `src/data`; any
new dependency; saving; trait and status names in the log (their ids print as 3.5 printed them);
sprites, bars or animation.

## Golden policy

**Byte-identical** (`phases/4.5/brief.md#demo-golden-rule`): no file under `src/engine`,
`src/state` or `src/data` changes, so every golden, every store test and the corpus digest stay
byte-identical. If the demo seems to need an engine, store or data change (an exported helper, a
new field, a comment fix), stop and ask: it is never the coding agent's call.

Existing tests elsewhere: only `src/app/newGame.test.ts` changes: `startNewGame` is retired into
the start helper, so its cases move to the start helper's test, listed in the report's test count.

New tests: all in `src/app` (the jsdom project), on real content; the list is under **The PR must
prove**.

## Traps

**Reading the record**

- **The record's parties are fight-setup input, not the fight**
  (`spec/store.md#a-descents-outcome`). `createCombat` prepends innate spells to `equippedSpells`
  and sets `currentHp` to effective max Health (`spec/combat.md#fight-setup`). A `SpellCast`'s
  `gemSlot` indexes the set-up list: read from `record.playerParty`, the Sorcerer starter's innate
  Arcane Bolt (slot 0) gets its first regular gem's name. The record party's `currentHp` is
  `baseStats.health`, which equals the set-up HP today only because no shipped effect changes Health
  at setup, so every real-content test passes with the shortcut. Build the set-up creatures once per
  viewed fight with `createCombat` over the record's seed, parties and effects and the registries
  `useGameStore` was given (`STOCK_SCRIPTS_BY_ID`, `TRAIT_REGISTRY`, `STATUS_REGISTRY`), and read
  spell names and line-up HP from them. The helper takes the registries as an argument, so its test
  can pass inline ones.
- **Names come from `origin.templateId`, never from parsing a `CreatureId`**
  (`phases/4.5/brief.md#the-per-fight-record`). Map an event's creature id to its creature by exact
  match on the parties' `id` field. `findStaticCreature` doesn't find every template: a boss (the
  Broodmother, `broodmother`) is in no species pool, only in `BiomeData.boss.creature`. The name
  lookup covers the standalone creatures, every biome's pool and every biome's boss, and a creature
  it can't name throws in the helper; it never falls back to the id.
- **Names collide.** Two Snapjaws on one side, or one species on both sides, are common. The rule
  is in `phases/4.5/brief.md#descent-result-and-viewer-g1`: side and 1-based slot on every
  occurrence of a repeated name, a unique name bare. Count names over both parties of the fight,
  not per side.
- **Levels in and out.** Levels going into fight n are `record.playerParty[i].level`;
  `partyLevelsAfter` is in `playerParty` order. A level-up is the pairwise difference. A fight's XP
  is the record's `xpBanked`, never recomputed from kills.
- **Kills** in the fight list are enemy-side `CreatureDied` events, the side read from the parties:
  the same events rewards read (`spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log`).
- **First boss clear.** Snapshot `bossesCleared` before calling `descend`: by the time it returns,
  the store has already added the boss. A first clear is a `bossDefeated` that the snapshot lacks.

**The floor picker**

- **`biomeForFloor` throws for a floor below 1** (no decade) and for `NaN`. The field takes any
  input, so `""`, `"abc"`, `"2.5"`, `"-3"` and `"0"` must all reach `canDescend` and show a
  refusal, never a throw. The info line shows only for a whole number ≥ 1
  (`phases/4.5/brief.md#floor-picker-g1`).
- **The info line restates `generateFloor`'s branch**, since G1 can't export one from the engine: a
  boss floor is `isBossFloor(floor)` **and** a resolved biome with a `boss`, and has one fight; any
  other floor has `fightCount(floor, config)`. A boss-less biome's tenth floor is an ordinary
  floor. A test pins the line against `generateFloor` (below).
- The info line reads the store's `atlasPins` and `runSeed`, and `BIOMES` and
  `DEFAULT_BALANCE_CONFIG`, the values `useGameStore` was built with. Floors 31 to 100 resolve to
  placeholder biomes: the line names them, which is fine.
- **The pre-fill.** `lastFloor` is 0 at a new game, so the field starts at 1 until a floor has
  been fought (`phases/4.5/brief.md#floor-picker-g1`); `deepestFloor` is no stand-in for it.

**The start screen**

- **`newGame` throws on a seed that isn't a whole number in `0 .. 2^32 − 1`** (an impossible state
  for the store, `spec/store.md#newgame`). The seed field is free text, so the start helper
  validates it first and Start is refused with a reason (`"abc"`, `"-1"`, `"1.5"`,
  `"4294967296"`), never a thrown page.
- **One start path.** The Start button and the presence test call the same `src/app` helper (the
  store passed in); it is the only start path in `src/app`; a test that re-implements the three calls proves
  nothing about the button. `runScriptedIntro` throws if `setSpec` hasn't run.
- **Random** fills the field from `generateRunSeed`; a blank field draws one at Start. The seed on
  screen is the store's `runSeed`.

**Playback and timers**

- **One owner for the clock.** Playback is a cosmetic reveal of an already-computed log. The wait
  before fight 1 and the beat timer are both timers: every control that moves playback (a new
  descent, jump, skip fight, skip floor, a speed change) and unmount clears both before scheduling
  anything. StrictMode runs effects twice in development: an effect that starts a timer without
  returning its cleanup stacks two, which shows up as a double-speed reveal.
- **A speed change keeps the position**: it reschedules at the new rate from the current beat.
- **No side effect inside a state updater** (`CombatDemo.tsx`'s comment on why `clearTimer` sits
  in an effect).
- **Fight to fight.** Playback runs on into the next fight and stops at the floor's last beat; the
  wait before fight 1 is 3 seconds (`phases/4.5/brief.md#descent-result-and-viewer-g1`). Skip to
  end of fight lands on that fight's last beat and playback carries on from there into the next
  fight; skip to end of floor stops playback.
- **Only the latest descent is kept** in UI state; a new descent replaces it and its timers.

**Zustand and React 19**

- A selector that builds a new object, array, `Map` or `Set` on each call
  (`s => ({ a: s.a, b: s.b })`, `[...s.collection.values()]`) makes `useSyncExternalStore` warn or
  loop. Select stable fields one by one (or with `useShallow`) and derive in a helper.

**Copy fight as JSON**

- The shape is `createCombat`'s input without `registries`
  (`phases/4.5/brief.md#descent-result-and-viewer-g1`). `JSON.stringify` drops `undefined` keys and
  turns non-finite numbers into `null`: the round-trip test is what shows the shape survives.
- `navigator.clipboard.writeText` is async and rejects outside a secure context or without
  permission, and jsdom lacks it: show a failure on screen, and keep it out of the tested helpers.

**Move, don't rewrite**

- `src/ui/CombatDemo.tsx` moves with a plain `mv` to the viewer's new name (in the report's rename
  map), and `groupIntoBeats` and `describeEvent` move out to a pure `src/app` module. Against
  `main`'s text, the moved event text changes only where a creature id becomes its label and where
  `casts slot N` becomes the spell's name; every other line template stays, the `never` default
  included. Its `randomSeed` (`Math.random`) and its seed form go: the run seed is the store's.
- **Stale comments:** `CombatDemo.tsx`'s header ("see demoFight.ts", a deleted file) and
  `newGame.ts`'s ("Not wired into the UI yet: the app is still the combat demo"). If the demo makes
  an engine comment stale (`engine/generation.ts`'s "Never imported by src/ui/src/app" above the
  content shapes, if the demo imports those types), it goes under **Spec questions**, not into
  `src/engine`.

**The rest**

- **Perk points spent** has no exported helper: the store sums `level × costPerLevel` over the
  spec's perks inside `checkSetPerkLevel`. The demo's helper restates it, with a test that it agrees
  with the store's own `over-budget` boundary.
- **Player-facing strings carry no phase ids** (`phases/4.5/brief.md#assumptions`):
  `npm run docs:check -- comments` reads string literals.
- **Real content only**: no demo file imports a `__fixtures__` module
  (`CONVENTIONS.md#every-feature-phase-ships-a-demo`). Inline test data in a helper's unit test is
  a test, not the demo.
- **Components stay thin**: no game rule in `src/ui`. Everything the screen derives is an `src/app`
  helper with a test. No new dev dependency (no Testing Library), so components aren't unit-tested:
  the click-through covers them.

## Must stay green

All gates in `coding-rules.md`. Every existing test, golden and the corpus digest, byte-identical,
the three `balance-ci-*` tests included (nothing they read changes). `npm run build` with the
stub replaced by the demo.

## The PR must prove

- **Byte-identical:** `git diff --stat origin/main -- src/engine src/state src/data` is empty.
- **Test count**, reconciled file by file against `main`: new tests only in `src/app`
  (`newGame.test.ts` changed only if the plan listed it).
- **Rename map:** `CombatDemo.tsx`'s move, and the moved event text's diff against `main` showing
  only the label and spell-name changes.
- **Each helper, with the test that fails without it:**
  - *names:* over a whole real-content descent for each spec, no log line or line-up holds a
    creature id; fails with the id left in;
  - *bosses named:* the parties `generateFloor` builds for floors 10, 20 and 30 are all named;
    fails with the boss lookup removed;
  - *spells from setup:* the Sorcerer starter's cast of gem slot 0 reads "Arcane Bolt"; fails with
    the slot read from the record's party;
  - *HP from setup:* with an inline passive Health trait in the registries the helper is given,
    the line-up shows the set-up HP; fails with HP read from the record's party;
  - *the info line against generation:* for every floor from 1 to the content frontier, the boss
    flag and fight count agree with `generateFloor`'s output, and an inline boss-less biome's tenth
    floor is ordinary; fails with `fightCount` used on a boss floor, and with `isBossFloor` alone;
  - *Copy fight as JSON:* every record of a real-content descent with a perk bought (non-empty
    `playerEffects`, through `recordBossKill` and `setPerkLevel` in the test) goes through
    `JSON.stringify`, `JSON.parse`, `createCombat` and `resolveFight` to events deep-equal to the
    record's; fails with the effects left out;
  - *fight-list rows:* number, result, rounds, kills, XP and level-ups, on records whose numbers
    the test states;
  - *the boss result line:* first clear and repeat clear, from a before/after `bossesCleared`
    pair;
  - *refusal text:* every `DescendFailureReason` and every seed-field refusal has text, by an
    exhaustive switch;
  - *perk points:* earned − spent = free, and the spent figure agrees with `canSetPerkLevel`'s
    `over-budget` boundary;
  - *the beat split:* `groupIntoBeats`'s cases.
- **The presence smoke test** (`phases/4.5/brief.md#tests-and-verification`), through the start
  helper at a pinned seed whose floor 1 clears (it asserts `cleared`): the starter and the Unicorn
  owned; 10 records, each with a seed, both parties and its perk effects; the party's levels after
  the last fight above its levels going into fight 1; floor 31 refused as
  `beyond-content-frontier` and an emptied party as `empty-party`, each with the text the UI
  shows.
- **Run start:** the start helper's calls are exactly `runSeed`'s three, in its order, on a store
  with the default deps.
- **The browser click-through** in the report, G1's share of
  `phases/4.5/brief.md#tests-and-verification`:
  - a new game per spec; Random; a blank seed; an invalid seed refused;
  - the side panel after the start and after a descent (spec, seed, deepest and last floor,
    discovered biomes, bosses cleared, perk points earned, spent and free, the four currencies with
    their line, the no-saving line);
  - the picker's pre-fill at a new game; the info line on floor 1 and on floor 10; refusals for
    `0`, `2.5`, `abc`, an out-of-reach floor and `31`; Deepest + 1; Descend;
  - the result and fight list for 3 seconds, then playback from fight 1; a jump during the wait;
  - 1×, 3× and 5×, with a switch mid-fight; skip to end of fight; skip to end of floor; jump to a
    fight from the list; playback running on into the next fight;
  - the header's levels going in and XP and level-ups after, with floor 1's level-up to 2 after its
    last fight;
  - line-ups with names, levels and HP; a Sorcerer fight naming Arcane Bolt; a fight with a
    repeated name;
  - a descent that ends on a loss;
  - no stacked timers: after jumps, speed changes and a new descent during the wait and
    mid-fight, 1× still reveals about two beats a second;
  - a copied fight's JSON pasted into a scratch test, reproducing its log byte-identically;
  - the boss result line in the browser only if the run reaches floor 10 (G1 has no summoning, so
    a fresh party may not): otherwise its unit test covers it and G2's click-through shows it.
- **Spec questions:** anything the docs don't answer, and any engine or store comment the demo
  makes stale.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#descent-result-and-viewer-g1`: the log shows
  creature and spell names (trait and status ids as 3.5 printed them), and a spell name and the
  line-up's HP are read from the set-up fight (Duncan's call at kickoff: SpellCast carries only a
  gem slot, which counts the innate spells fight setup prepends).
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#start-screen-g1`: a **Random** button fills
  the seed field, the baseline demo's randomize-seed control
  (`CONVENTIONS.md#every-feature-phase-ships-a-demo`), which the brief's blank-field rule alone
  didn't give.
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#floor-picker-g1` and
  `phases/4.5/brief.md#descent-result-and-viewer-g1` (Duncan's calls at kickoff, on the design
  agent's recommendations): the field starts at 1 until a floor has been fought; the info line
  shows for a whole number ≥ 1 and a boss floor needs a biome with a boss; the 3-second wait (its
  ASSUMPTION ticked); playback runs on from fight to fight; the repeated-name rule; the Copy fight
  as JSON shape.
