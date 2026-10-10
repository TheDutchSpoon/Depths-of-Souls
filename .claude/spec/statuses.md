# Spec — Statuses

Read this when changing any status.

## Design

### Status effects
- Statuses are **applied effects** (from spells, augments, traits) with a **fixed duration in
  the bearer's own turns**.
- **No stacking (decided at the 4.1-H2 grill, from 4.1-H2b; brief ASSUMPTION 114):** one instance
  per status per creature. Re-applying **refreshes the timer** and keeps the **stronger** value
  (a DoT's or Regen's snapshot potency; a fixed-magnitude status just refreshes; a tie keeps the
  current one). The timer becomes the new application's even when that is shorter. Glow, the only
  status whose stacks were a resource, left with the Glowflies. *(Until 4.1-H2b2 re-applying also
  stacked intensity up to the status's own declared cap.)*
- **v1 content**: a flexible, easily-addable **DoT category** (parameterized: damage value,
  duration, flavor; start with Poison/Burn), **Regen** (heal-over-time), **Stun**, and a set of
  **timed `damage-modifier` statuses** — **Weaken** ("−X% damage dealt", + duration) and
  **Vulnerability** ("+X% damage taken") — all surfaced as status icons with durations. **Raw
  stat buffs/debuffs (raising/lowering Attack/Defence/Intelligence/Speed) are NOT statuses** — they
  are permanent-for-fight `stat-modifier` effects (multiplicative, uncapped, invisible-as-status;
  the player sees the effective stat). So "make them weaker" has two distinct tools: a **permanent
  stat-modifier** (grind their Attack down, uncapped) vs. a **timed Weaken damage-modifier** (tactical
  output cut). Health's "regen" is the Regen HoT; a health DoT is a distinct answer to high-Defence
  enemies. **Health IS a modifiable stat** (a `stat-modifier` may target it, e.g. an innate "+50%
  Health" trait) — the four combat stats plus Health all fold multiplicatively. Two rules keep this
  clean: **(a)** at fight-start, `currentHp` initializes to **effective** max Health (so a +Health
  trait actually grants the HP); **(b)** `currentHp` is **clamped to effective max whenever effective
  max changes** — a Health debuff lowers the cap and current HP with it; a Health buff raises the cap
  but does **not** auto-heal into the new space. HP% (which scripts read) therefore stays bounded
  0–100. When the clamp actually reduces `currentHp` (max dropped below current), a dedicated
  **`HpClamped { creatureId, previousHp, newHp, effectiveMaxHealth }`** event is emitted (after the
  `StatModifierApplied` that caused it) so the currentHp drop — neither damage nor heal — is explicit
  in the log/UI rather than silently inferred. All are **data instances of the built primitives** — no
  per-stat/per-status special-casing.
- **DoT damage comes from its applier (decided at the 4.1-H2 grill, from 4.1-H2b; brief ASSUMPTION
  113).** At application the status records a **snapshot** of its applier: who it is, its affinity,
  and a potency, a percentage of one of its stats. Each tick deals that potency as **indirect
  damage** (§7): the applier's affinity, the bearer's taken pool, and a fifth of the bearer's
  Defence. That still makes DoT a distinct answer to high-Defence enemies. The applier is the damage
  source while it lives (its on-kill and on-damage-dealt traits fire; retaliation never answers a
  tick, §6), else the bearer, which then fires no dealer traits. **Regen** heals its snapshot
  potency, credited the same way. Numbers decided at the 4.1-H2d grill (landed in 4.1-H2d; placeholders
  20 / 25 / 15 before it): **Poison 40% of Attack, Burn 35% of Intelligence, Spore 35% of Speed,
  Regen 10% of the healer's Health**. A status that
  applies itself through its own effect passes its snapshot on (Spore spreading on death keeps the
  original strength); a creature that merely carries a status and applies it is an ordinary
  applier and snapshots itself. *(Until 4.1-H2b2 a DoT was a percentage of the bearer's own max HP
  per stack, bypassing Defence, affinity and pools, and Regen the same.)*
- **Stun** is **just a status**, not a special mechanic — it carries a passive **"can't act"
  lock**, so when the creature's turn comes up it is skipped: `TurnStarted`, a `TurnSkipped` event
  naming the status, `TurnEnded`. Sleep carries the same lock; **Silenced** locks only casting and
  **Pacified** only attacking. A lock stops **every** action, chosen or granted by a trait. A stun
  applied earlier in the round lands because the check happens when the creature's turn comes up.
  No special resolver branch.
- **Status polarity & cleanse/dispel** (Phase 4 Slice E2 systems, spells authored later): every
  status is classified **buff** or **debuff**. This opens a planned spell archetype — **cleanse**
  (remove debuffs from an ally) and **dispel** (remove buffs from an enemy) — via a general
  status-removal effect. (Removing raw `stat-modifier` buffs/debuffs is a *later* extension; the
  first removal spells target statuses.) A few statuses also **self-clear**: **Sleep** ends the
  instant its bearer takes any damage (the waking hit still lands in full, incl. any "vs Sleeping"
  bonus), and **Web** breaks on a **10% roll at every creature's turn** (not just the bearer's; in
  a 6v6 fight a Web breaks within a round about 72% of the time) — fragility as design, not a bug.
- **Three trait design levers surfaced by the Biome 1–3 roster** (Slice E2 systems): **(1)
  conditional-damage-vs-a-condition** — "+% damage to targets that are [Weakened / Webbed / Sleeping
  / low-HP]", applied as extra damage on the one hit (the trap-then-exploit and execute archetypes:
  Ambusher, Reaper, Gloomjaws, Cull the Weak); **(2) chance-to-apply** — a triggered effect that
  fires a % of the time (Sleeper's on-attack Sleep, Concussive Blows' on-attack Weaken), the
  probabilistic counterpart to a deterministic condition; **(3) action observation** — a creature
  reacting to *other* creatures' actions ("power up when an ally casts": Resonants), distinct from a
  creature reacting to its **own** action (which stays on its own `on-attack`/`on-cast`/etc.). These
  are general primitives, deliberately built ahead of the simple seed content that first uses them.
- The system is built to **scale to many future statuses** (e.g. end-of-turn auto-Provoke,
  exotic conditional effects) via new data using existing hooks. New statuses are pure data: a
  status can carry any passive or trigger a trait can (except a stat-modifier) — the v1 set is not a
  ceiling.

**Status lifecycle (locked Phase 3, re-timed in Phase 4.1):**
- **A creature's turn has a fixed shape**: turn start → start-of-turn triggers → *start cleanup*
  (its "until your next turn" states, defending and provoking, end here, even if the turn is about
  to be skipped) → its action (or a skip, if it can't act) → end-of-turn triggers (**DoT and
  heal-over-time ticks happen here**) → any actions granted to it during the turn → *end cleanup*
  (**its status timers count down and expire**; the Web break-free roll) → turn end. Cleanup only
  ends things; anything that deals damage, heals or triggers is a trigger.
- **Duration counts the bearer's own turns**, not rounds. A "3-turn" Weaken covers the bearer's
  next three turns whatever the turn order; **Stun 1 skips exactly one turn**. A status counts a
  turn if it was already there when the creature came to act, so one gained at the very start of
  its turn counts that turn, and one gained during or after its action starts next turn. (Phase 3 counted
  rounds at round end, which made a status's real length depend on whether it landed before or
  after its bearer acted.)
- **A DoT ticks at the end of its bearer's turn, *before* the countdown** — so a 1-turn DoT ticks
  exactly once, then expires ("a 1-turn poison poisons once").
- **A status applied or refreshed during or after its bearer's action starts counting next turn**:
  it doesn't tick, count down or (a Web) get its break roll in that turn, so a fresh application
  never silently loses a turn. One applied at the start of the bearer's turn, before it acts,
  counts that turn: it was there for the action.
- **A single status instance per (status-type, creature)** carrying a **remaining duration** (and,
  for a DoT or Regen, its applier snapshot); re-applying refreshes duration and keeps the stronger
  value. (Not N separate instances; until 4.1-H2b2 the instance also carried a stack count that
  re-applying incremented toward the status's declared cap.)
- **Round end does no status work** — it only fires round-level triggers (e.g. a Treant's
  end-of-round growth) and checks for a winner.
- **A creature that dies fires only its death reactions**; its own pending triggers are skipped. If
  a DoT tick kills its bearer, the status's own on-death effect still fires (Spore's spread).

## Engine rules

- **DoT damage** does **not** use the direct formula: a tick is indirect damage from the applier's
  snapshot (see "DoT and Regen from the applier's snapshot" above). Until 4.1-H2b2 it was its own
  value (a percentage of the bearer's max HP, flat mode) and bypassed Defence.
### Status lifecycle (Phase 3, re-timed in Phase 4.1-F)
- **Single instance, no stacking** (from 4.1-H2b, brief ASSUMPTION 114): one instance per
  (status, creature) with a remaining duration; re-applying **refreshes** the duration (and keeps
  the instance and its id, B4) and keeps the **stronger** value (see "Carriers and effects"). The
  duration becomes the new application's **even when shorter**, and `appliedAt` resets (born this
  turn); a weaker or tied re-application still refreshes, emits `StatusApplied` and fires
  `on-status-applied` (4.1-H2b2). *Until 4.1-H2b2 re-applying also incremented a stack count up to
  the status's declared cap.*
- **Durations count the bearer's own turns** (Phase 4.1-F, D6; Phase 3 counted rounds at round
  end). In the bearer's **turn-end cleanup**, each of its statuses counts down by one and expires
  at 0 (`StatusExpired`). So a status's real length no longer depends on turn order: a 3-turn Weaken
  covers the bearer's next three turns whether it was applied before or after the bearer acted
  that round (under round-end counting, a Weaken applied after the target acted covered only 2 of
  its 3 turns). **Stun 1 skips exactly one turn.**
- **DoT / HoT ticks are status triggers on `on-turn-end`** (4.1-F): Poison, Burn, Regen and Spore
  tick in the bearer's turn-end hooks, **before** that turn's cleanup counts them down, so a
  1-turn DoT ticks exactly once. Same machinery as any trigger: **no separate status-tick pass**.
  **A DoT tick is indirect damage from the applier's snapshot** (until 4.1-H2b2 it carried its
  own value and bypassed Defence). `DamageDealt` carries a **required
  `damageSource: 'attack' | 'cast' | 'dot'`** (+ status identity for `'dot'`); a DoT tick emits a
  `'dot'`-tagged `DamageDealt` (no `TriggerFired`) so the log reads "[creature] took X poison
  damage."
- **Born-this-turn rule** (4.1-F; one window, settled at the 4.1-F2 plan review). **A status starts
  at the first action slot it is present for.** A status applied or refreshed **since the current
  turn's action slot** (by the action, its grants, the turn-end hooks or their grants) is born: it
  neither ticks, counts down nor (a Web) rolls that turn, and starts next turn. One applied
  earlier in the turn (turn-start hooks, turn-start cleanup, turn-start grants) was present for
  this action slot, so it ticks, counts down and rolls this turn: a Stun 1 gained at turn start
  skips this turn (see "Action locks") and expires at its end, **exactly one turn**. Applied during
  someone else's turn, a status ticks and counts down at the bearer's next turn end as normal.
  This replaces Phase 3's start-of-sweep snapshot rules, for the same reason: a fresh
  (re)application never silently loses a tick, a turn or a roll to the step that applied it.
  - **Authoring: pick the hook for when the status should start.** Applied before the bearer acts
    (`on-turn-start`), it counts this turn: right for a status meant to shape this turn's action
    (the Glowfly Charger's Glow, until 4.1-H2b1). Applied from the action on (a spell, a granted
    cast, an `on-[action]` or `on-turn-end` trigger), it starts next turn: right for a status whose
    effect only matters later. Web acts on the next round's turn order, so the Spiders' Weaver
    applies it `on-turn-end` (moved from `on-turn-start` at the 4.1-F2 plan review, so its own
    cleanup doesn't roll a Web it has just placed). Cast Webs (Vine Snare, Disorient), granted ones
    included, start next turn the same way.
  - **Mechanism (ASSUMPTION 18).** A plain-data clock on `CombatState` bumps once per dequeued
    turn, at the action slot, unconditionally (alive, dead or skipped actor). A status instance is
    stamped with the clock when applied or refreshed (the refresh keeps the instance and its id).
    Born is `stamp == clock`. Nothing of it appears in events.
- **Round end has no status work.** The Phase 3 round-end sweep (snapshot → `on-round-end` ticks →
  decrement snapshot statuses → expire) is **deleted** in 4.1-F. Round end keeps round-level trait
  triggers (`on-round-end`, e.g. Treant Sapling) and the win check. A status may not carry an
  `on-round-end` trigger (the status validator, 4.1-F2 plan review).
- **Cleanup is bookkeeping only** (see "Turn structure"): counting down, expiring, ending action
  states and the Web roll. Anything that deals damage, heals or fires triggers is a hook.
- **A creature that dies fires only `on-death`**; its own not-yet-reached hooks are skipped. A DoT
  tick that kills its bearer is still followed by the status's own `on-death` trigger (each status
  trigger is its own guard instance, below). Win/loss is checked after every top-level step,
  including each turn-end hook firing (see "Resolution & timing").
- **Applying a stat-modifier emits `StatModifierApplied`** (source, target, stat, factor, **and the
  concrete effective-stat delta** — a bare factor is meaningless without its base). This is the golden
  assertion surface + Phase 7 floating-combat-text source; stat-modifiers are not surfaced *as status
  icons* but the log records the change. Order: `TriggerFired` → `StatModifierApplied`.
- **Health is a modifiable stat**: `currentHp` inits to **effective** max Health at fight-start;
  clamps to effective max whenever it changes (Health debuff lowers cap+current; Health buff raises
  cap, no auto-heal). HP% stays 0–100.
- **Turn-skipping statuses are passive locks** (4.1-F): Stun and Sleep carry `action-lock { scope:
  'all' }`; the skipped turn emits `TurnSkipped { creatureId, effectId }` inside its
  `TurnStarted`/`TurnEnded` bracket. Built in Phase 3 as an `on-turn-start` trigger with a
  `suppress-action` response (a `TriggerFired` inside the empty bracket); that verb is removed.
- **A status can carry several triggers** (Slice E2). Most carry one (Poison/Burn/Regen/Spore);
  **Sleep** carries its `'all'` lock plus `on-damage-taken → remove-status(self)` to wake. Status
  triggers are flattened into the same resolved-trigger shape a trait's triggers produce, so
  `fireHook` treats both identically. **Per-trigger identity (decided, PR #64 review):** each
  flattened status trigger carries its own guard identity (derived from its status instance id and
  its index), exactly as a trait's effects each carry a per-effect ordinal id, so the self-re-entry
  guard is scoped to *one trigger*, never to the whole status. (Otherwise Spore's tick killing its
  host would block the same status's `on-death` spread.)
- **Golden impact of 4.1-F (deliberate, listed in the PR):** every status golden changes timing;
  the Phase-3 DoT goldens (tick/countdown/expiry, and the mid-sweep Poison pair, renamed
  `golden-turn-end-dot-kill-burst(-refresh)`) are rewritten as **hand-derived turn-end
  equivalents**, and a new **turn-end interaction golden** covers the tick case (a DoT tick kills
  its bearer, whose `on-death` applies a status: assert `on-death` fires, the new status follows the
  born-this-turn rule, and the win check). `golden-round-end-interaction` keeps its name and its
  log: it pins the round-end **trait** pass, which 4.1-F keeps, and never involved a status tick
  (PR #80 review). The stun and sleep goldens gain `TurnSkipped`.
- **v1 status content**: DoT (Poison, Burn, Spore), Regen (HoT), Stun, Sleep, Confusion, Web /
  Grant Act First, Glow (until 4.1-H2b1), Silenced, Pacified, and timed **damage-modifier statuses**
  — Weaken (−% dealt) and Vulnerability (+% taken). **Raw stat buffs/debuffs are NOT statuses** —
  they're
  permanent-for-fight multiplicative `stat-modifier` effects (invisible-as-status; the player sees
  the effective stat), enforced by the no-temporary-stat-modifier validator. All are data
  instances of the built primitives; more addable later as pure data.
- **`has-status` matches a literal status id**; spells reach statuses through their `apply-status`
  responses (A4).

## To fold

- **DoT and Regen from the applier's snapshot** (Phase 4.1-H2b, brief ASSUMPTION 113; supersedes
  the bearer-relative percent-of-max-HP reading below for status ticks). At application a status
  instance records a **snapshot**: the applier's id, its affinity and the potency
  `floor(floor(applier's effective ofStat) × percent / 100)` (integer percent, one floor, the
  float rule below). A tick is that potency, no stack count:
  - a **damage tick is indirect damage** (see "Damage channels"): `potency × affinity(snapshot vs
    bearer) × Π(bearer's taken factors) − 0.2 × bearer's effective Defence`, `MAX(1, floor(...))`.
    The **damage source is the applier** while it is alive at tick time, else the bearer. Only a
    living applier is the tick's **dealer**: its `on-damage-dealt`/`on-kill` fire. On the fallback
    the bearer is the logged source and no dealer-side hook fires; a self-applied tick's living
    bearer is its own dealer. The bearer's `on-damage-taken`/`on-death` get **no source** on a
    tick, so a tick offers **no `triggering-source`** to the bearer's responses and retaliation
    never fires back at it (see "`triggering-source` never resolves to the firing creature
    itself"); the hooks themselves still fire. Carried as `applyDamageAndEmit`'s `origin: 'tick'`
    (brief ASSUMPTION 146);
  - a **Regen tick heals** the potency (no Defence, no minimum), its `HealApplied` source by the
    same rule.
  - A status that **applies itself through its own effect** passes its snapshot on, whole (applier
    id, affinity, potency): Spore spreading on death keeps the original strength. It is the rule,
    not an opt-in field: an `apply-status` fired by a status's own effect for that same status
    copies the firing instance's snapshot. Any other application snapshots its applier fresh, even
    an applier that carries the status (brief ASSUMPTIONS 143, 145).
  - **Data shape** (brief ASSUMPTION 144): the status declares `potency: { ofStat, percent }`; its
    one tick response (`deal-damage` or `heal`, on `self`) takes the magnitude `{ kind:
    'snapshot-potency' }`. That marker is what makes it a tick; any other damage a status deals
    its bearer is a cost, and any other heal an ordinary heal from the bearer. An instance holds `snapshot` iff its status declares a potency.
  - Numbers (4.1-H2d grill, brief ASSUMPTION 152; they land in 4.1-H2d, the placeholders 20 / 25 /
    15 until then): Poison 40% of Attack, Burn 35% of Intelligence, Spore 35% of Speed, Regen 10% of
    the healer's Health.
  - Why: the percent-hp brief rejected stat-scaling only because a DoT's `context.self` is the
    victim; the snapshot reads the applier, and a DoT now belongs to its applier's build.
- **status-effect immunity** — `{ category: 'status-immunity', statusId }`, a permanent-for-fight
  passive `EffectDef` (Clear Mind/Aggressive/Lucidity), structurally identical to
  armor-penetration/cross-stat. **Built in Phase 4 Slice C.** Consulted at each immune-able
  mechanism's OWN read site, never at `applyStatus`: the interpreter's `isActionSuppressed` skips
  a `condition-status` suppression whose `statusId` the creature is immune to (Clear Mind/
  Aggressive), and targeting's Confusion roll (`activeFriendlyFireStatus`) treats an immune bearer
  as having no active Confusion at all — the roll (and its RNG draw) never happens, not merely its
  outcome. The status itself is untouched: still applies, stacks, and satisfies `has-status`.
  **Phase 4.1-F (A3) moves the check to one place:** statuses become containers of ordinary
  effects, and the **effect iterator skips every effect of a status the bearer is immune to**. The
  per-mechanism checks (`isActionSuppressed`, `activeFriendlyFireStatus`) are deleted. Same
  observable rule, including "no roll, no RNG draw" for an immune Confused creature.
- **Action locks: `action-lock { scope: 'all' | 'attack' | 'cast' }`** (Phase 4.1-F, A3) — a
  **passive** effect. In content a status carries it: **Stun** and **Sleep** lock `'all'`,
  **Silenced** locks `'cast'`, **Pacified** locks `'attack'`. Like every effect it is
  carrier-agnostic, so a trait may carry one too (test fixtures do; 4.1-F1 plan review). The action
  layer's `checkLegality` reads locks directly, so a locked action is illegal for **every** action
  source (script rule, implicit fallback, or a `perform-action` grant). A scoped lock makes only its
  own kind illegal and leaves the other actions choosable. An **`'all'` lock makes every action
  kind illegal**: Attack, Cast, Defend, Provoke and Wait.
  - **The skip.** A turn is skipped when an `'all'` lock is active **right after the turn-start
    hook pass**, or **at the action slot** (4.1-F1 plan review). The first read is what B2 rule 1
    needs: the turn-start grants run after it and must already know the turn is skipped. The
    second keeps a lock gained during the turn-start grants from reaching the decide step. A lock
    gained during the actor's own turn-start hooks therefore skips that same turn.
  - **Neither read is redundant with `checkLegality`** (PR #79 review). The turn-start drain can
    hold grants of other creatures, raised in the cascade of the actor's turn-start hooks, ahead of
    the actor's own. Such a grant can remove the lock (cleanse a Stun, wake a Sleeper) before the
    actor's grant runs. The first read still skips the turn, and B2 rule 1 still refuses the
    actor's grant.
  - The skipped turn emits **`TurnSkipped { creatureId, effectId }`** in the action slot (after the
    turn-start cleanup and the turn-start grants, only if the actor is alive), and takes no action
    of any kind; passive turn-end effects still fire. `effectId` names the first `'all'` lock in
    canonical effect order at the action slot or, if none is left there, the one the first read
    found (PR #79 review). It names the lock by its carrier's definition id (the status id for a
    status), the same id `TriggerFired.effectId` carries. *History:*
  Slice B built this as a `scope` parameter on the `suppress-action` response with a two-path split
  (an `'all'` suppression fired from `on-turn-start` and set a whole-turn flag; a scoped one was
  scanned for by the interpreter), which emitted a no-op `TriggerFired` every turn start. 4.1-F
  replaces both paths with the passive lock and removes the `suppress-action` verb.
- **turn-order status** (`{ category: 'turn-order-status', statusId, cap, position: 'first' |
  'last' }`) — a third new passively-read `StatusDef` category alongside friendly-fire-status
  (never hook-fired; read directly by `buildTurnQueue`, which partitions living combatants into an
  act-first pole / normal group / act-last pole, each internally Speed-sorted, concatenated
  first→normal→last). **Built in Phase 4 Slice C.** A bearer carrying both poles at once resolves
  to **act-first** (first wins). **Phase 4.1-F (A3)** re-expresses it as a passive **`turn-order {
  position: 'first' | 'last', breakChancePercent? }`** effect inside the status; `buildTurnQueue`
  reads it the same way.
  **Web's break-free roll** (decided in Slice E2, confirmed at the Phase 4 close review, D5): a
  **global** roll, **10% per Web bearer at every creature's turn** (not only the bearer's own), so
  with 6v6 a Web breaks within a round about 72% of the time; tuning happens at that 6v6 rate and
  the lever is the 10%. Because it is per-global-turn and not the bearer's own hook, it is a field,
  not a triggered response: `breakChancePercent: 10` on Web's `turn-order` effect (4.1-F; built in
  E2 as `StatusDef.breakChancePercent`). **The roll happens in turn-end cleanup** (Phase 4.1-F, D6;
  built at turn start), right after that turn's countdown, so a Web that just expired draws
  nothing. It skips Webs born this turn (the born-this-turn rule, the same window as every
  status): a Web cast in an action, granted after the action, or applied by the Spiders' Weaver at
  the end of its turn is first rolled at the next creature's cleanup (4.1-F2 plan review). A Web
  placed by a turn-start hook was present for that turn's action slot, so that turn's own cleanup
  rolls it (no shipped content does this; PR #80 review). It runs
  on every dequeued turn's cleanup (a
  dead actor's empty bracket and a turn whose actor died mid-turn included, so the rate stays "at
  every creature's turn"), never after a mid-turn wipe, over living bearers in side → slot → id
  order, and follows the `chancePercent` discipline (roll only when present; a non-Webbed board
  never touches the RNG). The 3-turn cap is the status's duration. (Sleep's break-on-damage is separate:
  `on-damage-taken → remove-status(self, sleep)`, firing post-damage so the waking hit still lands
  its vs-Sleeping bonus.)

### New statuses (data — several ride the mechanisms above)
Web (act-last + a global 10% break-free roll per bearer at every creature's turn, see turn-order
status above; **built E2**), Sleep (breaks on damage; 3-turn), Glow (stacking resource; +%dmg/stack;
consumable; deleted in 4.1-H2b1), turn-order (act first *or* last — two-way, **built C**), Spore (DoT
+ spread-on-death to the host's own side, **built H3**), Confusion (3-turn; 50% harmful-action
friendly-fire, **built C**), Silenced
(`action-lock` cast; applied by the Violence spell **Silence**) and Pacified (`action-lock` attack;
applied by the Wit spell **Pacify**) — both **pure status spells** (no damage,
`defaultDuration: 3`, unlocked at biome 1), authored in **Phase 4.1-F**, after A4 (4.1-D) and
A3's action lock (they were missed in Phase 4, which left Clear Mind and Aggressive buyable but
inert), Splashing (adjacency
splash **on attacks only**, **built C** as a permanent passive, not a runtime status instance — see above), Proficient
(**P8**; +equipment benefit). Bulwark (−5% damage taken per Defend this battle, additive-with-cap
at 80%) is **NOT** a status — see the Slice F addenda below (`taken-reduction`): it's a permanent
passive perk effect, the taken-pool mirror of `conditional-damage-bonus`, sharing the exact
accumulation mechanism Slice D's `golden-defend-count-additive-cap` proved.

### Principles (locked)
- **Every status has an intrinsic effect** — no inert markers.
- **Immunity suppresses the *effect*, not the *application*** — an immune creature still receives the
  status (it still counts for "target is X" payoffs); it just ignores what the status does.
  (Clear Mind/Silenced, Aggressive/Pacified, Lucidity/Confusion.)

- **`StatusDef.defaultDuration: number`** (review amendment — the status system): every `StatusDef`
  variant now declares a default duration; `StatusSpec.duration` becomes **optional** —
  `applyStatus` (resolution.ts) resolves `spec.duration ?? def.defaultDuration` once, up front,
  and uses that resolved value everywhere (the new instance's `remainingDuration`, a
  re-application's refreshed `remainingDuration`, and the `StatusApplied` event's own `duration`
  field). Every pre-amendment `StatusSpec`/`appliesStatus` in real content and goldens already
  sets `duration` explicitly, so this is byte-identical everywhere it was already used; Concussive
  Blows (Brute) is the first real content to omit it, inheriting Weaken's `defaultDuration: 3`.
### Phase 4 Slice H3 addenda (Rotcap Hollow)

- **Spore spreads host-relative (decided, PR #64 review).** When a Spore bearer dies, Spore
  spreads to **one random living, non-Spored creature on the dying host's own side** (fizzles if
  none). This is the rule regardless of who applied Spore (a Sporecloud, a spell, a Confused
  ally's friendly fire, the Rot Sovereign) and whether the applier is still alive —
  species-locked.md's "enemy" was written from the Sporecloud's point of view. The spread is a
  **trigger on the Spore status itself** (`on-death`), not a trait: a trait's `on-death` fires when
  its *owner* dies, never the host.
