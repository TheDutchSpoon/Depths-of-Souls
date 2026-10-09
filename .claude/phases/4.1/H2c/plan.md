# Plan — Phase 4.1 — Slice H2c: the first tuning pass

Written against `kickoff.md`, `brief.md`, ASSUMPTIONS 117–129 / 147 / 148 and the code on branch
`phase-4.1-slice-h2c` (= `main`; H2a and H2b merged). Nothing has been run or edited. Plan-local
assumptions are numbered **P1…P24** (the brief's own numbers stop at 148); each is marked inline and
collected in the checklist at the end.

## Findings that change the kickoff's lists (read first)

1. **A 27th golden reads a tuned number.** `golden-g1-leech-sovereign-pacified` materializes the real
   `LEECH_SOVEREIGN` at level 1 (its header: "Health 30, Attack 26…"), so the Health remap
   (30 → 45) moves it. Its subject is a rule (a Pacified striker casts instead of waiting), so under
   ASSUMPTION 147 it is a **mechanism golden and gets pinned**: the fixture spreads the real boss and
   holds `baseStats.health` at 30. It is not in the kickoff's 26 (**P1**).
2. **The "26" is 27 files minus one that reads nothing tuned.** The kickoff's list has 11
   `golden-h2b2-*` files, not 10. `golden-h2b2-vulnerability-once` reads only Vulnerability ×1.5
   (not tuned), so it stays byte-identical as a file and needs no pin. That gives 26 files listed
   (27 with the Sovereign golden above) (**P2**).
3. **Mechanism pins are 17 + 1 + (Regen), not "14".** See the split table; the kickoff's "14" doesn't
   match its own split (1 + 3 + 10 + 3 = 17). I pin by what each file reads, not by the count (**P3**).
4. **Regen stays at 10% (P9).** The Health remap alone lifts every Regen tick by 25–75% (healer's
   Health 16 → 28 base, 20 → 33), so Regen is already tuned by the remap. If the measurement in
   stage 5 shows Regen needs its own change, `golden-h2b2-regen-potency` joins the pinned set and a
   new content golden shows the number (see "New content goldens").
5. **Stale text to fix in code/test comments (not living docs):** `curves.ts` ("Default offset 3",
   ASSUMPTION 4's "a SINGLE Math.round"), `scripts.test.ts:306` ("Its two real users (Snapjaw Lure,
   Stonehorn Warden)" — the Warden stops being a taunter), `roles.test.ts:128` ("the Stonehorn Warden
   starter is the second taunter"), `starters.test.ts` / species-test range titles ("10-30 for every
   stat"), `balance.ts` header ("First tuning pass lands in Phase 4.1-H"), `balance-sim.ts` header
   (floor 5 "first 10 floor runs", "the CI threshold test is H2's"), the `Thresholds` doc comment
   and `StatusDef` placeholder comments in `data/statuses.ts`.

## Step 0 — before anything is edited

- `npm ci`; check `node --version` and tool versions against `package-lock.json` (coding-rules
  "Toolchain").
- **Capture the "before" report** on the unchanged tree: `npm run sim > .claude/phases/4.1/H2c/sim-before.txt`
  (about 14 minutes; run in the background). The "before" tree has no matchup table or per-floor
  first-try rate (they are new report code), so a second "before" pass is run later, with the new
  report code on the **old numbers** (scratch clone, below), and saved as `sim-before-extended.txt`.
  `sim-before.txt` is the unmodified `main` output the PR quotes for every band, verdict, draw rate,
  stack and boss row; `sim-before-extended.txt` supplies only the two new tables (**P4**).
- Capture per-fight corpus digests of the unchanged tree for the stage attribution (below).

## Scratch tooling (outside the repo; nothing here is committed)

Everything below lives in a clone **outside** the repo (`<scratchpad>/h2c-clone`, a `git clone` of the
branch with `npm ci`), so switches never touch the working tree and nothing needs deleting from the
repo. A "stage" is a set of files taken from the branch or from `main`:

| Stage | Cumulative content on top of the previous stage |
|---|---|
| 0 | `main` (the "before" tree) |
| 1 | the curve: `engine/curves.ts` (floor), `data/balance.ts` (`base` 0, `bossLevelOffset` 5) |
| 2 | the Health remap (`data/species/*.ts`, `starters.ts`) |
| 3 | the Stonehorn Warden (Attack 15, `warden`) |
| 4 | Snapback 0.3 and Arcane Bolt 1.0 |
| 5 | the Poison / Burn / Spore (and Regen if changed) percentages |
| 6 | each per-item fix, one at a time |

For each stage the clone runs `npm run corpus:update` into a **per-stage digest copy**; a scratch
script compares fight-by-fight and attributes every fight to the **first** stage whose log differs
from the previous stage's (counts per stage go in the report). The repo's committed digest is
regenerated **once**, at the end, with `npm run corpus:update` on the final tree.

The same clone, with the final simulator code but `data/**` and `engine/curves.ts` taken from `main`,
produces `sim-before-extended.txt` and the "threshold test fails on the before data" proof.

## Approach and module changes, by file

### Config and curve

- `src/engine/curves.ts` — `scaledMinLevel`: `Math.round` → `Math.floor` in **both** branches (≤ 100
  and > 100); one rule in the curve, no rounding-mode config field (the kickoff's lean; **P5**).
  Rewrite the doc comment (ASSUMPTION 4's "SINGLE Math.round" → a single `Math.floor`, still one
  rounding at the very end) and the `bossLevel` comment ("Default offset 5 from 4.1-H2c").
- `src/data/balance.ts` — `levelRangeWidth.base` 2 → 0; `bossLevelOffset` 3 → 5; header comment.
- `src/engine/__fixtures__/balance.ts` — **untouched**. Its flat ×1.00 multiplier makes the minimum an
  exact integer (`floor × 100 × (floor-independent)` ÷ exact), so `floor` equals `round` there, and its
  `base: 2` / `bossLevelOffset: 3` stay (it pins Phase 4's behaviour).

Expected curve (hand-derived: `floor × (99a + (b−a)(floor−1)) / 9900`, a = 125, b = 200; > 100:
`floor × (b + p(floor−100)) / 100`, p = 1):

| floor | raw min | new `{min,max}` | old `{min,max}` | new boss | old boss |
|---|---|---|---|---|---|
| 1 | 1.250 | 1–1 | 1–3 | 6 | 6 |
| 2 | 2.515 | 2–2 | 3–5 | 7 | 8 |
| 3 | 3.795 | 3–3 | 4–6 | 8 | 9 |
| 4 | 5.091 | 5–5 | 5–7 | 10 | 10 |
| 5 | 6.402 | 6–6 | 6–8 | 11 | 11 |
| 6 | 7.727 | 7–7 | 8–10 | 12 | 13 |
| 7 | 9.068 | 9–9 | 9–11 | 14 | 14 |
| 8 | 10.424 | 10–10 | 10–12 | 15 | 15 |
| 9 | 11.795 | 11–11 | 12–14 | 16 | 17 |
| 10 | 13.182 | 13–14 | 13–16 | **19** | 19 |
| 20 | 27.879 | 27–29 | 28–32 | **34** | 35 |
| 30 | 44.091 | 44–47 | 44–49 | **52** | 52 |
| 108 | 224.640 | 224–234 | 225–237 | 239 | 240 |

(Floors 1–9 spawn at 1, 2, 3, 5, 6, 7, 9, 10, 11 and floor 10 at 13–14, floor 30 at 44–47, bosses
19 / 34 / 52: all as the docs say. Floor 108 is the one > 100 case where `round` ≠ `floor`; the ≤ 100
discriminators are floors 2, 3, 6, 9.)

### Content data

- **The Health remap** — a one-time script `.claude/phases/4.1/H2c/health-remap.mjs` (mailbox, so the
  table and the script are reviewable) rewrites `health: N` in `baseStats` of every creature in
  `src/data/species/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts` with
  `floor(20 + (old − 10) × 1.25 + 0.5)`. It **skips the three Flickerlings by creature id** (their
  Health 38 / 25 / 28 equals values that other creatures also hold, so skipping by value would be
  wrong) and writes `health-remap-table.md` (every creature, old → new). Sanity (by hand): 14 → 25,
  16 → 28, 18 → 30, 20 → 33, 22 → 35, 24 → 38, 25 → 39, 26 → 40, 28 → 43, 30 → 45; every old value in
  the data is 14–30, so every result lands in 20–45. 58 creatures change (61 `baseStats` minus the
  three Flickerlings). No fixture or in-test creature is touched.
- `src/data/species/starters.ts` — Stonehorn Warden: `attack` 10 → 15, `defaultScriptId` `'taunter'` →
  `'warden'` (its Health 25 → 39 comes from the remap). Update the stale comments.
- `src/data/traits/overgrowth.ts` — `SNAPJAW_JAWS_TRAIT.spellPower` 0.6 → 0.3 (and the doc comment:
  "(0.3)" now equals the generic Retaliate's, not "bigger").
- `src/data/spells/core.ts` — Arcane Bolt `spellPower` 0.5 → 1.0 (line 22; the other two entries are
  Venom Bolt and the others, untouched). Verify by reading the file that line 22 is Arcane Bolt
  before editing.
- `src/data/statuses.ts` — the DoT percentages. **Starting values** (arithmetic below): Poison 20 →
  **50**, Burn 25 → **40**, Spore 15 → **45**; Regen stays 10 (**P9**). Final values are fixed by the
  stage-5 measurement (bounded loop below), then written into the file and its doc comments ("placeholder"
  wording goes).
- Per-item floor-1 fixes (stage 6): see "Per-item fixes".

### Simulator (`src/state/balance-sim.ts`)

- **Floor-5 window.** New constant `FLOOR5_WINDOW_RUNS = 20` beside `SESSION_TARGET_FLOOR`.
  `FIRST_SESSION_RUNS` stays 10 and keeps reading T3's party size and `deepestAfterSession`. Rename
  `SeedResult.reachedFloor5InSession` → `reachedFloor5InWindow` and `Thresholds.seedsReachingFloor5InSession`
  → `seedsReachingFloor5InWindow`; fix the header comment, both doc comments, and the report line
  ("…in its first 20 floor runs"). `runSeed` computes the flag from the finished `runs` array
  (`runs.slice(0, FLOOR5_WINDOW_RUNS).some(r => r.floor >= SESSION_TARGET_FLOOR)`) instead of
  at `progress.runs === window`, so a seed that stops before the window (a small run cap in tests)
  still gets the right value (**P6**).
- **Matchup data (ASSUMPTION 127).** `FightMetrics` gains `enemyTemplateIds: readonly string[]` (the
  distinct template ids of the enemy creatures: `firstRoundEnemyIds` with the
  `-enemy-<slot>` suffix stripped, `ENEMY_ID` regex already in the file; **P7**). `SeedResult` gains
  `earlyFights: readonly { floor, enemyTemplateIds, result, capDraw }[]` for fights on floors 1 to
  `MATCHUP_MAX_FLOOR = 5` (constant). Pure `buildMatchupRows(results)`: per (floor-agnostic) enemy
  template over floors 1–5: fights, wins, losses, round-cap draws, other draws — a fight counts once
  for each **distinct** enemy template in it, and counts all of that fight's result to it (so a row is
  "fights containing this creature", not "fights this creature decided"; **P8**). Boss fights are
  floor 10+, so none enter.
- **First-try clear rate per floor (ASSUMPTION 127).** Pure `buildFirstTryRows(results, frontier)`: for
  each floor, over the seeds that ever ran it, the share whose **first run on that floor** (any kind)
  cleared. Derived from `RunRecord[]`; no new `SeedResult` field. `SpecReport` gains `matchups` and
  `firstTryByFloor`; `formatSpec` prints both (floors 1–5 table; first-try column for every floor
  1..frontier).
- **Cap.** `runCap` already exists in `SimOptions`; no code change for ASSUMPTION 148 beyond the new
  test.
- No other simulator change; `computeThresholds` keeps its verdict logic (only the field name moves).

### Tests

- `src/engine/curves.test.ts` — default-config tests re-derived (table above); the placeholder-config
  tests untouched (**they prove the placeholder config does not move through the curve**).
- `src/state/balance-sim.test.ts` — rename-following edits; new tests (below).
- New `src/state/balance-thresholds.test.ts` — the CI threshold test (ASSUMPTION 148) and the
  capped-prefix test.
- Data tests: `species/*.test.ts` range tests (Health 20–45 except the Flickerlings; others 10–30;
  the glimmerdark test's special case already does this for the Flickerlings and generalizes), 
  `starters.test.ts` (Warden Attack 15, role, stat total), `roles.test.ts` (`'shieldbarer-starter':
  'warden'`; the count test excludes starters so its totals stay; fix its comment), `statuses.test.ts`
  (the placeholder-potency test names the new numbers), `scripts.test.ts` (comment only; the
  taunter-equals-always-provoke test compares two scripts on the same creature, so it stays valid).

## Golden policy (restated from the kickoff)

**Deliberate, listed**, under ASSUMPTION 147.
- **Mechanism goldens: expected values byte-identical.** Each pins every tuned number it reads in its
  own fixture, in a setup-only edit: `{ ...POISON, potency: { ...POISON.potency, percent: 20 } }`
  under the same id in the golden's own `statuses` registry (likewise Burn 25, Spore 15; Snapback
  `spellPower` 0.6 where it appears; the Sovereign's `health` 30). Shown by importing `main`'s and the
  branch's fixtures and deep-comparing **every** `expected*` export (plus `TURN_STEPS`,
  `EXPECTED_DRAWS` where exported): all equal. Every mechanism golden outside the pinned set stays
  byte-identical **as a file**.
- **Content goldens follow the data, re-derived by hand** (setup, arithmetic and draws in comments).
  None is regenerated by running.
- **New content goldens** show each effect number the slice changes, on real data.
- **Store and integration tests** change only through content (Health remap, the starter), never
  through the curve (their placeholder config is unaffected); each changed expectation is listed with
  its cause.
- **Digest:** regenerated once via `npm run corpus:update`; stage attribution above.

### The split of the goldens that read a tuned number (confirms the kickoff, corrects as noted)

Pin (mechanism; subject is a rule). Reason per file:

| File | Reads | Subject (why mechanism) |
|---|---|---|
| `golden-dot` | Poison (via Venom Bolt) | the DoT lifecycle |
| `golden-f2-dot-one-turn` | Poison | a 1-turn DoT ticks once; born-this-turn |
| `golden-f2-turn-end-interaction` | Spore | tick-kill → on-death spread → born-this-turn |
| `golden-f2-win-over-own-tick` | Poison | win checked before the own-tick |
| `golden-h2b2-carrier-fresh` | Spore | a carrier snapshots fresh |
| `golden-h2b2-reapply` | Poison | single-instance re-application |
| `golden-h2b2-spore-spread` | Spore | spread passes the snapshot on |
| `golden-h2b2-tick-dead-applier` | Poison | dead-applier tick source |
| `golden-h2b2-tick-kill-on-death` | Poison | tick-kill offers no triggering-source |
| `golden-h2b2-tick-living-applier` | Poison | the tick formula's inputs |
| `golden-h2b2-tick-no-retaliation` | Poison, **Snapback** | no retaliation to a tick. Snapback never fires here; I still pin it (0.6) because its expected log must not depend on a number a later retune could set to 0 (**P10**) |
| `golden-h2b2-tick-self-applied` | Poison | self-applied tick is a dealer |
| `golden-h2b2-tick-taken-factors` | Poison | bearer taken factors |
| `golden-spore-spread-filter` | Spore | spread filters out Spored allies |
| `golden-spore-spread-fizzle` | Spore | spread fizzles |
| `golden-spore-spread-dot-kill` | Spore | shared instance-id guard |
| `golden-g1-leech-sovereign-pacified` | the Sovereign's **Health** | Pacify downgrades a lock (**added**, finding 1) |

Not pinned, stays byte-identical as a file: `golden-h2b2-vulnerability-once` (reads nothing tuned);
`golden-h2b2-regen-potency` (Regen unchanged, P9; pinned the moment Regen changes);
`golden-shieldbarer-starter` (its `makeParty` fixture creatures, `always-provoke`, not the real starter).

Re-derive (content; subject is a named content item). All confirmed from the kickoff:

| File | Tuning change that moves it | Number it shows |
|---|---|---|
| `golden-sorcerer-starter` | Arcane Bolt 0.5 → 1.0 | the starter's real cast: `effOff × 1.0` |
| `golden-resonant-overtone` | Arcane Bolt 1.0 (its echo-cast hits) | two bolts |
| `golden-resonant-harmonize` | Arcane Bolt 1.0 | the caster's bolt |
| `golden-sporch-cinderlord-burn-refresh` | Burn % | the Burn tick |
| `golden-hollowkin-wretch-self-dot` | Poison % | the Wretch's self-applied Poison tick |
| `golden-turn-end-dot-kill-burst` | Poison % (Myconet Rotcore's real trait) | the Poison ticks, and the burst's re-snapshot |
| `golden-turn-end-dot-kill-burst-refresh` | Poison % | same, the stronger-snapshot refresh |
| `golden-spore-spread` | Spore % (real Sporecloud Seeder + Spore) | the Spore tick |
| `golden-rot-sovereign` | Spore % (her real Spore blanket) | the Spore tick |

These nine all contain a `DamageApplied` tick or a spell hit today (checked by reading their event
lists), so each shows its number. The subject call for the `turn-end-dot-kill-burst` pair and the
Wretch golden is a judgement (their headers describe a rule, but each is built on a named real trait):
I follow the kickoff and call them content (**P11**); the reviewer may flip them to "pin", which costs
one setup edit each.

### Predicted changed set (before anything runs)

- **Goldens:** 17 pinned (setup-only, expected unchanged); 9 re-derived; **new** content goldens (next
  section). Nothing else: the other ~230 golden files stay byte-identical as files.
- **Unit tests that read a tuned number or the real data** (found by grep; each is checked by running it
  against the tuned data in the scratch clone **before** I edit it, and I list every one that fails):
  `statuses.test.ts` (potency pins), `species/*.test.ts` (range, starter), `roles.test.ts`,
  `curves.test.ts` (default config), `balance-sim.test.ts` (renames, new tests). Candidates to verify, not
  predicted to change: `status-snapshot.test.ts`, `status-timing.test.ts`, `spell-effects.test.ts`,
  `status-containers.test.ts`, `perform-action.test.ts`, `dead-target-pins.test.ts`, `actions.test.ts`,
  `corpus-coverage.test.ts`. Any engine unit test that fails because it borrowed a real status number
  gets the same pin (the real def, one number held), because it tests a rule (**P12**).
- **Store/integration:** `store.test.ts` "adds the Unicorn on a win" (the real Unicorn goes 25 → 39
  Health; `HERO`'s 50 − 15 = 35 no longer one-shots it, so the test's setup or expectation changes,
  cause: Health remap), plus any other test that fights a real starter in `store-hub`, `store-newgame`,
  `store-gems`, `integration`. None moves through the curve (the placeholder config is pinned).
- **Corpus digest:** nearly every fight changes at stage 1 (new enemy levels); the report counts fights
  per stage. `corpus-coverage.test.ts` must stay green with no stale exemption (checked at each stage in
  the clone; a stage that breaks coverage is reported).
- **Counts:** test count reconciled file by file against `main` (`vitest --reporter=json` on both trees).

## Mechanisms and the test that fails with each removed (every site)

| Mechanism | Sites | Test that fails with it removed |
|---|---|---|
| Rounded-down minimum | `scaledMinLevel` ≤ 100 branch; > 100 branch | `curves.test.ts` pins `enemyLevelRange` for floors 1–10, 20, 30 (floors 2, 3, 6, 9 fail with `Math.round`) and floor 108 (fails with `Math.round` in the > 100 branch); each branch is mutated separately in the scratch clone and the failing test named in the report |
| Width base 0 | `balance.ts` | the same table (floor 1 `{1,1}`; fails at base 2) |
| Boss offset 5 | `balance.ts` | `bossLevel` pinned at floors 10 / 20 / 30 = 19 / 34 / 52 (fails at offset 3: 17 / 32 / 50) |
| Placeholder config doesn't move | `__fixtures__/balance.ts` | the existing placeholder curve tests stay green and untouched; shown by running them against the floor change |
| Health remap | 58 creatures in 4 files | range test per species file: Health 20–45 (fails at any un-remapped old value, e.g. 14); the Flickerling guard (`[38, 25, 28]`) fails if the script remapped them |
| Warden starter | `starters.ts` attack and role | `starters.test.ts` (Attack 15, stat total 90 pre-remap-independent: attack + intelligence + defence + speed + base-health check on the old 25), `roles.test.ts` (`warden`); plus a new behavioural check in `scripts.test.ts`: a Warden with an ally below 50% Provokes, with none attacks (fails under `taunter`, which Provokes always) (**P13**) |
| Snapback 0.3 | `overgrowth.ts` | **new** `golden-h2c-snapback` (below), hand-derived on the real trait; fails at 0.6 |
| Arcane Bolt 1.0 | `core.ts` | `golden-sorcerer-starter`, `-overtone`, `-harmonize` re-derived; each fails at 0.5 |
| Poison / Burn / Spore percentages | `statuses.ts`, each status | `statuses.test.ts` pins the declared numbers; the content goldens above show each tick (Poison: wretch-self-dot, turn-end-dot-kill-burst(-refresh); Burn: sporch-burn-refresh; Spore: spore-spread, rot-sovereign); each fails with its number reverted (reverted one status at a time in the clone, failing files named) |
| Floor-5 window 20 | `runSeed`, `computeThresholds` | new test on hand-built `SeedResult`s: a seed reaching floor 5 on run 15 counts, on run 21 does not; fails with the window at 10. T3's party size is still read at run 10 (fails if `FIRST_SESSION_RUNS` is changed) |
| Matchup table | `buildMatchupRows`, `FightMetrics.enemyTemplateIds`, `earlyFights` | tests on hand-built events/results: counts per template, a duplicate template in one fight counted once, floors > 5 excluded, draws split cap/other; fails if any is removed. A fight-level test feeds hand-built events through `analyzeFight` for the template ids |
| First-try rate per floor | `buildFirstTryRows` | hand-built `RunRecord`s: a failed first run then a clear counts as a miss, a farm-then-push order, a floor never run is absent; formatter test on the printed lines |
| CI threshold test | new test file | green on the tuned data; **fails on the before data** (clone with `data/**`, `curves.ts` from `main`), shown in the report |
| Run cap changes nothing before the cap | `runSeed` | capped-prefix test (below) |
| Pins | 17 fixtures | the pinned goldens' expected exports equal `main`'s (import comparison script); each pinned golden fails if its pin is removed (checked in the clone, one file at a time, for a sample of each status: Poison, Spore, Snapback, Health) (**P14**) |
| Per-item fixes / DoT percent content goldens | see below | each new/re-derived golden fails with its number reverted |

### The CI threshold test (ASSUMPTION 148)

- File `src/state/balance-thresholds.test.ts`, in the normal suite: `buildReport({ seeds: SIM_SEEDS,
  runCap: 30, probeBosses: false })` (all three specs, 40 seeds), then for each spec asserts
  `thresholds.floor1Pass`, `.firstSoulPass`, `.floor5Pass` are true. Never a value (ASSUMPTION 106).
  The failure message prints the spec, the three values and verdicts.
- **Capped = uncapped for runs 1–30:** for the smoke seeds (1, 2, 3) × the three specs, `runSeed` with
  `runCap: 30` and with `runCap: RUN_CAP` (probe off for both) → deep-equal `runs.slice(0, 30)`. That
  is 9 uncapped seeds; if it adds more than about 45 s I cut to seed 1 only and say so (**P15**).
- **Runtime:** measured as the suite's wall time with and without the file (3 runs each, medians),
  plus the file alone. **Stop and ask** if it adds more than about 2 minutes. My estimate before
  measuring is under a minute (120 seed runs × 30 runs, no probe, versus 14 minutes for 120 × up to 400
  runs with the probe).
- **Before-data proof:** run the file in the scratch clone with the old numbers; expected to fail on
  floor-1 (Shieldbarer first-try far below 80% on H1's report). Output saved to the report.

## DoT percentages: the arithmetic

A tick is `max(1, floor(potency × affinity × Π(taken) − 0.2 × Def))` with
`potency = floor(floor(applier stat) × percent / 100)` and both stats at the creature's level
(`round(base × (1 + 0.25(L−1)))`). With equal levels the level factor cancels, which is why the
tick is level-stable; what moves it is the level gap. Computed with a scratch script (not committed)
for a typical applier stat 20 (the biome range is 10–26; the Sorcerer starter's Attack is 10), against
a typical Defence 14 and a tank's 28, with party level = floor and enemy level = the new curve's
minimum (floors 1 / 5 / 10 / 30 → enemy levels 1 / 6 / 13 / 44; party 1 / 5 / 10 / 30). "P→E" is a
party applier on an enemy (the enemy is the higher level, so its Defence is larger); "E→P" is the
reverse. Affinity ×1, no taken factors, no Defend.

| Percent | Case | Floor 1 P→E | Floor 5 | Floor 10 | Floor 30 P→E | Floor 30 E→P |
|---|---|---|---|---|---|---|
| 20 (today) | A20 vs D14 | 4 → **1** | 8 → **1** | 13 → **1** | 33 → **1** | 47 → 23 |
| 20 | A20 vs tank D28 | 4 → **1** | 8 → **1** | 13 → **1** | 33 → **1** | 47 → **1** |
| 35 | A20 vs D14 | 7 → 4 | 14 → 7 | 22 → 10 | 57 → 24 | 82 → 58 |
| 35 | A20 vs tank D28 | 7 → **1** | 14 → **1** | 22 → **1** | 57 → **1** | 82 → 35 |
| **50** | A20 vs D14 | 10 → 7 | 20 → 13 | 32 → 20 | 82 → 49 | 117 → 93 |
| **50** | A20 vs tank D28 | 10 → 4 | 20 → 7 | 32 → 9 | 82 → 16 | 117 → 70 |
| **50** | A10 (Seer-like) vs D14 | 5 → 2 | 10 → 3 | 16 → 4 | 41 → 8 | 59 → 35 |
| 60 | A20 vs tank D28 | 12 → 6 | 24 → 11 | 39 → 16 | 99 → 33 | 141 → 94 |

(each cell is `potency → tick`; **bold 1** is a tick on the floor.) Reading it:
- At 20% a tick is 1 on every party-applied case, and on a tank for both sides: DoT is inert, which
  is the 93% (4,971 of 5,318) of the H2b2 review.
- A tank is the case DoT exists for (ASSUMPTION 113): an Attack of 20 against Defence 28 does the chip
  (1–2); a DoT must beat that. 35% still ticks 1 against a tank on the party's side at every floor; 50%
  ticks 4 / 7 / 9 / 16 at floors 1 / 5 / 10 / 30.
- The party-applies-on-enemy side loses ground with depth (enemy level above the party's), so the
  percent is chosen so the **worst** tank case (floor 30 P→E) still clears: 50% gives 16.
- Strength sanity: at 50% a typical floor-1 tick (7) against a floor-1 enemy of ~28 HP is about a
  quarter of its HP per turn for three turns; a direct hit of the same stat (20 − 14 = 6 + chip) is 6.
  So a Poison costs the applier a turn and returns about three hits' worth against a typical target, one
  against a tank. That is strong; if the simulator shows DoT dominating, the loop below steps down.
- Burn is Intelligence-based (Int runs to 26–30 on casters, so it gets a lower percent at equal
  strength): 40% of 26 = 10 ≈ Poison's 50% of 20. Spore is Speed-based (Speed 14–22 on its appliers) and
  also spreads: 45%.

**Stage-5 loop (bounded):** in the scratch clone, for the candidate set {Poison 50, Burn 40, Spore 45},
measure (a) the min-1 share of the corpus ticks (target: under 25%; today 93%, **P16**), (b) the simulator's
floor 1–5 matchup table and the three verdicts with the cap-30 probe-off configuration, and (c) the
round-cap draw rate and largest stacks. Step each percent in units of 5 within [25, 60] — at most 4 steps
per status — and stop on the first set that clears (a) without making the Sorcerer / Brute / Shieldbarer
floor-1 first-try drop more than 5 points. The final numbers are what the report lists; nothing outside
the range or the step count without a stop-and-ask.

## Per-item fixes (stage 6) and the Rallying Cry / Flare measurement

The matchup table needs the new report code, so the fix list cannot be final before the build.
What I commit to now:
- **Lever order (P17):** (1) a base stat of the problem creature within its range (Health 20–45,
  others 10–30), covered by the data tests (ASSUMPTION 147 exempts base stats from needing a content
  golden); (2) a number in its trait (factor, percent, chance), which **does** need a hand-derived
  content golden showing the new number on real data, failing with it reverted. Nothing else: no new
  mechanism, no cap, no changed decided number (117–125).
- **Suspects (from ASSUMPTION 129, measured before the Health remap):** Spider Weaver, Pollinator
  Beneficiary and Pollenlord (Wit casters beating the Shieldbarer's Endurance), and the level-1 Treant
  Elder (Defence 20 plus self-heal) from the grill's evidence. I do **not** pick numbers now.
- **Procedure:** after stage 5, run the cap-30 probe-off report; for each spec below 80% on floor 1, list the
  matchup rows with the lowest win rate; change **one creature's one number at a time**, re-measure, and
  stop at the first set that brings every spec to ≥ 80% (or the Shieldbarer's best attainable). Each fix
  is reported with the matchup row it answers, before and after.
- **Stop and ask** (a "bring it back to design" signal) if: more than 5 per-item fixes are needed
  (**P18**); a fix needs anything but one number on one item; the Shieldbarer can't reach 80% with those
  fixes (kickoff: "giving up on the 80% threshold for a spec"); or the post-fix Sorcerer / Brute drop below
  80% on any threshold.
- **Rallying Cry and the Flare: measure first, change nothing now.** The "before" report gives the baseline
  largest growth stack (Rallying Cry on a player creature; the Flare's compounding Speed on an enemy or
  player creature; the report's `largestStacks` already attributes by trait id). After stage 3 (Warden) the
  same figures are read again. Rallying Cry stays unchanged unless the after-report's largest Rallying
  Cry stack is not below the before-report's (ASSUMPTION 123 expects "far less" under `warden`). The Flare
  stays unchanged unless its largest stack on the after-report is at or above the corpus' worst
  (×407–×539) with a 100-round draw it causes. If either happens I **stop and ask with the numbers**
  rather than proposing a factor blind (**P19**).
- If a per-item fix touches the Wick or Flare (ASSUMPTIONS 140, 141), it changes only a percent in
  `glimmerdark.ts` and the `h2b1-*` goldens (which use the real Flickerlings) are re-checked, pinned if
  they fail (they are mechanism goldens).

## Health readers (what the remap moves; stage-2 attribution)

Max HP (the Health stat, `getEffectiveStat(…,'health')`); the Additional's cap
`floor(0.2 × target maxHP)` (`engine/damage.ts`, `config.ts`: for a level-1 attacker the cap is
`min(floor(0.2 × maxHP), 10)`, so the remap lifts it from `floor(0.2 × 16) = 3` to `floor(0.2 × 28) = 5`
on a typical target); Regen's potency (10% of the **healer's** Health, `statuses.ts`); the Wick's burn
(10% of its own max HP, `glimmerdark.ts:42`) and heals (20% of its own Health, `:52`); Afterglow and
the other `stat: 'health'` stat-modifier traits (`glimmerdark.ts:331,341`, `overgrowth.ts:150,192`,
`rotcap-hollow.ts:146`); the HP-percent conditions and Defend/pct comparisons (read max HP, integer
cross-multiplication); the Unicorn's revive HP; the XP-independent Max-HP display in the UI (read-only,
not code that changes). The Flickerlings are unchanged, so the Wick/Flare goldens (`h2b1-*`, real
Flickerlings) don't move; the Sovereign golden does and is pinned.

## New content goldens (hand-derived, on real data), per number

| Number | Golden | Status |
|---|---|---|
| Arcane Bolt 1.0 | `golden-sorcerer-starter` (+ overtone, harmonize) | re-derived |
| Snapback 0.3 | **new** `golden-h2c-snapback`: a real Snapjaw Jaws bearer is attacked by a known attacker; the counter is `effOff = Attack × 0.3` as **indirect** damage `MAX(1, floor(0.3·Attack × affinity × … − 0.2·Def))`; chosen so the result is > 1 and differs from the 0.6 result | new |
| Poison % | `golden-turn-end-dot-kill-burst` (+ `-refresh`), `golden-hollowkin-wretch-self-dot` | re-derived |
| Burn % | `golden-sporch-cinderlord-burn-refresh` | re-derived |
| Spore % | `golden-spore-spread`, `golden-rot-sovereign` | re-derived |
| Regen % | none (unchanged; **P9**); if it changes: new `golden-h2c-regen` | conditional |
| Each per-item trait number | one new `golden-h2c-<creature>-<trait>` per fix | new, as needed |

In every re-derived golden the chosen setup keeps the tick **above the minimum of 1** at the new
percentage (so the number is visible and a revert changes the log), with the arithmetic in comments.

## Report additions: tests (like H1's report)

- `buildMatchupRows` / `buildFirstTryRows`: hand-built `SeedResult`s/`RunRecord`s (cases in the
  mechanism table); `formatSpec` lines via a snapshot-free `toContain` on the printed rows.
- Determinism test (existing): still green with the new fields; same seeds → identical report.
- Thresholds: `computeThresholds` on hand-built results incl. the renamed field.

## Gates and proofs the report will contain

`npm run test` (with the threshold test; count reconciled file by file against `main`), `lint`,
`format:check`, `build`, `npx tsc -b`; the mechanism-golden import comparison; the digest stages;
the before/after report (T1–T5, the three verdicts and values, round-cap draw rates, largest stacks, boss
rows, matchup table, first-try per floor); the threshold test's before-data failure, capped-prefix test
and runtime; the Health table (from the script); **Spec questions** (below) and **Content changes**
(Health table, starter, Snapback, Arcane Bolt, each potency, each fix old → new); **To delete:** none
(the scratch clone lives outside the repo; I create no repo files that need deleting).

**Spec questions I already expect to report** (living docs untouched): GAME_DESIGN / content docs'
numbers for the above; the Phase 4 placeholder-config text in CONVENTIONS ("round" wording in the enemy
level curve bullet is already updated; the `bakes level into baseStats (round(...))` line is unrelated);
`WORKFLOWS`' golden-policy text for the Sovereign-style case (a mechanism golden that borrows a real
creature's *base stat*, not only a status/spell/trait number: ASSUMPTION 147 says "every tuned number
it reads", which covers it, but the examples in CONVENTIONS list only status, spell and trait numbers).

## Assumptions checklist

- **P1** `golden-g1-leech-sovereign-pacified` is a mechanism golden and is pinned (Health 30).
- **P2** The kickoff's 26 is 27 files with 11 `golden-h2b2-*`; `golden-h2b2-vulnerability-once` reads
  nothing tuned and is untouched.
- **P3** The pinned set is decided by what each file reads (17 files), not by the kickoff's "14".
- **P4** `sim-before.txt` is the unmodified `main` report; the matchup and first-try tables for "before"
  come from a second run with the new report code on the old numbers (scratch clone).
- **P5** One rounding rule in `scaledMinLevel` (`Math.floor`, both branches); no config field.
- **P6** The floor-5 flag is computed from the finished `runs` array at the new window of 20, not at the
  moment `runs === window`; `FIRST_SESSION_RUNS` stays 10.
- **P7** The matchup keys are distinct enemy template ids (from the `-enemy-<slot>` suffix).
- **P8** A matchup row counts a fight once per distinct enemy template in it, with the fight's result;
  floors 1–5 only; a row is "fights containing this creature".
- **P9** Regen stays at 10% (the remap already lifts it); revisit only if the stage-5 measurement shows
  a need.
- **P10** `golden-h2b2-tick-no-retaliation` pins Snapback (0.6) although it never fires there.
- **P11** The Wretch self-dot golden and the two `turn-end-dot-kill-burst` goldens are content goldens
  (kickoff's split), re-derived rather than pinned.
- **P12** Any engine unit test that fails because it borrowed a real status/spell/trait number is
  pinned in setup (it tests a rule), not re-derived.
- **P13** A new behavioural test in `scripts.test.ts` for the Warden's `warden` role on the real
  starter (Provoke only when an ally is below 50%).
- **P14** Pin effectiveness is shown by removing the pin in the clone for a sample (one per status,
  Snapback, Health), not for all 17 files.
- **P15** The capped-prefix test uses the three smoke seeds × three specs uncapped; reduced to seed 1 only
  if it adds more than about 45 s.
- **P16** The DoT target is "min-1 share of corpus ticks under 25%", the starting set is Poison 50 /
  Burn 40 / Spore 45, stepped in 5s within [25, 60] (at most 4 steps per status), with floor-1 first-try
  not falling more than 5 points.
- **P17** Per-item lever order: a base stat (data-test covered), then a trait number (with a content
  golden); never a mechanism, a cap or a changed decided number.
- **P18** More than 5 per-item fixes is a stop-and-ask.
- **P19** Rallying Cry and the Flare stay unchanged unless the after-report shows no improvement for
  Rallying Cry or a Flare-caused 100-round draw; either case is a stop-and-ask, not a blind factor.
- **P20** The Health script skips the Flickerlings by creature id, and lives with its table in the
  mailbox (`health-remap.mjs`, `health-remap-table.md`).
- **P21** Stage attribution runs in a scratch clone outside the repo, using `npm run corpus:update` per
  stage into per-stage copies; the repo digest is regenerated once at the end.
- **P22** Pins are written inline in each fixture (the spread under the same id), not in a shared helper,
  as the kickoff words it.
- **P23** The `earlyFights` field covers floors 1–5 only (`MATCHUP_MAX_FLOOR = 5`) to keep the seed
  results small.
- **P24** The "before" report is the full `npm run sim` (probe on, 400 cap, ~14 min); the tuning loop uses
  cap 30 / probe off / 40 seeds, and the full report is rerun only at stage 6's end.
