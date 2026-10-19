# PR review, round 1: 4.6-B (game layer and the comment sweep)

PR #121, `4.6-b` → `main`. Reviewed at `f947623` against `main` `7cf8db7`. Commits:

| Commit | What it holds |
| --- | --- |
| `f51a849` | the build, and the sweep's base |
| `5aaba10` | the comment sweep: its parent is `f51a849`, and it is the last commit to touch `src/` |
| `5d61f60` | the record (docs only) |
| `f947623` | `report-r1.md` (docs only) |

## Verdict: fixes (one small round)

The build does what the brief and the approving plan hand-out say. I checked each item in the
code, not on the report's word.

- Goldens and the corpus digest are byte-identical.
- 46 of my 47 mutations fail a test.
- The commit structure holds. `comment-proof f51a849` passes on the final tree.

Two things keep this from approving:

- **One real fix.** The simulator's boss-probe gate is unpinned.
- **Cleanup.** Some comments and titles record history or name the deleted content frontier, and
  the record misstates three things.

No decide-points. No living doc goes over its budget.

## Real fixes

1. **The probe gate in `playFloorRun` is unpinned** (`balance-sim.ts`,
   `if (preview.boss && options.probeBosses !== false)`).
   - The slice rewrote this line: it was `bossCtx !== null`, and is now `preview.boss` from the
     store's `floorPreview`.
   - Deleting `preview.boss &&` leaves the full suite green: 269 files, 2550 passed.
   - With the gate gone, every non-boss floor run of a party holding Pacify (`pickProbeCreature`)
     is also descended a second time as a probe and thrown away. That is mostly Sorcerer seeds.
     The output stays the same, because `runProbe` restores the snapshot and the metrics read only
     `context.bossId`. But those floor runs cost twice as much in `npm run sim`.
   - CONVENTIONS asks that every mechanism a PR changes fail a test, at each site
     (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`).
   - Hand-out item 1.

## Scope and labeling (cleanup, all in the hand-out)

- **Provenance in comments and titles** (`CONVENTIONS.md#comment-why-not-what`). These say what
  the code used to do or what `main` did, not what the code does:
  - `store.ts` ~1088: "stays as it was";
  - `refusals.test.ts` ~61: "has always shown";
  - `generation.test.ts` ~304, ~389 and ~390: "what `main` computed", "what main drew", "main's
    draw";
  - `config-reads.test.ts:1`: "used to sit in the logic".

  None trips the check: patterns 21–27 are narrow on purpose. Hand-out item 2.
- **Leftovers of the deleted frontier** (the leftover sweep):
  - a file name, `store-frontier.test.ts`;
  - five comments and titles that say "no content frontier" or "no content bound";
  - `balance-sim.test.ts` ~141, "a row per content floor". The rows no longer run per content
    floor.

  A reader can't find the concept these describe. Hand-out item 3.
- **The record misstates three things:**
  - which stream rolls which Unicorn;
  - `STAT_GROWTH_PER_LEVEL` as a `BalanceConfig` read;
  - the debug-boss refusal as "saying what happened". The Hub discards the result, and the
    refusal is unreachable there.

  It also has a wrong count for `comments.test.ts`. Hand-out item 4.

## The report's spec questions, answered

1. **A zero-fight `jump`**: it returns the state unchanged. Accepted as built. A `jump` past the
   last fight on a real descent still throws, as it does on `main`. Nothing reaches either from
   the UI.
2. **A repeat boss kill** is `{ ok: true }` and runs no `set`. Accepted, and now in
   `spec/store.md#how-store-actions-fail`.
3. **Stale spec lines**: folded (Docs edited). The three `**Known bug:**` lines are gone. Two
   other notes:
   - The `floorPreview` "shorter than ten" Known bug in `spec/store.md#store-actions` is gone too,
     since `#small-game-layer-fixes` fixes it.
   - `OPEN_QUESTIONS.md` has no frontier mention on this tree (grep). Nothing to fold there.
4. **`curves.ts`' `floor <= 100`** stays. It is the enemy-level multiplier's pivot, and its config
   fields name floor 100 (`atFloor100Hundredths`, `perFloorAfter100Hundredths`;
   `spec/run.md#enemy-levels`). It is a balance curve that happens to pivot at the same floor, not
   the end of the biome sequence: changing `BIOME_COUNT` shouldn't move the level curve. Not a
   decide-point.
5. **Descriptions.** I checked the 20 changed and 6 unchanged entries against the content docs on
   this tree and against `src/data`. All of them match the effect sentences. Two judgment calls are
   accepted as reasonable first drafts for Phase 7's text pass:
   - the Broodwarden and Dozer keep "it never applies … itself";
   - the Overtone keeps "itself included" from the section line.
6. **The Rot Sovereign filter** compares `bossTemplateId` with `ROT_SOVEREIGN.id`. Mutating the
   filter fails `balance-sim-report.test.ts`. The brief already names `ROT_SOVEREIGN.id`.
7. **Repeat Rot Sovereign visits on floors 40+** in the attrition rows: accepted, as the kickoff
   and the plan review said. Only the post-merge `npm run sim` shows how many.
8. **Floor rows**: written into `CONVENTIONS.md#balance-simulator`.
9. **`corpus.ts:7`** stays. Its two anchors hold their claims on this tree:
   - `#the-engine-is-pure-and-deterministic` now states the production-only `src/data` rule and the
     test and corpus exception, which is what V7 asked for;
   - `#every-golden-replays-through-one-shared-runner` holds the "not a `GoldenFixture`" reason.

## What was verified, and how

**Gates on `f947623`**, my own `npm ci` in a sandbox worktree:

| Gate | Result |
| --- | --- |
| `npm run test` | 2550 passed, 1 skipped, 269 files |
| `lint`, `format:check`, `build`, `npx tsc -b` | clean |
| `docs:check -- citations` | PASS, 799 citations in 539 files |
| `docs:check -- comments` | PASS, 7822 comments and 2181 titles |
| `docs:check -- budgets` | 0 over |
| `docs:check -- comment-proof f51a849` | PASS, 30 files, every one OK |

- **CI agrees.** The "CI & Deploy" run 39215337447 on `f947623` passed `test` (lint, format,
  citations, budgets, comments, test), `build` and `e2e`. Deploy was skipped, as on a PR. The
  coding agent's "no `npm ci`" toolchain gap made no difference.
- **Test counts, file by file, against `main`** (JSON reporter on both trees). 2412 → 2551
  (+139); files 261 → 269. Every per-file delta equals the report's table.
- **The removed assertions** are only the frontier, `templateIdOf` and `deepestPlusOne` tests and
  the old signatures. They match `test-inventory.md` and `#bs-listed-test-changes`, and no
  behaviour assertion changed.
- **Goldens.**
  - I imported all 145 `__golden__/*.fixture.ts` on both trees and deep-compared every one of
    their 1343 exports. 44 differ, and every difference is a `description` field only: the
    `traits` registries, and `golden-last-gleam`'s sub-fixtures, which carry the trait.
  - Every `expected*` value is identical.
  - Only three golden files and `node-shims.d.ts` differ from `main`, all as comments. The
    `comment-proof` run covers them.
  - The corpus digest fixture is unchanged.
- **The intro**, re-derived on my own harness, wider than the evidence: 3 specs × 60 seeds, each
  running `newGame`, `setSpec`, `runScriptedIntro`, then `descend(1)` and `descend(2)`.
  - The state after the intro, both descents and the final state deep-equal `main`'s in 180 of
    180 cases. Every intro result is the same.
  - 29 intro logs differ, all of them Sorcerer. In each, the first differing event is a
    `Waited` (`main`) that falls after Pacify landed on the Unicorn.
  - The hand-derived seeds in `store-intro-unicorn.test.ts` (`0xfb8793a6`, `0x192b07e3`) check
    out.
- **CI balance verdicts**: `runSeed` × 40 seeds at `CI_RUN_CAP` on both trees. The thresholds
  and every seed's runs (floor, kind, result, fights) are identical for all three specs. No seed
  passes floor 8, and every seed stops at `cap`.
- **Deep floors, live**: three seeds descended 13 floors each, from 28 to 150, on the real store
  with a level-400 party: 767 fights, 4602 enemies.
  - Every floor resolved to an authored biome.
  - Every enemy held three gems.
  - The preview's boss flag matched the fight count.
  - Floors 40+ fought the Rot Sovereign, and past 100 all three bosses appeared.
- **Mutations**: 47 across every mechanism and site. 46 fail a test:
  - every one in the report's table, and more beyond it: the pin returned unchecked, the
    non-integer reach, each of the four `perkPointsFor` call sites, the `canRecordBossKill` stub,
    the global-map boss check, the repeat no-`set`, each floor-row rule, the boss slot, the
    Unicorn id, the side membership, the template ids, patterns 21 and 27;
  - each reach reader: `checkDescend`, `nextRun`, `RunScreen`, the text.

  The one survivor is real fix 1.
- **Code read against the spec.**
  - `biomeForFloor`'s walk-back and authored-only draw match the brief.
  - `biomeIndex` is the resolved position.
  - The store guard throws on an empty list and on an empty first biome.
  - `checkDescend` folds every bad floor into `floor-out-of-reach`.
  - `recordBossKill` reads `deps.biomes`.
  - The intro uses `rollLoadout` over biome number 1, from its own hash.
  - There are no literals left at the listed sites. The `Math.min(100, …)` in `store.ts` is soul
    percent.
  - The engine stays pure. The new `generation.ts` code imports nothing from `src/data`, and
    `specializations.ts` importing `BIOME_COUNT` is data → engine, which is allowed.
- **The sweep's claims.** I read each M and V12 item's before and after in the `5aaba10` diff and
  spot-checked the facts against `src/data` and the spec:
  - Disorient is Instinct damage plus Web, like Vine Snare;
  - the Igniter and the Cinderlord apply Burn with no duration of their own, while Withering Bolt
    passes 3;
  - the Rot Sovereign's adds are named in its entry;
  - the Hollowroot is `support`;
  - `curves.ts` uses `Math.floor`;
  - the M10, M11, M13 and M14 anchors hold the cited text.
- **Leftover sweep** over `src/`, `e2e/` and `.claude/` (except `phases/` and `archive/`) for
  `contentFrontier`, `beyond-content-frontier`, `frontier`, `deepestPlusOne`, `templateIdOf`,
  `unicornCombatId`, the id regexes, `(3r)`, `'rot-sovereign'`, "× 100", "1000" and
  "cast-role loadout":
  - the `src/` hits are hand-out item 3;
  - the doc hits are folded below;
  - `'rot-sovereign'` remains only as data ids and in a golden.
- **The mailbox** holds only step files and `evidence/` Markdown. Nothing to delete.

## Decide-points

None.

## Docs edited

- `spec/run.md`:
  - `#content-frontier` becomes `#floors-past-the-authored-biomes`: a floor with no content
    fights the last authored biome before it, and boss floors repeat with no new perk points;
  - `#biomes`: the draw past 100 is over the authored biomes;
  - `#scripted-intro`: the enemy Unicorn's biome-1 set and its own stream;
  - `#generation-is-a-pure-seeded-module`: `LAST_FIXED_FLOOR`;
  - `#floor-runs`: `farthestReachableFloor` is the reach rule's one home;
  - `#biomeforfloor`: the walk-back, the authored-only draw, and the resolved position as
    `biomeIndex`;
  - `#content-frontier-and-pins` becomes `#authored-biomes-and-pins`: `biomeHasContent`, and the
    first-biome guard. Nothing outside the spec cited the old anchor;
  - `#boss-floor-generation`: no unauthored biome example;
  - `#enemy-script-and-gem-set`: its Known bug line is removed.
- `spec/store.md`:
  - `#how-store-actions-fail`: the `beyond-content-frontier` reason is gone, `floor-out-of-reach`
    is defined, the budget points at the derived points, and `recordBossKill`'s `unknown-boss`
    and repeat rules are written in. Its Known bug line is removed;
  - `#store-actions`: `canRecordBossKill`, and `floorPreview` never throws. Its Known bug line
    is removed.
- `spec/progression.md`:
  - `#perk-points`: the 100 is config, `perkPointsPerBoss`;
  - `#specializations-are-data`: `specializationPointTotal` and `perkPointsFor` replace the
    literal 1000 and "× 100".
- `spec/creatures.md`:
  - `#levels-and-xp`: the 0.25 is `STAT_GROWTH_PER_LEVEL`;
  - `#player-gem-sets`: the unlock biome reads `LAST_FIXED_FLOOR` through `biomeForFloor`.
- `CONVENTIONS.md`:
  - `#where-each-number-lives`: `STAT_GROWTH_PER_LEVEL` in `engine/config.ts`, the cave-shape
    constants with `LAST_FIXED_FLOOR`, and `perkPointsPerBoss` in `BalanceConfig`;
  - `#balance-simulator`: a seed stops only at its cap, and the floor rows run to the deepest
    floor ran.
- `CI_CD.md#what-the-comments-check-reads`: patterns 21–27, read in comments and titles only.
- `content/enemy-behaviour.md`: the intro Unicorn's biome-1 gem set, and the Rot Sovereign
  repeating on floors 40–100.
- `phases/4.6/brief.md#assumptions`: both `(B)` assumptions ticked, as built.
- Budgets after the sync, all within budget:

  | File | Size |
  | --- | --- |
  | `spec/run.md` | 19.7 / 22 KB |
  | `spec/store.md` | 5.5 / 6 KB |
  | `spec/progression.md` | 5.7 / 6 KB (95%) |
  | `spec/creatures.md` | 19.3 / 22 KB |
  | `CONVENTIONS.md` | 26.2 / 29 KB |
  | `CI_CD.md` | 6.3 / 7 KB |
