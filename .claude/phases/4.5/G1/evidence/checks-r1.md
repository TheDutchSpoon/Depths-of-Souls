# Live scan and mutation runs — 4.5-G1, review r1

Branch `4.5-g1` at `51a955d`, in a scratch clone (`npm ci`, Vitest 5.0.3 as the lockfile pins).

## Live scan

A throwaway test drove the store as the screen does: for each spec and seeds 1007, 2007, 3007 and
4007, `startRun`, `recordBossKill('broodmother')`, the spec's 1-point perk bought to level 50, then
30 descents (Deepest + 1 when allowed, else the deepest floor again). Every record went through
`buildFightView`, `describeEvent` over every event, `lineUpText`, `fightRows`, `fightHeader`,
`floorResultLine`, `bossResultLine` and `sidePanelRows`, then `fightToJson` → `JSON.parse` →
`createCombat` → `resolveFight` after the view was built (the screen's order).

```
descents 360, fights 1107, events 170196, SpellCasts 6151
throws 0, creature ids in output 0, replays differing from the record 0
cleared floors whose fight count differs from floorInfo 0
fights with a repeated name 222, duplicate labels in a fight 0
uncleared floors: 328 losses, 1 draw; deepest floor reached 3; boss lines 0
```

## Mutations

Each mechanism removed in the scratch clone, the named test file run, the file restored.

| # | Mechanism removed | Test run | Result |
| --- | --- | --- | --- |
| M01 | label returns the creature id | `fightView.test` | killed (9) |
| M02 | the `boss.creature` row of the name table | `names.test` | killed (2) |
| M03 | spell slot read from the record's party | `fightView.test` | killed (2) |
| M04 | line-up HP read from the record's party | `fightView.test` | killed (1) |
| M05 | `playerEffects` left out of `buildFightView`'s `createCombat` | `fightView`, `eventText`, `fightList`, `copyFight`, `presence` tests; then all of `src/app` and `src/ui` | **survived** |
| M06 | names counted per side | `fightView.test` | killed (4) |
| M07 | array position for the slot number | `fightView.test` | killed (1) |
| M08 | `fightCount` on a boss floor | `floorPicker.test` | killed (2) |
| M09 | `isBossFloor` alone | `floorPicker.test` | killed (1) |
| M10 | `floorInfo`'s whole-number guard | `floorPicker.test` | killed (2) |
| M11 | `Number(text)` for the floor field | `floorPicker.test` | killed (4) |
| M12 | `setSpec` before `newGame` | `startRun.test` | killed (4) |
| M13 | `runScriptedIntro` dropped | `startRun`, `presence` tests | killed (4) |
| M14 | seed field not trimmed | `startRun.test` | killed (3) |
| M15 | seed bound 0xfffffffe | `startRun.test` | killed (2) |
| M16 | seed bound 0x100000000 | `startRun.test` | killed (3) |
| M17 | seed not validated | `startRun.test` | killed (2) |
| M18 | `bossesBefore` read after `descend` | `descendFlow.test` | killed (1) |
| M19 | `bossesAfter` from the pre-descent state object | `descendFlow.test` | killed (1) |
| M20 | `spent` always 0 | `perkPoints.test` | killed (4) |
| M21 | `spent` summed without `costPerLevel` | `perkPoints.test` | killed (1) |
| M22 | `timerKey` keeps speed while waiting | `playback.test` | killed (1) |
| M23 | `timerKey` returns the state object | `playback.test` | killed (2) |
| M24 | same speed returns a new object | `playback.test` | killed (2) |
| M25 | no crossing into the next fight | `playback.test` | killed (2) |
| M26 | skip to end of fight stops playback | `playback.test` | killed (1) |
| M27 | jump to the current position returns a new object | `playback.test` | killed (1) |
| M28 | the wait ends at beat 1, not 0 | `playback.test` | killed (1) |
| M29 | effects left out of the copied JSON | `copyFight.test` | killed (4) |
| M30 | kills count every death | `fightList.test` | killed (2) |
| M31 | levels going in read from the levels after | `fightList.test` | killed (1) |
| M32 | header N from the record count | `fightList.test` | killed (1) |
| M33 | XP from kills | `fightList.test` | killed (1) |
| M34 | floor line's N from the record count | `descentText.test` | killed (2) |
| M35 | `bossesBefore` ignored | `descentText.test` | killed (1) |
| M36 | perk points as a literal 100 | `descentText.test` | killed (1) |
| M37 | a draw printed as a loss | `descentText.test` | killed (1) |
| M38 | `TriggerFired` no longer starts a beat | `eventText.test` | killed (2) |
| M39 | `casts slot N` printed | `eventText.test` | killed (2) |
| M40 | a side-panel row dropped | `sidePanel.test` | killed (1) |
| M41 | two refusal texts merged | `refusals.test` | killed (1) |
| M42 | the standalone creatures dropped from the name table | `names.test` | killed (1) |
| M43 | skip to end of floor lands on the current fight | `playback.test` | killed (2) |
| M44 | `fightRow`'s labels from the player party alone | `fightList.test`; then all of `src/app` and `src/ui` | **survived** |
| M45 | `fightHeader`'s labels from the player party alone | `fightList.test` | **survived** |

M05 with the pin `handout-r1.md` asks for (an inline player Health stat-modifier, line-up HP 30
from base 20) applied: killed (1).
