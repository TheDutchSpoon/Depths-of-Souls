# Report, round 2: 4.6-B

Branch `4.6-b`, HEAD `a15eb5c`, hand-out `handout-r1.md` (reviewed at `f947623`). One new test, comment and title rewording, one file rename, and a corrected record. No behaviour changed.

## Hand-out items

### 1. Pin the simulator's probe gate

- **Test:** `src/state/balance-sim.test.ts`, in `describe('the live wiring: playFloorRun on the level-30, floor-9 store')`, titled "a non-boss floor run makes one descent even when the party holds Pacify; a boss floor makes two".
- **What it does:** it wraps the store's `descend` and records each floor it is called with.
  - On a non-boss floor, `playFloorRun` with the probe on makes exactly one descent (`[4]`) and has no boss visit.
    - The floor is floor 4, previewed as `boss: false`.
    - The party holds Pacify, asserted by `pickProbeCreature` not being null.
  - On boss floor 10 (previewed as `boss: true`) it makes two descents (`[10, 10]`), and the boss visit carries a probe.
  - The boss-floor behaviour is unchanged. That half is the contrast that proves the counter sees a probe.
- **Mutation:** deleting `preview.boss &&` from `if (preview.boss && options.probeBosses !== false)` in `playFloorRun` fails the test with `expected [ 4, 4 ] to deeply equal [ 4 ]`. The suite was green with the gate gone before this test. `balance-sim.ts` was restored afterwards; its only diff is the header comment from item 3.

### 2. Wording that records history

- `src/state/store.ts`, the intro enemy-gem comment, now reads "…from the intro's own stream, never the run counter: no descent after the intro depends on the roll."
- `src/app/refusals.test.ts`: the title is now "the seed texts name the bound MAX_RUN_SEED (4294967295)". The assertions are untouched.
- `src/engine/generation.test.ts`:
  - The `expectedDraw` doc comment now says that over a list where every biome is authored, it is one draw over the whole list.
  - The title is now "a list with all ten authored draws as one draw over the whole list: floors 101-140 x 6 seeds".
  - The inline comment now says "an inline copy of the draw".
  - The "Checkpoint-verified" label stays.
- `src/state/config-reads.test.ts:1` now reads "The perk points a boss pays, the stat growth per level and the total a specialization's perks must sum to are read from the config."

### 3. Names of the deleted content frontier

- `balance-sim.ts` header: "a floor whose biome has no content fights the last authored biome before it (`spec/run.md#biomeforfloor`), so every floor can be entered and a seed only stops at the cap."
- `generation.test.ts` section comment: "A floor whose biome has no content: the fallback and the authored-only draw".
- `store-reach.test.ts:2`: "whatever the biome list holds".
- `balance-sim-report.test.ts`:
  - Title: "a floor past 30 has a row when a seed ran it, and a floor nobody ran has none".
  - Section comment: "The floor rows run to the deepest floor any seed ran".
- `balance-sim.test.ts` title: "has every spec, a row per floor up to the deepest floor any seed ran and the report items".
- `store-frontier.test.ts` was renamed to `store-deep-floors.test.ts` with a plain `mv`.
  - Its header now reads "A floor whose biome has no content fights the last authored biome before it: a descent into a floor past the last authored biome is accepted, and the boss on it is the real one."
  - Its four tests and titles are unchanged.
  - Nothing outside the mailboxes references the old file name.
- **Grep of `src/` and `scripts/` for `frontier`, `content bound`, `content floor` (case-insensitive) after the edits:** one hit is left.
  - It is `src/state/store.test.ts:665`, the title "sets an atlas pin for a known, has-content floor and biome".
  - It matches `content floor` by accident. It says the floor's biome has content, which the atlas pin rule requires, and it does not name the deleted frontier.

### 4. The record

`record.md` is corrected:

- The enemy Unicorn's set comes from `hashIntroUnicornDraw(runSeed)`. The joining Unicorn's stored set still comes from `hashGemDraw(runSeed, ordinal)` through `rollPlayerGems`.
- Only `perkPointsPerBoss` is a `BalanceConfig` field. `STAT_GROWTH_PER_LEVEL` is a constant in `engine/config.ts`.
- The seed texts say what happened, and `recordBoss` returns the store's result. The Hub's Debug button discards it and offers only real bosses.
- The docs-check test count now reads 82 to 104, not 28 to 30.
- The totals are 2551 passed, 1 skipped (net +140 against `main`).
- The new file name replaces `store-frontier`.
- The mutation count is 24, with the new one named.
- The "nothing renamed" sentence now records the rename.

## Gates

- `npm run test`: 269 files, **2551 passed, 1 skipped**. It was 2550 passed at `f947623`, so the +1 is the new test.
- `npm run lint`, `npm run format:check`, `npm run build` and `npx tsc -b`: all clean.
- `npm run docs:check -- citations`: PASS (805 citations in 539 files).
- `npm run docs:check -- comments`: PASS (7826 comments and 2182 titles in 505 files).

### Test count per file against `f947623`

Counts are tests run in `vitest run`, passed plus skipped. For the changed files I also counted the declarations at `f947623` with `git show`.

| File | `f947623` | now |
| --- | --- | --- |
| `src/state/balance-sim.test.ts` | 80 | 81 (79 passed + 1 skipped, then 80 passed + 1 skipped) |
| `src/state/store-frontier.test.ts` to `src/state/store-deep-floors.test.ts` | 4 | 4 |
| `src/app/refusals.test.ts` | 9 | 9 |
| `src/engine/generation.test.ts` | 59 | 59 |
| `src/state/balance-sim-report.test.ts` | 36 | 36 |
| `src/state/config-reads.test.ts` | 8 | 8 |
| `src/state/store-reach.test.ts` | 25 | 25 |

For the five files that only had title or comment edits, the `f947623` figures come from the declaration counts at `f947623` (9, 52, 36, 8, 13). Only the current run counts are measured: the run count is higher for `generation.test.ts` (59) and `store-reach.test.ts` (25) than their declaration counts because `.each` cases expand. Those counts did not change.

Total: 2550 to 2551 passed. 269 files before and after, because the rename keeps the count.

## Golden policy and corpus

- No file under `__golden__` or `__corpus__` differs from `f947623`. I checked with `git diff f947623 --name-only` filtered for both, and there were no hits.
- No expected value changed, and the corpus digest test passes unmodified. `corpus:update` never ran.
- The source diff against `f947623` is the one new test, comment and title text, and the rename.

## Mutation for the new pin

| Mechanism | Site | Mutation | Killed by |
| --- | --- | --- | --- |
| The probe runs only on a boss floor | `balance-sim.ts` `playFloorRun` | remove `preview.boss &&` | "a non-boss floor run makes one descent even when the party holds Pacify; a boss floor makes two" |

## Spec questions

None. No living-doc text went stale from this round.

## Content changes

None.

## Rename map

- `src/state/store-frontier.test.ts` to `src/state/store-deep-floors.test.ts` (plain `mv`).

## To delete

Nothing. `git status` shows the old name as deleted only because of the rename.
