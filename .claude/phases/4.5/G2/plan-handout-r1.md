# Plan hand-out — 4.5-G2, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree with the plan,
these win. Re-read `phases/4.5/brief.md#hub-g2` (its Collection bullet now says the gems are one
per regular gem slot, an empty slot shown empty).

## The first-boss-clear run (amends "The first-boss-clear run", ASSUMPTIONS 8, 9 and 12)

1. **Where it runs.** The scan is a test file inside a scratch clone of the slice branch, outside
   the repo (`WORKFLOWS.md#what-a-mailbox-keeps`), run with that clone's own
   `npx vitest run <file>`. No scratch Vitest config, nothing committed. The browser replay runs
   against the working tree's dev server.
2. **The scan composes the simulator's exported policy and restates none of it.** From
   `src/state/balance-sim.ts` it imports `INITIAL_PROGRESS`, `nextRun`, `advanceProgress`,
   `summonPass`, `applyPartyOrder`, `SIM_SEEDS`, `RUN_CAP` and `FIRST_BOSS_FLOOR`. Per candidate
   `(spec, seed)`, specs in data order, seeds `SIM_SEEDS`: `createGameStore()` with default deps;
   `newGame({ seed })` → `setSpec` → `runScriptedIntro`; the `summoned` set seeded with
   `staticCreatureIdFor` of every owned instance; `summonPass` then `applyPartyOrder` once before
   the first run; then loop: `nextRun` gives floor and kind, `descend(floor)`, `advanceProgress`,
   and, unless the run just cleared floor `FIRST_BOSS_FLOOR`, `summonPass` then `applyPartyOrder`.
   Stop at `deepestFloor >= FIRST_BOSS_FLOOR` or `RUN_CAP` floor runs. `applyPerkPlan` is not
   called: the budget is 0 before the first boss clear.
3. **The pick:** fewest floor runs to the floor-10 clear; ties by spec data order, then seed. The
   table in `evidence/first-clear-scan.md` gives every candidate's floor runs to the clear, or
   "not cleared within RUN_CAP".
4. **Cross-check of the pick.** `runSeed(spec, seed, { seeds: [], probeBosses: false, scripts:
   DEFAULT_REGISTRIES.scripts, runCap: RUN_CAP })` for the picked candidate: its `runs`' floors
   and `cleared` flags, up to the first floor-10 clear, equal the scan's one for one. The
   comparison is printed in `evidence/first-clear-scan.md`. A mismatch stops the slice and is
   reported.
5. **The log is exactly what the store received, in order:** each summon as `summonPass` returns
   it; each `applyPartyOrder` as the target id list it applied (`orderedParty` of the collection
   at that moment); each `descend` with its floor; and, before each `descend`, the `activeParty`
   (six entries, ids or empty).
6. **The replay** makes the logged calls through the UI in log order: a summon clicks that
   creature's **Summon**; a party target makes `setPartySlot(slot, ids[slot])` for slot
   `0..ids.length-1` in order through the `Party slot n` dropdowns, skipping a slot only when it
   already holds that id at that moment; a descent sets the floor field and clicks **Descend**.
   Before each **Descend** it reads the six dropdown values and compares them with the logged
   `activeParty`; after it, the side panel's deepest floor against the scan's. Either mismatch
   stops the replay and is reported. It awaits a render between steps. It replays the whole
   picked run, however many descents that is. The per-descent log goes to
   `evidence/first-clear-replay.md`; then on screen as the plan says.

## Hub (amends "Module changes, by file")

7. **Accessible names.** Each Souls row's button: `aria-label="Summon <creature name>"`. Each
   perk row's field: `aria-label="Level of <perk name>"`; its button: `aria-label="Set <perk
   name>"`. The Debug boss select: `aria-label="Boss"`. Dropdowns as the plan has them.
8. **`parsePerkLevelField`** returns `parseFloorField(text)` (`src/app/floorPicker.ts`): one home
   for what a whole-number field accepts. `floorPicker.ts` is not edited.
9. **`bossChoices`** names each boss with `bossName(id)` (`src/app/names.ts`).
10. **Layout (ASSUMPTION 7):** the hub column gets the run column's `flex: 1; min-width: 0`, so
    long creature lines wrap.

## Report notes (amends "Report notes")

11. No spec question on gems (the brief now says one per regular gem slot) and none on the
    `store.ts` comments naming `src/app`: both stay accurate.

Every other ASSUMPTION is confirmed as written.
