# Kickoff — Phase 4.5 — Slice G2: The demo, the hub

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/store.md` (`spec/store.md#store-actions`, `spec/store.md#how-store-actions-fail`,
  `spec/store.md#collection-shape`, `spec/store.md#newgame`); in `spec/creatures.md`:
  `spec/creatures.md#identity-and-rarity`, `spec/creatures.md#affinity`,
  `spec/creatures.md#trait-and-gem-slots`, `spec/creatures.md#levels-and-xp`,
  `spec/creatures.md#souls`, `spec/creatures.md#roster-and-party`, `spec/creatures.md#instance`;
  in `spec/progression.md`: `spec/progression.md#specializations`, `spec/progression.md#perks`,
  `spec/progression.md#perk-points`, `spec/progression.md#spending-perk-points`,
  `spec/progression.md#swapping-specialization`, `spec/progression.md#specializations-are-data`,
  `spec/progression.md#inert-perks`.
- `CONVENTIONS.md#every-feature-phase-ships-a-demo`, `CONVENTIONS.md#source-folders`,
  `CONVENTIONS.md#test-environments`, `CONVENTIONS.md#comment-why-not-what` (string literals
  included), `CONVENTIONS.md#balance-simulator` (the first-boss-clear run below).
- The brief: `phases/4.5/brief.md#hub-g2`, `phases/4.5/brief.md#store-use`, G2's share of
  `phases/4.5/brief.md#tests-and-verification`, `phases/4.5/brief.md#demo-golden-rule`,
  `phases/4.5/brief.md#the-demos-game-layer-homes`, the (G1, G2) line of
  `phases/4.5/brief.md#assumptions`; `phases/4.5/G2/brief.md`. G1's record
  (`phases/4.5/G1/record.md`) says what G1 built and where.
- Code, before planning:
  - G1's demo: `src/app/App.tsx`, `src/ui/RunScreen.tsx`, `src/ui/SidePanel.tsx`,
    `src/ui/StartScreen.tsx`, `src/ui/DescentViewer.tsx` (how it is keyed and owns its timer),
    `src/app/refusals.ts`, `src/app/names.ts`, `src/app/startRun.ts`, `src/app/sidePanel.ts`,
    `src/app/floorPicker.ts` (`parseFloorField`, the free-text pattern), `src/app/fightView.ts`
    (the line-up line).
  - `src/state/store.ts`: `GameState`, `PARTY_SIZE`, `GameActions` and the `Summon…`,
    `SetPartySlot…` and `SetPerkLevel…` result types, `checkSummon`, `checkSetPartySlot`,
    `checkSetPerkLevel`, `addInstance`, `grantCreatureIfUnowned`, `setSpec`, `recordBossKill`,
    `useGameStore`.
  - `src/state/rewards.ts`: `Instance`, `staticCreatureIdFor`, `applyXpGain`, `perkPointsFor`;
    `xpForNextLevel` in `src/engine/leveling.ts`; `SpeciesCreature` in `src/engine/generation.ts`;
    `Trait` in `src/engine/effect-types.ts`.
  - `src/data`: `specializations.ts` (`PerkDef`, `resolvePerkEffects`, `SPECIALIZATIONS`) and the
    known-inert list in `specializations.test.ts`; `creatures.ts`; `registries.ts`;
    `spells/index.ts` (`ALL_SPELLS`); `balance.ts`.
  - `src/state/balance-sim.ts`: the player-policy header, `orderedParty`, `isFunctionalPerk`, the
    start of `runSeed` (the first-boss-clear run follows this policy).

## Scope

The second half of the run-loop demo, all on G1's screens and the one store:

- the **hub** sections (`phases/4.5/brief.md#hub-g2`): **Party** (six slot dropdowns calling
  `setPartySlot`), **Collection** (every owned instance outside the party, one creature line
  each; party rows use the same line), **Souls** (every creature with soul progress above 0, its
  %, **Summon**), **Perks** of the current spec (level / max, cost per level, a level field,
  **Refund all**, the inactive label), the **spec switcher** (the other specs only), **New game**
  and **Debug: Record boss kill**;
- the instance labels (the Instance labels bullet of `phases/4.5/brief.md#hub-g2`);
- the refusal text for `summon`, `setPartySlot` and `setPerkLevel`;
- the pure helpers in `src/app` with their unit tests;
- the click-through, including a **first boss clear reached through the UI**
  (`phases/4.5/brief.md#tests-and-verification`), which G1 left to this slice.

**Not in this slice:** any change under `src/engine`, `src/state` or `src/data`; `pinBiome` (the
Biome Atlas's); script assignment (nothing sets `Instance.scriptId` yet); saving; any change to
G1's viewer, floor picker, start screen or side panel beyond placing the hub beside them; any new
dependency.

## Golden policy

**Byte-identical** (`phases/4.5/brief.md#demo-golden-rule`): G2 changes no engine, store or data
code, so every golden, every engine and store test and the corpus digest stay byte-identical. If
the hub seems to need an engine, store or data change (an export, a field, a comment fix), stop
and ask: it is never the coding agent's call.

Existing `src/app` tests may gain cases (`refusals.test.ts` will); none loses or changes one.
Every changed test file is listed in the report's test count.

## Traps

**The hub restates no rule**

- **XP to the next level** is `xpForNextLevel(level, config)` (`src/engine/leveling.ts`) with
  `DEFAULT_BALANCE_CONFIG`, the config `useGameStore` was built with; never `20 × level²` written
  out. `Instance.xp` is the XP into the current level (`applyXpGain` carries the remainder), so
  the line reads "xp / threshold".
- **Affinity, rarity, traits and the role script are derived from the instance's template**, never
  stored (`spec/creatures.md#instance`): `staticCreatureIdFor(instance)`, then the template by
  exact id in `ALL_CREATURE_TEMPLATES`. `staticCreatureIdFor` throws on a fusion source; let it.
  Trait names come from `DEFAULT_REGISTRIES.traits` (`Trait.name`), spell names from
  `ALL_SPELLS`; a miss throws in the helper, never falls back to an id. Scripts have no name: the
  role script prints its id, `instance.scriptId ?? template.defaultScriptId` (the `null` meaning
  is the data shape's, `spec/creatures.md#instance`).
- **Gems** are the instance's stored `gems`, one per regular slot, by spell name; a `null` slot
  prints as empty. Print what the array holds, don't hard-code 3. Innate spells aren't gems and
  aren't on the line.
- **The inactive label** is `resolvePerkEffects(perk, perk.maxLevel)` empty, as the brief says.
  The simulator's `isFunctionalPerk` is the same predicate: don't import `state/balance-sim.ts`
  into the app bundle; the helper's test checks the two agree on every perk of every spec, and
  that the label lands on exactly the nine ids of the known-inert list in
  `specializations.test.ts` (copied into the test, since a test file isn't importable data).
- **Six rows** come from `activeParty` (`PARTY_SIZE` long), not a literal 6.

**Party and labels**

- **Swap semantics are the store's** (`spec/store.md#store-actions`). A dropdown's change is one
  `setPartySlot(slot, instanceId | null)` call: "empty" maps to `null`, and the UI never
  pre-empties a slot or moves the occupant itself. Each dropdown offers "empty" plus every owned
  instance, party members included (picking one swaps). `canSetPartySlot`'s reasons
  (`slot-out-of-range`, `unknown-instance`) can't be reached from these dropdowns, but each has
  text by an exhaustive switch.
- **Labels count over the whole collection**, party and bench together, in collection order (the
  `Map`'s insertion order, which is creation order: nothing removes an instance). Counting per
  section or per side gives two "#1"s for one name. A unique name prints bare, so the first
  Snapjaw's label gains "#1" when a second one is summoned: expected. Option values are instance
  ids; labels are what shows.
- **Emptying the party is allowed** (`setPartySlot` with `null` on the last member); `descend`
  then refuses with `empty-party`, which G1's picker shows.

**Souls and summoning**

- `summon` drops the new instance into the lowest free party slot, else the bench, and leaves
  `soulProgress` alone, so **Summon** stays available at 100% (duplicates,
  `spec/creatures.md#souls`). The row's button is greyed by `canSummon` with its reason as text.
- Names come through G1's `creatureName` table (throws on a miss). Bosses never have soul.

**Perks and the spec switcher**

- **The level field is free text** like the floor field: only trimmed digits parse; anything else
  is `NaN`, which `canSetPerkLevel` refuses as `invalid-level`. `""`, `"abc"`, `"2.5"`, `"-1"` and
  a level above max all show a refusal; none throws. The field is a draft in UI state; **level /
  max reads `perkSpend`** (a perk absent from it is at 0), so it is right after **Refund all** or
  a switch whatever the drafts hold. Key the perk rows by spec and perk id, so a switch drops
  the old spec's drafts.
- **The switcher offers the other specs only**, in the data's order: `setSpec` on the current spec
  clears the spend with no swap. `setSpec` throws on an unknown id, so it is only ever called
  with a listed spec's id. A switch grants the new spec's starter if it isn't owned (into the
  first free slot): the party and collection show it.
- **Debug: Record boss kill** picks a boss from `BOSS_CREATURES_BY_ID` (named by `bossName`):
  `perkPointsFor` counts every id `recordBossKill` is given, so free text or a non-boss id would
  mint points. A repeat is the store's no-op.

**Screens and timers**

- **New game** only returns to the start screen (App's UI state). The store resets when Start runs
  `startRun`, the one start path (`phases/4.5/G1/record.md`); New game never calls `newGame`
  itself. Until then the side panel shows the old run, which is fine.
- **A hub action never touches playback.** The viewer is keyed by the descent's id and owns its
  timer; the hub must not unmount or re-key it (no tab switch that unmounts the viewer, no hub
  state in its key). A summon or a party change mid-playback leaves the reveal running at its
  speed.
- **Zustand and React 19:** don't select `[...s.collection.values()]` or a fresh object in a
  selector; read the state as G1's screens do and derive in a helper.
- **Player-facing strings carry no phase ids** (`phases/4.5/brief.md#assumptions`, the (G1, G2)
  line): the inactive label is "inactive (its system isn't built yet)". The plan confirms or
  corrects it.
- **Components stay thin**: every derived line, row, label and refusal text is an `src/app`
  helper with a test; no Testing Library, so the click-through covers the components.

**The first-boss-clear run**

- It is the store's own descent sequence replayed through the UI, so it is only as exact as the
  replay. A floor's draw derives from `runSeed` and the store's run counter: any extra `descend`
  in that run (a trial, a misclick, a re-run after a failed step) desynchronises it from the scan.
  Run the other click-through items in separate runs.
- The scan drives a default-deps store (`createGameStore()`) through the simulator's policy
  (summon each id the first time its soul reaches 100%; party = `orderedParty`, the six
  highest-level instances; push after a clear, re-farm `deepestFloor` after a failed push), not
  `runSeed` itself, whose store has the probe scripts and whose boss-floor probe runs an extra
  fight before restoring. It logs every action, and the browser script replays that log, checking
  the side panel's deepest floor after each descent against the scan's. Perks stay unbought until
  the boss clear: before it, the budget is 0.
- The scan and the browser script are one-off tools outside the repo; their printed tables go in
  `evidence/` (`WORKFLOWS.md#what-a-mailbox-keeps`).

## Must stay green

All gates in `coding-rules.md`. Every existing test, golden and the corpus digest, byte-identical,
the three `balance-ci-*` tests included. `npm run build`.

## The PR must prove

- **Byte-identical:** `git diff --stat origin/main -- src/engine src/state src/data` is empty.
- **Test count**, reconciled file by file against `main`: new tests only in `src/app`, and every
  changed existing test file only gains cases.
- **Each helper, with the test that fails without it:**
  - *labels:* two same-name instances get "#1" and "#2" by collection order across party and
    bench, a unique name prints bare, and the dropdown options and the creature lines carry the
    same label; fails with the ordinal counted per section, and with it dropped;
  - *the creature line:* for every instance a real-content run owns (each spec's starter, the
    Unicorn, a summon): name, level, "xp / threshold", affinity, rarity, role script, trait names,
    gem names; the threshold follows an inline config with a different XP curve (fails with the
    curve written out); trait and spell names (fails with ids); a `null` gem prints empty;
  - *party rows:* each dropdown's options are "empty" plus every owned instance, and a pick maps to
    exactly one `setPartySlot` call with `null` for "empty"; on a real store, picking a benched
    instance for an occupied slot benches the occupant and picking a party member swaps the two
    (the store's semantics through the helper's call, not re-implemented);
  - *souls rows:* only creatures above 0%, named, with their % and `canSummon`'s reason; a real
    store at 100% summons twice, and the two instances are labelled "#1" and "#2";
  - *perk rows:* level / max reads `perkSpend` after a set, after **Refund all** and after a switch;
    the field's `""`, `"abc"`, `"2.5"`, `"-1"` and max + 1 show `invalid-level` and don't throw;
    `over-budget` shows one level past the free points; the inactive label is exactly the nine
    known-inert ids and agrees with `isFunctionalPerk` on every perk;
  - *the spec switcher:* offers the other specs, in data order; through it on a real store
    (`recordBossKill`, `setPerkLevel`, switch), `perkPointSummary().spent` is 0 and the new
    starter is owned;
  - *Debug:* the boss pick lists exactly `BOSS_CREATURES_BY_ID`, by name;
  - *refusal text:* every `SummonFailureReason`, `SetPartySlotFailureReason` and
    `SetPerkLevelFailureReason` has text, by an exhaustive switch.
- **The browser click-through**, G2's share of `phases/4.5/brief.md#tests-and-verification`:
  - Party: a swap of two party slots, a benched instance onto an occupied slot, a slot emptied,
    the whole party emptied (Descend shows `empty-party`), refilled; a fight after a reorder
    shows the new line-up order;
  - Collection: lines for party and bench, with gems by spell name;
  - Souls: **Summon** greyed with its reason below 100%; a summon at 100% into a free slot and one
    into the bench (full party); a second summon of one creature, labelled "#2";
  - Perks: Debug: Record boss kill for each boss and a repeat (no change); levels bought;
    `invalid-level` and `over-budget` on screen; an inactive perk labelled; **Refund all**;
  - the spec switcher offering only the other specs; a switch refunding perks bought through
    Debug, the side panel's spent back to 0, and the new spec's starter in the party or
    collection;
  - **New game** back to the start screen, and a fresh Start;
  - hub actions mid-playback (a summon, a reorder, a perk) with the reveal running on at 1× at
    about two beats a second;
  - **the first boss clear**: the scan's table in `evidence/` (spec, seed, floor runs to the
    floor-10 clear for each candidate, the pick), the browser script's per-descent log matching
    the scan's deepest floor, then on screen the boss result line as a first clear with +100
    perk points, the side panel at 100 earned, and those points spent on a perk.
- **ASSUMPTION** (G1, G2): the inactive label string, confirmed or corrected.
- **Spec questions:** anything the docs don't answer, and any engine or store comment the hub
  makes stale.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#hub-g2`: the instance-label rule (name and
  level, "#k" by collection order for a shared name, one label for dropdowns and lines); the spec
  switcher offers the other specs only (Duncan's calls, on the design agent's recommendations);
  **Debug: Record boss kill** picks from the data's bosses, since the earned total counts any id
  (a precision the store's behaviour forces, not a new direction).
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#tests-and-verification`: the click-through
  shows a first boss clear, reached through the UI by a scripted run of the simulator's policy
  (Duncan's call: G1's click-through left the boss result line to G2, and no fresh party reaches
  floor 10 without one).
- `.claude/phases/4.5/G2/brief.md`, `phases/4.5/G2/brief.md#done-when`: the first boss clear added.
