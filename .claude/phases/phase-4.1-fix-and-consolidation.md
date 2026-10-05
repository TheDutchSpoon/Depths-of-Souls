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
  re-authored as `condition: { kind: 'hp-percent', comparator: '>=', thresholdPercent: 100 }`.
  **Correction (PR #69 review, D1):** as first landed, this was NOT byte-identical to the old
  `(c) => c.currentHp >= effectiveMaxHp(c)` predicate — `hpPercentSatisfied` divided by the raw
  (unfloored) `getEffectiveStat(_, 'health')` reading, so a creature at its own floored max HP
  read as fractionally below 100% whenever a Health modifier left effective Health non-integer
  (real content has five: ×1.1/×1.15/×1.05/×0.9/etc.) — "at full HP" could go permanently
  unsatisfiable. Fixed: `hpPercentSatisfied` now takes the `Creature` directly and computes
  `floor(getEffectiveStat(creature, 'health'))` itself — the SAME integer `currentHp` is clamped
  to (`effectiveMaxHp`) — so it genuinely is byte-identical to the old predicate now. One shared
  helper, used by both `SelfCondition` and conditions.ts's scripting `hp-percent` Condition (see
  "Review fixes (PR #69)" below). A new
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
  hardcoded `equippedSpells: [ARCANE_BOLT, null, null, null]` is gone too. **Correction (PR #69
  review, D2; typo fixed at the PR #69 review's follow-up pass):** the byte-identical `[Arcane
  Bolt, null, null, null]` array is the Seer's **fight-setup** spell array (what `createCombat`
  produces), not its **materialized** one — `materializeCreature` output for the Seer carries
  regular gem slots only (`[null, null, null]`, `DEFAULT_GEM_SLOT_COUNT`'s 3 slots — matching what
  `data/species/starters.test.ts` itself asserts); innate spells are prepended at fight setup,
  never at materialization. New tests: a
  fixture non-Wit "fused" creature carrying Arcane Surge still
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

All four gates green (as first submitted, before the PR #69 review round below):
- `npx tsc -b` — clean.
- `npx vitest run` — **108 files / 715 tests passed** (0 failed) — up from 107/653 on `main`, the
  delta being this slice's new tests (rng parity, the frozen double-resolve test, the frozen
  replay sweep — **44 fixtures actually replayed, plus 2 accounting tests proving the sweep's own
  coverage + exclusion lists account for every fixture on disk; "46-case" undercounts what's being
  claimed** — correction, PR #69 review), the two B4 mechanism tests, the D3 revive-cap test, the
  three S2 validator tests, the A8 off-affinity cast test) plus a handful of rewritten assertions
  in existing test
  files (listed below).
- `npm run lint` — clean.
- `npm run format:check` — clean (after `npm run format`; whitespace/wrapping only).
- `npm run build` — succeeds.

Still green after the PR #69 review round: **112 files / 724 tests passed** (0 failed) — the
9-test delta covering R1/R3's new `createCombat` tests, the D1 focused float-denominator test, the
structuredClone purity test, and 4 new golden fixture pairs (8 files) for B4/D3 (see "Review fixes
(PR #69)" below).

**Golden diff against `main`**: exactly two `*.fixture.ts` files changed
(`golden-sorcerer-starter.fixture.ts`, the one deliberate content fix above;
`golden-spore-spread-fizzle.fixture.ts`, a test-mechanism-only comment/export change — see
below), and every `*.test.ts` file under `__golden__/` changed **only** in its `createCombat` call
shape (mechanically rewritten to the named-input signature) plus that same one mechanism change.
No `expectedEvents`/`expectedResult` array changed anywhere. (The PR #69 review round below adds 4
new fixture/test pairs — B4 and D3 goldens that didn't exist before — which is an addition, not a
change to any existing golden's content.)

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

### Review fixes (PR #69)

A review pass against the `.claude/` docs on `main` (not against the PR's own description) found
three real bugs (R1–R3), two acceptance gaps (R4–R5), and three decisions (D1–D3) it recommended
resolving in this same PR. All fixed on this branch; the doc-sync (CONVENTIONS.md, GAME_DESIGN.md,
ROADMAP.md, the brief) landed as a separate commit ahead of the code fixes below.

- **D1/R2 — HP% divided by the wrong denominator.** `hpPercentSatisfied` used to take a raw
  `getEffectiveStat(creature, 'health')` reading as its `effMaxHp` argument — unfloored, so a
  creature with a fractional effective Health (real content has five such modifiers) could never
  read as "at full HP," making the re-authored `BLOODLUST`'s S2 condition NOT actually
  byte-identical to the predicate it replaced. Fixed: `hpPercentSatisfied` (`effective-stats.ts`)
  now takes the `Creature` directly and computes `floor(getEffectiveStat(creature, 'health'))`
  itself — the same integer `currentHp` is clamped to (`effectiveMaxHp`) — so both `SelfCondition`
  and conditions.ts's scripting `hp-percent` Condition read the SAME basis from ONE helper (the
  `creatureHpPercentSatisfied` wrapper in `conditions.ts` is gone; both callers now call
  `hpPercentSatisfied` directly). New focused test (`effective-stats.test.ts`): effective Health
  34.5 (base 30 × 1.15), `currentHp: 34` (the floored max) — reads as exactly 100%.
- **D3 — an unknown trait id was silently skipped.** `resolveBaselineEffects` now throws
  (`effects.ts`) instead of `continue`-ing past a trait id missing from the registry — a caller
  that forgot to pass `registries.traits` used to silently strip every innate trait with no
  signal. The test that pinned the skip now asserts the throw instead.
  `resolveBaselineEffects`'s `creature` parameter also dropped `side` from its `Pick<>` — it no
  longer reads `side` at all (see R1).
- **R1 — `enemy.effects` was silently dropped.** `createCombat` called `instantiate(c, [])` for
  the whole enemy party regardless of what `enemy.effects` held, and `resolveBaselineEffects` only
  applied its `sideEffects` argument when `creature.side === 'player'` — so an enemy-side effect
  passed to `createCombat` was discarded twice over. Fixed: `resolveBaselineEffects` no longer
  reads `side` at all — it applies whatever `sideEffects` list it's given unconditionally, since
  the CALLER now owns that decision. `createCombat`'s `instantiate` threads each side's own
  `party`/`effects` pair through with its own `sideLabel` (`'perk'` for the player side,
  `'enemy-effect'` for the enemy side — distinct labels so a `TriggerFired.effectId` can't collide
  across sides), and throws if a creature's own `side` doesn't match the list it was passed in
  (`player.party` vs `enemy.party`). `BaselineEffectEntry.sourceTraitId`'s side-effect label
  changed from always `perk-<n>` to `<sideLabel>-<n>`. New tests in `combat.test.ts`: an
  enemy-side ×2 Attack effect actually applies to the enemy and never the player; a
  side-mismatched creature throws.
- **R3 — double-prepending innate spells was guarded only by a one-time grep.** `createCombat`'s
  own doc comment called re-feeding a post-setup creature "safe but pointless," but for a creature
  carrying an `innate-spell` effect (A8) it would silently DOUBLE the innate slots — and the
  `golden-sorcerer-starter` fixture (the one place this could have been caught) can't detect it
  (confirmed: manually restoring the old `equippedSpells: [ARCANE_BOLT]` line still passes the
  golden). Fixed: `instantiate` now throws when an input creature already carries fight-setup
  output (non-empty `baselineEffects` or `activeEffects`). New test: re-feeding a post-setup Seer
  (`SORCERER_STARTER_TRAIT`, real content) throws.
- **R4 — the named B3 double-resolve test was vacuous, and the sweep's full-fight path only froze
  turn 1.** `combat.test.ts`'s "resolving the SAME frozen snapshot twice" test used a 1v1
  always-attack turn that draws zero RNG — it would still pass with `resolveTurn`'s per-turn
  `rng` clone removed, since nothing ever touches `state.rng` to diverge. Fixed: the fixture now
  uses `random-enemy` targeting against two living enemies, and the test asserts
  `countDraws(frozen.rng, first.state.rng) > 0` so it can't go vacuous again. Separately,
  `frozen-replay-sweep.test.ts`'s non-`TURN_STEPS` branch called
  `resolveFight(deepFreeze(created))`, which only freezes the FIGHT's original starting snapshot —
  `resolveFight`'s own internal loop reassigns its working state to each `resolveTurn`'s plain
  (unfrozen) return, so a hypothetical turn-2+-only mutation bug would go undetected. Fixed: both
  the `TURN_STEPS` and full-fight branches now share one loop that re-freezes before EVERY turn.
  All 46 sweep tests still pass unchanged.
- **R5 — B4/D3 had unit-test coverage but no goldens.** The original acceptance line asked for "the
  B4 and D3 goldens," but the PR shipped count-of-events unit tests instead of full hand-derived
  event logs; the D3 unit test also called `executeResponse` directly, never exercising the
  "TriggerFired only" fizzle shape through the real hook pipeline. Fixed: 4 new golden fixture/test
  pairs under `__golden__/` (hand-derived arithmetic in each fixture's own header comment; added to
  `frozen-replay-sweep.test.ts`'s `KNOWN_BESPOKE_DRIVER` list, since none of them drive via the
  generic full-fight/`TURN_STEPS` shape):
  - `golden-b4-cleanse-then-tick` — an on-fight-start-applied status removed by an on-turn-end
    trigger earlier in the same hook pass; the status's own tick candidate (captured before the
    removal) never fires.
  - `golden-b4-remove-then-reapply` — same status removed AND reapplied within one hook pass; the
    OLD instance's pending tick candidate is skipped, the fresh instance is unaffected.
  - `golden-d3-revive-cap-exclusion` — a mixed dead-ally pool (one at the cap, one eligible): the
    capped ally is excluded before the draw, so the eligible one is revived unconditionally.
  - `golden-d3-revive-cap-fizzle` — the sole dead ally already at the cap: the pool is empty
    before any draw, so the trigger still fires (`TriggerFired`) but nothing else does — zero RNG
    consumed.
  All four start from a state the golden itself can't naturally reach through a handful of turns
  (an existing status, or a creature already at the revive cap) via a post-`createCombat`
  `updateCreature` setup step in the `.test.ts` driver — the SAME precedented pattern
  `golden-dot.fixture.ts` already uses for a pre-wounded creature (`createCombat` always resets
  `currentHp`/`revivesUsed` at fight-setup, so that starting state has to be applied AFTER
  creation). The 10-revive climb to the cap itself stays covered by the existing
  `resolution.test.ts` unit test, which can assert on `revivesUsed` directly; hand-deriving 10
  real revive-and-rekill combat rounds as a golden's own event log was judged not worth the
  fixture's weight for what it would additionally prove.
- **Scope/labeling** (no behavior change): three false claims in this record's own text above are
  now corrected inline (BLOODLUST's byte-identical claim, the materialized-vs-fight-setup spell
  array, the "46-case sweep" undercount). A stale comment in `resolution.ts`'s `fireHook` (claiming
  the active-effects candidate list "doesn't change mid-pass in v1 content") is rewritten — B4
  exists specifically because it does. A new `combat.test.ts` test (`structuredClone` on a real
  mid-fight state, built from real trait content, several turns in) proves the brief's own
  structural B3 acceptance criterion directly — deep-freezing (the existing proof) shows nothing
  *mutated*, but doesn't show `CombatState` is actually plain data; `structuredClone` throws on any
  function/closure/class instance, so surviving it is a direct proof.

### Verification (after the PR #69 review round)

All four gates still green: `npx tsc -b` clean; `npx vitest run` — 112 files / 724 tests passed;
`npm run lint` clean; `npm run format:check` clean (after `npm run format`; whitespace/wrapping
only); `npm run build` succeeds. No existing `__golden__` file's content changed — `git status`
against the pre-review commit shows only the 8 new golden files (4 fixture/test pairs) as
additions, confirmed via direct diff.

### Next

4.1-C, split at the plan review into **C1** (the turn skeleton, below) and **C2** (the action
pipeline) once applying each change to `main` in isolation showed every existing-golden change
traces to the skeleton alone.

## 4.1-C1 — Turn skeleton

Items built: **D6 skeleton** (turn-start cleanup made unconditional + `ActionStateEnded`,
`TurnEnded` moved to after turn-end hooks and the granted-actions step) + **deleting
`is-provoking`**. Split from the brief's single "4.1-C" slice at the plan review: applying each C
change alone to `main` @ `c9ba34b` showed every existing-golden change traces to D6 alone -- B1,
B2 (incl. rule 4) and B5 change no existing golden and land in **C2**, which the brief's own
doc-sync (landed ahead of this section) now records. Golden policy: deliberate; exactly 11
existing fixtures change + 1 new.

### What was built

- **D6 turn skeleton** (`combat.ts`'s `resolveTurn`). The sequence, as implemented:
  ```
  TurnStarted
  → (if actor entered alive) turn-start hooks
    → (if actor is STILL alive after those hooks) turn-start cleanup
  → (if actor is still alive AND the turn isn't suppressed) decide + action
  → (if actor is still alive) turn-end hooks
    → (same alive gate) granted-actions step (bonus-cast -- today's implementation, unmoved)
  → [turn-end cleanup: a no-op seam here, ASSUMPTION 15/16 -- statuses still count down at
     round-end, the Web roll stays at turn-start, until Phase 4.1-F]
  → TurnEnded
  ```
  `TurnEnded` is now always the turn's last event -- Phase 4 fired turn-end hooks and the bonus
  cast after it; fixed here.
- **The cleanup gate, precisely** (4.1-C plan review, fix 8): turn-start cleanup runs **whether or
  not the turn is suppressed** (Stun) -- this is B6's fix. Previously cleanup lived inside the same
  `!suppressed` gate as decide+action, so a Stunned or Sleeping creature kept Defend/Provoke
  through its own skipped turn. The one gate left is that the actor must still be **alive**,
  re-checked fresh AFTER turn-start hooks fire (never the pre-hook snapshot) -- a creature that
  dies to its own on-turn-start hook gets no cleanup at all that turn, its flags left exactly as
  they stood (a later revive's death-reset clears them unconditionally regardless, so leaving them
  set on a corpse has no downstream effect). `ActionStateEnded { creatureId, defending, provoking }`
  is emitted only when at least one flag was actually set -- both flags ending together (e.g.
  Snapjaw's Lure's on-provoke-grants-Defending) emit exactly **one** event, never two.
- Moving cleanup earlier (before decide+action, not after, as it ran pre-4.1-C) is safe only
  because `is-provoking` is deleted in this same PR: it was the only thing reading the acting
  creature's own `defending`/`provoking` during script lookahead (Defend's math reads the
  **target's** flag; Provoke's redirect reads the **opposing side's** provoking members -- neither
  is the actor's own).
- **`is-provoking` deleted**: removed from the `Condition` union (`scripting-types.ts`), its
  `evaluateCondition` case (`conditions.ts`), and its dedicated test (`conditions.test.ts`). One
  incidental use as a throwaway "always false" `TriggeredDef.condition` in `resolution.test.ts` was
  swapped for `{ kind: 'enemy-count', comparator: '<', count: 0 }` (an unrelated, robustly-false
  condition -- the test only needed *some* false condition, not this specific one).
- Bonus-cast's own suppression semantics are **untouched** here -- still no Silenced/Stunned gate.
  C1 only moved *when* it runs relative to `TurnEnded`, never *whether* it runs; that fix is B2,
  landing in C2.

### Golden impact -- exactly 11 existing fixtures + 1 new

- **`TurnEnded` reorder** (5): `golden-b4-cleanse-then-tick`, `golden-b4-remove-then-reapply`,
  `golden-heal-scaling-count`, `golden-heal-scaling-stat`, `golden-sorcerer-starter` -- each has
  real on-turn-end content (a status tick/cleanse, a heal, a bonus cast) whose events used to land
  after `TurnEnded`; now before it, matching the fixed ordering.
- **`ActionStateEnded` insertion** (5): `golden-defend-count-additive-cap`, `golden-defend-count`,
  `golden-on-action-hooks`, `golden-provoke-redirect`, `golden-scripted-1v1` -- each hand-derived,
  one `ActionStateEnded` inserted at the exact turn-start where a prior Defend/Provoke expires.
- **Integration, regenerated + checkpoint-verified** (1): `golden-6v6-scripted` -- gained
  `ActionStateEnded: 41` in its per-event-type-count checkpoint (result `loss`, round `28`
  unchanged). Every other checkpoint -- round-1 turn order, the other event-type counts,
  spot-check damage, provoke redirects -- reconfirmed unchanged by re-running the fixture.
- **Confirmed unchanged**: `golden-shieldbarer-starter` (asserts first-turn events only, so it
  never reaches a second turn-start where a flag could expire).
- **New**: `golden-b6-provoke-stun-cleanup` -- PROVOKER provokes, HERO's attack (redirected to it
  by Provoke, since WEAKLING is the actual lowest-HP enemy) triggers a fixture
  on-damage-taken → self-apply-status(stun) trait; at PROVOKER's own next turn-start the stun
  suppresses it, but cleanup still clears `provoking` and emits `ActionStateEnded`, so HERO's
  following attack resolves to the real lowest-HP enemy (WEAKLING) instead of redirecting again.
  Verified to fail when the B6 fix is reverted (checked directly: the redirect and the stun both
  re-fire a second time in round 2; reverted after confirming).

### Verification

All four gates green: `npx tsc -b` clean; `npx vitest run` -- 113 files / 727 tests passed (up
from 112 / 724 on `main`: −1 for the deleted `is-provoking` test, +2 for the B6 golden and its
frozen-sweep replay, +2 for the two F2 unit tests below); `npm run lint`
clean; `npm run format:check` clean (after `npm run format`, whitespace only); `npm run build`
succeeds. Golden diff against `main`: exactly the 11 + 1 above, confirmed via `git status` both
after the initial C1 submission and again after this round's review fixes (none of which touch a
golden fixture). Design review (PR #70) additionally compared the full `golden-6v6-scripted`
event log against `main`: with the 41 `ActionStateEnded` events stripped it is identical
(668 events), and the 41 were predicted independently from `main`'s log, event for event.

### Review fixes (PR #70)

- **F2 -- the two untested branches of turn-start cleanup.** Two unit tests added to
  `combat.test.ts` (`describe('turn-start cleanup (Phase 4.1-C, D6)')`), neither exercised end-to-
  end by a golden: (1) **both flags ending together as one event** -- built from real content
  (`SNAPJAW_LURE_TRAIT`, Snapjaws' Lure: on-provoke grants self Defending), asserting the single
  `ActionStateEnded { defending: true, provoking: true }` lands directly after `TurnStarted`; (2)
  **the actor dies to its own turn-start hook** -- a fixture lethal self-`deal-damage` trait on
  `on-turn-start`, the creature `provoking: true` at fight-start (not `defending`, so Defend's own
  damage reduction can't interfere with the lethality), asserting no `ActionStateEnded` fires and
  `provoking` is left `true` on the corpse afterward. Both verified to fail under their named
  mutation (test 1: emitting one event per flag instead of one combined; test 2: dropping the
  post-hook `.alive` gate) -- checked directly against the code, then reverted; neither mutation
  changed any golden.
- **L1 -- `ActionStateEnded` moved to the consequence family.** It reports a state ending (like
  `StatusExpired`), not an action taken -- moved from `IntentEvent` to `ConsequenceEvent` in
  `types.ts`, its interface relocated beside the other consequence events. Type-level only; no
  event object or golden changed.
- **L2 -- the turn-end cleanup seam marked explicitly.** A comment in `resolveTurn`, between the
  granted-actions step and `TurnEnded`, states plainly that C1's turn-end cleanup is a no-op seam
  (ASSUMPTION 15/16) and names what 4.1-F puts there (the bearer's own status-timer countdown, the
  Web roll). No code change.
- **Design-owner doc-syncs** (committed on the branch; L1 above implements what the second one
  pins). The 4.1-C plan-review doc-sync: `gem` → `gemSlot`, `decideAction -> Intent`, the
  `acted-before-target` default-target peek, and the C1/C2 split with its golden-impact data. The
  PR #70 doc-sync: the last `gem: { random, side }` example → `gemSlot`, the event families
  pinned (`ActionStateEnded` consequence; `TurnSkipped` and `ActionGranted` intents), and a data
  point on ASSUMPTION 19 (end-of-turn-only win check turns a win into a draw once DoTs tick on
  `on-turn-end`; F's win-check golden covers it).

### Next

C2 -- the A1 action pipeline + `ResolutionContext` (fully threaded through the resolver) + B1
(side-aware default targeting) + B2 (reroute bonus-cast/echo-cast through the pipeline) + B5
(pre-hit fizzle). Every existing golden stays byte-identical; new goldens prove each behavior
change.

## 4.1-C2a -- Action pipeline plumbing (byte-identical in behaviour, not only on goldens)

Split from the brief's single "C2" slice at kickoff, mirroring the C1/C2 split's own precedent:
C2a is pure plumbing (every existing test and golden passes unchanged), C2b (not yet built --
this PR stops here for review) is the behaviour changes (B1, B2, B5), each landing with its own
new, discriminating golden.

**PR #71 design review, two changes before merge (ASSUMPTIONS 31-32):**
1. Byte-identical goldens were not enough -- C2a must be byte-identical in **behaviour**, checked
   by a differential run against `main`. Wherever today's behaviour genuinely differs from the
   final pipeline, C2a keeps today's behaviour behind a **named, C2a-only switch**, and C2b
   deletes each one. Landed as `legacyGrantedTargeting` (below).
2. The 200-case seed sweep (which only checked "same seed -> identical log," proving nothing
   against `main`) is replaced by the **corpus digest**, a behaviour tripwire over a fixed
   real-content corpus, hashed and compared against a generated, committed fixture.

### What was built

- **`actions.ts`** -- the one action pipeline the brief's A1 item describes, holding
  `checkLegality`, `resolveIntent`, `executeAction` + the five executors (moved verbatim from
  `combat.ts`: `executeAttack`/`executeCastSingle`/`executeCastAoe`/`executeDefend`/
  `executeProvoke`/`executeWait`, plus their own helpers `buildInstanceList`,
  `resolveInstanceTarget`, `splashTargetIds`, `adjacentLivingTargets`, `resolveSpellOffStat`,
  `applyCastPayload`, `applyStatusIfAlive`), `castableGemSlots`, `defaultTargetingFor`, and
  `createResolutionContext` (the `ResolutionContext` factory).
  - **`Intent = { action: RuleAction, targeting?: TargetSelector }`** (`scripting-types.ts`),
    `CastRuleAction.gemSlot: number | 'random'`, and `TargetSelector` gains **`'random'`**.
    Every exhaustive consumer handles it: `targetSelectorHasCandidate` and `resolveTargetSelector`
    both **throw** on it (same message style) -- it needs the action's INTENDED side, which
    neither function has; `peekTargetSelector` returns `null` for it, same as
    `random-enemy`/`random-ally`. `actions.ts`'s `hasValidTarget` intercepts `'random'` before
    ever calling `targetSelectorHasCandidate`, checking the intended side's own living pool
    directly; the actual draw (`resolveIntent`'s own `resolveRandomTarget`) resolves it over
    `livingEnemiesOf`/`livingAlliesOf`, same pool/order as `random-enemy`/`random-ally`.
  - **`'random'` is intent-only, rejected at load time in any response target** (PR #71 review):
    a new `validateNoRandomSelectorInResponseTargets`/`validateStatusNoRandomSelectorInResponseTargets`
    pair (`effect-types.ts`, beside `validateStatModifierCondition(s)`) throws if any trait/perk
    trigger's response, or any condition-status's trigger response (including `consume-stacks`'s
    own wrapped `effect`, recursed into), targets `{ kind: 'selector', selector: { kind: 'random'
    } }`. Run at import time over every registry: `data/traits/index.ts` (`STOCK_TRAITS`),
    `data/specializations.ts` (every perk's level-1 effects, alongside the existing
    stat-modifier-condition check), `data/statuses.ts` (`STOCK_STATUSES`). All pass -- no shipped
    content used it.
  - **`checkLegality(actor, intent, state)`** -- pure, draws nothing. Locks (`isActionSuppressed`,
    moved in from `interpreter.ts` unchanged), an empty gem slot, `castableGemSlots(actor,
    state).length > 0` for `gemSlot: 'random'`, and `hasValidTarget` (existence over the intent's
    explicit selector, or -- since `checkLegality` is the FINAL, general "can this actor act at
    all" answer, not the interpreter's own C2a-interim rule-validity gate below -- over the
    intended side's living pool when targeting is absent).
  - **`resolveIntent(actor, intent, state, options?)`** -- the only place action-level draws
    happen. Gem resolution (uniform over non-null equipped slots, innate included) draws BEFORE
    target resolution, matching today's bonus-cast/echo order exactly (pinned by a new test, see
    below). Target resolution: explicit selector (`'random'` included) -> **today's Phase-1
    first-living-by-slot default** (`legacyDefaultTarget`, NOT the side-aware one -- see "The
    three C2a-only switches" below) -> for an enemy-side single target, Confusion -> Tunnel Vision
    -> Provoke (`resolveOffensiveTarget`, `targeting.ts`, untouched) -- **unless
    `options.legacyGrantedTargeting` is set**, in which case that override pipeline is skipped
    entirely and the target resolves via the explicit-selector-or-default path directly. An
    ally-side single target skips the override pipeline regardless (as today).
  - **`defaultTargetingFor(actor, action)`** -- the shared helper for the FINAL (C2b, B1)
    side-aware default target selector (`lowest-hp-enemy`/`lowest-hp-ally`), `undefined` for an
    AOE cast, a `gemSlot: 'random'` cast, or a self-only action. Built and unit-tested now; not
    yet wired into `resolveIntent`'s own default resolution or the interpreter's lookahead.
  - **`createResolutionContext(events, cascade)`** builds a `ResolutionContext` whose `runAction`
    closure does exactly what the brief's `RunActionOptions.announce` seam describes: resolve the
    intent (forwarding `options.legacyGrantedTargeting` into `resolveIntent`), push `announce` (if
    given) once it resolves, then execute -- a no-op (no announce, no event) if the actor is
    dead/unknown or the intent doesn't resolve to an action.
- **`ResolutionContext { events, cascade, runAction }`** (`resolution-types.ts` -- a leaf types
  module importing only `types.ts`/`ids.ts`/`effect-types.ts`/`scripting-types.ts`). Threaded
  through the whole resolver: every `resolution.ts` function that used to take separate
  `events`/`cascade` arguments now takes one `ctx: ResolutionContext` (`dealDamage`,
  `dealDamageWithScalingStat`, `dealDamageWithOffStat`, `applyDamageAndEmit`, `fireHook`,
  `executeResponse`, `applyFlatDamage`, `applyHeal`, `applyStatus`, `applyStatModifier`).
  `resolution.ts` imports nothing from `actions.ts`/`combat.ts`, not even a type -- confirmed by
  grep, and structurally guaranteed by `resolution-types.ts` sitting below both. `fireHook`'s old
  `observed`/`onEchoCast`/`statusTriggerGate` positional parameters become one options object,
  `{ observed?, statusTriggerGate? }` -- `onEchoCast` is gone outright: `fireHook`'s `echoCast`
  branch now calls `ctx.runAction(source, ECHO_CAST_INTENT, working, { announce:
  EchoCastGrantedEvent, legacyGrantedTargeting: true })` directly, where `ECHO_CAST_INTENT = {
  action: { kind: 'cast', gemSlot: 'random' }, targeting: { kind: 'random' } }`. The depth
  increment/decrement around the call, and the self-re-entry-guard exemption, are unchanged
  (moved, not rewritten). `newCascade` stays in `resolution.ts` (a factory, not a type);
  `CascadeState`/`ResolutionContext` are re-exported from there too, so no import site needed to
  change which module it names.
- **`combat.ts`** slimmed to the turn skeleton + fight setup: the five executors and their
  helpers moved out to `actions.ts`; every `fireHook` call site (fight-start, turn-start,
  turn-end, the round-end sweep) now builds a `ResolutionContext` via `createResolutionContext`
  (fresh per call, matching today's fresh-`newCascade()`-per-call-site discipline exactly).
  `resolveTurn`'s action step is now `ctx.runAction(actorAfterStart.id, decideAction(...),
  working)` -- `decideAction` always returns a non-null `Intent` now (see below), so the old `if
  (action) executeAction(...)` gate disappears; `runAction`'s own internal `resolveIntent`-returns-
  `null` case reproduces the old "defensive/unreachable no-op" path exactly.
  `maybeFireBonusCast` still lives here (it's the turn skeleton's own granted-actions step) but
  now builds an intent (`{ action: { kind: 'cast', gemSlot: 'random' } }`) and calls
  `ctx.runAction(..., { legacyGrantedTargeting: true })` instead of calling
  `executeCastSingle`/`executeCastAoe` directly -- same chancePercent gate, same "equipped.length
  === 0 -> silent no-op" fizzle (now `resolveIntent` returning `null`), no legality/lock check
  (B2's own gating is a C2b item). `runEchoCast` is **deleted outright** -- its logic now lives in
  `fireHook`'s `echoCast` branch (resolution.ts), reached via `ctx.runAction`, per the point above.
- **`interpreter.ts`** -- `decideAction(creature, script, state)` now returns the winning rule's
  **unresolved `Intent`**, or the fallback intent, never a resolved `Action`. The script-rule loop
  keeps a C2a-**interim** gate, `ruleNeedsExplicitTargeting` (renamed from `actionNeedsTargeting`,
  logic unchanged) -- a rule still needs an explicit `targeting` field to be valid for Attack/
  single-Cast, exactly as today; `checkLegality` alone (the general, "missing targeting is fine"
  answer) would already accept a targeting-less rule, which is precisely the B1 behaviour change
  C2b lands deliberately, with its own discriminating golden -- landing it silently here would
  pre-empt that. `isRuleValid` is `ruleNeedsExplicitTargeting(...) && !rule.targeting -> invalid`,
  else `checkLegality(...)`. The implicit fallback (`decideImplicitFallback`) mirrors today's
  `isActionSuppressed('attack')` + "does the enemy side have a target" check exactly, via
  `checkLegality(creature, { action: { kind: 'attack' } }, state)` -- legal -> the bare Attack
  intent (resolved later, at execution, through `legacyDefaultTarget`); illegal -> the Wait
  intent. `isActionSuppressed` itself moved into `actions.ts` (used by `checkLegality`).

### The three C2a-only switches (deleted in C2b -- this is what "byte-identical in behaviour" cost)

Each keeps today's exact behaviour where it genuinely diverges from the final pipeline's shape.
None is a golden risk on its own (no existing golden's own scenario reaches the divergence), but
unlike a goldens-only byte-identity claim, each is now backed by the corpus digest's own
mechanism proof (below) -- forcing it off measurably changes real-content fights, so the switch is
doing real work, not standing in for a distinction nothing exercises.

1. **`legacyGrantedTargeting`** (`RunActionOptions`, `resolution-types.ts`; doc comment: "C2a-only.
   Deleted in C2b (B2.3), whose goldens prove the flip.") -- passed only by `maybeFireBonusCast`
   and `fireHook`'s `echoCast` branch. Skips Confusion -> Tunnel Vision -> Provoke for a granted
   cast's target, matching `main`'s bonus-cast/echo exactly (neither goes through that pipeline
   today; an enemy Provoker costs bonus-cast/echo zero extra RNG on `main`, and would cost one
   extra draw per grant without the switch). C2b (B2.3) deletes it: goldens are "a confused
   creature's bonus cast can redirect" and "a Provoke redirects an echo."
2. **The interpreter's "a rule needs explicit targeting" gate** (`ruleNeedsExplicitTargeting`) plus
   **the first-by-slot default** (`legacyDefaultTarget`, used wherever `resolveIntent` sees no
   explicit `targeting`). C2b (B1) replaces both with the side-aware default
   (`defaultTargetingFor`, already built) and makes rule targeting genuinely optional. Golden: a
   script-less attacker against two enemies where slot 0 has more HP than slot 1 must hit slot 1.
3. **The unfiltered `gemSlot: 'random'` draw** -- `resolveIntent`'s own gem draw stays over every
   non-null equipped slot, not `castableGemSlots`'s target-filtered set (`checkLegality` alone uses
   the filtered set, for the interpreter's own lookahead). **This is NOT equivalent to the
   filtered draw**, and the earlier claim that it was is wrong: win/loss is checked only after
   `TurnEnded` (CONVENTIONS), so a granted cast fired after the killing blow runs against an
   ALREADY-EMPTY enemy side. Today (and here) that draw can still pick an enemy-side spell, which
   then fizzles for want of a target; `castableGemSlots`'s filtered draw would instead pick a
   still-castable (e.g. ally-side) spell from the same pool. C2b lists this flip explicitly: a
   bonus-caster with `[enemy spell, ally spell]` kills the last enemy, and the bonus cast lands the
   ally spell instead of fizzling.

### New tests

- **`target-selectors.test.ts`**: `'random'`'s own `describe` block -- `targetSelectorHasCandidate`
  now **throws** (PR #71 review; the earlier "always true" reading was wrong per the intent-only
  decision above), `peekTargetSelector` returns `null` drawing zero RNG, `resolveTargetSelector`
  throws. Net **+3** tests vs `main` (28 -> 31).
- **`interpreter.test.ts`**: rewritten to compose `decideAction` + `resolveIntent` (a `decide()`
  helper) so every existing assertion keeps its exact VALUE, only the call site changes, per the
  brief's own C2a rule. The one deliberately-unchanged-in-C2a case ("skips a targeting-required
  rule with no targeting field") still expects the skip. Added a `checkLegality` describe block
  (+8 tests, 20 -> 28): Attack legality tracks living-enemy existence (retitled from a claim about
  suppression it never actually checked -- suppression is covered separately, in the existing
  scoped-suppression block), draws zero RNG even with `random-enemy` targeting, an empty Cast slot
  is illegal, an AOE Cast is always legal, `gemSlot: 'random'` legality tracks `castableGemSlots`,
  and Defend/Provoke/Wait are always legal.
- **`actions.ts`** (new file, 13 tests): `defaultTargetingFor`'s cases (Attack, enemy-Cast,
  ally-Cast, AOE, `gemSlot: 'random'`, an empty slot, and the three self-only actions) and
  `castableGemSlots` (innate slots included, a target-less single-target spell excluded, AOE
  always included); a discriminating draw-order test, looping seeds 0-19 (PR #71 review -- a
  single seed let a gem draw that always picks the LAST slot pass unnoticed): the gem-first
  prediction must hold at every seed, both equipped slots must actually get chosen across the
  loop, and at least one seed's gem-first vs. target-first predictions must diverge (proving order
  actually matters here, not just draw count -- `nextRandom`'s own state transition doesn't depend
  on the pool size the caller multiplies it by, so two different orders can leave `state.rng` in
  the same final position while resolving to different picks).
- **Echo tests rewritten, not just call-site-adapted** (`resolution.test.ts`'s `'echo-cast'` block;
  flagged per the review, since "tests may change only their call sites" does not hold here):
  `onEchoCast` (an injectable stub callback) no longer exists -- `fireHook`'s `echoCast` branch now
  runs a REAL granted cast via `ctx.runAction`, so isolating "did the echo mechanism fire" from
  "did a real cast happen" is no longer possible the old way. The old block's 4 tests (call
  recorded with the right ids; `stacks:false` dedup; exempt from the self-re-entry guard; a
  chancePercent:100 chain hits the depth cap) become **2**:
  - *"runs a real granted cast (never the placeholder response), and is exempt from the
    self-re-entry guard, so a chancePercent:100 chain runs all the way to
    MAX_TRIGGER_CASCADE_DEPTH via CascadeTruncated"* -- merges the old call-recorded/self-re-entry/
    depth-cap cases into one white-boxed test (cascade started 2 hops from the cap, the same
    technique the old depth-cap test used): asserts exactly 2 `TriggerFired`, 2 `EchoCastGranted`
    (both with the correct `sourceId`/`casterId`), 2 real `SpellCast` events, zero
    `StatModifierApplied` (proving the placeholder response never runs), exactly 1
    `CascadeTruncated` at `MAX_TRIGGER_CASCADE_DEPTH + 1`, and the cascade's own depth fully
    unwound afterward. A caster with exactly one equipped spell and the enemy side down to one
    living member keeps every gem/target draw deterministic (pool size 1 either way) regardless of
    seed, so the exact hop count is hand-derivable without an RNG dependency.
  - *"stacks:false: two creatures carrying the SAME effect id -- only one TriggerFired (and one
    ctx.runAction) per firing"* -- the caster has NO equipped spells, so `resolveIntent` can never
    resolve an action; this isolates the dedup claim itself (only the first-dispatched observer's
    trigger even rolls) from "did the granted cast happen," which the test above already covers:
    asserts exactly 1 `TriggerFired` and zero `EchoCastGranted`.
- **Corpus digest** (replaces the 200-case seed sweep -- see below).
- Two stale doc comments (`effect-types.ts`'s `TriggeredDef.echoCast`/`BonusCastDef`,
  `data/traits/glimmerdark.ts`'s Resonant Overtone) that named `combat.ts`'s old
  `runEchoCast`/direct-executor-call mechanisms were corrected to describe the actual
  `ctx.runAction` path -- comment-only, no behaviour change.
- **R1 (final-review fix):** the `'random'` response-target validators had no coverage of their
  own -- `resolution.test.ts` gains a 4-test block beside the existing `SelfCondition validator`
  one: a trait's `triggered` response targeting `'random'` throws; the same target nested inside a
  `consume-stacks` response's wrapped `effect` throws (recursion proof); a `condition-status`'s own
  trigger response targeting it throws; an ordinary (non-random) selector target is accepted by
  both validators. Each throw case was confirmed to fail with the underlying check disabled
  (`validateResponseTargetNoRandomSelector` short-circuited to a no-op), then reverted.

### R2 (final-review fix) -- the "no Node imports in `src/`" guard

`src/engine/__corpus__/node-shims.d.ts` declares `node:fs`/`node:url`/`node:process` as ambient
modules so `corpus-digest.test.ts` can write its own generated fixture. Ambient module
declarations are program-wide by construction, though -- once the shim file is part of the
compile (it is; `tsconfig.app.json` includes all of `src/`), `import ... from 'node:fs'`
type-checks from ANY file under `src/`, not just `corpus-digest.test.ts`, silently reopening the
"no Node built-ins in `src/`" hole `main`'s own `tsc -b` used to close by omission (no `@types/node`
in `tsconfig.app.json`'s `types` array at all). Fixed with an ESLint rule, not a type-level one:
`eslint.config.js` gains a `no-restricted-imports` rule banning the `node:*` pattern across
`src/**`, with a single override turning it back off for `src/engine/corpus-digest.test.ts`. The
shim's own header comment now says so explicitly (it used to claim -- wrongly -- that the
declarations were "visible only where imported"). Verified directly: a throwaway
`src/engine/zzthrowaway-node-import-check.ts` importing `node:fs` fails `npm run lint` with the
new rule's message; removed before committing (never part of the diff).

### R3 (final-review fix) -- explicit digest-test timeout

The digest test measures ~3.0-4.4s against Vitest's 5s default test timeout -- close enough that a
slower CI runner could flake it. `it(...)` now passes an explicit `60_000`ms timeout as its third
argument.

### Corpus digest (replaces the seed sweep)

Per CONVENTIONS "Testing": one test (`corpus-digest.test.ts`) resolves every fight in a pinned,
real-content corpus (`__corpus__/corpus.ts`, test-only -- engine source never imports it, and it
sits outside `__golden__/` so the frozen-replay-sweep glob doesn't pick it up) and compares each
fight's event-log hash/event-count/result against a **generated** fixture
(`__corpus__/corpus-digest.fixture.ts`, header-labeled as such -- "not hand-derived, not a spec").
Regeneration is `npm run corpus:update` (`UPDATE_CORPUS=1 vitest run
src/engine/corpus-digest.test.ts`), which writes the fixture through the same Prettier config the
rest of the repo uses. `hash` is FNV-1a 32-bit over `JSON.stringify(events)`, 8 lowercase hex
chars.

**Composition, exactly per the review's own spec:**
- Registries for every fight: `STOCK_SCRIPTS_BY_ID`, `TRAIT_REGISTRY`, `STATUS_REGISTRY`; no
  party-wide effects.
- **Part A** (300 fights, `i = 0..299`): both sides generated via `generateFloor` --
  enemy at `gen(1 + i % 30, 10000 + i)`, player at `gen(1 + (i*7+3) % 30, 20000 + i)` re-sided to
  `'player'` with ids rewritten (`-enemy-` -> `-player-`) so they never collide with the real enemy
  party's own ids. Combat seed `i`.
- **Part B** (200 fights, `i = 0..199`): the shipped player creatures -- Sorcerer/Brute/Shieldbarer
  starters and the Unicorn at level `L = 1 + i % 25`, slots 0-3; Resonant Overtone added at slot 4
  on odd `i`. Enemy starts from `gen(1 + i % 30, 30000 + i)`; `lvl` = that party's own slot-0
  `origin.level`; `i % 4` decides the enemy shape: `0` swaps in a Shieldbarer starter at slot 0 (an
  enemy Provoker), `1` swaps/appends a Hollowkin Wretch at slot 1 (a Confusion source), `2` does
  both (Shieldbarer at 0, Wretch at 1), `3` leaves the generated party as-is. Combat seed
  `1000 + i`.
- Every floor reference stays within floors 1-30 (biomes 1-3, the only ones with real content) --
  `BIOMES[b]` is always defined for every `gen()` call the corpus makes.

**Timing:** ~3.2-4.4s wall time for the whole 500-fight digest (measured; well inside the "about 5s
or less" budget) -- Part A was not shrunk.

**Mechanism proof, per the review's requirement** -- each mutation applied in isolation against the
committed digest, fight count reported, then reverted (confirmed via `diff` against a pre-mutation
backup of each touched file -- zero net diff after every revert):

| Mutation | Fights changed (of 500) |
|---|---|
| Bonus-cast off (`activeBonusCast` returns `undefined`) | **132** |
| Echo off (`fireHook`'s `echoCast` branch skips `ctx.runAction`) | **41** |
| Provoke redirect off (`resolveOffensiveTarget` skips `resolveProvoke`) | **164** |
| Confusion redirect off (`resolveConfusionRedirect` always returns not-redirected) | **84** |
| `legacyGrantedTargeting` forced off (the option is read but never honored) | **86** |

Every count is nonzero, so the digest genuinely covers all five mechanisms -- it would fail to
catch a regression in any one of them if it didn't move at least this many real-content fights.

### Verification

All four gates green: `npx tsc -b` clean; `npx vitest run` -- **115 files / 754 tests passed**, up
from **113 / 727 on `main`** (confirmed against `origin/main` @ `a2ef7b5`, per-file, not asserted
from memory): `interpreter.test.ts` 20 -> 28 (+8, the `checkLegality` block),
`target-selectors.test.ts` 28 -> 31 (+3, `'random'`), `resolution.test.ts` 79 -> 81 (net +2: the
echo block's 4 tests becoming 2, plus the R1 response-target-validator block's own 4 new tests --
see "New tests"), `actions.test.ts` +13 (new file), `corpus-digest.test.ts` +1 (new file) -- `8 +
3 + 2 + 13 + 1 = 27`, `727 + 27 = 754`. `npm run lint` clean (now including the new
`no-restricted-imports` guard -- see "R2" below); `npm run format:check` clean (after `npm run
format`; whitespace/wrapping only, plus the generated corpus fixture, itself Prettier-formatted at
generation time). `npm run build` succeeds.

**Golden diff against `main`: no fixture under `__golden__/` changed.** (Not "the `*.fixture.ts`
diff against `main` is empty" -- it isn't anymore, since this PR's own corpus fixture,
`__corpus__/corpus-digest.fixture.ts`, is new. That fixture lives outside `__golden__/` on
purpose, precisely so it's never confused with a golden.) Confirmed via `git status`/`git diff
--stat -- 'src/engine/__golden__/*.fixture.ts'` against `main`: empty. What actually establishes
"byte-identical in behaviour" is four separate things, not one circular "the suite passes" claim:
(1) the empty golden-fixture diff itself; (2) every changed `*.test.ts` file was read at each call
site changed, confirming the edit was mechanical (wrapping `events`/`cascade` into
`createResolutionContext(...)`, composing `decideAction` with `resolveIntent`) and never touched
an `expectedEvents`/expected-value literal, with the sole documented exception of the echo block
(rewritten, not adapted -- see "New tests" above, and the one pre-existing "skips a
targeting-required rule" case the brief itself calls out as deliberately unchanged-in-C2a); (3)
the corpus digest, generated once against this PR's own (unmutated) behaviour and then shown, via
the mechanism-proof table above, to move when any of the five mechanisms it covers is disabled --
i.e. it is actually sensitive to the behaviour this PR claims is unchanged, not merely silent
because it doesn't exercise that behaviour at all; (4) the committed digest also passes, unchanged,
when the exact same corpus/digest files are run against `main`'s own (pre-C2a) engine -- verified
directly (a throwaway checkout of `main` @ `a2ef7b5` with `__corpus__/` and
`corpus-digest.test.ts` copied over, `npx vitest run` green with zero mismatches), in addition to
the design review's own independent check. So it is a genuine `main` baseline, not only a snapshot
of this PR's own output re-asserted against itself.

### Next

C2b -- the behaviour changes: B1 (optional targeting, the side-aware default, wiring
`defaultTargetingFor` into `resolveIntent` and the `acted-before-target` peek, retiring
`legacyDefaultTarget`/`getDefaultTarget`), B2 (every action source obeys the same rules: skipped
turns take no action at all, Silenced blocks every cast chosen or granted, `legacyGrantedTargeting`
deleted so Confusion/Provoke reach bonus-cast/echo, rule 4's re-target gains the side-aware default
+ Provoke and `getDefaultTarget` loses its last caller, the castable-filtered `gemSlot: 'random'`
draw replaces the unfiltered one), B5 (the pre-hit fizzle). Each lands with its own new,
discriminating golden, shown to fail with its mechanism removed; every existing golden (now
including this PR's own) stays byte-identical. The corpus digest is expected to change in C2b --
the PR reports how many fights changed and attributes each count to one of the listed flips.

## 4.1-C2b -- B1 and the castable-filtered gem draw

The 4.1-C2b plan review split the brief's "C2b" into two PRs, in the fixed flip order: **C2b = B1 +
the castable-filtered gem draw** (this section), **C2c = B2.1-B2.4 + B5** (its own section, when
built). The plan-review doc-sync (CONVENTIONS "Default targeting", B2 rules 1-2, B5; the brief's
"built as two PRs" note) was committed first, verbatim, as its own commit. Golden policy: every
existing golden byte-identical; each flip lands with a new, hand-derived golden.

### What was built

- **B1 -- the side-aware default.** `resolveIntent` resolves the gem first, then
  `intent.targeting ?? defaultTargetingFor(actor, <resolved action>)`. For a `gemSlot: 'random'`
  cast the default therefore follows the DRAWN spell's side. Attack defaults to `lowest-hp-enemy`.
  The implicit fallback is unchanged in shape (`{ action: attack }`), so it now gets the
  lowest-HP-enemy default. `resolveExplicitOrDefaultTarget` became `resolveSelectorTarget`
  (resolves an already-defaulted selector).
- **Bonus-cast's default changed -- the largest behaviour change in this PR.** A bonus cast is a
  `gemSlot: 'random'` intent with no targeting, so an enemy-side single-target spell now defaults
  to the LOWEST-HP enemy (`legacyGrantedTargeting` only skips Confusion -> Tunnel Vision -> Provoke,
  which is C2c; it no longer keeps first-by-slot). Before, it hit the first living enemy by slot.
  `golden-b1-granted-cast-default` pins it (the corpus digest was the only prior tripwire).
- **Targeting-less rules are valid.** `interpreter.isRuleValid` is `checkLegality` alone;
  `ruleNeedsExplicitTargeting` is **deleted**. `always-cast` drops its `targeting`
  (`data/scripts.ts`); both changes had to land together (dropping the selector while the gate
  still stood makes the rule invalid and looks like it breaks nine goldens; it doesn't).
- **The `acted-before-target` peek.** The interpreter passes
  `rule.targeting ?? defaultTargetingFor(creature, rule.action)` as `ruleTargeting`; pure, draws
  nothing. `conditions.ts` is untouched (importing `actions.ts` there would be a cycle). With no
  single default before the draw (`gemSlot: 'random'`, AOE, self-only) the peek is `undefined` and
  the condition is false (CONVENTIONS).
- **The castable-filtered draw.** `resolveGemSlot('random')` draws `floor(r x n)` over
  `castableGemSlots(actor, state)` -- the set `checkLegality` already uses. Order is unchanged
  (gem draw, then target). No castable slot means no draw at all (before: equipped spells but none
  castable cost one wasted draw). This is the C2b source of RNG-stream change (ASSUMPTION C2b-5;
  the C2c source is legality inside `runAction`).
- **Still alive until C2c (by design, per the split):** `legacyDefaultTarget` and
  `getDefaultTarget` (only `resolveInstanceTarget`'s post-death fallback, i.e. rule 4, uses them)
  and `legacyGrantedTargeting` (unchanged). Comments naming "C2b" for those deletions now say C2c.

### Golden impact -- no existing golden changes

Each flip applied alone to `main` @ `34d7c5b` (before building), full suite:

| Flip alone | Existing goldens changed | Other tests changed | Corpus fights changed (of 500) |
|---|---|---|---|
| B1 (default + gate removal + `always-cast` drop) | **0** | the one interpreter test below | 134 |
| Castable-filtered draw | 0 | none | **0** |

`git diff --stat main -- 'src/engine/__golden__/*'` shows only **added** files (the three new
goldens below); no existing fixture or test under `__golden__/` is modified.

### Corpus-digest attribution (fixed order; regenerated once, via `npm run corpus:update`)

Per-fight event-log hashes dumped after each step (a scratch, untracked dump test, deleted) and
compared with the previous step:

| Step | Fights changed vs previous step | Cumulative vs committed digest |
|---|---|---|
| 1a. B1: the fallback default (script-less attack -> lowest-HP enemy) | **0** | 0 |
| 1b. B1: `always-cast` drops its selector | **47** | 47 |
| 1c. B1: bonus-cast's side-aware default (lowest-HP enemy, was first-by-slot) | **100** (98 if applied alone to `main`) | 134 |
| 1. B1, union of 1a-1c | **134** (the parts overlap: 47 + 100 - 134 = 13 fights change at both 1b and 1c; 11 when each is applied alone to `main`, 47 + 98 - 134) | 134 |
| 2. Castable-filtered draw | **0** -- proven by its golden only (no corpus fight ends with a granted cast against an empty enemy side, and none has an uncastable equipped spell at a random gem draw) | 134 |

The committed fixture diff is 134 changed rows. Restoring `always-cast`'s selector together with
first-by-slot for bonus-cast (the `legacyGrantedTargeting` + enemy-side + no-targeting case)
reproduces `main`'s committed digest exactly (0 fights differ), so 1b and 1c account for all 134;
1a moves nothing on its own (the corpus's script-less attackers never have two living enemies whose
first-by-slot and lowest-HP picks differ), so it is proven by its golden only.

### New goldens (all hand-derived, arithmetic in the fixture header comments)

Each was shown failing with its flip undone, then reverted:

| Golden | Undo | Result |
|---|---|---|
| `golden-b1-fallback-lowest-hp` (script-less attacker; enemies slot 0 HP 25, slot 1 HP 15; hits slot 1) | Default -> first-by-slot (the retired Phase-1 default) | fails (hits slot 0) |
| `golden-b1-support-heals-own-side` (enemy support, stock `always-cast`, ally heal; the healed ally is wounded in-fight, heal 10 < missing 15, no clamp) | Default -> first-by-slot; and separately, `always-cast` regains `targeting: lowest-hp-enemy` | both fail (heal lands on the wrong creature) |
| `golden-castable-draw` (bonus-caster, post-`createCombat` slots [enemy-side innate, ally heal]; seed 8002: chance roll 0.8341, gem draw 0.2492 -> unfiltered picks slot 0 = the enemy spell, which fizzles; filtered pool is [slot 1]) | Unfiltered draw | fails (no `SpellCast`/`HealApplied`); the same golden also fails under the first-by-slot default undo (the heal would land on the caster) |
| `golden-b1-granted-cast-default` (bonus-caster, `chancePercent` 100, exactly one enemy-side single-target spell, post-`createCombat` slots [bolt] asserted; enemies slot 0 HP 50, slot 1 HP 30; always-wait so the cast is the only hit; 30 - 10 = 20, no kill, no clamp; no Provoker/Confusion/Tunnel Vision) | Restore first-by-slot for the bonus-cast path only (`legacyGrantedTargeting` + enemy-side + no targeting) | fails (hits slot 0: `targetId` a, `remainingHp` 40); it is the only golden that fails under this mutation |

The castable-draw test also asserts the post-`createCombat` `equippedSpells` order, since fight
setup prepends innate spells. The new goldens are frozen-sweep-covered too (+4 replay
tests). The other new goldens for the split (Stun/Silence/Confusion/Provoke echo, B5 + rule 4)
belong to C2c.

### Changed unit tests

- `interpreter.test` "skips a targeting-required rule with no targeting field and falls through"
  -> **rewritten** to "a targeting-less rule is valid (B1)": it matches, the intent carries no
  targeting, and it resolves to the lowest-HP enemy (slot 1, not slot 0). The one change the brief
  names. Nothing else changed an expected value.
- New: an ally-side targeting-less cast defaults to the lowest-HP ally; the `acted-before-target`
  peek (true only via the side-aware default; draws no RNG -- `rng.position` unchanged; an explicit
  rule targeting still wins; false for a `gemSlot: 'random'` rule) -- shown failing with the peek
  reduced to `rule.targeting`; `actions.test`: the random gem draws over castable slots only and
  draws nothing when none is castable, and a `gemSlot: 'random'` cast defaults by the drawn spell's
  side.

### Verification

`npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` clean;
`npx vitest run`: **119 files / 768 tests** (from 115 / 754: +4 golden tests, +4 sweep replays, +4
interpreter, +2 actions). Frozen double-resolve and replay sweep green.

### Spec notes

None new: the plan-review doc-sync already answered every question this slice raised (peek in the
interpreter; `acted-before-target` false with no single default; default from the resolved
action).

### Review changes (PR #72)

- **F1:** `golden-b1-granted-cast-default` (above), with its discrimination proof.
- **L1:** the B1 attribution row is split into its parts (above).
- **L2 -- comment-only edits to two existing golden fixtures** (existing fixtures may be edited in
  comments only; verified by stripping comments from the old and new file and comparing the
  remaining code: identical): `golden-heal-cast.fixture.ts` (the `HEAL_LOWEST_ALLY_SCRIPT` doc
  comment no longer claims `always-cast` targets `lowest-hp-enemy`) and
  `golden-buff-cast.fixture.ts` (the trailing comment on `scriptId: 'always-cast'`; the code on
  that line is unchanged).

### Next

**4.1-C2c** -- B2.1-B2.4 + B5: the skipped-turn refusal (roll first), `checkLegality` inside
`runAction` (a refused action draws nothing), delete `legacyGrantedTargeting`, rule 4, the pre-hit
fizzle; deletes `legacyDefaultTarget`/`getDefaultTarget` (retiring the two `getDefaultTarget`
tests with the function); goldens 3-7 as amended at the plan review.

## 4.1-C2c -- B2 (one rule set for every action source) and B5 (pre-hit fizzle)

Completes 4.1-C. The plan review's doc-sync (CONVENTIONS B2 rule 2: a refused granted action emits
nothing of its own) landed first as its own commit. Golden policy: every existing golden
byte-identical; each flip lands with a new hand-derived golden.

### What was built

- **B2.1 -- a skipped turn refuses the granted cast.** `maybeFireBonusCast(actorId, state, events,
  turnSkipped)` rolls the chance first, then returns if the turn was skipped; the call site passes
  the turn-start `suppressed` flag. It holds even when the lock is gone by the granted step.
- **B2.2 -- legality before resolution, for every source.** `runAction` calls `checkLegality`
  before `resolveIntent` (main action included). A refused action draws nothing and emits nothing
  (no `announce`, so a refused echo leaves only the bearer's `TriggerFired`). The actor is the
  caster for an echo, so the bearer's own locks never gate its passive trigger.
- **B2.3 -- `legacyGrantedTargeting` deleted**, with `ResolveIntentOptions` and both call-site
  flags; `resolveIntent` is `(actor, intent, state)` again and `RunActionOptions` keeps only
  `announce`. Bonus-cast and echo targets go through Confusion -> Tunnel Vision -> Provoke.
- **B2.4 -- rule 4.** `resolveInstanceTarget(actor, previous, state, action, targetSide)` falls back
  to `defaultTargetingFor(actor, action)` (the one B1 source of truth), then Provoke via
  `resolveProvoke` (now exported from `targeting.ts`): one draw even for a single provoker, skipped
  under Tunnel Vision and for an ally-side instance, never a Confusion roll. `legacyDefaultTarget`
  and `getDefaultTarget` are deleted.
- **B5.** After an instance's pre-hit hooks (`on-attack`/`on-cast` and `on-action-observed`),
  `executeAttack` and `executeCastSingle` re-read the target; a dead one `continue`s the instance
  (no damage, payload, status, `on-damage-dealt` or Splashing for it). `AttackDeclared`/`SpellCast`
  stay; no fizzle event.

### Golden impact (measured on main @ c0bb616 before building)

Each flip alone, then all five together, full suite: **0 existing goldens and 0 unit tests
change** in every run (only `corpus-digest` fails, as expected). Alone against main's digest:
B2.1 0, B2.2 0, B2.3 87, B2.4 73, B5 18 fights changed.

`git diff --stat -- src/engine/__golden__`: only the 10 new files added, plus two comment-only
edits (below).

### Corpus-digest attribution (fixed order; regenerated once via `npm run corpus:update`)

Per-fight hashes dumped after each cumulative step and compared with the previous step:

| Step | Changed vs previous step | Notes |
|---|---|---|
| 1. B2.1 | **0** | Proven by its golden only. |
| 2. B2.2 | **0** | Proven by its golden only. |
| 3. B2.3 | **87** | By source, each applied alone to step 2: bonus-cast **87**, echo **22**; the union is 87 because all 22 echo-moved fights also move under bonus-cast (overlap stated, not summed). |
| 4. B2.4 | **72** | Measured after B2.3. Split: the side-aware default (without Provoke) moves **72**; adding the Provoke step moves **0** further fights but changes the log of **2** of those same 72 (default-only vs full differ in 2 fights, both inside the 72). Applied alone to main, B2.4 moves **73**, not 72: 3 of those already moved under B2.3 and land on the same path (so they don't move again in the step), and 2 fights B2.4 alone leaves untouched do move in the step because B2.3 changed their history (73 - 3 + 2 = 72). 49 of the step's 72 fights were also changed by B2.3. |
| 5. B5 | **18** | One reason. |
| **Cumulative vs committed digest** | **126** | Steps overlap: 87 + 72 + 18 > 126, later steps re-change fights an earlier step already changed. |

The committed fixture diff is 126 changed rows, and the regenerated fixture is byte-identical to the
cumulative dump of the five steps. **Undo all five reproduces main's committed digest exactly**
(0 fights differ): all five reverted at once on the final code (skip gate removed; `runAction`'s
legality check removed; granted casts skipping the override pipeline again; rule 4 back to
first-by-slot with no Provoke; both B5 guards removed), digest regenerated and compared with
`git show HEAD:` of the fixture. B2.1 and B2.2 move 0 corpus fights, so each is proven by its
golden only.

### New goldens (hand-derived; arithmetic and the mulberry32 draws are in each fixture header)

Every one uses the uniform fixture shape, so the frozen replay sweep covers it (no bespoke-list
entry). Each was shown failing with its mechanism removed (each mutation applied alone, then
reverted; only the named golden(s) fail):

| Golden | Mutation | Result |
|---|---|---|
| `golden-b2-skipped-turn-refuses-granted-cast` (seed 9200; Stun applied at fight start, removed by an `on-turn-end` fixture trigger before the granted step, so only the gate refuses; later consumer: E1's `random-enemy` pick over 3 targets, draw #2 = 0.3225 -> CASTER, vs draw #1 = 0.8779 -> D2) | skip gate removed | fails (a `SpellCast` appears) |
| same | refuse **before** the roll | fails (E1's pick shifts to D2) |
| `golden-b2-silenced-refuses-granted-cast` (seed 9211; permanent scoped-cast `suppress-action` fixture trait; the caster still attacks; E1's pick = draw #2 = 0.2864 -> CASTER, vs draw #3 = 0.4192 -> D1) | `checkLegality` removed from `runAction` | fails (a cast lands) |
| same | draw the gem, then refuse | fails (E1's pick shifts to D1) |
| `golden-b2-confused-granted-cast-redirects` (seed 9229; Confusion roll 0.2319 < 0.5, ally pick 0.7761 over [caster, A1, A2] -> A2; default enemy would be E2) | granted casts skip the override pipeline again | fails (cast hits E2) |
| `golden-b2-provoke-redirects-echo` (seed 9233; echo chance 50% with a passing first roll 0.1123 and a failing second 0.6661, so exactly one `EchoCastGranted`, no `CascadeTruncated`; the echo's draw #4 = 0.4413 over [P, X, Y] would pick X, a non-provoker) | granted casts skip the override pipeline again | fails (echo hits X) |
| `golden-b5-fizzle-rule4-retarget` (no RNG; enemies A 30 / B 25 / C 20 with C the unique lowest, wounded to 5/20 at fight start; lethal `on-attack` fires because 5*100 = 500 <= 30*20 = 600, and not on B because 25*100 = 2500 > 30*25 = 750; instance 2 = 20 x 0.3 -> 6 on B) | B5 guard removed | fails (a `DamageDealt` on the corpse) |
| same | rule 4 back to first-by-slot | fails (instance 2 hits A) |

Plan-review corrections applied: the echo golden uses a sub-100% chance (a 100% echo re-triggers on
its own echo every hop to the depth cap); the B5 golden's wound target is unambiguous (C's max HP
is below B's, so no slot tie-break is involved).

### New and retired unit tests

- **Retired** (with `getDefaultTarget`, not changed): `targeting.test.ts` -- "returns null when the
  enemy side has no living creatures" and "returns the first living enemy by slot, ascending".
- **Changed:** none. No existing expected value moved.
- **New (`actions.test.ts`, +10)**, each shown failing with its mechanism removed:
  - `runAction` refuses a scoped-Cast lock and draws/emits nothing -- fails with legality removed
    and with draw-gem-then-refuse.
  - Clear Mind-style immunity re-permits the cast -- fails with the immunity check removed.
  - An `'all'` lock applied by a turn-end hook refuses that turn's granted cast -- fails with
    legality removed (and, by design, still passes with only the B2.1 skip gate removed: it pins
    B2.2, not B2.1).
  - An echo: a Stunned bearer still echoes (fails if the bearer's locks are checked); a locked
    caster refuses the echo, leaving only the trigger's `TriggerFired` (fails with legality removed).
  - Rule 4: lowest-HP default not first-by-slot (fails with first-by-slot restored); Provoke branch
    with exactly one draw for a single provoker (fails with Provoke removed and with the single-
    provoker shortcut); Tunnel Vision skips Provoke, no draw; a 100%-confused attacker is never
    redirected and draws nothing (fails if the Confusion pipeline is used); an ally-side instance
    skips Provoke (fails with first-by-slot and with Provoke applied to ally instances).

### Comment-only edits to existing fixtures (code tokens compared old vs new: identical)

- `golden-6v6.fixture.ts` (doc comment: default targeting is the lowest-HP enemy, and equal HP
  makes the slot tie-break pick the first living enemy). The plan review named
  `golden-6v6-scripted.fixture.ts:43`; the stale sentence is in `golden-6v6.fixture.ts` (there is
  no such file name).
- `golden-b1-granted-cast-default.fixture.ts` ("(those are C2c)" now says the override pipeline draws
  nothing here).

### Verification

`npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` clean; `npx vitest run`:
**124 files / 786 tests** (from 119 / 768: -2 retired, +10 unit, +5 golden tests, +5 sweep
replays). Frozen double-resolve and replay sweep green. Note: `npm run corpus:update` uses a POSIX
`VAR=x cmd` prefix and fails under Windows `cmd`; it was run with `--script-shell` pointing at Git
Bash.

### Review changes (PR #73)

Two change sets, so they can be committed separately.

- **Set 1 -- behaviour and its tests (items 1-3, 5):** `src/engine/actions.ts`;
  `src/engine/actor-death.test.ts` (new); `__golden__/golden-actor-dies-attack.{fixture,test}.ts`
  and `__golden__/golden-b5-cast-fizzle.{fixture,test}.ts` (new); `__corpus__/corpus-digest.fixture.ts`
  (regenerated once); `package.json`, `vite.config.ts`, `corpus-digest.test.ts` and a comment in
  `eslint.config.js` (item 3); `src/engine/test-utils/golden-runner.ts` (the two new golden tests
  use it, so it ships with this set); this record.
- **Set 2 -- test-only (item 4):** every other `__golden__/*.test.ts` (driving code only) and the
  fixtures that gained a `TURN_STEPS` or `setup` export; `src/engine/dead-target-pins.test.ts`
  (new); the deletion of `frozen-replay-sweep.test.ts`. No engine source, no `expectedEvents` /
  `expectedResult`.

#### B5 is built at two sites, each with its own test

- `executeAttack`: `golden-b5-fizzle-rule4-retarget` (fails with the attack guard removed).
- `executeCastSingle`: **new** `golden-b5-cast-fizzle` (seed inert, no RNG). SMITE = single-target
  damage spell, spellPower 1.0, `appliesStatus` Weaken, with a second cast instance (30%). Enemies
  A 30 / B 25 / C 20; C is wounded to 5 at fight start (15 flat, the unique minimum, no tie). The
  `on-cast` trigger fires on C (5*100 = 500 <= 30*20 = 600), kills it, and the hit fizzles: no
  `DamageDealt`, no `StatusApplied`. Instance 2 re-targets by rule 4 to B (25 < A's 30; first-by-slot
  would be A), the trigger is false there (2500 > 750), 20 x 0.3 = 6 -> raw 6.06 -> 6, B 25 -> 19, and
  Weaken lands on the living B. Fails with the cast guard removed (a `DamageDealt` on the corpse).

#### Dead-actor rule ("An action ends when its actor dies")

`actorDied(actor, working)` reads the actor fresh from `working` and the executors drop the rest of
the action (no fizzle event; events already emitted stay) at the four sites CONVENTIONS names:

1. the start of each instance, before target resolution and `AttackDeclared`/`SpellCast`
   (`executeAttack`, `executeCastSingle`, the AOE instance loop);
2. after each instance's pre-hit hooks, before the hit or payload (both single-target loops);
3. before each Splashing hit;
4. before each AOE member's hit.

Tests (each shown failing with only its own check removed):

| Site | Test | Mutation that fails it |
|---|---|---|
| 1, Attack | **golden** `golden-actor-dies-attack` (two-instance attacker HP 10, target retaliates with a lethal flat hit on the triggering source after instance 1: 20 dmg -> target 80, then 99 flat on the attacker; instance 2 emits nothing) | site-1 check removed from `executeAttack` |
| 1, single Cast | `actor-death.test.ts`: no second `SpellCast` | site-1 check removed from `executeCastSingle` |
| 1, AOE | `actor-death.test.ts`: no second instance's `SpellCast` | site-1 check removed from `executeCastAoe` |
| 2, Attack | `actor-death.test.ts`: self-inflicted `on-attack` kill, only the self hit lands | site-2 check removed from `executeAttack` |
| 2, single Cast | `actor-death.test.ts`: self-inflicted `on-cast` kill, no payload | site-2 check removed from `executeCastSingle` |
| 3 | `actor-death.test.ts`: the first splash target retaliates and kills the attacker, the second splash target is not hit | site-3 check removed |
| 4 | `actor-death.test.ts`: the first AOE member retaliates and kills the caster, the second is not hit | site-4 check removed |

#### Corpus attribution (regenerated once, after items 1-3; `npm run corpus:update`)

Row 6, after the fixed five steps: **the dead-actor rule moves exactly 5 fights**
(308, 374, 433, 467, 496), exactly the five the review named (not individually replayed here; the review describes them as Brute killed by
Snapback / Retaliating Shell after its first hit, and a Sorcerer killed by Retaliating Shell during an
Overtone echo). 4 of the 5 (308, 374, 433, 496) were already changed by the earlier steps; 467 is
new. **Cumulative vs main's digest: 127 changed fights** (was 126). **Outcomes: unchanged by this
row.** Against main's digest 6 fights change result, the same 6 as before (2 draw -> win,
3 loss -> draw, 1 loss -> win); one of the six (374) is among the five, and its result is the same before and after this row (the change vs main comes from the earlier steps). Event counts move by a few events in
each of the five (e.g. 4557 -> 4558, 4018 -> 3990) and no result changes. No other fight moved.

#### `corpus:update` on Windows

`package.json`: `vitest run src/engine/corpus-digest.test.ts --mode corpus-update`; the digest test
reads `import.meta.env.MODE === 'corpus-update'` directly, with no extra config in `vite.config.ts`
and no `node:process` import. Checked on Windows with Vitest 5.0.1: `npm run corpus:update`
regenerates the fixture and a plain `npm run test` only compares.

History, for the record: an earlier build of this branch forwarded the mode through
`vite.config.ts` because `import.meta.env.MODE` read `'test'` under `--mode corpus-update`. The cause
was a stale local install (Vitest 4.1.11 in `node_modules` while `package.json` and the lockfile
specify 5.0.1), not a platform difference: after `npm ci` the direct read works, and the
forwarding was removed.

#### Test-only consolidation (set 2)

ASSUMPTIONS (shape pinned):
- Helper: `src/engine/test-utils/golden-runner.ts`, exporting `runGolden(fixture, { seed? })` ->
  `{ initial, state, events }`, `createGoldenState(fixture, seed?)` and `stepFrozen(state)`
  (`resolveTurn(deepFreeze(state))`).
- A fixture exports `SEED`, `playerParty`, `enemyParty`, optional `scripts`/`traits`/`statuses`,
  optional `TURN_STEPS` (absent = run to the end) and optional `setup(state)` (the post-`createCombat`
  wounds and pre-applied statuses; runs before the first frozen turn). A two-seed golden passes
  `{ seed }`. No golden needed a custom `drive` export: `initial` is returned so the tests that
  asserted on the starting state (slot lists, RNG position) still can.
- Fixtures gained: `TURN_STEPS` where their test ran a bare `resolveTurn` or a hardcoded loop, and
  `setup` in the 13 goldens that wounded or pre-applied (d3 x2, dot, necromoss-reclaim, rot-sovereign,
  both round-end mid-sweep, sporch-cinderlord-burn-stacks, spore-spread x4, hollowkin-wretch-self-dot).

Expected-value check: `git diff -U0` over the fixtures shows one removed line in total (an unused
`CombatEvent` import replaced); no `expectedEvents` / `expectedResult` line is added or removed in any
fixture. In the tests, no `expect(events).toEqual(...)` / `expect(state.result)` line is removed or
added; the only changed assertion lines are the six slot-list checks (`state` -> `initial`, since the
runner returns the starting state) and one `working.result` -> `state.result`. (`golden-castable-draw`'s
slot-order check, "asserted in the test" per its header, was dropped by the first rewrite and is
restored, so it is unchanged, not a seventh change.)

Counts: tests before this hand-out 786 (58 in the sweep); now 799 with the sweep file still present
(+2 new goldens, +6 `actor-death`, +3 `dead-target-pins`, +2 sweep replays for the two new
fixtures); **741 once `frozen-replay-sweep.test.ts` is deleted** (-58: 56 replays + 2 accounting
tests). No golden's own test count changed (88 golden test files, 90 tests). The sweep file is still
in the working tree: deleting files is left to the owner.

Freeze proof, two mutations against the shared runner:
- Removing the per-turn clone at the top of `resolveTurn` (RNG writes hit the frozen input): **25
  golden test files fail**, against 15 before (14 sweep entries + `golden-d3-revive-cap-exclusion`).
  Newly caught, all previously excluded from the sweep: `golden-6v6-scripted`,
  `golden-chance-percent`, `golden-cheat-death`, `golden-resonant-overtone`,
  `golden-seed-sensitivity`, `golden-spider-broodwarden`, `golden-spore-spread`,
  `golden-spore-spread-dot-kill`, `golden-spore-spread-filter`, `golden-web-break-free`. Goldens that
  draw no RNG cannot fail this mutation.
- So a second mutation writes a non-RNG field of the input at the top of `resolveTurn`
  (`state.round = state.round`): **all 88 golden test files (90 tests) fail**, against 56 replays in
  the sweep. Every golden is now frozen-replayed.

Two behaviours no test pinned, in `dead-target-pins.test.ts` (hand-derived in the file):
- An AOE cast skips a member that died earlier in the same cast (member 1, HP 5, dies to the 20-damage
  hit; its `on-death` flat 99 on its lowest-HP ally kills member 2, HP 50; the loop must skip 2's
  hit). Fails with the `if (!target.alive) continue` in the AOE member loop removed.
- A status is never applied to a dead target (Smite, Int 20 vs HP 5, `appliesStatus` Weaken: the
  kill emits no `StatusApplied`; a control on a survivor does). Fails with the alive check in
  `applyStatusIfAlive` removed.

### Verification (after PR #73)

`npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` clean; `npm run test`: 128 files /
799 tests with the sweep file present (741 without it). `npm run corpus:update` now uses `--mode`.
All existing goldens' `expectedEvents` are unchanged.

### Spec notes (for the docs, before 4.1-D / 4.1-E)

- The "attacker dying during its own pre-hit hooks" question is **decided and built** (CONVENTIONS "An
  action ends when its actor dies"); nothing outstanding.
- Nothing else surfaced: rule 2's "a refused granted action emits nothing" was the one gap earlier,
  already in CONVENTIONS.

## 4.1-D -- Spells carry responses (byte-identical)

A pure re-expression (A4). The plan review's doc-sync (CONVENTIONS "Spells carry responses", the brief's
4.1-D "decided at the plan review" block, ASSUMPTIONS 35-37) landed first as its own commit. Golden
policy: **byte-identical, hard requirement**. Met: no golden's expected values changed, no corpus
regeneration. The review pass that followed (items 1-4 below) is also golden- and corpus-neutral,
with **one deliberate, accepted exception** in a content-free corner: trait `scalingStat` heals with
a `magnitudeSource` count now use `stat x (spellPower x count)` instead of `(stat x spellPower) x
count` (item 2). The design owner accepted it as float noise; it moves no golden and no corpus
fight (measured), and Necromoss-shaped content can differ by 1 HP on rare Health and modifier
combinations.

### What was built

- **`Spell = { id, name, affinity, unlockedAtBiome, targetShape, targetSide, effects }`.** `payload`,
  `spellPower`, `scalingStat`, `statModifier` and `appliesStatus` are deleted from `Spell`;
  `targetSide` and `unlockedAtBiome` are now **required** (plan review F3). The `?? 'enemy'` fallbacks
  in `actions.ts` are gone.
- **`cast-target` `ResponseTarget`** (`effect-types.ts`, resolved in `resolution.ts`): the current
  landed target, alive or not; resolving it with no `castTarget` on the context throws a
  resolver-invariant error. A dead landed target gets nothing because **no verb acts on a corpse**
  (the verb rule, below), not because `cast-target` filters it. `HookContext` gained `castTarget` and `castPowerFraction`
  (transient; never in `CombatState`).
- **`executeSpellEffects`** (`actions.ts`) replaces `applyCastPayload` / `applyStatusIfAlive` /
  `resolveSpellOffStat`. It runs the list once per landed target, in list order, through
  `executeResponse` directly (so no `TriggerFired`, no cascade-depth or self-guard accounting), from
  `executeCastSingle` and `executeCastAoe`. The loop-level checks (the four dead-actor sites, the B5
  pre-hit fizzle, the AOE frozen-member alive-skip) are untouched.
- **`heal.offStat`** (plan review F2): the remap-aware formula slot, mirroring `deal-damage`. A heal
  spell always used the remap-aware Intelligence lookup, and `heal.scalingStat` reads its stat raw.
  The three heal magnitude modes (`amountPerStack` / `scalingStat` / `offStat`) are mutually
  exclusive; the check is tested.
- **`validateSpellEffects`** (`effect-types.ts`), called over `ALL_SPELLS` at import
  (`data/spells/index.ts`): `deal-damage` / `heal` in formula mode only, `apply-status`,
  `apply-stat-modifier`, `remove-status`; each targeting `cast-target` or `self` (plan review F1). A
  `self` effect runs once per landed target. `cast-target` is **rejected** in trait, perk and status
  responses (the existing `validate*NoRandomSelector*` validators now also throw on it). **Review
  item 1:** a spell's damage and heal are cast-slot formula magnitudes: the validator also rejects a
  `deal-damage` whose resolved damage source is not `'cast'` (`damageSource`, else `'attack'` in
  `scalingStat` mode, else the `offStat` value, so a `scalingStat` effect must say `damageSource:
  'cast'`), an `offStat` other than `'cast'` on `deal-damage` or `heal`, and an effect setting both
  `offStat` and `scalingStat` (which used to pass import and throw mid-fight).
- **One formula for every formula-mode magnitude (review item 2).** `heal`'s `scalingStat` mode is
  `getEffectiveStat(bearer, stat) x (spellPower x multiplier)`, whatever the multiplier is (a cast's
  power fraction or a `magnitudeSource` count). The `castPowerFraction !== undefined` branch is
  gone, so nothing in `executeResponse` asks whether a heal runs inside a spell. That is the order
  `deal-damage` uses in every mode and `heal.offStat` gets through `getOffensiveStat`.
- **The verb rule (review item 3, completed in round 2):** `apply-status`, `apply-stat-modifier`,
  `remove-status` and `grant-action-state` skip a target that is not alive, with no event, whatever
  the target kind (`deal-damage` and `heal` already did; `revive` is the one verb that targets the
  dead). `cast-target` therefore resolves to `[castTarget]` with no alive check. `consume-stacks`
  is unchanged: it has no target and spends the firing creature's own stacks, so it runs whenever
  its trigger does, `on-death` included.
- **Dropped:** `Spell.scalingStat: 'none'` and its one unit test (ASSUMPTION 37).
- **Re-expression:** every spell in `src/data/spells/*`, `__fixtures__/biomes.ts`, 14 golden
  fixtures and the spell-carrying test files (see "Files changed"). A one-off codemod rewrote the
  ~60 old-shape literals mechanically; `tsc -b` then found the rest (three species tests, the
  registry dedup key, the `'none'` test), which were rewritten by hand. The mapping is exactly what
  `toSpell` in `spell-effects.test.ts` does.
- **Removed as dead:** `dealDamageWithOffStat` (its only caller was the old cast path).

### Parity rules, pinned

Each row was shown failing with its mechanism removed or broken, applied alone then reverted (a
mutation runner swaps the exact source text, runs the **whole** suite, records the failing tests and
restores the file; the files were compared byte-for-byte afterwards).

| Rule / check site                                        | Proving test                                                                                                                                              | Mutation -> result                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 cast slot, `'cast'` tag, no `TriggerFired`            | the equivalence tests                                                                                                                                     | damage forced to the attack slot -> 20 fail (equivalence x3, `combat.test` spell hits, corpus); a `TriggerFired` pushed per effect -> 28 fail                                                                                                                                       |
| P2 counts as a cast (`cross-stat`), never splashes       | `P2: ...`                                                                                                                                                 | a splash loop added to the cast path -> that test fails                                                                                                                                                                                                                             |
| P3 heal / stat-modifier emit no `TriggerFired`           | heal and stat-modifier equivalence                                                                                                                        | the same `TriggerFired` mutation                                                                                                                                                                                                                                                    |
| P4 no status on a dead target                            | `dead-target-pins` "never applied to a dead target" (held by the verb rule since review item 3)                                                          | `apply-status` guard removed -> 4 fail (that test, the two new `apply-status` verb-rule tests, corpus)                                                                                                                                                                              |
| P5 `powerPercent` scales damage and heal only            | stat-modifier equivalence ([100, 30]: full strength twice)                                                                                                | factor scaled by the fraction -> the equivalence test fails                                                                                                                                                                                                                         |
| P5 float association (`stat x (sp x pf)`)                | damage equivalence; heal equivalence for `offStat` and for `scalingStat` (Int 60, sp 1.5: 26.999999999999996 -> 26, vs 27)                                | damage association changed -> 2 fail; heal `scalingStat` association changed -> the scalingStat case fails. **The first version of the heal test did not catch this** (20 x 0.5 x 0.3 is exact either way); found by the mutation run, fixed with the Int 60 case                   |
| P6 `on-cast` / `on-action-observed` before the list      | `golden-on-action-hooks`, `golden-action-observed`, the ASSUMPTION 36 test, `actor-death` site 2                                                          | list run before the hooks -> 11 fail                                                                                                                                                                                                                                                |
| P7 list order; AOE in slot order                         | damage + status, AOE + status                                                                                                                             | list reversed -> 7 fail                                                                                                                                                                                                                                                             |
| P8 no depth / self-guard accounting                      | `P8: ...` (cascade at MAX-1, the target's reaction still fires)                                                                                           | `depth += 1` around the list -> that test fails                                                                                                                                                                                                                                     |
| B5 (single): a dead target gets nothing                  | `golden-b5-cast-fizzle`; the stat-modifier, heal and `self`-effect tests                                                                                  | see the note below                                                                                                                                                                                                                                                                  |
| Dead actor, single site 1 / site 2                       | `actor-death`                                                                                                                                             | check removed -> 1 / 2 (+ corpus) fail                                                                                                                                                                                                                                              |
| Dead actor, AOE site 1 / site 4                          | `actor-death`, the ASSUMPTION 35 AOE test                                                                                                                 | check removed -> 1 / 2 fail                                                                                                                                                                                                                                                         |
| AOE skips a member that died earlier                     | `dead-target-pins`; the AOE `self`-effect test                                                                                                            | see the note below                                                                                                                                                                                                                                                                  |
| `cast-target`, single-target site                        | `cast-target resolves ... BOTH sites` (status only on the chosen target)                                                                                  | resolves to `self` -> 40 fail                                                                                                                                                                                                                                                       |
| `cast-target`, AOE site                                  | same describe, AOE test (status on each member in slot order)                                                                                             | list given the first member only -> 7 fail                                                                                                                                                                                                                                          |
| `self` effect once per landed target                     | single and AOE drain tests                                                                                                                                | self effects only for the first member -> the AOE test fails                                                                                                                                                                                                                        |
| ASSUMPTION 35 (atomic list)                              | the two atomic tests                                                                                                                                      | an actor check added between effects -> both fail                                                                                                                                                                                                                                   |
| ASSUMPTION 36 (live caster)                              | the `on-cast` doubles-Int test (live 20; a snapshot gives 10)                                                                                             | caster's effects reset to the snapshot before each effect -> that test + corpus fail                                                                                                                                                                                                |
| `heal.offStat` remap-aware; modes exclusive              | the stat-remap heal test; the exclusivity test                                                                                                            | unconditional Int read -> fails; exclusivity dropped -> fails                                                                                                                                                                                                                       |
| `cast-target` rejected outside spells; throws w/o context | validator tests; the no-context test                                                                                                                      | each removed -> its test fails                                                                                                                                                                                                                                                      |
| Item 1: damage source resolves to `'cast'`                | validator tests: `scalingStat` without `damageSource`; explicit non-cast `damageSource`; the accepting case                                              | check removed -> both rejection tests fail                                                                                                                                                                                                                                         |
| Item 1: `offStat` is `'cast'` only                        | validator tests, `deal-damage` and `heal` separately                                                                                                      | check removed from `deal-damage` -> its test fails; from `heal` -> its test fails                                                                                                                                                                                                  |
| Item 1: not both `offStat` and `scalingStat`              | validator tests, `deal-damage` and `heal` separately                                                                                                      | check removed from `deal-damage` -> its test fails; from `heal` -> its test fails                                                                                                                                                                                                  |
| Item 1: Root Grasp must say `damageSource: 'cast'`        | the import-time validator over `ALL_SPELLS`                                                                                                               | `damageSource: 'cast'` deleted from Root Grasp (`data/spells/overgrowth.ts`) -> **58 tests fail** (every suite importing the spell registry fails to load: "spell root-grasp effect #0 ... must resolve to damageSource 'cast'"); restored                                          |
| Item 2: one `heal` formula, trait or spell                | new trait test (fixture trait: `scalingStat: health`, `spellPower 0.15`, count of 3 dead allies, Health 60 -> **26**, old order 27); the Int 60 spell case | the old `(stat x sp) x count` order restored -> the trait test fails (and the spell `scalingStat` association case)                                                                                                                                                                 |
| Item 3: `apply-status` skips a corpse                     | spell `[deal-damage cast-target, apply-status self]` whose retaliation kills the caster; and a trait `apply-status` on a dead `triggering-source`        | guard removed -> both fail (+ `dead-target-pins`, corpus)                                                                                                                                                                                                                          |
| Item 3: `apply-stat-modifier` skips a corpse              | the same spell shape with `apply-stat-modifier self`                                                                                                      | guard removed -> that test fails                                                                                                                                                                                                                                                   |
| Item 3: `remove-status` skips a corpse                    | trait `remove-status` on a `triggering-source` that died earlier in the chain (no `StatusExpired`, corpse effect list unchanged)                          | guard removed -> that test fails                                                                                                                                                                                                                                                   |
| Item 3 (round 2): `grant-action-state` skips a corpse | trait `grant-action-state` (`defending: true`) on a dead `triggering-source` (the dead victim's `defending` stays false) | guard removed -> that test fails (the only failure) |

**Note: B5's `continue` and the AOE alive-skip are no longer the only guard** for a `cast-target`
effect: no verb acts on a dead target, so a dead landed target already gets nothing. Removing either
guard alone therefore failed **no** test at first (0 failing). They still matter for a `self` effect
in the list, which targets the (living) caster, and "a dead target gets nothing from the list"
includes it. Two tests were added (`B5 and the AOE alive-skip also guard self effects`), and each
guard removed alone now fails exactly one test.

### Equivalence tests

One per payload kind (damage, heal, stat-modifier, damage + status, AOE + status), plus the
explicit-`scalingStat` damage case and the two heal float-association cases. Each runs the same cast
down the old and new paths from equal states and compares events, final state and RNG position. The
"old" side is `legacyCast` in `spell-effects.test.ts`: the pre-4.1-D payload path as it stood on
`main@eb37246`, replayed on the same exported primitives (`applyHeal`, `applyStatModifier`, `applyStatus`;
damage via `dealDamage` / `dealDamageWithScalingStat`, which compute the value that
`dealDamageWithOffStat(resolveSpellOffStat(...))` passed to the same core). Each case also pins its
hand-derived numbers (arithmetic in comments).

### Verification

- **Expected exports vs `main`:** `main`'s `src` extracted with `git archive eb37246`, the branch's
  `src` copied beside it; one throwaway vitest file imports **all 88 golden fixtures from both
  trees** and deep-equals every `expected*`, `SEED` and `TURN_STEPS` export (268 declarations): **0
  differences**. The same script fails (two assertions) when a branch export is perturbed, so it can
  fail. No golden's `expected*` / `SEED` / `TURN_STEPS` line appears in the diff, and no
  `__golden__/*.test.ts` file changed. 14 fixtures changed, **their spell inputs only** (plus the header comments of three of them, review item 4).
- **Corpus digest:** `git diff --stat -- src/engine/__corpus__` is empty, `corpus:update` was never
  run, and `corpus-digest.test.ts` passes.
- **Test count, file by file** (per-test names compared, `main` baseline vs branch): 127 files / 741
  tests -> 128 files / **786 tests**. The only differences: `combat.test.ts` 39 -> 38 (the retired
  `'none'` test) and the new `spell-effects.test.ts` (0 -> 46: 33 from the build, 12 from the review
  items, 1 from round 2). Every other file has the same tests with the same names.
- **Every registered spell, field by field.** All **25** spells in `ALL_SPELLS` were compared against
  their `main` shape through the documented mapping (payload / `spellPower` / `scalingStat` /
  `statModifier` / `appliesStatus` / `targetSide ?? 'enemy'` / `unlockedAtBiome ?? 1` -> `effects`),
  by a throwaway script that imports both trees (`git archive eb37246` beside the branch's `src`)
  and deep-equals each spell, id order included: **0 differences**. Done by Claude (this build's
  author), not an independent reviewer. The mix covered: 4 plain single damage, 1 plain AOE, 7
  single and 1 AOE damage + status, 1 `scalingStat` damage, 5 stat-modifier (2 enemy single, 1 ally
  single, 2 ally AOE) and 6 heal spells (all authored with an explicit `scalingStat`, 4 of them with
  a status rider; the default remap-aware `offStat` heal is exercised only by tests).
- **What the corpus covers.** The corpus casts only **10 of the 25** registered spells (Afterglow,
  Arcane Bolt, Beacon Charge, Charnel Feast, Luminous Tide, Overcharge, Pollen Cloud, Regrowth, Vine
  Snare, Wild Vigor; recounted on the final branch by running every corpus fight on `main` and on
  the branch and collecting the `SpellCast` events: **the same 10 spells with identical cast
  counts on both**). The other 15 spells are covered only by the field-by-field check above, the
  golden suite and the equivalence tests, not by the corpus digest.
- **Gates** (Node v24.19.0, `npm ci` run first, `vitest 5.0.1`): `npx tsc -b`, `npm run lint`,
  `npm run format:check`, `npm run build` clean; `npm run test`: 786 passed. `src/engine/__corpus__`
  unchanged; no `__golden__/*.test.ts` changed; golden `expected*` / `SEED` / `TURN_STEPS` exports
  deep-equal to `main`'s (re-run on the final tree).
- **Stale comments (review item 4).** `git grep -n "appliesStatus\|applyCastPayload\|resolveSpellOffStat\|dealDamageWithOffStat\|applyStatusIfAlive" -- src`
  now returns only history-marked lines: the `executeSpellEffects` and `dead-target-pins` comments
  ("pre-4.1-D"), the oracle's header and its explicitly labelled `LegacySpell` shape. Golden header
  edits are comments only (`heal-cast`, `b5-cast-fizzle`, `buff-cast`); no fixture value changed.

### Assumptions (inline-tagged; the brief's ASSUMPTIONS 35-37 are the design-owner decisions)

| #    | Assumption                                                                        | Status                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35   | A landed target's effect list is atomic: no dead-actor check between effects.     | Confirmed (plan review). Pinned.                                                                                                                                                                                                 |
| 36   | Spell magnitudes read the caster's live stats.                                    | Confirmed (plan review). Pinned. **Not** byte-neutral in general: it changes behaviour whenever the caster's stats change mid-action; 0 goldens, 0 tests and 0 corpus fights are affected.                                       |
| 37   | `scalingStat: 'none'` is dropped.                                                 | Confirmed (plan review).                                                                                                                                                                                                         |
| D-A4 | Spell effects take no cascade-depth or self-guard accounting (direct `executeResponse`). | Pinned by the P8 test.                                                                                                                                                                                                    |
| D-A7 | `apply-stat-modifier` from a spell keeps `sourceTraitId = spell.id`.              | As before.                                                                                                                                                                                                                       |
| D-A8 | `cast-target` with no cast context throws; it is the landed target, and the corpse rule is a verb rule (no verb but `revive` acts on a dead creature). | Tested.                                                                                                                                                                                                                          |
| D-A9 | Fixture and test spells are inline literals, no builder helper.                   | Goldens stay self-documenting.                                                                                                                                                                                                   |

### Spec notes (for the docs, before 4.1-E)

- **Redundant-but-load-bearing guards.** With the verb rule, the B5 `continue` and the AOE
  alive-skip are only observable through `self` effects. **Landed in the PR #74 review doc-sync** (CONVENTIONS "Spells carry responses"): the loop-level
  guards exist for the whole list, not just the `cast-target` effects.
- **`self` and B5 fizzle.** A `self` effect does **not** run when the landed target died in its own
  pre-hit hooks (B5: nothing from the list), but **does** run when the target died to the spell's own
  damage (atomic list): Life Siphon still heals its caster for a killing blow. That follows from the
  confirmed rules; **Landed in the PR #74 review doc-sync** (CONVENTIONS "Spells carry responses"), so Slice G's Life
  Siphon test expectation is explicit.
- Nothing else surfaced.

### Files changed

- **Engine:** `types.ts`, `effect-types.ts`, `resolution.ts`, `actions.ts`.
- **Data:** `data/spells/{core,overgrowth,glimmerdark,rotcap-hollow,index}.ts`.
- **Fixtures:** `__fixtures__/biomes.ts`; 14 golden fixtures (spell inputs only): `action-observed`,
  `aoe-cast`, `b1-granted-cast-default`, `b1-support-heals-own-side`,
  `b2-confused-granted-cast-redirects`, `b2-provoke-redirects-echo`, `b2-silenced-refuses-granted-cast`,
  `b2-skipped-turn-refuses-granted-cast`, `b5-cast-fizzle`, `buff-cast`, `castable-draw`, `heal-cast`,
  `on-action-hooks`, `scoped-suppression`.
- **Tests re-expressed:** `actions`, `actor-death`, `combat` (the `'none'` test removed),
  `confusion`, `dead-target-pins` (comment), `interpreter`, `resolution`, `splashing`,
  `support-spells` in `src/engine`; `data/spells/index.test.ts` (dedup key over the primary
  effect); the three `data/species/*.test.ts` (status spells read off `effects`).
- **New:** `src/engine/spell-effects.test.ts` (46 tests).

## 4.1-D2 -- The corpus covers all real content (test-only)

Golden policy: **byte-identical**, with the stated exception that the corpus digest gains appended
entries. No engine, data, golden or script file changed.

### What was built

- **`__corpus__/corpus.ts`**
  - `CorpusFight` gains an optional `playerEffects`.
  - `createCorpusCombat(fight)` is the one place a corpus fight becomes a `CombatState`; the digest
    and the coverage test both call it, so they cannot drift (brief A1).
  - **Part C** is appended after Part B (22 fights, combat seeds 2000+ and 2100+; Parts A and B
    untouched). It is 15 spell fights plus 7 perk fights.
- **Spell fights (15).**
  - One per spell Parts A and B never cast, with the spell in `gemSlot 0` of a same-affinity caster
    under `always-cast`.
  - Casters: Brute starter (violence), Shieldbarer starter (endurance), Lullpollen Dozer
    (instinct), Pollinator Beneficiary (wit). None carries an innate spell.
  - Opponent: `WALL_ENEMY`, three Shieldbarers (Provoke, Defend, Defend) that neither attack nor
    control. The caster always gets its turn, and casts again every round, so coverage rides on no
    random draw. Blinding Flare's fight is also the Vulnerability fight.
- **Perk fights (7), every perk of the spec at max level.**
  - `sorcerer`, `brute`, `shieldbarer`: the per-spec starts.
  - `brute-weakened`: Weaken needs a Weakened creature that then hits, or its magnitude is
    invisible to the digest. Found by mutation: with only `brute` (a wall that never attacks),
    changing Weaken's magnitude did not change the digest.
  - `shieldbarer-defenders`: Bulwark counts the bearer's own Defends and the bearer must be hit,
    which a Provoker prevents.
  - `shieldbarer-confusion`: Lucidity only matters when a Confused creature takes harmful actions
    (the 50% redirect roll).
  - `shieldbarer-doomed`: Last Stand is a 50% roll per lethal hit.
- **`corpus-coverage.test.ts` (5 tests, all lists read from the registries).**
  - Every spell is cast with its effects landing (the window from the cast to the next cast or
    turn end holds each declared effect's consequence event; a heal must heal, so amount > 0). Each effect's event must come from the caster
    (`sourceId`), `apply-status` included (PR #77 review).
  - Every status is applied, minus the exemption list.
  - Every damage-modifier status is exercised (its bearer deals or takes damage while it holds).
  - Every perk with effects at max level matters: re-running with only that perk removed changes
    the event log, minus the exemption list.
  - Every corpus creature carries only spells of its own affinity (equip-gating), checked on the
    input creatures of every fight in Parts A, B and C (innate spells are added at fight setup, so
    they are not in the input). Added at the PR #77 review: it failed on fight 515, which had
    equipped Root Grasp (Endurance) on Pollinator Beneficiary (Wit); the fight now gives that
    creature Vine Snare (Wit).
- **`corpus-digest.test.ts`:** calls `createCorpusCombat` (behaviour-neutral).

### Exemptions (each with its reason in the test; an exempt item that is covered fails)

- Status **`stun`**: applied only by the trait `reeling`, which no shipped creature carries.
- Perk **`clear-mind`**: immunity to `silenced`, not authored until 4.1-F.
- Perk **`aggressive`**: immunity to `pacified`, not authored until 4.1-F. **Not in the brief**
  (it expected only `clear-mind`): the brief's own rule sends it here, since nothing it protects
  against exists yet. 4.1-F must drop both perk entries.

### Findings

- **Perk effect ids are positional** (`perk-7`): removing one perk renumbers every later one, so a
  naive "log changed" comparison called every perk after the removed one mattering. The test
  anonymises `perk-N` ids in `TriggerFired`. Caught when `aggressive` (inert) read as mattering.
- **A seed sweep caught fragility.** The sweep runs the whole coverage test with every Part C
  combat seed shifted by k x 7919 (spell fights `2000 + index`, perk fights `2100 + index`; the
  generated Parts A and B untouched), through a temporary seed offset in `corpus.ts` that was
  removed before the digest was regenerated. The first Part C design failed 6 of 40 offsets (Last
  Stand, Lucidity on too few rolls) and the next 3 of 100 (Weaken not exercised). The PR #77
  review found 4 of 200 failures on Lucidity alone (the Puppet String casters died early at some
  seeds); the final design passes **200 of 200** (k = 0..199).
- A generated-enemy opponent for the spell fights failed: Blinding Flare's caster was put to
  Sleep before it acted. That is why spells fight `WALL_ENEMY`.

### Chance-based coverage (no lucky seeds)

- **Weaken (Concussive Blows, 25% per attack):** the earlier "332 + 138 = 470" counted attack
  *hits* (Brute's extra instance, Flurry and Splashing multiply them); the perk rolls once per
  attack. `AttackDeclared` by the party: 140 in `brute` (29 Weakens) and 46 in `brute-weakened`
  (10 Weakens), **186 rolls** in total, so the chance of no Weaken is 0.75^186 (about 10^-23).
- **Last Stand (50%):** 19 lethal-hit rolls across the shieldbarer fights (9 saves) at the
  committed seeds, so the chance of no save is about 0.5^19.
- **Lucidity:** it is a status-immunity to Confusion. Confusion still lands on an immune creature;
  the immunity only skips the 50% redirect when the bearer acts, so Lucidity matters only if a
  bearer takes harmful actions while Confused. In `shieldbarer-confusion` the two Puppet String
  casters used to die after one or two casts at some seeds, so the enemy is now level 40 and the
  casters outlive the party's swings (the fight runs to the round cap). Measured over 200 seed
  offsets (k x 7919, k = 0..199) across the four Shieldbarer fights: harmful actions by a Confused
  Lucidity bearer, **worst case 101 in total** (99 in `shieldbarer-confusion` alone, 2 in
  `shieldbarer`; the other two contribute none), never zero at any offset. The chance of no
  redirect to remove is then at worst 0.5^101.

### Verification

- Tests 786 -> 791 (+5, all in the one new file); no other file's count changed. Digest test
  2.99 s -> 2.73 s.
- Goldens: 88 fixtures, 269 `expected*` / `SEED` / `TURN_STEPS` exports imported from `main` and
  the branch and deep-equal.
- Digest regenerated once through `corpus:update`: 500 -> 522 entries, the first 500
  byte-identical to `main`'s (entry-by-entry script); 22 appended. After the PR #77 fixes only
  two Part C entries changed from the previous push: 515 (`sorcerer`, loadout fixed) and 519
  (`shieldbarer-confusion`, enemy level 40); regenerated once, at the end.
- Proof it sees what it missed (data change alone; the pre-slice digest passes, the new one fails):
  `ember-lance` spellPower (fight 500), Weaken duration (516, 517), Weaken magnitude (517),
  Vulnerability magnitude (504).
- The coverage test fails for: a throwaway spell, a throwaway status, a throwaway perk that matters
  nowhere, both exemption lists emptied, a covered item on an exemption list, and Weaken never
  exercised.
- Gates: test / lint / format:check / build / `tsc -b`.

### Spec notes (for the docs, before 4.1-E)

- `aggressive` joins `clear-mind` as a perk exemption until 4.1-F authors `pacified`.
- Perk effect ids are positional; anything comparing logs across different perk sets must
  anonymise them. **Landed** in CONVENTIONS "Corpus digest" (with the seed-sweep rule and the
  equip-gate check).

### Files changed

- `src/engine/__corpus__/corpus.ts`, `src/engine/__corpus__/corpus-digest.fixture.ts` (22 appended
  entries), `src/engine/corpus-digest.test.ts`.
- **New:** `src/engine/corpus-coverage.test.ts` (5 tests).

## 4.1-E -- `perform-action` (bonus-cast and echo-cast become data)

Golden policy: **deliberate, listed** (8 existing goldens re-derived by hand, 3 new). Branch
`phase-4.1-slice-e`, on top of the doc-sync commit (`90d70cb`, which holds every living-doc change
for this slice).

### What was built

- **The response.** `perform-action { actor: 'self' | 'triggering-source', intent }` joins
  `EffectResponse` (nine verbs). `executeResponse` does not run anything: it pushes a
  `QueuedGrant { sourceId, actorId, intent, effectId, depth }` onto the new `ResolutionContext.grants`
  list. `depth` is `cascade.depth` at that moment (the granting trigger's own, +1 included).
  `actor: 'triggering-source'` is the hook's source **including the bearer** (the PR #64 rule is
  for response targets only), so Overtone still echoes its own casts. No actor-state check at
  enqueue: only the actor's state when the grant runs decides it.
- **The drain.** `drainGrantedActions(ctx, state, { skippedTurnOf? })` in `actions.ts`: FIFO over
  `ctx.grants` (index loop, so a granted action's own grants append to the back); each entry runs
  through `ctx.runAction` with `cascade.depth` set to the entry's depth (restored afterwards) and
  `ActionGranted { sourceId, actorId, effectId }` passed as the `announce` event, so it is pushed
  only once the grant is accepted (after legality and the gem/target draws), right before the
  action's first event. Refusals emit nothing: the skipped-turn gate (here), then `runAction`'s
  dead-actor check, `checkLegality` (locks) and "does not resolve" (no gem, no target).
- **Where each scope drains** (`combat.ts`; each `ResolutionContext` is drained once, by whoever
  created it, at its scope's end): fight-start hooks (before `RoundStarted`), round-end hooks
  (right after the hook pass, before the countdown), turn-start hooks (**after the turn-start
  cleanup**, before decide + action), the chosen action (right after it, before the turn-end
  hooks), the turn-end hooks (the skeleton's granted-actions step). The two turn-level drains that
  can follow a skipped turn pass `skippedTurnOf: suppressed ? actor.id : undefined`; the fact
  lives in `resolveTurn`'s existing turn-start `suppressed` local, never in `CombatState`.
- **Depth and the guard.** The granted action runs at the granting trigger's depth, so an echo
  chain still truncates at `MAX_TRIGGER_CASCADE_DEPTH`. The re-entry guard needs no exemption any
  more: `perform-action` only enqueues, the guard is released when `executeResponse` returns, and
  the drain runs after the stack has unwound. `stacks: false` dedup is unchanged (it claims before
  the chance roll, in `fireHook`).
- **RNG draw order** (documented in `effect-types.ts`, `actions.ts` and every affected golden): the
  chance roll at trigger time; when the grant runs, the gem draw, the target draw, then any
  Confusion / Tunnel Vision / Provoke draw.
- **Content.** Arcane Surge = `triggered { on-turn-end, chancePercent 50, perform-action(self, cast
  'random') }` + the unchanged `innate-spell`. Resonant Overtone = `triggered { on-action-observed,
  filter ally/cast, chancePercent 10, stacks false, perform-action(triggering-source, cast
  'random', targeting 'random') }`. The Sorcerer perk "Echo" (`action-instance`) is untouched.
- **Load-time rejections.** A spell's effect list rejects `perform-action` (the spell validator's
  default branch; now tested). `consume-stacks`' wrapped effect rejects it (inside
  `validateNoRandomSelectorInResponseTargets` and the status counterpart, so it runs at the same
  three sites: traits, perks, statuses). A `perform-action` response carries no response target, so
  the `'random'` selector check skips it; its `intent.targeting` may be `'random'`.
- **Guard lint.** `hasRealGuard` (`chancePercent < 100`, or a condition other than `always`),
  `performActionTriggers`, `statusPerformActionTriggers`, `findUnguardedPerformActions`,
  `findUnguardedStatusPerformActions` in `effect-types.ts`. `src/data/perform-action.data.test.ts`
  reads the trait registry, every perk at every level and the status registry; it also asserts the
  lint is not vacuous (it finds exactly Arcane Surge and Resonant Overtone).
- **Deleted.** `BonusCastDef`, `BonusCastEffect`, `activeBonusCast`, `maybeFireBonusCast`,
  `TriggeredDef.echoCast`, `ResolvedHookEffect.echoCast`, `ECHO_CAST_INTENT`, the `echoCast` branch
  of `fireHook`, `EchoCastGrantedEvent`. `ActionGrantedEvent` replaces the last. `CombatDemo.tsx`
  gets the one-line event rename.
- `ResolutionContext.runAction` stays (the scopes and the drain call it); `resolution.ts` still
  imports nothing from `actions.ts` or `combat.ts`.

### Golden impact (expected exports imported from `HEAD` and from the branch, then diffed)

Only these files changed under `__golden__/`; every other golden file is byte-identical (git).
Per changed fixture, the difference of `expectedEvents` old vs new, by import:

| Golden | Change |
|---|---|
| `golden-b1-granted-cast-default` | + `TriggerFired` (on-turn-end), + `ActionGranted`; order of the rest unchanged |
| `golden-b2-confused-granted-cast-redirects` | same two events added |
| `golden-castable-draw` | same two events added |
| `golden-sorcerer-starter` | same two events added |
| `golden-b2-silenced-refuses-granted-cast` | + `TriggerFired` only (the grant is refused at drain: nothing of its own) |
| `golden-b2-skipped-turn-refuses-granted-cast` | + one `TriggerFired` (the grant's trigger, declared first) before the Stun-removal `TriggerFired`; still proves both halves (the chance is draw #1, E1's pick is draw #2; then the gate refuses although Stun is gone) |
| `golden-b2-provoke-redirects-echo` | `EchoCastGranted` -> `ActionGranted` (with `effectId`); the original hit now lands **before** the echo (the echo follows the whole payload); draws #1-#5 unchanged |
| `golden-resonant-overtone` | same: `EchoCastGranted` -> `ActionGranted`, original hit first; draws #1-#4 unchanged |
| `golden-b2-provoke-redirects-echo.test.ts` | the one assertion counting `EchoCastGranted` now counts `ActionGranted` |

All eight were re-derived by hand (comments updated) before the engine was run against them; each
passed on the first run, so no log was regenerated.

New goldens (hand-derived; arithmetic and draws in each fixture header):
- `golden-e-echo-chain-truncated`: real cap, a 100%-chance fixture Overtone on a single bearer
  (every hop through the same instance). The per-hop template is written by hand; a loop only
  repeats it. Checkpoints (hops 1, 2, 499, 500 and the truncation) are asserted separately by
  index; 2007 events, 500 grants, 501 casts, one `CascadeTruncated { depth: 501 }`.
- `golden-e-grant-during-granted-action`: FIFO. Queue [Defend, Provoke]; running Defend raises a
  Wait that goes to the back: Defended, Provoked, Waited (LIFO would give Defended, Waited,
  Provoked).
- `golden-e-grant-actor-dies-first`: a retaliation kills the echo's actor during the original cast;
  the queued echo then emits nothing (no `ActionGranted`, no `SpellCast`).

### New and changed unit tests

- `perform-action.test.ts` (18): the scopes' drain positions (incl. a Defend granted at turn start
  surviving that turn's cleanup; a turn-start grant refused on a skipped turn; the chosen action's
  grants before a turn-end hook's event), `actor: 'triggering-source'` including the bearer, bearer
  death not cancelling, a dead actor refused, `skippedTurnOf`, the spell and `consume-stacks`
  rejections (traits/perks and statuses), the `'random'` intent target allowed, `hasRealGuard` and
  the two `findUnguarded...` helpers.
- `perform-action.data.test.ts` (4): the registries lint (traits, perks at every level, statuses)
  and non-vacuity.
- Migrated: `combat.test.ts` (bonus-cast describe -> an on-turn-end `perform-action` fixture),
  `actions.test.ts` (the mid-turn lock test and the echo gating tests; the echo test drains the
  context), `resolution.test.ts` (the echo describe: `fireHook` now only queues, the white-box
  depth test starts at 498 and drains: still 2 hops then `CascadeTruncated`), `starters.test.ts`
  (Arcane Surge's shape). `effects.test.ts`: the `activeBonusCast` describe (2 tests) is gone with
  the function.

### Corpus-digest attribution (regenerated once, `npm run corpus:update`)

- 522 entries before and after. **128 fights changed; all 128 contain a creature carrying Arcane
  Surge or Resonant Overtone.** Fights by what they carry:

  | Carries | Fights | Changed | Unchanged |
  |---|---|---|---|
  | neither | 298 | 0 | 298 |
  | Overtone only | 20 | 0 | 20 |
  | Arcane Surge only | 98 | 64 | 34 |
  | both | 106 | 64 | 42 |

  Total: 128 changed and 394 unchanged; 522 fights in all. Overtone never fires in the 20
  Overtone-only fights, so none changed. None of the 96 unchanged fights that carry Surge or
  Overtone shows a `TriggerFired` from either.
- Changed indices: 300-324, 330, 332-338, 340-349, 365-368, 370-374, 379, 390, 391, 394, 396-399,
  411, 414, 416-418, 421-424, 427, 433, 434, 438-448, 450, 452-474, 481-484, 486-497, 499, 515,
  516, 518, 521 (none in Part A, which is indices 0-299). Fight 433 (the echo's retaliation killing
  the Sorcerer mid-cast) is among them.
- `ActionGranted` events across the corpus: **Arcane Surge 2530** (in 127 fights), **Resonant
  Overtone 339** (in 46 fights); both above 0. `corpus-coverage.test.ts` (5 tests) is green.

### Verification

- Tests **791 -> 818 (+27)**, reconciled per file against `main`: `perform-action.test.ts` +18,
  `perform-action.data.test.ts` +4, `golden-e-echo-chain-truncated` +3,
  `golden-e-grant-actor-dies-first` +2, `golden-e-grant-during-granted-action` +2,
  `effects.test.ts` -2 (54 -> 52). No other file's count changed.
- Mutations, each shown failing the named tests (all reverted; the tree was byte-identical after):
  nested instead of queued (15 failing, incl. the echo goldens and unit tests); queued depth reset
  to 0 (truncation golden + the white-box depth test); skipped-turn gate dropped (b2-skipped golden
  + 2 unit tests); dead-actor check dropped (actor-dies golden + unit test); guard lint accepting
  everything (the `hasRealGuard` / `findUnguarded...` tests); re-entry guard held through the grant
  (truncation golden + white-box test); LIFO drain (FIFO golden); the action's grants drained in
  the turn-end step (the "before the turn-end hooks" test); `skippedTurnOf` only on the turn-end
  drain (the turn-start skip test); turn-start drain before the cleanup (the Defend-survives test);
  spell validator and `consume-stacks` validator each removed (their tests); guard accepting
  `chancePercent: 100` and `always` (their tests); bearer death cancelling the grant (the
  ASSUMPTION 6 test); `triggering-source` resolving to nothing for the bearer (the unit test and
  the truncation golden); the fight-start, round-end and turn-end drains each removed (their tests;
  the turn-end one also fails 4 re-derived goldens and the combat tests).
- Gates: test / lint / format:check / build / `tsc -b`, all green.

### Spec notes (for the docs, before 4.1-F)

- The brief's vocabulary-table row for `ResolutionContext` (no `grants`), its E line "inherits
  depth + 1" and its "Deliberate golden changes (4.1-E)" bullet about a lowered depth cap all
  predated the plan review. All three are updated in the docs commit on this branch.
- **4.1-F will meet this:** once DoT ticks move to `on-turn-end`, Arcane Surge's roll (an innate
  effect, so earlier in effect order than statuses) happens before a tick; a Seer then killed by
  that tick still rolled and shows `TriggerFired`, and its queued cast is refused at drain (dead
  actor). Not an E change: no shipped content used `on-turn-end` before this slice.
- The grant queue means `TriggerFired` and `ActionGranted` are no longer adjacent in the log; any
  UI/log reader that paired them by position must pair by `effectId` and `sourceId` instead.

### Files changed

- Engine: `actions.ts` (`createResolutionContext`, `drainGrantedActions`), `combat.ts` (drains;
  `maybeFireBonusCast` deleted), `resolution.ts`, `resolution-types.ts` (`QueuedGrant`, `grants`),
  `effect-types.ts`, `effects.ts`, `types.ts`.
- Data: `traits/starters.ts`, `traits/glimmerdark.ts`. UI: `CombatDemo.tsx` (event rename).
- Goldens: the 8 fixtures and 1 test above; 3 new golden pairs. Corpus: `corpus-digest.fixture.ts`
  (128 entries changed).
- Tests: `perform-action.test.ts`, `perform-action.data.test.ts` (new); `actions.test.ts`,
  `combat.test.ts`, `effects.test.ts`, `resolution.test.ts`, `species/starters.test.ts`.
- Renamed (`git mv`, fixture + test pairs; "bonus cast" names a mechanism this slice deleted):
  `golden-b1-bonus-cast-default` -> `golden-b1-granted-cast-default`,
  `golden-b2-confused-bonus-cast-redirects` -> `golden-b2-confused-granted-cast-redirects`,
  `golden-b2-silenced-refuses-bonus-cast` -> `golden-b2-silenced-refuses-granted-cast`,
  `golden-b2-skipped-turn-refuses-bonus-cast` -> `golden-b2-skipped-turn-refuses-granted-cast`. The
  fixture trait ids and constants went the same way (`bonus-caster-fixture` -> `granted-caster-fixture`,
  `BONUS_CASTER_*` -> `GRANTED_CASTER_*`); only the `effectId` strings in five goldens' `expectedEvents`
  changed (the four above and `golden-castable-draw`), every other golden export is identical. The
  earlier sections' references to the old file names (4.1-C2b, 4.1-C2c and the 4.1-D golden list)
  were updated to the new names, a one-off approved exception; their prose is as built.
- Nothing needs deleting.

## 4.1-F1 -- Statuses as effect containers (A3), timing unchanged

Golden policy: **deliberate, narrow** (the turn-skip shape and the two fixture locks only). Branch
`phase-4.1-slice-f`, on top of the plan-check doc-sync commit (`5c84cba`, which holds every living-doc
change for this slice: CONVENTIONS "Action locks", "The effect taxonomy", "Immunity", "The bright
line"; the brief's A3 plan-review block; ASSUMPTIONS 44-48). Timing is untouched: DoT/HoT ticks stay
on the round-end sweep, durations still count rounds, the Web roll stays at turn start, no in-turn
win checks (all F2). No Silenced/Pacified content, no perk-exemption change (F3).

### What was built

- **One status shape.** `StatusDef { statusId, cap, polarity, defaultDuration, effects: EffectDef[] }`.
  The four old categories (`condition-status`, `damage-modifier`, `turn-order-status`,
  `friendly-fire-status`) and their `*Def` / `*Effect` types, `StatusTrigger` and every bespoke
  reader are deleted. A status instance is one `ActiveEffect`, `category: 'status'`:
  `{ ...StatusDef, instanceId, sourceTraitId: statusId, remainingDuration, stacks }`, appended to
  `activeEffects` where the old instance was, so canonical effect order is unchanged.
- **Four new passive `EffectDef` categories** (carrier-agnostic: a trait or perk may carry one,
  ASSUMPTION 44): `action-lock { scope: 'all' | 'attack' | 'cast' }`, `turn-order { position,
  breakChancePercent? }`, `friendly-fire { chancePercent }`, and a trimmed `damage-modifier
  { direction, magnitude, magnitudeSource?, accumulation?, reductionCap? }` (ASSUMPTION 48: kept
  as its own category; `conditional-damage-bonus` and `taken-reduction` are untouched).
- **The one effect iterator** (`effects.ts` `flatEffects`). Trait/perk effects pass through; a status
  is flattened in place into its own `effects`, each tagged `statusId`, `statusStacks` and
  `sourceInstanceId`, with its own guard identity `${statusInstanceId}#effect#${index}` (PR #64 rule:
  Spore's tick killing its host still lets `on-death` spread, because the guard is per trigger).
  **Immunity is checked here, once**, and covers every effect of the status (ASSUMPTION 47, below).
  Every reader goes through it: `effectsForHook`, the dealt/taken modifier gatherers (taken order
  kept: damage-modifiers, then taken-reductions), armor-penetration, cross-stat, action-instance,
  cheat-death, provoke-immunity, splashing, annihilate, `conditional-damage-bonus`, `isActionLocked`,
  `firstAllLock`, `activeFriendlyFireStatus`, `turnOrderPosition`, the Web roll. `getEffectiveStat`
  and `resolveRemappedStat` read the raw list: the validator bans `stat-modifier` / `stat-remap`
  inside a status, so there is nothing to flatten. `hasStatus` / `consume-stacks` / `remove-status` /
  `applyStatus` / the sweep read the raw container (an immune bearer's status still exists).
- **Stacks as the default count.** A status-fired response's repetition count is its
  `magnitudeSource` if declared, else the status's `stacks` (undefined for a trait's own trigger, so
  traits are unchanged): flat and formula mode of `deal-damage` / `heal`, `apply-stat-modifier`'s
  per-unit rate (only above one stack, so a single stack keeps `factor` verbatim, not the
  float-lossy `1 + (factor - 1) * 1`), and the `damage-modifier` / `taken-reduction` count. No
  shipped status uses a formula-mode response, so this is new behaviour with one test per verb.
- **Locks and the skip.**
  - `checkLegality` reads locks through the iterator for every action source: an `'all'` lock makes
    **every** kind illegal (Attack, Cast, Defend, Provoke, Wait; ASSUMPTION 46), a scoped lock only
    its own. `isActionSuppressed` and `hasStatusImmunity` at that site are gone.
  - `resolveTurn` reads the first `'all'` lock **twice** (ASSUMPTION 45): right after the turn-start
    hook pass (feeds the turn-start drain's `skippedTurnOf`) and at the action slot, after the
    cleanup and the turn-start grants (a lock gained in the grants would otherwise reach the decide
    step, where every rule is illegal and the unchecked fallback Wait is refused: an empty bracket
    with no `TurnSkipped`). A turn is skipped if either read finds a lock and the actor is alive;
    the combined value feeds the turn-end drain. `TurnSkipped { creatureId, effectId }` is emitted in
    the action slot; `effectId` is the first lock's carrier id (the status id for a status).
  - `suppress-action` is deleted from `EffectResponse`, `executeResponse` and `fireHook`, which now
    return `{ state }` (no `suppressed`).
- **Validators.** `validateStatusDef` (called over every stock status at import) rejects, inside a
  status, `stat-modifier`, `stat-remap`, `status-immunity` and `innate-spell`, then runs the existing
  `'random'`-selector / `cast-target` / `consume-stacks` checks over `def.effects`.
  `validateNoBreakChanceOutsideStatus` rejects `turn-order.breakChancePercent` on a trait
  (`validateTrait`, new export of `data/traits`) or a perk (`validateSpecialization`).
  `statusPerformActionTriggers` / `findUnguardedStatusPerformActions` keep their names and read
  `def.effects`, so the 4.1-E guard lint covers every status trigger.
- **Web.** `turn-order { position: 'last', breakChancePercent: 10 }`; the roll is still at turn start,
  in the same bearer order, one draw per status-borne `turn-order` effect that has the field, drawing
  nothing when no Web is present (or the bearer is immune).
- **UI.** `CombatDemo.tsx` `describeEvent` gains the `TurnSkipped` case.

### The round-end sweep, and what F2 deletes

The sweep is only adapted: `snapshotStatuses` / `decrementAndExpireSnapshot` test `category ===
'status'` instead of four categories; `statusTriggerGate`, the snapshot, the refresh rule
(`reappliedThisSweep`) and the touched-set derived from `StatusApplied` events are unchanged.
**F2 deletes:** `snapshotStatuses`, `decrementAndExpireSnapshot`, `statusTriggerGate` and
`FireHookOptions.statusTriggerGate`, `reappliedThisSweep`, the status part of `resolveRoundEndSweep`,
the turn-start call site of `rollWebBreakFree` (it moves to turn-end cleanup), and the stock statuses'
`on-round-end` hook (their ticks move to `on-turn-end`).

### Immunity extension (ASSUMPTION 47), stated in full

Before F1, `fireHook` never checked immunity: it was consulted only for a lock
(`isActionSuppressed`) and for Confusion's roll. Now the iterator skips **every effect of every kind**
of an immune bearer's status: its locks, friendly-fire, **triggers (a DoT tick included)**,
damage-modifiers, and turn-order (so an immune bearer's Web neither moves it last nor rolls to break).
The status still exists, stacks, counts down and counts for `has-status`. Why this changes nothing
today: the only immunities in content are to Confusion (Lucidity), Silenced and Pacified (Clear Mind /
Aggressive), and Silenced / Pacified are not authored until F3, so the only live immunity case is
Confusion's single `friendly-fire` effect, which behaved exactly this way before (no roll, no draw).
Lucidity's corpus coverage stays green.

### Golden impact (expected exports imported from `HEAD` and from the branch, then diffed)

A throwaway harness in a pristine worktree of `5c84cba` imported every `*.fixture.ts` from both trees
and compared every `expected*`, `SEED` and `TURN_STEPS` export with `isDeepStrictEqual`: **91 fixtures,
86 byte-identical, 5 changed**, each only by the allowed change (the mapping below reproduces the old
expected log for the three skip goldens; the two fixture-lock goldens differ only by the removed
`TriggerFired`).

| Golden                                        | Change                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `golden-stun`                                 | the lock's on-turn-start `TriggerFired` -> `TurnSkipped { victim, 'stun' }`                                          |
| `golden-b6-provoke-stun-cleanup`              | same, in the action slot **after** `ActionStateEnded` (the old `TriggerFired` was before it)                         |
| `golden-b2-skipped-turn-refuses-granted-cast` | same                                                                                                                 |
| `golden-scoped-suppression`                   | fixture lock re-expressed as a trait-borne `action-lock cast`; the `TriggerFired` removed                            |
| `golden-b2-silenced-refuses-granted-cast`     | same                                                                                                                 |

**`golden-sleep-wake` and `golden-lullpollen-dozer` are byte-identical** (as the plan review expected):
neither expected log has a skipped turn (the sleeper wakes before its turn; Lullpollen runs one turn).
Only their fixture _inputs_ changed shape. Every other fixture changed only its status literals
(inputs), never an expected export.

### Corpus-digest attribution (regenerated once, `npm run corpus:update`)

522 fights: **506 byte-identical, 16 changed** (16 rows in the fixture). Every changed fight contains
a `TurnSkipped` (382 in total). **Mechanical mapping:** each `TurnSkipped` replaced by one
`TriggerFired { sourceId, hook: 'on-turn-start', effectId }` per `'all'`-lock status the creature holds
(tracked from `StatusApplied` / `StatusExpired` / `Revived`), in application order, ahead of an
immediately preceding same-creature `ActionStateEnded`: **16 of 16 reproduce the pre-F1 event log
exactly** (so a creature holding two locks gets two old `TriggerFired` events back).

### New and changed unit tests

- `status-containers.test.ts` (new, 35): the skip (`'all'` lock skips; names the first of two locks
  in both orders; a lock gained in the turn-start hooks skips that turn; a lock gained in the
  turn-start grants still skips, via the action-slot read; the turn-end drain refuses the grant of a
  creature skipped by that read even after the lock is removed); locks at every site (script rule,
  implicit fallback with an `'attack'` lock, granted cast, `'all'` refusing all five kinds, a granted
  Defend refused under an `'all'` lock gained mid-action, with a control); immunity per reader (lock,
  friendly-fire single and AOE with zero draws, a DoT tick, dealt and taken modifiers, turn-order,
  the Web roll's draw count) each with a non-immune control and `has-status` true; stacks as the
  default count (formula `deal-damage`, flat `deal-damage`, formula `heal`, `apply-stat-modifier`,
  `damage-modifier`); every effect kind a status may carry read through the iterator (armor-penetration,
  cross-stat, action-instance, provoke-immunity, splashing, annihilate, cheat-death,
  conditional-damage-bonus, taken-reduction with stacks); the validator (one test per rejection,
  plus the accept case and the trait/perk breakChance wiring).
- `statuses.test.ts` +1 (the validator over every stock status; its shape assertions were rewritten to
  the container shape). `resolution.test.ts` -2: the `suppress-action scope` describe (two tests
  asserting the deleted `suppressed` flag) is replaced by the `status-containers` lock tests; the
  `suppress-action (on-turn-start)` test now asserts `TurnSkipped` and no `TriggerFired`.
- **Assertion edits to tests outside the golden list, each forced by the allowed change:**
  `perform-action.test.ts`'s turn-start skip test counted `on-turn-start` `TriggerFired` as 2 (the
  grant's plus the lock's); it is now 1 plus one `TurnSkipped`. Nothing else changed its assertions.
- **Shape-only edits** (inline old-shape status literals; assertions untouched): `actions`, `combat`,
  `conditions`, `confusion`, `effective-stats`, `effects`, `interpreter`, `perform-action`,
  `resolution`, `spell-effects`, `support-spells`, `targeting`, `turn-order` tests;
  `corpus-coverage.test.ts` (two reads of the status category -> `effects.find`); fixtures
  `golden-b4-cleanse-then-tick`, `golden-b4-remove-then-reapply`, `golden-b6-provoke-stun-cleanup`,
  `golden-consume-stacks`, `golden-defend-count`, `golden-defend-count-additive-cap`,
  `golden-sleep-wake`, `golden-turn-order-status`, `golden-web-break-free`.

### Verification

- Tests **818 -> 852 (+34)**, reconciled per file against the pristine tree: `status-containers.test.ts`
  +35 (new), `statuses.test.ts` +1 (5 -> 6), `resolution.test.ts` -2 (81 -> 79). No other file's count
  changed (the script diffs all 135 files).
- **Mutations** (38 harness runs, full suite each, every file restored from an in-memory copy; the
  tree was re-verified green afterwards). **36 killed in the first run**, each by a named test:
  - lock read removed from the skip (action-slot read; corpus digest, `perform-action.test.ts`
    turn-start skip test); lock read removed from `checkLegality` (15 failing, `actions.test.ts`);
    `'all'` not covering Defend/Provoke/Wait (the two `status-containers` tests);
  - skip gate not fed to the turn-end drain (`status-containers` + `golden-b2-skipped-turn-...`);
    action-slot read removed (two `status-containers` tests); turn-end drain fed read 1 only
    (the `status-containers` turn-end test);
  - immunity removed from the iterator (13 failing); stacks not the default count: `effectsForHook`
    (7), `deal-damage` (10), `heal`, `apply-stat-modifier`, `damage-modifier` (each its own test);
  - each of the four validator rejections, the breakChance check (function, trait call, perk call),
    the status `'random'`-selector check (one test each);
  - each reader bypassing the iterator, one at a time (`effectsForHook`, both modifier gatherers,
    armor-penetration, cross-stat, action-instance, provoke-immunity, splashing, annihilate,
    cheat-death, conditional-damage-bonus, `isActionLocked`, `firstAllLock`,
    `activeFriendlyFireStatus`, `turnOrderPosition`, the Web roll): each fails its table row.
  - **2 survived the first run, and are killed by the review-fix test** (the 38 runs above: 36 killed,
    2 survived; with the fix, **38 of 38 killed**): removing the first (after-hooks) lock read, and not
    feeding `skippedTurnOf` to the **turn-start** drain. Both were first judged equivalent, on the
    argument that the lock itself refuses the grant. That was wrong: the turn-start drain can hold
    another creature's grant ahead of the actor's own, and that grant can remove the lock before the
    actor's grant runs. The test "an earlier grant in the turn-start drain can remove the lock" pins
    it with a hand-derived log (Y's AOE cast removes X's stun mid-drain; X's granted attack must still
    be refused by the gate, and the turn still skipped by the first read). With the first read
    removed X's attack runs and X then takes a normal turn (`Waited`), with no `TurnSkipped`; with
    the gate removed X's attack runs inside a skipped turn. Each mutation fails exactly that test.
- Load-time wiring: the validators run at import (`data/statuses.ts`, `data/traits/index.ts`), as before;
  tests call the validator functions (`validateStatusDef`, `validateTrait`, `validateSpecialization`).
  No test pins the import-time loop call itself (same as the earlier validators).
- Gates: test / lint / format:check / build / `tsc -b`, all green. Toolchain: Node 24.19.0, Vitest
  5.0.3, TypeScript 6.0.3.

### Spec notes (for the docs, before F2)

- **The first lock read and the turn-start gate are load-bearing**: an earlier grant in the same
  turn-start drain can remove the lock before the actor's own grant runs (the review-fix test). The
  turn-end gate is load-bearing for the same reason (turn-end hooks can remove the lock).
- `TurnSkipped.effectId` names the first `'all'` lock at the action slot or, if none is left
  there, the one the first read found.
- A trait-borne `'all'` lock names itself by the trait id (`perk-N` / `enemy-effect-N` for side
  effects) in `TurnSkipped.effectId`; no content does this yet.
- `turn-order` and the Web roll now honour immunity (see above); `TurnSkipped` is emitted for a skip
  detected at either read, so a creature stunned in its own turn-start grants shows it.
- A creature holding two `'all'` locks emitted two `TriggerFired` events before and one `TurnSkipped`
  now; the corpus mapping proves the logs otherwise match.
- The brief's golden list named `golden-sleep-wake` and `golden-lullpollen-dozer` as skip goldens;
  neither has a skipped turn in its expected log.
- One golden file name still says `turn-order-status` (`golden-turn-order-status`); cosmetic, left as is.
- `golden-b6-provoke-stun-cleanup`: the skip event follows `ActionStateEnded` (the action slot, per the
  skeleton), where the old `TriggerFired` preceded it.

### Files changed

- Engine: `effect-types.ts`, `effects.ts` (iterator, lock readers), `resolution.ts`, `actions.ts`,
  `combat.ts`, `turn-order.ts`, `effective-stats.ts`, `types.ts` (`TurnSkipped`),
  `scripting-types.ts` (comment).
- Data: `statuses.ts` (container shape), `traits/index.ts` (`validateTrait`), `specializations.ts`,
  comments in `spells/glimmerdark.ts`, `traits/core.ts`, `traits/glimmerdark.ts`. UI: `CombatDemo.tsx`.
- Goldens: the 5 expected-changing ones above (+ `golden-stun.test.ts` title), the shape-only fixtures
  listed above, `corpus-digest.fixture.ts` (16 rows). Tests: `status-containers.test.ts` (new),
  `statuses.test.ts`, `resolution.test.ts`, and the shape-only edits above.
- Nothing needs deleting from the repo. The scratch worktree of `5c84cba` (with a `node_modules`
  junction) under the session scratchpad can be removed with `git worktree remove --force` when
  convenient (remove the junction first so `node_modules` is not followed).

## 4.1-F2 -- Status timing in bearer turns, the Web roll in turn-end cleanup, in-turn win checks

Golden policy: **deliberate, listed** (timing). Branch `phase-4.1-slice-f2`, on top of the plan-review
doc-sync commit (`c56ebbc`: CONVENTIONS "Turn structure", "Resolution & timing", "Status lifecycle",
Web's roll, "Death-reset"; the brief's D6 "Decided at the 4.1-F2 plan review" block; ASSUMPTIONS 15, 16,
18, 19, 49-55). No Silenced/Pacified, no perk-exemption change, no spell dedup key (F3); no content
number changed (H). Durations keep their authored values and now count the bearer's own turns.

### What was built

- **The born-this-turn clock (ASSUMPTIONS 18, 49).** `CombatState.turnClock` (starts 0, bumped **once per
  dequeued turn, at the action slot**, whether the actor is alive, dead or skipped) and
  `StatusEffect.appliedAt` (`applyStatus` stamps it on a fresh application **and on a refresh**; a refresh
  keeps the instance and its id). Born is `appliedAt === turnClock`. One window for every status-time
  read: a status applied or refreshed **since the current turn's action slot** does not tick, count down
  or (a Web) get rolled in that turn; applied earlier in the turn (turn-start hooks, cleanup, grants) it
  does all three. Plain data, in no event. A status applied between turns (fight start, round end) carries
  the previous turn's value and is never born in the next one.
- **Durations count the bearer's turns.** Turn-end cleanup (`countDownStatuses`): the **living** actor's
  statuses count down by one in canonical (`activeEffects`) order and expire at 0 (`StatusExpired`),
  skipping a born one. A corpse's statuses are inert (ASSUMPTION 51): no countdown, no `StatusExpired`
  (today's code never wiped statuses on death, only on revive; no wipe-on-death was built).
- **Ticks are `on-turn-end` triggers.** POISON, BURN, REGEN and SPORE's tick moved from `on-round-end` to
  `on-turn-end` (numbers unchanged). The born gate reaches `fireHook` through
  `FireHookOptions.skipStatusTrigger(bearer, statusInstanceId)`, passed only by `resolveTurn`'s
  `on-turn-end` call (ASSUMPTION 52); `fireHook` has no hook-specific rule.
- **The Web roll moved to turn-end cleanup (ASSUMPTION 15)**, after the actor's countdown (a Web that
  expires by its timer is never rolled), on **every dequeued turn's cleanup** (a dead actor's empty
  bracket, a turn whose actor died mid-turn), never after a mid-turn wipe, over living bearers in side ->
  slot -> id order, only for a Web that is present, not immune (the iterator yields no effect) and not
  born this turn.
- **A mid-turn wipe ends the turn (ASSUMPTION 19).** `FireHookOptions.stopWhen` (checked **between
  top-level candidates**, never inside a cascade: nested `fireHook` calls get no options) and
  `DrainGrantsOptions.stopWhen` (checked before each grant) are the stop predicate, passed at every in-fight
  pass: the turn-start, turn-end and round-end hook passes and the turn-start, action, turn-end and
  round-end drains. **Exempt: the fight-start pass and drain** (no check there today either; nothing in
  the content can wipe a side at fight start, and a check would change a path F2 has no reason to touch).
  `resolveTurn` then closes the turn at four points: after the turn-start hooks, after the turn-start
  grants, after the action and its grants, after the turn-end drain. A wipe skips the rest of the turn
  (later firings, grants, cleanup, the Web roll), **still emits `TurnEnded`, then `FightEnded`**. There is
  no check after cleanup (it cannot kill). Round end keeps `on-round-end` trait triggers, the round-level
  drain and its win check.
- **Deleted:** `snapshotStatuses`, `decrementAndExpireSnapshot` (+ `StatusSnapshotEntry`),
  `statusTriggerGate` and `FireHookOptions.statusTriggerGate`, `reappliedThisSweep`, the status part of
  `resolveRoundEndSweep` (it is now `resolveRoundEnd`: the `on-round-end` hook pass and the round drain),
  the turn-start call of `rollWebBreakFree`, the stock statuses' `on-round-end` hooks. A leftover grep over
  `src/` for `sweep`, `statusTriggerGate` and turn-start Web rolls finds only comments that describe the old design
  in the past tense. The pre-merge comment pass reworded the rest: `fireHook`'s doc comment (`resolution.ts`),
  `perform-action.test.ts`, the Web test title and comment in `combat.test.ts`, the immune-Web title in
  `status-containers.test.ts`, and the comments in `golden-spider-broodwarden`, `golden-broodmother`,
  `golden-round-end-interaction` (+ its test title), `golden-heal-scaling-count` and `golden-heal-scaling-stat`.
- **The status validator.** `validateStatusDef` rejects a `triggered` effect on `on-round-end`, and
  `createCombat` now runs `validateStatusDef` over the status registry it is given (ASSUMPTION 50).
- **Content: the Spiders' Weaver (`spider-weaver-web-strike`) trigger moved from `on-turn-start` to
  `on-turn-end`** (same response, selector and status; ASSUMPTION 49), so the Web it places is born in its
  turn and its own cleanup never rolls it. The Weaver's doc comment and the Blindclaws Setter's comment in
  `traits/glimmerdark.ts` were updated.

### Where the plan changed while building

- **Two win-check sites were equivalent mutants, and were collapsed.** The plan had a check after the
  action, after its grants, after the turn-end hooks and after the turn-end drain. Mutating each site away
  showed the checks after the action *hooks* were redundant with the stop predicates (the next pass or
  drain stops itself, emits nothing, and the next check closes the turn): they were removed and the
  comments say so. **A check after the action and its grants is still needed** (the turn-end block is
  alive-gated, so a wipe that also killed the actor, e.g. a lethal reaction to its attack, would skip every
  later check and close the turn with no result). It first went missing in my collapse and the mutation run
  found it; `status-timing.test.ts` now pins it ("the wipe also killed the actor").
- **`golden-round-end-interaction` was not renamed and its expected log did not change.** It pins the
  round-end *trait* pass (a lethal self-hit, a skipped later effect, an `on-death` Weaken) and never
  involved a status tick: its `DOT(undefined)` event is a trait-borne flat hit. That mechanism still
  exists at round end, and the Weaken it applies lands between turns, so it is born in no turn. Only its
  comments and test title changed. (The plan listed it as re-derived; the build showed it is not.)
- **Weaver goldens.** Only `golden-overgrowth-web-exploit` carries the real Weaver; `golden-broodmother`
  uses generic adds (its header says so), so its events are unchanged and only a comment moved.

### Golden impact (expected exports imported from `HEAD` (c56ebbc) and from the branch, then diffed)

A throwaway harness in a pristine worktree of `c56ebbc` imported every `*.fixture.ts` from both trees and
compared every `expected*`, `SEED` and `TURN_STEPS` export with `isDeepStrictEqual`: **91 fixtures, 83
byte-identical, 8 changed**; 7 new. The set of failing goldens at build matched the plan's list (the plan
listed `golden-round-end-interaction` and `golden-castable-draw`, and not `golden-overgrowth-web-exploit`'s
non-Weaver siblings; see above).

| Golden (old -> new name if renamed)                              | What changed (each re-derived by hand; derivation in the fixture header)                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `golden-dot`                                                     | ticks at the target's own turn end (R1-R3); the killing tick ends the turn at once: `TurnEnded`, `FightEnded`, **no `StatusExpired`** on the corpse                         |
| `golden-stun`                                                    | `StatusExpired` moves inside the victim's bracket, before `TurnEnded`                                                                                                      |
| `golden-web-break-free`                                          | the roll moves after OTHER's `Waited` (same single draw)                                                                                                                   |
| `golden-hollowkin-wretch-self-dot`                               | the tick and the trait's `TriggerFired` move inside the Wretch's bracket                                                                                                   |
| `golden-spore-spread-dot-kill`                                   | tick at the host's turn end; the spread target (applied in another creature's turn) **ticks at its own turn end the same round**                                          |
| `golden-round-end-mid-sweep-poison` -> `golden-turn-end-dot-kill-burst`         | re-derived on turn-end timing: E1 ticks 3 at its own R1 turn end (97), then 94 in R2                                                          |
| `golden-round-end-mid-sweep-poison-refresh` -> `golden-turn-end-dot-kill-burst-refresh` | the refresh (2 stacks) ticks 6 at E1's own R1 turn end (94), then 88                                                                                  |
| `golden-overgrowth-web-exploit`                                  | the Weaver's `TriggerFired` and `StatusApplied` move after its attack (turn-end hooks); no Web roll ever runs (born; then a wipe); one draw instead of two, seed no longer load-bearing |

`golden-castable-draw` is **retired** (its granted cast after a wipe is unreachable, ASSUMPTION 53): both
files were deleted before the PR. Its fixture's expected export was unchanged when the 83 was measured, with the file
present, which is why it counts among the 83.
The castable filter stays pinned by `actions.test.ts` "gemSlot 'random' draws over the castable slots only"
(shown failing with the filter removed: 1 failing test; no new case needed).

**Not changed, by import comparison:** every golden not in the table, including every B2 golden, the Glow,
Weaken, Vulnerability and Confusion goldens (modifier math is identical), `golden-sleep-wake`,
`golden-lullpollen-dozer`, `golden-spider-broodwarden` (events identical; one Web roll instead of two,
both misses), `golden-broodmother`, `golden-b6-provoke-stun-cleanup`, `golden-round-end-interaction` and
`golden-6v6-scripted`. File renames (`git mv`): `golden-round-end-mid-sweep-poison.{fixture,test}.ts` ->
`golden-turn-end-dot-kill-burst.*`, `golden-round-end-mid-sweep-poison-refresh.*` ->
`golden-turn-end-dot-kill-burst-refresh.*`; the references in `phase-4-party-specializations-cave-biomes.md`
were updated (file names only).

**New goldens, all hand-derived** (the engine then confirmed the arithmetic; one derivation slip, a missing
`health` input in `golden-f2-dot-one-turn`, was caught that way and fixed in the *input*, not the expected log):
`golden-f2-stun-one-turn` (Stun 1 skips exactly one turn, before or after the applier in the queue),
`golden-f2-turnstart-self-stun-once` (the D1 case over three rounds), `golden-f2-weaken-three-turns` (a
Weaken 3 covers the bearer's next three turns, applied before or after its action; same -20% math),
`golden-f2-dot-one-turn` (ticks exactly once; a self-applied Poison is born and ticks next turn),
`golden-f2-web-turn-end-roll` (a Web applied this turn is skipped, rolled at the next creature's cleanup),
`golden-f2-win-over-own-tick` (the PR #70 case, now a win) and `golden-f2-turn-end-interaction` (a tick
kills the host, `on-death` spreads Spore, the spread follows the born rule, a tick-kill then wins).

### Corpus-digest attribution (regenerated once, `npm run corpus:update`)

522 fights: **248 byte-identical, 274 changed** (274 rows). Method: main's 522 event logs were dumped
before any engine change; after the build the new logs were dumped and each changed fight's **first
divergence** was classified (a throwaway script, scratchpad): a wipe followed by `TurnEnded` where the old
log has more events -> win check; the Weaver's `TriggerFired` -> Weaver; a dot `DamageDealt` or a self
`HealApplied` (Regen) -> tick moved; a `StatusExpired` of Web -> Web roll; any other `StatusExpired` or a
`TurnSkipped` -> expiry moved; a fight with a Web whose first divergence is a later chance roll -> Web roll
(draw order); a `TriggerFired` of Arcane Surge -> Surge.

| Class                                        | Changed fights |
| -------------------------------------------- | -------------: |
| tick moved                                   |            130 |
| expiry moved                                 |             89 |
| Weaver moved (turn start -> turn end)        |             39 |
| Web roll moved (a break-free event)          |              9 |
| Web roll moved (later chance rolls shift)    |              3 |
| win check (events after the wipe truncated)  |              4 |
| Surge on a self-killed Seer                  |              0 |
| unclassified                                 |              0 |

- **The 96 fights with no `StatusApplied`: 92 byte-identical, 4 changed, all class win check** (a
  `sorcerer-starter` whose `on-turn-end` Arcane Surge no longer follows the killing blow).
- **Result changes: 4** (win 220 -> 219, loss 252 -> 251, draw 50 -> 52). None is a rule change; each is a
  changed trajectory after its first divergence: fight 205 loss (round 24) -> draw (round cap), 220 loss
  (round 15) -> draw (cap), 338 win (round 99) -> draw (cap, a kill that now lands one round later), 497
  draw (cap) -> loss (round 42). Their first divergences are a moved tick, a moved expiry, the Weaver and
  a moved expiry respectively.
- The census of the 33 post-wipe payload events from the PR #78 review: the killing step's own cascade
  stays (on-kill / on-death triggers, StatModifierApplied); only events from *later* steps vanish, which is
  what the 4 class-1 fights above show.

### New and changed unit tests

- **`status-timing.test.ts` (new, 32 tests):** the action-slot window (turn-start vs turn-end application,
  a round-end application), the tick gate and countdown (action-phase application, another creature's turn),
  the corpse rule, the Web roll (born skip, the turn-start Web rolled the same turn, a dead actor's bracket,
  countdown before roll, draws only when present), every win-check site (turn-start hooks, turn-start grants,
  after the action, the actor-also-died case, turn-end hooks, turn-end grants, no Web roll after a wipe),
  each hook pass and each drain stopping at the wiping firing/grant (7 sites), the PR #70 lethal-tick case,
  the validator and `createCombat`, and Arcane Surge ahead of a lethal tick.
- **Changed deliberately (timing):** `status-containers.test.ts` -- the "skips the turn" and "lock gained
  during the actor's own turn-start hooks" tests gain a `StatusExpired` before `TurnEnded` (Stun 1 counts down
  at the skipped turn's cleanup; the second is ASSUMPTION 49), and the immune-DoT test asserts
  `effectsForHook(x, 'on-turn-end')` (Poison moved). `statuses.test.ts`: POISON/BURN/REGEN hook assertions
  (`on-turn-end`). `combat.test.ts`: the round-end-sweep refresh test is **retired**; its coverage is the new
  "a status refreshed in its own bearer turn keeps full duration" test (same instance and id).
- **Inline test statuses `createCombat`'s validator now rejects, converted to `on-turn-end`:**
  `resolution.test.ts` (`test-dot` and `test-regen` in "applyStatus + status-container content" and "heal
  response", `test-debuff` in "remove-status response"; the `fireHook` calls follow) and the inline instances
  in `effects.test.ts` and `conditions.test.ts` (not run through `createCombat`, converted for honesty).
- Shape-only edits (`turnClock: 0`, `appliedAt: 0`): `scripts`, `actions`, `actor-death`, `combat`,
  `conditions`, `confusion`, `dead-target-pins`, `effective-stats`, `effects`, `generation`, `interpreter`,
  `spell-effects`, `status-containers`, `support-spells`, `target-selectors`, `targeting`, `turn-order`.
- **Tests that stayed green unchanged:** every other F1 test in `status-containers.test.ts` (including "an
  earlier grant in the turn-start drain can remove the lock"), the B2 goldens, and the skip and drain tests
  in `perform-action.test.ts`. The two `status-containers` assertion changes above are the only timing-forced
  ones.

### Verification

- Tests **852 -> 890 (+38)**, reconciled per file against `HEAD` (the script diffs all files): +32
  `status-timing.test.ts`; +7 new `golden-f2-*` test files (+1 each); the two renamed golden test files are
  -1/+1 each (net zero); -1 `golden-castable-draw.test.ts` (deleted); no other file's count changed (the
  retired `combat.test.ts` sweep test was replaced one for one). All green.
- **Mutations** (full suite each, every file restored from an in-memory copy; `git diff --stat` verified
  identical before and after). The corpus digest fails for almost all of them; the table names the **specific**
  test. Every mutation is killed:
  - countdown removed (13 failing; `combat.test.ts` refresh test, `status-containers.test.ts` skip, goldens);
    countdown ignoring born (4; `status-timing` turn-end Weaken, `combat.test.ts`); tick gate removed (1;
    `status-timing` "does not tick that turn"); Web roll ignoring born (3; `status-timing` born-skip and
    dead-bracket tests); refresh not re-stamped (1; `combat.test.ts` refresh test);
  - **clock**: no bump (31); bump at dequeue instead of the action slot (4; `status-containers` ASSUMPTION 45
    test, `status-timing` turn-start Weaken); bump only for a living actor (1; the dead-bracket test);
  - **Web roll**: back at turn start (8; `combat.test.ts` Web tests, `status-containers`, `golden-web-break-free`);
    before the countdown (1); skipped for a dead actor's bracket (1);
  - corpse countdown without the alive gate (1; `status-timing` corpse test);
  - **win checks, each site removed**: after the turn-start hooks (1; the cleanup test, `ActionStateEnded`);
    after the turn-start grants (1); after the action and its grants (1; the actor-also-died test); after the
    turn-end drain (6); `TurnEnded` not emitted on a wipe (54);
  - **stop predicate not passed at each of the 7 sites** (round-end pass, round-end drain, turn-start pass,
    turn-start drain, action drain, turn-end pass, turn-end drain): 1 failing test each (2 for the turn-end
    pass, incl. the PR #70 lethal-tick test); `fireHook` ignoring `stopWhen` (4); a drain ignoring it (4);
  - `on-round-end` validator off (2); `createCombat` not validating (1); the Weaver back on `on-turn-start`
    (1; `golden-overgrowth-web-exploit`); the castable filter removed (1; `actions.test.ts`).
  - **Two mutations first survived** (the after-hooks and the after-action-hooks win checks), and were shown to
    be redundant with the stop predicates and collapsed (see "Where the plan changed"). Arcane Surge's ordering
    has no code switch (it falls out of canonical effect order); its test pins the log.
- Gates: test (890) / lint / format:check / build / `tsc -b`, all green. Toolchain: Node 24.19.0, Vitest 5.0.3, TypeScript 6.0.3.

### Spec notes (resolved at the PR #80 review)

- **Death-reset.** CONVENTIONS "Death-reset" already says a corpse's statuses are inert and revive replaces
  them. It was rewritten in the plan-review doc-sync (`c56ebbc`) on this branch, so this note's premise
  ("CONVENTIONS says death wipes statuses") was stale. The code matches: the Web roll's and the countdown's
  alive gates are what make a corpse inert.
- **Castable draw.** Decided at the plan review (ASSUMPTION 53). With a wipe ending the turn, "a granted cast
  after the killing blow" cannot happen, so the C2b castable-filtered draw can no longer be shown in a golden;
  only `actions.test.ts` pins it (the filter is still correct defensive code). Observation: a spell with no
  valid target mid-fight is now only an empty slot or a lock.
- **The check after the action.** The turn-end block is alive-gated, so a wipe that also kills the actor needs
  the check after the action; it is the one place the stop predicates cannot stand in for a check. Correct as
  built, and recorded under "Where the plan changed".
- **`golden-round-end-interaction`.** It is a round-end *trait* golden and keeps its name and log;
  CONVENTIONS "Golden impact of 4.1-F" and brief ASSUMPTION 55 / "Deliberate golden changes" now say so.
- **A turn-start Web is rolled the same turn.** CONVENTIONS' Web paragraph now states it explicitly. The corpus
  has no Web applied before an action slot.
- **Post-wipe effects removed:** Arcane Surge's `TriggerFired` and grant after a killing blow, and on-turn-end
  traits' firings after a wipe (the 4 class-1 corpus fights).
- **The fight-start pass and drain are not checked.** This is the one remaining gap in "a wipe ends at once": a
  fight-start wipe would run round 1's first turn-start hooks before ending. 4.1-F3 adds the check (the brief's
  G2 section).

### Files changed

- Engine: `combat.ts` (turn skeleton, cleanup, `resolveRoundEnd`, clock), `resolution.ts` (`skipStatusTrigger`,
  `stopWhen`, refresh stamp), `actions.ts` (drain `stopWhen`), `effects.ts` (`instantiateStatus`),
  `effect-types.ts` (`appliedAt`, the `on-round-end` rejection), `types.ts` (`turnClock`), comments in
  `effect-types.ts` / `resolution.ts`.
- Data: `statuses.ts` (hooks and comments), `traits/overgrowth.ts` (the Weaver), comments in
  `traits/glimmerdark.ts` and `traits/core.ts`.
- Goldens: the 8 changed ones above (+ `golden-dot.test.ts`, `golden-spore-spread-dot-kill.test.ts` titles),
  7 new `golden-f2-*` pairs, the 2 renames, comment-only edits in `golden-broodmother`, `golden-lullpollen-dozer`,
  `golden-spider-broodwarden`, `golden-defend-count`, `golden-round-end-interaction` (+ its test title),
  `corpus-digest.fixture.ts` (274 rows). Tests: `status-timing.test.ts` (new) and the edits above.
- `golden-castable-draw.fixture.ts` and `golden-castable-draw.test.ts` were deleted (retired, ASSUMPTION 53).

## 4.1-F3 -- Silence & Pacify (G2) and the fight-start win check

Golden policy: **every golden byte-identical; the digest deliberate and narrow** (existing entries
change only through the cast-role loadout roll; four appended entries). Branch `phase-4.1-slice-f3`,
on top of the plan-check doc-sync commit (`e595111`; ASSUMPTIONS 56-65 are the plan-review rulings).

### What was built

- **Statuses** `SILENCED` (`action-lock { scope: 'cast' }`) and `PACIFIED` (`action-lock { scope:
  'attack' }`): cap 1, `defaultDuration: 3`, polarity debuff, appended to `STOCK_STATUSES`. They
  pass `validateStatusDef`, which already runs in `createCombat` (F2).
- **Spells** `SILENCE` (Violence) and `PACIFY` (Wit) in `data/spells/overgrowth.ts`: single enemy,
  `effects: [apply-status(cast-target, silenced | pacified)]` (duration omitted, inherited 3), biome
  1, no damage, no tuned numbers. **Appended last to `ALL_SPELLS`** (Silence, then Pacify); a test
  pins the original 25 ids in order.
- **The fight-start win check (ASSUMPTION 61), three sites** in `resolveTurn`'s `round === 0` block:
  the `on-fight-start` hook pass and its drain take `stopWhen: fightOver`, and win/loss is checked
  right after both, before `RoundStarted`. A fight-start wipe ends as `FightStarted ... FightEnded`,
  with no round and no turn. Run against the whole suite before the build (and again after), it
  changes no existing test, golden or digest entry.
- **Dedup key (ASSUMPTION 60).** A spell is status-only when every effect is `apply-status`; it keys
  by `affinity|shape|status:<sorted status ids>` (`data/spells/index.test.ts`). The test keeps no
  copy of the old key: a throwaway pair (two Violence single-target status-only spells applying
  `silenced` and `pacified`) asserts distinct keys, and the revert mutation is what shows they
  collided before.
- **Golden runner** (`test-utils/golden-runner.ts`): optional `playerEffects` / `enemyEffects` on
  `GoldenFixture`, passed straight to `createCombat`'s per-side `effects`. Absent for every pre-F3
  fixture.
- **Content doc** (`content/overgrowth.md`, the one living doc this slice owns): Silenced and
  Pacified in the Statuses section with their plain-language rules; Silence and Pacify moved from
  the pending table into the Overgrowth spell table (heading count updated).

### Corpus

- **Exemptions dropped:** `PERK_EXEMPTIONS` is empty (`clear-mind`, `aggressive` removed); the
  `stun` status exemption stays.
- **Appended entries (new rows, after the previous last entry):** 522 `sorcerer-silenced` (Clear
  Mind, seed 2107: an all-Seer party against a level-80 Brute casting Silence every turn) and 523
  `brute-pacified` (Aggressive, seed 2108: an all-Brute party against a level-80 Pollinator
  Beneficiary casting Pacify every turn), both appended to `PERK_FIGHT_VARIANTS`; then 524 and 525,
  the Silence and Pacify spell fights (seeds 2015-2016, an `always-cast` caster against
  `WALL_ENEMY`). Part D rides on no chance: the perk variants make the perk matter at **100 of 100
  seeds** each (checked over seeds 0-99), and the spell fights land the status at any seed (no
  random draw). The Pacifier is a Wit creature with no innate spell (the Beneficiary).
- **Digest regenerated once** (`npm run corpus:update`): 526 entries; the diff is 48 changed rows +
  4 appended.
- **Attribution, mechanical.** Before any change, every fight's materialized parties (each
  creature's equipped spells, both sides) and event log were dumped on `main` (`e595111`); after the
  build, the same on the branch. Of the 522 existing fights: **451 have identical parties and every
  one has an identical log (0 exceptions)**; **71 have different parties**, differing only in a
  rolled gem (creature ids identical in all 71), and **48** of those changed their log (the other 23
  rolled a different gem that never changed an event). The brief's figure was 48 changed fights with
  two stand-in spells: the real spells give **48**. Of the 48, 18 rolled Pacify; 30 changed only
  because the pick shifted (`floor(r * N)` over a pool one larger). Silence is rolled by none of the
  522 (no Violence cast-role creature in them).
- **Result changes: 7** (the brief's stand-in measurement said 2; real spells differ). All are
  fights whose rolled gem changed: 19, 109, 199 and 289 (player-side Resonant Chorus, Luminous Tide
  -> Pacify) (all four are the floor-20 Leech Sovereign, alone and with no gem: she attacks once,
  then waits, Pacified, every turn until she dies), 280 (two Chorus, Luminous Tide -> Pacify) loss
  -> win; 220 (enemy Chorus, Pollen Cloud -> Arcane Bolt) draw -> win; 498 (Luminous Tide -> Pacify
  and Pollen Cloud -> Arcane Bolt) loss -> draw.

### Golden impact (expected exports imported from `main` and from the branch, then diffed)

A throwaway harness in a pristine worktree of `e595111` imported every `*.fixture.ts` from both
trees and compared every `expected*`, `SEED` and `TURN_STEPS` export with `isDeepStrictEqual`: **97
fixtures, 97 byte-identical, 0 changed**, 5 added. Every other export is identical too, except
`statuses` in the 28 fixtures that re-export the stock `STATUS_REGISTRY`: the registry gains exactly
`silenced` and `pacified`, and no existing entry changes. The B2.2 and scoped-suppression goldens
(trait-borne locks) are untouched; the new ones are real-status versions.

**New goldens (hand-derived; the derivation and every number are in each fixture header):**
`golden-f3-silence-three-turns` and `golden-f3-pacify-three-turns` (each applier casts once, in
round 1, then a non-casting rule; S1 hits the lowest-HP enemy, which acted before it, S2 the
highest, which acts after; the target acting after its applier is locked rounds 1-3, the one before
it rounds 2-4, each expiring in its own turn-end cleanup; run six rounds so both expiries and clean
turns after them are in the log; a Silenced always-cast creature attacks, a Pacified always-attack
creature waits, with no `TurnSkipped`), `golden-f3-silenced-refuses-granted-cast` (the real-status
mirror of B2.2), `golden-f3-immunity` (the **real** Clear Mind and Aggressive perks as the player
side's effects, via the runner: the status lands, a `has-status` rule still fires, the cast / attack
goes through, a granted cast goes through under Silence) and `golden-f3-fight-start-wipe`.

### Tests and mutations

- Tests **890 -> 905 (+15)**, reconciled per file against `main`: `status-timing.test.ts` +4 (the
  three fight-start sites and a no-wipe control), `spells/index.test.ts` +4 (the throwaway pair, the
  real-reskin control, the append-only pin, the spell shape), `statuses.test.ts` +1,
  `corpus-coverage.test.ts` +1 (the spell fights pinned by index), +5 new golden tests. No other
  file's count changed. All green.
- **Mutations** (full suite each, files restored; the digest excluded from the naming): `SILENCED`
  locking attack (4 failing; `statuses.test.ts`, the Silence golden, the perk coverage); `PACIFIED`
  locking cast (3); each duration 2 (4 and 3; the statuses test and the immunity golden); Silence
  applying `pacified` (6) and Pacify applying `silenced` (5; the coverage tests, the goldens);
  `ALL_SPELLS` with Pacify before Silence (1) and with Silence inserted early (1; the append-only
  pin); the dedup key reverted (1; the throwaway pair); the fight-start pass without `stopWhen` (1;
  "the hook pass stops at the wiping firing"), its drain without it (1; "the drain stops at the
  wiping grant"), its check removed (4); the runner dropping `playerEffects` (1;
  `golden-f3-immunity`); the iterator ignoring immunity (13); the spell fights not appended (1; the
  index pin); each perk fight without its caster (1 each; "every perk matters"). **All killed.** One
  finding: the spell fights alone are not needed for the existing coverage test (the perk fights
  also cast both spells); the index-pinned test is what fails without them.
- Gates: test (905) / lint / format:check / build / `tsc -b`, all green. Toolchain: Node 24.19.0,
  Vitest 5.0.3, TypeScript 6.0.3.

### Spec notes (resolved at the PR #81 review)

- A Wit or Violence cast-role enemy can roll Silence or Pacify as its only gem and cast it every
  turn (28 existing fights roll Pacify). This is ASSUMPTION 64, and G's full gem sets and role
  scripts address it.
- The brief's "2 results" stays as written. It is labeled as a stand-in measurement from the F3
  kickoff, and this record carries the real figure (7).
- Pacify never lands on its caster's own side: 0 of the corpus's 315 Silenced and Pacified
  applications do. Part A re-sides generated creatures to the player side, so a **player-side
  creature can roll Pacify into its loadout** (fights 19, 109, 199, 280, 289). That's a corpus
  artefact, not a game rule.
- Immunity is read with the lock (the iterator), so an immune bearer still shows `has-status`.
  CONVENTIONS already says this ("Immunity suppresses the effect, not the application");
  `golden-f3-immunity` pins it.
- **A solo, gemless boss and recast locks (decided at the PR #81 review).**
  - A recast refreshes Silenced and Pacified to full duration. The Leech Sovereign fought alone, on
    `always-attack`, with no gem, so one creature casting Pacify every round left her nothing to do
    but wait. Fights 19, 109, 199 and 289 show it.
  - Decided: boss floors become 6v6. Random biome creatures fill the side after the authored adds,
    excluding the boss's own species. Every boss gets a full gem set and its role script, so a lock
    downgrades its turn instead of emptying it.
  - No boss immunity. Built in 4.1-G: see GAME_DESIGN "Milestone bosses", CONVENTIONS "Boss floors"
    and the brief's 4.1-G section.

### Files changed

- Engine: `combat.ts` (fight-start check). Data: `statuses.ts`, `spells/overgrowth.ts`,
  `spells/index.ts`.
- Tests and fixtures: `test-utils/golden-runner.ts`, `__corpus__/corpus.ts`,
  `__corpus__/corpus-digest.fixture.ts` (52 rows), `corpus-coverage.test.ts`,
  `status-timing.test.ts`, `data/spells/index.test.ts`, `data/statuses.test.ts`, 5 new `golden-f3-*`
  pairs. Docs: `content/overgrowth.md`, this record.
- Nothing needs deleting.

## 4.1-G1 -- Enemy behaviour: role scripts, full gem sets, 6v6 boss floors

Golden policy: **mechanism goldens byte-identical; the digest regenerated once, with stage-wise
attribution.** Branch `phase-4.1-slice-g`, on top of the plan-check doc-sync (`3126dab`; ASSUMPTIONS
66-80 are the plan-review rulings). G1 is half of the brief's 4.1-G; G2 (hub and store) follows.

### What was built

- **Stage 0 (ASSUMPTION 68): the `always-*` scripts become fixtures.** The five scripts moved
  **unchanged** (same ids, same rules) to `engine/__fixtures__/scripts.ts`, with
  `FIXTURE_SCRIPTS_BY_ID` holding exactly those five. The 91 golden fixtures that used them, 9 engine
  unit tests and the corpus builder import it (101 files, each changed only in that import); `app/demoFight.ts` declares its five locally (it may not import fixtures). The
  old `data/scripts.test.ts` tests moved to `engine/fixture-scripts.test.ts` with only their imports
  changed.
- **Part C pins its scripts (ASSUMPTION 79).** Every Part C member (`brute()`, `sorcerer()`,
  `shieldbarer()`, the Swarmhive Striker, Snapjaw Jaws, and the two starters in the spell fights)
  now names the script it ran before roles existed, so entries 500-525 stay byte-identical.
- **Stage 1: three spells,** appended last to `ALL_SPELLS` in this order: **Pounce** (Instinct,
  `scalingStat: 'speed'`, 1.0, `damageSource: 'cast'`), **Stifling Weight** (Endurance, status-only
  `weaken`), **Life Siphon** (Vitality, `deal-damage` cast 0.7 plus `heal(self)` Intelligence 0.35).
  They sit in `data/spells/overgrowth.ts` and `OVERGROWTH_SPELLS`. The dedup test's key now reads the
  stat a damage or heal effect scales from (ASSUMPTION 74): Pounce and Stinger Swarm are both Instinct
  single-target plain damage at 1.0 and collided before.
- **Stage 2: full distinct gem sets (ASSUMPTION 70),** in `generation.ts`'s `rollLoadout`: one
  `weightedPick` per regular slot, each over the affinity-matched unlocked pool minus the spells
  already chosen; when that runs out the remaining slots draw from the full pool (the safety net).
  **Every enemy draws, whatever its role**, bosses included, so a spawn costs 6 draws instead of 3.
  An empty pool draws nothing, and a cast-role creature with an empty pool throws. `spawnEnemy` is the
  one spawn path for an ordinary slot and for a boss-floor fill.
- **Stage 3: roles.** Seven role scripts in `data/scripts.ts` (striker, guardian, warden, caster,
  support, opener, taunter); the registry (`STOCK_SCRIPTS_BY_ID`) holds only those seven. Every
  creature's `defaultScriptId` is its role (54 creatures, 3 bosses and the four starters; a data test
  pins each id, the counts 27/10/2/10/3/4/1, and that none is an `always-*` script). Snapjaw Lure and
  the Stonehorn Warden are `taunter`. `isCastRole` reads `CAST_ROLE_SCRIPT_IDS` (`caster`, `support`,
  `opener`; a named constant in `generation.ts`, ASSUMPTION 67); a cast-role creature with no
  affinity-matched unlocked spell throws at generation. The **support side filter (ASSUMPTION 69):**
  `CastRuleAction` is now `{ gemSlot: number } | { gemSlot: 'random', gemSide?: 'ally' | 'enemy' }`;
  `castableGemSlots` takes an optional side and filters on `spell.targetSide`; it is read at
  `checkLegality` and at `resolveGemSlot`. With `gemSide` absent the draw is unchanged.
- **Stage 4: the 6v6 boss fill (ASSUMPTION 72).** After the boss and her authored adds, the side is
  filled to `enemyPartySize(floor)` (6 at every boss floor) through `spawnEnemy` over the biome's pool
  minus the boss's own species, drawn from the run RNG after the boss's and the adds' draws; slot
  indices continue after the adds. A pool with no positive-weight species left fills nothing and does
  not throw. Fill creatures are ordinary spawns with ordinary kill rewards, soul% included
  (ASSUMPTION 80).
- **Corpus entry 526 (appended after 525):** Life Siphon's coverage fight. Its `heal(self)` only lands
  on a wounded caster, and the spell fights' wall never attacks, so a level-20 Unicorn casts it every
  turn (stock `always-cast`) alone against two level-5 Brutes. Pounce and Stifling Weight are covered
  by generated fights.
- **Content docs:** the roles, the three spells and the casting-role notes folded from each biome
  doc's pending section into its body, each boss section updated for 6v6, and a new
  `content/enemy-behaviour.md` (the designed content in plain language).

### Digest attribution (regenerated once, `npm run corpus:update`)

Method: the finished tree was built in the plan's order, and a scratch copy was snapshotted after
each stage; per stage, every fight's `createCombat` parties (every field of every creature, both
sides, `scriptId` and gems included) and event log were dumped and compared with the previous
stage's. **At every stage, an identical party gave an identical log and every changed log had a
changed party (0 exceptions).** `main` has 526 entries; the branch 527 (one appended).

| Stage | Mechanism | Changed parties | Changed logs | Fights first changed here | Result flips |
|---|---|---|---|---|---|
| 0 | the fixture move, Part C pins | 0 | 0 | 0 | 0 |
| 1 | three spells appended (a longer affinity-filtered pool shifts the pick of Instinct, Endurance and Vitality cast-role enemies) | 20 (A 15, B 5) | 20 | 20 | 0 |
| 2 | full gem sets: three loadout draws per enemy shift every later draw of the run stream | 493 (A 300, B 193) | 480 (A 299, B 181) | 460 | 77 |
| 3 | role scripts and roles (random-enemy attacks, random gem casts, the starters' roles) | 500 (A 300, B 200) | 480 (A 287, B 193) | 15 | 57 |
| 4 | the 6v6 boss fill (the boss-floor class: floors 10, 20 and 30) | 80 (A 60, B 20) | 80 | 0 | 12 |

Fights attributed to the first stage that changes their log: **20 + 460 + 15 = 495 of 526**, which
is exactly the number of rows that differ between `main`'s digest and the regenerated one (A 300, B
195). The stage-4 digest equals the committed one for entries 0-525; the only other difference is the
appended entry 526. **Part C (entries 500-525) is identical to `main` at every stage.** Unchanged
Part B entries: 360, 361, 390, 420, 481. Stage 4's 80 fights are the boss class; each was already
changed by stage 2's draw shift, so none is _first_ attributed to stage 4, and 12 of them flip.

Result flips, by stage and fight number:

- Stage 2 (77): 5 loss->win, 9 draw->loss, 19 win->loss, 20 loss->win, 35 win->draw, 40 win->loss, 45
  loss->win, 70 loss->win, 75 loss->win, 79 loss->win, 83 draw->loss, 85 draw->win, 89 win->loss, 110
  win->draw, 113 loss->win, 139 win->loss, 145 win->loss, 155 loss->draw, 160 loss->win, 170 win->draw,
  185 loss->win, 190 win->loss, 199 win->loss, 204 loss->draw, 205 draw->win, 215 loss->draw, 219
  win->draw, 230 loss->draw, 234 loss->draw, 235 draw->loss, 245 win->draw, 255 loss->win, 260
  loss->draw, 264 loss->win, 265 draw->win, 275 loss->win, 285 loss->win, 289 win->loss, 294
  loss->draw, 298 win->loss, 305 draw->win, 306 loss->draw, 310 draw->loss, 311 win->loss, 312
  draw->loss, 315 win->loss, 316 loss->draw, 322 draw->loss, 323 win->draw, 342 win->loss, 368
  loss->win, 374 draw->loss, 411 draw->loss, 418 draw->loss, 427 win->loss, 433 draw->loss, 435
  loss->draw, 437 loss->win, 442 loss->draw, 443 draw->win, 446 draw->loss, 447 draw->loss, 454
  loss->draw, 456 draw->loss, 457 draw->win, 458 draw->loss, 460 loss->draw, 462 draw->loss, 465
  win->draw, 470 draw->loss, 473 win->draw, 484 win->loss, 485 win->draw, 486 win->draw, 490
  loss->draw, 497 loss->win, 498 draw->loss.
- Stage 3 (57): 14 loss->win, 29 loss->draw, 53 loss->win, 64 draw->loss, 75 win->loss, 104 loss->win,
  144 loss->draw, 155 draw->win, 174 loss->win, 194 loss->win, 209 loss->draw, 215 draw->win, 219
  draw->loss, 229 loss->win, 230 draw->loss, 234 draw->loss, 235 loss->win, 239 loss->win, 245
  draw->win, 250 win->loss, 260 draw->win, 289 loss->win, 290 draw->loss, 294 draw->loss, 295
  win->draw, 304 win->loss, 306 draw->loss, 309 win->loss, 313 win->loss, 316 draw->loss, 321
  win->loss, 336 win->draw, 340 win->loss, 344 draw->loss, 346 loss->draw, 347 win->loss, 372
  loss->win, 412 loss->draw, 435 draw->loss, 437 win->loss, 441 draw->loss, 442 draw->loss, 445
  draw->loss, 454 draw->loss, 457 win->loss, 458 loss->draw, 460 draw->loss, 465 draw->loss, 472
  draw->loss, 484 loss->draw, 485 draw->win, 491 win->loss, 493 win->loss, 494 draw->loss, 495
  win->loss, 496 draw->loss, 498 loss->draw.
- Stage 4 (12): 28 loss->win, 29 draw->loss, 79 win->loss, 88 loss->win, 109 win->loss, 208 loss->win,
  229 win->loss, 239 win->loss, 268 loss->win, 289 win->loss, 298 loss->win, 499 win->loss.
- Stage 1 and stage 0: none.

`main` -> branch, same 526 fights: wins 227 -> 224, losses 245 -> 262, draws 54 -> 40. **The four fights the F3 record named (19, 109, 199, 289)** are wins on `main` and
losses on the branch, but the boss's new fallback is not what decided them. In F3 they were the
enemy-side Leech Sovereign fights where the player side held Pacify. Stage 2's draw shift rerolled
both sides: fights 199 and 289 no longer have Pacify on the player side, and in fights 19 and 109
the one Pacify holder aims at the lowest-HP enemy, one of her five companions, and never Pacifies
her. Across the branch corpus, 19 boss fights have a player-side Pacify and none of them Pacifies
the boss. A Pacified boss's fallback is pinned by `golden-g1-leech-sovereign-pacified`, not by the
corpus.

### Golden impact (expected exports imported from `main` and from the branch, then diffed)

A throwaway harness in a pristine copy of `main` and in the finished tree imported every
`__golden__/*.fixture.ts` and every `__fixtures__/*.ts` and compared **every export** with
`assert.deepStrictEqual` (functions by source text, Maps and Sets by entries): **946 exports
identical, 0 golden exports changed**, 2 modules added (`__fixtures__/scripts.ts`, the new golden).
The four differing exports are all in `__fixtures__/biomes.ts` and all derived from
`FIXTURE_CASTER`'s role (`always-cast` -> `caster`, ASSUMPTION 76): `FIXTURE_CASTER`,
`FIXTURE_SPECIES_CASTERS`, `FIXTURE_BIOME` and `FIXTURE_BIOME_WITH_BOSS`. No golden imports that
file; only `generation.test.ts` does. **Changed content goldens: none.** The 11 goldens named for real
species build their creatures with `makeParty` and a `scriptId` of their own, and never call
`materializeCreature`, so no role or gem-set change reaches them (they import species ids and real
traits, not generated creatures). At stage 0 the same comparison gave 950 identical exports and one added module.

**New golden (hand-derived):** `golden-g1-leech-sovereign-pacified`. The real Leech Sovereign at
level 1, on her real role script (`striker`) with one gem (Stinger Swarm), is Pacified by a real
Pacify cast. She casts instead of waiting: Stinger Swarm for 20 (off 20, def 0, chip 0.2, raw 20.2),
and Vital Siphon does not fire because she cast and did not attack. The header lists every draw:
rule 2 (`attack random enemy`) is illegal under Pacified and draws nothing because `checkLegality` is
pure; rule 3's `cast random gem` draws once, over her one castable slot, so the fight consumes
exactly one draw, which the test asserts from the RNG bookmark.

**Regenerated, labeled generated-then-checkpoint-verified:** the three real-content tests in
`state/integration.test.ts` (floor 1, floor 10, the default-config floor 1) and the two boss tests
in `state/store.test.ts` (their pinned XP). Each pins what the run returned and adds an independent
checkpoint (levels inside `enemyLevelRange`, kill counts, the species of the fill). The store
fixtures' stub RNG sequences changed from 3 to 6 draws per spawn (a `spawn()` helper), and every
store deps object passes `scripts: FIXTURE_SCRIPTS_BY_ID`.

### Tests and mutations

- Tests **905 -> 976 (+71)**, reconciled per file against `main`: `data/scripts.test.ts` +15 (its 7
  old tests moved out; 22 new: the registry, every role rule and fallback, taunter equivalence),
  `engine/fixture-scripts.test.ts` +7 (the moved tests), `data/biomes.test.ts` +13 (the 6v6 boss
  floors), `data/roles.test.ts` +7 (new), `data/spells/index.test.ts` +5,
  `engine/generation-g1.test.ts` +14 (new), `engine/actions-gem-side.test.ts` +8 (new), the new
  golden +2. The sum of the per-file deltas is 71 and no other file's count changed (the species,
  store, integration, generation and coverage tests were edited in place).
- **Mutations** (a scratch copy of the finished tree; one source change at a time, file restored;
  every one is killed). Each role without its last rule: striker, guardian, warden, caster, support,
  opener (1 each, in `scripts.test.ts`) and taunter (its structure test). The cast-role check:
  reading `always-cast` again (3) and the throw removed (2). Full gem sets: the old one-spell
  cast-role rule (13), picks not distinct (7), the safety net removed (17), the boss rolling no
  loadout (5). The support side filter, at **both** read sites: `checkLegality` ignoring `gemSide`
  (3, including `scripts.test.ts`'s "support rule 1 is illegal with no ally-side gem"),
  `resolveGemSlot` ignoring it (2), and `castableGemSlots` ignoring the side (5). The boss fill: no
  fill (10), the boss's species not excluded (4), the fill drawn before the adds (1, the draw-order
  test). The spell append: Pounce inserted before Silence (1) and Life Siphon dropped (1; the pin
  test). The dedup key without the stat (2). A Part C member unpinned (1; the digest).
- Gates: test (976) / lint / format:check / build / `tsc -b`, all green. Toolchain: Node 24.19.0,
  Vitest 5.0.3, TypeScript 6.0.3, ESLint 10.11.0.

### Spec notes (for the docs, before G2)

- **A random-gem draw always consumes one value, even over a single castable gem.** CONVENTIONS now
  says so. It is why a Seer on `caster` costs a draw per turn where `always-cast` cost none, and part
  of why Part B changes at stage 3.
- **Boss floors get harder in two ways 4.1-H should look at.** Six enemies where there were one to
  three, and the Rot Sovereign's attack grows with **every death on either side**, so the extra
  creatures feed her faster. The integration floor-10 fight (party level 20) still wins.
- **Soul% from boss-floor fill creatures** is intended (ASSUMPTION 80): a boss floor now also farms
  the biome's souls, minus the boss's own species.
- **The Seer, Mauler and Unicorn change behaviour with their roles** (a Seer casts a random castable
  gem every turn, a Mauler's second rule attacks a random enemy). Part B shows it; Part C is pinned.
- **`taunter` is exactly `always-provoke`**: a test runs the same fight with the script id swapped,
  across 20 seeds, with the real Lure and Stonehorn Warden, and the logs are identical.
- **The pending sections** of the three biome docs still hold the Phase 4.5 clean-up and the 4.1-F
  timing notes (not G1's); the roles, the spells and the casting-role notes are folded into the
  bodies.
- **No boss is locked in the corpus.** Role scripts aim a spell at the lowest-HP enemy, which is
  almost never a boss: 19 boss fights hold a player-side Pacify, and Pacify is applied to a boss 0
  times. 4.1-H measures boss lock uptime with a script that aims the lock at the boss (brief,
  4.1-H, "Watch point: boss floors in 6v6").
- **Life Siphon is effectively a player spell.** Every Vitality enemy is a `support`. Rule 1 draws
  only ally-side gems, and rule 3 runs only when it can't attack, so Parts A and B cast Life Siphon
  0 times. That is why entry 526 exists: without it, the coverage test's "every spell is cast with
  its effects landing" fails.
- **`scriptId: null` already resolves to the role.** `materializeCreature` takes
  `scriptId ?? speciesCreature.defaultScriptId`, and the store has passed `instance.scriptId`
  (null for a new instance) to it since 4.1-A. G2's ASSUMPTION 6 item needs a store test, not new
  code.
- For G2: player gem rolls draw from `ALL_SPELLS`, which is now final, so the store tests there can
  pin the rolls once.

### Files changed

- Engine: `generation.ts` (`rollLoadout`, `spawnEnemy`, the boss fill, `CAST_ROLE_SCRIPT_IDS`),
  `actions.ts` (`castableGemSlots`, `checkLegality`, `resolveGemSlot`), `scripting-types.ts`
  (`CastRuleAction`).
- Data: `scripts.ts` (rewritten: seven roles), `spells/overgrowth.ts`, `spells/index.ts`,
  `species/overgrowth.ts`, `species/glimmerdark.ts`, `species/rotcap-hollow.ts`,
  `species/starters.ts` (roles; the spell lists).
- App: `demoFight.ts` (its five scripts declared locally).
- Tests and fixtures: new `__fixtures__/scripts.ts`, `fixture-scripts.test.ts`,
  `generation-g1.test.ts`, `actions-gem-side.test.ts`, `data/roles.test.ts`, the new golden pair;
  changed `scripts.test.ts`, `biomes.test.ts`, `spells/index.test.ts`, the three species tests,
  `generation.test.ts`, `store.test.ts`, `integration.test.ts`, `__fixtures__/biomes.ts`,
  `__corpus__/corpus.ts` and `corpus-digest.fixture.ts` (495 rows + 1 appended); and **101 files whose
  only change is repointing the `always-*` registry import** (91 golden fixtures, 9 engine unit
  tests, the corpus builder, whose other edits are listed above).
- Docs: `content/overgrowth.md`, `content/glimmerdark.md`, `content/rotcap-hollow.md`, new
  `content/enemy-behaviour.md`, this record.
- Nothing needs deleting.
