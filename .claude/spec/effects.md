# Spec — Effects

Read this when changing any trait, perk or effect.

The traits and perks `main` ships are described in the content docs and `specializations/`; this
file holds the framework they are built from. What a trigger can do is in `spec/responses.md`, the
status lifecycle in `spec/statuses.md`.

## Design

### One effect framework

- **Traits, statuses and perks are instances of one data-driven, hook-based effect framework**, as
  Phase 8's gem augments and equipment infusions will be (`spec/creatures.md` "Gems as items",
  "Equipment"). They differ only in how they attach to a creature and which hooks they use, never
  in their machinery: never build them as separate subsystems.
- New content is a data entry. Genuinely novel behaviour is at most one new reusable primitive,
  then reused; never special-case one trait or status in the resolver.

### Effects and carriers

- An **effect** is the mechanical unit: a **passive** (always on while attached: "+25% Attack",
  "ignores 30% of Defence", "acts last") or a **trigger** (a hook, an optional condition or chance,
  and a response).
- A **carrier** attaches a list of effects to a creature: a **trait** or a **perk**, permanent for
  the fight, or a **status**, a timed container of the same kinds of effects (`spec/statuses.md` "A
  status is a timed effect").
- So any timed version of a trait's effect is data, not engine work. One deliberate limit: a status
  may not carry a stat-modifier ("No temporary stat-modifier").

### Category decides player-facing treatment

1. **`stat-modifier`** scales a stat (`stat`, `factor`). It folds into effective stats
   **multiplicatively** (`base × Π(factors)`), is **permanent for the fight and uncapped**, and is
   **never shown as a status**: the player sees only the effective stat and net multiplier.
   Reductions approach but never reach zero (five ×0.8 is ×0.328) and buffs compound the same way
   (five ×1.3 is ×3.7), so grinding a stat up or down is a supported, cap-free build path. Stat
   buffs and debuffs are data instances of this one primitive, with no per-stat special-casing;
   spells and effects may apply any factor.
2. **`stat-remap`** redirects which stat a formula slot reads ("use Speed as Attack for the Attack
   action"). It reads the source stat's effective value; Attack-slot stat-modifiers don't transfer
   to it (a Speed-attacker wants +Speed, not +Attack).
3. **`damage-modifier`** folds into the damage formula's pools: the attacker's additive dealt pool
   or the defender's multiplicative taken pool (`spec/combat.md` "Damage formula"). These **are**
   shown as timed statuses: Weaken (−% damage dealt) and Vulnerability (+% damage taken). A
   "−Attack" stat change and a "−damage dealt" Weaken are different categories with different
   treatment and never double-count.
4. **Statuses** are tagged timed conditions (Poison, Regen, Stun, Web, Confusion), shown as icons.
   They are what scripting's `has-status` reads, never the invisible stat-modifiers.

- Permanent passives that fold into the damage formula (armour penetration, cross-stat,
  conditional damage bonuses, damage-taken reductions) are shown on the creature, not as status
  icons.

### No temporary stat-modifier

- Every timed debuff is a status (a damage-modifier, a lock, a DoT), never a stat-modifier; a
  validator rejects a stat-modifier inside a status. Relaxing that would be a deliberate design
  decision, never a refactor side effect.

### Traits

- A trait is a named set of effects. Each creature has one innate trait, fixed in its data
  (`spec/creatures.md` "Trait and gem slots").
- **Passive traits** are always-on or conditionally-on modifiers ("+25% Attack at full HP").
  **Triggered traits** fire on a hook and produce an effect.
- **No keywords, no implicit targets.** There is no "Retaliate": every trait is an explicit
  event → condition → response → target → magnitude sentence in data, e.g. *"when this creature is
  dealt damage by another creature, attack that creature for 30% Attack."* The hook supplies the
  reference creatures (self, the source); the response names its target.
- Design breadth comes from the **hook × condition × parameter cross-product**, not from more
  response types: every triggered behaviour goes through the one response vocabulary
  (`spec/responses.md` "No side doors").
- A trait may react by dealing damage, applying a status, changing a stat, or **granting an extra
  action** (the Sorcerer starter's turn-end cast, Resonant Overtone's echo). A granted action
  always runs after the action that caused it, inside the same turn, and obeys every action rule:
  a Stunned creature can't take one, a Silenced one can't cast. Traits that insert extra *turns*,
  change scripting options or alter the creature's own decision-making are parked past v1
  (`OPEN_QUESTIONS.md` "Behavioral traits").
- **"attack" and "cast" in a trait or spell mean the real actions**: the same damage formula,
  OffStat, affinity, Defence, pools and floor as a creature choosing that action; the trait or
  spell supplies only the coefficient and the target. A trait-granted Attack or Cast is **direct**
  damage. Every other damage a trait, status or perk deals (a retaliation, an on-death burst, a
  DoT tick) is **indirect**, meeting only a fifth of Defence, and a creature's own response
  damaging itself is an exact **cost** (`spec/combat.md` "Damage channels and the Additional").
- **Retaliation never answers a tick**: DoT is the counter to Defence tanks, and most retaliators
  are those tanks (`spec/responses.md` "triggering-source is never the firing creature").

## Engine rules

### Carriers and effects

- An **effect** (`EffectDef`) is a passive, read where it applies, or a trigger (`TriggeredDef {
  hook, condition?, observationFilter?, chancePercent?, stacks?, response }`).
- A **carrier** attaches a list of effects:
  - **`Trait { id, name, effects }`**, permanent for the fight, a named wrapper (identity and
    flavour for the UI) over one or more effects. Definitions live in `src/data/`; a creature
    references its traits by `innateTraitIds`, resolved from the trait registry at fight setup,
    where their effects are instantiated (`spec/combat.md` "Fight setup").
  - **Perks** are carried the same way, as the player side's side effects ("Effect order").
  - **`StatusDef`**, a timed single-instance container (`spec/statuses.md` "StatusDef").
- Trait and Status stay separate carriers because their lifecycles really differ; sharing the
  effect payload gives the reuse without blurring them. An ECS was rejected as a paradigm cost.

### The effect taxonomy

- Passives: `stat-modifier`, `stat-remap`, `armor-penetration`, `cross-stat`, `action-instance`,
  `status-immunity`, `provoke-immunity`, `splashing`, `annihilate`, `conditional-damage-bonus`,
  `taken-reduction`, `cheat-death`, `innate-spell` (`spec/creatures.md` "Innate spells"),
  `damage-modifier`, `turn-order`, `friendly-fire` and `action-lock`. Trigger: `triggered`.
- The last four are what statuses carry in content: `damage-modifier` (Weaken, Vulnerability),
  `turn-order` (Web, Grant Act First), `friendly-fire { chancePercent }` (Confusion) and
  `action-lock` (Stun, Sleep, Silenced, Pacified); DoT and Regen statuses (Poison, Burn, Regen,
  Spore) carry `triggered` effects (`spec/statuses.md` "Action locks", "Turn order").
- Armour penetration, cross-stat, action instances, provoke immunity and friendly-fire are damage
  and targeting rules (`spec/combat.md` "Armor penetration", "Cross-stat contribution", "Action
  instance-list", "targeting-override").
- **Every effect is carrier-agnostic**: a status may carry any effect a trait carries, except what
  a validator rejects ("Validators").

### The effect iterator

- Every reader sees a creature's effects through one iterator (`flatEffects`). A trait or perk
  effect is yielded as is; a status is flattened in place into its own effects, each tagged with
  its status and given its own guard identity (`spec/statuses.md` "Several triggers").
- Two readers read the raw effect list on purpose: `getEffectiveStat` and the stat remap, because a
  status may not carry `stat-modifier` or `stat-remap`. The status lifecycle reads the containers
  themselves: `has-status`, applying and refreshing, `remove-status`, counting down, and the
  immunity lookup.

### Immunity

- `status-immunity { statusId }` is a permanent passive (Clear Mind, Aggressive, Lucidity). It is
  checked **once, in the effect iterator**: an immune bearer's iterator skips every effect of that
  status, of every kind: its locks, its friendly-fire (no Confusion roll and no RNG draw), its
  triggers (a tick included), its damage-modifiers and its turn-order (so the Web roll skips it and
  draws nothing).
- It is never checked at `applyStatus`: the status still applies, refreshes, counts down and counts
  for `has-status` (`spec/statuses.md` "Immunity suppresses the effect, not the application").
- Immunity is read only from carriers that aren't statuses (traits, perks); a status may not carry
  `status-immunity`, so immunity can't depend on itself.

### Validators

- A load-time validator (`validateStatusDef`) rejects, inside a status: `stat-modifier` and
  `stat-remap` ("No temporary stat-modifier"), `status-immunity` ("Immunity"), `innate-spell`
  (innate spells are placed at fight setup, so a status's could never take effect) and a trigger on
  `on-round-end` (round end has no status work). It runs over the stock statuses at import **and**
  over the status registry `createCombat` is given, so a test fixture's status is held to the same
  rules.
- `turn-order.breakChancePercent` is status-only, since breaking free removes the status instance:
  a trait or perk carrying it is rejected at load.
- An `ObservationFilter` field on the wrong hook is rejected for every trigger carrier ("Damage
  observation").

### Effect order

- One per-creature effect order is used everywhere effects are iterated: stat folding, hook firing
  and remap resolution. It is innate traits → side effects (the player side's perks) → effects
  gained in the fight, in the order gained (statuses, stat-modifiers). Phase 8's equipment
  infusions go after the side effects (`spec/creatures.md` "Equipment").
- Multiple remaps on one slot resolve by that order, last writer wins. The damage formula reads its
  OffStat through a remap-aware lookup, so a remap needs no formula change.

### Effective stats

- Base stats are **immutable**, except by permanent effects such as a level-up. A current stat is
  computed on demand: `getEffectiveStat(creature, stat)` folds the active stat-modifiers over the
  base multiplicatively, in effect order. **All combat math reads stats through it.** Never write a
  derived value back to the creature; expiry is dropping the effect from the list, and the next
  read reflects it.
- This base-plus-fold-on-read model, not a mutable per-creature stat blob, is required: conditional
  passives, whose contribution blinks with live state, need recomputation a blob can't give
  cleanly, and it keeps the representation singular and deterministic.
- **A conditional passive's gate is data**: `StatModifierDef.condition?: SelfCondition` (self
  `hp-percent`, self `has-status`, `always`), evaluated on every fold, never cached. `hp-percent`
  uses the same max-HP basis as scripting's `hp-percent` (`floor` of effective Health), so "at full
  HP" is exactly `>= 100`.
- A condition may read other effective stats but not the stat it gates (a `getEffectiveStat`
  read-cycle): a load-time validator rejects that, e.g. a Health modifier gated on HP%.

### Hooks

- The hook vocabulary (17): `on-fight-start`, `on-turn-start`, `on-turn-end`, `on-round-end`,
  `on-damage-dealt`, `on-damage-taken`, `on-damage-observed`, `on-kill` (dealt a killing blow),
  `on-death` (self died), `on-ally-death`, `on-enemy-death`, `on-status-applied`,
  `on-action-observed`, and the actor-self family `on-attack`, `on-cast`, `on-defend` and
  `on-provoke` (no `on-wait`).
- A hook is a firing point plus a context: the firing creature and, where the hook has one, the
  other creature involved (the attacker for `on-damage-taken`, the victim for `on-kill`, the dead
  ally for `on-ally-death`).
- The actor-self hooks fire **once per action instance** (`spec/combat.md` "Action
  instance-list"): an Attack resolving as three instances fires `on-attack` three times. They fire
  on the action, not on its damage.
- Adding a hook is additive and golden-safe (a firing point nothing listens to emits nothing),
  provided it fires where the resolver already reaches; a hook that needs newly tracked state is a
  larger change.

### Hook execution

- **Scoped iteration.** A per-creature phase point (that creature's turn start or end) iterates
  that creature's effects; a global one (fight start, round end) iterates every creature's, in the
  standard tie-break order (side → slot → id). Every lookup goes through `effectsForHook(creature,
  hook)`, a scan and filter. A hook-type index is **deferred until measured**: it would drop in
  behind that boundary, verified byte-identical against the goldens. Don't build it ahead: it is a
  derived cache that can go stale.
- **Hooks reuse action machinery.** A hook that deals damage or applies a status calls the same
  paths and emits the same consequence events (`DamageDealt`, `CreatureDied`, `StatusApplied`) as a
  chosen action: a hook is a new trigger origin, not new consequence vocabulary.
- **`TriggerFired`** precedes a trigger's consequences, as `AttackDeclared` precedes `DamageDealt`,
  so the log explains why they happened. A tick is the exception (`spec/statuses.md` "Ticks are
  on-turn-end triggers").

### Effect instances

- Every effect instance (trait, perk, status, and revive's re-instantiation) gets a **unique id
  from a per-fight counter** in `CombatState`; refreshing a status keeps its instance and id. Ids
  never appear in events.
- **An effect reacts only while it exists**: it reacts to an event only if that exact instance
  existed when the event started and still exists when its turn to react comes. `fireHook` builds
  its candidates once, so it re-checks each candidate's owning instance before firing: a status
  cleansed earlier in the same chain doesn't tick, and a revived creature doesn't fire effects from
  before its death.

### Dead creatures

- **Dead creatures fire only `on-death`**, once, *as* the creature dies, even mid-cascade.
  `fireHook` gates on `alive` per effect; `effectsForHook` is a pure scan and does no alive-gating.
  Lethal damage fires `on-death`, not `on-damage-taken`: death pre-empts the victim's reaction.
- **Nothing is done to a corpse** except a revive (`spec/responses.md` "No response acts on a dead
  target"): no damage, heal, status, stat change or cleanse. A spell whose first effect kills its
  target puts nothing more on it, and a spell effect aimed at a caster killed mid-cast is dropped.
- **The same holds for the actor**: a creature killed inside its own action, say by a retaliation
  after its first hit, does nothing more in that action (no further hit, splash hit or AOE hit);
  what it already did stays (`spec/combat.md` "An action ends when its actor dies").

### Damage-path hook order

- After `DamageDealt`: `on-damage-dealt` (the dealer) fires **always**, a lethal hit included →
  `on-damage-taken` (the target) **only if it survived** → `on-damage-observed` (every living
  creature) **always**; on a lethal hit the victim isn't among the observers, because `alive` flips
  before `DamageDealt` → then, if it died: `CreatureDied` → `on-death` (the victim) → `on-kill` (the
  dealer) → `on-ally-death` / `on-enemy-death` (the observers).
- So hit reactions (dealt always, taken if survived, observed always) resolve **before** death
  reactions. A lethal Wick burn: the Flare's reaction precedes `CreatureDied`, the Last Gleam's
  follows it.

### Consequence events

- **Applying a status emits `StatusApplied`, then fires `on-status-applied`** (event before hook);
  a chain of status applications is bounded by loop safety.
- **Applying a stat-modifier emits `StatModifierApplied`** with source, target, stat, factor **and
  the effective stat before and after**, because a bare factor (×0.8) means nothing without its
  base. It is the golden assertion surface for stat changes and Phase 7's source for combat text
  ("Attack −49"): stat-modifiers aren't shown as status icons, but the log records the change.
  Order: `TriggerFired` → `StatModifierApplied`.
- **`DamageDealt` carries a required `damageSource: 'attack' | 'cast' | 'dot'`**, plus the status's
  identity for a tick, so the UI can attribute it. Required, so the event schema is
  self-describing.

### Action reactions: actor-self hooks or observation

- Which mechanism a trait uses depends on **whose trait it is relative to who acts**, and a trait
  subscribes to exactly one, so nothing double-fires (a Shieldbarer reacts through `on-provoke`,
  never also through `on-action-observed`):
  - a trait on the creature **performing** the action uses its own `on-attack`, `on-cast`,
    `on-defend` or `on-provoke` ("when *I* act, do Y"; Y may still target the whole team). It
    fires once, on the actor;
  - a trait on a creature **watching** someone else act uses `on-action-observed` ("when an ally
    or enemy acts, *I* react"). It fans out to observers.
- **`on-action-observed`** fires **per action instance** on every living creature, so an ally's
  multi-cast is observed once per instance. The candidate filters on itself (`ObservationFilter`):
  `relationship` (`self`, `ally`, `enemy`, `any`; `ally` includes self), `actionKind` (`attack`,
  `cast`, `defend`, `provoke`) and `excludeActor?`. Its context is the actor, the action kind and
  the instance index. It rides the cascade-depth cap and the re-entry guard.
- The Resonants are the only action observers in content, and the Flickerling Flare the only damage
  observer ("Damage observation"); every other action-reactive trait is actor-self. Observation is
  built as the general primitive because it carries future content, not the seed's.

### Damage observation

- Observation also covers **damage events**, through a sibling hook, **`on-damage-observed`**,
  fired from `applyDamageAndEmit` (every damage event passes there) on every living creature, at
  its place in the damage-path hook order. It is a sibling rather than a second event kind on
  `on-action-observed`, so an action observer can't see a damage event, nor a damage observer an
  action, by construction. It extends the one observer; it is not a side channel.
- It uses the same `ObservationFilter`: `relationship` compares the observer with the **damaged
  creature** (`ally` includes the observer itself), plus **`selfInflicted?: boolean`** (absent:
  either). `actionKind` and `excludeActor` belong to `on-action-observed` only, `selfInflicted` to
  `on-damage-observed` only, and a filter on any other hook is invalid: a load-time validator over
  every trigger carrier (traits, perks, statuses) enforces it.
- The hook's `source` is the **damaged creature**, so `triggering-source` and the `'target'`
  condition subject resolve to it; its channel is indirect, as for every hook.
- **Self-inflicted means exactly a cost**: a creature's own trait, status or perk response damaging
  that same creature. **A DoT tick is never self-inflicted**, whoever applied it and whether or not
  the applier lives: ticks neither draw retaliation nor count as self-damage.
- **Self-inflicted is carried, never inferred**: `applyDamageAndEmit` takes a required `origin`
  (`DamageOrigin`: `{ kind: 'hit' } | { kind: 'cost' } | { kind: 'tick'; dealerId }`, `dealerId`
  the living applier or `null`). It is self-inflicted iff `cost`, which only the cost path
  (`applyCostDamage`) passes; the direct path passes `hit`, the tick path `tick`. Never `source ===
  target`: a DoT tick and a direct action landing on its own actor have equal ids and are not
  self-inflicted. A zero cost emits nothing, so there is nothing to observe.
- **Both observation hooks fail closed**: a candidate on `on-action-observed` fired without the
  action details, or on `on-damage-observed` without the damage details, is skipped, never fired
  unfiltered.
- No hook-type index: the fan-out scans every living creature per damage event, as
  `on-action-observed` does per action instance ("Hook execution").

### Trigger conditions

- A trigger's optional `condition` is a `TriggerCondition`: the scripting `Condition` union
  (declarative data) plus kinds scripts may not use. It is evaluated **against live state at fire
  time**, purely (no RNG); a false condition skips the effect **silently**, before the depth-cap
  and `TriggerFired` accounting.
- **Source-relative conditions**: the `'target'` subject resolves to the trigger's source in
  `fireHook`, and to the damage target when a damage passive is gathered.
- **`other-ally-injured`** is trigger-only: a living ally other than the bearer is below its
  effective max Health (`currentHp < effectiveMaxHp`, in integers). The type keeps it out of
  script rules: Phase 6's editor derives from `Condition` and must not list it. Its paired
  `ResponseTarget`, `lowest-hp-injured-other-ally` (the lowest current HP among those allies,
  standard tie-break, no RNG), reads the **same pool function**, so the gate never passes with the
  target empty or fails with it non-empty. First user: the Flickerling Wick.

### acted-before-target

- "This creature acts before its target this round": true iff the acting creature's index in the
  round's frozen turn queue is lower than its resolved target's.
- In a script rule the target is the rule's own selector (`ruleTargeting`), resolved by
  `peekTargetSelector`. That matches `resolveTargetSelector` for every selector except
  `random-enemy`, which returns no target rather than drawing RNG (lookahead must never consume
  randomness), so a rule targeted at `random-enemy` never satisfies the condition.
- Without a rule it falls back to the creature the effect is being resolved against, so it is a
  valid `conditional-damage-bonus` condition: the Blindclaws Striker is that bonus with `actionKind:
  'attack'`, a numeric trait rather than a bespoke script. RNG-free either way.

### chancePercent

- An optional probabilistic gate on a trigger, a sibling of `condition` (both decide whether it
  fires): a plain number, **baked at instantiation** (a perk computes its per-rank chance and
  stores the result; the engine has no rank concept). Rolled **once per firing**, at execution,
  after the condition and before the response, **only when present**: an effect without one never
  touches the RNG.

### stacks: false

- `TriggeredDef.stacks?: boolean`, default `true` (every matching effect fires on its own). With
  `false`, across all living creatures **at most one** instance of that exact effect gets its
  chance per firing of the hook; the claim comes before the roll, so more carriers don't raise the
  aggregate chance. That keeps several Resonant Overtones from compounding the echo chance: the
  branching factor stays 1, so an echo chain is linear and ends on its own, and the depth cap is
  only the backstop for a pathological seed.

### Loop safety

- **An effect can't re-enter its own resolution chain.** The guard is instance-level and
  stack-scoped: an effect instance can't fire while it is already unwinding on the active
  resolution stack. That blocks true self-loops (a retaliation triggering its own retaliation) and
  leaves legitimate cross-creature cascades alone (A hits B, B's trait fires). Each trigger of a
  status is its own instance for the guard, so one trigger can cause another of the same status:
  Spore's tick killing its host still fires Spore's spread.
- **`MAX_TRIGGER_CASCADE_DEPTH = 500`** (`engine/config.ts`) counts chain depth, not breadth: N
  effects firing on one hook is breadth N at the current depth, and each trigger that causes a new
  hook to fire adds 1 for that sub-chain. Breadth is unlimited: "lots and lots of triggers firing
  once each" is a supported build path; only unbroken self-perpetuating chains are cut.
- **On the cap** the over-cap trigger doesn't execute (no crash, no partial fire), resolution
  unwinds normally, and a **`CascadeTruncated { creatureId, effectId, depth }`** event is always
  emitted, assertable in goldens. Truncation is deterministic.
- **Depth is transient**: it lives on the transient `ResolutionContext`, resets per top-level
  action or hook point, and is never stored in `CombatState` or serialized (like effective stats,
  a momentary value doesn't live in authoritative state).
- **Granted actions are bounded by depth, not by the guard** (`spec/responses.md`
  "perform-action").

### Count-scaling

- A **`magnitudeSource`** makes a magnitude read a **live count**: `{ kind: 'flat', value } | {
  kind: 'count', of, statusId? }`, `of` being `living-allies`, `living-allies-of-affinity`,
  `living-allies-of-species`, `enemies-with-status` (with a `statusId`), `dead-allies` or
  `self-defend-count`. A count is relative to the reading creature (an "ally" count includes it)
  and recomputed on every read. A creature with no `speciesId` counts 0 of its species.
- It is an optional field on the `deal-damage`, `heal` and `apply-stat-modifier` responses and the
  `damage-modifier` and `taken-reduction` effects. It stands in for the **repetition count** the
  host already scales its authored rate by (`magnitude × count`, `magnitude ** count`, `flatAmount
  × count`), **never** for the rate itself. Absent, the count is 1.
- **Never put `magnitudeSource` on a trigger that already fires once per counted event.** An
  `on-ally-death` trigger already *is* the count; adding `dead-allies` counts every earlier death
  again on each firing, compounding as Π(1 + r·k) (5 deaths at r = 10% give ×3.60, not ×1.61). A
  per-event trigger uses a flat per-event factor; `magnitudeSource` belongs on fire-once hosts (an
  `on-fight-start` trigger) or on instantaneous responses read fresh each firing (a `heal` or
  `deal-damage`: nothing accumulates).
- A count of 0 makes a `deal-damage` or `heal` a full no-op (`spec/responses.md` "Fizzles").

### Stat-modifier counts freeze at application

- A `stat-modifier`'s `factor` takes no live count: `getEffectiveStat(creature, stat)` stays a
  pure function of the creature, with no `CombatState` at most of its call sites. A count-scaled
  stat change is an **`apply-stat-modifier` response** with a `magnitudeSource`, resolved **once**,
  when it fires, and baked into the new modifier: `finalFactor = 1 + (factor − 1) × count`. A later
  change in the count doesn't change an applied modifier.
- So a count-scaled stat buff is authored as a trigger that fires once (on `on-fight-start`, say),
  never as a live passive, and no live-recomputing stat host exists.

### Taken-reduction accumulation

- A count-scaled taken-pool reduction (a `'taken'` `damage-modifier` or a `taken-reduction`) has two
  modes, `accumulation`:
  - **`'multiplicative'`**, the default: `magnitude ** count`, approaching 0 and never clamped, as
    the taken pool's own rule says. The model for every count-scaled taken source but Bulwark.
  - **`'additive'`** with **`reductionCap`**: the per-unit reduction summed over the count and
    hard-clamped, `factor = 1 − min((1 − magnitude) × count, reductionCap)`. Bulwark is −5% per
    Defend, capped at 80% (`specializations/shieldbarer.md`).
- Either way a source collapses to **one factor**, which enters the multiplicative taken pool
  `Π(takenFactors)` with every other source: **additive within a source, multiplicative across
  sources**. A multiplicative `magnitude ** count` can't implement a cap: it sails past 80% (`0.95
  ** 32 ≈ 0.19`, an 81% reduction).
- Goldens: `golden-defend-count-additive-cap` drives the count high enough to reach the cap.

### taken-reduction

- `taken-reduction { magnitude, magnitudeSource?, accumulation?, reductionCap? }` is a permanent
  passive damage reduction, the taken-pool mirror of `conditional-damage-bonus`: never a status (no
  `statusId` or `polarity`). `gatherTakenFactors` gathers it beside the `'taken'` damage-modifiers,
  through the same helpers.
- A perk's own effect belongs in its effect list as this passive, never smuggled in as a status
  applied by an `on-fight-start` trigger (Bulwark).

### conditional-damage-bonus

- `conditional-damage-bonus` is a permanent dealt-pool passive, "+% damage to targets that are
  Weakened, Webbed, Sleeping or low on HP" (the trap-then-exploit and execute archetypes), applied
  as extra damage on the one hit. Its condition is evaluated against the current damage target
  ("Trigger conditions").
- **`actionKind?: 'attack' | 'cast' | 'both'`** (absent: `'both'`), mirroring
  `CrossStatDef.appliesTo`, scopes it to one action kind: `gatherConditionalDamageBonus` filters on
  the action kind already in scope where damage is dealt. Brute Force (`'attack'`) and Spell Focus
  (`'cast'`) are unconditional "+% damage" perks (`condition: always`) that must not leak onto the
  other action kind.

### Splashing and Annihilate

- `{ category: 'splashing' }` and `{ category: 'annihilate' }` are permanent passives with no
  magnitude (perk effects, instantiated like innate traits, never runtime status instances).
- After a single-target **Attack's** main hit (attacks only, never Cast), a Splashing bearer also
  strikes each adjacent living enemy (`spec/combat.md` "adjacency targeting"), or with Annihilate
  every other living enemy. Each splash hit is a full formula recompute against that target's own
  Defence, affinity and pools, never a copy of the main hit's number. No `TriggerFired`: it is the
  same action, not a trigger.

### cheat-death

- `cheat-death { chancePercent }` (Last Stand) is a permanent passive, summed across sources and
  clamped to [0, 100]. It is checked inside `applyDamageAndEmit` at the instant a hit would bring
  its target to 0 HP, **before** `CreatureDied` and `on-death`: one seeded roll, drawn only when the
  summed chance is above 0 (an ordinary creature never touches the RNG here). On success
  `currentHp` is exactly 1.
- `DamageDealt.finalDamage` is unchanged; only `remainingHp` shows the save. As with overkill,
  `finalDamage` need not equal the HP removed.

### Death-reset

- On death a creature's accumulated buffs, debuffs, statuses and stat-modifiers stop mattering:
  they stay on the corpse, **inert**. A corpse's statuses don't tick, count down, expire or roll,
  and nothing reads them, except the corpse's own `on-death` triggers, which fire right after
  `CreatureDied` (Spore's spread).
- A revive **replaces them all**: the creature returns at its battle-start baseline, its
  `baselineEffects` (innate traits and perks) re-instantiated (`spec/combat.md` "Fight setup").
  Death is meaningful; a revive is a second chance, not a buff-preserving undo. It applies to every
  death, and revives are bounded (`spec/responses.md` "revive").
