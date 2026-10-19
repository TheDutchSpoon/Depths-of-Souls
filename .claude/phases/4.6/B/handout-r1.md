# Fix hand-out, round 1: 4.6-B

Branch `4.6-b`, reviewed at `f947623`. The build is correct and every mechanism but one is pinned.
This round adds one missing pin and cleans up wording that records history or names a concept the
slice deleted. No behaviour changes. Every golden expected value and the corpus digest fixture stay
byte-identical, and no existing assertion changes. Report as `report-r2.md`.

## 1. Pin the simulator's probe gate (`src/state/balance-sim.ts`, `playFloorRun`)

- `if (preview.boss && options.probeBosses !== false) probeRun = runProbe(store, floor)`: deleting
  `preview.boss &&` leaves the whole suite green (2550 passed).
- With it gone, every non-boss floor run of a party holding Pacify also descends a second time,
  for a probe whose result is thrown away. The output stays the same, because `runProbe` restores
  the snapshot, but those floor runs cost twice as much in `npm run sim`.
- Add a test that fails when the gate is removed:
  - a party creature holds Pacify, so `pickProbeCreature` finds one;
  - `playFloorRun` on a non-boss floor, with the probe on, makes exactly one descent;
  - count the store's `descend` calls through a wrapper, or the `createRng` requests through an
    injected factory.

  Keep the boss-floor case as it is (it already probes).
- Report the test's file and title, and that it fails with the gate removed.

## 2. Wording that records history (`CONVENTIONS.md#comment-why-not-what`)

A comment or test title says what the code does now, not what it used to do or what `main` did.
Reword each of these, keeping its meaning:

- `src/state/store.ts` ~1088: "…never the run counter, so every descent after the intro stays as
  it was." Instead say what it guarantees: no descent after the intro depends on the roll.
- `src/app/refusals.test.ts` ~61, title: "the seed texts are the strings the screen has always
  shown". Instead: the seed texts name the bound `MAX_RUN_SEED` (4294967295). Keep the
  assertions.
- `src/engine/generation.test.ts`:
  - ~304, the `expectedDraw` doc comment, "the copy is what `main` computed for a list where every
    biome is authored";
  - ~389, the title "…draws exactly what main drew…";
  - ~390, the comment "an inline copy of main's draw".

  What they pin is that ten authored biomes draw exactly as one draw over the whole list does.
  Say that. Keep the "checkpoint-verified" label.
- `src/state/config-reads.test.ts:1`: "The numbers that used to sit in the logic are read from the
  config". Instead: the perk points per boss, the stat growth and the specialization total are
  read from the config.

## 3. Names of the deleted content frontier

The content frontier no longer exists, in the code or in the spec. A comment, title or file name
that still names it, or "a content bound", describes something the reader can't find. Say what
happens instead: a floor whose biome has no content fights the last authored biome before it, and
the simulator's rows run to the deepest floor any seed ran.

- `src/state/balance-sim.ts:15` (the file header): "the cave has no content frontier
  (`spec/run.md#biomeforfloor`), so a seed only stops at the cap".
- `src/engine/generation.test.ts:286`, a section comment: "The cave has no content frontier: …".
- `src/state/store-reach.test.ts:2`: "with no content bound".
- `src/state/balance-sim-report.test.ts`:
  - ~249, the title "has no content bound: a floor past 30 has a row…";
  - ~516, the section comment "The floor rows have no content bound".
- `src/state/balance-sim.test.ts` ~141, the title "has every spec, a row per content floor and the
  report items". The rows are no longer one per content floor: they run to the deepest floor
  ran.
- **`src/state/store-frontier.test.ts`:**
  - rename the file to `src/state/store-deep-floors.test.ts` with a plain `mv`, and list it in
    the report's rename map;
  - reword its header comment (line 1, "There is no content frontier: …").

  Its tests and titles stay.

Then grep `src/` for `frontier`, `content bound` and `content floor`. Report every hit that is
left, with the reason it stays.

## 4. The record (`phases/4.6/B/record.md`)

Correct three statements that don't match the code:

- "the joining Unicorn's stored set from `hashIntroUnicornDraw`": the **enemy** Unicorn's set comes
  from `hashIntroUnicornDraw(runSeed)`. The joining Unicorn's stored set still comes from
  `hashGemDraw(runSeed, ordinal)`, through `rollPlayerGems`.
- "`perkPointsPerBoss` (100) and `STAT_GROWTH_PER_LEVEL` (0.25) are read from the balance config":
  only `perkPointsPerBoss` is a `BalanceConfig` field. `STAT_GROWTH_PER_LEVEL` is a constant in
  `engine/config.ts`.
- "The seed texts and the debug-boss refusal say what happened": `recordBoss` returns the store's
  result, but the Hub's Debug button discards it. It offers only real bosses, so the refusal can't
  happen there. Say that `recordBoss` returns the result.

Also correct "in `scripts/docs-check/comments.test.ts` (28 to 30)". The file went from 82 to 104
tests. Then bring the record's test totals up to date with this round's new test.

## Gates

All of `coding-rules.md`'s gates, including `docs:check -- comments`. Report the per-file test
count against `f947623`, with the rename mapped. Confirm that no file under `__golden__` or
`__corpus__` changed against `f947623`.
