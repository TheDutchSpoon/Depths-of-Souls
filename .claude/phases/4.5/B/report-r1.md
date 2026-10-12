# Report r1 — 4.5-B: on-death-observed + `createCombat` validates its trait registry

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed, nothing deleted, no
living doc edited.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1875 passed, 1 skipped, 0 failed (215 files, 1876 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 636 citations in 439 files |
| `npm run docs:check -- comments` | PASS, 7038 comments and 1651 titles in 406 files |
| `npm run docs:check -- comment-proof main` | `golden-spore-spread.fixture.ts`: OK. The other FAILs are the files that change code on purpose (the three listed goldens, the corpus fixture, the new files and the engine files) |

`grep -rn "on-ally-death\|on-enemy-death" src` is empty. `Hook` has 16 members (counted by hand:
fight-start, turn-start, turn-end, round-end, damage-dealt, damage-taken, kill, death,
action-observed, damage-observed, death-observed, status-applied, attack, cast, defend, provoke).

### Test count, file by file against `main` (1852 tests → 1876, +24; passed 1851 → 1875)

| File | main | branch |
| --- | --- | --- |
| `engine/death-observed.test.ts` (new) | – | 13 |
| `data/traits/rotcap-hollow.test.ts` (new, hand-out item 5) | – | 5 |
| `engine/__golden__/golden-death-observed.test.ts` (new) | – | 2 |
| `engine/damage-observation.test.ts` | 64 | 68 (+2 validator rows for the new hook, +1 `createCombat` trait check, +1 explicit `any` at the damage site) |

Every other file has the same count (checked by diffing the per-file JSON counts of the two runs).
Titles changed, not counts: the lethal-ordering test, the Grudge fixture test.

## Golden policy

- **The three listed goldens** (`golden-damage-observed-lethal`, `golden-last-gleam` both cases,
  `golden-rot-sovereign`): `main`'s fixture file was loaded next to the branch's (a throwaway
  vitest run, `main`'s copy read with `git show main:`), `on-ally-death` / `on-enemy-death` mapped to
  `on-death-observed` in `main`'s expected arrays, and the arrays deep-compared with `toEqual`:
  equal for `expectedEvents` (lethal), `allyDiesExpected` and `gleamDiesExpected`, and
  `expectedEvents` (Sovereign). Only the `hook` field changed; no old golden has a listener on both
  sides of a death, so no event moved. Their comments are updated.
- **`golden-spore-spread`**: comment-only, proved by `docs:check -- comment-proof main` (OK).
- **Every other golden**: `git diff main --stat -- src/engine/__golden__` lists only the four files
  above, plus the new `golden-death-observed.fixture.ts` and `.test.ts`.
- **New hand-derived golden** `golden-death-observed` (two cases, setup and arithmetic in its
  header): `enemyDies` shows `enemy`, `ally`, `any` and an absent filter each firing for a match and
  staying silent for a non-match, and the new order (PE, PY, EA, EB; `main` would give EA, EB, PE,
  PY). `playerDies` mirrors it. Both passed on the first run against the hand-derived arrays.

## Corpus digest

Regenerated once with `npm run corpus:update`: 143 of 527 rows changed. Attribution in
`evidence/corpus-attribution.md`, made by resolving every corpus fight on `main` and on the branch
and comparing full event logs with the two old names mapped: **130 name only** (byte-identical
after the mapping) and **13 name + order** (same multiset of events, reordered death-observer
firings: the player-side observer now fires before the enemy-side one, e.g. fight 42, Last Gleam
before Scavenger). Every changed fight has the same result, rounds and final HPs. Nothing else
differs (ASSUMPTION A6 held), and the 384 other fights are byte-identical.

## Mechanisms and the test that fails with each removed

Each run removed one mechanism from the finished tree, ran the whole suite (corpus digest
excluded), and restored the file.

| Mechanism (removed) | Failing test(s) |
| --- | --- |
| `ally` branch, `on-action-observed` | `resolution.test.ts` "relationship 'ally': does NOT fire for an enemy's action" |
| `enemy` branch, `on-action-observed` | `resolution.test.ts` "relationship 'enemy': fires only for the enemy actor" |
| `any` branch, `on-action-observed` | `resolution.test.ts` "relationship 'any' (or absent)…" and the cascade-depth end-to-end test |
| `ally` / `enemy` branch, `on-damage-observed` | `damage-observation.test.ts` filter matrix (6 rows each) |
| `any` branch, `on-damage-observed` | none before; added the test "an explicit relationship of any fires for an observer on either side", which fails (1) |
| `ally` / `enemy` branch, `on-death-observed` | `death-observed.test.ts` rows (`ally, v dies`, `ally, x dies`; `enemy, …`) and `golden-death-observed` `enemyDies` (and `playerDies`): 4 each |
| `any` branch, `on-death-observed` | `death-observed.test.ts` `any` rows, the order test, `golden-death-observed`: 8 |
| New order (allies then enemies) | `death-observed.test.ts` order test and the `x dies` rows, `golden-death-observed` `enemyDies`: 4 |
| Single call, per-observer loop | `death-observed.test.ts` "a stacks:false observer on opposite sides fires once between them" |
| Single call, per-side split | the same one-call test (W player, Y enemy: the split fires both), plus the order test, the `x dies` rows and `golden-death-observed` `enemyDies`: 5 |
| By-id exclusion → alive-only | `death-observed.test.ts` "not even when its own on-death revive brings it back…" |
| Alive gate (`isDeathHook` widened) | 19 failures: the lethal-ordering test, every `death-observed.test.ts` row, goldens |
| Fail closed (lookup gate moved inside the filter) | `death-observed.test.ts` "fails closed when the dead creature is absent or unknown, with or without a filter" |
| `self` rejected on the hook | `damage-observation.test.ts` "on-death-observed accepts … and rejects self" |
| `createCombat` trait loop | `damage-observation.test.ts` "a trait handed to createCombat is checked, even one no creature carries" |
| Dropped filter on Last Gleam | `glimmerdark.test.ts` (Last Gleam effect literal) |
| Dropped filter on Warder / Scavenger / Sovereign | `rotcap-hollow.test.ts` (one row each) |

## Reuse

- `livingIdsOf` is one export in `engine/creature-lookup.ts` (A1); the copies in `actions.ts`,
  `combat.ts` and `resolution.ts` are gone.
- `relationshipMatches` (private, `resolution.ts`) serves all three observation hooks. The two old
  sites keep their own missing-creature behaviour (A3, nothing unified): `on-action-observed` still
  skips the check when the actor isn't found; `on-damage-observed` skips the candidate.
- `validateTrait` lives in `engine/effect-types.ts` only; `data/traits/index.ts` imports it and
  keeps the `STOCK_TRAITS` loop. Importers moved to `./effect-types`: `damage-observation.test.ts`,
  `status-snapshot.test.ts`, `status-containers.test.ts`, `__fixtures__/traits.test.ts`.
- `createCombat` runs the trait loop right after the status loop, before the empty-party guard
  (A2). No existing test handed it an invalid trait.

## Assumptions

A1–A3, A5, A6 as in the plan. A4 is replaced by hand-out item 1: every candidate looks up the dead
creature first, with or without a filter.

## Spec questions

- `spec/effects.md#hooks` (line 183) and the damage-path order (line 237) still name
  `on-ally-death` / `on-enemy-death`; `#damage-observation` (276–298) and `#count-scaling`
  (line 381) likewise, and the 17-hook count. The trait rule belongs in `#validators` (line 150
  area). The kickoff already lists these for the PR review.
- `spec/effects.md#damage-observation` should say `relationship` alone sits on `on-death-observed`
  and `self` is rejected there.
- `spec/effects.md#hook-execution`: a `stacks: false` death observer now claims once across all
  living creatures, which is what `#stacks-false` already says.

## Content changes

Behaviour as built (numbers unchanged):

- Flickerling Last Gleam: `on-death-observed`, `ally`; never reacts to its own death.
- Myconet Warder, Myconet Gravedigger, Necromoss Thicket: `on-death-observed`, `ally`.
- Rotfeeder Scavenger: `on-death-observed`, `enemy`.
- Rot Sovereign: one `on-death-observed` trigger, `any`, `factor: 1.1` on self (was two triggers).
- Order: on any death the player side's observers react first, then the enemy side's, each in slot
  order (before, the dead creature's allies first).

## To delete

None.
