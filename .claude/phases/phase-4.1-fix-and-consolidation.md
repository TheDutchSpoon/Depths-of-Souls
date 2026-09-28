# Phase 4.1 — Fix & Consolidation Pass

Status: **in progress.** One section per landed slice (4.1-A here; 4.1-B–H append their own
sections as they land). Brief: `.claude/briefs/phase-4.1-implementation-plan.md` (its own
`Status:` line is untouched by this record).

## 4.1-A — Data, store & generation

Items built: **G3, G5 + S5, G6, A5, A6, A7 (with D1's defaults), S4.** No engine combat/
resolution/interpreter logic changed — every engine golden stays byte-identical (only
`generation.ts`/`curves.ts`/`leveling.ts`/`types.ts` changed, none of which the resolver's own
goldens exercise beyond `materializeCreature`'s pure output shape).

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
  fills `origin` from the template id / level / an optional opaque `ref` string. `makeCreature`
  (the shared engine test helper) defaults `origin` so the ~140 existing golden/fixture files
  didn't need touching; the one hand-rolled `Creature` literal outside that helper
  (`effective-stats.test.ts`) and the ten in `src/app/demoFight.ts` got `origin` added by hand.
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
  throws on `'fusion'`, ASSUMPTION 27). `id` is now opaque (`'inst-<ordinal>'`), never embedding
  the creature id (ASSUMPTION 25) — previously `${creatureId}#${ordinal}`.
  `GameState.collection` is now a flat `Map<InstanceId, Instance>` (was
  `Map<string, Instance[]>` bucketed by static creature id); every consumer
  (`resolvePlayerParty`, `applyXpToParty`, `grantCreatureIfUnowned`) rewritten around it.
- **Store action rule** (`state/store.ts`): `descend`/`pinBiome` return `{ ok: true, ... } |
  { ok: false, reason }` instead of throwing; each gets a pure `can…` query
  (`canDescend`/`canPinBiome`) sharing the same check function
  (`checkDescend`/`checkPinBiome`). `descend` reasons: `no-spec`, `empty-party`,
  `floor-out-of-reach`, `beyond-content-frontier` (frontier wins when both would apply,
  ASSUMPTION 23 — verified by a dedicated test). `setSpec`/`runScriptedIntro` still throw
  (ASSUMPTION 9/10 — impossible states, never player-reachable without a UI that already
  prevents them). A `{ ok: false }` result leaves state completely unchanged, including
  `lastFloor` (verified by a reference-equality test on `collection`).
- **`contentFrontier(biomes)`** (`engine/generation.ts`, NEW) — the last floor whose biome has a
  non-empty `speciesPool`, `× FLOORS_PER_BIOME`; `0` if none. Against the real `BIOMES` array
  (3 authored biomes) this is `30`.
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
  fixtures are exempt).
- **S4 — Vitest project split** (`vite.config.ts`): `test.projects`, one Node project
  (`src/engine`, `src/data`, `src/state`), one jsdom project (`src/ui`, `src/app`). Measured
  wall-time impact (same machine, same 637 tests, back-to-back runs): **12.94s → 3.39s** total
  (`environment` time specifically: **181.33s → 0.62s** aggregate across projects — jsdom setup
  was the dominant cost, matching CONVENTIONS' own note).

### Deviations from the reviewed plan

Per the review's explicit corrections (all applied as directed, not re-litigated):

1. **A-6 wired, not deferred** — see above.
2. **`enemyLevelRange`'s rounding tightened to a single `Math.round`** — the plan's own draft
   split the multiplier and the floor-multiply into two roundings; the shipped formula
   (`Math.round(floor * (99a + (b−a)(floor−1)) / 9900)` for floor ≤ 100,
   `Math.round(floor * (b + p(floor−100)) / 100)` after) rounds exactly once, at the end.
3. **`integration.test.ts` not loosened** — both original scenarios (floor 1, floor 10 boss) now
   inject `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` so every assertion survives unchanged except the
   two `xpBanked` numbers (generated-then-checkpoint-verified against the new
   victim-level-based formula: `8` and `38` respectively, replacing the old `30`/`300`). A
   separate new describe block (`Phase 4.1-A defaults`) exercises the real, zero-override store
   against the real `DEFAULT_BALANCE_CONFIG` instead — see "Surfaced during build" below.
4. **`bricksPerFloor` → `bricksPerTenFloors`** (the review's nit).
5. Acceptance tests from the brief's own list added explicitly (not left implicit): each
   `descend` reason, `canDescend` agreeing with `descend`, the content frontier from a
   2-authored-biome fixture (`= 20`, in `generation.test.ts`), `lastFloor` set on both a won and
   a lost run, fight count at floors 1/10/30, the level multiplier at floors 1/100/101, and a
   rewards test using a static creature id that contains its own side/slot-shaped substring
   (proving `origin.templateId` resolution needs no string surgery, unlike the deleted
   suffix-parsing it replaced).

### Surfaced during build (not a doc conflict — a data point for 4.1-H)

The new "real store, real defaults" integration test (floor 1, level-1 Brute+Unicorn party)
wins 9 of the new default's 10 fights and loses the 10th. This is CONVENTIONS' own accepted risk
("floor success ≈ (per-fight win chance)^(fights), so a small per-fight loss rate compounds")
made concrete at floor 1 the moment `fightCount` rose from Phase 4's flat 3 to the new
`10 + (floor−1)` — not something the plan needed to fix (4.1-A ships no balance pass; 4.1-H
owns the first tuning), but worth recording now as an early empirical number for the simulator's
T1 band (≥95% floor-1 clear) rather than rediscovering it cold in 4.1-H.

No other spec/doc conflicts surfaced; CONVENTIONS.md's Phase 4.1-A text matched the brief
throughout and needed no correction.

### Verification

All four gates green:
- `npx tsc -b` — clean.
- `npx vitest run` — **106 files / 637 tests passed** (0 failed).
- `npm run lint` — clean.
- `npm run format:check` — clean (after one `npm run format` pass; whitespace/wrapping only, no
  semantic changes).
- `npm run build` (`tsc -b && vite build`) — succeeds.

Engine golden suite: byte-identical (untouched — no file under `src/engine/__golden__` changed,
and no combat/resolution/interpreter/effects source file changed).

### Next

4.1-B — engine foundations (plain-data `CombatState`/RNG, unique effect instance ids, named
`createCombat` inputs + `baselineEffects`, `SelfCondition`, innate spells, the revive cap). Whole
golden suite must stay byte-identical.
