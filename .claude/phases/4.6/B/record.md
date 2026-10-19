# Record — Phase 4.6 — Slice B: Game layer and the comment sweep

**Status: built.** Golden policy byte-identical: no expected value of any golden changed, and the
corpus digest is untouched. Three golden fixtures and `__corpus__/node-shims.d.ts` changed by
comment only. 2550 tests passed, 1 skipped (net +139 against `main`; 269 files, +8). The slice was
built in two steps: the build (committed as `f51a849`, the sweep's base) and the comment sweep on top of it.

## What was built

- **No content frontier.** `contentFrontier` and the `beyond-content-frontier` refusal are gone.
  `biomeForFloor` takes a floor whose decade has no authored biome from the last authored biome
  before it; a list with nothing authored before the decade throws the invariant error. Past
  `LAST_FIXED_FLOOR` (100, in `engine/generation.ts`) the biome is drawn from the authored biomes
  only, in list order, never an empty one. On a list of ten authored biomes the draw equals
  `main`'s for floors 101 to 140 across six seeds (`evidence/draw-table.md`).
  `createGameStore` throws on a biome list whose first biome is empty. `floorPreview` never throws.
  The player gem pool follows the deepest floor up to `LAST_FIXED_FLOOR` and stops growing there.
- **One reach rule.** `farthestReachableFloor(deepest) = deepest + 1`, exported from `store.ts`,
  is the only place the rule is written in code. Its four readers are `checkDescend`, the
  out-of-reach text (`descendRefusalText(reason, reach)`), the RunScreen button and text, and the
  simulator's `nextRun`. `reach-readers.test.ts` reads the sources and fails if a fifth restatement
  appears. `deepestPlusOne` is gone.
- **The intro Unicorn's gems come from its own stream.** The intro rolls the enemy Unicorn's set by
  the enemy rule over biome 1 (`INTRO_BIOME_NUMBER = 1`), and the joining Unicorn's stored set from
  `hashIntroUnicornDraw`, so the run counter advances by one whatever the roll. The state after the
  intro, and the first descent, equal `main`'s in 60 of 60 cases (3 specs × 20 seeds); 9 of the 60
  intro logs differ, all Sorcerer, because only a Pacified Unicorn can now cast where `main`'s held
  no gem (`evidence/intro-equivalence.md`).
- **A boss kill is checked.** `recordBossKill` refuses an id no biome in the store's list holds
  (and says so); `canRecordBossKill` answers the same question without acting. A repeat of a
  cleared boss returns `{ ok: true }` with the state object unchanged and no perk points.
- **Numbers out of the logic.** `perkPointsPerBoss` (100) and `STAT_GROWTH_PER_LEVEL` (0.25) are
  read from the balance config; `specializationPointTotal` follows the config (10 × 100 by
  default); `perkPointsFor(bossesCleared, config)` takes it. The literals 100, 1000 and 0.25 are
  gone from the logic. The `Math.min(100, …)` that remains in `store.ts` caps soul percent.
  `curves.ts`' `floor <= 100` is the level multiplier's pivot and is untouched.
- **Game-layer fixes.** Status durations print `1 turn` and `N turns`, not `(3r)`. A descent with no
  fights plays as done and every playback action but `set-speed` returns the state unchanged
  (`jump` included); a `jump` to a fight that does not exist still throws when there are fights.
  The descent viewer renders a floor line and says no fights were played. The seed texts and the
  debug-boss refusal say what happened. The Rot Sovereign attrition filter compares the creature
  template id with `ROT_SOVEREIGN.id`. The simulator reads its sides from a roster
  (`state/__fixtures__/roster.ts`, `rosterOf`) instead of splitting ids, so `templateIdOf` and every
  hand-built id are gone. Floor rows run to the deepest floor any seed ran, with no row for a floor
  nobody ran; the simulator's `frontier` stop reason and argument are gone and the run cap is the
  only stop. `RunRecord` carries the floor's `shape`.
- **Demo marker.** The first line of every demo module in `src/app`, `src/ui` and `src/main.tsx`
  (35 files) is the demo marker; `demo-marker.test.ts` pins it.
- **Descriptions transcribed.** 20 trait and perk descriptions changed to the doc sync's
  effect-sentence wording and 6 were already right (`evidence/descriptions.md`). Text only; no
  behaviour, number or id changed. No number in the docs disagreed with `src/data`.
- **The comments check reads seven more patterns** (21 to 27 in `scripts/docs-check/comments.ts`:
  `legacy … path`, `moved here from`, `first real consumer`, `existing implicit behavior`,
  `keeps working unchanged`, `'s first file`, ``the new `…` ``). They read comments and titles, not
  string literals. On the pre-sweep tree they found 14 hits (`evidence/comment-check-hits.md`).
- **The comment sweep.** Comments only, on top of the build commit: the 14 hits, the one hit the
  check does not catch (`traits/glimmerdark.ts`, "made possible by"), and M1 to M17 of the review
  (M3 and M9 were already fixed). `docs:check -- comment-proof f51a849` passes for the 30 files
  the sweep touches. Every item is tabled with before and after in `report-r1.md`.

## Tests and goldens

- New files: `store-frontier`, `store-reach`, `reach-readers`, `store-intro-unicorn`,
  `store-boss-kill`, `config-reads` (all `src/state`), `app/demo-marker`, `ui/DescentViewer`.
  Additions in `generation`, `playback`, `refusals`, `eventText`, `debugBoss`, `balance-sim` and
  `balance-sim-report` tests, and in `scripts/docs-check/comments.test.ts` (28 to 30).
- 51 existing tests failed against the new code before any was touched, and each matched an entry
  in the plan's list or its hand-out (`evidence/test-inventory.md`). They were adjusted as set-up or
  listed expectations only; the frontier scenarios, the `deepestPlusOne` test and the
  `templateIdOf` test were removed.
- 23 scratch mutations, one per mechanism and site, all killed (listed in `report-r1.md`).
- Golden policy: no `__golden__` expected value changed; the corpus digest test passes unmodified;
  `corpus:update` never ran. The only golden-adjacent edits are fixture helpers
  (`__fixtures__/balance.ts` gains `perkPointsPerBoss: 100`; `__fixtures__/biomes.ts` gives each
  slot a `speciesPool`) and the comment-only headers of `golden-damage-observed-lethal`,
  `golden-revive` and `golden-shieldbarer-starter`.
- Balance CI: for all three specs the CI thresholds and every seed's deepest floor, run count, runs
  to first soul, first-try, floor-5 and stop reason equal `main`'s (`evidence/balance-ci.md`).

## Files changed

Logic and types: `engine/{generation,config,leveling,balance-types}.ts`,
`data/{balance,specializations}.ts`, `state/{store,rewards,balance-sim}.ts`,
`app/{refusals,floorPicker,debugBoss,playback,eventText}.ts`, `ui/{RunScreen,DescentViewer}.tsx`,
`scripts/docs-check/comments.ts`. Descriptions: `data/traits/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts`
and `data/specializations.ts`. Marker line: 35 files in `src/app`, `src/ui` and `src/main.tsx`.
Fixtures: `engine/__fixtures__/{balance,biomes}.ts`. New: `state/__fixtures__/roster.ts`, the eight
test files above, and the evidence files. The sweep touched 30 files by comment (the list is the
`comment-proof` output in the report). No living or content doc was edited. Nothing was deleted or
renamed.
