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
  `golden-b1-bonus-cast-default` pins it (the corpus digest was the only prior tripwire).
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
| `golden-b1-bonus-cast-default` (bonus-caster, `chancePercent` 100, exactly one enemy-side single-target spell, post-`createCombat` slots [bolt] asserted; enemies slot 0 HP 50, slot 1 HP 30; always-wait so the cast is the only hit; 30 - 10 = 20, no kill, no clamp; no Provoker/Confusion/Tunnel Vision) | Restore first-by-slot for the bonus-cast path only (`legacyGrantedTargeting` + enemy-side + no targeting) | fails (hits slot 0: `targetId` a, `remainingHp` 40); it is the only golden that fails under this mutation |

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

- **F1:** `golden-b1-bonus-cast-default` (above), with its discrimination proof.
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
