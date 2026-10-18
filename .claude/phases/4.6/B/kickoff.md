# Kickoff — Phase 4.6 — Slice B: Game layer and the comment sweep

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/run.md`, `spec/store.md`, `spec/progression.md`. Cited only:
  `spec/creatures.md#gems-as-items`, `spec/statuses.md#timing`.
- `CONVENTIONS.md#no-magic-numbers`, `#where-each-number-lives`, `#balance-simulator`,
  `#comment-why-not-what`, `#comment-only-golden-edits-are-allowed`,
  `#every-feature-phase-ships-a-demo`, `#a-mechanism-at-more-than-one-site-is-tested-at-each-site`;
  `CI_CD.md#what-the-comments-check-reads` (this slice changes that check).
- The slice brief `phases/4.6/B/brief.md`, and in `phases/4.6/brief.md`: `#slices` (B's row),
  `#sequencing-rules`, `#assumptions` (the two `(B)` items), and the seven sections B builds:
  `#the-cave-has-no-content-frontier`, `#the-intros-unicorn-rolls-its-spells`,
  `#recordbosskill-refuses-an-unknown-boss`, `#numbers-out-of-the-logic`,
  `#small-game-layer-fixes`, `#descriptions-follow-their-entries`, `#the-comment-sweep`, plus
  `#bs-listed-test-changes`. Those sections are the spec for this slice. The three
  `**Known bug:**` lines `B/brief.md` names say what `main` does today.
- `phases/4.6/review.md`: S1, S5, S11, L1, L14, L15, V1–V5, V12 and section 8 (M1–M17), for the
  exact sites. Line numbers there predate 4.6-A, which edited `store.ts`, `generation.ts`,
  `effects.ts`, `effect-types.ts`, `resolution.ts` and `combat.ts`: locate each item by its quoted
  text, not its line.
- `phases/4.5/brief.md#trait-and-perk-text` and the content entries listed under the
  Descriptions traps below.
- Code to understand first: `engine/generation.ts` (`BIOME_COUNT`, `FLOORS_PER_BIOME`,
  `floorShape`, `biomeForFloor` ~131, `hashFloorDraw`, `rollLoadout` ~312, `biomeHasContent` and
  `contentFrontier` ~527-550); `engine/__fixtures__/biomes.ts` (`FIXTURE_BIOME_SEQUENCE`);
  `state/store.ts` (`unlockBiomeIndex` ~411, `rollPlayerGems`, `hashGemDraw`, `resolveFloorBiome`
  ~548, `checkDescend` ~572, `checkPinBiome`, `withBossCleared`, `recordBossKill` ~794,
  `floorPreview` ~817, `runScriptedIntro` ~1011, the `useGameStore` header ~1066);
  `state/rewards.ts` (`perkPointsFor`); `data/specializations.ts` (the 1000 check ~70);
  `engine/leveling.ts`; `state/balance-sim.ts` (`stopReason` ~157, the id regexes ~502,
  `templateIdOf` ~550, the Unicorn id ~858, the boss visit ~912-919, `runSeed` ~1020,
  the floor rows ~1544-1551, the attrition filter ~1632, `buildReport` ~1712); `app/refusals.ts`,
  `app/floorPicker.ts`, `app/eventText.ts`, `app/playback.ts`, `ui/DescentViewer.tsx`,
  `app/debugBoss.ts`, `app/names.ts`; `scripts/docs-check/comments.ts` (the pattern table) and
  `comment-proof.ts`.

## Scope

The seven brief sections, nothing else. The cave has no content frontier: `biomeForFloor` sends a
floor whose biome has no content to the last authored biome before it, draws only among authored
biomes past floor 100, and `createGameStore` refuses a biome list whose first biome is empty;
`contentFrontier` and `beyond-content-frontier` go. The intro's enemy Unicorn rolls a biome-1 gem
set from its own run-seed stream. `recordBossKill` refuses an id that isn't a boss in the store's
biomes, with `canRecordBossKill`. Perk points per boss, the stat growth per level and
`LAST_FIXED_FLOOR` stop being literals. The small game-layer fixes (zero-fight playback,
`floorPreview`, the simulator's boss rule and id parsing, the demo's throwaway marker, seed bound,
floor reach and duration label). The descriptions of the rewritten entries are transcribed again.
Last, the comment check widens and the comment sweep runs. Not in scope: anything in A or C–F,
the level curve's own floor-100 pivot (`curves.ts`), and test titles the review doesn't list.

## Golden policy

**Byte-identical.** Every golden's expected values and the corpus digest fixture are unchanged.
Existing tests change only where `phases/4.6/brief.md#bs-listed-test-changes` lists, each keeping
its expected values wherever the behaviour stands. The one behaviour change any existing test may
see is the intro fight's own log, and only in a fight where the enemy Unicorn's turn is locked
(it now has gems to fall back on). Every state after the intro is byte-identical. A test or golden
that breaks beyond the list is a stop-and-ask, never a quiet fix.

## Traps

**The cave has no content frontier**
- **One resolution, in `biomeForFloor`.** Walk back from the floor's decade to the last biome with
  content (`biomeHasContent`); a decade past the end of the list counts as one with no content.
  Don't add a second resolver in the store, the simulator or the gem pool: they all call
  `biomeForFloor` (through `resolveFloorBiome` in the store).
- **Past floor 100 the draw is over the authored biomes, in list order.** Keep the draw's shape
  (`min(n − 1, floor(roll × n))` over that subset), so a list where all ten are authored draws
  exactly what `main` draws today. Prove it with a table.
- **A pin still wins and is returned as is.** `checkPinBiome` keeps refusing a biome with no content;
  don't make `biomeForFloor` re-check a pin.
- **`biomeIndex` is the resolved biome's position, never the decade.** Floor 35 rolls Rotcap
  Hollow's spells (biome 3). `resolveFloorBiome` already does `indexOf`; keep it that way.
- **`unlockBiomeIndex`:** its cap becomes `LAST_FIXED_FLOOR` and the `deps.biomes.length ×
  FLOORS_PER_BIOME` bound goes, because the fallback now gives the same answer for a short list.
  Show the equivalence (one biome, deepest floor 25: today floor 10 → biome 1; after, floor 25 →
  biome 1).
- **The store guard:** `createGameStore` throws on an empty biome list and on one whose first biome
  has no content. Before adding it, check that every test store's list starts with an authored
  biome. A throw is a stop-and-ask.
- **`checkDescend`** becomes no-spec, empty-party, floor-out-of-reach. Non-integers, floor < 1 and
  any floor past one beyond the deepest cleared are all `floor-out-of-reach` (`1e20` included). The
  doc comments that explain the frontier's precedence go stale: `store.ts` ~219, ~306, ~569,
  ~596-599, ~1066-1071, `generation.ts` ~524.
- **Keep `biomeHasContent`**: `pinBiome`, the store guard and the fallback all use it. Keep the
  generator's own throw on an empty pool too: reaching it is still a real bug.
- **Boss floors 40, 50 … fight the Rot Sovereign** through the ordinary path. `withBossCleared`
  is already idempotent, so a repeat kill adds no perk points and `bossFirstCleared` is false. No
  special case.
- **Simulator:** the `'frontier'` stop and the report's `frontier` field and label go;
  `stopReason` takes no frontier. The per-floor rows were bounded by the frontier; they now run
  to the deepest floor any seed of the spec ran (`max(run.floor)`), so the floor of a seed's last
  failed pushes keeps its row. Repeat Rot Sovereign visits on floors 40+ now enter the attrition rows. That
  is accepted, and only the full report shows it. Every seed now runs to `RUN_CAP`; the CI test's
  30-run cap is unaffected.

**The intro's Unicorn**
- **Use the enemy rule, not the player roll:** `rollLoadout(unicorn, 1, deps.allSpells, rng)`, with
  no innate exclusion. `rollPlayerGems` is wrong here: it excludes innate spells, uses the ordinal
  stream and reads `unlockBiomeIndex`.
- **Its own stream:** `deps.createRng(<own hash of runSeed>)`, with constants distinct from
  `hashRunDraw`, `hashGemDraw` and `hashFloorDraw` (the brief's `ASSUMPTION (B)`). Never
  `hashGemDraw(runSeed, k)`: that would couple it to an instance ordinal. `runCounter` still
  advances by exactly 1, as today. The set goes in through `materializeCreature`'s `gems`.
- **Biome 1 means the number 1** (1-based, `spec/run.md#spells-unlock-cumulatively`), not
  `deps.biomes[1]`.
- A test's Unicorn stand-in with a cast-role script and no matching spell would now throw in
  `rollLoadout`: stop-and-ask.

**`recordBossKill`**
- **"A boss in the biome data" means `deps.biomes`' `boss.bossId`**: not `BOSS_CREATURES_BY_ID`
  (that is `src/data`, which ignores injected biomes) and not a creature id.
- A refusal leaves the state **reference** unchanged (no `set()`), like every other refusal. An
  already-cleared known boss returns `{ ok: true }` and changes nothing. `descend`'s boss path keeps
  `withBossCleared` directly: its boss comes from the data.
- **Perk points:** `perkPointsFor(bossesCleared, config)` reads `BalanceConfig.perkPointsPerBoss`
  (or the plan's name for it) at every caller, the simulator's included (`balance-sim.ts` ~833).
  The specialization total is `perkPointsPerBoss × BIOME_COUNT`, one boss per biome, read from the
  shipped config. **Never derive it from the bosses the data has today**: that gives 300 and breaks
  every spec.

**Numbers**
- `LAST_FIXED_FLOOR` lives beside `BIOME_COUNT` in `generation.ts` and replaces `floor <= 100`
  (~143) and `Math.min(100, …)` (`store.ts` ~412). `curves.ts`'s `floor <= 100` is the level
  multiplier's own pivot (its config fields name floor 100) and is a different concept: leave it.
  If you think otherwise, raise it under Spec questions.
- The 0.25 growth goes into `engine/config.ts` (the brief settles this: no config reaches
  `scaleStatsToLevel`). Don't thread `BalanceConfig` through `materializeCreature`.

**Small fixes**
- **Zero fights:** **ASSUMPTION:** playback starts `done` and the viewer shows that there was no
  fight. Neither indexes `beatCounts[last]` or `records[0]` unguarded.
- **Simulator boss rule:** the rows (~1544, ~1551) and the boss visit (~912) take `boss` and
  `fights` from `floorShape` over the floor's resolved biome. Past `LAST_FIXED_FLOOR` that biome
  depends on the seed: the plan says how a row there is built.
- **Ids from the record:** sides from membership in `playerParty` / `enemyParty`, templates from
  `origin.templateId`, the Unicorn by `origin.templateId === UNICORN.id`, the boss from the record
  (slot 0 on a boss floor, `spec/run.md#boss-floor-generation`). No regex and no hand-built id
  remain. `templateIdOf` and its test go.
- **The Rot Sovereign filter:** `bossTemplateId` is a creature id. Compare it with the Rot
  Sovereign creature's id, or carry the visit's boss id and compare that with
  `ROT_SOVEREIGN_BOSS_ID`. Comparing a template id with a boss-id constant only works because
  the strings happen to match today; 4.6-F's branding would reject it.
- **Seed text:** interpolate `MAX_RUN_SEED`. The string stays exactly the same.
- **Reach:** one store export of the farthest reachable floor (`deepestFloor + 1`), read by
  `checkDescend`, `floorPicker.ts`'s `deepestPlusOne` (which then goes or delegates to it) and the
  refusal text, which names the floor. If `descendRefusalText` gains a number parameter,
  `reasons.map(descendRefusalText)` in `refusals.test.ts` still type-checks and silently passes the
  array index as the floor: update that call by hand.
- **Durations:** `(3r)` becomes turns (`1 turn`, `3 turns`); the wording is yours.
- **Throwaway marker:** **ASSUMPTION:** one header comment per demo module (each `src/app` and
  `src/ui` file, plus `main.tsx`) citing `CONVENTIONS.md#every-feature-phase-ships-a-demo`. The plan
  confirms or narrows it.

**Descriptions**
- The doc sync is commit `260fee3`. Its rewritten entries that carry a trait or perk description:
  - `content/glimmerdark.md`: Flickerling Wick, Flickerling Flare, Resonant Overtone, Shellback
    Warden, Shellback Bulwark;
  - `content/overgrowth.md`: Spider Broodwarden, Swarmhive Drone, Swarmhive Queen, Pollinator
    Pollenlord, Snapjaw Lure, Snapjaw Jaws, Lullpollen Sleeper, Lullpollen Dozer, Broodmother,
    Unicorn Lightbearer;
  - `content/rotcap-hollow.md`: Sporecloud Reaper, Hollowkin Wretch, Hollowkin Marionette, Sporch
    Igniter, Sporch Cinderlord;
  - `specializations/sorcerer.md`: the Glyphmoth Seer starter's trait;
  - perks: Brute Force (`brute.md`); Shield up, Armor piercer, Thorns, Phalanx (`shieldbarer.md`).
  Its other changes (species roles, statuses, spells, the trigger words) carry no description.
- **Never transcribe a `**Known bug:**` line.** It says what `main` does; the description says
  what the trait does, which is the design C–E then build. For the same reason, don't drop a
  sentence because `main` doesn't honour it yet.
- An entry whose rewrite changed only its opener, a remark about the creature or a Known bug line
  keeps its description: list it as unchanged, with the reason.
- Numbers are `src/data`'s. A doc number that disagrees goes in the report, not into the text.
- `descriptions.test.ts` pins three strings (`spider-ambusher-exploit`, `echo`, `shield-bash`),
  none of them in this list. If one changes, you transcribed the wrong entry.

**The comment check and the sweep**
- **The widened patterns must match the review's real hits**, not just the brief's shorthand.
  "legacy path" doesn't match "the legacy cast path" (`resolution.ts` ~924, ~1086, ~1366), and
  the hits include "moved here from" (`actions.ts:4`, ~774), "the first real consumer"
  (`conditions.ts` ~141), "the existing implicit behavior" (`effect-types.ts:108`,
  `effects.ts` ~574), "Every existing importer … keeps working unchanged" (`effects.ts` ~351) and
  "src/state's first file" (`store.ts:1`). Each V12 hit is a positive case in `comments.test.ts`,
  with a near-miss negative beside it, except `traits/glimmerdark.ts`' "made possible by …
  completing": it gets no pattern, the sweep fixes it by hand, and the report lists it as the one
  V12 hit the check doesn't catch. Whether the new patterns also read string literals, as
  patterns 1–9 do, is the plan's call (`ASSUMPTION`); a player-facing string can hold "new".
- **Run the wider check on the pre-sweep tree and inventory every hit.** A hit outside the
  review's list is fixed in the sweep and listed if it is provenance; a false positive narrows the
  pattern instead (`phases/4.6/brief.md#the-comment-sweep`).
- **`comment-proof <base>` compares the working tree with a commit.** The sweep's base must be a
  commit holding everything else in this slice, and you never commit. So the build stops after
  the widened check, Duncan commits, and the sweep runs on top. Plan that pause.
- **The sweep is comments only.** M3 is a string literal and is fixed with the demo fixes. A test
  title is a string literal too (e.g. `damage-observation.test.ts:471`'s `#hook-execution`): out of
  the sweep and out of scope.
- **Some items are already gone**: M9 (`effect-types.ts`' `nonStacking` comment) was rewritten
  in 4.6-A, and M17's phrases no longer match by grep. Locate every V12 and M item on the current
  tree, and report it as fixed (with before and after) or as already gone (with its current text).
- The sweep may touch the data files the descriptions commit touched (`traits/glimmerdark.ts`
  ~134-135, `traits/overgrowth.ts` ~124, `traits/starters.ts` ~59): the descriptions commit goes
  first.

## Must stay green

All gates in `coding-rules.md`, `docs:check -- comments` with the widened patterns included.
Every golden's expected values and the corpus digest fixture. The CI balance verdicts test: its
numbers, not only its verdicts, equal `main`'s (no CI-capped run reaches floor 30). The
`pinBiome` refusal table and its crash-route test. The descend refusal table minus its frontier
row. The player gem-roll tests (`store-gems.test.ts`). The integration floor-1 tests (a Brute
intro, whose log can't change). `descriptions.test.ts`. The store suite's state-reference checks
on every refusal.

## The PR must prove

- **An inventory of every existing test the slice changed**, from running the suite with each
  mechanism in before any test is adjusted, each one matched to a
  `#bs-listed-test-changes` entry, or the slice stopped and asked.
- **Golden policy, by importing the fixtures**: every expected value byte-identical; the corpus
  digest fixture unchanged.
- **Frontier**, by test: on the real store, floor 35 resolves to Rotcap Hollow, rolls biome 3's
  spells and descends (`deepestFloor` seeded to 34); floor 40 is a Rot Sovereign boss floor whose
  repeat win adds no perk points; a gap list (biome 2 empty, biome 3 authored) sends floors 11–20
  to biome 1 and 21–30 to biome 3; a one-biome list previews floor 25 without throwing; past
  floor 100 only authored biomes are drawn, and on a ten-authored list the draw equals `main`'s
  for a table of floors and seeds; the store guard throws on an empty list and on an empty first
  biome; `canDescend(31)` is ok at deepest 30; `1e20` is `floor-out-of-reach`. No
  `contentFrontier` or `beyond-content-frontier` left in `src/` (grep).
- **Intro**: the enemy Unicorn holds three distinct biome-1 Vitality spells; the same seed rolls
  the same set; a Pacified intro Unicorn casts instead of waiting (test). Evidence table
  (`evidence/`), from a scratch copy of `main`, for every spec over at least 20 seeds: the
  `GameState` after `startGame` deep-equals `main`'s, the first descent's outcome deep-equals
  `main`'s, and for every intro log that differs, the first differing event falls on or after a
  locked Unicorn turn.
- **`recordBossKill`**: an unknown id is refused, with the state reference and the perk points
  unchanged; a known id records; a repeat is ok and changes nothing; `canRecordBossKill` agrees
  in every case.
- **Numbers**: each listed literal is gone (grep); tests pin `perkPointsPerBoss` = 100, the growth
  = 0.25 and the derived 1000.
- **Small fixes**: zero-fight playback and viewer tests; no id regex, `templateIdOf` or hand-built
  id left in `balance-sim.ts` (grep); the boss rule read from `floorShape`; the seed text equal to
  `main`'s string; the reach text naming the floor; `(3r)` gone.
- **Descriptions**: a table of entry → old description → new description, numbers checked against
  `src/data`, with mismatches and unchanged entries listed.
- **The sweep**: the widened-pattern tests; the wider check's hit inventory on the pre-sweep tree;
  `comment-proof <the commit before the sweep>` passing; every V12 and M item located and
  reported as fixed or already gone.
- **A test that fails with its mechanism removed, at each site**: the fallback inside 1–100 and the
  authored-only draw past 100 (two sites), the store guard, the intro roll, the `recordBossKill`
  check and `canRecordBossKill`, each config read (store, simulator, specialization total), the
  zero-fight guards (reducer and viewer), the reach export at each reader.
- **Spec questions**: the three Known bug lines `B/brief.md` names, each as built, and every
  living-doc line the slice makes stale: `spec/run.md#content-frontier`, `#biomes`,
  `#biomeforfloor`, `#content-frontier-and-pins`, `#pins`, `#scripted-intro`; `spec/store.md`'s
  `#how-store-actions-fail` and `#store-actions`; `spec/progression.md#specializations-are-data`
  (the literal 1000 and × 100); `CONVENTIONS.md#where-each-number-lives`;
  `CI_CD.md#what-the-comments-check-reads` (the new patterns).

## Docs edited at kickoff

- `phases/4.6/brief.md`:
  - `#the-cave-has-no-content-frontier`: `biomeForFloor` is the fallback's one home; a decade with
    no list entry counts as empty; `createGameStore` refuses a list whose first biome has no
    content (Duncan's call).
  - `#the-intros-unicorn-rolls-its-spells`: the Unicorn rolls from biome 1 (Duncan's call).
  - `#numbers-out-of-the-logic`: the growth goes into `engine/config.ts`, since no config reaches
    `scaleStatsToLevel`.
  - `#small-game-layer-fixes`: the reach is one store export, which the text names; M3's
    duration label moves here from the sweep (Duncan's call).
  - `#the-comment-sweep`: M3 is out of it; how a wider-check hit outside the list is handled.
  - `#bs-listed-test-changes`: widened to the direct fallout (Duncan's call).
  - B's row in `#slices`: the golden policy now says "existing tests".
- `phases/4.6/B/brief.md`: the golden policy line matches.
