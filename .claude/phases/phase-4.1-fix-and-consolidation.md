# Phase 4.1 — Fix & Consolidation Pass

Status: **in progress.** One section per landed slice (4.1-A here; 4.1-B–H append their own
sections as they land). Brief: `.claude/briefs/phase-4.1-implementation-plan.md` (its own
`Status:` line is untouched by this record).

## 4.1-A — Data, store & generation

Items built: **G3, G5 + S5, G6, A5, A6, A7 (with D1's defaults), S4.** No engine combat/
resolution/interpreter logic changed — every engine golden stays byte-identical (only
`generation.ts`/`curves.ts`/`leveling.ts`/`types.ts` changed, none of which the resolver's own
goldens exercise beyond `materializeCreature`'s pure output shape). Landed as PR #67 after a
review pass found seven real bugs in the first submission (F1–F7 below) plus several places
where a test had been loosened past the point of actually proving what it claimed; all are fixed
on the same branch.

### What was built

- **`BalanceConfig`** (`engine/balance-types.ts`, NEW) — the shape; values in `data/balance.ts`
  (`DEFAULT_BALANCE_CONFIG`, the new tuned numbers) and a test-only fixture
  (`engine/__fixtures__/balance.ts`, `PHASE_4_PLACEHOLDER_BALANCE_CONFIG`, reproducing Phase 4's
  exact generation/curve numbers). Fields: fight-count base/per-floor, enemy-party-size cap, the
  level multiplier (in **hundredths**, so `enemyLevelRange` does its whole min-level computation
  in exact integer arithmetic with a single `Math.round` at the end — the plan-review's own
  correction), level-range width, boss-level offset, rarity draw weights, soul-gain percentages,
  the XP curve coefficient/exponent, the XP-per-kill multiplier, and currency-drop parameters
  (`bricksPerTenFloors`, renamed from the plan's draft `bricksPerFloor` per review).
- **`curves.ts`** (`enemyLevelRange`, `fightCount`, `enemyPartySize`, `bossLevel`) and
  **`leveling.ts`** (`xpForNextLevel`, `xpAwardForKill`) now take a `BalanceConfig` argument
  instead of reading hardcoded literals. `xpAwardForKill`'s signature changed from `(floor)` to
  `(victimLevel)` — XP per kill is now the victim's own level (ASSUMPTION 5), which only
  `Creature.origin.level` (below) makes readable at the reward call site.
- **`Creature.origin: { templateId, level, ref? }`** (`engine/types.ts`) — required,
  engine-inert. `materializeCreature` now takes a named options object
  (`{ level, side, slot, speciesId, gems?, scriptId?, ref? }` — `gems` renamed from the old
  positional `equippedSpells` param to match its eventual 4.1-G source, `Instance.gems`) and
  fills `origin` from the template id / level / an optional opaque `ref` string (spread only when
  defined, so a generated enemy's `origin` carries no explicit `undefined` key — review nit).
  `makeCreature` (the shared engine test helper) defaults `origin` so the ~140 existing
  golden/fixture files didn't need touching; the one hand-rolled `Creature` literal outside that
  helper (`effective-stats.test.ts`) and the ten in `src/app/demoFight.ts` got `origin` added by
  hand.
- **`materializeCreature`'s `scriptId` option is wired, not deferred** — this was originally
  flagged as an open question (defer vs. build); the review confirmed **wire it**: an explicit
  `scriptId` overrides the template's `defaultScriptId` (`null`/absent falls back to it,
  ASSUMPTION 6), and `resolvePlayerParty` (`state/store.ts`) passes `instance.scriptId` through.
  Nothing sets a non-null `Instance.scriptId` yet (no script-assignment UI exists before a later
  phase), but the plumbing is real end-to-end — proven by a store test that gives an instance
  `scriptId: 'always-defend'` and asserts a `Defended` event fires.
- **`Instance`** (`state/rewards.ts`) reshaped to the save-v1 shape: `{ id, source, level, xp,
  scriptId }`, `source: { kind: 'creature', creatureId } | { kind: 'fusion', identityParent,
  affinityParent }` (only `'creature'` is ever produced before Phase 8; `staticCreatureIdFor`
  throws on `'fusion'`, ASSUMPTION 27). `id` is now opaque (`'inst-<ordinal>'`, A6), never
  embedding the creature id — previously `${creatureId}#${ordinal}`.
  `GameState.collection` is now a flat `Map<InstanceId, Instance>` (was
  `Map<string, Instance[]>` bucketed by static creature id); every consumer
  (`resolvePlayerParty`, `applyXpToParty`, `grantCreatureIfUnowned`) rewritten around it.
- **Store action rule** (`state/store.ts`): `descend`/`pinBiome` return `{ ok: true, ... } |
  { ok: false, reason }` instead of throwing; each gets a pure `can…` query
  (`canDescend`/`canPinBiome`) sharing the same check function
  (`checkDescend`/`checkPinBiome`). `descend` reasons: `no-spec`, `empty-party`,
  `floor-out-of-reach`, `beyond-content-frontier` (frontier wins when both fail at once,
  ASSUMPTION 23). `pinBiome` reasons: `floor-out-of-range`, `unknown-biome`,
  `biome-has-no-content` (the last one added by review fix F1, below). `setSpec`/
  `runScriptedIntro` still throw (ASSUMPTION 9 — impossible states, never player-reachable
  without a UI that already prevents them). A `{ ok: false }` result leaves state completely
  unchanged (both actions' own table-driven tests assert full reference equality on
  `store.getState()` across every reason, not a field-by-field spot check).
- **`contentFrontier(biomes)`** (`engine/generation.ts`, NEW) — the last floor of the
  **contiguous prefix** of has-content biomes (tightened by review fix F1, below — see "Review
  fixes"); `× FLOORS_PER_BIOME`. Against the real `BIOMES` array (3 authored biomes, no gaps)
  this is `30`.
- **`currentFloor` → `lastFloor`** (`GameState`); **`travelTo` deleted** — fast-travel is
  `descend(floor)`.
- **G3 — creature names.** `SpeciesCreature.name: string` (required). Authored for all 61 real
  creatures: the 54 biome creatures (species word + role, read directly off each biome's own
  "Roles" table in `.claude/content/*.md` rather than re-derived, since those tables already
  encode the correct — and inconsistent, e.g. "Snapjaw Jaws" vs "Blindclaws Setter" —
  species-prefix convention), the 3 bosses (Broodmother, Leech Sovereign, Rot Sovereign), and the
  4 starters/Unicorn (Glyphmoth Seer, Cragfang Mauler, Stonehorn Warden, Unicorn Lightbearer —
  marked as placeholders in a code comment, per ASSUMPTION 25). A new
  `data/species/names.test.ts` asserts non-empty + unique across the real registries (test
  fixtures are exempt). The matching `species-locked.md` edit (ASSUMPTION 25 also asks for the
  placeholder marking there) came from the review's doc-sync and is committed on this branch
  (`feedback docs`), not authored by the build.
- **S4 — Vitest project split** (`vite.config.ts`): `test.projects`, one Node project, one jsdom
  project. The Node project's `include` is a single catch-all (`src/**/*.test.{ts,tsx}`) minus
  the jsdom project's own two folders (`src/ui/**`, `src/app/**`) — **not** an enumerated
  `src/{engine,data,state}` list, which silently drops any test under a future new top-level
  folder (review fix F2, below). A guard test (`engine/environment.test.ts`) asserts
  `typeof window === 'undefined'` so a config regression that routed engine tests through jsdom
  would fail loudly. Measured wall-time impact (same machine, same test count, back-to-back
  runs): **12.94s → 3.39s** total (`environment` time specifically: **181.33s → 0.62s** aggregate
  across projects — jsdom setup was the dominant cost, matching CONVENTIONS' own note).

### Review fixes (PR #67)

- **F1 — atlas pins could route `descend` into the generator's own throw.** `pinBiome`/
  `canPinBiome` now refuse a biome with no content (`biome-has-no-content`): no species with a
  positive weight AND at least one creature — exactly the condition `generateFloor`'s own
  `weightedPick` needs to avoid throwing. The shared predicate,
  `biomeHasContent(biome)` (`engine/generation.ts`, exported), backs both this guard and
  `contentFrontier`, which is now the last floor of the **contiguous prefix** of has-content
  biomes (stops at the FIRST gap, never resumes at a later authored biome past it) rather than
  "the last non-empty biome in the list" — a biome-2 gap followed by an authored biome 3 used to
  make floors 21–30 look reachable even though `biomeForFloor` would still resolve the empty
  biome 2 for floors 11–20 and throw there. A regression test reproduces the exact bug report
  (`setSpec` → `runScriptedIntro` → `pinBiome` into an empty biome → `descend` throwing) and
  confirms the pin is now refused before it can happen.
- **F2 — the Vitest split silently dropped tests in any new top-level folder.** The Node
  project's `include` changed from an enumerated `src/{engine,data,state}` list to
  `src/**/*.test.{ts,tsx}` minus the jsdom project's own folders — verified by temporarily adding
  a throwaway `src/zzprobe/x.test.ts` (collected file count went 107 → 108, then back to 107
  after removing it). A permanent guard test (`engine/environment.test.ts`) now also fails loudly
  if `src/engine` were ever routed through jsdom.
- **F3 — ASSUMPTION 23's frontier-wins-over-reach precedence wasn't actually pinned.** The
  original test used `deepestFloor: 15, descend(11)`, where only the frontier check fails (reach
  alone would have passed) — swapping `checkDescend`'s two checks left it green. A new case uses
  `deepestFloor: 0, descend(11)`, where BOTH checks fail, and asserts `beyond-content-frontier`
  wins; the original case is kept too, relabeled as what it actually tests (the frontier failing
  alone).
- **F4 — the "rewards read origin" regression test didn't discriminate the deleted suffix
  parser.** The old parser sliced `-${side}-${slot}` off the per-fight `CreatureId` by exact
  length, so it resolved the branch's own confusable-id fixture correctly too — the test passed
  against the code it was meant to catch a regression in. The per-kill static lookup is now a
  standalone pure helper, `resolveKillReward` (`state/rewards.ts`), unit-tested directly with a
  `makeCreature` whose `id` and `origin` deliberately disagree (`id: 'aaa-enemy-0'`,
  `origin: { templateId: 'bbb', level: 4 }`) — the old parser would have resolved `aaa`
  (wrong); `resolveKillReward` resolves `bbb` (right) because it reads `origin.templateId`
  directly, no string surgery. The store-level confusable-id test is kept as a smoke test
  (descend() actually reaches the helper through a real generated fight) and relabeled as one,
  not a regression test.
- **F5 — the default-config soul-gain test couldn't catch a wrong tier.** `gain % per === 0`
  over `{25, 20, 10}` accepts any multiple of 10, so a common kill misclassified as 20 (or a
  common kill reported as 10) would both have passed. A new deterministic store test drives three
  distinct rarity tiers through the stub RNG under `DEFAULT_BALANCE_CONFIG` and asserts the exact
  per-kill amounts (common → 25, rare → 10), hand-derived in the test's own comment from
  `rarityDrawWeight`'s threshold bands.
- **F6 — the Phase-4 placeholder config's XP claim was half wrong.** The fixture set BOTH
  `xpCurveCoefficient`/`xpCurveExponent` to the new defaults and a test asserted "there is no
  old-compatible expression of the retired linear curve" — false for `xpForNextLevel`: Phase 4's
  `100 * level` is exactly `{coefficient: 100, exponent: 1}`, the same two parameters as the new
  default's `{20, 2}`. Only `xpAwardForKill` is truly inexpressible (floor-scaled → victim-level-
  scaled is a signature change, not a parameter change). Fixed: the fixture now sets
  `{100, 1}`; the false test is deleted; `applyXpGain`'s original four test cases (byte-identical
  numbers to main, pre-4.1) are restored under the fixture in their own block, alongside (not
  replacing) the new default-curve block. The integration tests' `xpBanked` values (`8`, `38`)
  are unaffected — `xpAwardForKill` never reads the curve fields.
- **F7 — several tests had been loosened past the point of proving their own claim.** Fixed:
  - The two boss-floor `xpBanked` assertions were ranges (`26–29`, `10–13`) even though
    `runSeed: 99` makes the add's rolled level fully deterministic (never stubbed in these two
    tests) — pinned exact (`29`, `13`), generated-then-checkpoint-verified.
  - The integration test's `['inst-0', 'inst-1']` check proved the ids were opaque but not which
    creature was which — now also asserts `collection.get('inst-0').source` /
    `collection.get('inst-1').source` resolve to `brute-starter` / `unicorn`.
  - The single-reason, three-field "state is left unchanged on refusal" test is now table-driven
    over all four `descend` reasons (and, mirroring it, all three `pinBiome` reasons), each case
    asserting full reference equality on `store.getState()` (not a spot check) AND that
    `canDescend`/`canPinBiome` agree with the action itself — closing out the brief's own
    "`canDescend` agreeing with `descend`" acceptance item for every reason, not just one.

### Surfaced during build (not a doc conflict — a data point for 4.1-H)

Measured on this branch (fresh store per seed, `setSpec` + `runScriptedIntro` + `descend(1)`,
the real `DEFAULT_BALANCE_CONFIG`, `runSeed` swept `0..199` per spec — method: a throwaway sweep
script, run once, torn down after recording the numbers here):

| Spec | Floor-1 clear rate | Pooled per-fight win rate |
|---|---|---|
| Brute | 104/200 (52%) | 0.936 (1404/1500) |
| Sorcerer | 88/200 (44%) | 0.920 (1294/1406) |
| Shieldbarer | 87/200 (44%) | 0.919 (1289/1402) |

This is CONVENTIONS' own accepted risk ("floor success ≈ (per-fight win chance)^(fights), so a
small per-fight loss rate compounds") made concrete the moment `fightCount` rose from Phase 4's
flat 3 to the new `10 + (floor−1)`: a ~92–94% per-fight win rate compounds to `0.92¹⁰..0.94¹⁰`
≈ **43–52%** over a full floor-1 clear, matching the measured clear rates closely. Not something
this slice needed to fix (4.1-A ships no balance pass; 4.1-H owns the first tuning pass), but
recorded now, with method, as the 4.1-H starting point: **well below** both T1 (≥95% floor-1
clear) and ASSUMPTION 22's CI floor (80%), for all three specs — 4.1-H has real work to do here,
not just a rounding pass.

One new decision surfaced in review (PR #67): Atlas pins could route `descend` into the
generator's throw, and a gap in authored biomes would have exposed crashing floors. Decided:
`pinBiome` refuses a biome with no content (`biome-has-no-content`), and the content frontier is
the unbroken run of authored biomes from biome 1. The review's doc-sync synced this into
`CONVENTIONS.md` (content frontier; State & persistence) and `GAME_DESIGN.md` (Biome Atlas), on
this branch. The brief's ASSUMPTION 9 lists only the two original `pinBiome` reasons;
CONVENTIONS is the spec. No other spec/doc conflicts surfaced.

### Verification

All four gates green:
- `npx tsc -b` — clean.
- `npx vitest run` — **107 files / 653 tests passed** (0 failed).
- `npm run lint` — clean.
- `npm run format:check` — clean (after `npm run format` passes; whitespace/wrapping only, no
  semantic changes).
- `npm run build` (`tsc -b && vite build`) — succeeds.

Engine golden suite: byte-identical (untouched — no file under `src/engine/__golden__` changed,
and no combat/resolution/interpreter/effects source file changed).

### Next

4.1-B — engine foundations (plain-data `CombatState`/RNG, unique effect instance ids, named
`createCombat` inputs + `baselineEffects`, `SelfCondition`, innate spells, the revive cap). Whole
golden suite must stay byte-identical.
