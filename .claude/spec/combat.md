# Spec — Combat

Read this when changing how a fight resolves.

How a creature chooses its action is `spec/scripting.md`; what traits, perks and statuses do in a
fight is `spec/effects.md`, `spec/responses.md` and `spec/statuses.md`.

## Design

### Automatic 6v6

- Six creatures per side, all active at once. A full party is the normal case; early on, before
  the player has collected six, the player side fights with fewer, so the engine handles any party
  size from 1 to 6.
- Turn-based under the hood and resolved automatically: each turn a creature's script chooses its
  action (`spec/scripting.md`).
- **Deterministic**: the same party, scripts and seed always give the same fight. That makes bugs
  reproducible, fights replayable and fast-forwardable, and scripts testable.

### Rounds and turns

- **One round = every living creature acts once**, in descending **Speed** order, rebuilt every
  round, so a Speed change reorders the next round. Ties go **player side → slot → creature id**.
- A creature gets **one turn per round**. A trait may grant an extra *action* (`spec/effects.md`
  "Traits"). It takes no turn of its own: it runs at the end of the step that raised it
  (`spec/responses.md` "perform-action").
- Every fight has a hard **round cap** (config): a fight that reaches it (a pathological
  all-Defend or all-Wait standoff) ends at once as a **draw**, so no fight runs unbounded.

### Actions

- The starting set is **Attack, Cast, Defend, Provoke and Wait**; more may be added.
- **Attack**: a physical strike, Attack against the target's Defence ("Damage formula").
- **Cast**: cast an equipped spell, with no cost. A script picks *which* gem slot to cast, or a
  random castable gem. The spell's **target shape** (single or all) and **intended side** are
  properties of the spell, not of the rule (`spec/creatures.md` "Spells").
- **Defend**: until the creature's next turn it takes **35% less damage** (a ×0.65 factor in its
  taken pool) **and** has **+50% Defence** (×1.5 on its effective Defence, inside the subtractive
  core). Both apply together: the Defence bonus scales with a creature's Defence, so it is
  strongest on creatures that are already tanky, while the flat 35% helps squishier ones too.
- **Provoke**: the creature is *provoking* (taunting) **until its next turn** ("Provoke").
  Re-provoking every turn costs the creature its attack, which makes dedicated tanking a real
  choice.
- **Wait**: no action this turn.
- Trait-granted actions are these same actions ("cast a random equipped spell").

### Every action follows the same rules

- Whatever produced an action (the script, the fallback, or a trait granting one), the same rules
  decide whether it is allowed (locks), how its target is chosen, and the Confusion and Provoke
  overrides ("One action pipeline").
- When the script yields no valid action, the creature falls back to an Attack on the lowest-HP
  enemy, else Wait (`spec/scripting.md` "The fallback").

### Provoke

- When a creature takes a **single-target offensive action** (an Attack or a single-target Cast)
  against the enemy side and one or more enemies are **provoking**, it targets a **random**
  provoker, drawn from the seeded combat RNG, whatever its rule's selector says. With no provoker
  it targets by its selector or, when the rule names none, by the default for the action's
  intended side ("Default targeting is side-aware").
- Provoke is an **override applied after** the action is chosen: it narrows the target and never
  changes the action.
- **Exempt**: ally-side actions (a support spell on an ally), and **AOE**, which always hits its
  whole side: narrowing an AOE to the taunter would defeat the point of choosing one.

### Affinity advantage

- A cycle: **Vitality > Violence > Wit > Endurance > Instinct > Vitality**, each beating the next
  (Vitality outlasts Violence, Violence overwhelms Wit, Wit cracks Endurance, Endurance outlasts
  Instinct, Instinct strikes Vitality).
- Once per hit: the attacker's affinity beats the defender's → **×1.25**; the defender's beats the
  attacker's → **×0.75**; otherwise **×1.0**. It is its **own multiplicative term** in the damage
  formula, separate from both modifier pools, so matchups stay relevant however much a build
  stacks.
- The cycle and the multipliers are data and config, never branches.

### Damage formula

Direct damage, an Attack or Cast action ("Damage channels and the Additional"):

```
effOffStat = getOffensiveStat(creature, actionKind, spellPower)   // remap → effective → × spellPower
raw        = ( MAX(effOffStat − Defence, 0) + 0.01 × effOffStat ) × Affinity × (1 + Σ dealtMods) × Π(takenFactors)
damage     = MAX(1, floor(raw))
```

- **effOffStat**: the offensive stat is **Attack** for Attack and **Intelligence** for Cast, read
  through a **remap-aware lookup** (a `stat-remap` such as "use Speed as Attack" needs no formula
  change, `spec/effects.md` "Category decides player-facing treatment"), as an **effective** stat
  (`getEffectiveStat`, never raw base), then × the action's **`spellPower`**. Order: remap →
  effective → × spellPower. `Defence` is effective too. There is no separate magic resist: both
  actions meet the target's one Defence.
- **`spellPower`** is a coefficient the action carries: 1.0 for Attack; 0.30 for a "30%
  Intelligence" spell, on its `deal-damage` or `heal` effect ("The stat a spell's magnitude scales
  off"). It scales the offensive stat **inside the core, before Defence**: a 30% spell is
  `(Int × 0.30) − Def`, not `(Int − Def) × 0.30`, because Defence measures against the spell's
  actual power. It is a third modifier locus, distinct from stat-modifiers (effective stats) and
  damage-modifiers (the pools).
- **Subtractive core**, `MAX(effOffStat − Defence, 0)`: Defence can cancel it completely.
- **Chip floor**, `0.01 × effOffStat`, added **unconditionally**, even when the core is fully
  absorbed, so affinity and the pools still have something to act on against a wall. It scales with
  spellPower: a weak spell has a proportionally small chip.
- **Integers**: HP and damage are integers. `raw` is computed in full precision and **floored once
  at the end**, with a **minimum of 1**: every hit removes at least 1 HP, so there are no
  stalemates and the round cap is only a pathological backstop. Never round per term: that
  compounds error and risks cross-platform float drift, which breaks golden replay.
- **Two modifier pools, deliberately asymmetric** (where build power compounds; base stats grow
  linearly, `spec/creatures.md` "Levels and XP"):
  - the attacker's **dealt pool is additive**, `1 + Σ dealtMods` (empty = 1.0): many "+X% damage"
    sources sum, so stacking many of them stays tractable instead of exploding;
  - the defender's **taken pool is multiplicative**, `Π(takenFactors)` (empty = 1.0): each
    reduction (Defend's ×0.65, a "−20% taken" source's ×0.8) or amplification (a "+50% taken"
    debuff's ×1.5) is its own factor. Reductions approach but **never reach 0**, so each defensive
    layer compounds into a real power path, with **no immunity and no clamp**.
- **Stat changes never touch the pools**: "+50% Attack" raises effective Attack, inside
  effOffStat; "+30% damage dealt" is a dealt-mod and leaves Attack alone. Never count one as the
  other.
- **No variance and no baseline crits**: a "crit" is a trait-granted dealt-mod.

### Damage channels and the Additional

- **Direct damage** is an **Attack or Cast action** from any source (a script, the fallback, a
  trait-granted action), including every effect of the cast spell. It is the formula above **plus
  the Additional**.
- **The Additional**: `min(floor(0.2 × target's max HP), max(0, 10 − (attacker level − 1)))`,
  added after the floor. It is 20% of the target's max HP, capped at 10 at level 1, the cap falling
  by 1 per attacker level and gone from level 11. **Nothing modifies it**: not Defence, affinity,
  either pool or Defend. Both sides get it. It speeds up early fights: at low levels offence often
  sits below Defence, and stats scale together so the gap holds, which made early fights walls of
  1-damage hits. A bigger chip floor is not the lever: 5% changes every hit and still can't reach
  the level-1 walls.
- **Indirect damage** is every other damage: a trait, status or perk response (a retaliation, an
  on-death burst, an on-attack bonus hit) and DoT ticks:
  `MAX(1, floor(magnitude × Affinity × (1 + Σ dealtMods) × Π(takenFactors) − 0.2 × Defence))`.
  No chip floor and no Additional. It meets only **a fifth of Defence**: that is the counter to
  Defence-based creatures, and why reactive traits matter against tanks. A DoT tick's magnitude is
  its applier's snapshot, with no dealt pool (`spec/statuses.md` "The applier snapshot").
- **A cost**: damage a creature's own trait, status or perk response deals to that same creature
  is the exact amount, with no Defence, affinity, pools or Additional. It is still a damage event
  and can kill.
- **Heals** are neither.

### Encounters, rewards & wipes

- A fight is one of a floor's encounters (`spec/run.md` "A descent is atomic").
- **Rewards bank per kill, the instant an enemy dies**: soul%, XP and currency are never held
  pending the fight's outcome, so a wipe after some kills keeps everything earned so far
  (`spec/run.md` "Rewards").
- **The result is `win`, `loss` or `draw`**: the player side wins when it is the side left
  standing. A round-cap timeout is a draw, and so is both sides falling at once. A draw resolves
  like a loss: back to the hub, no floor cleared, banked rewards kept.
- **A wipe costs nothing**: no run reset, and no creature, XP or facility is lost. Depth is
  persistent; the party returns to the entrance hub (`spec/run.md` "The cave").

## Engine rules

### Resolver shape

- `createCombat(input) → CombatState` sets up a fight ("Fight setup"). `resolveTurn(state) →
  { state, events }` is the pure **stepper**: it resolves one dequeued turn and crosses round
  boundaries itself (round end, the next round's queue). `resolveFight(state)` runs it until a
  result is set. Manual mode and playback step with `resolveTurn`.
- Every step emits typed events ("Event log"); the UI renders from events, never from resolver
  internals.
- **The RNG state lives in `CombatState`**, threaded state in, state out, so a step stays a pure
  `state → { state, events }`. Sides are labelled player and enemy.

### Fight setup

- `createCombat({ seed, player: { party, effects }, enemy: { party, effects }, registries })`:
  named inputs, because two same-typed positional lists could be swapped silently.
- A side's `effects` are its **side-wide effects**: the player's perks today, biome or boss effects
  for either side later. They apply to exactly that side's creatures; a creature whose own `side`
  doesn't match the list it was passed in throws.
- `registries` bundles scripts, traits and statuses; any may be omitted (empty). A trait id missing
  from the trait registry **throws**: setup never silently skips a trait. An empty party throws.
- **Fresh creatures only**: an input creature already carrying setup output (non-empty
  `baselineEffects` or `activeEffects`, taken from a previous `CombatState`) throws, because
  re-feeding it would double its innate spell slots (`spec/creatures.md` "Innate spells").
- Each creature stores its resolved starting effect list, **`baselineEffects`**: its innate
  traits' effects, then its side's, in the canonical effect order (`spec/effects.md` "Effect
  order"). `revive` restores exactly that list (`spec/effects.md` "Death-reset"), so nothing is
  re-derived mid-fight.

### Turn queue

- At each round start the acting order is built **once**, as a frozen list of creature ids, from
  current effective Speed, ties player side → slot → id (`buildTurnQueue`; act-first and act-last
  statuses split it into poles, `spec/statuses.md` "Turn order"). It is **never recomputed
  mid-round**: Speed changes wait for the next round's rebuild.
- A creature that dies before its turn keeps its slot as a `TurnStarted`/`TurnEnded` bracket with
  no hooks, no action and no countdown; the Web roll still runs in it (`spec/statuses.md` "Turn
  order").
- A granted extra action takes no queue slot: it runs at the end of the step that raised it,
  inside the current turn, or at round level for a fight-start or round-end grant
  (`spec/responses.md` "perform-action"). An "insert an extra turn" effect would be a separate
  primitive, never a re-sort of the queue.
- **Round cap**: after `ROUND_CAP` (`engine/config.ts`) full rounds the fight ends as a draw,
  checked before a new round starts.

### Phase points

- The fight crosses explicit phase points (fight start, round start, each creature's turn, round
  end), firing the matching hooks (`on-fight-start`, `on-turn-start`, `on-turn-end`,
  `on-round-end`) and emitting the lifecycle events (`FightStarted`, `RoundStarted`,
  `TurnStarted`/`TurnEnded`, `FightEnded`). There is no round-start or fight-end hook and no
  round-end event: a round boundary is implied by the next `RoundStarted` or `FightEnded`.
- Status work is turn cleanup and hook triggers, never a separate round pass (`spec/statuses.md`
  "Ticks are on-turn-end triggers").

### Turn structure

Every creature's turn runs exactly this sequence:

```
TurnStarted
→ turn-start hooks
→ TURN-START CLEANUP   defending / provoking end (on a skipped turn too);
                       ActionStateEnded only when a flag was actually set
→ turn-start grants    the grants the turn-start hooks raised
→ decide + action      or TurnSkipped, under an 'all' action-lock
→ action grants        the grants the action raised, right after it
→ turn-end hooks       incl. DoT and Regen ticks
→ granted actions      the grants the turn-end hooks raised
→ TURN-END CLEANUP     the bearer's own status timers count down and expire; then the Web roll
→ TurnEnded
```

- Everything between `TurnStarted` and `TurnEnded` belongs to that turn; anything outside the
  brackets (fight start, round start, round end) is fight- or round-level. **`TurnEnded` is always
  the turn's last event.**
- **A mid-turn wipe ends the turn there**: the rest (later hook firings, grants, cleanup, the Web
  roll) is skipped, `TurnEnded` is still emitted so the brackets balance, and `FightEnded` follows
  ("Resolution & timing").
- The hooks, the grants and the countdown run for a living actor only. Both cleanups are
  bookkeeping only (`spec/statuses.md` "Turn-end cleanup"). The turn-start cleanup runs on a
  skipped turn too, so a Stunned or Sleeping creature stops defending and provoking on schedule;
  **`ActionStateEnded { creatureId, defending, provoking }`** (which flags just ended) shows it.
- Where a turn is skipped is `spec/statuses.md` "Action locks"; when statuses tick and count down
  is `spec/statuses.md` "Timing".

### Resolution & timing

- **Strictly sequential**: no simultaneity and no dying retaliation. Each creature acts fully,
  damage applies at once and death is checked at once.
- **Win, loss and draw are checked after every top-level step**: the fight-start hook pass and its
  grants, each action, each granted action, and each firing in a hook pass (turn start, turn end,
  round end). Never inside a step's own cascade: a killing blow's `on-death`, `on-kill` and
  observer reactions all resolve first. A wipe at fight start ends the fight before
  `RoundStarted`.
- The fight ends the instant a side has no living creature; it doesn't finish the turn or the
  round.
- **An AOE Cast resolves fully** (every `DamageDealt` and `CreatureDied`) before the check, which
  stays at the action boundary, never inside the per-target loop.
- A creature at 0 HP is **flagged `alive: false`, never removed**, so slots stay stable for
  tie-breaks and event references.

### The damage channel in the engine

- **The caller decides the channel**: the actions (`executeAttack`, `executeSpellEffects`) pass
  `direct`, `fireHook` passes `indirect`. `HookContext.channel` is required, so no caller can leave
  it out. `damageSource` is a display label, never the channel.
- The channel follows the **action, not the target**: a direct action that lands on its own actor
  (a Confusion redirect, a spell effect on its caster) stays direct, with the Additional read from
  the actor's own level and max Health. It is never a cost: a cost is an indirect-channel rule.
- The Additional's 20% (`ADDITIONAL_MAX_HP_PERCENT`) and 10 (`ADDITIONAL_BASE_CAP`) are rule
  constants in `engine/config.ts`; max HP is the target's effective max HP. It applies to **every
  direct `DamageDealt`**: each attack instance, each Splashing hit, each AOE target, each
  `deal-damage` in a spell's list, and granted actions.
- In indirect damage, `Defence` is effective and includes Defend's ×1.5; Defend's ×0.65 is in the
  taken pool as usual. Cross-stat contribution is direct only.
  - A response: `magnitude` is its own (`spec/responses.md` "Magnitude modes"), `Defence` is after
    armour penetration, and the dealt pool includes `conditional-damage-bonus`.
  - A DoT tick: `magnitude` is its snapshot potency, with no dealt pool and no armour penetration:
    the snapshot holds the applier's stat, not its live build (`spec/statuses.md` "The applier
    snapshot").
- A DoT tick is recognised by its `snapshot-potency` magnitude, never by its `'dot'` label.
- Flat-mode response damage (`flatAmount`) on another creature is indirect like any other response:
  the flat amount is the magnitude. There is no Defence bypass and no true-damage channel.
- **`DamageDealt`**: `finalDamage` includes the Additional; `rawDamage` is the formula's pre-clamp
  value (negative is possible for indirect damage); `wasChipOnly` is false for indirect damage and
  for a cost.
- **A cost** is judged on the **resolved** target id. It floors once with **no minimum**, and a
  cost of 0 is a full no-op (no event, no hooks), though the `TriggerFired` emitted first stands.
  Its source is the creature itself: damage observers see it and its `on-damage-taken` fires
  (`spec/effects.md` "Damage observation").

### Armor penetration

- `armor-penetration { percent }`: the attacker ignores that fraction of the **target's** Defence,
  before the subtractive core (direct) or the fifth of Defence (indirect, not a DoT tick). Sources
  sum, clamped to [0, 1].

### Cross-stat contribution

- `cross-stat { fromStat, percentPerRank, appliesTo: 'attack' | 'cast' | 'both' }` adds
  `percentPerRank × the attacker's effective fromStat` to an attack's or a spell's effOffStat, after
  spellPower and before the core, so it feeds the chip floor too. Every damage source has its own
  scaling stat; contributions layer **additively** on top of it, across sources. Direct damage
  only.
- It composes with armour penetration: penetration cuts the target's Defence, cross-stat adds to
  the attacker's offence.

### Action instance-list

- An Attack or Cast resolves as a **list of instances, each with a power %**, assembled **once, up
  front**, before any instance resolves: base `[100]`, then one entry per matching `action-instance`
  passive of the actor, in canonical effect order (`gatherExtraInstances`). "An additional time"
  appends 100, "attack again for 30%" appends 30; both give `[100, 100, 30]`. Composition is
  linear: no entry re-multiplies another.
- `{ category: 'action-instance', actionKind: 'attack' | 'cast' | 'both', powerPercent }`, a
  permanent-for-fight passive.
- Each entry is a **real action instance**: it fires `on-attack` or `on-cast` and everything
  downstream. Nothing is spawned mid-resolution, so no trigger, re-entry or loop guard is involved.
- An instance's `powerPercent / 100` multiplies its spellPower: it scales an attack's effOffStat
  and a spell's `deal-damage` and `heal` magnitudes, never its statuses or stat-modifiers.
- The wording is the signal: "attack again for X%" is an instance (it fires `on-attack`); "deal
  damage equal to X% of Attack" is a plain `deal-damage` response, not an attack, and fires
  nothing.
- **Every instance after the first targets the same creature**, without re-running the selector,
  unless that creature has died ("Every action source obeys the same rules", rule 4).
- `powerPercent` is a flat number by design: no content scales the number or power of instances off
  fight state. When content first does, the category grows an optional `magnitudeSource` beside
  `powerPercent`, never a parallel mechanism.

### The action set

- `Action` is a discriminated union, Attack, Cast, Defend, Provoke and Wait; it grows.
- A Cast names a **gem slot index**, not a spell id, so a script template works across loadouts:
  the spell fired is whatever sits in that slot on that creature. Or it names **`gemSlot:
  'random'`**: uniformly among the castable gems, a draw that consumes one RNG value even when only
  one gem is castable. A gem is castable when its slot holds a spell and, for a single-target spell,
  its intended side has a living creature; an AOE spell is always castable.
- `Creature.equippedSpells: readonly (Spell | null)[]` holds bare spells, not Phase 8's gems
  (`spec/creatures.md` "Gems as items"), in a variable-length array so slot-count changes need no
  retype. Innate spells come first (`spec/creatures.md` "Innate spells").
- **Defend** sets `defending` (×1.5 effective Defence, ×0.65 in the taken pool) and **Provoke** sets
  `provoking`, each until the creature's next turn-start cleanup ("Turn structure").

### AOE Cast

- Each instance freezes its own target set at its cast-start: every living creature of the side it
  hits, in slot order. An ally-side AOE hits the caster's side; an enemy-side AOE hits the enemy
  side, unless its Confusion roll turns it on the caster's own ("Targeting override").
- A frozen target that has died by the time its hit comes is skipped; the set itself doesn't
  change.

### Spells carry responses

- `Spell = { id, name, affinity, unlockedAtBiome, targetShape: 'single' | 'aoe', targetSide:
  'enemy' | 'ally', effects: EffectResponse[] }`. A spell's payload is a list of the **same
  responses** traits use (`spec/responses.md`), so a status-only spell, a cleanse or a drain is just
  data.
- **`cast-target`**, a `ResponseTarget`, is the current landed target. It is rejected outside a
  spell's list at load, and resolving it outside a cast is a resolver-invariant error.
- **Effects run once per landed target**, in list order, through `executeResponse` directly: a
  spell is the chosen action, not a trigger, so its effects emit no `TriggerFired`. An `onCast`
  list (run once per cast) is added when content needs one.
- **What a list may hold** (`validateSpellEffects`, at load): `deal-damage` and `heal` in formula
  mode (`offStat` or `scalingStat`, no `flatAmount`, no `magnitudeSource`), `apply-status`,
  `apply-stat-modifier` and `remove-status`, each targeting **`cast-target` or `self`**. A `self`
  effect also runs once per landed target: Life Siphon heals its caster once per target it hits.
  Other verbs and targets join when content needs them.
- **A spell's damage is cast damage**: every `deal-damage` in a spell resolves to `damageSource:
  'cast'`, so it counts as a cast for cross-stat and is logged as one. A `scalingStat` effect must
  say so explicitly, since that mode defaults to `'attack'`; an `offStat` is `'cast'`. The validator
  checks it, so a mis-authored spell fails at import, not mid-fight.
- **One landed target's list is atomic**, like one hit. A target killed by the list's own damage
  gets nothing more (no verb acts on a corpse), but the rest of the list runs, so its `self` effects
  still land: Life Siphon heals for a killing blow. If a retaliation kills the caster mid-list, the
  rest of that target's list still runs, and a `self` effect in it lands nowhere. The dead-actor
  checks sit between landed targets and between instances ("An action ends when its actor dies").
- The guards around a list skip **the whole list**, `self` effects included: a target that died in
  its own pre-hit hooks ("A target killed by its pre-hit hooks fizzles") or an AOE member already
  dead gets none of it.
- **Magnitudes read the caster's live stats** when each effect runs, as Attack and every response
  do.
- An authored stat-modifier's `factor` is a balance constant, never scaled by an instance's
  `powerPercent`.

### The stat a spell's magnitude scales off

- It is set on the spell's `deal-damage` or `heal` effect, not on the spell: `offStat: 'cast'`
  (remap-aware Intelligence), or a `scalingStat` (Intelligence, Health, Attack, Defence or Speed,
  read directly, no remap; `spec/responses.md` "Magnitude modes").
- A pure-utility spell (a status only, a cleanse) has no `deal-damage` or `heal` effect.

### One action pipeline

- Every action, whatever produced it (a script rule, the fallback, a `perform-action` grant, later
  manual input), goes through `src/engine/actions.ts`.
- **The intent is rule-shaped**: `Intent = { action: RuleAction, targeting?: TargetSelector }`, a
  script `Rule` without its condition (`spec/scripting.md` "Scripts and rules"), with two random
  forms: **`gemSlot: 'random'`** (uniformly among the actor's castable gems, optionally narrowed by
  `gemSide`, `spec/scripting.md` "Stock scripts") and the **`'random'` target** (uniformly among
  the living creatures on the action's intended side).
- **`'random'` is an intent-only target.** It needs the action's intended side, which only an
  intent has. A response's target (`{ kind: 'selector', selector }`) has none, so `'random'` there
  is rejected at load; `resolveTargetSelector` and `targetSelectorHasCandidate` throw on it, and
  only `actions.ts` resolves it.
- **`checkLegality(actor, intent, state)`** is pure and draws nothing: can the actor take this
  action at all (a lock, an empty slot, no castable gem for `gemSlot: 'random'`, no valid target)?
  The interpreter's lookahead uses it.
- **`resolveIntent(actor, intent, state)`** is the **single place action-level random draws
  happen**: the gem first, for a random cast, then the target: the explicit selector, else the
  side-aware default ("Default targeting is side-aware"), then, for an enemy-side single target,
  the targeting override ("Targeting override").
- **`executeAction`** runs the executors.
- **`runAction`** chains them for every source: `checkLegality`, then `resolveIntent`, then
  `executeAction`. A dead actor, an illegal intent or one that resolves to nothing is a silent
  no-op.
- **The effect → action seam is a transient `ResolutionContext { events, cascade, grants,
  runAction }`**, created per top-level action or hook pass by the action layer and threaded
  through the resolver. A `perform-action` response queues on its `grants`, so `resolution.ts`
  never imports `combat.ts`. It is never stored in `CombatState`.
- Resolution is not a generator or stack machine: that pays off only if players make choices
  mid-cascade, which the design doesn't have.

### Default targeting is side-aware

- A rule's `targeting` is optional. Without one, the target defaults by the action's **intended
  side** (`defaultTargetingFor`): `lowest-hp-enemy` for Attack and enemy-side spells,
  `lowest-hp-ally` for ally-side spells. The fallback's Attack gets the same default.
- **The engine never forbids a side**: an explicit selector always wins, cross-side included, and
  is resolved literally; a future "healing hurts this creature" status would make healing an enemy
  a real tactic. So a spell's `targetSide` is the side it is **meant** for: it drives the default
  target and, for an AOE, which whole side is hit.
- **The default comes from the resolved action**: for `gemSlot: 'random'` the gem is drawn first,
  and the default follows the drawn spell's side.
- **No single default, no peek**: before any draw, a `gemSlot: 'random'` rule without targeting
  has no default target, and neither has an AOE or a self-only rule. The interpreter supplies the
  default to `acted-before-target`'s peek, so `conditions.ts` never imports `actions.ts` (a cycle,
  since `resolution.ts` imports `conditions.ts`); with no default the condition is false
  (`spec/effects.md` "acted-before-target").
- The side default is the engine's own fallback; whether a script-level default overrides it is a
  Phase 6 decision (`ROADMAP.md` Phase 6).

### Every action source obeys the same rules

1. **A skipped turn takes no action of any kind**, granted ones included, even if its `'all'` lock
   (Stun, Sleep) is gone by the time a grant runs, cleansed by a turn-end hook or by an earlier
   grant in the turn-start drain. Turn-end effects still fire. A chance-based grant still **rolls**
   its chance first, so the RNG stream doesn't depend on the skip; only then is it refused.
2. **An active lock refuses every action it covers, chosen or granted, whenever the action is
   checked**: Silenced blocks every cast, and an `'all'` lock that lands mid-turn refuses that
   turn's later grants. Immunity applies as usual (`spec/statuses.md` "Immunity suppresses the
   effect, not the application").
   - `runAction` checks legality before resolving, for every source, so a refused action **draws
     nothing**, the gem draw included.
   - The locks checked are **the acting creature's**: for an echo, the caster's. The granting
     bearer's own locks don't gate its passive trigger.
   - **A refused grant emits nothing of its own**: its trigger's `TriggerFired` stays, with no
     `ActionGranted` and no action event, the same shape as a grant that finds no castable gem or
     valid target.
3. A granted action picks its target like any action (the side-aware default, or random where its
   intent says so), then goes through the targeting override.
4. When a single-target action's earlier target has died, its next instance falls back to the
   side-aware default, then Provoke (the Brute starter's second hit). Tunnel Vision and an
   ally-side spell skip the Provoke step; Confusion isn't rolled again.

### A target killed by its pre-hit hooks fizzles

- `on-attack`, `on-cast` and `on-action-observed` fire **before** each instance's hit, and real
  traits deal damage there. After them the target is re-checked: if it has died, **that hit
  fizzles**, with no damage, no spell effects and no Splashing for that instance. Its
  `AttackDeclared` or `SpellCast` stays in the log; there is no fizzle event. The next instance
  re-targets (rule 4 above). An AOE already skips dead members.

### An action ends when its actor dies

- A creature can die inside its own action: a retaliation after one of its hits, or a response
  nested in its own pre-hit hooks. The actor is re-checked at four points:
  1. the start of each instance, before target resolution and `AttackDeclared` / `SpellCast`;
  2. after each instance's pre-hit hooks, before the hit or the spell's effects;
  3. before each Splashing hit;
  4. before each AOE member's hit.
- If it has died, the rest of the action is dropped: no further events from it and no fizzle
  event; events already emitted stay. This is the actor's mirror of "death pre-empts the victim's
  reaction" (`spec/effects.md` "Dead creatures"). A granted action checks its actor is alive when
  it starts.
- The checks sit **between hits, never inside one**: one landed target's spell list runs to
  completion ("Spells carry responses").

### Targeting override

- An enemy-side single target goes through a pipeline in this pinned order
  (`resolveOffensiveTarget`, inside `resolveIntent`, for every action source):
  1. **Confusion**: the actor's passive `friendly-fire { chancePercent }` (the Confusion status) is
     rolled first; on success a second draw picks one of its own living allies, itself included,
     as the target instead, whether or not an enemy provokes.
  2. **Tunnel Vision** (`provoke-immunity`, a permanent passive) skips only the Provoke step,
     never Confusion: a confused Tunnel Vision creature still rolls Confusion.
  3. **Provoke**: with one or more living enemy provokers, one draw picks among them, even a single
     one, and the selector is never resolved (so a random selector draws nothing); otherwise the
     selector or the default resolves.
- A step that isn't active for the actor draws nothing.
- **An AOE** has no single target to narrow: Provoke never applies, and Confusion is one roll per
  instance (`shouldRedirectAoeToAllies`) that turns the whole frozen set onto the caster's own
  living side, never a per-target coin flip.
- **An ally-side action** (a support spell, single or AOE) skips the **whole** pipeline, Confusion
  included, and draws nothing for it: Confusion redirects only a harmful action, and a cast on
  one's own side never is one.

### Adjacency targeting

- `adjacentLivingTargets(target, party)`: the target's neighbours in slot order within the
  **living** list, up to two. Living adjacency, not raw slot adjacency: a dead slot-neighbour would
  make Splashing whiff for no visible reason.
- Splashing is attacks only (`spec/effects.md` "Splashing and Annihilate"). `executeAttack` computes
  an instance's splash targets before its pre-hit hooks, while the main target is still in the
  living list, and strikes them after the main hit.

### Event log

- A **flat chronological array** of typed events. Events reference creatures **by id** plus key
  inline values (`remainingHp`), never snapshots. It is **descriptive narration, not
  event-sourcing**: the returned state is authoritative.
- **Intent events**, always emitted, Wait included, so the log is complete turn by turn:
  `AttackDeclared { attackerId, targetId }`, `SpellCast { casterId, gemSlot, targetShape, targetId
  | targetIds }`, `Defended`, `Provoked`, `Waited`, `TurnSkipped { creatureId, effectId }` (it
  fills the action slot, like `Waited`), `TriggerFired` (it precedes a trigger's consequences) and
  `ActionGranted { sourceId, actorId, effectId }` (it precedes a granted action).
- **Consequence events**, shared by every source and never nested in intents: `DamageDealt {
  sourceId, targetId, rawDamage, finalDamage, affinityMultiplier, wasChipOnly, remainingHp,
  damageSource, statusId? }`, `CreatureDied`, `StatusApplied`, `StatusExpired`,
  `StatModifierApplied`, `HpClamped` (current HP cut because effective max Health dropped below it:
  neither damage nor heal), `HealApplied`, `Revived`, `CascadeTruncated` and `ActionStateEnded` (a
  state ending, like `StatusExpired`). A poison tick and an Attack both emit `DamageDealt`; an AOE
  Cast is one `SpellCast` followed by its hits.
- **Lifecycle events**: `FightStarted`, `RoundStarted { round }`, `TurnStarted { creatureId }`,
  `TurnEnded { creatureId }`, `FightEnded { result }`. `TurnStarted` and `TurnEnded` are real
  events, not just hook checkpoints, so playback has an explicit turn boundary even for a Wait or an
  empty turn.

## Not built

### Manual mode

- Phase 9 builds it. An optional toggle lets the player take control of one fight: the same engine
  and resolver, with actions from UI input instead of the script. It must not fork the combat code
  path.
- The UI builds the same rule-shaped intent and submits it through the action pipeline ("One
  action pipeline"), using `checkLegality` to grey out illegal choices.
