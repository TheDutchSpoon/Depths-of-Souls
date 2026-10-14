# Report r1 — 4.5-G1: The demo, descent loop and viewer

Built to `plan.md` as `plan-handout-r2.md` corrects it. Nothing committed.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | pass: 2137 tests, 2136 passed, 1 skipped (as on `main`) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | pass |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS |
| `npm run docs:check -- comments` | PASS |

## Test count, file by file against `main`

`main`: 1993 tests (a full run before the first edit). Now 2137, +144, all under `src/app`.

| File | main | now |
| --- | --- | --- |
| `newGame.test.ts` | 3 | 2 |
| `copyFight.test.ts` | – | 4 |
| `descendFlow.test.ts` | – | 4 |
| `descentText.test.ts` | – | 9 |
| `eventText.test.ts` | – | 31 |
| `fightList.test.ts` | – | 5 |
| `fightView.test.ts` | – | 12 |
| `floorPicker.test.ts` | – | 21 |
| `names.test.ts` | – | 5 |
| `perkPoints.test.ts` | – | 6 |
| `playback.test.ts` | – | 23 |
| `presence.test.ts` | – | 1 |
| `refusals.test.ts` | – | 3 |
| `sidePanel.test.ts` | – | 3 |
| `startRun.test.ts` | – | 18 |

`newGame.test.ts`: the `generateRunSeed` cases (2) stay; the single `startNewGame` test
("resets the store to a fresh game on the generated seed and returns it") is removed, and its
claims live in `startRun.test` ("a blank field draws the seed from the injected source and newGame
receives it", "on a real store the result equals the three calls made by hand").

## Golden policy

Byte-identical. `git diff --stat HEAD -- src/engine src/state src/data` is empty and
`git status` shows nothing under those folders. No golden added or changed; the corpus digest is
not regenerated. The one replay test (`copyFight.test`) compares against each record's own events,
not a pasted value.

## Mechanism checks (test fails with the mechanism removed)

Each row was run by hand-mutating the source line, running the named file, and restoring it
(a scratch script outside the repo). All 37 mutations were killed; one initially survived (the
boss line's perk figure as a literal 100), and `descentText.test` now uses a two-boss gap (+200)
which kills it.

| Mechanism | Test | Mutation killed |
| --- | --- | --- |
| names, never ids | `fightView.test` (3 specs, real descents) | label returns the id |
| boss lookup | `names.test` | `boss.creature` row removed |
| spell from set-up | `fightView.test` | slot read from the record's party |
| HP from set-up | `fightView.test` | HP read from the record's party |
| repeated-name labels | `fightView.test` | per-side counting; array position for the number |
| info line vs generation | `floorPicker.test` | `fightCount` on a boss floor; `isBossFloor` alone |
| no throw | `floorPicker.test` | `floorInfo`'s guard removed |
| field parse / pre-fill | `floorPicker.test` | `Number()` on raw text; pre-fill from the wrong field |
| start path | `startRun.test` | validation, trim, call order, intro, seed bound off by one either way |
| first-clear snapshot | `descendFlow.test` | snapshot after `descend`; stale `bossesAfter` |
| perk points | `perkPoints.test` | `spent` 0; summed without `costPerLevel` |
| timer key, no-ops, tick, skip | `playback.test` | key with speed while waiting; new object on same speed; no fight crossing; skip stops |
| copy as JSON | `copyFight.test` | effects left out |
| fight rows / header | `fightList.test` | kills by all deaths; levels from after; N from record count |
| result lines | `descentText.test` | N from record count; `before` ignored; points hard-coded |
| event text / beats | `eventText.test` | slot printed; trigger no longer a beat start |
| side panel, refusals, presence | their tests | row dropped; reasons merged; intro grant removed |

Not unit-tested, per the kickoff: the timer effect, `useMemo` of views, the clipboard call and
`RunScreen`'s call into `runDescent` (all in `src/ui`).

## Deviations and choices worth a look

- **`floorResultLine` takes `fightResults`**, not `fightRecords`: they carry the same
  results (`FloorOutcome.fightRecords` doc), and the test needs no full records.
- **Copy-JSON perks:** the plan's "first functional perk" left the Shieldbarer's log unchanged
  (Bulwark), so the test pins one perk per spec: Echo, Flurry, Armor Piercer (ASSUMPTION 11
  adjusted as it allowed).
- **Pinned seed:** 424242 with the Sorcerer clears floor 1 (ASSUMPTION 12).
- A "-0" seed is normalised to 0 in `parseSeedField` (not in the plan).
- A Copy-as-JSON button sits on every fight-list row as well as in the viewer.
- Playback's first beat appears one beat after play starts (`timer-elapsed` from waiting enters at
  beat 0, per the hand-out), so the line-up shows first.

## Rename map

`src/ui/CombatDemo.tsx` → `src/ui/DescentViewer.tsx` (plain `mv`, then rewritten). Its
`groupIntoBeats` and `describeEvent` moved to `src/app/eventText.ts`.

Event-text diff against `main`'s `describeEvent`: only (a) every creature id goes through
`view.label`, and (b) `casts slot N` is `casts <spell name>` (single and area). Every other
template, the `never` default included, is unchanged; `groupIntoBeats` is verbatim.
`randomSeed`, the seed form and the `setInterval` timer are gone.

## Browser click-through: NOT DONE

This session has no browser tool, so none of the kickoff's click-through list was run (new game per
spec, Random, picker refusals, speeds, skips, jumps, no stacked timers, pasted JSON, side panel).
What did run: the full build, type-check, lint, and the `src/app` tests, which cover every helper
the screens call. The components themselves (`src/ui`) have not been rendered by anything.
**Duncan or a browser-enabled session must do the click-through before merge.**

## Spec questions

- `engine/generation.ts:26`: "Never imported by src/ui/src/app" is now stale: `src/app/names.ts`,
  `floorPicker.ts` and `descentText.ts` import `BiomeData` / `SpeciesCreature`.
- `src/app/startRun.ts` restates the store's `MAX_RUN_SEED` (not exported); `startRun.test` holds
  the two together. Consider exporting it from the store in a later slice.
- `docs:check -- comments` rejects a `phases/…` citation in a `src/` comment (provenance
  pattern), so the viewer's naming rule (`phases/4.5/brief.md#descent-result-and-viewer-g1`) has no
  spec home to cite. If it should, the rule belongs in `spec/`.
- The floor-out-of-reach refusal text says "from 1 to one past the deepest floor cleared"; the
  design docs don't fix this wording.

## Content changes

None.

## To delete

None. (`CombatDemo.tsx` was moved, not deleted; `dist/` is regenerated by `npm run build` and is
not tracked.)
