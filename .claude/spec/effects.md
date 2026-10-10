# Spec — Effects

Read this when changing any trait, perk or effect.

## Design

## 6. Traits, statuses, equipment & the effect framework

### The unified effect framework (architectural keystone)
**Traits, status effects, gem augments, and equipment infusions are all instances of one
data-driven, hook-based effect framework.** They differ only in how they attach to a creature
(innate/fused, applied in combat, equipped via gem, equipped via equipment) and which hooks they
use — not in their underlying machinery. This is a hard invariant (see CONVENTIONS): one effect
model underpins all of them, so new content is data and genuinely novel behavior is at most one
reusable hook primitive.

An **effect** is the mechanical unit: either a **passive** (always on while attached, e.g. "+25%
Attack", "ignores 30% of Defence", "acts last") or a **trigger** (a hook, an optional condition or
chance, and a response). A **carrier** attaches a list of effects to a creature:
- a **trait** carries effects permanently for the fight;
- a **status** is a **timed container of the same kinds of effects**, one instance per creature
  (it owns duration, re-application and "has status X"; its effects own what it does; statuses
  never stack, see "Status effects"). Poison is a status carrying a
  damage trigger; Weaken carries a damage-dealt reduction; Web carries "act last"; Stun carries
  "can't act";
- gem augments and equipment infusions (Phase 8) are carriers of the same effects.
This is what "one framework" means in practice: any timed version of a trait's effect is data, not
new engine work (restructured this way in Phase 4.1). One deliberate limit is enforced by a
validator: **a status may not carry a stat-modifier** (below).

**Player-facing treatment (taxonomy)** — **category determines player-facing treatment** (a
bright line, locked Phase 3):
1. **`stat-modifier`** — scales a stat's *value* (`stat`, `factor`). Folds into **effective stats**
   (below) **multiplicatively** (`base × Π(factors)`). **Always permanent-for-the-fight, uncapped,
   never surfaced as a status** — the player sees only the resulting **effective stat** (and net
   multiplier), never a "−20% Attack" icon. Because folding is multiplicative, reductions **approach
   but never reach zero** (five ×0.8 = ×0.328, not zero) and **stacking is uncapped** — grinding a
   stat up or down is a supported, cap-free build path (the incremental-scaling lane). Buffs compound
   the same way (five ×1.3 = ×3.7). **There is no temporary stat-modifier** — all timed/capped
   debuffing is done via statuses (damage-modifiers, locks, DoTs) instead; a validator rejects a
   stat-modifier inside a status. Stat buffs/debuffs are data
   instances of this one primitive (parameters: stat, factor), no per-stat special-casing;
   spells/effects may apply custom factors.
2. **`stat-remap`** — redirects *which stat a formula slot reads* (e.g. "use Speed as Attack for
   the Attack action"). Reads the **source stat's effective value**; Attack-slot stat-modifiers do
   **not** transfer to the substituted stat (a Speed-attacker wants +Speed, not +Attack — a legible
   consequence). Multiple remaps on one slot resolve by **fixed effect order (innate-1 → innate-2 →
   perks → equipment infusions), last-writer-wins**. The damage formula reads its OffStat through a
   remap-aware lookup so this needs no formula changes.
3. **`damage-modifier`** — folds into the damage formula's mod pools: the attacker's **additive
   dealt pool** (`1 + Σ`) or the defender's **multiplicative taken pool** (`Π`). **These ARE surfaced
   as timed statuses.** Weaken ("−X% damage dealt", one instance + duration),
   Defend's ×0.65, a Vulnerability ("+X% damage taken") debuff, trait-granted crits all live here.
   Pools stay additive-dealt / multiplicative-taken (unchanged — these are timed and, from
   4.1-H2b, single-instance, so no runaway-to-zero concern). Distinct from `stat-modifier` — a
   "−Attack" stat change and a "−damage dealt" Weaken are different categories with different
   treatment and never double-count.
4. **Statuses** — tagged timed conditions like Poison (DoT), Regen, Stun (skip turn), Web (act
   last), Confusion. Timed, surfaced as status icons. This is what scripting's `has-status`
   condition scopes to (not the invisible stat-modifiers).
Permanent trait passives that fold into the damage formula (armor penetration, conditional damage
bonuses, damage-taken reductions, …) are shown on the creature, not as status icons.

**Effective stats (engine invariant):** base stats are **immutable** (except by permanent effects
like level-up). A creature's current stat is **computed on demand** — `getEffectiveStat(creature,
stat)` folds all active `stat-modifier` effects over the base **multiplicatively** (`base ×
Π(factors)`) in a fixed deterministic order (a conditional passive's factor is included only when
its read-time condition holds). Never write a derived value back to the creature. Expiry = removing
the effect from the list; the next `getEffectiveStat` reflects it automatically (no
reverse-bookkeeping, no order ambiguity). All combat math reads stats through this accessor (a
passthrough to base until effects exist). **This base+fold-on-read model — not a mutable per-creature
stat blob — is required**: conditional passives (whose contribution blinks with live state) and any
non-permanent effects need recomputation/reversibility a mutable blob cannot give cleanly, and it
keeps the representation singular and deterministic.

**UI consequence of multiplicative stacking (a Phase 7 requirement):** because stacked multipliers
aren't mentally computable (`0.8³ = 0.512`, not "−60%"), the UI must **always surface the computed
effective stat and net multiplier as the primary display**, with the per-factor breakdown as
hover/detail — never make the player multiply factors. (Incremental-genre players expect
multiplicative diminishing-returns, so this is idiomatic, but the display must show *results*, not
raw factor lists.) One known ergonomic cost: scripting against a *predicted* post-debuff stat
threshold requires reasoning about compounding; if playtesting shows this confuses players, an
additive-within-a-type / multiplicative-across-types hybrid is the documented fallback.


**Loop safety** (engine invariant, applies to the whole framework): an effect/trigger **cannot
re-enter its own resolution chain** (kills true infinite loops), and a
**named cascade-depth cap** (`MAX_TRIGGER_CASCADE_DEPTH` **= 500**, counting *chain depth* not
trigger breadth) backstops exotic multi-effect cycles. Breadth is effectively unlimited — "lots
and lots of triggers firing once each" is a fully supported build path; only unbroken
self-perpetuating chains are truncated. Truncation is deterministic. Concretely (locked Phase 3):
- **Self-re-entry guard = instance-level, stack-scoped** — a specific effect *instance* cannot
  re-enter while it is already unwinding on the active resolution stack. This blocks true
  self-loops (a retaliation triggering its own retaliation) but leaves legitimate cross-creature
  cascades alone (A hits B, B's trait fires — not re-entry of A's). **Each trigger of a status is
  its own instance for this guard** (a status with several triggers is several instances), so one
  trigger can cause another trigger of the same status: Spore's DoT tick killing its host
  still fires Spore's own on-death spread.
- **Depth = chain nesting**, not breadth. N effects firing on one hook point is breadth N at the
  current depth; each trigger that *causes a new hook to fire* increments depth for that sub-chain.
- **On the cap**: the over-cap trigger simply does **not execute** (no crash, no partial fire);
  resolution unwinds normally, and a **mandatory `CascadeTruncated` event** (creature/effect +
  depth) is **always** emitted — observable in the log/UI and assertable in goldens.
- **Depth is transient** — it lives on the resolution call stack, resets to 0 per top-level
  action/hook point, and is **never stored in `CombatState`** or serialized (same principle as
  effective stats: derived/momentary values don't live in authoritative state).

### Hook execution model (locked Phase 3)
The dormant hook seams (no-ops since Phase 1) activate here. How a hook fires:
- **Scoped iteration.** At a **per-creature** phase point (that creature's turn start/end),
  iterate that creature's effects; at a **global** phase point (round-start/round-end), iterate all
  creatures' effects in the **standard tie-break order** (player → slot → id). All hook lookups go
  through one function, **`effectsForHook(creature, hook)`** (scan-and-filter inside) — a
  hook-type index is deferred until profiling shows it's needed (drop-in behind that boundary,
  golden-verified, since correct output is byte-identical).
- **Hooks reuse action machinery.** A hook that deals damage or applies a status calls the *same*
  paths and emits the *same* shared consequence events (`DamageDealt`, `CreatureDied`,
  `StatusApplied`, …) as a chosen action. A hook is a new *trigger origin*, not a new consequence
  vocabulary.
- **`TriggerFired` intent event** precedes the consequences a trigger produces (mirroring
  `AttackDeclared`→`DamageDealt`), so the log explains *why* triggered damage/effects happened.
- **One shared per-creature effect ordering** — innate-1 → innate-2 → perks → equipment
  infusions → applied statuses — is reused *everywhere* effects are iterated: stat folding, hook
  firing, remap resolution. One "effect order" concept, not several.
- **An effect reacts only while it exists.** An effect fires on an event only if that exact effect
  instance existed when the event started and still exists when its turn to react comes: a status
  cleansed earlier in the same chain doesn't tick, and a revived creature doesn't fire effects from
  before its death.

**Hook interaction edges (locked Phase 3):**
- **Dead creatures fire only `on-death`.** `effectsForHook` considers only effects on `alive`
  creatures; the sole exception is `on-death`, which fires once, *as* the creature dies, even
  mid-cascade/mid-sweep. A creature that takes lethal damage fires `on-death` but **not**
  `on-damage-taken` (death pre-empts the victim's reaction — you can't swing back if the blow killed
  you). **Damage-path hook order** (after `DamageDealt`): `on-damage-dealt` (source) fires
  **unconditionally — including on a lethal hit** (the attacker dealt the damage regardless) →
  `on-damage-taken` (self) fires **only if the target survived** → then if it died: `CreatureDied` →
  `on-death` → `on-kill` (source) → `on-ally-death`/`on-enemy-death` (observers). Hit-reactions
  resolve before death-reactions.
- **Nothing is done to a corpse.** Apart from a revive, no effect acts on a dead creature: no
  damage, heal, status, stat change or cleanse. A spell whose first effect kills its target puts
  nothing more on it, and a spell effect aimed at a caster killed mid-cast is dropped.
- **The same holds for the actor** (Phase 4.1-C2c). A creature killed inside its own action, say by
  a retaliation after its first hit, does nothing more in that action: no further hit, splash hit
  or AOE hit. What it already did stays.
- **Applying a status emits `StatusApplied` then fires `on-status-applied`** (event-before-hook,
  matching intent→consequence ordering). Re-entrant chains (a status-application triggering another)
  are covered by the loop-safety guard.
- **`DamageDealt` carries a required `damageSource: 'attack' | 'cast' | 'dot'`** (+ the status
  identity for DoT). A DoT tick emits only `DamageDealt` (no per-tick `TriggerFired` — the DoT's
  existence is already announced by its `StatusApplied`), tagged `'dot'`, so the log renders
  "[creature] took X poison damage" and Phase 7's UI can attribute it. Attack/cast damage carries
  `'attack'`/`'cast'`. (Contrast: a triggered *attack* does emit `TriggerFired` → `DamageDealt`.)
  Because the field is **required** (uniform self-describing schema, not an optional sometimes-field),
  the **Phase 1/2 goldens are consciously updated** to add it — a **field-addition-only** change
  (regenerate, then verify the diff shows *only* the new field, no value/ordering changes), which is
  a deliberate reviewed schema update, not a silent regenerate, and preserves the byte-identical
  *behavior* guarantee while improving the schema.
- **Applying a stat-modifier emits a `StatModifierApplied` consequence event** carrying source,
  target, stat, the factor applied, **and the concrete effective-stat change** (e.g. before/after or
  delta — "Attack 100 → 51 (−49)"), because a bare factor (`×0.8`) is meaningless without its base.
  This is the golden assertion surface for stat changes (stat-modifiers are "not surfaced *as a
  status icon*" — a UI statement, not a log one; the log still records the change, and Phase 7 can
  use it for floating combat text like "Attack −49"). Order: `TriggerFired` → `StatModifierApplied`.
- **Conditional-passive conditions read effective stats but must not create a read-cycle**: a
  condition gating a modifier of stat X may reference *other* effective stats, but must not depend on
  X's own effective value (read base X if truly needed). Prevents `getEffectiveStat` recursion; a
  load-time validator enforces it.

**v1 hook vocabulary (16, as of Phase 4):** `on-fight-start`, `on-turn-start`, `on-turn-end`,
`on-round-end`, `on-damage-dealt`, `on-damage-taken`, `on-kill` (dealt a killing blow), `on-death`
(self died), `on-action-observed` (an ally/enemy acted — replaced Phase 3's never-wired
`on-ally-action`/`on-enemy-action` pair), `on-ally-death`, `on-enemy-death`,
`on-status-applied`, and the actor-self `on-attack`/`on-cast`/`on-defend`/`on-provoke` family
(Phase 4). Phase 3 pinned 13; CONVENTIONS holds the routing rule between the actor-self hooks and
`on-action-observed`. Each hook = a firing point + a **context** (e.g. `on-damage-taken` provides
`{self, source, amount}`). Expanding the set later is **additive and golden-safe** — a new firing
point no trait listens to emits zero events — provided the hook fires at a point the resolver
already reaches; a hook needing newly-tracked state is a larger change (none of v1's are).

### Traits
- **v1 categories**: **passive/stat** (always-on or conditionally-on modifiers, e.g. "+25% Attack
  at full HP") and **triggered** (fire on a hook, produce an effect). **Granting an extra action**
  is in scope as a triggered response ("perform an action": the Sorcerer starter's turn-end cast,
  Resonant Overtone's echo); a granted action always runs **after** the action that caused it,
  inside the same turn, and obeys every action rule (a Stunned creature can't take one, a Silenced
  one can't cast). Still **deferred past v1**: traits that insert extra *turns*, change scripting
  options, or alter the creature's own decision-making. *Reacting to an event by dealing damage /
  applying a status / changing a stat is **triggered**, not behavioral — in scope.*
- A base creature has **1 innate trait**; a fused creature has **2** (both parents'). Each
  **creature has a fixed innate trait** defined in its data (collecting a creature = knowing its
  trait). Equipment can add further trait(s) via infusion (equipment *mechanism* deferred to Phase 8;
  the effects it would carry are the framework built here).
- **`Trait { id, name, effects: readonly Effect[] }`** — a thin named wrapper (identity/flavor for
  UI) over one-or-more effects (the mechanical units); a trait may bundle multiple effects.
- **Passive/stat traits** are `stat-modifier` effects. A **conditional** passive carries a
  **read-time activation condition** (data, like every other condition) evaluated during
  `getEffectiveStat` folding (e.g. "+25% Attack at full HP" = a modifier whose condition is self
  HP% = 100) — never cached, always correct on read.
- **Triggered traits** = `{ hook, condition?, chance?, response }`. The **v1 response vocabulary**
  (each fully parameterized by **target** and **magnitude**) after Phase 4.1: **deal damage, apply
  a status, apply a stat-modifier, heal, revive, grant an action state (defending/provoking),
  remove a status, perform an action** — eight. (*perform an action* — "that creature casts a
  random spell" — joined in Phase 4.1 and replaced two special mechanisms; *suppress-action* left,
  because skipping a turn is now a status effect; *consume stacks* left in 4.1-H2b with stacking
  and Glow.) The governing rule is **no side doors**:
  every triggered behaviour goes through this one response vocabulary, never a special-case
  mechanism (CONVENTIONS). Design-space breadth comes from the **hook × condition × parameter
  cross-product**, not from more response types.
- **No keywords, no implicit targets.** There is no "Retaliate" (or similar) concept — every trait
  is expressed as an explicit event→condition→response→target→magnitude sentence in data, e.g.
  *"when this creature is dealt damage by another creature, attack that creature for 30% Attack."*
  The hook **context** supplies the reference actors (`{self, source}` etc.); the response names its
  target via a vocabulary (`self`, `triggering-source`, `triggering-ally`, `all-enemies`, a full
  `TargetSelector`, …). **`triggering-source` is never the creature itself**: a damage-over-time
  tick's source is its own bearer, so "retaliate against whoever hit me" simply has no target on a
  tick (the hook still fires — a DoT still wakes a sleeper). From 4.1-H2b a tick's source is its
  applier, and retaliation **still** has no target on a tick: DoT is the answer to Defence tanks,
  and most retaliators are those tanks.
- **"attack" / "cast" in a trait or spell mean the real actions** — same damage formula, OffStat
  (Attack / Intelligence), affinity, Defence interaction, pools, and min-1 floor as a creature
  choosing that action; the trait/spell supplies only the spellPower coefficient and target. A
  trait-granted Attack or Cast is **direct** damage like a chosen one. Every other damage a
  trait, status or perk deals (a retaliation, an on-death burst, a DoT tick) is **not** an action:
  it uses the **indirect** formula, which meets only a fifth of Defence (from 4.1-H2a; DoT ticks
  from 4.1-H2b; §7 "Damage channels"), and a creature's own response damaging itself is an exact
  cost. *(Until then the action formula serves trait damage too, DoT bypasses Defence entirely,
  and a response may opt into that bypass explicitly; from 4.1-H2a nothing bypasses Defence
  except a self-inflicted cost.)*
- Traits are **data, not code branches**. Definitions live in `src/data/`; a creature references
  them via **`innateTraitIds`** (1 base / 2 fused), resolved from a registry at combat start, with
  effects instantiated onto the active-effects list at fight start.

## Engine rules

## Unified effect framework (load-bearing invariant)

**Traits, status effects, gem augments, and equipment infusions are all instances of ONE
data-driven, hook-based effect model.** Do not build them as separate subsystems — they share
the same interpreter, differing only in how they attach and which hooks they use.

- **Carriers and effects** (the shape after Phase 4.1-F, A3). An **effect** (`EffectDef`) is the
  mechanical unit: a passive (read where it applies) or a trigger (`{ hook, condition?,
  chancePercent?, response }`). A **carrier** is what attaches a list of effects to a creature:
  - **Trait** `{ id, name, effects: EffectDef[] }` — permanent for the fight (innate, fused, perk
    effects are carried the same way).
  - **Status** `StatusDef { statusId, polarity, defaultDuration, effects: EffectDef[], potency? }`
    (4.1-H2b2: `cap` deleted; `potency` declared by a ticking status) — a **timed, single-instance container of the same effects a trait
    carries**. The status owns the lifecycle (apply, refresh, count down, expire, `has-status`);
    its effects own the behaviour. **Statuses never stack** (brief ASSUMPTION 114): one instance
    per status per creature; re-application keeps the **stronger** value (a DoT's or Regen's
    snapshot potency; a fixed-magnitude status just refreshes; a tie keeps the current one) and
    **refreshes the timer**. A status's effects take a count of 1. *Until 4.1-H2b2 a status stacked
    to a declared `cap` and passed its `stacks` as its effects' default count.*
  - Phase 8 gem augments ("append responses to a spell") and equipment infusions (permanent effect
    lists) join the same model.
  - Why not merge Trait and Status into one carrier: their lifecycles really differ. Sharing the
    payload gives the reuse without blurring the lifecycles. ECS was rejected as a paradigm cost.
  - Before 4.1-F, statuses were four closed `StatusDef` categories (`condition-status`,
    `damage-modifier`, `turn-order-status`, `friendly-fire-status`), each with its own reader, so a
    timed version of any trait passive needed a new category plus sweep, snapshot and immunity
    wiring.
- **The effect taxonomy.** Trait effects (built through Phase 4): `stat-modifier`, `stat-remap`,
  `triggered`, `armor-penetration`, `cross-stat`, `action-instance`, `status-immunity`,
  `provoke-immunity`, `splashing`, `annihilate`, `conditional-damage-bonus`, `taken-reduction`,
  `cheat-death` (`bonus-cast` is deleted in 4.1-E). Passives added for statuses (4.1-F): a
  **damage-modifier** (Weaken, Vulnerability; Glow until 4.1-H2b1; stack-scaled until 4.1-H2b2),
  **`turn-order { position, breakChancePercent? }`** (Web, Grant Act First), **`friendly-fire {
  chancePercent }`**
  (Confusion) and **`action-lock { scope }`** (Stun, Sleep, Silenced, Pacified). DoT/HoT statuses
  (Poison, Burn, Regen, Spore) carry `triggered` effects. Traits add `innate-spell { spell }` in
  4.1-B (A8).
  - The status **damage-modifier stays its own category** (4.1-F1 plan): folding it into
    `conditional-damage-bonus` would re-derive `magnitude × stacks` as a percent and could move
    float results; folding the taken direction into `taken-reduction` would rename perk content.
    A later consolidation is possible.
  - **Every effect is carrier-agnostic** except where a validator says otherwise (below): a status
    may carry any effect a trait carries, and every reader goes through the one effect iterator.
    Two readers read the raw effect list on purpose: `getEffectiveStat` and the stat remap, because
    a status may not carry `stat-modifier` or `stat-remap`. The status lifecycle reads the
    containers themselves: `has-status`, applying and refreshing, `remove-status`, counting
    down, and the immunity lookup (PR #79 review).
  - **`breakChancePercent` is status-only**: breaking free removes the status instance, so a
    `turn-order` carrying it on any other carrier is rejected at load.
- **Immunity is checked once, in the effect iterator** (4.1-F): an immune bearer's iterator skips
  every effect of that status, of every kind: its locks, its friendly-fire, its triggers (a tick
  included), its damage-modifiers and its turn-order (so the Web roll skips it and draws nothing).
  The status still exists, stacks, counts down and counts for `has-status`. Immunity is read only
  from carriers that aren't statuses (traits, perks); a status may not carry `status-immunity`, so
  immunity can't depend on itself.
- **The bright line survives by validator:** a load-time validator rejects `stat-modifier` and
  `stat-remap` inside a status (**no temporary stat-modifier**, GAME_DESIGN §6). Relaxing it would
  be a deliberate design decision, never a refactor side effect. The same validator rejects, inside
  a status, `status-immunity` (above) and `innate-spell` (innate spells are placed at fight setup,
  so a status's could never take effect) (4.1-F1 plan review), and a trigger on `on-round-end`
  (round end has no status work; 4.1-F2 plan review). It runs over the stock statuses at import
  **and over the status registry `createCombat` is given**, so a test fixture's status is held to
  the same rules (4.1-F2 plan review).
- **Player-facing treatment by category** (bright line, from Phase 3):
  1. **`stat-modifier`** — scales a stat (`stat`, `factor`); folds into effective stats
     **multiplicatively** (`base × Π(factors)`). **Always permanent-for-fight, uncapped, NOT surfaced
     as a status** (player sees the effective stat + net multiplier). Multiplicative ⇒ reductions
     approach but never reach zero, stacking is cap-free (both directions). **No temporary
     stat-modifier exists** — timed/capped debuffing is done via timed statuses (damage-modifiers, locks, DoTs).
     Stat buffs/debuffs are data instances of this primitive (params: stat, factor); no per-stat
     special-casing.
  2. **`stat-remap`** — redirects which stat a formula slot reads (e.g. Speed-as-Attack). Reads the
     **source stat's effective value**; slot stat-modifiers do **not** transfer. Multiple remaps on
     one slot → **fixed effect order (innate-1 → innate-2 → perks → infusions), last-writer-wins**
     (the `perks` slot lands in Phase 4 Slice F — see its own addenda below). The
     damage formula's OffStat lookup is remap-aware, so no formula change is needed to support it —
     **build this indirection seam in Phase 1** (returns effective Attack when no remap exists).
  3. **`damage-modifier`** — folds into the damage formula's pools: attacker's **additive dealt
     pool** or defender's **multiplicative taken pool** (pools unchanged). **These ARE surfaced as
     timed statuses and may be capped** — e.g. Weaken (−% dealt, ~1 stack + duration), Vulnerability
     (+% taken). Distinct from `stat-modifier` (a "−Attack" stat change and a "−damage" Weaken are
     different categories, different treatment, never double-count).
  4. **Statuses** (`condition-status` before 4.1-F) — tagged timed conditions (Poison/DoT, Regen,
     Stun, Web, Confusion, …); surfaced as icons; what scripting's `has-status` scopes to. Each
     carries a **`polarity`** tag and its effects (Sleep has two triggers; see "Status lifecycle").
  Plus the permanent trait-level passives (armor penetration, cross-stat, conditional damage
  bonus, taken reduction, …), which fold into the damage formula and are shown on the creature, not
  as status icons.
- **Effective stats (invariant)**: base stats are **immutable** (except permanent effects like
  level-up). Current stat = `getEffectiveStat(creature, stat)`, folding active `stat-modifier`
  effects over base **multiplicatively** (`base × Π(factors)`, conditional-passive factors included
  only when their read-time condition holds) in a **fixed deterministic order**. **Never write a
  derived value back** — base+fold-on-read, **not a mutable stat blob** (conditional/non-permanent
  effects need recomputation a blob can't give cleanly; keeps representation singular +
  deterministic). Expiry = drop the effect from the list. **A conditional passive's gate is data**
  (Phase 4.1-B, S2): `StatModifierDef.condition?: SelfCondition` (self `hp-percent`, self
  `has-status`, `always`) replaces the `predicate` function, which only the placeholder
  `BLOODLUST` (+25% Attack at full HP) used and which made combat state non-plain-data. A
  load-time validator rejects a condition that reads the stat it modifies (e.g. a Health modifier
  gated on HP%). A `SelfCondition` `hp-percent` uses the same max-HP basis as scripting's
  `hp-percent` Condition (`floor` of effective Health; see Combat & scripting), so "at full HP" is
  exactly `>= 100`. **All combat math reads stats
  through this accessor** — a
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
- **One shared per-creature effect ordering** — innate-1 → innate-2 → side effects (perks, Phase 4
  Slice F, player-side only) → equipment infusions → applied statuses — reused *everywhere* effects
  are iterated (stat folding, hook firing, remap resolution).
- **Effect instances have unique ids, and a hook fires only live instances** (Phase 4.1-B, B4).
  Every effect instance (trait, perk, status, and revive's re-instantiation) gets a **unique id from
  a per-fight counter** in `CombatState`; **refreshing a status keeps its instance** (and id).
  `fireHook` builds its candidate list once, so it must re-check each candidate before firing: a
  candidate fires only if its **exact owning instance** is still on the creature. The rule: **an
  effect reacts to an event only if that exact instance existed when the event started and still
  exists when its turn comes.** (Before this, status ids were reused on reapply as
  `${targetId}#status#${statusId}` and revive re-created trait instances with their pre-death ids,
  so a removed-then-reapplied status or a revived creature could fire an effect that should be
  gone, e.g. a "cleanse Poison" trigger followed by the cleansed Poison still ticking.) Instance
  ids never appear in events, so goldens stay byte-identical.
- **Interaction edges**: **dead creatures fire only `on-death`** (`fireHook` gates on `alive`
  per-effect — `effectsForHook` is a pure scan-filter and does no alive-gating; lethal damage fires
  `on-death`, not `on-damage-taken` — death pre-empts the victim's reaction). **Nothing is done to
  a dead creature either**, except `revive` (see the response vocabulary).
  **Damage-path hook order** (after `DamageDealt` lands): `on-damage-dealt` (source) fires
  **unconditionally, even on a lethal hit** → `on-damage-taken` (self) fires **only if the target
  survived** → `on-damage-observed` (every living creature) fires **unconditionally, even on a
  lethal hit** (from 4.1-H2b1; on a lethal hit the victim is not among the observers, because
  `alive` flips before `DamageDealt`) → then if it died: `CreatureDied` →
  `on-death` (self) → `on-kill` (source) → `on-ally-death`/`on-enemy-death` (observers). I.e.
  hit-reactions (dealt always, taken if-survived, observed always) resolve **before**
  death-reactions (died/kill/observers). A lethal Wick burn: the Flare's reaction precedes
  `CreatureDied`, the Last Gleam's follows it. **Applying a status emits `StatusApplied`
  then fires `on-status-applied`** (event-before-hook). **Conditional-passive conditions** read
  effective stats but must not depend on the stat they gate (no `getEffectiveStat` read-cycle;
  enforced by the S2 validator).
- **v1 hook vocabulary (16 at Phase 4 close — Phase 3's 13, +4 `on-[action]` in Slice B = 17, then
  −1 net in Slice E2 when `on-action-observed` replaced the never-wired pair below; 17 from
  4.1-H2b1, which adds `on-damage-observed`):**
  `on-fight-start`, `on-turn-start`, `on-turn-end`, `on-round-end`, `on-damage-dealt`,
  `on-damage-taken`, `on-damage-observed`, `on-kill`, `on-death`, `on-ally-death`,
  `on-enemy-death`, `on-status-applied`, `on-action-observed`,
  plus the Phase 4 `on-[action]` family (`on-attack`, `on-cast`, `on-defend`, `on-provoke` — see
  above). The originally-listed `on-ally-action` / `on-enemy-action` pair was **never wired** and is
  **superseded in Slice E2 by a single general `on-action-observed`** (see the action-reactions
  routing rule below). Each = firing point + context shape.
  Expansion is additive/golden-safe (a new unused firing point emits nothing) if it fires where the
  resolver already reaches; a hook needing new tracked state is a larger change.

### Action reactions: actor-self hooks vs. observation (routing rule) — Slice E2
Two mechanisms, chosen by **whose trait it is relative to who acts**. A trait subscribes to exactly
**one**, so there is no double-firing (a Shieldbarer reacts via `on-provoke`, never also via
`on-action-observed`):
- **Trait on the creature performing the action** → its own **`on-attack` / `on-cast` / `on-defend`
  / `on-provoke`** hook. "When *I* act, do Y" (Y may still target the whole team). Fires once, on
  the actor.
- **Trait on a creature watching someone else act** → **`on-action-observed`**. "When *an
  ally/enemy* acts, *I* react." Fans out to observers.

**`on-action-observed`** (general action-observation system; supersedes the never-wired
`on-ally-action`/`on-enemy-action`): fired **per action instance** on **all living creatures**
(cheap — `effectsForHook` returns nothing for non-observers). Reacting effects filter on themselves:
**`relationship`** (`self`/`ally`/`enemy`/`any`; ally includes self), **`actionKind`**
(`attack`/`cast`/`defend`/`provoke`), **`excludeActor?`**. Context = **actor + actionKind +
instanceIndex** (spell/affinity added later when a consumer reads it). Per-instance firing → an
ally's Echo/Flurry multi-cast is observed once per instance. Rides `MAX_TRIGGER_CASCADE_DEPTH` + the
re-entry guard. `defend`+`provoke` can co-occur in one action → two observations, one per kind.

**Damage observation** (Phase 4.1-H2b, brief ASSUMPTION 115): the observation system also observes
**damage events**. An observer can react to damage dealt to a creature, filtered by the damaged
creature's **`relationship`** (as above) and by whether the damage was **self-inflicted**.
**Self-inflicted means exactly the cost case** in "Damage channels and the Additional": a creature's
own trait, status or perk response damaging that same creature. **A DoT tick is never
self-inflicted**, whoever applied it and whether or not the applier is alive (doc-sync ruling,
2026-10-08: ticks neither draw retaliation nor count as self-damage). It extends the one observer;
it is not a new side channel. First consumer: the Flickerling Flare ("whenever an ally damages
itself"). **The shape** (decided at the 4.1-H2b1 plan review, brief ASSUMPTION 142):
- A **sibling hook, `on-damage-observed`**, fired from `applyDamageAndEmit` (every damage event
  passes there) on every living creature, at the place in the damage-path hook order above. A
  sibling rather than a second event kind on `on-action-observed`, so an action observer (the
  Resonants) can't see a damage event, nor a damage observer an action, by construction.
- The **same `ObservationFilter`**: `relationship` compares the observer with the **damaged
  creature** (`ally` includes the observer itself), plus **`selfInflicted?: boolean`** (absent =
  either). `actionKind`/`excludeActor` belong to `on-action-observed` only, `selfInflicted` to
  `on-damage-observed` only, and a filter on any other hook is invalid: a load-time validator over
  every trigger carrier (traits, perks, statuses) enforces it.
- Hook context: `source` is the **damaged creature** (so `triggering-source` and the `'target'`
  condition subject resolve to it); the channel is indirect, as for every hook.
- **Self-inflicted is carried, never inferred:** `applyDamageAndEmit` takes a required `origin`
  (`DamageOrigin`: `{ kind: 'hit' } | { kind: 'cost' } | { kind: 'tick'; dealerId }`, `dealerId`
  the living applier or `null`; brief ASSUMPTION 146; H2b1's `selfInflicted` flag until 4.1-H2b2).
  Self-inflicted iff `cost`, which only the cost path (`applyCostDamage`) passes; the direct path
  passes `hit`, the tick path `tick`. Never `source === target`: a DoT tick and a direct action landing on its
  own actor have equal ids and are not self-inflicted. A zero cost emits nothing, so there is
  nothing to observe.
- **Both observation hooks fail closed:** a candidate on `on-action-observed` fired without the
  action details, or on `on-damage-observed` without the damage details, is skipped, never fired
  unfiltered.
- No hook-type index: the fan-out scans every living creature per damage event, as
  `on-action-observed` does per action instance (measured, see the hook execution model).

**Classification of all locked content** (the routing map — misfiling a trait here is a real bug):
- **Observation** (`on-action-observed`): **Resonants** (`relationship: ally`, `actionKind: cast`)
  — the *only* action-observation consumer across every species, starter, and all three spec
  trees. From 4.1-H2b1 the Flickerling Flare observes damage (`on-damage-observed`, above).
- **Actor-self** (own action hook): Weaver, Lure, Sleeper, Charger (until 4.1-H2b1), Setter,
  Sparkeaters' Drainer, Seeder, Hollowkin, Shieldbarer starter, Unicorn
  (`on-attack`/`on-cast`/`on-provoke`); Shield up, Defensive Stance, Concussive Blows, Aggressive
  Caster (perks); Sorcerer's on-turn-end cast
  (timing/self). Every action-reactive trait except Resonants.

That Resonants is the lone observer is *why* observation is built as the general primitive now — it
carries the future, not the seed.

**Design note (engine audit, not actioned): `on-ally-death`/`on-enemy-death` are `on-death-observed`
candidates.** These two still exist as their own hooks (`resolution.ts`'s `fireDeathObservers`)
even though the *action* side of the same actor-vs-observer split was already unified into
`on-action-observed` above. If a future slice builds a general `on-death-observed` (the death-side
mirror — "when *an ally/enemy* dies, *I* react," fanned out to observers the same way
`on-action-observed` fans out per action instance), `on-ally-death`/`on-enemy-death` are its two
natural candidates to fold into one hook with a `relationship` filter. **`on-death`/`on-kill` stay
separate** — those are actor-self hooks (the dying/killing creature's own reaction), like
`on-attack`, not observation. Flagged, not built: no content currently needs it, and folding two
hooks that already work is real engine surgery (event-shape/call-site changes with golden blast
radius) with no locked consumer to justify it yet — same "wait for a real content driver" discipline
`on-action-observed` itself followed before Resonants existed.

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
  `CombatState`, never serialized** (same principle as effective stats). It lives on the transient
  `ResolutionContext` (4.1-C).
- **Granted actions (`perform-action`) are bounded by depth, not by the re-entry guard**: a granted
  action runs at the depth its queue entry carries (the granting trigger's, which includes the +1),
  so an echo chain through the same Overtone is allowed and still truncates at 500. Every
  `perform-action` trigger must carry a real guard (data test; see the response vocabulary).

### Trait model (Phase 3)
- **`Trait { id, name, effects: readonly Effect[] }`** — a named wrapper (UI identity/flavor) over
  one-or-more effects. Definitions in `src/data/`; `Creature.innateTraitIds` (1 base / 2 fused)
  resolved from a registry at combat start; effects instantiated onto the active-effects list at
  fight start.
- **Passive/stat traits** = `stat-modifier` effects; a **conditional** passive carries a
  **read-time activation condition** (`SelfCondition`, data since 4.1-B) evaluated during
  `getEffectiveStat` folding (never cached).
- **Triggered traits** = `{ hook, condition?, chancePercent?, response }`. **Response vocabulary
  (each parameterized by target + magnitude): deal-damage, apply-status, apply-stat-modifier, heal,
  revive, grant-action-state, remove-status, perform-action** (eight: 4.1-F added `perform-action`
  and removed `suppress-action`, 4.1-H2b2 deleted `consume-stacks`; see "Response vocabulary"
  above).
  Breadth = hook × condition × parameter cross-product, not more response types.
  The optional `condition?` **reuses the scripting `Condition` union** (declarative data, like
  every condition since S2), evaluated **against live state at fire time** (pure, no RNG; a false
  condition skips the effect **silently**, before the depth-cap and `TriggerFired` accounting).
  **Source-relative conditions are expressible** since Slice E2: the `'target'` subject resolves to
  the trigger's source in `fireHook` (and to the damage target in `calculateDamage`).
  **Trigger-only conditions** (4.1-H2b1, brief ASSUMPTION 141): a trigger's condition is a
  `TriggerCondition`, the scripting `Condition` plus kinds scripts may not use. The first is
  `other-ally-injured` (a living ally other than the bearer below its effective max Health,
  `currentHp < effectiveMaxHp`, in integers). The type keeps it out of script rules (Phase 6's
  editor derives from `Condition` and must not list it; see ROADMAP Phase 6). Its paired
  `ResponseTarget`, `lowest-hp-injured-other-ally` (the lowest current HP among those allies,
  standard tie-break, no RNG), reads the **same pool function**, so the gate never passes with the
  target empty or fails with it non-empty. First user: the Flickerling Wick, whose burn and heal
  both carry the condition (burn first; a lethal burn skips the heal).
- **No keywords, no implicit targets** — a trait is an explicit
  event→condition→response→target→magnitude sentence; the hook **context** supplies reference actors
  (`{self, source}`, etc.); the response names its target (`self`, `triggering-source`,
  `triggering-ally`, `all-enemies`, a `TargetSelector`, …).
- **`triggering-source` never resolves to the firing creature itself (decided, PR #64 review).**
  A DoT/Regen tick's source is its own bearer, so under `on-damage-taken` a "retaliate against
  whoever hit me" response would otherwise target itself (Snapjaws Jaws hitting itself on Poison;
  Hollowkin Wretch Confusing itself). `triggering-source` resolves to **no target** when the source
  is `self`; the hook itself still fires (Sleep must still wake on DoT), and the fizzle emits
  `TriggerFired` only. **From 4.1-H2b** a tick's source is its applier (brief ASSUMPTION 113), and
  `triggering-source` on a tick **still resolves to no target** (doc-sync ruling, 2026-10-08):
  retaliation never answers a tick. DoT is the counter to Defence tanks, and most retaliators are
  those tanks. This rule is about response targets. `perform-action`'s
  `actor: 'triggering-source'` is not a target: it resolves to the source even when that is the
  bearer (4.1-E plan review).
- **"attack" / "cast" in a trait or spell = the real actions** — same damage formula, OffStat,
  affinity, Defence, pools, min-1 floor; the trait/spell supplies only the spellPower coefficient +
  target, and from 4.1-H2a it is **direct** damage with the Additional. Every other damage a
  trait, status or perk deals (a `deal-damage` response, a DoT tick) is **indirect** from 4.1-H2a
  (DoT ticks from 4.1-H2b), and a creature's own response damaging itself is a cost: see "Damage
  channels and the Additional". *Until then: DoT is the lone Defence-bypass exception, and a
  response may opt into the bypass explicitly (flat mode); from 4.1-H2a nothing bypasses Defence
  except a self-inflicted cost.*
- **Behavioral responses, current line.** Granting an extra action is **in** as the
  `perform-action` response (4.1-E): it always runs after the granting action, inside the same
  turn, through the one action pipeline. Turn-order control is in as the `turn-order` status
  effect. Still **deferred past v1**: inserting extra *turns*, unlocking scripting options, and
  altering the creature's own decision-making. Reacting via damage/status/stat-change is
  *triggered*, in scope.

- **Unspecified magnitude ⇒ 100%.** A trait/spell deal-damage or coefficient response that omits a
  magnitude means **100%** of the relevant OffStat — the authoring default, so a blank is meaningful,
  not an error.
- Specializations are **data** (named perk collections); **perks are effect-framework
  effect-carriers** — v1 **combat-only** (meta-economy perk hooks deferred post-beta; no meta
  framework built, `Perk` stays a plain effect-carrier). A spec is **valid iff its perks'
  `Σ(maxLevel × costPerLevel) === 1000`** (load-validated). Perk points = `bossesCleared × 100`
  (**derived**, first-clear only); spend is `Map<perkId, level>`; refund is free/unlimited
  (per-perk, refund-all, or spec-swap — all the same clear/decrement, budget recomputes). Each
  starter spec defines a **starter creature**. Store actions (Phase 4.1-G, G4):
  **`setPerkLevel(perkId, level)`** sets an absolute level (buying and refunding are one call) and
  **`refundAllPerks()`**; an invalid request (perk not in the current spec, a level that isn't a
  whole number in `0..maxLevel`, or total spend over `bossesCleared × 100`) returns `{ ok: false,
  reason }`. **No build-order gating**: perks that stay inert until Phase 8 are buyable (nobody plays
  before beta, and by beta every perk works). **`PerkDef` carries no phase tag** (the P4/P8 column
  in the spec docs is a design-record annotation): each inert perk gets a code comment (e.g. `//
  Inert until Phase 8 (gem system) — see sorcerer.md`), and a data test holds an explicit list of
  the 9 known-inert perk ids while every other perk must have at least one effect at max level.
- Scaling/balance is config: depth curves (the master difficulty lever), XP/growth, drop rates,
  craft/upgrade costs, status magnitudes — all tunable without engine edits.

## To fold

- **`on-[action]` hook family** — `on-attack`, `on-cast`, `on-defend`, `on-provoke` (on-wait
  omitted). Fire **once per action *instance*** (see the action instance-list note below) — a
  single Attack that resolves as three instances fires `on-attack` three times, once per
  instance — **not** on the resulting damage. Expands the pinned hook set; each needs golden
  coverage.
### New primitives / capabilities
- **count-scaling** modifier — factor reads a **live count**: living allies, allies of a
  species/affinity, enemies-with-a-status, **dead allies**, or a per-creature **defend-count**.
  Recomputed each read. **Built in Phase 4 Slice D** as `MagnitudeSource` (`effect-types.ts`):
  `{ kind: 'flat', value }` | `{ kind: 'count', of, statusId? }` (a third kind,
  `consumed-stacks`, was deleted in 4.1-H2b2),
  an optional sibling field on `DamageModifierDef.magnitude` and the `deal-damage` response.
  **Count-source semantics (decided):** a `magnitudeSource` substitutes for the **repetition
  count** a host field already scales its authored rate by — it stands in for `stacks` in the
  existing `magnitude * stacks` / `magnitude ** stacks` / `flatAmount * stacks` formulas, **not**
  for the rate/flat number itself. Absent ⇒ byte-identical to pre-Slice-D behavior. This axis is
  about *what the count is*; it is orthogonal to the taken-reduction accumulation rule below.
- **Taken-reduction accumulation (decided) — two authoring modes on a `taken` damage-modifier:**
  - **multiplicative** (default; the existing `magnitude ** count`): asymptotes toward 0, never
    clamped, per the taken-pool rule "reductions trend toward but never reach 0, no clamp needed."
    This is the model for ordinary stacking taken-reductions and for all **future** count-scaled
    taken sources.
  - **additive-with-cap** (Bulwark): per-unit reduction **summed** `× count` and **hard-clamped**
    at a per-source `cap` — `factor = 1 − min(reductionPerUnit × count, cap)`. Bulwark = −5% per
    Defend, cap 80% (`specializations/shieldbarer.md`, **unchanged** — its text is exactly correct
    under this decision). An additive-capped source collapses to that **single factor**, which then
    enters the multiplicative taken pool `Π(takenFactors)` alongside every other source:
    **additive within a source, multiplicative across sources.**
  The two modes are the reason the taken pool needs both a summing/clamping path *and* the existing
  product; a purely multiplicative `magnitude ** count` does **not** implement Bulwark's cap (it
  sails past 80% toward 100% as the count grows — e.g. `0.95 ** 32 ≈ 0.19`, an 81% reduction), and
  an earlier draft that claimed otherwise was wrong. The exact authoring field shape (e.g. an
  `accumulation` discriminator + a `cap`, with the per-unit rate read from `magnitude` or a
  dedicated field) is the coding agent's implementation plan to propose (ASSUMPTION-tagged) and
  review; the default **must** be `multiplicative` so every existing taken status stays
  byte-identical, and the focused golden **must** drive `count` high enough to actually reach the
  cap (the Slice-D multiplicative fixture only reached ~10% over two rounds, so it never exercised
  a clamp — which is exactly why the divergence was invisible to green gates).
- **`StatModifierDef.factor` does NOT get `magnitudeSource` yet (decided — deferred to H1).**
  `getEffectiveStat(creature, stat)` is a pure `(creature, stat)` function with no `CombatState`
  at most of its ~15+ call sites; wiring a count-scaled stat-modifier (Swarmhive Striker) means
  giving it state access — a real, invasive change with no Slice D consumer. Deferred to whichever
  slice first authors Swarmhive Striker. **Decided (Slice E2)**: add `magnitudeSource?` to the
  **`apply-stat-modifier` response** (NOT the standalone `StatModifierDef`), **freeze-at-application**
  — the response executes once and bakes a fixed `factor` into a new `StatModifierEffect`
  (`finalFactor = 1 + (factor − 1) × count`), so the count is frozen at apply-time with no live
  recompute. (An innate `StatModifierDef` in `Trait.effects` is folded *live* by `getEffectiveStat`
  every read — there is no application moment to freeze at — which is exactly why the host is the
  response, not the Def.) Striker is therefore an `apply-stat-modifier` response (fires once, e.g.
  on-fight-start), not a live passive, and the Bulwark-style live-recompute stat host is **not**
  built. Lands with a real `speciesId` threaded through `materializeCreature` (the
  `living-allies-of-species` reader is built but inert — returns 0 — until then). Striker was
  reworded to "scales per hive-mate **in the team**" so the frozen count reads as intended, not as a
  stale-live-count bug.
- **Never put `magnitudeSource` on a trigger that already fires once per counted event (decided,
  PR #64 review).** An `on-ally-death` trigger fires once per death, so it already *is* the count;
  adding `magnitudeSource: dead-allies` counts every earlier death again on each firing, compounding
  as Π(1 + r·k) (5 deaths at r = 10% → ×3.60, not ×1.61). A per-event trigger uses a **flat**
  per-event factor; `magnitudeSource` belongs on fire-once hosts (Striker's `on-fight-start`) or
  on **instantaneous** responses read fresh each firing (a `heal` or `deal-damage` — nothing
  accumulates). Necromoss (H3): Wisp/Hollowroot heal via the live `dead-allies` count on
  `on-turn-start` (correct); Thicket's buff is a flat Defence rise per ally death. The Rot
  Sovereign: one flat Attack rise per death on **either** side (same rate on `on-ally-death` and
  `on-enemy-death`).
- **Zero count ⇒ full no-op (decided, PR #64 review).** A `deal-damage` or `heal` response whose
  `magnitudeSource` resolves to **0** does nothing: no `DamageDealt`/heal, no min-1 chip floor, no
  downstream hooks (`on-damage-taken`, Sleep's wake, …). `TriggerFired` is still emitted (the
  uniform fizzle shape — see the H3 addenda). Affects Sporecloud Reaper, Spider Broodwarden,
  Lullpollen Dozer.
- **Splashing / Annihilate** — two new permanent-for-fight passive `EffectDef` categories,
  `{ category: 'splashing' }` and `{ category: 'annihilate' }` (**Built in Phase 4 Slice C**,
  boolean presence, no magnitude — reasoned from the Perk execution model, ASSUMPTION 21: Slice F
  perks are player-level `EffectDef`s instantiated the same way innate traits are, not runtime
  `applyStatus` instances, despite this doc's "New statuses" list below naming Splashing
  informally). After a single-target **Attack's** main hit — **attacks only, never Cast**
  (decided with the design owner; matches `brute.md`'s Splashing = "attacks deal 100%..." and the
  spec's melee-splash identity) — a Splashing bearer also strikes each adjacent living enemy (all
  OTHER living enemies, with Annihilate) via a full formula recompute against that target's own
  Defence/affinity/pools — never a copy of the main hit's number. No `TriggerFired` (same action,
  not a trigger). Cast never splashes, so no spell-status-on-splash question arises.
- **cheat-death** — intercept a lethal hit → RNG → survive at 1 HP (Last Stand). **Built in
  Phase 4 Slice D**: a permanent-for-fight passive `EffectDef` (`{ chancePercent }`), gathered
  read-time (additive across sources, clamped `[0, 100]`) and checked inside `applyDamageAndEmit`
  at the instant a hit would land the target at 0 HP, BEFORE `CreatureDied`/`on-death` fire — one
  seeded RNG draw, only when the bearer's summed chance is `> 0` (an ordinary creature never
  touches `state.rng` here). On success `currentHp = 1` exactly; `DamageDealtEvent.finalDamage`
  is left UNCHANGED (only `remainingHp` reflects the save) — matches the existing overkill
  precedent, where `finalDamage` already isn't guaranteed to equal actual HP removed.
- **acted-before-target** condition — "this creature acts before its target this round" (Blindclaws).
  **Built in Phase 4 Slice C.** `evaluateCondition` gains an optional 4th parameter,
  `ruleTargeting?: TargetSelector` (the evaluating rule's own selector; absent for a `TriggeredDef`
  condition, which has no rule context — always false there). Resolved via a new
  `peekTargetSelector` (`target-selectors.ts`): identical to `resolveTargetSelector` for every
  selector kind except `random-enemy`, which returns `null` rather than drawing RNG (there is no
  way to "peek" a random pick without consuming randomness, and interpreter lookahead must never
  do that) — so a rule targeted at `random-enemy` never satisfies this condition. True iff the
  acting creature's frozen-turn-queue index is lower than its resolved target's.
  **Phase 4 Slice H2 completion:** the case now falls back to the current damage target
  (`resolvingAgainst`, already threaded into `evaluateCondition` by the `conditional-damage-bonus`
  gather at `resolution.ts`) when `ruleTargeting` is absent — so it is **no longer always-false in a
  passive**, and is a valid `conditional-damage-bonus` condition. This is what makes Blindclaws'
  **Striker** a numeric TRAIT (`conditional-damage-bonus` + `condition: acted-before-target`,
  `actionKind: 'attack'`) rather than a bespoke script. RNG-free (peek discipline unchanged); the
  scripting path is untouched (fallback fires only when there is no rule context).
- **Death-reset** — on death, a creature's accumulated buffs/debuffs/statuses/stat-mods stop
  mattering: they stay on the corpse but are **inert**. A corpse's statuses don't tick, count down,
  expire or roll, and nothing reads them, except the corpse's own `on-death` triggers, which fire
  right after `CreatureDied` (Spore's spread). (4.1-F2 plan review: the code never removed them;
  the Phase 3 round-end sweep counted them down and emitted `StatusExpired` for corpses, which F2
  ends.) A revive **replaces them all**: a revived creature returns at **battle-start baseline** (its `baselineEffects`, see "Fight
  setup"). Death is meaningful; revive is a second chance, not a buff-preserving undo. Applies to
  all deaths. **Revives are bounded** (max 10 per creature per fight, see `revive`).
### Phase 4 Slice F addenda (specializations, perks, starters, the Unicorn)

- **Perks join the canonical per-creature effect order.** ASSUMPTION 21's decision is now built:
  `createCombat` gains `partyWidePlayerEffects?: readonly EffectDef[]` (a plain array in, computed
  by the caller — eventually the Slice G store, from `{chosenSpec, perkSpend}` via
  `data/specializations.ts`'s `resolveSpecializationEffects`), instantiated onto every
  **player-side** creature only, appended after that creature's own innate-trait effects via one
  shared helper, `instantiateCreatureEffects` (`effects.ts`) — used identically by fight-assembly
  and by `revive`'s death-reset, so a revived player creature keeps its perks (they are
  battle-start-permanent, like innate traits, not in-fight-accumulated ramp). The canonical order
  is now **innate-1 → innate-2 → perks → equipment infusions (Phase 8) → applied statuses**.
  *Built with* a `CombatState.playerWideEffects` field so `revive` could re-derive it mid-fight.
  **Superseded by Phase 4.1-B (S1):** `createCombat` takes named per-side inputs and each creature
  stores its resolved `baselineEffects`; `playerWideEffects` and `CombatState.traits` are removed
  (see "Fight setup" under Combat & scripting).
- **`conditional-damage-bonus` gains an `actionKind` axis** (review amendment — the damage-formula
  system, mirroring `CrossStatDef.appliesTo`): `actionKind?: 'attack' | 'cast' | 'both'`, absent =
  `'both'` (byte-identical for every pre-amendment consumer — Cull the Weak/Ambusher/Gloomjaws/
  Sporch's Reaper never set it). `gatherConditionalDamageBonus` (resolution.ts) takes the current
  `actionKind` and filters on it, threaded from `dealDamageCore`'s own already-in-scope
  `actionKind` (the same value `gatherCrossStatContribution` already reads). First scoped
  consumers: Brute's **Brute Force** (`actionKind: 'attack'`) and Sorcerer's **Spell Focus**
  (`actionKind: 'cast'`) — each an unconditional "+1% damage per rank/level" perk authored as
  `conditional-damage-bonus` + `condition: {kind: 'always'}`, now correctly scoped to its own
  action kind instead of leaking onto the other one (the initial submission's own flagged caveat,
  now resolved).
- **`taken-reduction` — a new permanent-passive `EffectDef` category** (review amendment — the
  taken-pool system, the TAKEN mirror of `conditional-damage-bonus`): `{ magnitude,
  magnitudeSource?, accumulation?, reductionCap? }` — no `statusId`/`polarity`, never a status.
  Gathered by `gatherTakenFactors` (effects.ts) alongside `DamageModifierDef`'s own `taken`
  entries, reusing the exact same `takenFactorFor`/`damageModifierCount` helpers (both
  generalized to a shared structural shape, `TakenReductionSource`, so neither's behavior
  changes: `DamageModifierEffect` always carries a `stacks`, `TakenReductionEffect` never does,
  and `e.stacks ?? 1` gives the right fallback for each). **Bulwark is now authored as this
  passive directly** (`effects: [{category:'taken-reduction', magnitude:0.95, magnitudeSource:
  {kind:'count', of:'self-defend-count'}, accumulation:'additive', reductionCap:0.8}]`) —
  superseding the initial submission's `on-fight-start → apply-status` shape, which smuggled a
  STATUS into a perk's own effect list. The real `BULWARK` `data/statuses.ts` entry and the
  `PERK_STATUS_DURATION` config constant it needed are both **removed** (no longer exist).
- **`TriggeredDef.stacks?: boolean` — a new dedup flag** (default absent/`true` = today's behavior).
  `stacks: false` means: across all living creatures, **at most one** instance of that exact effect
  fires per observed action. This is what keeps multiple Overtones from compounding the echo chance —
  branching factor stays 1, so the chain is **linear** and self-terminating (the 500-depth guard is
  only the pathological-seed backstop). Kept general, though Overtone is its only v1 consumer
  (unchanged by 4.1-E).
- **`acted-before-target` completion** — see the condition's own entry above (now valid in a passive
  `conditional-damage-bonus`, powering Striker). Landed in this slice alongside echo-cast; H2 is
  therefore **not** content-only.

