# PR review r1 — 4.5-G1: The demo, descent loop and viewer

Reviewed: branch `4.5-g1` at `51a955d` ("build"), against `main` at `1c9f587`. Inputs:
`kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r1.md`, `plan-handout-r2.md`,
`report-r1.md`, `record.md`, and the living docs on the branch.

## Verdict

**Fixes: one real fix, two missing pins, three cleanup items** (`handout-r1.md`). The build is
correct against the kickoff, the brief and the plan as `plan-handout-r2.md` corrects it: every
hand-out item is in the code and pinned, nothing under `src/engine`, `src/state` or `src/data`
changed, and the browser click-through the build session couldn't run passes (run by this review,
`evidence/click-through-r1.md`). What's left is the line-up not saying which side a creature is
on, and two mechanisms no test catches. Six rules the demo restates in `src/app` also move to the
engine, the store and the data in this round (**Decisions**, DP2), so round 2 is larger than the
fixes alone would make it: the hand-out's Part A.

## Real fixes

1. **The line-up doesn't say which side a creature is on.** `lineUpText` prints
   `<label>: level n, n HP` and the viewer stacks both parties in one block. A label carries its
   side only when its name repeats, so a typical fight reads "Glyphmoth Seer, Unicorn Lightbearer,
   Pollinator Duster" with nothing telling the two allies from the foe
   (`evidence/click-through-r1.md`). The brief asks for a line-up *of both sides*; one that can't
   tell them apart misses what it's for. Fix: the allies and the foes each under their own
   heading, split by a pure helper with a test. The brief now says so
   (`phases/4.5/brief.md#descent-result-and-viewer-g1`). Hand-out B1.

## Pins and cleanup (hand-out B2–B6, in this order)

2. **Nothing pins the perk effects in the viewer's set-up fight (M05).** `buildFightView` passes
   `effects: record.playerEffects` to `createCombat`, as the kickoff's first trap asks. Delete it
   and every test in `src/app` and `src/ui` still passes: no shipped perk changes Health or adds a
   spell, so dropping the effects changes no line-up HP or spell name today. It is the same blind
   spot the kickoff pinned for the record party's HP with an inline trait, one input over. Pin: an
   inline player Health stat-modifier in `playerEffects`, line-up HP 30 from base 20. Checked in
   the scratch clone: it passes as built and fails with the effects dropped.
3. **The fight list's labels aren't pinned across both parties (M44, M45).** `fightRow` and
   `fightHeader` each call `labelCreatures` on the record's parties. With either call given the
   player party alone, `fightList.test` still passes, because its only repeated names repeat
   within one side. The rule is "names are counted over both parties", and these are a second and
   third site of it (`CONVENTIONS` asks for a failing test at each). Pin: a name on both sides.
4. **`fightView.ts` cites the wrong rule for two claims.** Its comment cites
   `spec/combat.md#fight-setup` for "setup prepends innate spells" and "sets HP to effective max
   Health". The first is `spec/creatures.md#innate-spells`, the second
   `spec/statuses.md#health-is-a-modifiable-stat`; `#fight-setup` states neither. (The kickoff's
   trap cited it the same way, so the build copied the design agent's slip.)
5. **`engine/generation.ts`'s "Never imported by src/ui/src/app." is now false** (the report's
   first spec question): `names.ts`, `floorPicker.ts`, `descentText.ts` and `sidePanel.ts` import
   `BiomeData` / `SpeciesCreature`, and `floorPicker.ts` imports `biomeForFloor` and
   `isBossFloor`. Decide-point DP1.
6. **`record.md` says the click-through wasn't run.** It now has been; the record points at the
   evidence and lists the round's changes.

## Rules the demo restates (hand-out Part A)

The kickoff's byte-identical rule kept G1 out of the engine, store and data, so where the demo
needed a rule those layers don't export, it restated it in `src/app`, each copy held to the
original by a test. Six of those copies are rules G2's hub and Phase 7's UI need too:

- **The floor preview** (`floorInfo`): generation's boss-floor branch and fight count, the store's
  biome resolution, and the default biomes and balance config the store doesn't expose.
- **Perk points earned, spent and free** (`perkPointSummary`): the store's spend sum, inline in
  its `over-budget` check.
- **A first boss clear** (`runDescent`'s before/after snapshot and the boss line's points): the
  store knows it when it banks the boss; the snapshot needed a plan-review fix (F3) to get right.
- **The fight registries** (`DEMO_REGISTRIES`): the store's private defaults, which the viewer's
  fight rebuild must match exactly.
- **Every creature template** (`buildNameTable`): the third such list, after
  `findStaticCreature`'s and `data/species/names.test.ts`'s.
- **The run-seed bound** (`MAX_SEED`): the store's `MAX_RUN_SEED`.

Their homes are `phases/4.5/brief.md#the-demos-game-layer-homes`. Presentation stays in `src/app`:
playback, event text, labels, field parsing, refusal text, the side-panel and fight-list rows, the
set-up fight rebuilt through `createCombat`, the JSON copy, kills and rounds.

## Decisions

- **DP1: Fix `generation.ts`'s stale comment in this slice.** Accepted (Duncan). Since
  `generation.ts` now changes for A1 too, the proof is the goldens and the corpus digest staying
  byte-identical, not `comment-proof`.
- **DP2: Where the restated rules move.** I recommended a short slice after G1 and before G2,
  keeping G1's approved byte-identical build as it was. **Duncan's call: fold them into this
  round**, under `phases/4.5/brief.md#demo-golden-rule`, which allows a deliberate engine or
  store change in G1 with both approvals. The change is additive: no golden, corpus digest or
  existing engine, state or data test changes, but `data/species/names.test.ts` reading the new
  template list. Round 2 verifies that mechanically.

The recommendation as written before the decision:

- **DP1: Fix `generation.ts`'s stale comment in this slice, comment-only.** The kickoff's golden
  policy says no file under `src/engine` changes, and routed a stale engine comment to **Spec
  questions** for this review to settle. **Recommend: delete the sentence in this slice**, proven
  by `npm run docs:check -- comment-proof 51a955d` (I ran it on the edit: `PASS, 1 changed
  files`). The code, every golden and the corpus digest stay byte-identical, which is what the
  policy protects; a review never parks cleanup for a later slice, and no later slice owns this
  comment. The alternative keeps the policy literal and leaves a false comment on `main` until
  someone trips on it.

The report's other spec questions need nothing:

- **Export `MAX_RUN_SEED` from the store:** no. The restatement is pinned both ways
  (`startRun.test`; mutations M15 and M16 killed), and exporting it is a store change for no
  behaviour. The range is now in `spec/store.md#newgame`, so `startRun.ts`'s citation states it.
- **A spec home for the naming rule:** none needed. It is a demo rule; its home is
  `phases/4.5/brief.md#descent-result-and-viewer-g1`, and `labelCreatures`' comment states it.
- **The `floor-out-of-reach` wording** ("one past the deepest floor cleared") is accurate:
  `deepestFloor` advances only on a full clear (`spec/run.md#a-descent-is-atomic`).

## What was verified, and how

All in a sandbox clone (`git worktree` of `51a955d` and of `origin/main`), `npm ci` on both,
Node 22, Vitest 5.0.3 matching the lockfile.

- **Gates on the branch:** `npm run test` (JSON reporter: 2137 tests, 2136 passed, 1 skipped),
  `lint` (0 warnings), `format:check`, `build`, `npx tsc -b`, `docs:check -- citations` (691 in
  496 files), `-- comments` (7564 comments, 1872 titles): all green. `-- budgets`: 13 files, none
  over, before and after this review's doc edits (`spec/store.md` 3,933 B of 4,000).
- **Test count, file by file:** `main` 1993 (1992 passed, 1 skipped) in 229 files; branch 2137 in
  243. Every file outside `src/app` is identical in count and passes. `src/app`: +144, exactly the
  report's table, `newGame.test.ts` 3 → 2.
- **Byte-identical:** `git diff --stat origin/main..51a955d -- src/engine src/state src/data` is
  empty, so every golden fixture and the corpus digest are unchanged, and no golden was added.
- **Rename and moved text:** `CombatDemo.tsx` is gone and `DescentViewer.tsx` is new (git sees a
  delete and an add: the file was rewritten after the move, as the report says). `describeEvent`
  diffed against `main`'s: every change is a creature id through `label`, or `casts slot N` →
  `casts <spell>` (single and area); every other template and the `never` default are unchanged.
  `groupIntoBeats` and `isBeatStart` are verbatim but for `export`.
- **The code against the spec and the hand-outs:** every item of `plan-handout-r1.md` and
  `plan-handout-r2.md` read in the code: `timerKey` and same-object no-ops; one `timer-elapsed`
  action; the effect reads only `pendingDelayMs` and `dispatch`, keyed on `timerKey` and the
  delay, with no disable comment; one component (`DescentViewer`, keyed by the descent id in
  `RunScreen`) owns the reducer and renders the result list; `startNewGame` gone, `startRun` the
  only start path; trimmed seed field; `floorInfo`'s guard; `runDescent` over the store API with a
  fresh `getState()`; both result lines; `fightHeader`'s N from `floorInfo`; `slot + 1`; the name
  table without `boss.adds`; the presence test on the Sorcerer at 424242; the perk sweep's
  `maxLevel` bound and its allowed/over-budget asserts; the seed bound against a real store; the
  spec order. The store resolves a floor's biome with the same `biomeForFloor(floor, biomes,
  atlasPins, runSeed)` call `floorInfo` makes.
- **Citations the diff adds** (5): `spec/store.md#a-descents-outcome`,
  `spec/run.md#rewards-are-a-run-layer-consumer-of-the-event-log` and
  `spec/progression.md#spending-perk-points` state what their comments say;
  `spec/combat.md#fight-setup` does not (item 4); `spec/store.md#newgame` did not state the seed
  range, and now does (doc edit below).
- **Leftover sweep** over `src/` and the living docs for `CombatDemo`, `startNewGame`,
  `demoFight`, `casts slot`, `randomSeed`, "Not wired into the UI", "combat demo" and "the stub":
  no hits but test fixtures' own "casts slot 0" (an engine script's behaviour, not the log) and
  `ROADMAP.md`'s phase description, which stays. The engine's `__fixtures__` "never imported by
  src/app or src/ui" comments are still true (no demo file imports one). The one stale comment is
  item 5.
- **Mutations:** 45 runs, listed in `evidence/checks-r1.md`. 42 killed by the test the report
  names; M05, M44 and M45 survive the whole `src/app` and `src/ui` suite (items 2 and 3).
- **Live behaviour:** a throwaway scan of 360 real-content descents across the three specs
  (1,107 fights, 170,196 events, perks bought) through every helper the screens call: no throw, no
  creature id in any output line, every fight replays from its copied JSON after its view is
  built, and every cleared floor's fight count matches `floorInfo` (`evidence/checks-r1.md`).
- **Browser click-through**, the kickoff's list, headless Chromium on the dev server (StrictMode
  on) and the production build: every item passes except the boss line (no fresh party reaches
  floor 10 without summoning; its unit test covers it) and the one-block line-up (item 1). 1× is
  2.0 beats a second fresh and 1.8 after jumps, speed changes and new descents mid-wait and
  mid-fight; a speed change 1.5 s into the wait still starts playback at ~3 s; no console warning
  or error. A copied fight's JSON, pasted into a scratch test, reproduces its 95-line log byte for
  byte (`evidence/click-through-r1.md`).
- **Also checked and fine:** the side panel shows the store's default seed before Start (it reads
  the live store, as the brief asks); the report's deviations (`floorResultLine` over
  `fightResults`, one perk per spec in the copy test, `-0` read as 0, a copy button per row, the
  line-up alone for the first beat) are all within the plan; components hold no game rule.
- **Mailbox:** step files, `record.md` and this round's `evidence/` only. Nothing to delete.

## Docs edited

- `.claude/spec/store.md`, `spec/store.md#newgame`: the seed is a whole number in `0..2^32-1`,
  any other throws (what `newGame` does; `startRun.ts` restates the bound and cites this rule).
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#start-screen-g1`: the spec pick lists
  Sorcerer, Brute, Shieldbarer, the data's order (plan review F16).
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#descent-result-and-viewer-g1`: the line-up
  shows the allies and the foes each under its own heading (item 1).
- `.claude/phases/4.5/brief.md`: a new "Decided, not built" entry,
  `phases/4.5/brief.md#the-demos-game-layer-homes` (DP2); `phases/4.5/brief.md#demo-golden-rule`
  and the slice table's G1 row (G1 adds those homes; G2 stays out of the engine, store and data);
  `phases/4.5/brief.md#store-use` (the demo restates no game rule);
  `phases/4.5/brief.md#floor-picker-g1` (the info line reads `floorPreview`); the boss line in
  `phases/4.5/brief.md#descent-result-and-viewer-g1` (read from the outcome).
- `.claude/phases/4.5/G1/brief.md`: golden policy and scope (DP2).
- New evidence: `.claude/phases/4.5/G1/evidence/click-through-r1.md` and
  `.claude/phases/4.5/G1/evidence/checks-r1.md`.
