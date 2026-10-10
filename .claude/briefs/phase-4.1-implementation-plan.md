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
| **4.1-C** | One action pipeline + turn skeleton, shipped as **C1** (turn skeleton), then **C2a** (pipeline plumbing), **C2b** (B1 + castable gem draw) and **C2c** (B2, B5, the dead-actor rule, the golden runner) | C1: deliberate, listed; C2a–C2c: **byte-identical, all existing goldens**; the corpus digest changes in C2b and C2c, attributed |
| **4.1-D** | Spells carry responses | **Byte-identical, all goldens (hard requirement)** |
| **4.1-D2** | The corpus covers all real content (test-only, from the PR #74 review) | **Byte-identical**: every golden and every existing digest entry unchanged; the digest only gains appended coverage entries |
| **4.1-E** | `perform-action` (bonus/echo become data) | Deliberate changes, listed |
| **4.1-F** | Statuses as effect containers + status timing + Web roll + Silence/Pacify, shipped as **F1** (A3: statuses as effect containers, timing unchanged), **F2** (D6 status timing + D5 Web roll) and **F3** (G2: Silence & Pacify) | F1: deliberate, narrow (only the turn-skip shape and the two fixture locks re-expressed on `action-lock`); F2: deliberate, listed (timing); F3: goldens byte-identical; the digest is regenerated once, existing entries changing only through the cast-role loadout roll (attributed mechanically), plus any appended coverage fights |
| **4.1-G** | Hub actions + enemy behaviour, shipped as **G1** (enemy behaviour) and **G2** (hub and store) | G1: deliberate, listed; mechanism goldens byte-identical, content goldens and the digest change (attributed stage by stage); G2: engine goldens and the digest **byte-identical**, store tests change |
| **4.1-H** | Balance simulator, combat-rule changes from the H2 grill, and the first tuning pass, shipped as **H1** (the simulator and its report), **H2a** (damage rules), **H2b1** (Flickerlings and damage observation), **H2b2** (status rules), **H2c** (the grill-decided numbers and the report additions) and **H2d** (the balancing pass) | H1: **byte-identical** (new files only; every golden, store test and the digest unchanged); H2a, H2b1, H2b2: deliberate, listed (each rule's own goldens); H2c, H2d: content numbers change, deliberate and listed; mechanism goldens untouched |

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
  pending section. From 4.1-H2b2 the design agent does the fold, at the PR review, on the slice
  branch, from the code as verified (`workflow/pr-review.md`); the coding agent lists the changes.

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
  scripts.ts        REPLACE (G) seven role scripts; the five always-* move to engine __fixtures__ (optional
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
| `ResolutionContext { events, cascade, runAction }` | Transient resolver object | C | Replaces `onEchoCast` and loose `events`/`cascade` args; E adds `grants` (the `perform-action` queue) |
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
| Seven role scripts; `defaultScriptId` = role | Content | G | striker / guardian / warden / caster / support / opener / taunter |
| Full distinct enemy gem sets + safety net | Generation rule | G | ≥3 spells per affinity at biome 1 (data test) |
| Pounce, Stifling Weight, Life Siphon | Content | G | Biome-1 spells (Instinct / Endurance / Vitality) |
| `Instance.gems: spellId[]` | State field | G | Rolled and stored at creation until Phase 8 |
| `newGame({ seed })`, `summon`, `setPartySlot`, `setPerkLevel`, `refundAllPerks` | Store actions | G | See CONVENTIONS "State & persistence" |
| `PerkDef.phase` | Data field | G | **Deleted** |
| Balance simulator | Tool | H | Deterministic; real store + documented policy; loose CI thresholds |

**Response vocabulary after 4.1:** eight verbs (`deal-damage`, `apply-status`, `apply-stat-modifier`,
`heal`, `revive`, `grant-action-state`, `remove-status`, `perform-action`; `consume-stacks` left in
4.1-H2b2). The
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
  identityParent, affinityParent }, level, xp, scriptId: string | null, gems }`.
  - `gems: (spellId | null)[]` arrives in 4.1-G2 (ASSUMPTION 83). Nothing persists before Phase 5,
    so adding it needs no migration (ASSUMPTION 85).
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
  - **C2c also carries two additions (decided at the PR #73 review).**
    - **The dead-actor rule** (CONVENTIONS "An action ends when its actor dies"): a flip like the
      others, golden-neutral, with a golden for the main case and a discriminating test at each of
      its four check sites. It changes corpus fights 308, 374, 433, 467 and 496, which the PR
      attributes.
    - **A test-only consolidation, in its own commit** (CONVENTIONS "Every golden replays through
      one shared runner"): every golden goes through a shared runner that deep-freezes before
      every turn, and the frozen-replay sweep file is retired. The same commit pins two behaviours
      no test covered: an AOE cast skips a member that died earlier in the same cast, and a status
      is never applied to a dead target. This commit changes no `expectedEvents` or
      `expectedResult` anywhere.

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
- **Decided at the 4.1-D plan review** (CONVENTIONS "Spells carry responses" holds the rules):
  - `heal` gains `offStat` (remap-aware, as on `deal-damage`); its three magnitude modes are
    mutually exclusive.
  - `scalingStat: 'none'` is dropped with its one unit test; no content or golden uses it.
  - `unlockedAtBiome` is **required** on `Spell`, as the shape above says (every spell literal is
    rewritten in this slice anyway).
  - A load-time validator limits a spell's list to `deal-damage` / `heal` (formula mode, no
    `magnitudeSource`), `apply-status`, `apply-stat-modifier` and `remove-status`, targeting
    `cast-target` or `self`; `cast-target` is rejected in trait and status responses.
  - One landed target's effect list is atomic: no actor check between its effects.
  - Magnitudes read the caster's **live** stats (no action-start snapshot), pinned by a test in
    which the caster's own `on-cast` trigger changes its Intelligence before the hit.
- **Decided at the PR #74 review** (CONVENTIONS holds the rules):
  - One formula for every formula-mode magnitude, `deal-damage` or `heal`, trait or spell:
    `stat × (spellPower × multiplier)`. The heal branch that picked an order by asking whether it
    ran inside a spell is removed. Goldens and the corpus are unchanged; trait `scalingStat` heals
    with a count move from `(stat × spellPower) × count`, accepted as float noise (Necromoss can
    differ by 1 HP on rare inputs).
  - No response acts on a dead target except `revive`: every targeted verb skips one (a verb
    rule, whatever the target kind), `grant-action-state` included. `cast-target` is simply the
    landed target. Targetless `consume-stacks` runs whenever its trigger does.
  - The spell validator also requires cast-flavored damage (`damageSource` resolves to `'cast'`),
    `offStat: 'cast'` when an `offStat` is used, and exactly one magnitude mode.

### Acceptance (4.1-D)
- **Full golden suite byte-identical.** Plus a unit test per payload kind (damage, heal,
  stat-modifier, damage + status, AOE + status) asserting identical events old-vs-new on a fixture.

---

## 4.1-D2 — The corpus covers all real content

Item: from the **PR #74 review** (ASSUMPTION 40). A **test-only PR** between D and E, so E and F
both start from a digest that sees every spell, status and specialization perk (CONVENTIONS
"Corpus digest"). Today the 500 corpus fights cast only 10 of the 25 registered spells, never apply
Stun, Weaken or Vulnerability, and never include a single perk (the corpus passes no player-wide
effects). E rewrites extra casts and grants, and F rewrites every status. It is its own slice, not E's first commit, because a PR
keeps one golden policy and regenerates the digest at most once (WORKFLOWS "Golden policy"), and E
regenerates it for its own deliberate changes.

- **Coverage fights** (a Part C in `__corpus__/corpus.ts`), **appended after Part B**, built from
  real content only (shipped species, spells, scripts and specializations; no `__fixtures__`). The
  fight shapes are the plan's (ASSUMPTION-tagged). Each spell's effects must actually land in its
  fight: a heal finds a wounded ally, a status finds a living target.
- **Perk fights:** one per specialization to start, with every perk of that spec at max level (a
  fully maxed spec, which the design allows), passed as player-wide effects. Add variant fights
  (another party or scripts, a longer fight, or the spec without a masking perk) wherever a perk
  doesn't yet matter (below). The evidence sets the number of fights.
- **A coverage test** over the whole corpus, every list read from its registry, never hand-copied:
  - every id in `ALL_SPELLS` has a `SpellCast` whose effects all landed (the plan's window check);
  - every id in `STATUS_REGISTRY` has a `StatusApplied`;
  - **every perk with non-empty effects matters:** its fight re-run with only that perk removed
    produces a different event log. That catches a `TriggerFired`, a changed number or a changed
    random draw alike, without per-perk event knowledge. Perks with empty effects (the `p8`
    masteries today) drop out by rule.
  - Exemptions are explicit lists in the test, each entry with its reason. Expected: status `stun`
    (applied only by the Phase-3 mechanism trait `reeling`, which no shipped creature carries) and
    perk `clear-mind` (immunity to Silenced, which isn't authored until 4.1-F). The plan confirms
    or corrects both.
  - An exempt item that *is* covered fails the test, so an exemption can't outlive its reason. When
    F authors Silenced, Clear Mind starts to matter and F must drop its exemption.
- **Coverage must not hang on a lucky seed.** Where coverage rides on a chance roll (Concussive
  Blows is 25% at max), the fight makes the roll happen many times, and the PR reports the roll
  count and the resulting chance of no hit. A later slice's change to the RNG draw order must not
  silently drop coverage.
- **No engine, data or golden change.** The scope is `__corpus__/` (Part C, plus a shared
  `createCorpusCombat(fight)` and an optional `playerEffects` on `CorpusFight`), the digest fixture,
  a behaviour-neutral change to `corpus-digest.test.ts` (it calls `createCorpusCombat`), and the new
  coverage test.

### Golden policy and acceptance (4.1-D2)
- **Byte-identical:** every golden unchanged (expected exports compared by import). The digest is
  regenerated once, through `corpus:update`; its first 500 entries must be **byte-identical**
  (shown mechanically), and only the appended entries are new.
- **Proof it now sees what it missed:** for three previously invisible items (a spell that was never
  cast, Weaken, Vulnerability), show that changing it alone fails the new digest, and that the same
  change passed the pre-slice digest.
- The coverage test is shown failing when a spell, a status or a perk is added to its registry
  without coverage (e.g. a throwaway registry entry), when an exemption list is emptied, and when
  an exempt item is covered.
- A table in the PR: for each spell, status and perk, the fight that covers it and the evidence (the
  landing event, or the hash change when the perk is removed).
- **Decided at the PR #77 review:**
  - Perk **`aggressive`** joins `clear-mind` on the exemption list: it is immunity to Pacified,
    which isn't authored until 4.1-F (the same rule; the brief only expected `clear-mind`).
  - Damage-modifier statuses must be **exercised**, not only applied (their bearer deals or takes
    damage while they hold), or their magnitude is invisible to the digest. Built in the PR.
  - Corpus loadouts must be reachable: every corpus creature's equipped spells match its affinity,
    asserted in the coverage test.
  - Chance-based coverage is proven by a seed sweep over Part C's combat seeds, with the worst case
    reported. Lucidity's fight is made robust (its Puppet String casters must survive long enough
    to keep the party Confused).

## 4.1-E — `perform-action`

Item: **A2.** Bonus-cast and echo-cast become data.

- New response **`perform-action { actor: 'self' | 'triggering-source', intent }`**, executed via
  `ctx.runAction` through the A1 pipeline.
- **Actions are atomic:** a granted action is **queued** on the context and runs **after the
  granting action (all its instances) completes**. Grants during the turn-end hooks run in the
  skeleton's granted-actions step. Responses stay nested and immediate.
- **Bounded by cascade depth**, not the self-re-entry guard: a granted action runs at its queue
  entry's depth (the granting trigger's, +1 included); an echo chain may pass through the same
  Overtone.
- **`ActionGranted { sourceId, actorId, effectId }`** when the queued grant runs and is accepted,
  immediately before the granted action's first event (decided at the plan review, below). A grant
  refused or fizzling when it runs emits nothing of its own. `EchoCastGranted` is deleted.
- **Content:**
  - Arcane Surge: `on-turn-end`, `chancePercent: 50` → `perform-action(self, { action: { kind:
    'cast', gemSlot: 'random' } })`.
  - Resonant Overtone: `on-action-observed` (ally cast), `chancePercent: 10`, `stacks: false` →
    `perform-action(triggering-source, { action: { kind: 'cast', gemSlot: 'random' }, targeting:
    'random' })`.
- **Delete** the `bonus-cast` category (`BonusCastDef`, `activeBonusCast`, `maybeFireBonusCast`),
  `TriggeredDef.echoCast` and `runEchoCast`.
- **Data test:** every `perform-action` trigger carries a real guard: a `chancePercent` below 100,
  or a `condition` other than `always` (decided at the plan review, below).
- **The skipped-turn gate moves with the grant** (PR #73 review). Through C2c, B2 rule 1's gate is
  a parameter of `maybeFireBonusCast`, fed by `resolveTurn`'s turn-start `suppressed` flag.
  Deleting `maybeFireBonusCast` means the gate moves to where granted actions run: a grant whose
  actor is the creature whose turn was skipped is refused **after** its chance roll, even if the
  lock is gone by then. `golden-b2-skipped-turn-refuses-granted-cast` is re-expressed with
  `perform-action` and keeps proving both halves (the roll happens; the grant is refused).
- **RNG draw order**, documented in code and in the golden comments: chance gate at trigger time →
  (after the granting action completes) random gem → random target.

- **Decided at the 4.1-E plan review** (CONVENTIONS "`perform-action`" holds the rules):
  - Each scope that raises grants drains them once, at its end: the chosen action's grants right
    after it; the turn-end hooks' grants in the granted-actions step; the turn-start hooks' grants
    after the turn-start cleanup; fight-start and round-end grants right after their hook pass. The
    queue is FIFO, and each entry carries its granting trigger's depth.
  - `ActionGranted` is emitted when the grant runs and is accepted (ASSUMPTION 41).
  - `actor: 'triggering-source'` includes the bearer, so Overtone keeps echoing its own casts
    (ASSUMPTION 42).
  - Only the actor's state decides a grant; the bearer dying doesn't cancel it (ASSUMPTION 43).
  - `perform-action` is rejected inside spells and inside `consume-stacks`' wrapped effect. The
    data test requires a real guard: `chancePercent` below 100, or a `condition` other than
    `always`.
  - The truncation golden uses the real cap (500) and a 100%-chance fixture Overtone on a single
    bearer, so the chain passes through the same Overtone every hop. The per-hop events are written
    by hand as a template in the fixture; a loop only repeats the template, and explicit checkpoints
    are asserted. No test-only cap parameter in `src/engine`.
  - The coding agent edits code, tests and the phase record only. Every living-doc change for this
    slice is in this doc-sync.

### Deliberate golden changes (4.1-E)
- **Bonus-cast goldens** gain `TriggerFired` + `ActionGranted`; the cast sits in the granted-actions
  step.
- **Echo goldens**: `EchoCastGranted` → `ActionGranted`, and the echo now follows the original cast's
  full payload instead of interrupting it.
- A new fixture golden: an echo chain passing through the same Overtone every hop, truncated at the
  real cap (500) with one `CascadeTruncated`, per the plan-review block above.

---

## 4.1-F — Statuses as effect containers, status timing, the Web roll, Silence & Pacify

Items: **A3, D6 status timing, D5, G2.**

### The split: F1, F2, F3 (decided before the F kickoff)

F ships as three PRs, in this order, each under one golden policy:

| PR | Items | Golden policy |
|---|---|---|
| **4.1-F1** | A3: statuses as effect containers, `action-lock` + `TurnSkipped`, `suppress-action` deleted, immunity in the iterator, the status load-time validator. **Timing unchanged:** ticks stay on the round-end sweep and the Web roll stays at turn start. | **Deliberate, narrow.** The only allowed changes are the turn-skip shape (a skipped turn shows `TurnSkipped` instead of the lock's on-turn-start `TriggerFired`) and the two goldens whose fixture traits lock with `suppress-action` (`golden-scoped-suppression`, `golden-b2-silenced-refuses-granted-cast`) re-expressed on `action-lock`, so the lock's own `TriggerFired` disappears. Every other golden is byte-identical. Every changed corpus fight contains a `TurnSkipped`, and mapping each one back to the old shape reproduces `main`'s log. |
| **4.1-F2** | D6 status timing (durations count the bearer's turns, ticks on `on-turn-end`, born-this-turn, the round-end sweep deleted, in-turn win checks) and D5 (the Web roll in turn-end cleanup). | **Deliberate, listed:** timing. The plan lists every affected golden with its fate. |
| **4.1-F3** | G2: Silenced/Pacified, Silence/Pacify, the perk exemptions dropped, the spell dedup key. | Goldens **byte-identical** (shown by import); new hand-derived goldens. The digest is regenerated **once**: existing entries change **only** through the cast-role loadout roll (Silence and Pacify join two affinity pools), shown mechanically, plus any appended coverage fights (decided at the F3 kickoff, below). |

**Why three, not one.** F re-expresses every status. With timing unchanged, F1's refactor can be
proven behaviour-neutral mechanically: by importing every golden and by mapping the corpus digest
back to `main`. Done in the same PR as the timing change, a refactor bug would hide among ~36
goldens re-derived for timing, and the digest couldn't tell the two kinds of change apart. F2's
diffs are then timing only. F3 comes last so its new goldens are written once, against the final
timing (Silenced's three turns count the bearer's own turns).

**The cost, accepted:** F1 adapts the round-end sweep to read status containers, and F2 deletes
that adaptation along with the sweep.

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
- **Decided at the 4.1-F1 plan review** (CONVENTIONS "Action locks", "The effect taxonomy",
  "Immunity" and "The bright line" hold the rules):
  - `action-lock` is carrier-agnostic, so the two fixture locks stay trait-borne and their goldens
    only lose the lock's `TriggerFired`. `TurnSkipped` is `{ creatureId, effectId }`, the carrier's
    definition id (ASSUMPTION 44).
  - The skip is read right after the turn-start hook pass and again at the action slot; a lock
    gained during the actor's own turn-start hooks skips that turn (ASSUMPTION 45).
  - An `'all'` lock makes every action kind illegal in `checkLegality`, Defend, Provoke and Wait
    included (ASSUMPTION 46).
  - Every effect is carrier-agnostic and every reader goes through the one iterator. The status
    validator rejects `stat-modifier`, `stat-remap`, `status-immunity` and `innate-spell`;
    `breakChancePercent` is rejected outside a status. Immunity covers every effect kind of the
    status and is read only from non-status carriers (ASSUMPTION 47).
  - The status damage-modifier stays its own category (ASSUMPTION 48).
  - Golden list: `golden-sleep-wake` and `golden-lullpollen-dozer` are expected **unchanged** (no
    skipped turn in their expected logs); only their fixture inputs change shape. Test files with
    inline old-shape status literals get shape-only edits, assertions untouched.

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
- **Decided at the 4.1-F2 plan review** (CONVENTIONS "Turn structure", "Resolution & timing",
  "Status lifecycle", Web's roll and "Death-reset" hold the rules):
  - Born-this-turn has one window: a status starts at the first action slot it is present for
    (applied since the action slot → starts next turn), for ticks, countdown and the Web roll
    alike. The Spiders' Weaver moves from `on-turn-start` to `on-turn-end`, so the Web it places
    is born and its own cleanup doesn't roll it (ASSUMPTIONS 18, 49).
  - Win/loss is checked after every top-level step, each hook firing included, never inside a
    cascade; a mid-turn wipe skips the rest of the turn and still emits `TurnEnded` (ASSUMPTION 19).
  - A corpse's statuses are inert: no countdown, no `StatusExpired`, no roll (ASSUMPTION 51).
  - The status validator rejects `on-round-end` triggers and also runs in `createCombat`
    (ASSUMPTION 50).
  - The born-this-turn tick gate is passed to `fireHook` by its `on-turn-end` caller through
    `FireHookOptions`, not a hook-name branch inside `fireHook` (ASSUMPTION 52).
  - `golden-castable-draw` is retired; the goldens named for the round-end sweep are renamed
    (ASSUMPTIONS 53, 55).
  - The coding agent edits no living doc; this block and the CONVENTIONS / GAME_DESIGN changes are
    the plan-review doc-sync.

### D5 — the Web roll
- Keep the **global** roll: **10% per Web bearer at every creature's turn**. The chance lives on
  Web's `turn-order` effect (`breakChancePercent`), the roll happens in **turn-end cleanup**, it
  skips Webs applied during the current turn, and it follows the roll-only-when-present discipline.

### G2 — Silence and Pacify (F3)
- **Silenced** (`action-lock { scope: 'cast' }`) and **Pacified** (`action-lock { scope: 'attack' }`)
  statuses: cap 1, `defaultDuration: 3`, polarity debuff (ASSUMPTION 30).
- **Silence** (Violence) and **Pacify** (Wit): single enemy, `effects: [apply-status(cast-target,
  silenced | pacified)]` (duration omitted, inherited), `unlockedAtBiome: 1`, no damage.
- Content doc entries move from the pending section into the Overgrowth spell table.
- Focused goldens: Silence stops a caster's cast (it falls through its script); Pacify stops an
  attacker; Clear Mind / Aggressive immunity lets the action through while `has-status` stays true.
- **Corpus coverage:** drop the `clear-mind` and `aggressive` perk exemptions from
  `corpus-coverage.test.ts` (an exempt perk that matters fails the test). Both must then matter in
  a corpus fight; add a coverage fight if no existing one shows it, and regenerate the digest in
  the same PR. Silence and Pacify themselves must pass the coverage test (cast, status landed).
- **The spell dedup key** (`data/spells/index.test.ts`, from the PR #74 review): key a status-only
  spell by its status ids. Today every status-only spell of one affinity and shape keys to
  `…|none|1`, so a second one in an affinity would be a false duplicate. Silence and Pacify are the
  first status-only spells; they differ by affinity, so they don't collide either way.
- **The fight-start win check** (PR #80 review). F2 checks every in-fight pass and drain but
  exempts the fight-start pass and drain. F3 passes the stop predicate to both and checks win/loss
  right after them, before `RoundStarted`; a fight-start wipe then ends the fight there
  (CONVENTIONS "Resolution & timing"). No content can wipe at fight start, so every golden and the
  digest stay byte-identical; a fixture test shows a fight-start wipe ending with no
  `RoundStarted`, and fails with either the predicate or the check removed.
- **Adding spells shifts the cast-role loadout roll (decided at the F3 kickoff).** `generateFloor`'s
  `rollLoadout` picks a cast-role enemy's one gem from `ALL_SPELLS` filtered by `unlockedAtBiome`
  and affinity, with uniform weights. Appending a biome-1 Violence spell and a biome-1 Wit spell
  changes the pick for every Violence or Wit cast-role roll, so corpus fights built through
  `gen()` change. Measured with two stand-in spells: **48 of 522 fights, 2 results**; no golden
  changes (they use fixture biomes). So F3's golden policy is: goldens byte-identical; the digest
  is regenerated once, and an existing entry may change **only** through that roll. The PR proves
  it per fight: it compares each fight's materialized parties (every creature's equipped spells) on
  `main` and on the branch. Every fight whose parties are identical has an identical log, and every
  changed fight has a differing rolled gem. Appended coverage fights, if needed, are new entries.
  - `ALL_SPELLS` stays **append-only**: Silence and Pacify go at the end.
  - **Not a new oddity.** Today's one-gem roll already includes spells that deal no damage
    (Weakening Bite, Howling Instinct, Bramble Ward, Wild Vigor), so a cast-role enemy can already
    spend every turn on one under `always-cast`. Silence and Pacify join that existing pattern. G's
    full gem sets and role scripts (D4) address it for all of them; F3 adds no engine or generation
    branch.
  - **Order doesn't save the churn.** Any appended spell reshuffles a uniform roll, so landing
    Silence and Pacify after G re-churns G's corpus the same way. Only folding them into G's own
    PR would save one attributed regeneration. Rejected: it would load G, the largest remaining
    slice, with the statuses, the perk exemptions and their coverage, which belong with F's
    status work. Also rejected: filtering no-damage spells out of today's roll (an engine branch
    G deletes, and it would hide Silence and Pacify from generated fights).
### Deliberate golden changes (4.1-F)

F1's changes are the stun and sleep goldens' skip shape and the two fixture locks re-expressed on
`action-lock`; every other item below is F2's, except the G2 goldens (F3, new only).

- **Every status golden changes timing**; the Phase-3 round-end goldens (`golden-dot`,
  `golden-round-end-mid-sweep-poison(-refresh)` and every golden whose statuses count down or
  tick) are **rewritten as hand-derived turn-end equivalents**. `golden-round-end-interaction` is
  not: it pins the round-end trait pass, which F2 keeps, and its log is unchanged (PR #80 review).
- A new **turn-end interaction golden**: a DoT tick kills its bearer, whose `on-death` applies a
  status; assert `on-death` fires, the new status follows the born-this-turn rule, and the win check.
- The **stun and sleep goldens** gain `TurnSkipped` and lose the no-op `TriggerFired` (F1); their
  timing changes in F2.
- The **scoped-suppression golden** and **`golden-b2-silenced-refuses-granted-cast`** are rewritten
  on `action-lock` (F1): their fixture lock's on-turn-start `TriggerFired` disappears.
- The **Web break-free golden** moves its roll to turn-end cleanup.
- **The Spiders' Weaver moves to `on-turn-end`** (F2, ASSUMPTION 49): its golden
  (`golden-overgrowth-web-exploit`) is re-derived (`golden-broodmother` uses generic adds, not the
  Weaver, so only a comment moves), and corpus fights where
  the Weaver Webs are attributed to it (its `TriggerFired` moves from turn start to turn end, and
  its random-enemy draw now follows its action's draws).
- Glow, Weaken, Vulnerability, Confusion goldens: only timing changes may appear; the modifier math
  must be identical.
- **Arcane Surge shares the `on-turn-end` pass with DoT ticks** (from 4.1-E, PR #78 review). Surge
  is an innate effect, so in canonical effect order (statuses after innate traits) it rolls before
  the bearer's status ticks. A Seer killed by its own tick has already rolled: its `TriggerFired`
  stays and the queued cast is refused at drain (dead actor), per "only the actor's state decides a
  grant". No special case; corpus fights where a ticking Seer dies change for this reason and are
  attributed as such.
- **The F2 plan lists every affected golden with its fate** (PR #73 review): **re-derived by hand**
  (the mechanism still exists, only its timing moves) or **retired** (the mechanism is gone, e.g. a
  golden that exists only to pin the round-end sweep), with the golden that replaces its coverage.
  36 of the 88 golden fixtures contain status events (after 4.1-C2c), so this list is the plan's
  largest item. Every golden replays through the shared golden runner, so a re-derived golden
  keeps the per-turn freeze with no extra work.

---

## 4.1-G — Hub actions and enemy behaviour

Items: **D2, G4, §6, D4** (including B1's "a cast-role creature with no usable spell throws"),
and **6v6 boss floors** (decided at the PR #81 review).

### The split: G1, G2 (decided at the 4.1-G plan review)

| PR | Items | Golden policy |
|---|---|---|
| **4.1-G1** | Enemy behaviour: the `always-*` scripts moved to test fixtures (stage 0, byte-identical), the three new spells (appended), the seven role scripts and every creature's role (starters included, ASSUMPTION 8), `isCastRole` by role, the support side filter, full distinct gem sets for every enemy (bosses included), the 6v6 boss fill. | **Deliberate, listed.** Mechanism goldens byte-identical (shown by import). Content goldens built from real species change where a script or loadout changed, each listed. The digest is regenerated once, attributed **stage by stage** (ASSUMPTION 77). |
| **4.1-G2** | Hub and store: `summon`, `setPartySlot`, `setPerkLevel` / `refundAllPerks` (`PerkDef.phase` deleted), `newGame`, player gem sets (ASSUMPTION 7), `scriptId: null` → role (ASSUMPTION 6; already live, G2 adds the store test, ASSUMPTION 86). | Engine goldens and the digest **byte-identical**; store tests change. |

**Why two, and this order.**
- The halves have different golden policies: G1 changes the digest deliberately, and G2 must
  leave it untouched.
- Player gem rolls draw from `ALL_SPELLS`. Landing the spells first means G2's store tests pin
  the final rolls once.

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
- **Seven role scripts** in `data/scripts.ts`, exactly as CONVENTIONS "Role scripts" tabulates them
  (`striker`, `guardian`, `warden`, `caster`, `support`, `opener`, `taunter`). `support`'s first
  rule draws only among ally-side gems (the intent gains a side filter; the shape is the plan's).
- **The five `always-*` scripts become test fixtures** (decided at the 4.1-G plan review,
  ASSUMPTION 68):
  - they move unchanged to `src/engine/__fixtures__/scripts.ts`;
  - `data/scripts.ts` ships only the roles;
  - goldens, unit tests and the corpus's Part C use the fixture copies;
  - the throwaway demo (`src/app/demoFight.ts`) declares its five scripts locally, unchanged,
    since it may not import `__fixtures__`.
- **Roles per creature**: set every `defaultScriptId` from the content docs' "Roles" tables. Across
  the 54 creatures and 3 bosses: 27 strikers (incl. Broodmother and Leech Sovereign), 10 wardens
  (incl. Rot Sovereign), 2 guardians (Treant Sapling, Myconet Gravedigger), 10 casters, 3 supports,
  4 openers, and Snapjaw Lure as a `taunter`. Starters and the Unicorn per ASSUMPTION 8.
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
  **distinct, affinity-matched gem set and stores it** as `Instance.gems: (spellId | null)[]`
  (ASSUMPTIONS 7, 83). `materializeCreature` receives it. The Seer's innate spell comes on top,
  and her roll never draws it again (ASSUMPTION 81). The roll is generation's own `rollLoadout`,
  exported, with its own RNG (CONVENTIONS "Player gem sets").
- Content docs: fold the roles and new spells from each doc's pending section into its body.

### 6v6 boss floors and boss loadouts (decided at the PR #81 review)
- **Why.** In the F3 corpus, the Leech Sovereign fought alone, on `always-attack`, with no gem.
  Once Pacified she could only wait, so one creature casting Pacify every round switched off the
  entire enemy side. All four corpus fights where the player side held Pacify (19, 109, 199, 289)
  flipped from loss to win. The fix is general rules, not a boss exception (GAME_DESIGN
  "Milestone bosses"):
  - a full side;
  - a boss whose role script has something to fall back on.
- **The fill.** A boss floor's one fight has `enemyPartySize(floor)` creatures, which is 6 at every
  boss floor:
  - the boss first, then its authored adds;
  - then fill slots drawn through the ordinary spawn path: the same weighted species selection,
    over the biome's pool **minus the boss's own `speciesId`**, with the level within
    `enemyLevelRange(floor)` and a loadout like any spawned enemy;
    - the exclusion keeps a count-scaling signature (the Broodmother's spiderlings) to its authored
      adds;
  - all drawn from the run RNG, after the boss's and the authored adds' draws, so they vary per
    visit.
- **What stays the same.** `BossEncounter.adds` keeps meaning "the creatures this boss's fight
  needs": the Broodmother keeps her two, and the Leech Sovereign's stays empty. A fill creature is an
  ordinary spawn with ordinary per-kill rewards.
- **The boss's loadout.** The boss path already calls `rollLoadout`. With D4's full distinct gem sets,
  that gives every boss a full set, including the non-cast-role ones, which hold no gem today. Say so
  explicitly in the plan, and test it on a boss.
- **No boss immunity or lock resistance.** A Pacified striker boss casts a random gem (its role's
  rule 3). The planned "cast random gem below an Attack rule" behaviour is exactly what keeps a lock
  from emptying a boss's turn.
- **Tests.**
  - Generation tests: every shipped boss floor yields 6 creatures; authored adds come first; no fill
    creature shares the boss's species; the fill draws are deterministic per run seed; and every
    boss holds a full gem set.
  - A hand-derived golden: the real Leech Sovereign, with her role script and a gem, Pacified. She
    casts instead of waiting, and her Attack-steal doesn't fire that turn.
- **Content docs.**
  - The Leech Sovereign's "no adds" becomes "no authored adds; the rest of her side is the biome's
    own creatures".
  - Each boss section states the 6v6 rule once. (`species-locked.md` already says it, from the PR
    #81 doc-sync.)
- **Corpus.** Every boss fight changes: adds, the fill and the boss's gems. Attribute them as their
  own class in G's regeneration.
- **For 4.1-H.** Boss floors get harder: 6 enemies where there were 1–3. The simulator's T4 ("no
  wall before the floor-10 boss") is the check. Report boss lock uptime too, under a script that
  aims the lock at the boss (see 4.1-H's boss-floor watch point).

### Acceptance (4.1-G)
- Store tests for every new action and reason; `can…` agreement tests.
- Generation tests: full distinct sets, the safety net on a fixture pool of 2, the cast-role throw.
- The corpus coverage test (from 4.1-D2) passes with G's three new spells. With full gem sets most
  spells get cast in generated fights, but a spell still missing needs its own coverage fight.
- **Mechanism goldens unchanged** (they use fixtures). The per-biome content goldens (e.g.
  `golden-broodmother`, `golden-pollinator-pollenlord`, also in `src/engine/__golden__`) and the
  integration test change where a creature's script or loadout changed: regenerate the integration
  golden (labelled generated-then-checkpoint-verified) and re-derive each affected hand-derived
  biome golden, listing each.

---

## 4.1-H — Balance simulator and first tuning pass

Item: **D1** (simulator, bands, CI thresholds, tuning).

### The split: H1, H2a, H2b1, H2b2, H2c, H2d (H2 split at the H2 grill; H2b before its kickoff; H2d at the H2c plan review)

| PR | Items | Golden policy |
|---|---|---|
| **4.1-H1** | The simulator (ASSUMPTION 21's policy), `npm run sim`, the full report including every watch point's metrics, and the determinism test. ASSUMPTION 22's thresholds are computed and shown in the report, not asserted. | **Byte-identical**: new files and a `package.json` script only. Every golden export, every existing test and the corpus digest unchanged. |
| **4.1-H2a** | Damage rules: an engine-visible creature `level`, the fading **Additional** on direct hits, and the **direct/indirect** damage split (ASSUMPTIONS 110–112). | **Deliberate, listed**: every golden that has a hit changes; each change attributed to one of the three rules. |
| **4.1-H2b1** | Flickerlings and damage observation: the observer watching **damage events** (ASSUMPTION 115) and **Flickerlings replacing Glowflies** with the content that goes with them: Glow deleted, Beacon Charge grants Act First, Overcharge deleted, Luminous Tide becomes Kindred Light (ASSUMPTION 116). Stacking is untouched. | **Deliberate, listed**: `golden-glowfly-detonator` is retired; every other golden is byte-identical; the data, store and mechanism tests that read Glowflies, Glow, Overcharge or Luminous Tide change, each listed; the digest is regenerated once. |
| **4.1-H2b2** | Status rules: **single-instance statuses** (no stacks; ASSUMPTION 114) and **DoT and Regen from the applier's snapshot** as indirect damage (ASSUMPTION 113), with the content they change: Vulnerability ×1.5 once, Sporch Igniter's one Burn, Spore's spread passing the snapshot, the placeholder DoT and Regen percentages. | **Deliberate, listed**: goldens that log a status event lose its stack count (that field only), the stacking and DoT-tick goldens change, `golden-consume-stacks` is retired; each attributed to one of the two rules; the digest is regenerated once. |
| **4.1-H2c** | The numbers the H2 grill decided, on the final rules: Health 20–45, the early-floor level range, the boss level offset, the Shieldbarer starter, Snapback, Arcane Bolt (ASSUMPTIONS 118, 119, 123–125); the report's additions and the floor-5 window (126, 127); the before/after report; and the measurements the H2d grill needs (ASSUMPTION 149). It chooses no balance number. | **Deliberate, listed**: content goldens, store and integration tests and the digest change, each attributed to a listed change. Mechanism goldens untouched. |
| **4.1-H2d** | The balancing pass: the floor-1 per-item fixes and the DoT percentages, decided by the design owner in a grill on H2c's report (ASSUMPTIONS 129, 149), and the CI threshold test asserted (ASSUMPTION 148). | **Deliberate, listed**: as H2c; mechanism goldens that read a tuned number are pinned (ASSUMPTION 147). |

**Why this split, and this order.**
- A tuning plan's ASSUMPTIONS name what changes and by how much. That needs the report first, so
  one plan-first PR couldn't hold H1 and the tuning.
- The watch points ended in decisions (whether draws get a band, whether a boss lock needs a
  break-through chance, how far the early floors are from their targets), decided on H1's report
  before H2's plan: see "The H2 grill" below.
- That grill also changed combat rules. Tuning has to land on the final rules, so the rules come
  first, in two PRs that each change a different set of goldens for one reason (damage, then
  statuses), and the tuning comes last.
- Floor 1 was far below ASSUMPTION 22's 80% on H1's report (first try: Sorcerer 0 of 40, Brute
  24, Shieldbarer 7). A threshold test can't be green before tuning.

**Why H2b ships as H2b1 then H2b2** (decided before H2b's kickoff, 2026-10-08; ASSUMPTION 139).
- As one PR, H2b would change goldens for four unrelated reasons: 41 of 114 goldens only lose the
  stack count from their status events, 8 change through DoT ticks, 3 through stacking, and the
  Glimmerdark content and the digest through the species swap. It would also add the damage
  observer.
- **The observer and the Flickerlings go together:** the Flare is the observer's first user, and
  no Flickerling uses stacks or a DoT.
- **Single-instance statuses and the applier snapshot go together:** the snapshot needs one
  instance to be unambiguous, and "the stronger value stays" needs the snapshot's potency. Apart,
  the stacking goldens would change twice, through an interim refresh-only rule that is never the
  spec.
- **The content comes first:** every user of Glow is Glimmerdark content (the Glowfly traits,
  Beacon Charge, Overcharge, Luminous Tide). Status rules first would mean reworking Glowfly
  content that the next PR deletes.
- **"4.1-H2b" in the living docs** means the pair. The table above says which rule lands in which
  part; the docs' markers stay as written.

### The H2 grill (decided on H1's report, 2026-10-06/07)

The design owner grilled H1's report before H2's plan. **Evidence:** H1's report, plus
counterfactual runs of the same simulator in scratch clones (40 seeds per spec, the lock probe off,
nothing committed): config variants (fight count, XP curve, level-range width and rounding),
engine variants (chip floor 5%, diminishing returns on stat stacking, a fading Additional, the
direct/indirect split, applier-based DoT), and content variants (Arcane Bolt, Snapback, the
Shieldbarer starter, the top draw traits). The rulings are ASSUMPTIONS 109–129; the living docs
carry the changed rules and values.

**What the evidence said.**
- **Most early losses are low offence against Defence at low levels.** With subtractive damage,
  an attacker whose offence is below the target's Defence does the 1-damage minimum, and stats
  scale together, so the gap holds at every level. A level-1 Treant Elder (Defence 20, healing
  itself every round) beat the Sorcerer pair 75 of 78 times and the Shieldbarer pair 125 of 125.
- **A bigger chip floor (5%) halved the draw rates and sped up the deep game**, but changes every
  hit and Defence's worth everywhere, and it can't touch the level-1 regime (5% of 10–15 offence
  is under 1). Not taken (ASSUMPTION 109).
- **Diminishing returns on stacked stats (Siralim's fix) changed nothing measurable:** once
  Defence passes the attacker's offence every hit is the chip, however far past it.
- **A fading Additional removed the early stalls** (round-cap draws on floors 2–5, on the
  flat-fight-count config it was measured on: Sorcerer 4.7–7.1% to 0–0.2%, Brute 0.8–3.5% to 0%)
  and shortened floor-1 fights against the tanky creatures from 10–40 rounds to 3–6.
- **The direct/indirect split and applier-based DoT are roughly neutral on balance** (Sorcerer
  floor-10 first clear 68 vs 76.5 median floor runs; Brute 52 vs 56; Shieldbarer 162.5 vs 153.5
  on the flat-fight-count config they were measured on). Doubling the DoT percentages changed
  nothing measurable: biomes 1–2 apply few DoTs.
- **The early-floor level range is the strongest early lever.** With the new combat rules and the
  original fight count, a range width of 0 plus a rounded-down minimum (candidate B) takes
  first-try floor 1 from 15 / 30 / 10 seeds of 40 (Sorcerer / Brute / Shieldbarer) to 34 / 32 /
  15, and the floor-10 first clear from 144 / 89.5 / 223 median floor runs to 107 / 60 / 173.5.
- **The Shieldbarer starter never attacked.** Its `taunter` role script is one rule, "always:
  Provoke", so its Attack stat was never read and its Rallying Cry fired every turn.
- **The indirect split made the Snapjaw Jaws' Snapback lethal at floor 1:** it beat the
  Shieldbarer pair 144 of 144 times (the counterattack now meets 20% of Defence, not all of it).
  At 30% of Attack, the Shieldbarer's first-try floor 1 went from 17 to 28 of 40.
- **Arcane Bolt at spell power 1.0** (from 0.5) cut the Sorcerer's floor-10 first clear from 140.5
  to 108.5 median runs and took the seeds reaching floor 20 from 3 to 32 of 40 (today's rules).
- **The boss is the easiest floor of its biome** (one fight against 10–19): Brute clears floor 10
  on 85% of first visits against 0–8% of first pushes on floors 2–9. Accepted as a breather.
- **On H1's report, and in every configuration measured before the full decided set, no seed of
  any spec reached floor 5 in its first 10 floor runs**; in 20 runs most do (25 / 31 / 9 seeds of
  40 with the new combat rules on today's config).
- **The full decided set** (every ruling below, measured together at the end of the grill; the
  Glowflies still in, Glow at one instance; single-instance statuses approximated as a cap of 1),
  against the same set without the Health remap, per spec (Sorcerer / Brute / Shieldbarer):
  first-try floor 1: **40 / 35 / 26** of 40 (without the remap 33 / 32 / 28); floor-10 first clear,
  median floor runs: **86 / 72 / 213** (78.5 / 61 / 145), with **13** Shieldbarer seeds never
  clearing it in 400 runs (3); round-cap draws: **4.3 / 2.3 / 10.4%** (4.0 / 1.9 / 8.0%); seeds
  fighting on floor 5 within 10 floor runs: **4 / 12 / 0** (1 / 5 / 1), within 20: **40 / 40 /
  26** (39 / 36 / 31). The remap lifts the Sorcerer's and Brute's floor 1 and slows the mid-game
  (beefier enemies take longer to kill), and costs the Shieldbarer most. This is H2c's baseline.

**The rulings, by area:**
- **Combat rules (H2a, H2b):** chip floor stays 1% (109); a fading Additional on direct hits (110);
  an engine-visible creature level (111); direct and indirect damage (112); DoT and Regen from the
  applier's snapshot, indirect (113); single-instance statuses, the stronger value staying (114);
  the observer watching damage events (115); Flickerlings replace Glowflies (116).
- **Run structure (H2c):** the fight count and XP curve stay (117); the early-floor level range
  (118); the boss level offset (119).
- **Watch points:** no per-turn break-through chance on locks (120); no draw band (121); bosses
  stay one fight (122).
- **Content (H2c):** the Shieldbarer starter (123); Snapback and Arcane Bolt (124); Health 20–45
  (125). **(H2d):** the remaining floor-1 fixes and the DoT numbers (129).
- **The report and CI (H2c):** the floor-5 threshold within 20 floor runs (126); two report
  additions (127). **(H2d):** the CI threshold test asserted (148).
- **Order:** H2a → H2b → H2c (128).
- **Framing (design owner):** balance doesn't have to be perfect yet. Player-written scripts
  (Phase 6) and equipment (Phase 8) will strengthen the starting team, so H2c and H2d aim at the
  bands and the CI thresholds, not at perfection.

### 4.1-H2a — damage rules (deliberate)

- **`Creature.level`** (ASSUMPTION 111): the combat creature carries its level, set by
  `materializeCreature`; `origin` stays engine-inert.
- **The Additional** (ASSUMPTION 110), with its constants in `engine/config.ts`.
- **Direct and indirect damage** (ASSUMPTION 112): one classification in the resolver, the
  indirect formula beside the direct one in `damage.ts`. DoT ticks keep today's path in H2a (H2b
  moves them).
- **Self-inflicted response damage is a cost** (ASSUMPTION 116): a creature's own response
  damaging itself is the exact amount, no Defence or modifiers, still a damage event. It is a
  channel rule, so it lands here, not with the Wick in H2b: the `RECKLESS` fixture
  (`golden-loop-safety`) and `CATASTROPHIC_COLLAPSE` are self-targeted today.
- **Flat-mode response damage on another creature becomes indirect** (ASSUMPTIONS 112, 113: no
  true-damage channel): the flat amount is the magnitude; the opt-in Defence bypass goes. The
  `golden-b5-*` fixtures' flat hits change with it.
- **Content docs:** the PR folds each "Indirect damage (4.1-H2a)" item from the content docs'
  "Phase 4.1 — decided changes" sections into their bodies (the "Content docs stay in sync" rule
  above).
- **Goldens:** every changed golden is listed with which of the three rules changed it. A
  hand-derived focused golden per rule (a direct hit with the Additional at two attacker levels; a
  trait response as indirect damage against Defence and against Defend; a granted Attack staying
  direct). The digest is regenerated once, every changed fight attributed. The plan's rulings are
  ASSUMPTIONS 130–136.

### 4.1-H2b1 — Flickerlings and damage observation (deliberate)

Moved to .claude/phases/4.1/H2b1/brief.md at its kickoff.

### 4.1-H2b2 — status rules (deliberate)

Moved to .claude/phases/4.1/H2b2/brief.md at its kickoff.

### 4.1-H2c — the first tuning pass (deliberate)

Moved to .claude/phases/4.1/H2c/brief.md at its kickoff.

### 4.1-H2d — the balancing pass (deliberate)

Moved to .claude/phases/4.1/H2d/brief.md at its kickoff.

### Acceptance (4.1-H)
- **H1:** the simulator is deterministic (same seeds → identical report, asserted); the report
  shows where each target band and each ASSUMPTION 22 threshold lands; every golden export, every
  existing test and the digest are unchanged.
- **H2a:** each of the three damage rules has a hand-derived focused golden that fails with the
  rule removed; every changed golden and every changed digest fight is attributed to one rule.
- **H2b1:** the damage observer and each Flickerling trait have a hand-derived focused golden
  that fails with the mechanism removed; no Glowfly, Glow or Overcharge remains in data; the
  Flickerlings and spell changes match the content docs; every changed test and digest fight is
  attributed.
- **H2b2:** each status rule (single instance, stronger stays, applier snapshot) has a
  hand-derived focused golden that fails with it removed; no `cap`, `stacks` or `consume-stacks`
  remains in engine or data; every changed golden is attributed.
- **H2c:** the before/after report is in the PR and the phase record, every band (T1–T5) and the
  three threshold verdicts shown before and after (reported, not asserted); the DoT measurements
  for the H2d grill are in the PR (ASSUMPTION 149); mechanism goldens untouched (expected values
  byte-identical, tuned numbers pinned: ASSUMPTION 147); content goldens re-derived and listed
  where numbers changed.
- **H2d:** the CI threshold test is green, and fails on H2c's data; the before/after report is in
  the PR and the phase record; every changed number traces to an H2d grill ruling; goldens as for
  H2c.

---

## Verification (whole phase)

- Four gates green after **every** PR.
- **Byte-identical PRs** (B, D): an empty golden diff, shown.
- **Deliberate-change PRs** (C, E, F): every changed golden listed with its reason; the diff of
  each old golden contains only the listed kind of change.
- **Determinism:** the frozen double-resolve test (B) stays green through the phase, and from C2c
  every golden replays deep-frozen before every turn through the shared golden runner.
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
   Consequence: **G2 lands in F3, after A4** (not "right after" it), because
   Silenced/Pacified are authored on A3's `action-lock`, which F1 builds.
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
   the computation is float-safe (e.g. done in hundredths). *(Changed at the H2 grill: the width
   starts at 0, the minimum is rounded down, and the boss sits at `max + 5`: ASSUMPTIONS 118–119.)*
5. **XP per kill = the victim's level** (`1 × origin.level`; decided by the design owner; was
   `10 × floor`), awarded to every party member as today. **The XP curve becomes quadratic:
   `xpForNextLevel(level) = 20 × level²`** (was `100 × level`). Reasoning: one clear of floor *f*
   yields kills ∝ *f* (fight count × enemies) at victim levels ∝ *f*, so about **12–20 × f² XP**
   (computed from the decided fight count, enemy count and ASSUMPTION 4's level range: floor 1 ≈
   20, floor 10 ≈ 1,650, floor 30 ≈ 10,900, floor 100 ≈ 135,000). A linear curve would let the party
   outrun the floor more and more with depth; a quadratic one keeps **party level ≈ floor** at every
   depth. The coefficient 20 means roughly one level per 1–1.5 clears at the matching depth, leaving
   room for re-farming. Coefficient and exponent are `BalanceConfig` parameters; H tunes them.
   Currency drops stay floor-based. *(Kept at the H2 grill with the fight count: ASSUMPTION 117.)*
6. **`Instance.scriptId: null` means "the creature's default (role) script"**, resolved at
   materialization, so a role change in data flows to instances that never had a custom script.
7. **Player gem roll:** distinct spells matching the creature's affinity, from spells unlocked at the
   biome of `max(1, deepestFloor)`, one per regular gem slot (3), drawn from an RNG derived from
   `(runSeed, instance ordinal)` so gem rolls never shift floor draws; duplicates only via the same
   safety net as enemies.
8. **Confirmed.** **Starter and Unicorn roles:** Glyphmoth Seer → `caster`; Cragfang Mauler → `striker`;
   Stonehorn Warden → `taunter` (like Snapjaw Lure, its trait fires on Provoke; was `always-provoke`
   until the 4.1-G plan review); Unicorn
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
15. **Confirmed (4.1-F2 plan review).** C leaves the Web roll at turn start; F2 moves it to
    turn-end cleanup (F1 leaves it), right after the countdown. It runs on every dequeued turn's
    cleanup (a dead actor's bracket, a died-mid-turn turn), never after a mid-turn wipe, over
    living bearers in side → slot → id order, only for a Web that is present, not immune and not
    born this turn.
16. **Confirmed (4.1-F2 plan review).** C leaves the round-end status sweep in place; F2 deletes
    it (F1 adapts it to containers). Round end keeps `on-round-end` trait triggers, the round-level
    grant drain and the win check.
    C's turn-end cleanup is a seam with no status work.
17. **In C, bonus-cast and echo-cast keep their data shape and events** but run through the
    pipeline (bonus-cast in the granted-actions step); E turns them into `perform-action`.
18. **Confirmed (4.1-F2 plan review).** Born-this-turn tracking: `CombatState.turnClock`, bumped
    once per dequeued turn at the action slot (alive, dead or skipped actor), and a status
    instance's `appliedAt`, stamped on apply and on refresh. Born is `appliedAt === turnClock`, for
    the tick, the countdown and the Web roll. Plain data, invisible in events.
19. **Confirmed (4.1-F2 plan review).** Win/loss is checked **after every top-level step**: the
    action, each granted action, and each firing of the turn-start, turn-end and round-end hook
    passes, never inside a cascade. A mid-turn wipe skips the rest of the turn, still emits
    `TurnEnded`, then `FightEnded`. This matches "the fight ends the instant a side is wiped". PR
    #70 review data point: `resolveTurn` used to check only once, after `TurnEnded`; once DoTs tick
    on `on-turn-end`, that end-only check turns a win into a **draw** when the last living creature
    on the winning side dies to its own tick after emptying the other side. F2's win-check goldens
    cover that case, and a hook firing that wipes a side ahead of a later lethal firing in the same
    pass.
20. **New spell placeholder numbers:** Pounce 100% Speed; Stifling Weight Weaken at its default
    duration; Life Siphon 70% Intelligence damage + heal self for 35% of Intelligence. Tuned in H.
21. **Simulator policy and home:** `src/state/balance-sim.ts` (runs in Node) plus an `npm run sim`
    script. Policy: one run per spec per seed; pick the spec, run the intro; each floor run descends
    to `deepestFloor + 1`, or re-farms `deepestFloor` after a failed push; summon every creature that
    reaches 100% and keep the six highest-level instances in the party; spend perk points greedily in
    spec-doc order on functional perks. The policy is documented in the file header.
22. **CI thresholds:** fail only if floor-1 clear rate < 80%, the first soul takes > 30 floor runs,
    or no seed reaches floor 5 within the first 20 floor runs (the first session until the H2
    grill: ASSUMPTION 126). Everything else is reported. H1 reports them; the CI test asserts them
    from H2d (see "The split"; H2c until its plan review, ASSUMPTION 149). How each is read: ASSUMPTIONS 107 and 126 (the first soul counted
    clears until the PR #84 review).
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
28. **`TurnSkipped` names the first `'all'` lock in canonical effect order** when two are active
    (F1).
29. **The `support` role's ally-side gem filter is an engine change** in G: the cast intent's
    `gemSlot: 'random'` gains an optional `side` filter (shape pinned by the G plan).
30. **Silenced and Pacified have polarity `debuff`** (F3).
31. **Confirmed (design owner, PR #71 review).** C2a is byte-identical in behaviour, not just on
    goldens. Granted casts keep today's targeting behind `legacyGrantedTargeting` until C2b
    (B2.3) deletes it.
32. **Confirmed (design owner, PR #71 review).** The corpus digest replaces the 200-case seed sweep.
33. **Confirmed (design owner, PR #73 review).** An action ends when its actor dies (CONVENTIONS),
    built in C2c.
34. **Confirmed (design owner, PR #73 review).** The golden-runner consolidation and the two new
    pinning tests land in C2c as a separate test-only commit, not as their own PR.
35. **Confirmed (design owner, 4.1-D plan review).** A spell's effect list for one landed target is
    atomic: the dead-actor checks sit between hits, never between one target's effects.
36. **Confirmed (design owner, 4.1-D plan review).** Spell magnitudes read the caster's live stats
    when each effect runs, not an action-start snapshot.
37. **Confirmed (design owner, 4.1-D plan review).** `scalingStat: 'none'` is dropped; a
    pure-utility spell has no damage/heal effect.
38. **Confirmed (design owner, PR #74 review).** One formula for every formula-mode magnitude:
    `stat × (spellPower × multiplier)`, with no spell check. Trait `scalingStat` heals with a count
    move to it from `(stat × spellPower) × count`; neither order is more accurate, goldens and the
    corpus are unchanged, and the rare 1 HP Necromoss difference is accepted. Considered and
    rejected: separate orders per verb (zero shipped change, but two formulas for no design reason)
    and an epsilon before the floor (can't guarantee zero change; on the damage floor it changes
    corpus fights).
39. **Confirmed (design owner, PR #74 review).** No response acts on a dead target except
    `revive`: every verb with a `target` skips a dead one (`grant-action-state` included), and
    `cast-target` resolves to the landed target without an alive check. Targetless `consume-stacks`
    runs whenever its trigger does, including `on-death`.
40. **Confirmed (design owner, PR #74 review; perks added at the 4.1-D2 plan review).** The corpus
    covers all real content: every registered spell is cast with its effects landing, every
    registered status is applied, and every specialization perk with effects matters (removing it
    changes its fight's event log). Explicit, reasoned exemptions only, enforced by a test. It lands as its own test-only slice, **4.1-D2**, between D and E, so
    E and F start from full coverage (one golden policy per PR, one digest regeneration per PR).
41. **Confirmed (design owner, 4.1-E plan review).** `ActionGranted` is emitted when the queued
    grant runs and is accepted (after legality and the gem and target draws, immediately before the
    granted action's first event), not at trigger time. A grant's success is only known when it
    runs, and a refused grant emits nothing of its own.
42. **Confirmed (design owner, 4.1-E plan review).** `perform-action`'s `actor:
    'triggering-source'` resolves to the hook's source even when that is the bearer. The PR #64
    rule covers response targets only. Overtone keeps echoing its own casts, as it does today.
43. **Confirmed (design owner, 4.1-E plan review).** Only the actor's state decides a queued
    grant: dead, skipped turn or locked when it runs means refused. The bearer dying after its
    trigger fired does not cancel it.
44. **Confirmed (design owner, 4.1-F1 plan review).** `action-lock`, like every effect, may be
    carried by a trait as well as a status. `TurnSkipped` is `{ creatureId, effectId }`, where
    `effectId` is the carrier's definition id (the status id for a status), as in `TriggerFired`.
45. **Confirmed (design owner, 4.1-F1 plan review).** A turn is skipped when an `'all'` lock is
    active right after the turn-start hook pass or at the action slot. A lock gained during the
    actor's own turn-start hooks skips that turn (GAME_DESIGN: "the check happens when the
    creature's turn comes up"); no shipped content gains or loses a lock at turn start.
46. **Confirmed (4.1-F1 plan review; CONVENTIONS B2 rule 2, GAME_DESIGN "a lock stops every
    action").** An `'all'` lock makes every action kind illegal, Defend, Provoke and Wait included.
    No shipped content grants those to a locked creature, so nothing changes today.
47. **Confirmed (4.1-F1 plan review).** Every effect is carrier-agnostic and read through the one
    iterator. Inside a status the validator rejects `stat-modifier`, `stat-remap`,
    `status-immunity` and `innate-spell`; `turn-order.breakChancePercent` is rejected outside a
    status. Immunity skips every effect kind of the status (turn-order and the Web roll included)
    and is read only from non-status carriers.
48. **Confirmed (4.1-F1 plan review).** The status damage-modifier stays its own category; no
    fold into `conditional-damage-bonus` or `taken-reduction`.
49. **Decided (design owner, 4.1-F2 plan review).** One born window: a status starts at the first
    action slot it is present for. Applied or refreshed since the current turn's action slot, it
    neither ticks, counts down nor rolls (Web) that turn; applied earlier in the turn, it does.
    Keeps ASSUMPTION 45 and "Stun 1 skips exactly one turn". The Spiders' Weaver (`spider-weaver-
    web-strike`) moves from `on-turn-start` to `on-turn-end`, so its Web is born and its own
    cleanup doesn't roll it: the same rolls per round as before F2. Considered: a second, whole-turn
    window for the Web roll only (rejected: a special window kept for one trigger whose turn-start
    timing has no effect in play, since Web acts on the next round's turn order).
50. **Confirmed (4.1-F2 plan review).** The status validator rejects a `triggered` effect on
    `on-round-end`, and runs over the registry `createCombat` is given as well as at import.
51. **Confirmed (4.1-F2 plan review).** A corpse's statuses are inert: no countdown, no
    `StatusExpired`, no roll. Revive replaces them. No wipe-on-death is built.
52. **Confirmed (4.1-F2 plan review).** The born-this-turn tick gate reaches `fireHook` through
    `FireHookOptions`, passed only by `resolveTurn`'s `on-turn-end` call; `fireHook` has no
    hook-specific rule.
53. **Confirmed (4.1-F2 plan review).** `golden-castable-draw` is retired (its granted cast after a
    wipe is unreachable). The castable filter stays pinned by the `resolveIntent` unit test in
    `actions.test.ts`, shown failing with the filter removed.
54. **Confirmed (4.1-F2 plan review).** `CombatState.turnClock` and `StatusEffect.appliedAt` are
    new; test files that build those shapes get shape-only edits.
55. **Confirmed (4.1-F2 plan review; amended at the PR #80 review).** The goldens named for the
    round-end sweep are renamed to turn-end names (`git mv`), with an old → new map in the phase
    record, as in 4.1-E: `golden-round-end-mid-sweep-poison(-refresh)` →
    `golden-turn-end-dot-kill-burst(-refresh)`. `golden-round-end-interaction` keeps its name: it
    pins the round-end trait pass, which F2 keeps.
56. **Confirmed (4.1-F3 plan review).** Silence and Pacify carry no numbers beyond the inherited
    3-turn duration; ids `silence` / `pacify`, statuses `silenced` / `pacified`. Tuning is H's.
57. **Confirmed (4.1-F3 plan review).** `ALL_SPELLS` gets Silence, then Pacify, appended last; a
    test pins the existing 25 ids in order, so the registry stays append-only.
58. **Confirmed (4.1-F3 plan review).** The new corpus fights are appended after the current last
    entry: the two perk variants at the end of `PERK_FIGHT_VARIANTS` (entries 522–523, seeds
    2107–2108), then the Silence and Pacify spell fights (entries 524–525, seeds 2015–2016). The
    Pacify caster is a Wit creature with no innate spell (the Sorcerer starter's Arcane Bolt would
    take slot 0).
59. **Confirmed (4.1-F3 plan review).** The perk coverage fights ride on no chance:
    `always-cast` casters on the higher-level side, an all-caster party against Silence and an
    all-attacker party against Pacify.
60. **Confirmed (4.1-F3 plan review).** A spell is status-only when every effect is
    `apply-status`; it keys by `affinity|shape|status:<sorted status ids>`.
61. **Confirmed (4.1-F3 plan review).** The fight-start check reuses `fightOver`: on the hook
    pass, on its drain, and as a win/loss check after both, before `RoundStarted`. A probe at the
    plan review showed it changes no existing test or digest entry.
62. **Confirmed (4.1-F3 plan review).** Digest attribution compares each fight's materialized
    parties (every creature's equipped spells, both sides) on `main` and the branch. Identical
    parties must give an identical log; a fight with identical parties and a different log is a
    bug, reported, never accepted.
63. **Corrected (4.1-F3 plan review).** The immunity golden uses the **real** perks (Clear Mind,
    Aggressive), not trait-borne fixture immunity. The golden runner gains optional per-side
    effects, passed straight to `createCombat`'s existing `effects` input; existing fixtures are
    unaffected. Shipped content is what the golden pins; the carrier-agnostic iterator is already
    pinned by F1's tests.
64. **Confirmed (4.1-F3 plan review).** A Violence or Wit cast-role enemy rolling Silence or
    Pacify as its only gem is not a bug in F3; no engine or generation branch (see G2).
65. **Confirmed (4.1-F3 plan review).** The content edit is `content/overgrowth.md` only: the two
    spells join its spell table and Silenced / Pacified its statuses, with the plain-language rules.
66. **Confirmed (4.1-G plan review).** G ships as G1 (enemy behaviour), then G2 (hub and store);
    see "The split: G1, G2".
67. **Confirmed (4.1-G plan review).** The cast-role ids (`caster`, `support`, `opener`) are a named
    constant in `generation.ts`; the engine imports no data. `always-cast` is no longer a cast role.
68. **Corrected (design owner, 4.1-G plan review).** The shipped script registry
    (`STOCK_SCRIPTS_BY_ID` in `data/scripts.ts`) holds **only the seven role scripts**. The five
    `always-*` scripts move unchanged to `src/engine/__fixtures__/scripts.ts`, with their own
    registry:
    - Every test, golden and Part C coverage fight that uses them imports that registry instead.
    - The move is G1's **stage 0**: byte-identical, with every golden export and the digest unchanged
      (the fixture registry holds exactly the five, so a re-exported `scripts` is deep-equal to
      `main`'s).
    - `always-provoke`'s two real users get the seventh role, **`taunter`** (1. Provoke · 2. Attack
      lowest-HP enemy · 3. Cast random gem). It behaves identically, since Provoke is legal on
      every turn that isn't skipped.
    - The demo declares its five scripts locally.
69. **Confirmed (4.1-G plan review).** The support filter is `gemSide?: 'ally' | 'enemy'` on the
    `gemSlot: 'random'` cast variant, filtering on `spell.targetSide` (AOE spells included). It is
    read at both sites, `checkLegality` and `resolveGemSlot`. With it absent, the code path and the
    draw are unchanged.
70. **Confirmed (4.1-G plan review).** Loadout rule: one `weightedPick` per regular slot (3), each over
    the affinity-matched unlocked pool minus the spells already chosen; when that runs out, the
    remaining slots draw from the full pool (the safety-net duplicates). Every enemy draws whatever
    its role. An empty pool draws nothing, and a cast-role creature with an empty pool throws.
71. **Confirmed (4.1-G plan review).** A "usable spell" for the cast-role check is affinity-matched
    and unlocked at the biome, not castable in a given fight.
72. **Confirmed (4.1-G plan review).** The boss fill takes `max(0, enemyPartySize(floor) − 1 −
    adds)` slots. If the pool minus the boss's species has no positive-weight species, the fill is
    empty and nothing throws; a data test pins 6 creatures at every shipped boss floor. Slot
    indices continue after the adds.
73. **Confirmed.** The starters take their roles in G1 (ASSUMPTION 8), which changes Part B.
74. **Corrected (4.1-G plan review).** The spell dedup key reads the stat a damage or heal effect
    actually scales from: `scalingStat`, else `offStat` normalized (`'cast'` → `intelligence`,
    `'attack'` → `attack`). Pounce (Speed) and Stinger Swarm (Intelligence) then differ. A spell that
    names the same stat both ways still collides.
75. **Confirmed.** The new spells' numbers are ASSUMPTION 20's:
    - Pounce: `scalingStat: 'speed'`, 1.0, `damageSource: 'cast'`.
    - Stifling Weight: `apply-status weaken`, inherited duration.
    - Life Siphon: `deal-damage` (cast, 0.7) plus `heal(self)`, Intelligence, 0.35.
76. **Confirmed.** `FIXTURE_CASTER`'s role becomes `caster`; no golden imports the biome fixtures.
77. **Corrected (4.1-G plan review).** Digest attribution, stage by stage:
    - Stage 0 (the fixture move, ASSUMPTION 68) must leave every golden export and the digest
      byte-identical.
    - Apply the stages cumulatively in a scratch copy and take the digest after each: (1) spells,
      (2) full gem sets, (3) roles, (4) boss fill. Each fight is attributed to the first stage that
      changes it, and stage 4 equals the committed digest.
    - At every stage, compare each fight's full materialized parties against the previous stage:
      every field of every creature, both sides, scripts and gems included.
    - An identical party must give an identical log; one that doesn't is a bug. Every changed log
      must have a changed party.
    - Report per stage: changed parties, changed logs, result flips with fight numbers.
78. **Confirmed.** Mutation checks run in a scratch copy, never in the workspace.
79. **Corrected (4.1-G plan review).** Part C's members pin their current scripts explicitly,
    from the fixture registry (ASSUMPTION 68).
    Today they take their creature's default script, which G1 changes. Pinned, every Part C entry
    (500–525) stays byte-identical, and the coverage fights keep riding on no chance by
    construction. Role behaviour is covered by Parts A and B.
80. **Confirmed.** Fill creatures on a boss floor give ordinary per-kill rewards, soul% included
    (GAME_DESIGN "Milestone bosses").
81. **Confirmed (4.1-G2 plan review).** A player instance's roll pool excludes the spells it holds
    innately, read from its traits' `innate-spell` effects, so the Seer rolls 3 distinct Wit gems
    and holds Arcane Bolt on top. The rule is general, not a Seer branch. It lives in the store
    (which has the trait registry); a data test pins that no spawnable creature or boss carries an
    innate spell, and that every starter's and the Unicorn's pool minus its innate spells holds ≥3
    spells at biome 1.
82. **Confirmed (4.1-G2 plan review).** The unlock biome is the biome of `min(100, max(1,
    deepestFloor))`, through `biomeForFloor` with empty pins: atlas pins never change a roll, and
    the pool stops growing at floor 100.
83. **Confirmed (4.1-G2 plan review).** `Instance.gems` is `(spellId | null)[]`, slot-positional,
    one entry per regular gem slot. Tests build instances in that shape (never `[]`, which would
    materialize with no gem slots at all).
84. **Confirmed (4.1-G2 plan review).** An unknown stored spell id throws when the party is
    resolved.
85. **Confirmed (4.1-G2 plan review).** No save migration: nothing persists before Phase 5, and
    save v1 is defined with `gems`.
86. **Confirmed (4.1-G2 plan review).** `scriptId: null` already resolves to the role through
    `materializeCreature`'s `scriptId ?? defaultScriptId`; G2 adds the store test.
87. **Corrected (4.1-G2 plan review).** `newGame({ seed })` requires an integer in `0 ..
    2^32 − 1` and throws otherwise (the RNG takes `seed >>> 0`, so a wider seed would alias).
    `state.runSeed` is the source of truth; `deps.runSeed` only seeds a fresh store.
88. **Confirmed (4.1-G2 plan review).** `refundAllPerks` can't fail and has no `can…` query.
89. **Confirmed (4.1-G2 plan review).** `summon` leaves `soulProgress` at 100: summoning is free
    and unlimited.
90. **Confirmed (4.1-G2 plan review).** `summon` doesn't read `BalanceConfig.summonCost`. Summoning
    is free (GAME_DESIGN), and the cost has no currency until Phase 8's Soul Altar; the field's
    comment says so.
91. **Confirmed (4.1-G2 plan review).** A creature `findStaticCreature` can't resolve is
    `unknown-creature`. The starters and the Unicorn resolve but never bank soul, so they fail with
    `soul-incomplete`.
92. **Confirmed (4.1-G2 plan review).** Failure reasons are checked in the listed order; a
    non-integer slot is `slot-out-of-range`; every `can…` query calls the action's own check.
93. **Confirmed (4.1-G2 plan review).** The perk budget is `Σ level × costPerLevel` with the
    change applied, against `bossesCleared.size × 100`; lowering a level never fails on budget.
94. **Confirmed (4.1-G2 plan review).** The starters and the Unicorn roll their gems through the
    same path as a summon, at grant time, with the grant's ordinal.
95. **Confirmed (4.1-G2 plan review).** The only engine edit is exporting `rollLoadout`, body
    unchanged.
96. **Confirmed (4.1-H1 plan review).** The simulator summons each creature id once, the first time
    its soul reaches 100%, tracking summoned ids itself (a summon leaves soul at 100%). Ids already
    owned (the starter, the Unicorn) start in the set; a pass summons in `soulProgress` key order.
97. **Confirmed (4.1-H1 plan review).** After a clear the next run pushes to `deepestFloor + 1`;
    after a failed push the next run re-farms `deepestFloor`, or retries floor 1 while
    `deepestFloor` is 0.
98. **Decided (4.1-H1 plan review).** A **hard wall** is 5 failed pushes in a row at one floor
    (re-farm runs between them don't reset the count). A seed doesn't stop at a wall: the
    simulator records the first wall floor and keeps going until it clears floor 30 (the content
    frontier) or reaches its run cap (400 floor runs, a named constant). The report shows the
    first-wall floor per seed, the failed-push counts per floor, the stop reason and how many seeds
    reached each floor.
99. **Confirmed (4.1-H1 plan review).** Before each descent the party is the six highest-level
    instances, ordered level descending then instance ordinal ascending, set into slots 0–5
    through `setPartySlot`.
100. **Confirmed (4.1-H1 plan review).** A perk is functional when `resolvePerkEffects(perk,
     maxLevel)` is non-empty. Before each descent the simulator refunds and re-buys from scratch:
     each functional perk in data order (the spec docs' order) takes the most levels the
     remaining budget (`perkPointsFor`) allows, then the next.
101. **Decided (4.1-H1 plan review).** The boss-aimed lock run goes through the real store, not a
     re-implementation of its party materialization:
     - one store, built with the stock scripts plus the probe script (a registered script nothing
       references is inert: the registry is only looked up by id);
     - the probe creature is the active-party instance with the highest level (ties: ordinal) whose
       **stored** gems already hold Pacify. Its gems are never edited, and with no such creature
       the run is reported `n/a`. The Seer always qualifies;
     - the probe script is the creature's own script with `Cast <Pacify's cast slot> →
       highest-hp-enemy` added as the first rule. A cast slot counts the creature's innate spells
       first;
     - the state is snapshotted before the probe descent and restored after it, so the policy run
       fights the identical floor and only the policy run advances the seed.
102. **Confirmed (4.1-H1 plan review).** A boss's **locked turn** is a turn it starts while holding
     any status whose effects include an `action-lock`, read from the status registry (today Stun,
     Sleep, Silenced and Pacified), reported by scope. The report also counts how often the probe's
     Pacify lands on the boss, and separates a boss floor's first visit from all visits.
103. **Confirmed (4.1-H1 plan review).** A `StatModifierApplied` is attributed to the latest
     `TriggerFired` effect id or `SpellCast` from its source in the current turn, else to
     `(unattributed)`, whose count is reported. A stack is the number of such applications per
     (target, attribution) within a fight.
104. **Confirmed (4.1-H1 plan review).** T5's enemy column is the curve (`enemyLevelRange`,
     `bossLevel` on boss floors) under the active config; the party column is the active party's
     mean level at the start of each floor run.
105. **Confirmed (4.1-H1 plan review).** `npm run sim` is `vitest run <file> --mode sim`, the corpus
     pattern, with no new dependency. The full report runs 40 seeds (1–40) per spec, only in sim
     mode; the normal suite runs determinism on 3 seeds over the first 10 floor runs plus the
     mechanism tests.
106. **Confirmed (4.1-H1 plan review).** H1's tests assert determinism, report shape and the policy
     mechanics, never a balance value, so H2's tuning doesn't rewrite them. T1 is the first-try
     floor-1 clear rate, the reading ASSUMPTION 22's floor-1 threshold uses too.
107. **Decided (PR #84 review).** ASSUMPTION 22's thresholds, read over the 40 seeds of one spec:
     - **floor 1:** the first-try floor-1 clear rate (ASSUMPTION 106); fails below 80%;
     - **first soul:** per seed, the floor runs until some soul first reaches 100% (T2's unit,
       not clears: a kill banks soul in a lost floor too, so counting clears can't fail while
       floors are unclearable). The threshold is the **median over seeds**, a seed that never
       completes a soul counting as infinite; it fails when the median is above 30;
     - **floor 5:** a seed reaches floor 5 when one of its first 20 floor runs is on floor 5 or
       deeper (reaching a floor is fighting on it, not clearing it); fails when no seed does.
       *(First 10 floor runs until the H2 grill: ASSUMPTION 126.)*
     The report shows each threshold's value next to its verdict, and the pure function that
     computes them is tested on hand-built seed results, so 4.1-H2d's CI test asserts a computation
     that is already pinned.
108. **Decided (PR #84 review).** T4's hard wall stays 5 failed pushes at one floor (ASSUMPTION
     98). On H1's report every seed walls before floor 10, and the walls are real: the worst floor
     below 10 costs a median seed 13 failed pushes (Brute), about 18 (Sorcerer) and about 40
     (Shieldbarer), and clearing floor 10 first takes Brute 64–138 floor runs and Sorcerer 89–202,
     while 15 Shieldbarer seeds never clear it in 400. A larger count would define the problem
     away rather than measure it (at 10 failed pushes 34, 40 and 39 seeds still wall). The cause is
     fight-count compounding: per-fight win rates of 0.80–0.96 over 15–20 fights. The report adds
     the magnitude per seed (the most failed pushes on one floor below 10, and the floor runs to
     the first floor-10 clear), so H2 tunes against a distance, not a yes/no.
109. **Decided (H2 grill).** **The chip floor stays 1%** (`CHIP_FLOOR_RATE`). Measured at 5%: the
     round-cap draw rate roughly halved (Brute 2.0% → 0.8%, Sorcerer 5.9% → 2.9%, Shieldbarer 12.0%
     → 7.1%) and the deep game sped up, but it changes every hit, lowers Defence's worth everywhere
     and can't reach the level-1 regime (5% of 10–15 offence is under 1). Diminishing returns on
     stacked stats (gains past 5× base worth less) was also measured and changed nothing: past the
     attacker's offence every hit is the chip, however far past.
110. **Decided (H2 grill).** **The Additional: a fading flat bonus on direct hits** that speeds up
     early fights. Per direct hit (ASSUMPTION 112), after the formula's `MAX(1, floor(...))`:
     `additional = min(floor(0.2 × target's effective max HP), max(0, 10 − (attacker level − 1)))`,
     so 20% of the target's max HP, capped at 10, the cap falling by 1 per attacker level and gone
     from level 11. **Nothing modifies it:** not Defence, affinity, either pool or Defend. Both
     sides get it (one general model). Indirect damage, DoT ticks and heals never get it. The 0.2
     and the 10 are combat rule constants in `engine/config.ts`. Measured: round-cap draws on
     floors 2–5 fall to about 0, and floor-1 fights against the tanky creatures shorten from 10–40
     rounds to 3–6; it costs Brute and the Shieldbarer some first-try floor-1 clears, since enemies
     get it too. Rejected: player-side only (breaks one general model); Defend softening it
     (measured, no difference).
111. **Decided (H2 grill).** **The combat creature carries an engine-visible `level`**, set by
     `materializeCreature` from the level it bakes in; the Additional reads it. `origin` stays
     engine-inert (CONVENTIONS); the `makeCreature` test helper supplies a default.
112. **Decided (H2 grill).** **Two damage channels.**
     - **Direct:** an Attack or Cast **action** from any source (script, fallback, a trait-granted
       `perform-action`), including every effect of the cast spell. The existing formula, plus the
       Additional.
     - **Indirect:** every other damage: a trait, status or perk response (retaliation, on-death
       bursts, on-attack bonus hits) and DoT ticks (ASSUMPTION 113).
       `raw = magnitude × affinity × (1 + Σ dealtMods) × Π(takenFactors) − 0.2 × effective Defence`,
       then `MAX(1, floor(raw))`. The magnitude is the response's own (`offStat`/`scalingStat` ×
       spellPower × count). Armor penetration reduces the Defence term and Defend's ×1.5 Defence
       and ×0.65 taken factor apply as they do today. No chip, no Additional.
     - Heals are neither.
     Why: Defence-based creatures get a counter (indirect damage meets only 20% of their Defence),
     and reactive traits stop being cosmetic against tanks. The split measured roughly neutral on
     balance. It made enemy retaliation much stronger too (ASSUMPTION 124, Snapback).
113. **Decided (H2 grill).** **DoT and Regen scale off the applier, not the bearer.** At
     application the status instance records a **snapshot**: the applier's id, its affinity, and
     the potency `floor(floor(applier's effective stat) × percent / 100)`. A tick is that potency:
     - **damage ticks are indirect damage** (ASSUMPTION 112) with the applier's snapshotted
       affinity, the bearer's live taken pool and Defence, and no dealt pool (the applier's build
       is already in the snapshotted stat); the damage source is the applier while it lives, else
       the bearer (so its on-kill and on-damage-dealt hooks fire). **A tick offers no
       `triggering-source` to the bearer's responses**, as today, so Snapback, Thorns, Bulwark,
       Retaliate and the Wretch's Confusion never answer a tick (decided at the doc-sync,
       2026-10-08: DoT is the counter to Defence tanks, and most retaliators are those tanks);
     - **Regen heals** the potency (no Defence).
     Placeholder numbers (H2d tunes them, ASSUMPTIONS 129, 149): **Poison 20% of Attack, Burn 25% of
     Intelligence, Regen 10% of the healer's Health, Spore 15% of Speed.** *(Decided at the H2d
     grill, ASSUMPTION 152: Poison 40%, Burn 35%, Spore 35%, Regen 10%.)* A status that applies
     itself through its own effect passes its snapshot on (Spore spreading on death keeps the
     original strength; ASSUMPTION 143). Integer percent, one floor (the percent-hp brief's float rule). This
     reverses the Phase 4 percent-of-max-HP model (`phase-4-percent-hp-condition-ticks.md`), whose
     only objection to stat-scaling was reading the victim's stats; the snapshot reads the
     applier's. Rejected: DoT as a third "true damage" channel (measured indistinguishable for the
     Sorcerer; a bigger percentage answers Defence instead).
114. **Decided (H2 grill).** **Statuses never stack: one instance per status per creature.** On
     re-application **the stronger value stays and the timer refreshes** ("stronger" is the
     snapshot potency for DoT and Regen; a fixed-magnitude status just refreshes; a tie keeps the
     current one). Deleted: `StatusDef.cap`, `StatusSpec.stacks`, stack increments, the
     `consume-stacks` response and the `consumed-stacks` magnitude source, the ×stacks count on
     ticks and `magnitude ** stacks` on damage-modifiers, and stack counts in status events.
     Content: Vulnerability is ×1.5 once (its ceiling was ×2.25); Sporch Igniter applies one Burn
     (its "potent" Burn now comes from the numbers, H2c); Glow is deleted with Glowflies
     (ASSUMPTION 116). Why: Glow was the only real stack resource, and without it stacking only
     added a counter; a single instance makes the applier snapshot unambiguous. (The Resonant
     Overtone's `stacks: false` is a different field, on its observer trigger, and stays.)
115. **Decided (H2 grill).** **The action-observation system also observes damage events.** An
     observer can react to damage dealt to a creature, filtered by the damaged creature's
     relationship (self, ally, enemy, any) and by whether the damage was **self-inflicted**.
     Self-inflicted means exactly ASSUMPTION 116's cost case (a creature's own trait, status or perk
     response damaging itself); **a DoT tick is never self-inflicted**, whoever applied it and
     whether the applier lives (decided at the doc-sync, 2026-10-08: with the dead-applier fallback
     a tick's source can be its bearer, and the Flare must not read that as a sacrifice; ticks also
     never draw retaliation, ASSUMPTION 113). An extension of the existing observer, not a new side
     channel; H2b's plan proposes its exact shape. First user: the Flickerling Flare.
116. **Decided (H2 grill).** **Flickerlings replace Glowflies** in Glimmerdark (Glow was the mirror
     of Weaken and Vulnerability once its stacks were gone). Mood: pale cave-dwellers whose glow is
     their life.

     | Creature | Rarity, role | Affinity | Script | Health / Atk / Int / Def / Spd | Trait |
     |---|---|---|---|---|---|
     | Flickerling Wick | common, enabler | Vitality | `support` | 38 / 10 / 16 / 14 / 16 | At the start of its turn, burns 10% of its own max HP to heal its lowest-HP ally **other than itself** for 20% of its own max HP; no burn when there is no one else to heal |
     | Flickerling Flare | uncommon, payoff | Wit | `caster` | 25 / 14 / 22 / 10 / 22 | Whenever an ally damages itself, every ally permanently gains +15% Speed |
     | Flickerling Last Gleam | rare, amplifier | Violence | `striker` | 28 / 24 / 10 / 14 / 18 | Whenever an ally dies, every ally permanently gains +20% Attack |

     Health is on the new 20–45 scale (ASSUMPTION 125); the totals on the old scale (80 / 82 / 82)
     match the Glowflies. Names are placeholders. If the ally selector can't exclude the bearer,
     H2b adds that. Spells: **Beacon Charge** keeps its heal and applies **Grant Act First** instead
     of Glow; **Overcharge** is deleted. Glimmerdark's affinity spread moves from 4 Wit, 4 Instinct,
     4 Violence, 4 Endurance and 2 Vitality to 4 / 3 / 5 / 4 / 2.
     **Two items the grill missed, decided at the doc-sync (2026-10-08):**
     - **Luminous Tide becomes Kindred Light** (id `kindred-light`). It keeps its team heal (20%
       of the caster's Health to every ally) and loses the Glow; the old name described the Glow
       wave, not a team heal. Why not Grant Act First instead: on the whole side it would make the
       first AOE support spell a team-wide tempo swing, and a team heal is already distinct. The
       id changes with the name, so H2b's plan lists what reads it (the spell registry, the store's
       gem-set test, the digest).
     - **Self-inflicted trait damage is a cost.** As an ordinary trait response the Wick's burn
       would be indirect damage (ASSUMPTION 112), and a fifth of the Wick's own Defence would eat
       most of it (at level 1, 10% of 38 is 3.8 against 2.8 of Defence: a 1-HP cost for a 7-HP
       heal). So, as a general rule rather than a Wick exception: **damage a creature's own trait,
       status or perk response deals to that same creature is a cost**: the exact amount, with no
       Defence, pools, affinity or Additional. It is still a damage event with the creature as its
       source (so the Flare observes it and `on-damage-taken` fires), and it can kill. A DoT tick is
       never covered: it is never self-inflicted (ASSUMPTION 115). It lands in H2a with the other
       channel rules; H2a's plan pins the shape (likely the existing flat-mode `deal-damage` aimed
       at `self`).
117. **Decided (H2 grill).** **The fight count stays `10 + (floor − 1)`, and the XP curve stays
     `20 × level²`.** CONVENTIONS' revisit trigger was evaluated: floor clears do follow p^n, and a
     flat 10 (with the XP curve re-fitted) was measured faster (Brute's floor-10 first clear 93.5 →
     56 median floor runs), but the design owner keeps the growing count and balances the early
     floors through the level range (ASSUMPTION 118). Watch point: the per-fight win rate a floor
     needs rises with depth (about 0.89 at 10 fights, 0.94 at 19, 0.97 at 39 for a 30% floor
     clear); T4 shows whether the curve keeps up.
118. **Decided (H2 grill).** **The early-floor level range:** `levelRangeWidth.base` 2 → 0, so
     `max = min + floor(floor / 10)`, and the minimum is **rounded down** (`floor` instead of
     `round`, in both branches of the curve) so it never exceeds `floor × multiplier`. Floors 1–10
     spawn at 1, 2, 3, 5, 6, 7, 9, 10, 11 and 13; floor 30 stays at 44. The multiplier curve (1.25
     → 2.0) is unchanged. Measured with the new combat rules (first-try floor 1 / floor-10 first
     clear): Sorcerer 15 → 34 of 40 / 144 → 107; Brute 30 → 32 / 89.5 → 60; Shieldbarer 10 → 15 /
     223 → 173.5. Rejected: width 0 with rounding (floor 2 stays at level 3); a multiplier starting
     at 1.0 (stronger, but changes every floor, not the early ones).
119. **Decided (H2 grill).** **`bossLevelOffset` 3 → 5**, so the narrower range doesn't make bosses
     easier: boss levels 19 / 34 / 52 on floors 10 / 20 / 30, against 19 / 35 / 52 before. Bosses
     stay one fight (ASSUMPTION 122).
120. **Decided (H2 grill).** **No per-turn break-through chance on locks.** H1's probe raised the
     boss's locked-turn share on every boss floor and the clear rate on none but the Leech
     Sovereign's (+4 to +8 points over all visits): Pacify costs a turn and buys a turn. Measure
     again when content first applies Stun, and when Phase 6 adds a "target lacks status" condition.
121. **Decided (H2 grill).** **No target band for round-cap draws, for now.** The draw rate stays in
     the report. (Measured with the new rules: Sorcerer about 4–5%, Brute about 2%, Shieldbarer
     about 10–12% of fights; the stalls come from stacked growth traits, mostly the player side's
     Rallying Cry and Taking Root.)
122. **Decided (H2 grill).** **Bosses stay one fight**, and are accepted as the breather after the
     hardest stretch of a biome (Brute clears floor 10 on 85% of first visits, against 0–8% of
     first pushes on floors 2–9). Their level is held (ASSUMPTION 119).
123. **Decided (H2 grill).** **The Shieldbarer starter: Attack 10 → 15, and its role script
     `taunter` → `warden`.** Its stat total becomes 90 like the other starters. Under `taunter`
     ("always: Provoke") it never attacked, so Attack was never read and Rallying Cry fired every
     turn; under `warden` it Provokes only when an ally is below 50% HP and attacks otherwise, so
     its Attack, Shield Bash and Armor Piercer matter. **Rallying Cry is unchanged**; perks carry
     its damage after floor 10.
124. **Decided (H2 grill).** **Snapback (Snapjaw Jaws) 60% → 30% of Attack**, the generic
     Retaliate's number: as indirect damage it beat the Shieldbarer pair in every floor-1 fight at
     60%. **Arcane Bolt spell power 0.5 → 1.0.** *(Snapback back to 60% at the H2d grill,
     ASSUMPTION 151.)*
125. **Decided (H2 grill).** **Health's base range is 20–45; the other four stats stay 10–30.**
     Every creature's Health is remapped linearly: `new = floor(20 + (old − 10) × 1.25 + 0.5)` (14 →
     25, 18 → 30, 20 → 33, 24 → 38, 25 → 39, 30 → 45). Max HP is still the Health stat; creatures
     are beefier and less flimsy, and each keeps its place in the range. Rarity still isn't power.
     Measured on the full decided set ("What the evidence said"): it lifts first-try floor 1 for the
     Sorcerer (33 → 40 of 40) and Brute (32 → 35), and slows the mid-game for all three; the
     Shieldbarer pays most (floor 1 28 → 26; floor-10 first clear 145 → 213 median floor runs, 13
     seeds of 40 never clearing it in 400 runs). H2d tunes against that (ASSUMPTIONS 129, 149).
126. **Decided (H2 grill).** **ASSUMPTION 22's floor-5 threshold reads the first 20 floor runs**
     (was 10). On H1's report, and in every configuration measured before the full decided set, no
     seed of any spec reached floor 5 in 10 runs; in 20, most do. On the full decided set 4 / 12 /
     0 seeds (Sorcerer / Brute / Shieldbarer) do within 10 and 40 / 40 / 26 within 20, so 20 stays
     the right window: at 10 the Shieldbarer would fail. The floor-1 (80%) and first-soul (≤ 30
     floor runs) thresholds are unchanged.
127. **Decided (H2 grill).** **The report adds, in H2c:** a floor 1–5 matchup table (per enemy
     creature: fights, wins, losses and round-cap draws, per spec) and the **first-try clear rate
     per floor** (each seed's first run on that floor). No draw attribution by trait (no draw band,
     ASSUMPTION 121).
128. **Decided (H2 grill).** **H2 ships as H2a (damage rules), H2b (status rules and the content
     they need), H2c (tuning)**, in that order: tuning on the final rules, and each rules PR
     changing its own goldens for one reason. Before H2b's plan the Glowflies replacement was
     designed (ASSUMPTION 116).
129. **Decided (H2 grill).** **H2c's plan proposes the remaining per-item fixes** from the floor 1–5
     matchup table, aimed at the floor-1 threshold (80%) for every spec, and tunes the DoT
     percentages. On the full decided set only the **Shieldbarer** misses the floor-1 threshold (26
     of 40, 65%; Brute 35, Sorcerer 40), and it is also the spec the Health remap slowed most
     (ASSUMPTION 125). Measured before the remap, its remaining floor-1 losses were to Wit casters
     (Spider Weaver, Pollinator Beneficiary and Pollenlord; Wit beats its Endurance).
     *(Amended at the H2c plan review, ASSUMPTION 149: the design owner decides these fixes and
     percentages in the H2d grill; H2c's plan proposes none.)*
130. **Decided (H2a plan review).** **Each caller states the damage channel.** `executeAttack`
     (every instance and every Splashing hit) and `executeSpellEffects` pass `'direct'`; `fireHook`
     passes `'indirect'`. A granted `perform-action` needs nothing: it runs later through
     `executeAttack` or the cast path. **`HookContext.channel` is required** (design owner, H2a
     plan review), so the compiler catches any caller that doesn't state it; every context built in
     tests states it too. The `damageSource` label stays a display tag (Snapback keeps 'attack' and
     is indirect).
131. **Decided (H2a plan review).** **The tick test.** A `deal-damage` with `context.statusId`
     defined, in flat mode, targeting its bearer is a DoT tick: in H2a it stays on today's
     `applyFlatDamage` path (floor, minimum 1). It is never a cost, and H2b reuses the same test
     for "a tick is never self-inflicted" (ASSUMPTION 115). It does not read `damageSource: 'dot'`:
     `CATASTROPHIC_COLLAPSE` carries that label with no `statusId` and is a cost. **Superseded in
     4.1-H2b2** by ASSUMPTION 144: a tick is the `snapshot-potency` response.
132. **Decided (H2a plan review).** **The cost (ASSUMPTION 116) in detail.**
     - A cost is a `deal-damage` on the indirect channel whose **resolved** target id is the firing
       creature (a selector landing on itself counts). A spell effect on its own caster is direct.
     - Amount: the magnitude, floored once, **minimum 0**. A cost of 0 is a full no-op (no event, no
       hooks), like a zero `magnitudeSource` count (PR #64 fix 4): the minimum of 1 exists so a hit
       always lands, and a cost isn't a hit.
     - It goes through `applyDamageAndEmit`, so Last Stand can save a lethal cost and
       `on-damage-taken` fires. `DamageDealt`: `rawDamage` = the magnitude, `finalDamage` = the
       floor, `affinityMultiplier` 1, `wasChipOnly` false, the label as tagged.
133. **Decided (H2a plan review).** **Test creatures default to level 11.** `makeCreature` sets
     `Creature.level` to 11 unless overridden, where the Additional is 0, so mechanism goldens keep
     their direct numbers and the Additional is tested only where a golden sets a level.
     `origin.level` keeps its default of 1, so XP-reading tests don't move. In production both come
     from one variable in `materializeCreature`, and a test asserts `level === origin.level` for
     materialized creatures. The demo's and `effective-stats.test.ts`'s literal creatures get
     `level: 1`, matching their `origin.level`.
134. **Decided (H2a plan review).** **What indirect damage keeps.** Affinity, the dealt pool
     (including `conditional-damage-bonus`, with today's `actionKind` gating; a flat or
     `scalingStat` response is Attack-flavoured unless tagged 'cast'), the taken pool, Defend
     (×1.5 Defence, ×0.65 taken) and armor penetration on the Defence term. **Cross-stat
     contribution is direct only** (Shield Bash, Aggressive Caster: the perks say "attacks and
     spells"), so Thorns no longer gets Shield Bash's bonus. (The H2c baseline's scratch build
     included it; only Thorns is affected.)
135. **Decided (H2a plan review).** **The Additional applies to every direct `DamageDealt`**: each
     attack instance (the Brute's second hit), each Splashing hit, each AOE target, each
     `deal-damage` in a spell's list, and granted actions. It reads the target's effective max
     Health; the 20% is stored as the integer percent 20 and computed as `floor(maxHp × 20 / 100)`
     (the float rule), the same value as the docs' 0.2. It is added before `applyDamageAndEmit`, so
     Last Stand, `remainingHp` and every hook see one number.
136. **Decided (H2a plan review).** **`DamageDealt` gains no field.** `finalDamage` includes the
     Additional; `rawDamage` stays the formula's pre-clamp value (for indirect damage it can be
     below 1 or negative); `wasChipOnly` is false for indirect damage and a cost. The channel is
     not in the log; the PR attributes changes from tests and scratch runs.
137. **Decided (PR #86 review).** **A direct action that lands on its own actor stays direct.**
     Confusion redirects to the actor's own side, which includes the actor, and an AOE redirect
     lands a spell's effects on its caster. That hit is direct: the full formula plus the
     Additional, read from the actor's own level and max Health. It is never a cost (a cost is an
     indirect-channel rule, ASSUMPTION 132). Why: the channel follows the action, not the target
     (one general model); the effect fades out by level 11, and both sides use Confusion.
     Rejected: no Additional when the target is the actor (a target-based special case in the
     direct path). Measured on the PR #86 corpus: 598 such self-hits, 30 by actors below level 11.
138. **Confirmed (PR #86 review).** **A zero cost still logs its `TriggerFired`.** `fireHook` emits
     it before the response runs; only the response's consequence is a no-op, as for a zero
     `magnitudeSource` count (PR #64 fix 4).
139. **Decided (H2b kickoff, 2026-10-08).** **H2b ships as H2b1 (Flickerlings and damage
     observation, ASSUMPTIONS 115, 116) then H2b2 (single-instance statuses and the applier
     snapshot, ASSUMPTIONS 113, 114).** Each changes its own goldens for its own reasons (see "Why
     H2b ships as H2b1 then H2b2"). Rejected: a three-way split separating single-instance from the
     snapshot (an interim refresh-only rule, and the stacking goldens changing twice).
140. **Decided (H2b1 kickoff, 2026-10-08; design owner).** **The Wick burns only when another ally
     is hurt, and heals the lowest-HP hurt ally.** Refines ASSUMPTION 116. "No one else to heal"
     means no living ally other than the Wick is below its effective max Health: with every other
     ally at full Health, or none alive, the Wick neither burns nor heals. The heal's target is the
     lowest current HP among the Wick's other living allies that are below max Health, so the gate
     and the target read the same pool and a burn always buys a heal that lands on someone hurt.
     Why: a burn that heals nobody is pointless self-harm, and plain "lowest-HP ally" ranks by
     current HP, so it could pick a small ally at full Health over a bigger one that is hurt.
     Consequences: the Flare's payoff waits until another ally has taken damage; the gate needs a
     condition no existing variant expresses (`ally-count` and `hp-percent` both include the
     bearer), so H2b1's plan proposes one. Rejected: "no other ally alive" (the Wick would burn on
     round 1 for a heal that restores nothing); the lowest HP % (a new kind of target ranking).

141. **Decided (H2b1 plan review, 2026-10-08; design owner).** **The Wick's gate is a trigger-only
     condition.** A trigger's condition is a `TriggerCondition`: the scripting `Condition` plus
     `other-ally-injured` (a living ally other than the bearer is below its effective max Health),
     which script rules can't use; the type keeps it out. Its target, a new `ResponseTarget`
     `lowest-hp-injured-other-ally`, reads the same pool function, so gate and target can't
     disagree. Why: a general `other-ally` HP subject in the shared `Condition` would give
     players a condition with no matching target (`lowest-hp-ally` includes the caster and ignores
     full Health), so Phase 6 would inherit half a feature already saved in scripts. Precedent:
     `SelfCondition` (S2). **Phase 6 must know** (design owner): the editor derives its condition
     list from `Condition` and must not offer trigger-only kinds; if players want "another ally is
     hurt", Phase 6 promotes the kind together with a matching selector (ROADMAP Phase 6 inputs).
     Rejected: an `other-ally` `HpSubject` (`hp-percent` any `< 100`), valid in scripts.

142. **Decided (H2b1 plan review).** **Damage observation's shape** (refines ASSUMPTION 115): a
     sibling hook `on-damage-observed`, fired from `applyDamageAndEmit` on every living creature
     after `on-damage-taken` and before the death chain, even on a lethal hit; the same
     `ObservationFilter` with `relationship` read against the damaged creature plus
     `selfInflicted`; the hook's source is the damaged creature; `selfInflicted` is a required
     flag that only the cost path sets; both observation hooks fail closed when called without
     their details; a load-time validator keeps each filter field on its own hook, over traits,
     perks and statuses. CONVENTIONS "Damage observation" carries the detail.

143. **Decided (H2b2 kickoff, 2026-10-09; design owner).** **Only a status's own effect passes its
     snapshot on.** Refines ASSUMPTION 113. When a status's own effect applies that same status
     (Spore's `on-death` spread), the new instance copies the firing instance's whole snapshot
     (applier id, affinity, potency). Every other application snapshots its applier fresh, even
     when the applier carries the status itself. Why: read as "any creature that carries it", a
     healer carrying another healer's Regen would cast Afterglow at that healer's strength, and a
     player Sporecloud carrying an enemy's Spore would put a Spore on an enemy whose recorded
     applier is that enemy's own ally (the tick's source, kill credit and affinity on the wrong
     side). Both happen in real fights. Rejected: the literal "a creature that already carries it".

144. **Decided (H2b2 plan review, 2026-10-09; design owner).** **A tick is declared in data, not
     inferred.** A ticking status declares its **`potency`** on its `StatusDef` (`{ ofStat,
     percent }`, read off the applier's effective stat at application); its one tick response (a
     `deal-damage` or `heal` targeting `self`) takes the magnitude **`{ kind: 'snapshot-potency'
     }`**, and that response is the tick. Supersedes ASSUMPTION 131's test (`statusId` + flat +
     self): any other damage a status deals its own bearer is a cost (ASSUMPTION 116), whatever its
     magnitude mode. Validators: a status with a potency carries exactly one snapshot-magnitude
     response (target `self`, no `magnitudeSource`), a status without one carries none, and
     traits, perks and spells carry none. An instance holds a snapshot (applier id, affinity,
     potency) iff its status declares a potency. `heal.amountPerStack` is renamed `flatAmount`.
     A plain (unmarked) heal inside a status stays an ordinary heal from its bearer: a heal has no
     cost path (no shipped status has one; confirmed at the H2b2 PR review). Why: under 131 a status's flat self-damage was a tick and its formula-mode self-damage a cost;
     the marker makes a tick something the data says. Rejected: keeping 131's shape test.

145. **Decided (H2b2 plan review, 2026-10-09; design owner).** **Snapshot pass-on is the rule, not
     a flag** (refines ASSUMPTION 143). An `apply-status` fired by a status's own effect that
     applies that same status (the firing context's `statusId` equals the applied one) copies the
     firing instance's whole snapshot; nothing opts in. A trait, perk or spell has no `statusId` in
     its context, so it can never pass a snapshot on. Rejected: an `inheritSnapshot` flag on
     `StatusSpec` (optional, so a future spreading status that left it out would silently snapshot
     the dying bearer).

146. **Decided (H2b2 plan review, 2026-10-09; design owner).** **A tick's dealer is its living
     applier, or no one** (refines ASSUMPTION 113). The tick path carries the dealer: the applier
     if it is alive at tick time (a revived applier is the dealer again), else none.
     `DamageDealt.sourceId`, and a Regen tick's `HealApplied.sourceId`, is the dealer, or the
     bearer when there is none. The dealer-side hooks (`on-damage-dealt`, `on-kill`) fire only on a
     dealer, so a bearer never runs them for its own tick after its applier dies; a self-applied
     tick's dealer is its living bearer, whose hooks do fire. The bearer's own hooks
     (`on-damage-taken`, `on-death`) get **no source** on a tick, so `triggering-source` and a
     `'triggering-source'` actor resolve to nothing while the hooks still fire (Sleep wakes).
     `applyDamageAndEmit` takes a required `origin` (`hit`, `cost`, or `tick` carrying its
     dealer id or none) in place of `selfInflicted` (self-inflicted iff `cost`): carried, never
     inferred from the ids. A trigger `condition` on `subject: 'target'` reads no creature on a
     tick (no shipped bearer-side trigger has one; H2b2 plan review, round 2). No
     shipped content reads `on-damage-dealt`, so no fight changes through the dealer rule. Rejected:
     the fallback bearer as a full dealer (today's behaviour, an accident of the old source rule).

147. **Decided (H2c kickoff, 2026-10-09; design owner).** **Tuning never changes a mechanism
     golden** (refines the "Mechanism goldens on fixtures, content on real data" rule above; a
     standing rule in CONVENTIONS, "Mechanism goldens vs content goldens"). A golden whose subject
     is a rule is a **mechanism golden**: when it borrows a real status, spell or trait, it pins
     every tuned number it reads in its own fixture (the real def, with only that number held), so
     a tuning PR leaves its expected values byte-identical. A golden whose subject is a named
     content item (a creature, trait or spell) is a **content golden**: it reads real data and is
     re-derived by hand when a tuning PR moves a number it reads. A tuning PR shows each effect
     number it changes (a status potency, a spell's power, a trait's magnitude; not base stats,
     which the data tests cover) in a hand-derived content golden on real data, new or
     re-derived. H2c pins nothing: `golden-g1-leech-sovereign-pacified` (a rule on the real Leech
     Sovereign) reads no number H2c moves, since none of its events reads her Health (measured at
     the H2c plan review, round 2), so it gets a comment fix, not a pin. The DoT goldens wait for
     H2d, which moves their numbers (ASSUMPTION 149): `golden-dot`, the `golden-f2-*` DoT goldens, the `golden-h2b2-*`
     goldens that read a percentage, `golden-spore-spread-filter`, `-fizzle` and `-dot-kill`, and,
     corrected at the H2c plan review, `golden-turn-end-dot-kill-burst`, `-refresh` and
     `golden-hollowkin-wretch-self-dot`, whose subjects are rules too. Each pin is a setup-only
     edit. Why: in a tuning PR, mechanism goldens that stay byte-identical are the proof that only numbers moved; a hand golden re-derived under new numbers can still
     pass while no longer reaching the branch it was built for (a tick above the minimum of 1, a
     potency tie); and every later tuning pass would re-derive the same goldens again. Real content
     stays covered by the content goldens, the corpus and the data tests. Rejected: every golden
     following the data; every golden pinned. *(4.1-H2d plan review, design owner: the same holds for a
     unit test whose subject is a rule and which borrows real content, `status-snapshot.test.ts`.)*

148. **Decided (H2c kickoff, 2026-10-09; design owner; lands in H2d, ASSUMPTION 149).** **The CI
     threshold test runs in the normal suite** (`npm run test`), over the full 40 seeds of each spec with the run cap at 30
     floor runs and the boss probe off. The three verdicts read nothing past run 30 (floor 1 is
     the first try; floor 5 reads the first 20 runs; a first soul after run 30 fails the median
     whether it lands at 31 or never), so the cap changes no verdict, only the reported median.
     The test asserts the three verdicts, never a value. The plan measures its runtime and stops
     to ask if it adds more than about 2 minutes to the suite. Rejected: a separate CI step (the
     threshold would leave the local gates); fewer seeds (it changes what the thresholds read).

149. **Decided (H2c plan review, 2026-10-10; design owner).** **Choosing balance numbers is design
     work, so H2c ships only the numbers the H2 grill decided, and a balancing slice, H2d, follows.**
     - **H2c** implements ASSUMPTIONS 118, 119 and 123–127 and the before/after report. It picks no
       DoT percentage and makes no per-item fix (the DoT and Regen placeholders stay as they are),
       and it doesn't assert the CI threshold test (on the grill's measurement the Shieldbarer's
       first-try floor 1 is about 65%, so the test would be red).
     - **H2c also measures, for the H2d grill**, in a scratch clone with nothing committed: the full
       report (cap 400, probe off) on the "after" data with three DoT sets: today's placeholders
       (Poison 20 / Burn 25 / Spore 15), 35 / 30 / 30, and 50 / 40 / 45; Regen at 10 throughout.
       Per set: first-try clear on floors 21–30, T4, the Rot Sovereign's row, the round-cap draws,
       the three threshold verdicts, and the minimum-of-1 share of DoT ticks on the corpus's
       generated fights (Parts A and B; Part C's coverage fights reported apart). The numbers are
       evidence, not a recommendation.
     - **H2d** opens with a grill of the design owner on H2c's report and these measurements,
       aimed at the CI thresholds: which levers to use (per-item fixes, the DoT percentages) and
       by how much. It then implements the rulings and asserts the CI threshold test (148).
     Why: a tuning loop run by the coding agent would make design decisions inside an
     implementation plan; the grill is where balance has been decided so far (the H2 grill).

150. **Decided (H2d grill, 2026-10-10; design owner).** **Pollen Cloud deals no damage:** it puts
     every enemy to Sleep for 2 turns and nothing else, a control spell like Pacify and Silence.
     - **Evidence** (H2c's "after" data, 40 seeds per spec, run cap 30): every first-try floor-1
       loss (Shieldbarer 14 seeds, Brute 5) was a Wit creature casting Pollen Cloud on the
       two-creature party. Each cast put both to Sleep and hit both for 8: a raw hit under 0.1,
       the minimum of 1, plus the full Additional (7), which no spell power scales. Recast about
       every third turn, it kept the party asleep until it died. Every enemy rolls a full gem set,
       so 75% of biome-1 Wit creatures hold it (50% in biome 2, 43% in biome 3). The three "Wit
       caster" problem creatures in the matchup table were this one spell.
     - **Measured:** first-try floor 1 (Sorcerer / Brute / Shieldbarer) 40 / 35 / 26 → 40 / 40 /
       40. Full report (cap 400, probe off) against H2c's: floor-10 first clear, median floor
       runs, 86 / 72 / 213 → 104 / 68 / 154 (13 Shieldbarer seeds still never clear it); seeds
       fighting on floor 5 within 20 runs 40 / 40 / 26 → 40 / 40 / 38; round-cap draws 4.9 / 2.5 /
       10.6% → 5.9 / 2.6 / 12.9%; the Brute's floors 21–30 unchanged within noise. The Sorcerer's
       slower mid-game and the extra draws are accepted costs: no threshold reads them, and there
       is no draw band (ASSUMPTION 121).
     - **Rejected:** Sleep for 1 turn (Shieldbarer 33 of 40, one seed of margin); a single-target
       Pollen Cloud (40 / 40 / 40, but it stops being a cloud).
     - **Considered, no watch point:** the Additional lands in full on every target of an AoE.
       It fades to 0 at attacker level 11 (enemies from floor 9), and the one AoE spell that also
       locked no longer deals damage.
151. **Decided (H2d grill, 2026-10-10; design owner).** **Snapback (Snapjaw Jaws) back to 60% of
     Attack** (amends ASSUMPTION 124), restoring the Snapjaws' "bait & punish" retaliation.
     - **Why it can go back:** at 60% the Jaws beat the Shieldbarer pair in every floor-1 fight on
       the H2 grill's config. Two other H2c changes removed that: floor-1 enemies are now level 1 (they
       were 1–3, ASSUMPTION 118), and the Stonehorn Warden attacks (ASSUMPTION 123). On H2c's data
       with only Snapback at 60% the Jaws loses every floor-1 fight it is in (Sorcerer 34 of 34,
       Shieldbarer 65 of 65; the Brute meets none there).
     - **Measured with ASSUMPTION 150** (full report, cap 400, probe off; against Pollen Cloud
       alone): verdicts unchanged; floor 5 within 20 runs 40 / 40 / 38 → 40 / 40 / 37; floor-10
       first clear, median floor runs, 104 / 68 / 154 → 106 / 71 / 166 (Shieldbarer seeds never
       clearing it 13 → 14); round-cap draws 5.9 / 2.6 / 12.9% → 5.9 / 2.7 / 12.6%. Its cost sits on
       floor 2, where fights containing the Jaws are won 81 / 77 / 83% of the time (89 / 82 / 94%
       at 30%). No new wall: the first-wall floors keep their spread. The condition set at the
       grill ("restore it unless the Jaws becomes a wall on floors 2–9") holds.
152. **Decided (H2d grill, 2026-10-10; design owner).** **DoT potencies: Poison 40% of Attack,
     Burn 35% of Intelligence, Spore 35% of Speed. Regen stays at 10% of the healer's Health.**
     None is a placeholder any more; like every number, each stays open to later balancing.
     - **Why the DoTs move:** a tick is indirect damage, so it subtracts a fifth of the bearer's
       Defence. At 20%, an applier whose stat equals the bearer's Defence ticks 0, the minimum of
       1: 91% of the corpus's ticks after H2c. No set H2c measured (20 / 25 / 15, 35 / 30 / 30,
       50 / 40 / 45) moved a verdict, so the numbers are a design choice: DoTs that do something,
       kept modest because biome 3's DoTs are mostly the enemy's (the floor-30 boss's first-try
       clear fell from 35 of 36 to 25 of 36 at the high set) and the player can't aim a DoT before
       Phase 6's scripts. 40 / 35 / 35 sits between the two higher sets measured.
     - **Why Regen stays:** a heal subtracts nothing, so 10% already does something.
153. **Decided (H2d grill, 2026-10-10; design owner).** **T2 and T3 read floors, not floor runs,
     and are ceilings:** **T2**, a completed soul by each seed's first run on floor 3; **T3**, a
     full party (four souls beyond the two starters) by each seed's first run on floor 6, the
     floor where enemies first field six. A seed that never reaches the floor is reported apart
     as "didn't reach". Both are reported, never asserted; ASSUMPTION 22's first-soul threshold
     (≤ 30 floor runs) is unchanged. On H2c's data both hold for every seed that reaches the floor
     (T2 40 / 40 / 40; T3 40 / 40 / 28 of 28). Why: this is a team-building game, so souls coming
     fast is good; the bands guard against slow, not fast. They replace "first soul within ~10
     floor runs" and "a full party within the first 10 floor runs", which read the policy's
     farming as much as the game.
154. **Decided (H2d grill, 2026-10-10; design owner).** **No other per-item fix in H2d**: it aims
     at the CI thresholds, which ASSUMPTIONS 150–152 meet (151 isn't needed for them; it restores
     content). Two watch points, read on H2d's "after"
     report and in the Phase 4.5 demo:
     - **Floor 2 and the early walls.** First-try floor 2 is 1 / 15 / 2 of 40 after ASSUMPTIONS
       150 and 151 (2 / 10 / 0 before), and seeds first wall on floors 4–7.
     - **T5, party level against the floor.** The design owner's intent: player creatures level
       about as fast as the floor number when every floor is cleared on the first try. On the
       clean path (one creature, every floor cleared first time, every kill's XP) the level
       equals the floor through floor 9, then lags: 9 at floor 10, 17 at 20, 25 at 30. Boss
       floors are most of the lag: one fight pays 89 / 174 / 282 XP on floors 10 / 20 / 30,
       against 1,800+ for a normal floor beside them. The XP curve may need tuning; not in H2d
       (ASSUMPTION 117 keeps it, and no threshold reads it).
155. **Decided (H2d kickoff, 2026-10-10).** **The CI threshold test (ASSUMPTION 148) is one test
     file per spec**, so Vitest runs the three in parallel, each calling the simulator's own
     `runSeed` and `computeThresholds`. Measured at the kickoff (one machine, three specs in
     sequence, cap 30, probe off): 49 s on H2c's data, about 70 s with ASSUMPTION 150.

## Sequencing summary

`4.1-A` (data, store, generation) → `4.1-B` (engine foundations, byte-identical) → `4.1-C`
(action pipeline + turn skeleton) → `4.1-D` (spells carry responses, byte-identical) → `4.1-D2`
(the corpus covers all real content, test-only) → `4.1-E` (`perform-action`) → `4.1-F1` (status
containers) → `4.1-F2` (status timing + Web roll) → `4.1-F3` (Silence/Pacify) → `4.1-G1` (enemy
behaviour) → `4.1-G2` (hub and store) → `4.1-H1` (simulator and report, byte-identical) →
`4.1-H2a` (damage rules) → `4.1-H2b1` (Flickerlings and damage observation) → `4.1-H2b2` (status
rules) → `4.1-H2c` (the grill-decided numbers) → `4.1-H2d` (the balancing pass) → then
the Phase 4.5 demo brief. Each PR branches from `main` after the previous merge.
