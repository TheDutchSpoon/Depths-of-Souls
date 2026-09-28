# Phase 4.1 — Fix & Consolidation Pass: Implementation Plan

Status: planned

## Context

Phase 4 shipped green: all four gates pass, the phase record is accurate, and the engine is still
pure. A close-out review of `main` @ `877b01a` then read the docs, the brief, the record and all of
`src/engine`, `src/state` and `src/data`, reproduced behavioural claims with throwaway tests, and
walked every finding through with the design owner. Every point is **decided**; the decisions are
synced into `GAME_DESIGN.md`, `CONVENTIONS.md`, `ROADMAP.md`, `CLAUDE.md`, the spec docs and the
content docs in the same doc-sync as this brief. **Those docs are the spec. This brief is the
build plan: it places each decision in a slice, names acceptance criteria and golden impact, and
collects the few choices it had to make in an Assumptions checklist.** If this brief and the docs
disagree, the docs win; flag the conflict, don't guess.

What the review found, in one paragraph: Phase 4 **wasn't quite done** (Silenced and Pacified were
never authored, so Clear Mind and Aggressive are buyable and inert; creatures have no names; the
game throws at the content frontier on floor 31). It had **real bugs**: enemy support casters heal
and buff the *player* (B1); bonus-cast and echo-cast ignore every action rule, firing while Stunned
and ignoring Silenced, Provoke and Confusion (B2); `CombatState.rng` is a closure shared by every
copy, so the same snapshot resolved twice gives different results (B3); hooks can fire effects that
were already removed (B4); a hit lands on a corpse after a lethal pre-hit trigger (B5); Stunned or
Sleeping creatures keep Defend/Provoke through their skipped turn (B6). The save-v1 shapes of
`Instance` and the collection needed deciding before Phase 5. And most of the bugs trace to one
pattern: things that were "not a 10th verb" or "not a new category" got in anyway, as
side-channels. Phase 4.1 fixes and consolidates all of it now, while the engine goes quiet through
Phases 5–7.

**Finding labels.** This brief keeps the review's labels because the docs use them: **G** =
completeness, **B** = bugs, **A** = architecture, **S** = smaller items, **D** = design and balance,
**§6** = Phase 5 readiness. They are *not* slice names: slices are written `4.1-A` … `4.1-H`.

## Scope boundary

**In scope:** every decided item placed below. Nothing else.

**Out of scope (do not pull forward):**
- **The Phase 4.5 demo** and its content clean-up (the nine Phase-3 placeholder traits → test
  fixtures, Ember Lance and Venom Bolt deleted, Cinder Nova promoted). Separate brief after 4.1-H.
  Phase 4.1 ships **no demo of its own** (a fix phase; the 4.5 demo covers Phase 4 and 4.1).
- **Persistence** (Phase 5): no IndexedDB, no `snapshot`/`hydrate` implementation, no migrations.
  4.1 fixes the **shapes** Phase 5 will save; it doesn't save them.
- **Phase 6 items** recorded at the review: the cross-side targeting warning, UI greying, a "target
  lacks status" condition, a `last-action` condition, a script-level default-target override.
- **Phase 8 items:** gems as inventory, the Soul Altar gate on summoning, fusion, equipment, catch-up
  leveling. 4.1 only makes sure nothing it builds blocks them (A6, A8).
- **Enemy AI** (utility scoring) — considered and rejected in favour of role scripts.
- **Sprites** (Phase 7 owns the asset format).

## Slice plan and sequencing rules

The review fixed the slice **contents** and the order, and decided that a slice whose PR gets too
big is split. The review's four slices are split up front into **eight slices, lettered A–H**, so
that each has a single golden policy (confirmed with the design owner):

| PR | Theme | Golden policy |
|---|---|---|
| **4.1-A** | Data, store & generation | Engine goldens untouched; store/generation tests pin the Phase-4 placeholder config |
| **4.1-B** | Engine foundations: plain-data state, instance ids, fight setup, conditions, innate spells, revive cap | **Byte-identical, all goldens** |
| **4.1-C** | One action pipeline + turn skeleton, shipped as **C1** (turn skeleton) then **C2** (pipeline) | C1: deliberate, listed; C2: **byte-identical, all existing goldens** |
| **4.1-D** | Spells carry responses | **Byte-identical, all goldens (hard requirement)** |
| **4.1-E** | `perform-action` (bonus/echo become data) | Deliberate changes, listed |
| **4.1-F** | Statuses as effect containers + status timing + Web roll + Silence/Pacify | Deliberate changes, listed |
| **4.1-G** | Hub actions + enemy behaviour | Engine goldens untouched except any listed; content tests change |
| **4.1-H** | Balance simulator + first tuning pass | Content numbers change; mechanism goldens untouched |

The split keeps each PR under one golden policy: a PR that must be byte-identical never also
carries deliberate changes, so "any diff is a regression" stays checkable.

**Sequencing rules** (Phase 3/4 discipline, restated):
- **Sequential branch-off.** Branch each PR from `main` after the previous one merges.
- **`main` stays green and deployable after every merge.** `test` / `lint` / `format:check` /
  `build` locally before every PR, matching CI.
- **Golden changes are questions, not chores.** Every changed golden is either on this brief's
  deliberate list for that PR or it is a regression. Each PR's description lists every changed
  golden file and the reason, and shows that old goldens changed **only** in the listed way.
- **Hand-derived focused goldens** for every new mechanism (arithmetic in comments). Integration
  goldens are labeled generated-then-checkpoint-verified.
- **Presence, never absence**: new goldens assert events that exist, not events a later PR could add.
- **Mechanism goldens on fixtures, content on real data.** New-mechanism goldens use small fixture
  parties/traits; real content is covered by the per-biome goldens and the integration test.
- **Stop and ask** if a slice wants to *change* (not confirm) any decided item or any assumption
  below. That is a "bring it back to design" signal (WORKFLOWS).
- **Content docs stay in sync:** a PR that changes content behaviour folds the matching item from
  a content doc's "Phase 4.1 — decided changes" section into that doc's body and deletes it from the
  pending section.

## Architecture overview

### Module map (new / changed)

```
src/engine/
  actions.ts        NEW  (C) checkLegality (pure), resolveIntent (the one place action-level
                         draws happen), executeAction + the executors moved out of combat.ts,
                         the ResolutionContext factory
  combat.ts         SLIM (C) createCombat, resolveTurn (turn skeleton), resolveFight; executors
                         leave; (E) maybeFireBonusCast gone; (F) round-end sweep gone
  resolution.ts     EXTEND (B) exact-instance check in fireHook, fireHook options object;
                         (C) ResolutionContext threaded instead of events/cascade args;
                         (E) perform-action; (F) suppress-action removed
  rng.ts            CHANGE (B) plain-data RNG bookmark + nextRandom(rng)
  effect-types.ts   CHANGE (B) StatModifierDef.condition: SelfCondition, innate-spell;
                         (E) perform-action response, bonus-cast + echoCast removed;
                         (F) StatusDef = { statusId, cap, polarity, defaultDuration, effects },
                         action-lock / turn-order / friendly-fire / status damage-modifier passives
  effects.ts        CHANGE (B) unique instance ids from the per-fight counter, baselineEffects;
                         (F) iterator flattens status effects, immunity checked here once
  interpreter.ts    SLIM (C) lookahead uses checkLegality; isActionSuppressed removed;
                         decideAction returns an unresolved Intent
  targeting.ts      CHANGE (C) override pipeline called from resolveIntent for every source
  types.ts          CHANGE (A) Creature.origin; (B) CombatState.rng bookmark, instance counter,
                         Creature.baselineEffects, Creature.revivesUsed, traits/playerWideEffects
                         removed; (C) ActionStateEnded event; (D) Spell = { …, targetSide
                         (required), effects }
  generation.ts     CHANGE (A) materializeCreature options object, BalanceConfig argument;
                         (G) full distinct gem sets + safety net, role-aware cast check
  curves.ts         CHANGE (A) reads BalanceConfig parameters (no literals left)
  leveling.ts       CHANGE (A) XP curve (20 × level²) + XP per kill (victim level) from BalanceConfig
  config.ts         EXTEND (B) MAX_REVIVES_PER_CREATURE = 10
  balance-types.ts  NEW  (A) the BalanceConfig type (shape owned by the engine)
  test-utils/       NEW  (B) deepFreeze helper (name/location is the plan's)

src/data/
  balance.ts        NEW  (A) the default BalanceConfig values
  species/*.ts      CHANGE (A) required `name`; (B) starters lose equippedSpells;
                         (G) defaultScriptId = role
  spells/*.ts       CHANGE (D) every spell re-expressed as effects; (F) Silence, Pacify;
                         (G) Pounce, Stifling Weight, Life Siphon
  statuses.ts       CHANGE (F) every status re-expressed as an effect container
  traits/starters.ts CHANGE (B) Arcane Surge gains innate-spell; (E) perform-action trigger
  traits/glimmerdark.ts CHANGE (E) Overtone as a perform-action trigger
  scripts.ts        EXTEND (G) six role scripts (the engine's cast intent gains an optional
                         side filter for `support`, ASSUMPTION 29)
  specializations.ts CHANGE (G) PerkDef.phase removed

src/state/
  store.ts          CHANGE (A) action rule, can… queries, descend result, content frontier,
                         lastFloor, collection Map, travelTo deleted, BalanceConfig injected;
                         (B) named createCombat inputs; (G) newGame, summon, setPartySlot,
                         setPerkLevel, refundAllPerks, player gem roll
  rewards.ts        CHANGE (A) Instance shape, reads Creature.origin (id parsing deleted)
  balance-sim.ts    NEW  (H) deterministic balance simulator (location: ASSUMPTION 21)

vite.config.ts / vitest config   CHANGE (A) Vitest projects: Node for engine/data/state, jsdom for ui/app
```

### Vocabulary delta (master reference)

Cross-reference this table when implementing. "Deleted" rows are removed outright, not deprecated.

| Change | Kind | PR | One-line mechanism |
|---|---|---|---|
| `SpeciesCreature.name` (required) | Data field | A | Full display name, never assembled from species + creature |
| `Creature.origin { templateId, level, ref? }` | Engine type (engine-inert) | A | Run-layer identity on every combat creature; rewards read it |
| `materializeCreature(template, options)` | Signature | A | Named options object |
| `BalanceConfig` | Type (engine) + values (data) | A | Injected progression/economy parameters |
| `Instance = { id, source, level, xp, scriptId }` | State type | A | Opaque id; recipe source; everything else derived (`gems` added in G) |
| `collection: Map<InstanceId, Instance>` | State shape | A | Replaces buckets keyed by static creature id |
| `lastFloor` (was `currentFloor`); `travelTo` | State field / action | A | Rename; **deleted** |
| `{ ok: false, reason }` + `can…` queries | Store convention | A | Player-reachable failure; `descend` returns a result union |
| `CombatState.rng: { position }`, `nextRandom(rng)` | Engine state | B | Plain-data RNG bookmark; closure deleted |
| Per-fight effect-instance counter | Engine state | B | Unique instance ids; refresh keeps the id |
| Exact-instance check in `fireHook` | Resolver rule | B | A candidate fires only if its owning instance still exists |
| `createCombat({ seed, player, enemy, registries })` | Signature | B | Named per-side inputs |
| `Creature.baselineEffects` | Engine type | B | Resolved starting effects; `revive` restores exactly this |
| `CombatState.traits`, `CombatState.playerWideEffects` | Engine state | B | **Deleted** |
| `StatModifierDef.condition?: SelfCondition` | Effect field | B | Replaces `predicate` (function) — **deleted** |
| `innate-spell { spell }` | Passive `EffectDef` | B | Extra slot(s) placed before gem slots; no equip gate |
| `SpeciesCreature.equippedSpells` | Data field | B | **Deleted** |
| `MAX_REVIVES_PER_CREATURE = 10`, `Creature.revivesUsed` | Config + engine field | B | Ineligible dead allies excluded; empty pool fizzles, no draw |
| `actions.ts`: `checkLegality`, `resolveIntent`, `executeAction` | Module | C | One pipeline for every action source |
| Intent `{ action: RuleAction, targeting? }` + `gemSlot: 'random'` + `'random'` target | Type | C | Rule-shaped intent |
| `ResolutionContext { events, cascade, runAction }` | Transient resolver object | C | Replaces `onEchoCast` and loose `events`/`cascade` args |
| Optional rule targeting, side-aware default | Interpreter rule | C | `lowest-hp-enemy` / `lowest-hp-ally` by intended side |
| Implicit fallback as an intent | Interpreter rule | C | The fallback attack uses the side-aware default (`lowest-hp-enemy`) like any rule; script-less goldens are rewritten |
| Pre-hit fizzle | Resolver rule | C | Target dead after pre-hit hooks → that hit fizzles |
| Turn skeleton, turn-start cleanup, `TurnEnded` last | Turn structure | C | See CONVENTIONS "Turn structure" |
| `ActionStateEnded { creatureId, defending, provoking }` | Event (consequence family) | C | Emitted in turn-start cleanup only when a flag was set |
| `is-provoking` condition | Condition | C | **Deleted** |
| `Spell = { id, name, affinity, unlockedAtBiome, targetShape, targetSide, effects }` | Data type | D | Payload = response list; `payload`/`spellPower`/`scalingStat`/`statModifier`/`appliesStatus` **deleted** from `Spell` |
| `cast-target` | `ResponseTarget` | D | Current landed target, or nothing if dead |
| `perform-action { actor, intent }` | Response (verb) | E | Real action through the pipeline, queued until the granting action completes |
| `ActionGranted { sourceId, actorId, effectId }` | Event | E | Replaces `EchoCastGranted` — **deleted** |
| `bonus-cast` category, `TriggeredDef.echoCast` | Effect category / flag | E | **Deleted** (with `maybeFireBonusCast`, `runEchoCast`, `activeBonusCast`) |
| `StatusDef = { statusId, cap, polarity, defaultDuration, effects }` | Data type | F | Timed, stacking container of `EffectDef`s |
| `action-lock { scope }` | Passive `EffectDef` | F | Stun/Sleep `'all'`, Silenced `'cast'`, Pacified `'attack'` |
| `turn-order { position, breakChancePercent? }`, `friendly-fire { chancePercent }`, status damage-modifier | Passive `EffectDef`s | F | Re-express the old status categories |
| `TurnSkipped { creatureId, statusId }` | Event | F | An `'all'` lock skips the turn |
| `suppress-action` | Response (verb) | F | **Deleted** |
| Four `StatusDef` categories | Data types | F | **Deleted** (`condition-status`, `damage-modifier`, `turn-order-status`, `friendly-fire-status`) |
| No-temporary-stat-modifier validator | Load-time check | F | Statuses may not carry `stat-modifier` / `stat-remap` |
| Bearer-turn durations, ticks on `on-turn-end`, born-this-turn | Lifecycle | F | Round-end status sweep **deleted** |
| Silence (Violence), Pacify (Wit) | Content | F | Pure status spells |
| Six role scripts; `defaultScriptId` = role | Content | G | striker / guardian / warden / caster / support / opener |
| Full distinct enemy gem sets + safety net | Generation rule | G | ≥3 spells per affinity at biome 1 (data test) |
| Pounce, Stifling Weight, Life Siphon | Content | G | Biome-1 spells (Instinct / Endurance / Vitality) |
| `Instance.gems: spellId[]` | State field | G | Rolled and stored at creation until Phase 8 |
| `newGame({ seed })`, `summon`, `setPartySlot`, `setPerkLevel`, `refundAllPerks` | Store actions | G | See CONVENTIONS "State & persistence" |
| `PerkDef.phase` | Data field | G | **Deleted** |
| Balance simulator | Tool | H | Deterministic; real store + documented policy; loose CI thresholds |

**Response vocabulary after 4.1:** nine verbs (`deal-damage`, `apply-status`, `apply-stat-modifier`,
`heal`, `revive`, `grant-action-state`, `consume-stacks`, `remove-status`, `perform-action`). The
count is not the rule; **"no side doors"** is.

---

## 4.1-A — Data, store & generation

Items: **G3, G5 + S5, G6, A5, A6, A7 (with D1's defaults), S4.** No engine behaviour changes; the
engine goldens are untouched.

### G3 — creature names
- Add a **required `name`** (full display name) to `SpeciesCreature`; author it for every biome
  creature, boss, starter and the Unicorn. Biome creatures: species word + the creature's role name
  as the content docs already use them (e.g. "Treant Grovekeep", "Snapjaw Jaws"); bosses by their
  own names ("Broodmother", "Leech Sovereign", "Rot Sovereign").
- Starters, marked as **placeholders** in data (ASSUMPTION 25): **Glyphmoth Seer** (Sorcerer),
  **Cragfang Mauler** (Brute), **Stonehorn Warden** (Shieldbarer), **Unicorn Lightbearer**.
- The engine's combat `Creature` gets **no** name (the UI resolves it through `origin.templateId`).
- A data test: every `SpeciesCreature` has a non-empty `name`, and names are unique (ASSUMPTION 26).

### G5 + S5 — store action rule and the content frontier
- **Rule:** a player-reachable failure returns `{ ok: false, reason }` with state unchanged; an
  impossible state throws. Each action gets a pure `can…` query sharing its check.
- **`descend(floor)`** returns `{ ok: true, outcome } | { ok: false, reason }`, reasons `no-spec`,
  `empty-party`, `floor-out-of-reach`, `beyond-content-frontier`. `canDescend(floor)` returns the
  same result shape without running anything.
- **Content frontier** = the last floor whose biome has a non-empty species pool, **derived from the
  biome data** (never a constant). Reachable floors are `1 .. min(deepestFloor + 1, frontier)`
  (ASSUMPTION 23).
- The generator's own throw on an empty or zero-weight pool **stays**.
- Existing actions follow the rule where a failure is player-reachable (e.g. `pinBiome` on an
  invalid floor); list each action's reasons in the plan (ASSUMPTION 9 covers the new ones).

### G6 — hub plus atomic floor runs
- Rename `currentFloor` → **`lastFloor`** (the floor last fought; `descend` sets it on every run,
  success or failure).
- **Delete `travelTo`** and its tests. Fast-travel is `descend(floor)`.

### A5 — `Creature.origin` and named materialization
- `Creature.origin: { templateId: string, level: number, ref?: string }` — **required**,
  **engine-inert** (no engine code reads it; add a test or lint-level guard if cheap). `ref` is an
  opaque string; the store puts the `InstanceId` there.
- `makeCreature` (test helper) supplies a default `origin` so existing engine tests don't churn.
- `materializeCreature(template, { level, side, slot, speciesId, gems, ref? })` — named options
  (field names are the plan's). It fills `origin`.
- **Rewards read `origin`**: the soul bar is keyed by `origin.templateId`; **parsing the
  `CreatureId` suffix is deleted**. XP per kill = the victim's `origin.level` (ASSUMPTION 5).

### A6 — save-v1 `Instance` and the collection
- `Instance = { id: InstanceId, source: { kind: 'creature', creatureId } | { kind: 'fusion',
  identityParent, affinityParent }, level, xp, scriptId: string | null }`.
  - `id` is **opaque** (`inst-<n>` from the existing ordinal counter), never embedding a creature id.
  - Only `kind: 'creature'` is produced before Phase 8; the `fusion` variant exists in the type so
    save v1 never needs reshaping for it. Deriving a fused creature is Phase 8 (throw on `fusion` in
    materialization until then, ASSUMPTION 27).
  - `scriptId: null` means **"use the creature's default script"** (ASSUMPTION 6).
  - Affinity, traits, base stats and `hasFused` are **derived**, never stored.
- `collection: Map<InstanceId, Instance>`. `activeParty` keeps holding `InstanceId | null` slots.
- Update every consumer (`setSpec`'s starter grant, `runScriptedIntro`'s Unicorn grant, party
  resolution, XP application).

### A7 + D1 defaults — `BalanceConfig`
- **Engine owns the shape** (`balance-types.ts` or similar), **data owns the values**
  (`data/balance.ts`). Generation and the store **receive the config as an argument**; the store
  gets it through `GameStoreDeps` with `data/balance.ts` as the default.
- **Parameters, not functions.** The parameter set must be able to express **both** the new
  defaults **and** the Phase 4 placeholders (ASSUMPTION 3), so existing generation, store and
  integration tests can pin a "Phase-4 placeholder" config and pass unchanged. That is this slice's
  proof that moving the numbers changed nothing.
- **Contents:** enemy level range (multiplier curve + width), fight count, enemy party size, boss
  level offset, rarity spawn weights, soul gain per rarity, the XP curve, XP per kill, currency
  drops, summon cost.
- **Decided default values:**
  - fight count **`10 + (floor − 1)`**, uncapped (boss floors stay one fight);
  - enemy party size **+1 per floor over floors 1–6** (`min(6, floor)`, unchanged);
  - soul gain **25% common / 20% uncommon / 10% rare**;
  - enemy level multiplier **1.25 at floor 1 → 2.0 at floor 100** (linear), then **+0.01 per floor**
    after 100; the range formula is ASSUMPTION 4;
  - **XP per kill = the victim's level; XP curve `20 × level²`** (ASSUMPTION 5);
  - boss level offset, rarity spawn weights (6/3/1), currency drops and summon cost (0) keep their
    current values.
- Combat rule constants (affinity, chip, Defend, round cap, cascade depth) **stay** in
  `engine/config.ts`.

### S4 — Vitest environment split
- Vitest **`projects`**: `src/engine`, `src/data`, `src/state` in **Node**; `src/ui`, `src/app` in
  **jsdom** (new folders default to Node, ASSUMPTION 24). A test under `src/engine` that touches a
  DOM global must fail.
- Report the before/after test wall time in the PR.

### Acceptance (4.1-A)
- All engine goldens byte-identical (no engine logic changed).
- Existing generation/store/integration tests pass **unchanged** when given the Phase-4 placeholder
  config, apart from the listed XP expectations (ASSUMPTION 3); new tests cover the new
  defaults (fight count at floors 1, 10, 30; multiplier at floors 1,
  100, 101; soul gains).
- New tests: `descend` reasons (each one), `canDescend` agreeing with `descend`, the content
  frontier derived from biome data (a fixture biome list with 2 authored biomes gives frontier 20),
  `lastFloor` set on success and failure, rewards reading `origin` (a creature whose id suffix would
  have parsed wrongly), opaque instance ids.
- `travelTo` has no remaining references.

---

## 4.1-B — Engine foundations (byte-identical)

Items: **B3, B4, S1, S2, A8, D3.** Every item is golden-neutral by design; **the whole golden
suite must stay byte-identical.** Unit tests that assert specific instance-id strings are updated
and listed.

### B3 — plain-data `CombatState` and RNG
- `CombatState.rng` becomes a plain bookmark `{ position: number }` (the mulberry32 state word);
  rolls go through **`nextRandom(rng)`**. No closure, function or class instance anywhere in
  `CombatState`.
- `resolveTurn` makes a **per-turn working copy** when it starts; only that copy is ever changed.
  The input snapshot is never written to.
- A **deep-freeze test helper**; a test resolves the same frozen snapshot twice and asserts identical
  `{ state, events }` (the review's probe, now a permanent test). Existing tests that reuse
  snapshots adopt the helper.
- Same rolls in the same order ⇒ goldens byte-identical. The CONVENTIONS rule is already written.

### B4 — unique effect instance ids and the exact-instance rule
- A **per-fight counter** in `CombatState` issues every effect instance id: innate traits, side
  effects (perks), statuses, and revive's re-instantiation. **Refreshing a status keeps its
  instance and id.** Per-trigger guard ids derive from the owning status instance id (as today's
  `#trigger#<index>` scheme does, but on a unique base).
- `fireHook` builds its candidate list once, then **fires each candidate only if its exact owning
  instance is still on the creature** when its turn comes.
- **New fixture golden(s):** (1) cleanse-then-tick: a trigger earlier in the same hook pass removes
  a status whose trigger would fire later in that pass → the later trigger doesn't fire; (2)
  remove-then-reapply: a status removed and reapplied inside one cascade → the old instance's
  pending trigger doesn't fire, the new one follows the normal rules. Hand-derived.
- Instance ids never appear in events ⇒ existing goldens byte-identical.

### S1 — named `createCombat` inputs and `baselineEffects`
- `createCombat({ seed, player: { party, effects }, enemy: { party, effects }, registries })`.
  `registries` bundles scripts, traits and statuses. Each side's `effects` apply to that side's
  creatures; a side mismatch, an unknown trait id, or an already-set-up input creature throws
  (added at the PR #69 review).
- Each creature stores **`baselineEffects`** (innate → side effects → [Phase 8 infusions]) at fight
  setup; **`revive` restores exactly that list** with fresh instance ids (B4).
  `CombatState.traits` and `CombatState.playerWideEffects` are **deleted**.
- Update every call site (store, demo harnesses, goldens' setup code — setup code only; expected
  logs must not change).

### S2 — `SelfCondition` replaces the predicate function
- `StatModifierDef.condition?: SelfCondition` (`hp-percent` self, `has-status` self, `always`);
  **`predicate` is deleted.**
- A **load-time validator** rejects a condition that reads the stat it modifies (e.g. a Health
  modifier gated on HP%).
- `hp-percent` divides by **max HP** (`floor` of effective Health), shared with scripting's
  `hp-percent` Condition (decided at the PR #69 review; golden-neutral).
- Re-author the placeholder `BLOODLUST` (+25% Attack at full HP) with a condition; the
  conditional-passive golden stays byte-identical.

### A8 — innate spells
- A passive **`innate-spell { spell }`** effect category. Arcane Surge (the Seer's trait) gains
  `innate-spell { spell: ARCANE_BOLT }`.
- A creature's spell array = **innate spells first** (in trait order), then its regular gem slots.
  Innate spells are prepended at **fight setup** (`createCombat`), not at materialization; the
  Seer's fight-setup array stays byte-identical (Arcane Bolt at index 0, three empty slots).
  (Placement confirmed at the PR #69 review.)
- **No equip gate** applies to innate spells.
- **`SpeciesCreature.equippedSpells` is deleted.**
- Tests: a fixture "fused" creature carrying Arcane Surge on a non-Wit affinity still has Arcane Bolt
  castable; the Seer golden is byte-identical.

### D3 — the revive cap
- `MAX_REVIVES_PER_CREATURE = 10` in `engine/config.ts`; `Creature.revivesUsed` counts per fight.
- Revive targeting **excludes dead allies at the cap**; an empty eligible pool fizzles
  (`TriggerFired` only) and **draws no random number**.
- A focused golden: a fixture revive engine reaching the cap (the 11th attempt on the same ally
  fizzles, or picks another eligible ally). Hand-derived.

### Acceptance (4.1-B)
- **Full golden suite byte-identical** (show the diff is empty).
- The frozen-snapshot double-resolve test passes; the B4 and D3 goldens are new; no `predicate`,
  `equippedSpells` on `SpeciesCreature`, `CombatState.traits` or `playerWideEffects` remains.

---

## 4.1-C — One action pipeline and the turn skeleton

Items: **A1, B1, B2, B5, D6 skeleton** (+ deleting `is-provoking`). This PR carries deliberate
golden changes, listed below; everything else stays byte-identical.

**Split into two PRs (decided at the 4.1-C plan review), one golden policy each.** Applying each
C change alone to `main` @ `c9ba34b` showed that **all existing-golden churn comes from D6**; B1,
B2 (including rule 4) and B5 change no existing golden, so each needs a new discriminating golden.
- **C1 — D6 skeleton + delete `is-provoking`.** Deliberate; exactly 11 goldens change. `TurnEnded`
  reorders in `golden-b4-cleanse-then-tick`, `golden-b4-remove-then-reapply`,
  `golden-heal-scaling-count`, `golden-heal-scaling-stat` (the "three `on-turn-end` goldens" below
  predate the two B4 goldens) and `golden-sorcerer-starter`. `ActionStateEnded` is added in
  `golden-defend-count-additive-cap`, `golden-defend-count`, `golden-on-action-hooks`,
  `golden-provoke-redirect`, `golden-scripted-1v1` and the integration golden `golden-6v6-scripted`
  (regenerated, checkpoint-verified). `golden-shieldbarer-starter` asserts first-turn events only
  and does not change. The bonus cast sits in the granted-actions step but is still today's
  executor. New: the B6 golden.
- **C2 — A1 pipeline + `ResolutionContext` (full threading, as CONVENTIONS specifies) + B1 + B2
  + B5.** **Every existing golden stays byte-identical**; the only deliberately changed existing
  test is the interpreter unit test that pinned "a targeting-less rule is skipped". The
  "script-less fallback retargets" category below turns out to be **empty** (every existing
  fallback golden has coinciding targets), so C2 adds a discriminating fallback golden. Rule 4 is
  a real change (today's instance fallback is first-by-slot with no Provoke) and
  `getDefaultTarget` is deleted. Draw order is pinned for byte-identity: `gemSlot: 'random'` draws
  before the target; the `'random'` target draws over today's `random-enemy`/`random-ally` pool
  and order. On a skipped turn, bonus-cast still rolls its chance (a passive turn-end effect) and
  the granted cast is then refused. C2 adds the corpus digest from "Verification". If C2 is too
  large, it splits into a pure refactor and the behaviour changes, both byte-identical.
- **C2 splits into C2a and C2b (decided at the PR #71 review).** Both keep every existing golden
  byte-identical.
  - **C2a — pure plumbing, no behaviour change.** It adds `actions.ts`, the full
    `ResolutionContext` threading, `Intent`, `gemSlot: 'random'`, the `'random'` selector and
    `decideAction → Intent`, and reroutes bonus-cast and echo through `runAction`. It reproduces
    today's semantics exactly: a differential run against `main` must show identical event logs.
    Wherever today's behaviour differs from the final pipeline, C2a keeps today's behaviour
    behind a **named, C2a-only switch**, and C2b deletes each one:
    - **`legacyGrantedTargeting`**, an option on `runAction` passed only by bonus-cast and echo.
      It makes the granted cast's target skip Confusion → Tunnel Vision → Provoke, as today.
    - **The interpreter's "a rule needs explicit targeting" gate** and the first-by-slot default
      (`legacyDefaultTarget`).
    - **The unfiltered `gemSlot: 'random'` draw.** It draws over every non-null slot, as today's
      bonus-cast and echo do.

    C2a also replaces the seed sweep with the **corpus digest** (see "Verification"). It adds a
    load-time check that the `'random'` selector never appears in a response target (CONVENTIONS,
    "One action pipeline").
  - **C2b — the behaviour changes (B1, B2, B5).** Each flip deletes one C2a switch, or adds B5's
    guard. Each lands with a discriminating golden, shown failing with the flip undone:
    - **B1:** the default becomes side-aware (the fallback golden above), and targeting-less
      rules become valid.
    - **B2.1 / B2.2:** a skipped turn, or Silence, refuses a granted cast (goldens as listed
      under B2).
    - **B2.3:** delete `legacyGrantedTargeting`. Goldens: a confused creature's bonus cast can
      redirect, and a Provoke redirects an echo.
    - **B2.4:** the rule-4 re-target.
    - **The castable-filtered gem draw** (`gemSlot: 'random'` over `castableGemSlots`,
      ASSUMPTION 13). This is **not** equivalent to today's draw. Win/loss is checked only after
      `TurnEnded`, so a granted cast after the killing blow runs against an empty enemy side.
      Today it fizzles if it rolls an enemy-side spell; the filtered draw picks a castable spell
      instead. Golden: a bonus-caster with [enemy spell, ally spell] kills the last enemy, and the
      bonus cast lands the ally spell.
    - **B5:** the pre-hit fizzle.

    The corpus digest changes in C2b. The PR lists how many corpus fights changed and which of the
    flips above accounts for them.
  - **C2b is built as two PRs (decided at the 4.1-C2b plan review).** Both follow the same policy,
    and the flip order above is kept.
    - **C2b = B1 + the castable-filtered gem draw.** It deletes `ruleNeedsExplicitTargeting`.
    - **C2c = B2.1–B2.4 + B5.** It deletes `legacyGrantedTargeting`, `legacyDefaultTarget` and
      `getDefaultTarget`.

    Between the two PRs, `legacyDefaultTarget`/`getDefaultTarget` survive only for rule 4's
    instance fallback, and `legacyGrantedTargeting` survives unchanged. Each PR regenerates the
    digest once and attributes its own flips. The phase record gets a `4.1-C2b` section and a
    `4.1-C2c` section.

### A1 — `actions.ts`
- **Intent** = `{ action: RuleAction, targeting?: TargetSelector }`; `RuleAction`'s cast gains
  **`gemSlot: number | 'random'`** (random = uniformly among castable gems, ASSUMPTION 13), and
  `TargetSelector` gains a **`'random'`** variant (uniform over living creatures on the action's
  intended side, ASSUMPTION 14).
- **`checkLegality(actor, intent, state)`** — pure, draws nothing: locks (today's scoped suppression;
  `action-lock` once F lands), empty slot, no castable gem, no valid target. The interpreter's
  lookahead calls it; `isActionSuppressed` moves into it.
- **`resolveIntent(actor, intent, state)`** — the only place action-level draws happen: target =
  explicit selector → side-aware default (B1) → random; then, for an enemy-side single target,
  Confusion → Tunnel Vision → Provoke.
- **`executeAction`** — the executors move here from `combat.ts`.
- **`ResolutionContext { events, cascade, runAction }`**, created per top-level action by the action
  layer and threaded through the resolver (replacing `onEchoCast` and the separate `events` /
  `cascade` arguments). `fireHook`'s per-call specifics (observation context, etc.) move to an
  options object. The context is never stored in `CombatState`.
- **No import cycle:** `resolution.ts` never imports `actions.ts` or `combat.ts`; it reaches actions
  only through `ctx.runAction`.

### B1 — optional targeting with a side-aware default
- A rule's `targeting` is **optional**. Missing ⇒ `lowest-hp-enemy` for Attack and enemy-side spells,
  `lowest-hp-ally` for ally-side spells. Explicit targeting always wins, **including cross-side**
  (no engine side ban).
- `always-cast` **drops its explicit selector**.
- The **implicit fallback** (no rule matched) becomes an ordinary intent through the pipeline,
  `{ action: attack }` with no targeting, so it gets the **side-aware default (`lowest-hp-enemy`)**
  like any rule. Phase 1's "first living enemy by slot" default is retired, with no special case
  left behind (ASSUMPTION 2). This deliberately changes the script-less goldens (below).
- A fixture golden: an enemy support caster with an ally heal under `always-cast` heals its own
  lowest-HP ally (the review's probe inverted).

### B2 — one rule set for every action source
Every action — script rule, fallback, **bonus-cast, echo-cast** — goes through the pipeline:
1. A creature whose turn is skipped takes **no action of any kind**; passive turn-end effects still
   fire.
2. Silenced blocks every cast, chosen or granted (Clear Mind immunity applies).
3. Extra actions pick a target (the side-aware default for bonus-cast, `'random'` for echo), then go
   through Confusion → Tunnel Vision → Provoke.
4. When a single-target instance list's first target has died, later instances use the side-aware
   default, then Provoke.
- In this PR, bonus-cast and echo-cast keep their **data shape and events** (they become data in
  E) but are **rerouted through `resolveIntent`/`executeAction`** (ASSUMPTION 17). Bonus-cast runs
  in the skeleton's **granted-actions** step.
- Fixture goldens: a Stunned bonus-caster takes no bonus cast; a Silenced one doesn't cast; a
  confused one's bonus cast can redirect; a Provoke redirects an echo.

### B5 — pre-hit fizzle
- After an instance's pre-hit hooks (`on-attack` / `on-cast` / `on-action-observed`), re-check the
  target: if dead, **that hit fizzles** (no damage, no status, no payload, no `on-damage-dealt`).
  Later instances fall back per rule 4. AOE already skips dead members.
- A fixture golden: an `on-attack` damage trait kills the target; the main hit fizzles; a second
  instance (Brute-style) re-targets.

### D6 skeleton
Per CONVENTIONS "Turn structure":
- `TurnStarted` → turn-start hooks → **turn-start cleanup** (defending/provoking end; **runs on
  skipped turns too**, fixing B6; emits `ActionStateEnded { creatureId, defending, provoking }`
  only when a flag was set) → decide + action → **turn-end hooks** → **granted actions** →
  **turn-end cleanup** → `TurnEnded`.
- `TurnEnded` is always last (Phase 4 fired `on-turn-end` hooks and the bonus cast after it).
- In this PR, **turn-end cleanup is a seam**: statuses still count down in the round-end sweep and
  the Web roll stays at turn start until F (ASSUMPTIONS 15, 16).
- **Delete the `is-provoking` condition** (it can never be true when its own script runs once
  provoking ends at turn start). Remove it from the union, the evaluator and any test.
- A fixture golden: a provoking creature Stunned before its next turn stops provoking at that turn's
  start (B6).

### Deliberate golden changes (4.1-C) — the PR lists each file
- The **three `on-turn-end` goldens** reorder (hooks now inside the bracket, before `TurnEnded`).
- The **six Defend/Provoke goldens** gain `ActionStateEnded`.
- The **bonus-cast** golden(s): the cast moves before `TurnEnded`; any target change from the
  added pipeline (Confusion/Provoke) is explained.
- Any golden where a Brute-style second instance re-targets after its first target died (rule 4).
- **Every golden where a script-less creature attacks with more than one living enemy** whose
  first-by-slot and lowest-HP targets differ (the implicit fallback now targets the lowest-HP
  enemy). This reaches back to Phase 1–3 goldens: each **hand-derived** one is **re-derived by
  hand** (arithmetic in comments updated), never regenerated; integration goldens are regenerated
  and checkpoint-verified. Goldens where the two targets coincide (1v1, one living enemy) must not
  change.
- **Everything else byte-identical.** Rule-level B1 changes nothing on its own: the only existing
  ally-spell goldens use explicit `lowest-hp-ally` targeting or an AOE cast.

---

## 4.1-D — Spells carry responses (byte-identical)

Item: **A4.** A pure re-expression. **Every golden must stay byte-identical; any difference is a
parity bug**, not a golden to regenerate.

- `Spell = { id, name, affinity, unlockedAtBiome, targetShape, targetSide (required), effects:
  EffectResponse[] }`. Delete `payload`, `spellPower`, `scalingStat`, `statModifier`, `appliesStatus`
  from `Spell` (the magnitude fields live on the responses).
- New **`cast-target`** `ResponseTarget`: the current landed target, or nothing if it's dead.
- **Effects run once per landed target, in list order.** Single-target: the one target. AOE: each
  frozen, still-living member in slot order (today's loop).
- **Parity rules the plan must pin and test** (these are what keep it byte-identical):
  - A spell's `deal-damage` uses the **cast** offensive slot (remap-aware Intelligence by default,
    or its `scalingStat`), tags `damageSource: 'cast'`, counts as a cast for `cross-stat` /
    `conditional-damage-bonus` / Splashing (never splashes), and emits **no `TriggerFired`** (a
    chosen action, not a trigger).
  - `heal` and `apply-stat-modifier` from a spell emit no `TriggerFired` either (Slice E rule).
  - An `apply-status` after damage targets `cast-target`, so a target killed by the damage gets no
    status (today's `applyStatusIfAlive`).
  - The instance list's `powerPercent` scales `deal-damage` and `heal` only.
  - The `on-cast` / `on-action-observed` firing points and their order are unchanged.
- Re-express **every** spell in `src/data/spells/*` and every spell fixture. Content docs don't
  change (behaviour is identical).
- Gem augments (Phase 8) will "append responses": no code for that now.

### Acceptance (4.1-D)
- **Full golden suite byte-identical.** Plus a unit test per payload kind (damage, heal,
  stat-modifier, damage + status, AOE + status) asserting identical events old-vs-new on a fixture.

---

## 4.1-E — `perform-action`

Item: **A2.** Bonus-cast and echo-cast become data.

- New response **`perform-action { actor: 'self' | 'triggering-source', intent }`**, executed via
  `ctx.runAction` through the A1 pipeline.
- **Actions are atomic:** a granted action is **queued** on the context and runs **after the
  granting action (all its instances) completes**. Grants during the turn-end hooks run in the
  skeleton's granted-actions step. Responses stay nested and immediate.
- **Bounded by cascade depth**, not the self-re-entry guard: a granted action inherits depth + 1; an
  echo chain may pass through the same Overtone.
- **`ActionGranted { sourceId, actorId, effectId }`** right after `TriggerFired` when the grant
  succeeds; a grant whose actor can't act or has nothing legal fizzles with `TriggerFired` only.
  `EchoCastGranted` is deleted.
- **Content:**
  - Arcane Surge: `on-turn-end`, `chancePercent: 50` → `perform-action(self, { action: { kind:
    'cast', gemSlot: 'random' } })`.
  - Resonant Overtone: `on-action-observed` (ally cast), `chancePercent: 10`, `stacks: false` →
    `perform-action(triggering-source, { action: { kind: 'cast', gemSlot: 'random' }, targeting:
    'random' })`.
- **Delete** the `bonus-cast` category (`BonusCastDef`, `activeBonusCast`, `maybeFireBonusCast`),
  `TriggeredDef.echoCast` and `runEchoCast`.
- **Data test:** every `perform-action` trigger carries a `chancePercent` or a `condition`.
- **RNG draw order**, documented in code and in the golden comments: chance gate at trigger time →
  (after the granting action completes) random gem → random target.

### Deliberate golden changes (4.1-E)
- **Bonus-cast goldens** gain `TriggerFired` + `ActionGranted`; the cast sits in the granted-actions
  step.
- **Echo goldens**: `EchoCastGranted` → `ActionGranted`, and the echo now follows the original cast's
  full payload instead of interrupting it.
- A new fixture golden: an echo chain passing through the same Overtone twice, truncated by a
  lowered depth cap in the fixture (or by chance), asserting `CascadeTruncated` if truncated.

---

## 4.1-F — Statuses as effect containers, status timing, the Web roll, Silence & Pacify

Items: **A3, D6 status timing, D5, G2.**

### A3 — statuses carry `EffectDef[]`
- `StatusDef = { statusId, cap, polarity, defaultDuration, effects: EffectDef[] }`. Re-express every
  status:
  - Poison, Burn, Regen, Spore: `triggered` effects (ticks now on **`on-turn-end`**, below).
  - Weaken, Vulnerability, Glow: a passive stack-scaled damage-modifier (dealt or taken).
  - Web: `turn-order { position: 'last', breakChancePercent: 10 }`; Grant Act First:
    `turn-order { position: 'first' }`.
  - Confusion: `friendly-fire { chancePercent: 50 }`.
  - Stun, Sleep: `action-lock { scope: 'all' }` (Sleep keeps `on-damage-taken →
    remove-status(self, sleep)`).
- **A status's effects receive its `stacks` as their default count**; non-numeric passives ignore it.
- **Immunity is checked once, in the effect iterator**; delete `isActionSuppressed`'s remains and
  `activeFriendlyFireStatus`'s immunity branch. An immune Confused creature still draws **no** RNG.
- **`suppress-action` is deleted.** A skipped turn emits **`TurnSkipped { creatureId, statusId }`**
  (if two `'all'` locks are active, the first in canonical effect order names it, ASSUMPTION 28).
- **Load-time validator:** a status carrying `stat-modifier` or `stat-remap` fails to load.
- Delete the four old `StatusDef` categories and their bespoke readers.

### D6 status timing
- **Durations count the bearer's own turns**: in the bearer's **turn-end cleanup**, each of its
  statuses counts down and expires at 0 (`StatusExpired`).
- **DoT/HoT ticks** are status triggers on **`on-turn-end`**, so they run in the turn-end hooks,
  before the countdown.
- **Born-this-turn rule:** a status applied or refreshed during its bearer's own turn neither ticks
  nor counts down that turn. Track this without new persistent state if possible (e.g. compare the
  instance's application turn to the current turn); the plan pins the mechanism (ASSUMPTION 18).
- **Delete the round-end status sweep** (`snapshotStatuses`, `decrementAndExpireSnapshot`, the
  status part of `resolveRoundEndSweep`). Round end keeps `on-round-end` trait triggers and the win
  check.
- Win/loss check points inside the turn: the plan pins them (ASSUMPTION 19).

### D5 — the Web roll
- Keep the **global** roll: **10% per Web bearer at every creature's turn**. The chance lives on
  Web's `turn-order` effect (`breakChancePercent`), the roll happens in **turn-end cleanup**, it
  skips Webs applied during the current turn, and it follows the roll-only-when-present discipline.

### G2 — Silence and Pacify
- **Silenced** (`action-lock { scope: 'cast' }`) and **Pacified** (`action-lock { scope: 'attack' }`)
  statuses: cap 1, `defaultDuration: 3`, polarity debuff (ASSUMPTION 30).
- **Silence** (Violence) and **Pacify** (Wit): single enemy, `effects: [apply-status(cast-target,
  silenced | pacified)]` (duration omitted, inherited), `unlockedAtBiome: 1`, no damage.
- Content doc entries move from the pending section into the Overgrowth spell table.
- Focused goldens: Silence stops a caster's cast (it falls through its script); Pacify stops an
  attacker; Clear Mind / Aggressive immunity lets the action through while `has-status` stays true.

### Deliberate golden changes (4.1-F)
- **Every status golden changes timing**; the Phase-3 round-end goldens (`golden-dot`,
  `golden-round-end-interaction`, `golden-round-end-mid-sweep-poison(-refresh)` and every golden
  whose statuses count down or tick) are **rewritten as hand-derived turn-end equivalents**.
- A new **turn-end interaction golden**: a DoT tick kills its bearer, whose `on-death` applies a
  status; assert `on-death` fires, the new status follows the born-this-turn rule, and the win check.
- The **stun and sleep goldens** gain `TurnSkipped` and lose the no-op `TriggerFired`.
- The **scoped-suppression golden** is rewritten on `action-lock`.
- The **Web break-free golden** moves its roll to turn-end cleanup.
- Glow, Weaken, Vulnerability, Confusion goldens: only timing changes may appear; the modifier math
  must be identical.

---

## 4.1-G — Hub actions and enemy behaviour

Items: **D2, G4, §6, D4** (including B1's "a cast-role creature with no usable spell throws").

### D2 — summoning and party slots
- **`summon(creatureId)`**: requires 100% soul; free (`BalanceConfig.summonCost`, default 0);
  unlimited duplicates; creates an `Instance` (level 1, rolled gems, `scriptId: null`) and
  **auto-places it into the first empty party slot**, if any (ASSUMPTION 11). No Soul Altar gate
  until Phase 8.
- **`setPartySlot(slot, instanceId | null)`**: **swap semantics** (placing an instance already in
  another slot swaps the two; `null` empties the slot). Emptying every slot is allowed; `descend`
  then refuses with `empty-party` (ASSUMPTION 10).
- The **Unicorn** is permanently owned (it can't be removed from the collection; nothing removes
  instances yet anyway) but **can be benched**.
- `can…` queries for both; reasons per ASSUMPTION 9.

### G4 — perk actions
- **`setPerkLevel(perkId, level)`** (absolute level: buy and refund are one call) and
  **`refundAllPerks()`**. Invalid → `{ ok: false, reason }`: `no-spec`, `perk-not-in-spec`,
  `invalid-level` (not a whole number in `0..maxLevel`), `over-budget` (total spend >
  `bossesCleared × 100`).
- **No gating of Phase-8-inert perks.**
- **Delete `PerkDef.phase`.** Each inert perk gets a comment (e.g. `// Inert until Phase 8 (gem
  system) — see sorcerer.md`). The data test keeps an explicit list of the **9 known-inert perk ids**
  (the five Masteries, Arcane Shields, Arcane Versatility, True Wit, Shield Specialist); every perk
  **not** on the list must have ≥1 effect at max level.

### §6 — `newGame({ seed })`
- A store action that resets to a fresh game with the given run seed. The seed is generated in
  **`src/app`** (never the store or engine) (ASSUMPTION 12). `snapshot`/`hydrate` are **not** built
  here (Phase 5).

### D4 — role scripts, gem sets, new spells, player gems
- **Six role scripts** in `data/scripts.ts`, exactly as CONVENTIONS "Role scripts" tabulates them
  (`striker`, `guardian`, `warden`, `caster`, `support`, `opener`). `support`'s first rule draws only
  among ally-side gems (the intent gains a side filter; the shape is the plan's). The five `always-*`
  stock scripts stay.
- **Roles per creature**: set every `defaultScriptId` from the content docs' "Roles" tables. Across
  the 54 creatures and 3 bosses: 27 strikers (incl. Broodmother and Leech Sovereign), 10 wardens
  (incl. Rot Sovereign), 2 guardians (Treant Sapling, Myconet Gravedigger), 10 casters, 3 supports,
  4 openers, and Snapjaw Lure on `always-provoke`. Starters and the Unicorn per ASSUMPTION 8.
- **Full distinct enemy gem sets:** every enemy rolls one distinct spell per regular gem slot (3)
  from its affinity's spells with `unlockedAtBiome ≤` the current biome. Duplicates **only** as a
  safety net when the pool is smaller than the slot count. Replaces "cast-role enemies roll ≥1".
- **Data tests:** ≥3 spells per affinity at biome 1; every cast-role creature (`caster`, `support`,
  `opener`) has a usable spell at its biome. At generation, a cast-role creature with no usable spell
  **throws**.
- **Three new biome-1 spells** (placeholder numbers, tuned in H — ASSUMPTION 20):
  - **Pounce** (Instinct): single enemy, `deal-damage` scaling off **Speed**.
  - **Stifling Weight** (Endurance): single enemy, `apply-status(weaken)` only.
  - **Life Siphon** (Vitality): single enemy, `deal-damage` + `heal(self)`.
- **Player gem sets:** every newly created player instance (starter grant, Unicorn, summon) rolls a
  **distinct, affinity-matched gem set and stores it** as `Instance.gems: spellId[]`
  (ASSUMPTION 7). `materializeCreature` receives it. The Seer's innate spell comes on top.
- Content docs: fold the roles and new spells from each doc's pending section into its body.

### Acceptance (4.1-G)
- Store tests for every new action and reason; `can…` agreement tests.
- Generation tests: full distinct sets, the safety net on a fixture pool of 2, the cast-role throw.
- **Mechanism goldens unchanged** (they use fixtures). The per-biome content goldens (e.g.
  `golden-broodmother`, `golden-pollinator-pollenlord`, also in `src/engine/__golden__`) and the
  integration test change where a creature's script or loadout changed: regenerate the integration
  golden (labelled generated-then-checkpoint-verified) and re-derive each affected hand-derived
  biome golden, listing each.

---

## 4.1-H — Balance simulator and first tuning pass

Item: **D1** (simulator, bands, CI thresholds, tuning).

- A **deterministic balance simulator**: drives the **real store** (`newGame`, the intro, `setSpec`,
  `descend`, `summon`, `setPartySlot`, `setPerkLevel`) with a **documented simple player policy**
  (ASSUMPTION 21) over a fixed set of seeds, and reports:
  - **T1** floor-1 clear rate (target ≥95% of seeds);
  - **T2** floor clears until the first soul completes (target ~10);
  - **T3** party size after the first session = the first 10 floor runs (target 6);
  - **T4** the deepest floor reached before a hard wall (target: no wall before the floor-10 boss);
  - **T5** party level vs floor, and enemy level vs floor (target: party ≈ floor, enemy per the
    multiplier curve).
- Output is a readable report (a table per spec). **CI asserts only loose "badly broken"
  thresholds** (ASSUMPTION 22); bands are reported, not asserted.
- **First tuning pass**: adjust `BalanceConfig` values and the numbers of the three new spells (and
  any creature/spell numbers the report shows as outliers) toward the bands. Record the before/after
  report in the PR and in the phase record. Content-doc numbers follow the data in the same PR.
- Watch points to report explicitly: fight-count compounding (floor success vs per-fight win rate),
  floors 20–30, and the Unicorn's revive strength under the cap.

### Acceptance (4.1-H)
- The simulator is deterministic (same seeds → identical report, asserted).
- CI threshold test green; the report in the PR shows where each target band landed.
- Mechanism goldens untouched; content goldens re-derived/regenerated and listed where numbers
  changed.

---

## Verification (whole phase)

- Four gates green after **every** PR.
- **Byte-identical PRs** (B, D): an empty golden diff, shown.
- **Deliberate-change PRs** (C, E, F): every changed golden listed with its reason; the diff of
  each old golden contains only the listed kind of change.
- **Determinism:** the frozen double-resolve test (B) stays green through the phase.
- **Behaviour tripwire: the corpus digest, from C2a on** (PR #71 review; CONVENTIONS "Testing").
  - **What it does:** one test hashes the event log of every fight in a fixed real-content corpus
    and compares the hashes against a committed, generated fixture.
  - **Byte-identical PRs** leave it unchanged. **Deliberate PRs** regenerate it and attribute the
    changed fights.
  - **Why it replaces the seed sweep:** the sweep only checked "same seed → identical log". Over a
    pure engine that can fail only through hidden state or input mutation, and the frozen test
    already covers mutation. The sweep also compared against nothing, so it could not catch
    drift.
- **Loop safety re-check** in E: `perform-action` chains are depth-bounded; the data test forbids
  unconditional grants.
- **Purity:** engine tests run in Node (S4); no `src/engine` import of data/state/ui.
- End of phase: a phase record `phases/phase-4.1-fix-and-consolidation.md` (outcome, per-PR notes,
  the simulator's before/after report), and this brief's status flipped to shipped.

## Assumptions checklist (review before implementation)

Choices this brief had to make that the review didn't pin. Each slice's own plan adds its own,
ASSUMPTION-tagged, and this list is what the design review checks.

1. **Confirmed.** Eight slices, lettered **A–H**, each under one golden policy. A coding plan may
   merge two adjacent slices only if both are byte-identical or both deliberate, and it says so.
   Consequence: **G2 lands in F, two slices after A4** (not "right after" it), because
   Silenced/Pacified are authored on A3's `action-lock`, which F builds.
2. **Confirmed (design owner).** The implicit fallback is an ordinary intent (`{ action: attack }`)
   through the pipeline and gets the **side-aware default (`lowest-hp-enemy`)** like any rule. Phase
   1's first-by-slot default (`getDefaultTarget`) is retired, and the **old goldens that depended on
   it are changed deliberately** in C (hand-derived ones re-derived by hand). This overrides the
   review's "B1 byte-identical" requirement for the fallback only.
3. **`BalanceConfig`'s parameter shape can express the Phase 4 placeholders**, and existing tests
   pin a "Phase-4 placeholder" config, proving the move changed nothing. The one exception is XP,
   whose per-kill basis and curve change (ASSUMPTION 5): the store-test expectations that change
   because of it are listed in the PR.
4. **Enemy level range:** `min = round(floor × m(floor))`, `max = min + 2 + floor(floor / 10)` (the
   Phase 4 width rule, shifted), with `m(floor) = 1.25 + 0.75 × (floor − 1) / 99` for floors 1–100
   and `2.0 + 0.01 × (floor − 100)` after; boss level = `max + 3`. Rounded half-up; the plan shows
   the computation is float-safe (e.g. done in hundredths).
5. **XP per kill = the victim's level** (`1 × origin.level`; decided by the design owner; was
   `10 × floor`), awarded to every party member as today. **The XP curve becomes quadratic:
   `xpForNextLevel(level) = 20 × level²`** (was `100 × level`). Reasoning: one clear of floor *f*
   yields kills ∝ *f* (fight count × enemies) at victim levels ∝ *f*, so about **12–20 × f² XP**
   (computed from the decided fight count, enemy count and ASSUMPTION 4's level range: floor 1 ≈
   20, floor 10 ≈ 1,650, floor 30 ≈ 10,900, floor 100 ≈ 135,000). A linear curve would let the party
   outrun the floor more and more with depth; a quadratic one keeps **party level ≈ floor** at every
   depth. The coefficient 20 means roughly one level per 1–1.5 clears at the matching depth, leaving
   room for re-farming. Coefficient and exponent are `BalanceConfig` parameters; H tunes them.
   Currency drops stay floor-based.
6. **`Instance.scriptId: null` means "the creature's default (role) script"**, resolved at
   materialization, so a role change in data flows to instances that never had a custom script.
7. **Player gem roll:** distinct spells matching the creature's affinity, from spells unlocked at the
   biome of `max(1, deepestFloor)`, one per regular gem slot (3), drawn from an RNG derived from
   `(runSeed, instance ordinal)` so gem rolls never shift floor draws; duplicates only via the same
   safety net as enemies.
8. **Confirmed.** **Starter and Unicorn roles:** Glyphmoth Seer → `caster`; Cragfang Mauler → `striker`;
   Stonehorn Warden → `always-provoke` (like Snapjaw Lure, its trait fires on Provoke); Unicorn
   Lightbearer → `striker` (its revive fires on attack).
9. **Failure reasons:** `summon` → `unknown-creature`, `soul-incomplete`; `setPartySlot` →
   `slot-out-of-range`, `unknown-instance`; `setPerkLevel` → as listed in G4; `pinBiome` →
   `floor-out-of-range`, `unknown-biome`. `setSpec` with an unknown id **throws** (the UI only offers
   real specs, so it is an impossible state).
10. **An empty party is allowed** by `setPartySlot`; `descend` refuses it (`empty-party`).
11. **`summon` auto-places into the lowest-index empty slot**; with none free, the instance only joins
    the collection.
12. **`newGame({ seed })` resets everything** (spec, collection, souls, perks, bosses, depth,
    `lastFloor`, currencies, counters) and leaves the scripted intro to be run separately; `src/app`
    generates the seed with `crypto.getRandomValues`.
13. **`gemSlot: 'random'`** picks uniformly among the actor's **castable** spells, innate included:
    non-empty, not locked, with at least one valid target on its intended side.
14. **`'random'` target** = uniform over living creatures on the action's intended side (today's
    echo draw), then the override pipeline for enemy-side single targets.
15. **C leaves the Web roll at turn start**; F moves it to turn-end cleanup.
16. **C leaves the round-end status sweep in place**; F deletes it. C's turn-end cleanup is a
    seam with no status work.
17. **In C, bonus-cast and echo-cast keep their data shape and events** but run through the
    pipeline (bonus-cast in the granted-actions step); E turns them into `perform-action`.
18. **Born-this-turn tracking** uses the minimum state that works (e.g. stamping an instance with the
    turn it was applied or refreshed); the F plan pins it and shows it adds nothing to events.
19. **Win/loss check points inside a turn** (after the action, after each turn-end hook firing that can
    kill, after each granted action) and whether `TurnEnded` is still emitted when the fight ends
    mid-turn: the F plan pins them, matching today's "the fight ends the instant a side is wiped".
    PR #70 review data point: today `resolveTurn` checks only once, after `TurnEnded`. Adding the
    in-turn checks is golden-neutral on the C1 suite (verified by mutation), but once DoTs tick on
    `on-turn-end` the end-only check turns a win into a **draw** when the last living creature on
    the winning side dies to its own tick after emptying the other side. F's win-check golden
    covers exactly that case.
20. **New spell placeholder numbers:** Pounce 100% Speed; Stifling Weight Weaken at its default
    duration; Life Siphon 70% Intelligence damage + heal self for 35% of Intelligence. Tuned in H.
21. **Simulator policy and home:** `src/state/balance-sim.ts` (runs in Node) plus an `npm run sim`
    script. Policy: one run per spec per seed; pick the spec, run the intro; each floor run descends
    to `deepestFloor + 1`, or re-farms `deepestFloor` after a failed push; summon every creature that
    reaches 100% and keep the six highest-level instances in the party; spend perk points greedily in
    spec-doc order on functional perks. The policy is documented in the file header.
22. **CI thresholds:** fail only if floor-1 clear rate < 80%, the first soul takes > 30 clears, or no
    seed reaches floor 5 within the first session. Everything else is reported.
23. **Reachable floors** = `1 .. min(deepestFloor + 1, contentFrontier)`, inclusive. When a floor
    fails both checks, **`beyond-content-frontier` wins** (it is the more specific reason, and the
    UI can say "no content yet" instead of "too deep"); `floor-out-of-reach` covers floors < 1 and
    floors beyond `deepestFloor + 1` inside the frontier.
24. **Vitest split:** any new top-level test folder defaults to Node unless it renders React.
25. **Placeholder names** are marked with a code comment next to each starter's `name` (no data
    field), and in species-locked.md.
26. **Creature names are unique** (data test), so the UI can use a name as a label without
    disambiguation.
27. **Materializing a `fusion` source throws** until Phase 8 implements fused derivation (the variant
    exists only so save v1 never needs reshaping).
28. **`TurnSkipped` names the first `'all'` lock in canonical effect order** when two are active.
29. **The `support` role's ally-side gem filter is an engine change** in G: the cast intent's
    `gemSlot: 'random'` gains an optional `side` filter (shape pinned by the G plan).
30. **Silenced and Pacified have polarity `debuff`.**
31. **Confirmed (design owner, PR #71 review).** C2a is byte-identical in behaviour, not just on
    goldens. Granted casts keep today's targeting behind `legacyGrantedTargeting` until C2b
    (B2.3) deletes it.
32. **Confirmed (design owner, PR #71 review).** The corpus digest replaces the 200-case seed sweep.

## Sequencing summary

`4.1-A` (data, store, generation) → `4.1-B` (engine foundations, byte-identical) → `4.1-C`
(action pipeline + turn skeleton) → `4.1-D` (spells carry responses, byte-identical) → `4.1-E`
(`perform-action`) → `4.1-F` (status containers + timing + Web + Silence/Pacify) → `4.1-G` (hub
actions + enemy behaviour) → `4.1-H` (simulator + tuning) → then the Phase 4.5 demo brief. Each PR
branches from `main` after the previous merge.
