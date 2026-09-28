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

## 4.1-B — Engine foundations (byte-identical)

Items built: **B3, B4, S1, S2, A8, D3.** The whole golden suite stays byte-identical (verified:
every changed golden file's diff touches only `createCombat` call shape, plus the one deliberate
content change on `golden-sorcerer-starter.fixture.ts` the plan review called out in advance —
see "Review amendments" below). Plan reviewed and approved with amendments (B-1 through B-12)
before any code was written; this section records what was actually built against that plan.

### What was built

- **B3 — plain-data `CombatState` and RNG** (`engine/rng.ts`, `engine/types.ts`,
  `engine/combat.ts`). `RngState = { position: number }` replaces the closure-based `SeededRng`
  on `CombatState.rng`; `nextRandom(rng)` draws a value and advances `rng.position` **in place**
  (a deliberate, narrow mutability exception, precedented by `CascadeState`'s own call-stack-
  scoped mutability) using the exact same mulberry32 stepping math as before, now storing
  `position` as an unsigned 32-bit integer (`>>> 0` after every step, per review B-1) so a
  bookmark has exactly one representation. `resolveTurn` makes its "per-turn working copy" by
  cloning `rng` into a fresh object at entry (`{ ...state, rng: { position: state.rng.position } }`)
  — every downstream draw (target selectors, targeting, the interpreter, the resolver) mutates
  *that* clone, never the caller's own object, which is what actually fixes the B3 bug: the input
  snapshot passed to `resolveTurn` is never touched, so the same frozen snapshot resolved twice
  gives identical results. `generation.ts`'s own separate run-layer RNG stream is untouched
  (out of scope); per review B-2, `createSeededRng`/`SeededRng` stay exported from `rng.ts` but
  are now a closure implemented *on top of* `RngState`/`nextRandom`, so there is exactly one copy
  of the mulberry32 math (proven by a parity test asserting identical sequences from both APIs).
- **Draw-counting without `vi.spyOn`** (`engine/test-utils/rng-draw-count.ts`, NEW, per review):
  `countDraws(before, after)` steps a scratch bookmark forward from `before` until its position
  matches `after`, returning the exact draw count — replaces every `countingRng` closure-wrapper
  test helper (which can't wrap a method-less plain object).
- **B3 proof, beyond the one fixture** (`engine/combat.test.ts`, `engine/frozen-replay-sweep.test.ts`
  NEW): a dedicated frozen double-resolve test (`deepFreeze` one `CombatState`, call `resolveTurn`
  on it twice, assert identical `{state, events}`), plus a sweep across every golden fixture that
  exports the uniform `SEED`/`playerParty`/`enemyParty`/`expectedEvents` shape (44 of 72): each
  one's constructed state is deep-frozen (re-frozen before *every* turn for `TURN_STEPS`-shaped
  fixtures, not just the first) and replayed, asserting the committed event log exactly. The
  remaining 28 fixtures are explicitly listed and categorized (5 non-uniform export shape; 23
  whose own `.test.ts` drives them with bespoke logic — a single bare `resolveTurn` call, a
  hardcoded loop count, or a post-`createCombat` setup step like wounding a creature — that a
  generic driver can't safely reproduce without silently replaying the wrong scenario); a
  standing test asserts the sweep's coverage + exclusion lists together account for every fixture
  file on disk, so a new fixture can't silently fall through either category.
- **B4 — unique effect instance ids + the exact-instance rule** (`engine/effects.ts`,
  `engine/effect-types.ts`, `engine/resolution.ts`). `CombatState.effectInstanceCounter: number`
  is the **only** production issuer of effect instance ids (`eff-<n>`, opaque — never appears in
  events) — every prior `createEffectInstanceId` call site that minted a NEW instance (trait/perk
  instantiation, a fresh status application, `apply-stat-modifier`'s own id) now draws from it;
  the one exception, per design, is the per-trigger guard id derived from an *existing* instance's
  id (`${instanceId}#trigger#${index}`), which is a derived guard key, not a new instance.
  Refreshing a status still keeps its existing instance and id (no counter draw). `ResolvedHookEffect`
  gains `sourceInstanceId` — the effect's REAL owning instance id (distinct from the derived
  per-trigger guard `instanceId` for a status-sourced candidate) — and `fireHook` checks it
  against the creature's *live* `activeEffects` immediately before firing each candidate: an
  effect fires only if its exact owning instance still exists at that moment. Two new hand-derived
  tests in `resolution.test.ts` prove it: cleanse-then-tick (an earlier trait effect in the same
  `on-turn-end` pass removes a status whose own tick was captured, unfired, in the same pass — the
  tick never fires, not even `TriggerFired`) and remove-then-reapply (a status removed then
  reapplied within the same pass gets a genuinely new instance id; the old instance's pending
  tick candidate is skipped, the new instance follows normal rules from its next natural firing).
  Per the review's stop condition, the whole golden suite was re-verified byte-identical after
  this change landed — no existing golden relied on a removed-then-reapplied or revived instance
  firing under a reused id.
- **S1 — named `createCombat` inputs + `baselineEffects`** (`engine/combat.ts`, `engine/effects.ts`,
  `engine/effect-types.ts`). `createCombat({ seed, player: { party, effects? }, enemy: { party,
  effects? }, registries?: { scripts?, traits?, statuses? } })` — two same-typed positional lists
  (player/enemy effects) could be silently swapped; the named shape can't be. Per review B-5,
  `registries` and its three fields are all optional (each defaulting to an empty `Map`), matching
  the pre-S1 positional defaults exactly — CONVENTIONS' own signature (no `?`) describes the
  steady-state contract, not this slice's own backward-compatible defaulting. `createCombat`
  **always recomputes** `baselineEffects` from each input creature's own `innateTraitIds` (+ side
  effects) and **resets** `revivesUsed` to `0` — it never trusts those fields on an input
  `Creature`; `materializeCreature`/`makeCreature` both supply `[]`/`0` placeholders satisfying
  the type, since `createCombat` overwrites them unconditionally. `Creature.baselineEffects:
  readonly BaselineEffectEntry[]` (a new small `{ def, sourceTraitId }` pair type — a bare
  `EffectDef[]` would lose the label a trait-sourced vs. perk-sourced def needs at instantiation)
  is computed once at fight-setup (`resolveBaselineEffects`) and instantiated into `activeEffects`
  (`instantiateEffectDefs`, counter-based ids); `revive`'s death-reset re-instantiates the SAME
  stored `baselineEffects` directly, needing no registry lookup — which is what lets
  `CombatState.traits` and `CombatState.playerWideEffects` be deleted outright (grepped: `revive`
  was their only in-fight consumer). All ~81 `createCombat` call sites (store.ts, CombatDemo.tsx,
  every golden/unit test) were mechanically rewritten to the named shape; no expected event log
  changed anywhere except the one deliberate content fix below.
- **S2 — `SelfCondition` replaces the `predicate` function** (`engine/effect-types.ts`,
  `engine/effective-stats.ts`). `StatModifierDef.condition?: SelfCondition` (`{kind:'always'}` |
  `{kind:'hp-percent', comparator, thresholdPercent}` | `{kind:'has-status', statusId}`) — plain
  data, evaluated during `getEffectiveStat`'s own folding loop. Per review B-7, `hp-percent`
  shares ONE integer-cross-multiplication implementation (`hpPercentSatisfied`, moved down into
  `effective-stats.ts`) with `conditions.ts`'s own scripting `hp-percent` Condition, which now
  calls it too. `hasStatus`'s canonical implementation also moved to `effective-stats.ts` (with a
  re-export from `effects.ts` for every existing importer) so `SelfCondition`'s `has-status`
  branch can read it without `effects.ts -> effective-stats.ts` becoming a cycle. The **real
  predicate-bearer trait was `BLOODLUST`, not `BRUTISH`** (the brief/CONVENTIONS naming error the
  plan flagged; confirmed correct by the review and fixed in the same doc-sync as this slice) —
  re-authored as `condition: { kind: 'hp-percent', comparator: '>=', thresholdPercent: 100 }`,
  byte-identical to the old `(c) => c.currentHp >= effectiveMaxHp(c)` predicate. A new
  `validateStatModifierCondition`/`validateStatModifierConditions` pair (`effect-types.ts`) throws
  at **import time** (mirroring `validateSpecialization`'s own precedent, not a data test) if a
  `stat-modifier` carries an `hp-percent` condition gating the same stat it reads (the one
  read-cycle shape); per review B-9, it's run over both `data/traits/index.ts`'s `STOCK_TRAITS`
  AND `data/specializations.ts`'s perk effects (perks are stat-modifier carriers too — e.g.
  Arcane Might's "+1% Intelligence per level"), with three new unit tests (rejects Health +
  hp-percent; accepts Attack + hp-percent; accepts Health + has-status).
- **A8 — innate spells** (`engine/effect-types.ts`, `engine/effects.ts`, `engine/combat.ts`,
  `data/traits/starters.ts`, `data/species/starters.ts`, `engine/generation.ts`). New passive
  `{ category: 'innate-spell', spell: Spell }` — Arcane Surge (`SORCERER_STARTER_TRAIT`) gains one
  alongside its existing `bonus-cast` effect. `createCombat`'s fight-setup reads every
  `innate-spell` effect off a creature's just-instantiated `activeEffects`, in canonical order,
  and **prepends** their spells onto `equippedSpells` (innate slots first, then the regular gem
  slots) — no affinity/`canEquip` gate. `SpeciesCreature.equippedSpells` (the old fixed-starter-
  loadout field) and `materializeCreature`'s fallback to it are deleted; `SORCERER_STARTER`'s
  hardcoded `equippedSpells: [ARCANE_BOLT, null, null, null]` is gone too — the Seer's
  materialized array is now derived (`[Arcane Bolt, null, null, null]`, byte-identical) rather
  than authored twice. New tests: a fixture non-Wit "fused" creature carrying Arcane Surge still
  gets the innate Arcane Bolt AND can actually cast it (`decideAction` with `always-cast` resolves
  a real cast action, not a fallback) — proving no equip gate anywhere in the resolution path.
- **D3 — the revive cap** (`engine/config.ts`, `engine/types.ts`, `engine/creature-lookup.ts`,
  `engine/resolution.ts`). `MAX_REVIVES_PER_CREATURE = 10`; `Creature.revivesUsed: number` (never
  reset by death or by a successful revive itself — it's the thing being bounded).
  `resolveResponseTargets`'s `random-dead-ally` branch filters the pool to
  `!c.alive && c.revivesUsed < MAX_REVIVES_PER_CREATURE` **before** the empty-pool early-out, so
  an exhausted pool draws no RNG; the `'revive'` executeResponse case defensively re-checks the
  same condition per-target for robustness against any future non-`random-dead-ally` revive
  targeting. A new hand-derived test drives the SAME dead ally through exactly 10 successful
  revives (re-killing it after each) then asserts the 11th attempt fizzles (no `Revived` event,
  no RNG drawn, `revivesUsed` unchanged at 10).

### Review amendments (plan review, before code)

The plan was posted and reviewed in full before any implementation; the review approved it with
twelve amendments (B-1 through B-12), all folded in as described above and in "What was built."
The one item worth calling out here: **B-10's two pins**, both verified as real, not theoretical.
Pin 1 — `golden-sorcerer-starter.fixture.ts` hand-authored `equippedSpells: [ARCANE_BOLT]`
alongside `innateTraitIds: [SORCERER_STARTER_TRAIT.id]`; after A8, leaving that in place would
have silently doubled the loadout to `[Bolt, Bolt]` (pool size 2). Confirmed by hand (a throwaway
`node -e` mulberry32 calculation against the fixture's real seed, 7): the bonus-cast's own random
slot-pick roll at that exact seed happens to land on index 0 either way, so the test would have
kept passing with the bug latent — exactly the kind of coincidence the review flagged. Fixed by
dropping the explicit `equippedSpells` line (the one deliberate content change beyond the
`createCombat` rename, shown in the PR with its expected log unchanged); `effects.test.ts` and
every other `SORCERER_STARTER_TRAIT` consumer were checked and don't share the pattern. Pin 2 —
grepped for any `createCombat` call fed from a previous `CombatState`'s own creatures (which would
double-prepend innate spells); none exist — `store.ts`'s two call sites both materialize fresh
creatures per call (`resolvePlayerParty`/`generateFloor`, never reused post-fight-setup output),
and the new frozen-replay sweep reads fixtures' own raw `playerParty`/`enemyParty` exports, never
a prior `CombatState`'s.

### Verification

All four gates green:
- `npx tsc -b` — clean.
- `npx vitest run` — **108 files / 715 tests passed** (0 failed) — up from 107/653 on `main`, the
  delta being this slice's new tests (rng parity, the frozen double-resolve test, the 46-case
  frozen replay sweep, the two B4 mechanism tests, the D3 revive-cap test, the three S2 validator
  tests, the A8 off-affinity cast test) plus a handful of rewritten assertions in existing test
  files (listed below).
- `npm run lint` — clean.
- `npm run format:check` — clean (after `npm run format`; whitespace/wrapping only).
- `npm run build` — succeeds.

**Golden diff against `main`**: exactly two `*.fixture.ts` files changed
(`golden-sorcerer-starter.fixture.ts`, the one deliberate content fix above;
`golden-spore-spread-fizzle.fixture.ts`, a test-mechanism-only comment/export change — see
below), and every `*.test.ts` file under `__golden__/` changed **only** in its `createCombat` call
shape (mechanically rewritten to the named-input signature) plus that same one mechanism change.
No `expectedEvents`/`expectedResult` array changed anywhere.

**Test files with rewritten assertions (not golden content), each for a mechanical reason tied to
B3's rng type change:**
- `interpreter.test.ts`, `targeting.test.ts`, `target-selectors.test.ts`, `conditions.test.ts`,
  `combat.test.ts`, `resolution.test.ts`, `support-spells.test.ts`,
  `golden-spore-spread-fizzle.test.ts`: `expect(x.rng.next()).toBe(y.rng.next())`-style proofs (a
  method call the plain-data `RngState` no longer has) rewritten to direct `.position` equality,
  or (for "exactly one/N draws" proofs) to the new `countDraws` helper; `combat.test.ts`'s
  `stubRng`/`countingRng` closures and `resolution.test.ts`'s `countingRng` are deleted outright.
- `effects.test.ts`, `data/traits/core.test.ts`: `instantiateTraitEffects`/
  `instantiateCreatureEffects` calls rewritten against the new `resolveBaselineEffects` +
  `instantiateEffectDefs` two-step API (instance ids are now `eff-<n>`, not the old deterministic
  `creatureId#traitId#ordinal` strings).
- `effective-stats.test.ts`: the `predicate`-based conditional-modifier test rewritten to build a
  `SelfCondition` instead; one new test for the `has-status` branch.
- `data/species/starters.test.ts`: the "Sorcerer starter loadout" tests rewritten for A8 (no more
  `SpeciesCreature.equippedSpells` to assert on directly; the byte-identical `[Bolt, null, null,
  null]` claim is now proven by materializing + running through `createCombat`, not read off raw
  species data).
- `__fixtures__/creatures.ts`, `src/app/demoFight.ts`: `makeCreature`/hand-rolled `Creature`
  literals gained `baselineEffects: []` / `revivesUsed: 0` defaults (always overwritten by
  `createCombat`, but required by the type).

No spec/doc conflicts surfaced beyond the BRUTISH/BLOODLUST naming error already fixed in this
branch's doc-sync (CONVENTIONS.md's "Unified effect framework" section and the brief's S2 section).

### Next

4.1-C — one action pipeline + the turn skeleton. Deliberate golden changes, listed per the brief's
own acceptance criteria; everything else stays byte-identical.
