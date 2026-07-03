# Depths of Souls — Conventions

Engineering rules for this project. The *what* lives in `GAME_DESIGN.md`; this is the *how*.
These exist mostly to keep AI-generated code consistent as the codebase grows.

## TypeScript

- `strict: true`. No implicit `any`. Prefer `unknown` + narrowing over `any`.
- Model game concepts as explicit types/discriminated unions. A `Trait`, an `Action`, a
  `Condition` should each be a union with a `kind`/`type` discriminant so the engine can
  `switch` exhaustively. Use a `never` default case to force handling new variants.
- IDs are branded string types (`type CreatureId = string & { __brand: 'CreatureId' }`) or
  at least named aliases — don't pass bare strings around.
- No magic numbers in logic. Balance constants live in `data/` or a `config` module.

## Engine purity (the load-bearing rule)

`src/engine/**` must be pure and deterministic:

- **No** `import React`, no DOM, no `window`, no `localStorage`.
- **No** `Math.random()` — take a seeded RNG instance as input. One PRNG (e.g. mulberry32 /
  a small xorshift) seeded per floor/combat; thread it through, don't reach for a global.
- **No** `Date.now()` / `performance.now()` in logic — if time matters, pass a tick count.
- Functions take state in, return new state (or events) out. Avoid hidden mutation; if you
  mutate for performance, do it on a local working copy, never on shared store state.
- Combat resolution must be reproducible from `(partySnapshot, scripts, seed)`. This enables
  replays, fast-forward, and reliable tests. Treat any nondeterminism as a bug.

## Combat & scripting

- **Resolver shape** (three pieces): `createCombat(playerParty, enemyParty, seed) -> CombatState`
  (factory — sets up sides/slots, seeds RNG, guards against empty parties); `resolveTurn(state)
  -> { state, events }` (pure primitive — one creature's action); and `resolveFight(state)`
  (thin run-to-completion wrapper over the stepper). Expose the **stepper** (advance-one-turn,
  crossing round boundaries internally) as the single low-level driver so manual-mode/playback can
  step incrementally; `resolveFight` is the convenience wrapper. Emit a typed **event log**; the
  UI renders from events, never from resolver internals. **RNG state lives inside `CombatState`**
  (threaded state-in-state-out), so the function stays purely `state -> { state, events }`. The
  engine is **player/enemy-aware** (sides are labeled; win = player side survives).
- Combat is **6v6** (party size 1–6 supported). **One round = every living creature acts once.**
  The acting order is a **frozen ordered list of creature IDs**, built **once at round-start** from
  current effective Speed; ties broken deterministically (**player side → slot → id**). **Never
  recompute mid-round** — a creature that dies before its turn is skipped (alive-check); Speed
  changes bank for the *next* round's rebuild. (Future extra-actions = an explicit insert-action
  effect, never a queue re-sort.) A fight-level **round cap** (config) is a hard backstop — every
  fight must terminate; reaching it ends the fight as a **draw**.
- **Phase structure**: the fight loop crosses explicit **phase points** — fight-start / round-start
  / (per creature) turn / round-end / fight-end — firing the matching **effect-framework hooks** at
  each **and** emitting the matching lifecycle event (`FightStarted`, `RoundStarted`, `TurnStarted`/
  `TurnEnded`, `FightEnded`; there is no separate round-end event — end-of-round hooks fire but
  round boundaries are implied by the next `RoundStarted`/`FightEnded`). Status tick/expiry, DoT,
  Regen, etc. are `round-end`/`turn`-scoped hooks, **not** a separate `resolveRound` function. In
  Phase 1 all hook lists are empty (no-ops) and no round-cap draw has happened yet, but the seams
  and events exist from the start.
- **Resolution & timing**: strictly **sequential** (no simultaneity, no dying retaliation in v1) —
  each creature acts fully, damage applies immediately, death is checked immediately. **Win/loss/
  draw is checked after every action**; the fight ends the instant a side has no living creatures
  (does not finish the round). **Result is a three-value union** (`win` / `loss` / `draw`); draw
  resolves like loss for navigation. A creature at 0 HP is **flagged `alive: false`, not removed**
  (stable slots for tie-break/event references); compaction only at fight end. **Rewards bank per
  kill-event**, immediately, never held pending fight outcome.
- **Damage formula** (Attack and Cast both):
  ```
  effOffStat = getEffectiveStat( remapResolve(creature, action) ) × spellPower   // spellPower = 1.0 for Attack
  raw        = (MAX(effOffStat − Defence, 0) + 0.01 × effOffStat) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)
  damage     = MAX(1, floor(raw))
  ```
  - **effOffStat**: source stat (**Attack** for Attack / **Intelligence** for Cast) read via a
    **remap-aware lookup** (consults `stat-remap` effects), taken as an **effective** stat
    (`getEffectiveStat`, never raw base), then **× the action's `spellPower`** coefficient. Order:
    remap → effective → × spellPower. `Defence` is likewise effective.
  - **spellPower** is a **spell/action property** (Attack = 1.0; a "30% Int" spell = 0.30). It
    scales OffStat **inside the core, pre-Defence** — a 30% spell = `(Int × 0.30) − Def`, **not**
    `(Int − Def) × 0.30` (Defence measures against actual incoming power). It's a **third modifier
    locus**, distinct from stat-modifiers (→ effective stats) and damage-modifiers (→ the pools).
  - Subtractive core clamped at 0; **+1% chip floor unconditional** and it **scales with
    effOffStat** too (a weak spell has a proportionally small chip).
  - **Integer damage**: full-precision `raw`, **floored once at the end**, **min 1** (a hit always
    removes ≥1 HP → no stalemates; round cap is only a pathological backstop). Never round per-term
    (float drift breaks golden replay).
  - **Affinity** = standalone ×1.25 / ×0.75 / ×1.0 (data lookup; store ±25% as config), separate
    from both pools, always multiplicative.
  - **Two asymmetric mod pools**: attacker's **dealt pool is additive** (`1 + Σ`, empty = 1.0);
    defender's **taken pool is multiplicative** (`Π`, empty = 1.0). Reductions in the taken pool
    trend toward but never reach 0 (**no immunity, no clamp needed**); amplifications share it.
    Rationale: additive offense stays tractable when stacking many sources; multiplicative defense
    makes tanking a real power path. **Stat buffs are NOT dealt-mods** (they raise effective stats);
    "+damage%" effects are dealt-mods — never double-count.
  - **No "Additional" channel, no variance, no baseline crits** (crit = a trait-granted dealt-mod).
- The action set is **Attack, Cast, Defend, Provoke, Wait** (discriminated union; grows). Spells
  (Cast) have **no cost, freely castable**; a rule picks the **gem slot index** (not a spell ID),
  and the fired spell is whatever occupies that slot on that creature (template-reusable across
  loadouts). This requires **extending the Phase 1 `Creature` type** with an equipped-spells field —
  `equippedSpells: readonly (Spell | null)[]` (bare `Spell | null` slots, **not** the full
  `{ spell, level, augments }` Gem wrapper — that wrapper is Phase 8 economy; hardcode ~3 slots as a
  variable-length `readonly` array so trait/forge slot-count changes fit later without a retype).
  A spell carries a **target shape** (single / all-enemies) and a **spellPower** coefficient; shape
  is resolved from the equipped spell at evaluation time. Phase 2 ships a **minimal `Spell`**
  (`{ id, targetShape, spellPower, ... }`); the forge/augment/leveling economy is deferred to Phase 8.
  - **Defend**: ×1.5 effective Defence (inside the core) **and** a ×0.65 factor in the defender's
    taken pool, until its next turn.
  - **Provoke**: marks the creature provoking until its next turn.
  - **AOE Cast**: target set **frozen at cast-start** (all living enemies, slot order); the whole
    action resolves fully (all `DamageDealt`/`CreatureDied`) **before** win/loss is checked — the
    win-check stays at the action boundary, never inside the per-target loop.
- **DoT damage** does **not** use the damage formula — its own value from the source, **bypasses
  Defence**.
- **Provoke targeting**: single-target offensive actions (Attack / single-target Cast) against the
  enemy side target a **random provoking enemy** (seeded combat RNG, never `Math.random()`) if any
  enemy provokes, else the script's selector. Implement as a **target-set override applied after**
  the action is chosen (narrows targets, doesn't change the action). **Ally-targeting and AOE
  actions are exempt** — AOE always hits its full set.
- **Interpreter** = pure engine code: `decideAction(creature, script, state) -> Action` (the Phase 1
  seam, now consulting the script; RNG only via `CombatState`'s seeded RNG). **Side-effect-free
  lookahead**: walk the ordered rules top-down; a rule matches only if its **condition is true AND
  its action is valid** (invalid → **skip to next rule**, never match-and-fizzle); first match wins;
  only then execute. **Validity-checking is an *existence* check, never a resolution** — e.g. a
  `random-enemy` selector is valid iff ≥1 living enemy exists; the **actual RNG draw happens exactly
  once, at execution time, for the winning rule only**. Non-winning rules that reference a random
  selector must **not** consume RNG state during lookahead — otherwise the chosen target would
  depend on incidental script structure above it, breaking `same seed → identical outcome`. So
  lookahead is pure (predicates + existence only); the single stateful draw is part of *execution*.
  **One condition per rule** (no AND/OR); **ordering carries the logic** and is
  **array position** (no stored priority int), so reorder UI + "which rule fired" feedback are
  load-bearing. Implicit fallback: Attack a valid default target, else Wait. `TARGETING` present only
  for multi-target actions (Attack, single-target Cast); omitted for self-only (Defend/Provoke/Wait)
  and AOE Cast. A `"has status X"` condition matches a **literal status ID** (a `condition-status`),
  not a category — **deferred to Phase 3** (no status producer exists until then; see below).
  - **Condition** = discriminated union on kind; comparator is **data** (`< <= > >= ==`, `!=`
    optional). **HP% via integer cross-multiplication** — `currentHp * 100 <cmp> threshold * effMaxHp`
    where `effMaxHp = getEffectiveStat(_, 'health')` — integer thresholds, **no float**. Subject
    qualifier `any` (existential) / `lowest` / `highest` (pick-and-test-the-extremum). `always` = an
    unconditionally-true kind. **Phase 2 ships only the testable subset** (`always`, HP%, enemy/ally
    counts, turn/round number, affinity-advantage, is-provoking); **`has-status` is deferred to
    Phase 3**, landing with the status framework that produces statuses — the union grows then (no
    untestable dead union members in Phase 2).
  - **TargetSelector** = discriminated union on kind; all extremum selectors use the **shared
    tie-break** (primary key, then player side → slot → id by codepoint). `random-enemy` draws from
    the seeded RNG and advances it. **"ally" includes the acting creature**. An unresolvable selector
    → rule invalid → skip, but this is a **defensive/unreachable seam in v1** (no v1 selector can
    fail to resolve — self exists, ally-selectors include self, enemy-selectors always have a target
    since combat never resolves an action against a wiped side); kept for future selectors that can.
  - **`Script`** = `{ id, rules: Rule[], defaultTarget?: TargetSelector }`; `Rule` =
    `{ condition, action, targeting? }`. Creature references a script by **`scriptId`**; null/absent →
    implicit fallback. `defaultTarget?` reserved for Phase 6 (rules omitting TARGETING fall back to
    it). Rule/template counts **unbounded**.
- **Scripts are reusable templates** referenced by creatures (many may share one). The interpreter is
  **symmetric** — player and enemy creatures use the same system. Phase 2 provides five **stock
  scripts** in `data/` (real content, not `__fixtures__`): `always-attack` (lowest-HP enemy),
  `always-cast` (slot 0, lowest-HP enemy, degrades to fallback if slotless), `always-defend`,
  `always-provoke`, `always-wait`. Enemies use these until richer scripts arrive (no new machinery).
- **Event log**: two families. **Intent events** — a discriminated union on action kind, one
  variant per action, each carrying only its own fields (`AttackDeclared { attackerId, targetId }`,
  `SpellCast { casterId, gemSlot, targetId | targetIds }`, `Defended`/`Provoked`/`Waited`) —
  **always emitted, including no-consequence actions like Wait** (complete turn-by-turn log).
  **Consequence events** — separate and shared across all sources (`DamageDealt { sourceId,
  targetId, rawDamage, finalDamage, affinityMultiplier, wasChipOnly, remainingHp, damageSource:
  'attack'|'cast'|'dot' }` — `damageSource` is **required** as of Phase 3 (Phase 1/2 goldens
  consciously field-added), `CreatureDied { creatureId }`; the set **grows** in Phase 3 with shared
  `StatusApplied` / `StatusExpired` / `StatModifierApplied` (source, target, stat, factor, effective
  delta) / `HealApplied` (Regen) / `HpClamped` (currentHp reduced when effective max Health drops
  below it — neither damage nor heal); DoT ticks reuse `DamageDealt`). Consequences are
  never nested in intents (a poison tick and an Attack both reuse `DamageDealt`; an AOE Cast = one
  `SpellCast` intent followed by N `DamageDealt`). Plus the Phase 3 trigger-intent event
  `TriggerFired` (precedes a trigger's consequences) and the loop-safety `CascadeTruncated`
  (mandatory when the cascade cap truncates a chain). Plus lifecycle:
  `FightStarted`, `RoundStarted { round }`, `TurnStarted { creatureId }`, `TurnEnded { creatureId }`,
  `FightEnded { result }`. **`TurnStarted`/`TurnEnded` are real log events, not just internal hook
  checkpoints** — they give playback (§ROADMAP Phase 7) an explicit, unambiguous turn boundary to
  key off, rather than inferring one from the next intent event (which breaks down for Wait or any
  no-op turn). **Flat chronological array**; events reference creatures by **id + key inline
  values** (e.g. `remainingHp`), not snapshots; **descriptive narration, not event-sourcing** (state
  is returned alongside, authoritative).
- Manual mode swaps the *action source* (UI input) for the same resolver. Do not fork the
  combat code path.

## Unified effect framework (load-bearing invariant)

**Traits, status effects, gem augments, and artifact infusions are all instances of ONE
data-driven, hook-based effect model.** Do not build them as separate subsystems — they share
the same interpreter, differing only in how they attach and which hooks they use.

- An effect declares: `category` (see taxonomy), `magnitude`, `duration` (where applicable),
  `stackingRule`, `hooks[]` (on-apply, start-of-turn, end-of-turn, on-the-creature's-turn,
  on-damage-taken, on-damage-dealt, on-expiry, …), and its payload.
- **Four effect categories**, all on this one framework. **Category determines player-facing
  treatment** (bright line):
  1. **`stat-modifier`** — scales a stat (`stat`, `factor`); folds into effective stats
     **multiplicatively** (`base × Π(factors)`). **Always permanent-for-fight, uncapped, NOT surfaced
     as a status** (player sees the effective stat + net multiplier). Multiplicative ⇒ reductions
     approach but never reach zero, stacking is cap-free (both directions). **No temporary
     stat-modifier exists** — timed/capped debuffing is done via `damage-modifier`/`condition-status`.
     Stat buffs/debuffs are data instances of this primitive (params: stat, factor); no per-stat
     special-casing.
  2. **`stat-remap`** — redirects which stat a formula slot reads (e.g. Speed-as-Attack). Reads the
     **source stat's effective value**; slot stat-modifiers do **not** transfer. Multiple remaps on
     one slot → **fixed effect order (innate-1 → innate-2 → infusions), last-writer-wins**. The
     damage formula's OffStat lookup is remap-aware, so no formula change is needed to support it —
     **build this indirection seam in Phase 1** (returns effective Attack when no remap exists).
  3. **`damage-modifier`** — folds into the damage formula's pools: attacker's **additive dealt
     pool** or defender's **multiplicative taken pool** (pools unchanged). **These ARE surfaced as
     timed statuses and may be capped** — e.g. Weaken (−% dealt, ~1 stack + duration), Vulnerability
     (+% taken). Distinct from `stat-modifier` (a "−Attack" stat change and a "−damage" Weaken are
     different categories, different treatment, never double-count).
  4. **`condition-status`** — tagged timed conditions (Poison/DoT, Regen, Stun); surfaced as icons;
     what scripting's `has-status` scopes to.
- **Effective stats (invariant)**: base stats are **immutable** (except permanent effects like
  level-up). Current stat = `getEffectiveStat(creature, stat)`, folding active `stat-modifier`
  effects over base **multiplicatively** (`base × Π(factors)`, conditional-passive factors included
  only when their read-time predicate holds) in a **fixed deterministic order**. **Never write a
  derived value back** — base+fold-on-read, **not a mutable stat blob** (conditional/non-permanent
  effects need recomputation a blob can't give cleanly; keeps representation singular +
  deterministic). Expiry = drop the effect from the list. **All combat math reads stats through this
  accessor** — a
  passthrough to base in Phase 1 (no effects yet), so the folding slots in later with no rewrite.
- New content = a data entry. Genuinely novel behavior = at most one new reusable hook primitive,
  then reused. Never special-case an individual trait/status in the resolver.

### Hook execution model (Phase 3)
- **Scoped iteration.** Per-creature phase points (that creature's turn start/end) iterate that
  creature's effects; global phase points (round-start/round-end) iterate all creatures' effects in
  the **standard tie-break order** (player → slot → id). All hook lookups go through
  **`effectsForHook(creature, hook)`** (scan-and-filter inside). A hook-type index is **deferred
  until measured** — it drops in behind that boundary, verified byte-identical against goldens; do
  not build it pre-emptively (a derived cache that can go stale, against the single-source-of-truth
  principle).
- **Hooks reuse action machinery.** A hook that deals damage / applies a status calls the *same*
  paths and emits the *same* shared consequence events as a chosen action. A hook is a trigger
  *origin*, not new consequence vocabulary.
- **`TriggerFired`** intent event precedes a trigger's consequences (mirrors `AttackDeclared`).
- **One shared per-creature effect ordering** — innate-1 → innate-2 → artifact infusions → applied
  statuses — reused *everywhere* effects are iterated (stat folding, hook firing, remap resolution).
- **Interaction edges**: **dead creatures fire only `on-death`** (`effectsForHook` filters to
  `alive`; lethal damage fires `on-death`, not `on-damage-taken` — death pre-empts the victim's
  reaction). **Damage-path hook order** (after `DamageDealt` lands): `on-damage-dealt` (source) fires
  **unconditionally, even on a lethal hit** → `on-damage-taken` (self) fires **only if the target
  survived** → then if it died: `CreatureDied` → `on-death` (self) → `on-kill` (source) →
  `on-ally-death`/`on-enemy-death` (observers). I.e. hit-reactions (dealt always, taken if-survived)
  resolve **before** death-reactions (died/kill/observers). **Applying a status emits `StatusApplied`
  then fires `on-status-applied`** (event-before-hook). **Conditional-passive predicates** read
  effective stats but must not depend on the stat they gate (no `getEffectiveStat` read-cycle).
- **v1 hook vocabulary (13):** `on-fight-start`, `on-turn-start`, `on-turn-end`, `on-round-end`,
  `on-damage-dealt`, `on-damage-taken`, `on-kill`, `on-death`, `on-ally-action`, `on-enemy-action`,
  `on-ally-death`, `on-enemy-death`, `on-status-applied`. Each = firing point + context shape.
  Expansion is additive/golden-safe (a new unused firing point emits nothing) if it fires where the
  resolver already reaches; a hook needing new tracked state is a larger change.

### Loop safety (engine invariant — concrete)
- **Self-re-entry guard = instance-level, stack-scoped**: a specific effect *instance* cannot
  re-enter while already unwinding on the active resolution stack (blocks self-loops; allows
  cross-creature cascades).
- **`MAX_TRIGGER_CASCADE_DEPTH = 500` counts chain nesting depth, not breadth** (N effects on one
  hook = breadth N at current depth; each trigger causing a new hook fire = +1 depth). Breadth
  unbounded.
- **On the cap**: the over-cap trigger does not execute (no crash), resolution unwinds, and a
  **mandatory `CascadeTruncated` event** (creature/effect + depth) is always emitted.
- **Depth is transient** — on the resolution call stack, reset per top-level action/hook, **never in
  `CombatState`, never serialized** (same principle as effective stats).

### Trait model (Phase 3)
- **`Trait { id, name, effects: readonly Effect[] }`** — a named wrapper (UI identity/flavor) over
  one-or-more effects. Definitions in `src/data/`; `Creature.innateTraitIds` (1 base / 2 fused)
  resolved from a registry at combat start; effects instantiated onto the active-effects list at
  fight start.
- **Passive/stat traits** = `stat-modifier` effects; a **conditional** passive carries a
  **read-time activation predicate** evaluated during `getEffectiveStat` folding (never cached).
- **Triggered traits** = `{ hook, condition?, response }`. **Response vocabulary (v1, each
  parameterized by target + magnitude): deal-damage, apply-status, apply-stat-modifier,
  suppress-action.** Breadth = hook × condition × parameter cross-product, not more response types.
- **No keywords, no implicit targets** — a trait is an explicit
  event→condition→response→target→magnitude sentence; the hook **context** supplies reference actors
  (`{self, source}`, etc.); the response names its target (`self`, `triggering-source`,
  `triggering-ally`, `all-enemies`, a `TargetSelector`, …).
- **"attack" / "cast" in a trait or spell = the real actions** — same damage formula, OffStat,
  affinity, Defence, pools, min-1 floor; the trait/spell supplies only the spellPower coefficient +
  target. No separate trigger-damage formula. **DoT is the lone Defence-bypass exception**; a
  response may opt into bypass explicitly.
- **Behavioral responses deferred past v1** (grant-extra-action, modify-turn-order, unlock-scripting
  options, alter the creature's own decision-making). Reacting via damage/status/stat-change is
  *triggered*, in scope.

### Status lifecycle (Phase 3)
- Statuses: **fixed duration counted down in ROUNDS at round-end** (not per-turn). Stacking = a
  **single instance per (type, creature)** with stack-count + remaining duration; re-apply refreshes
  duration and increments intensity to the status's **explicitly-declared cap — no shared global
  default**. DoT intensity = per-stack damage; stat-status intensity = magnitude.
- **A DoT tick IS an `on-round-end` hook on the DoT effect** (same machinery as any trigger — no
  separate status-tick pass). **DoT carries its own value and bypasses Defence.** `DamageDealt`
  carries a **required `damageSource: 'attack' | 'cast' | 'dot'`** (+ status identity for `'dot'`); a
  DoT tick emits a `'dot'`-tagged `DamageDealt` (no `TriggerFired`) so the log reads "[creature] took
  X poison damage." Because the field is required, **Phase 1/2 goldens are consciously updated**
  (field-addition-only: regenerate, verify diff shows only the new field, no value/ordering changes).
- **Applying a stat-modifier emits `StatModifierApplied`** (source, target, stat, factor, **and the
  concrete effective-stat delta** — a bare factor is meaningless without its base). This is the golden
  assertion surface + Phase 7 floating-combat-text source; stat-modifiers are not surfaced *as status
  icons* but the log records the change. Order: `TriggerFired` → `StatModifierApplied`.
- **Health is a modifiable stat**: `currentHp` inits to **effective** max Health at fight-start;
  clamps to effective max whenever it changes (Health debuff lowers cap+current; Health buff raises
  cap, no auto-heal). HP% stays 0–100.
- **Stun is just a `condition-status`** — an `on-turn-start` hook with a **suppress-action** response
  → the turn is skipped via the Phase 1 empty-bracket (TurnStarted/TurnEnded still emit). No special
  resolver branch.
- **Round-end = global sweeps over a start-of-sweep snapshot**: snapshot statuses present at sweep
  start, then **(1)** fire all `on-round-end` hooks (all creatures, tie-break order; incl. DoT ticks;
  cascades incl. `on-death` resolve fully) **→ (2)** decrement durations **for snapshot statuses only**
  **→ (3)** expire snapshot statuses at 0 (`StatusExpired`). **Statuses born mid-sweep** (e.g. from an
  `on-death` trait) are not in the snapshot — they keep full duration and start counting next
  round-end. A creature killed mid-sweep fires only `on-death`; its own not-yet-reached round-end
  hooks are skipped. **Win/loss checked once, after the full sweep.**
- **v1 status content**: DoT (Poison, Burn), Regen (HoT), Stun, and timed **`damage-modifier`
  statuses** — Weaken (−% dealt, ~1 stack + duration) and Vulnerability (+% taken). **Raw stat
  buffs/debuffs are NOT statuses** — they're permanent-for-fight multiplicative `stat-modifier`
  effects (invisible-as-status; player sees the effective stat). All are data instances of the built
  primitives; more addable later as pure data.
- **`Spell` gains an optional status-application** so statuses are reachable via Cast, not only
  traits. **`has-status` joins the `Condition` union** (matches a literal status ID) — completes the
  Phase 2 deferral.

## Data-driven content

- Creatures, **species templates**, traits, spells/**gems**, **artifacts**, **statuses**,
  biomes, facilities, **specializations/perks**, and scaling curves are data in `src/data/`,
  validated by types (consider `zod` at load boundaries).
- **Three-tier model**: **species** = a grouping of creatures (data: thematic identity + the
  set of creatures it contains; used by biome spawn tables; intra-species traits synergize by
  design). **Creature** = the specific unit (data: parent species, affinity, fixed base stats in
  10–30, innate trait, sprite, rarity — v1 ships **3 rarity tiers: Common, Uncommon, Rare**,
  designed to expand later). **Instance** (in save) = an owned copy: references a creature +
  level/XP (**uncapped**), current affinity, trait slots (1 or 2), equipped gems (≤3) +
  artifact (1), `hasFused`. Base stats are **fixed per creature** (no per-instance rolls in v1).
  Affinity lives on the creature/instance; one species spans multiple affinities. Duplicate
  creatures may occupy multiple party slots simultaneously; an in-fight death has no
  consequence beyond that one fight.
- A creature keeps **identity** (species + sprite/name) and **affinity** as separate fields, so
  fusion is a clean field-level recombination (species-agnostic): **identity from
  identityParent, affinity from affinityParent, base stats = per-stat average of both parents,
  both innate traits**; result is level 1; both inputs consumed; result is itself fusion-locked
  (`hasFused`). **Fusing two instances of the identical creature is disallowed.** There is no
  level/state prerequisite otherwise. Equipped gems **and artifact** unequip back to inventory
  before the inputs are consumed. A fusion result has **no rarity** (rarity only applies to
  spawnable/collectible static creatures). (There is **no "class"** concept — affinity is the
  only such axis.)
- **Fused creatures are stored as a recipe, derived on load** — the instance saves
  `{ identityParent: creatureId, affinityParent: creatureId }` (two static creature IDs), and
  the engine recomputes identity/affinity/averaged-stats/both-traits from static data each load.
  Valid because fuse-once means a parent is never itself a fusion, and fusion reads only static
  per-creature data. **Accepted consequence**: rebalancing a base creature retroactively changes
  existing fusions derived from it. Do **not** store computed fusion results.
- **Stat growth is linear and derived from base stats — there is NO growth-rate field.**
  Level-N stat = `base × (1 + 0.25 × (level − 1))`. Incremental power comes from the
  **build-modifier pools and effective stats** (traits/augments/infusions/perks/fusion/facility
  upgrades), not levels.
- **Gems**: `{ spell, level, augments[] }`; level (**bounded, fixed max, raised by Gem Forge
  tiers**) → augment-slot count (**small fixed max, 3–5**; not damage); leveled via
  **Essence**, free/instant to equip. **Artifacts**: parallel shape (level bounded similarly,
  raised by Artifact Forge tiers; → infusion-slot count, same 3–5 ceiling; leveled via **Ore**),
  stat-focused; few fixed base-types (stat-flavor variants for the single artifact slot, not
  equipment categories). Augments and infusions are **effect-framework objects** (above).
- **Souls**: tracked **per creature** (not per species); 100% = permanent summon unlock; caps
  at 100%; bosses grant none. Soul-gain per kill is a **flat % fixed per rarity tier** (no
  variance); banked the instant the kill happens, regardless of the fight's eventual outcome.
  There is no way to target/bias which specific creature spawns beyond choosing a biome — within
  a biome it's pure rarity-weighted RNG.
- **Currencies** (config-tuned): Essence (gems), Ore (artifacts), Bricks (facilities, rarer),
  Lifeforce (fusion + catch-up leveling), perk points (specs; non-dropped, first-boss-only,
  1000 = one maxed spec [flat list, some perks leveled], refund-on-swap, free/unlimited swap).
  All combat-dropped except perk points; all currencies are **unbounded** (no storage cap).
- **Biomes** are data (name, theme, **species spawn pool**, scaling tweaks, visuals); a floor
  picks a species from the pool, then a specific creature by **rarity-weighted seeded RNG**.
  Biome changes **every 10 floors** (10 in v1) — keep cadence/count as config constants. Floors
  1–100 use the fixed sequence; floor 101+ draws a biome by **seeded RNG** unless pinned via the
  Biome Atlas (pinning may retroactively override a visited floor). v1 content target: **>3
  species/biome, >6 creatures/species** (~180+ creatures total). **Bosses** every 10th floor are
  unique, non-collectable. Track **deepest-reached floor** as state (fast-travel up to it).
  **HP resets every fight**; on wipe, return to hub (no loss).
- **Difficulty/depth model**: each floor maps to an **enemy level range** (not a separate stat
  multiplier) — enemies are ordinary creature instances at that level, using the same linear
  growth formula as player creatures. Enemy level grows **faster than floor number**; range
  **width widens with depth**. A floor contains a **variable, depth-scaled number of fights**.
  Recipe drops (gem/augment/infusion) come from a **global depth-scaled table**, independent of
  which creature died.
- **Facilities**: all facility actions (craft, infuse, fuse, summon) resolve **instantly** on
  payment — no real-time timers/queues, consistent with engine purity's no-wall-clock rule.
  Only **Gem Forge, Artifact Forge, Fusion Chamber** have upgrade tiers (tier counts differ per
  facility); v1 tiers **raise the level cap** craftable/fuseable there. Soul Altar,
  Storage/Vault, and Biome Atlas are **one-time builds** with no tiers.
- Specializations are **data** (named perk collections); perks plug into the effect framework +
  meta-economy hooks. Each starter spec defines a **starter creature**.
- Scaling/balance is config: depth curves (the master difficulty lever), XP/growth, drop rates,
  craft/upgrade costs, status magnitudes — all tunable without engine edits.

## State & persistence

- One store (Zustand recommended). UI subscribes; engine does not depend on the store.
- **Saves are large** — assume big rosters, large inventories, many script templates.
  **IndexedDB is the primary store** (via `idb`/Dexie); `localStorage` holds only tiny things
  (settings, a last-save pointer), never the main save.
- **Save = instances + references only**, never copies of static game data. Instances reference
  creatures/species by ID and read base stats/affinity/traits from shipped data. Fused
  instances store the **recipe** `{ identityParent, affinityParent }`, derived on load (above).
- **Partition by logical record**: `meta`, `collection`, `inventory`, `facilities`, `scripts`,
  so a small change rewrites only the relevant record. **Do not pre-optimize** to per-creature
  records — only split `collection` finer if it becomes a **measured** write bottleneck on very
  large rosters (a documented future trigger, not a v1 task). If a partition is missing/fails to
  parse on load, **reset just that partition to default and warn the player** — never fail the
  whole load over one bad partition.
- **Saves are versioned.** Shape: `{ version: number, data: SaveDataVX }` — **one global version
  number governs the whole save** (not per-partition), even though storage is partitioned. On
  load, run pure migrations `v(n) -> v(n+1)` in sequence up to current. Never load an
  unversioned blob.
- **Autosave** on meaningful events (fight resolved, craft, fusion, descend, perk spent),
  **debounced**, plus on tab-close/visibility-change. A fight is **atomic** — never save
  mid-fight; resolve then save. Never block the game loop on a save.
- **Single save slot** in v1. Provide **export** (compressed at the export boundary only, e.g.
  native `CompressionStream`; IndexedDB records themselves stay uncompressed), **import**
  (decompress + migrate), and **delete save**.

## Testing

**Three tiers** (test the pure engine heavily, the browser lightly):
- **Unit tests** (Vitest) — small isolated units, no DOM/async/mocks needed because the engine is
  pure. Cover the *consequence-bearing* branches, not line-count vanity: the damage formula (core
  fully absorbed → chip-floor-only; affinity advantage / disadvantage / neutral; `MAX(1, floor)`
  clamp; empty pools = ×1.0), turn-order tie-break (player → slot → id), death-mid-round skipping,
  the round-cap → draw path, the empty-party guard, and determinism (same seed → identical event
  log). Prefer **table-driven tests** for the trait/condition/action primitives.
- **Golden-replay / snapshot tests** (Vitest) — the highest-leverage tier: a fixed
  `(party, scripts, seed)` run to completion, asserting the **full event log** deep-equal against a
  **committed fixture**. One golden fight covers turn order + damage + affinity + death + events in
  a single assertion. **Keep fixtures small** (tiny parties, few rounds) so a diff is human-
  readable. The suite starts small (1v1, 6v6, affinity matchup, stomp) and **grows every phase** to
  exercise newly added mechanics.
- **E2E smoke test** (Playwright) — does the app render and the loop run in a real browser (the
  Phase 0.5 "counter increments" check). Slower; run it on `main` / pre-deploy, not on the inner
  loop.

**Discipline:**
- **A golden-test failure is a question, not a chore.** It means *either* a regression *or* an
  intended change — decide which *before* regenerating the fixture. Never reflexively "update
  snapshot"; that turns a regression detector into a rubber stamp.
- **Golden fixtures are layered by capability and additive across phases.** Each phase keeps prior
  fixtures **stable** (they pin already-verified behavior) and **adds** fixtures exercising the new
  capability. Never rewrite an old golden to accommodate a new feature unless the feature
  *deliberately* changes that behavior — a changed old golden must be a conscious, reviewed decision,
  not incidental. (E.g. Phase 1 goldens test raw engine math and stay as-is; Phase 2 adds
  interpreted-fight goldens.)
- **Two-tier golden discipline.** Small **focused** goldens are **hand-derived** (per-mechanism
  correctness — the expected log computed by hand). A large **integration** golden may be
  **generated-then-checkpoint-verified** (hand-check the load-bearing assertions: turn order, event
  counts, key results) rather than fully hand-traced — but it must be **explicitly labeled in the
  fixture** as an integration/regression golden whose per-mechanism correctness rests on the focused
  goldens. Don't pass off a giant generated log as hand-verified.
- **Characterize the empty seams now.** Pin the current behavior of the "no-op today, real later"
  seams — `getEffectiveStat` returns base with no effects; the mod pools yield ×1.0 when empty; the
  remap-aware OffStat lookup returns effective Attack with no remap; `spellPower` is 1.0 for Attack.
  When a later phase makes them real, the test states exactly what changed.
- **Every failing fight is reproducible from its seed** — combat is deterministic, so when a bug
  appears in play, capture the seed and it becomes a permanent regression fixture.
- **Every engine change ships with or updates a test.** The golden-replay suite is the canary.

**CI (GitHub Actions):**
- Run **lint + unit + golden tests on every push *and* every pull request** — catch regressions
  *before* merge so `main` stays always-green and always-deployable. Tests are fast (pure engine,
  no browser), so this costs seconds.
- **Deploy only from `main`, and only if tests pass** — the deploy step is gated on the test step
  (build/publish guarded to the `main` branch). Tests-on-every-change, deploy-on-main.

## Deployment & environments

- **Static host: GitHub Pages** (no backend; the built `dist/` is all that's served). Project site
  → served from the repo subpath, so **`base: '/Depths-of-Souls/'` in `vite.config.ts`** is
  mandatory (without it the bundle 404s → blank page).
- **Environments are driven by Vite mode**, not by separate code paths. One mode switch
  (`--mode production` / `--mode development` or a custom mode) flips, together: the `base` path,
  the **IndexedDB database name**, and any debug/feature flags. Keep all per-environment differences
  behind this single mechanism.
- **Prod vs dev topology: PR-preview deployments.** `main` deploys to the production Pages URL;
  each **pull request** deploys an **ephemeral preview** (its own temporary subpath) that is torn
  down when the PR closes. No standing dev environment to maintain; "dev" = the change about to
  merge.
- **IndexedDB MUST be namespaced by environment** (e.g. `depths-of-souls` (prod) vs `depths-of-souls-dev`), driven by the
  Vite mode. This is a **hard requirement**, not a nicety: prod and dev share the same origin
  (same domain, different path), so they share the same IndexedDB unless the DB *name* differs — a
  dev build with a broken/half-migrated schema could otherwise corrupt a real prod save. Isolation
  lives in the app (DB name), never in the hosting topology.
- **No SPA-router URL rewriting on Pages** — deep-link refreshes 404. Not an issue now (single
  page, no router). If a router is ever added, use **hash routing** (`/#/...`) or a `404.html`
  fallback.
- **Saves are per-browser, per-origin** — export-to-file (§ persistence) is the cross-device and
  eviction backstop, not a sync layer.

## Project layout

```
src/
  engine/    pure TS, no React. resolver, interpreter, rng, scaling.
  data/      content as data: creatures, traits, spells, biomes, facilities, config.
  state/     store, save/load, migrations.
  ui/        React components; render state, dispatch intents.
  app/       wiring, game loop, top-level screens (no router in v1; hash routing only if ever needed).
```

## Implementation plans

- When a phase or task is worked up as an **implementation plan** (e.g. a `briefs/` doc or a plan
  handed to the coding agent), **every assumption the plan makes must be explicitly marked** —
  inline, clearly labeled (e.g. an **`ASSUMPTION:`** tag or a dedicated "Assumptions" section) — so
  they can be reviewed together *before* implementation, not discovered later in the code.
- An assumption is anything the plan *decides* that wasn't already pinned in GAME_DESIGN /
  CONVENTIONS / a locked design session: a chosen default, an interpretation of an ambiguous spec,
  a value picked for lack of a stated one, a deferred edge case. If the plan had to choose, it's an
  assumption — surface it.
- Marked assumptions are the review checklist: go over them explicitly, confirm or correct each,
  before (or alongside) approving the plan. This mirrors the code-level rule below (`// ASSUMPTION:`
  notes) but catches the decision one step earlier, at plan time.

- **Every feature phase ships a demo.** After each phase's engine/logic work, a small throwaway
  visual demo (successor to the Phase 1.5 / 2.5 harnesses) makes the new capability visible in the
  browser — the standing pattern, not a per-phase decision. Same guardrails every time: it
  **consumes** the engine (imports from `src/engine`, renders in `src/ui`/`src/app`; the engine
  never takes a UI dependency), uses **real content, not `__fixtures__`**, is **explicitly marked
  throwaway** (Phase 7's real combat UI replaces them all), and is a **separate PR** after the
  phase's core work. It gets its own `briefs/` entry (Status: planned → shipped) and a `phases/`
  record like any other work.

## Style

- Small modules, named exports, colocate types with their domain.
- Comment *why*, not *what*. The types say what.
- When an open design question (GAME_DESIGN §13) forces a choice, code to an interface and
  leave a `// ASSUMPTION:` note rather than silently deciding.
