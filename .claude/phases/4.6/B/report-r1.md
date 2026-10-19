# Report r1 — 4.6-B: Game layer and the comment sweep

Built to `plan.md` as `plan-handout-r2.md` corrects it. The slice is two steps: the build (steps 1 to 4 of the Order of work, paused and committed by Duncan as `f51a849`) and the comment sweep on top of it, comments only. **The sweep's base is `f51a849`.** Nothing committed, nothing deleted, nothing renamed, no living doc, brief or content doc edited. Evidence is in `phases/4.6/B/evidence/`.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 2550 passed, 1 skipped, 0 failed (269 files, 2551 tests) |
| `npx tsc -b` | clean |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npm run docs:check -- citations` | PASS, 799 citations in 539 files |
| `npm run docs:check -- comments` | PASS, 7822 comments and 2181 titles in 505 files (red at PAUSE 1 with the 14 hits of patterns 21 to 27, as planned) |
| `npm run docs:check -- comment-proof f51a849` | **PASS, 30 changed files**, every one `OK` |

### Test count, file by file against `main` (2412 tests → 2551, +139; passed 2411 → 2550; files 261 → 269)

Counted from the JSON reports of a full `vitest run` on a `git archive main` copy and on this working tree (`numTotalTests`, per file). The deltas sum to +139.

| File | main | branch | Why |
| --- | --- | --- | --- |
| `src/state/store-reach.test.ts` (new) | – | 25 | the reach rule, the store's biome-list guards, `floorPreview` on short lists, the gem pool by depth |
| `src/app/demo-marker.test.ts` (new) | – | 36 | one `it.each` row per demo module, plus the glob check |
| `src/state/store-boss-kill.test.ts` (new) | – | 8 | `recordBossKill` and `canRecordBossKill` |
| `src/state/store-intro-unicorn.test.ts` (new) | – | 8 | the intro Unicorn's RNG requests, set and cast |
| `src/state/config-reads.test.ts` (new) | – | 8 | the pinned defaults, `perkPointsPerBoss`, the specialization total |
| `src/state/reach-readers.test.ts` (new) | – | 4 | the reach rule has one home |
| `src/state/store-frontier.test.ts` (new) | – | 4 | floors past the last authored biome through the store |
| `src/ui/DescentViewer.test.tsx` (new) | – | 1 | a descent with no fights |
| `scripts/docs-check/comments.test.ts` | 82 | 104 | +22: patterns 21 to 27, their cases and the literals-pass case |
| `src/app/playback.test.ts` | 20 | 27 | +7: the zero-fight guards |
| `src/engine/generation.test.ts` | 52 | 59 | +7 net: `biomeForFloor` gaps, one-biome list, past `LAST_FIXED_FLOOR`; the `contentFrontier` block is gone |
| `src/state/balance-sim-report.test.ts` | 30 | 36 | +6 net: floor rows, the Rot Sovereign filter, the shape rows; the `templateIdOf` test removed |
| `src/app/refusals.test.ts` | 7 | 9 | +2: seed texts, the out-of-reach text |
| `src/state/balance-sim.test.ts` | 78 | 80 | +2 net: `nextRun` table and watch-point line added, the two `frontier`-stop tests replaced by cap-only ones |
| `src/app/debugBoss.test.ts` | 3 | 4 | +1: an id no biome holds |
| `src/app/eventText.test.ts` | 31 | 32 | +1: `1 turn` and `N turns` |
| `src/app/floorPicker.test.ts` | 16 | 15 | −1: the `deepestPlusOne` test removed |
| `src/state/store.test.ts` | 38 | 36 | −2: the two `beyond-content-frontier` scenarios removed |

Every other file has the same count. The set-up-only edits (frontier set-up, `bruteStore`, `'boss-0'` ids) are net zero. The existing tests that failed against the new code, each matched to the plan's list (51 of 51), are in `evidence/test-inventory.md`.

## Golden policy and the corpus digest

- **No expected value of any golden changed.** Against `main` the only files under `__golden__` or `__corpus__` that differ are `golden-damage-observed-lethal.fixture.ts`, `golden-revive.fixture.ts`, `golden-shieldbarer-starter.fixture.ts` and `node-shims.d.ts`. Each differs in comment lines only (5 lines in, 5 out). `comment-proof f51a849` confirms this for the sweep. Their imports, setups and `expected*` exports are the text of `f51a849`, which is `main`'s text.
- At PAUSE 1 no file under those folders differed from `main` at all.
- **Corpus digest unchanged.** `corpus-digest.fixture.ts` is untouched and its test passes. I never ran `corpus:update`.
- The intro change is the one place a behaviour moved. `GameState` after the intro, and the first descent, equal `main`'s in 60 of 60 cases (3 specs × 20 seeds). 9 Sorcerer intro logs differ, because only a Pacified Unicorn now casts where `main`'s held no gem (`evidence/intro-equivalence.md`). No golden or corpus fight runs the store's intro.
- Balance CI: thresholds and every seed's result equal `main`'s for all 3 specs (`evidence/balance-ci.md`). The past-100 draw on a ten-authored list equals `main`'s in all 240 draws (`evidence/draw-table.md`).

## For each mechanism, the test that fails with it removed

I mutated each mechanism in a scratch copy and re-ran its tests: 23 mutations, 23 killed, none survived. The table names the test file and the title of the test that covers each mechanism.

| # | Mutation | Covering test (file > title) |
| --- | --- | --- |
| 1 | `biomeForFloor` walk-back removed | `generation.test.ts` > a gap list [A, empty, C]: floors 11-20 fall back to A; `store-frontier.test.ts` > floor 35 previews the last authored biome |
| 2 | authored-only draw past `LAST_FIXED_FLOOR` | `generation.test.ts` > a list with empty slots never draws an empty biome; `store-frontier.test.ts` > floors past 100 are authored biomes too |
| 3 | `<= LAST_FIXED_FLOOR` boundary | `generation.test.ts` > LAST_FIXED_FLOOR is 100, and 100 is the last fixed floor |
| 4 | `unlockBiomeIndex` cap | `store-reach.test.ts` > past LAST_FIXED_FLOOR the pool stops growing |
| 5 | store guard: empty list | `store-reach.test.ts` > an empty list throws |
| 6 | store guard: empty first biome | `store-reach.test.ts` > an empty first biome throws, even with an authored biome after it |
| 7 | reach rule `+2` | `store-reach.test.ts` > farthestReachableFloor table; one past the deepest floor cleared is entered, the next one is refused |
| 8 | `recordBossKill` check | `store-boss-kill.test.ts` > an unknown id is refused, and the state object and perk points are untouched |
| 9 | intro stream | `store-intro-unicorn.test.ts` > the same seed gives the same slots, whatever the run counter says |
| 10 | intro biome number | `store-intro-unicorn.test.ts` > biome 1's Vitality pool is exactly the three spells; over 24 seeds the enemy Unicorn holds exactly those three |
| 11 | no intro gems | `store-intro-unicorn.test.ts` > a Pacified Unicorn casts a gem instead of waiting |
| 12 | literal 100 in `perkPointsFor` | `config-reads.test.ts` > a boss recorded under a 50-point config earns 50, not 100 |
| 13 | literal 1000 in the specialization total | `config-reads.test.ts` > a 50-point config totals 500 |
| 14, 15 | the two playback guards | `playback.test.ts` > a descent with no fights starts done, with nothing pending; a speed change still changes the speed |
| 16 | viewer early return | `DescentViewer.test.tsx` > a descent with no fights renders the floor line and says no fights were played |
| 17 | Rot Sovereign filter | `balance-sim-report.test.ts` > a Rot Sovereign visit counts, another boss's does not |
| 18-20 | the three floor-row rules | `balance-sim-report.test.ts` > has no content bound; a floor with only a failed push keeps its row; the shape is the first run on the floor in seed order |
| 21 | `biomeIndex` as the decade | `generation.test.ts` > an authored biome after the gap is reached only from its own decade |
| 22 | seed text | `refusals.test.ts` > the seed texts are the strings the screen has always shown |
| 23 | turns label | `eventText.test.ts` > a one-turn status says "1 turn", a longer one "N turns" |

The reach rule's four readers are each covered:
- `checkDescend`: boundary tests in `store-reach.test.ts`.
- The out-of-reach text: `refusals.test.ts` > the out-of-reach text names the reach it is given.
- The RunScreen button and text: `reach-readers.test.ts` > the demo screen reads the export for the button and for the refusal text. It requires `farthestReachableFloor(game.deepestFloor)` twice and fails on a restatement in code.
- `nextRun`: `balance-sim.test.ts` > after a clear the push floor is the store's farthest reachable floor, at any depth.

## The comment sweep

Comments only. The base is `f51a849`, and `comment-proof` passes for the 30 files. Each item was located on the current tree by its quoted text.

### The check's 14 hits (`evidence/comment-check-hits.md`) and the one it does not catch

| # | File | Before | After |
| --- | --- | --- | --- |
| 1 | `engine/actions.ts:4` | "`executeAction` (the executors, moved here from combat.ts)" | "`executeAction` (the executors)" |
| 2 | `engine/actions.ts:774` | "`executeAction`: the executors, moved here from combat.ts." | "`executeAction`: the executors." |
| 3 | `engine/conditions.ts:134-141` | "Completes the case for the non-scripting call sites … Blindclaws' Striker … is the first real consumer, via conditional-damage-bonus." | "Serves the non-scripting call sites too: gatherConditionalDamageBonus (resolution.ts) passes the CURRENT damage target as resolvingAgainstId … Blindclaws' Striker (data/traits/glimmerdark.ts) reads it through conditional-damage-bonus." |
| 4 | `engine/effect-types.ts:108` | "`flat` is the existing implicit behavior, made explicit." | "`flat` is the authored value as it stands." |
| 5 | `engine/effects.ts:574` | "'flat' is the existing implicit behavior, made explicit" | "'flat' is the authored value" |
| 6 | `engine/effects.ts:352` | "Every existing importer of `hasStatus` from THIS module keeps working unchanged." | "Importing `hasStatus` from THIS module gives the same function." |
| 7 | `engine/resolution.ts:924` | "… as the legacy cast path, so the result stays byte-identical with what `spell-effects.test.ts`'s oracle pins." | "… as the reference cast `spell-effects.test.ts` replays, so the result stays byte-identical with what its oracle pins." |
| 8 | `engine/resolution.ts:1086` | "keeps the legacy cast path's association" | "keeps the reference cast's association" |
| 9 | `engine/resolution.ts:1366` | "can replay the legacy cast path on the same primitive" | "can replay its reference cast on the same primitive" |
| 10 | `state/store.ts:1` | "src/state's first file (`spec/run.md#generation-is-a-pure-seeded-module`: …" | "The game-state store (`spec/run.md#generation-is-a-pure-seeded-module`: …" |
| 11 | `data/traits/starters.ts:59` | "the new `all-allies` ResponseTarget" | "the `all-allies` ResponseTarget" |
| 12 | `data/traits/overgrowth.ts:124` | "the new `all-allies-of-species` ResponseTarget" | "the `all-allies-of-species` ResponseTarget" |
| 13 | `engine/__golden__/golden-shieldbarer-starter.fixture.ts:3` (**not in the review's list; provenance**) | "targeted at the new `all-allies` ResponseTarget" | "targeted at the `all-allies` ResponseTarget" |
| 14 | `engine/spell-effects.test.ts:1` (**not in the review's list; provenance**) | "BYTE-IDENTICAL to the legacy payload path" | "BYTE-IDENTICAL to the reference payload path" |
| – | `data/traits/glimmerdark.ts:134` (**the one V12 hit no pattern catches; by hand**) | "`acted-before-target` condition, made possible by conditions.ts completing that condition's non-scripting path." | "`acted-before-target` condition, which conditions.ts also resolves outside a script (against the current damage target)." |

Hits 13 and 14 are listed as asked. Both record how the code was before: that the target was new, and the implementation the effect-list cast replaced. Hit 13 is a golden fixture header, so `comment-proof` had to accept the edit, and it did.

### M1 to M17

| Item | Status | Before | After |
| --- | --- | --- | --- |
| M1 `balance-types.ts:24`, `curves.ts:59-61` | fixed | "SINGLE Math.round at the end"; curves "Default offset 5, so the narrower range doesn't lower boss levels: 19 / 34 / 52 …" | "SINGLE Math.floor at the end"; "Default offset 5: 19 / 34 / 52 on floors 10 / 20 / 30." |
| M2 `statuses.ts:61-62` | fixed | "No real producer applies Burn with a bare default (Withering Bolt and Sporch pass 3); placeholder matching its DoT sibling Poison's own default." | "The Sporch Igniter and the Cinderlord apply Burn with this bare default (Withering Bolt passes 3 itself), so it is live balance; it matches its DoT sibling Poison's own default." |
| M3 `eventText.ts:88` | already done as the build's code fix | – | prints `(3 turns)`; the test is pinned |
| M4 `config.ts:27` | fixed | "Fixture/data-default convenience only -- no engine logic reads this" | "The regular gem slots a creature has by default: `materializeCreature` and `rollLoadout` (generation.ts) size a gem set by it, and fixtures default to it." |
| M5 `species/starters.ts:52-53` | fixed | "The materialized result is `[Arcane Bolt, null, null, null]`" | "Those slots hold the set rolled when the starter was granted (`spec/creatures.md#player-gem-sets`), so it fights with Arcane Bolt at index 0 and its stored gems after it" |
| M6 "cast-role loadout" | fixed at all 6 sites (`types.ts`, `store.ts`, `spells/index.ts`, `species/overgrowth.ts`, `generation.ts`, `__fixtures__/biomes.ts`) | "rolls a cast-role loadout from …" | "rolls every enemy's gem set from …" (`generation.ts`: "enemy gem roll") |
| M7 `ids.ts:7` | fixed | "Distinct brand from CreatureId/SpeciesId so the three ID spaces …" | "Distinct brand from CreatureId so the two ID spaces …" |
| M8 `actions.ts:113` | fixed | "gem, target, Confusion/Provoke" | "gem, Confusion, then Provoke or the target" |
| M9 `effect-types.ts:1060` | already gone (rewritten in 4.6-A) | – | the `nonStacking` text near `effect-types.ts:1121` is correct |
| M10 `rng.ts:6-7` | fixed | `CONVENTIONS.md#combat-is-reproducible-from-its-inputs` | `CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned` |
| M11 `store.ts:175` | fixed | `spec/combat.md#resolution--timing` ("the fight ends the instant a side has no living creature") | `spec/run.md#a-descent-is-atomic` (a loss or draw ends the descent at that fight; the remaining fights are never attempted) |
| M12 `store.ts:252` | fixed | `spec/progression.md#specializations` | `spec/store.md#how-store-actions-fail` |
| M13 `generation.ts:2` | fixed | `spec/run.md#generation-is-a-pure-seeded-module` says RNG-free | `spec/creatures.md#materializecreature` says RNG-free |
| M14 `golden-damage-observed-lethal.fixture.ts:1` | fixed | `spec/effects.md#hook-execution` | `spec/effects.md#damage-path-hook-order` |
| M15 `golden-revive.fixture.ts:3` | fixed | "20%, per `spec/responses.md#revive` worked example" | "20%, the Unicorn's number, `content/overgrowth.md#unicorn-lightbearer`; the rule is `spec/responses.md#revive`" |
| M16 `node-shims.d.ts:3`, `corpus.ts:7` | `node-shims.d.ts` reworded; `corpus.ts:7` left (anchor exists and holds) | `node-shims.d.ts`: a parenthesis around `CONVENTIONS.md#test-environments` | `["vite/client"]` only: engine tests run in Node (`CONVENTIONS.md#test-environments`), but `src/` as a whole must not gain Node-only globals … `@types/node` … (flagged as spec question 9) |
| M17 (5 sites) | fixed | "The biome's one cast-role creature" (Pollenlord, Resonant Chorus); "the biome's only caster" (Hollowroot); "names no specific pair for this boss" (Rot Sovereign adds); "no two damage-only spells sharing an affinity in this biome" (Weakening Bite); "on a mechanic no biome-1 spell already uses, and no affinity carries two plain damage spells" (glimmerdark spells, C2) | "A `caster` Pollinator …, as every enemy's does"; "A `caster` Resonant …"; "A `support` Necromoss …" (pool lists Life Siphon); "names the pair: a Sporecloud Seeder and a Rotfeeder Scavenger"; "a Violence debuff, not a damage spell"; "unique under the dedup guard's key (`data/spells/index.test.ts`); some carry a biome-1 mechanic into another affinity (Disorient is Vine Snare's damage-and-Web in Instinct)" |

The 30 files `comment-proof f51a849` lists, all `OK`:
- `data/species/{glimmerdark,overgrowth,rotcap-hollow,starters}.ts`
- `data/spells/{glimmerdark,index,overgrowth}.ts`
- `data/statuses.ts`
- `data/traits/{glimmerdark,overgrowth,starters}.ts`
- `engine/__corpus__/node-shims.d.ts`
- `engine/__fixtures__/biomes.ts`
- the three golden fixtures
- `engine/{actions,balance-types,conditions,config,curves,effect-types,effects,generation,ids,resolution,rng,types}.ts`
- `engine/spell-effects.test.ts`
- `state/store.ts`

## Spec questions

None stopped the build. The docs need to answer or update these before the next slice.

1. **Zero-fight `jump`.** The plan says every playback action on zero fights returns without throwing. I made every action but `set-speed` return the state unchanged, `jump` included. A `jump` to a fight that does not exist still throws `RangeError` when there are fights. Say if `jump` on `[]` should refuse instead. (`src/app/playback.ts`)
2. **Repeat boss kill.** `recordBossKill` on an already-cleared known boss returns `{ ok: true }` and runs no `set()`, so the state reference is unchanged (the kickoff's reading). `spec/store.md#how-store-actions-fail` says "`recordBossKill` has no failure"; it now has one.
3. **Stale spec lines** (living docs untouched):
   - The three `**Known bug:**` lines (`spec/run.md#enemy-script-and-gem-set`, `spec/store.md#how-store-actions-fail`, `spec/store.md#store-actions`), and `#store-actions`' `floorPreview` clause "past the content frontier it still previews".
   - `spec/run.md#content-frontier`, `#biomes` ("a seeded draw from all 10"), `#biomeforfloor`, `#content-frontier-and-pins`, `#pins`, `#scripted-intro`, `#boss-floors` ("floors 40, 50 … repeat the last authored biome's boss").
   - `spec/store.md#how-store-actions-fail`: the `beyond-content-frontier` reason, "`recordBossKill` has no failure", "× 100"; and `#store-actions`.
   - `spec/progression.md#specializations-are-data` (literal 1000, "× 100") and `#perk-points`.
   - `CONVENTIONS.md#where-each-number-lives` (`perkPointsPerBoss`, `STAT_GROWTH_PER_LEVEL`, `LAST_FIXED_FLOOR`).
   - `CI_CD.md#what-the-comments-check-reads` (patterns 21 to 27; they read comments and titles, not string literals).
   - `OPEN_QUESTIONS.md` frontier mentions.
4. **`curves.ts` `floor <= 100`** is the level multiplier's pivot (its config fields name floor 100). I left it, as the kickoff says. It is not `LAST_FIXED_FLOOR`; say if the spec wants one number for both.
5. **Description numbers.** `evidence/descriptions.md` finds no number in the docs that disagrees with `src/data`. 20 descriptions changed and 6 are unchanged, each with a reason.
6. **Rot Sovereign filter.** It compares the creature template id with `ROT_SOVEREIGN.id`. The plan notes no test can tell the two id domains apart today.
7. **Repeat Rot Sovereign visits on floors 40 and deeper** now enter the simulator's attrition rows (accepted in the kickoff). Only the full `npm run sim` report shows the size.
8. **Floor rows** run to the deepest floor any seed ran, and a floor nobody ran has no row, in both the floor rows and the first-try rows. Any spec text that says the rows run "to the frontier" is stale.
9. **M16 / V7 `corpus.ts:7`.** Its anchor `#every-golden-replays-through-one-shared-runner` exists and holds its claim, so I left it. If V7 meant a different anchor, say which.

## Content changes

None to behaviour. The text of 20 trait and perk descriptions changed:
- Files: `data/traits/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts`, and the Armor piercer and Thorns perks in `data/specializations.ts`.
- Wording: the effect-sentence wording of `phases/4.5/brief.md#trait-and-perk-text`.
- Detail: old and new text for each, and the 6 entries left unchanged with reasons, are in `evidence/descriptions.md`.
- No number, id or effect changed.

## To delete

None. No renames.

## Evidence (`phases/4.6/B/evidence/`)

`test-inventory.md`, `descriptions.md`, `comment-check-hits.md`, `intro-equivalence.md`, `draw-table.md`, `balance-ci.md`. The comparison scripts lived in the scratchpad and are not kept.

## Toolchain note

I did not run `npm ci`, because it empties `node_modules`, which is a deletion. Installed tool versions may differ from the lockfile's pins. If CI disagrees on formatting or a test, that gap is the first suspect.
