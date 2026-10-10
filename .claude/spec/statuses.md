# Spec — Statuses

Read this when changing any status.

The statuses `main` ships, with their numbers, are described in the content docs:
`content/overgrowth.md` (Web, Silenced, Pacified, Sleep, Stun, Weaken), `content/glimmerdark.md`
(Grant Act First, Vulnerability, Regen) and `content/rotcap-hollow.md` (Spore, Poison and Burn,
Confusion). They are defined in `src/data/statuses.ts`.

## Design

### A status is a timed effect

- A status is applied in a fight, by a spell, a trait or a perk, and lasts a fixed number of its
  **bearer's own turns**. Every status shows as an icon with its remaining duration.
- A status is a container of the same effects a trait carries (`spec/effects.md` "Effects and
  carriers"): Poison carries a damage trigger, Weaken a damage-dealt reduction, Web "act last",
  Stun "can't act".
- **New statuses are data**: a status can carry any passive or trigger a trait can, except a
  stat-modifier (`spec/effects.md` "No temporary stat-modifier"), so the shipped set is not a
  ceiling.
- **Every status has an intrinsic effect**: no inert markers.
- **Raw stat changes are not statuses.** Raising or lowering Attack, Defence, Intelligence, Speed
  or Health is a permanent-for-fight stat-modifier (`spec/effects.md` "Category decides
  player-facing treatment"). So "make them weaker" has two tools: a stat-modifier (grind their
  Attack down, uncapped) or a timed Weaken (a tactical cut to damage dealt).

### No stacking

- One instance per status per creature. Re-applying **refreshes the timer**, to the new
  application's duration even when that is shorter, and keeps the **stronger** value: a DoT's or
  Regen's snapshot potency; a fixed-magnitude status just refreshes; a tie keeps the current one.

### Stun is just a status

- Stun carries a passive "can't act" lock, so when its bearer's turn comes up the turn is skipped.
  Sleep carries the same lock; **Silenced** locks only casting and **Pacified** only attacking. A
  lock stops every action, chosen or granted by a trait. A Stun applied earlier in the round lands,
  because the lock is read when the turn comes up. No special resolver branch ("Action locks").

### DoT and Regen belong to their applier

- At application a DoT or Regen records a **snapshot** of its applier: who it is, its affinity, and
  a potency, a percentage of one of its stats (each status's stat and percentage are in the content
  docs).
- Each DoT tick deals that potency as **indirect damage** (`spec/combat.md` "Damage channels and
  the Additional"): the applier's affinity, the bearer's taken pool, and a fifth of the bearer's
  Defence. So a DoT is still the answer to high-Defence enemies, and it belongs to its applier's
  build.
- The applier is the damage source while it lives (its on-kill and on-damage-dealt traits fire),
  else the bearer, which then fires no dealer traits. Retaliation never answers a tick
  (`spec/responses.md` "triggering-source is never the firing creature").
- **Regen** heals its snapshot potency, credited the same way.
- A status that applies itself through its own effect passes its snapshot on: Spore spreading on
  death keeps the original strength. A creature that merely carries a status and applies it is an
  ordinary applier and snapshots itself.

### Polarity, cleanse and dispel

- Every status is a **buff** or a **debuff**. That is what a cleanse (remove an ally's debuffs) or
  a dispel (remove an enemy's buffs) will read, through the general status-removal response
  (`spec/responses.md` "remove-status"). Removal targets statuses; removing stat-modifiers is a
  later extension.

### Self-clearing statuses

- **Sleep** ends the instant its bearer takes any damage. The waking hit still lands in full, its
  bonus against Sleeping targets included.
- **Web** breaks on a **10% roll at every creature's turn**, not only its bearer's: in a 6v6 fight
  a Web breaks within a round about 72% of the time. That fragility is design, not a bug: tuning
  happens at the 6v6 rate, and the lever is the 10%.

### Health is a modifiable stat

- A stat-modifier may target Health (an innate "+50% Health" trait); the four combat stats and
  Health all fold the same way. At fight start `currentHp` is the **effective** max Health, so a
  +Health trait grants the HP. Whenever effective max Health changes, `currentHp` is clamped to it:
  a Health debuff lowers the cap and current HP with it; a Health buff raises the cap and does not
  heal into it. HP%, which scripts read, stays within 0–100.

### Immunity suppresses the effect, not the application

- An immune creature still receives the status, so it still counts for "target is X" payoffs and
  for `has-status`; it ignores what the status does. Each specialization's control immunity works
  this way (`spec/progression.md` "Specializations"; mechanism in `spec/effects.md` "Immunity").

### Timing

- **Duration counts the bearer's own turns**, not rounds: a 3-turn Weaken covers the bearer's next
  three turns whatever the turn order, and **Stun 1 skips exactly one turn**.
- A status counts a turn if it was there when its bearer came to act. One gained at the very start
  of the turn, before the action, counts that turn. One applied or refreshed during or after the
  action starts next turn: it doesn't tick, count down or (a Web) roll that turn, so a fresh
  application never silently loses a turn.
- **A DoT ticks at the end of its bearer's turn, before the countdown**: a 1-turn poison poisons
  once.
- **Round end does no status work**: it only fires round-level triggers (a Treant's end-of-round
  growth) and checks for a winner.
- **A creature that dies fires only its death reactions**; its own pending triggers are skipped. If
  a DoT tick kills its bearer, the status's own on-death effect still fires (Spore's spread).

## Engine rules

### StatusDef

- `StatusDef { statusId, polarity: 'buff' | 'debuff', defaultDuration, effects: EffectDef[],
  potency? }` is a **timed, single-instance container** of the effects a trait carries. The status
  owns the lifecycle (apply, refresh, count down, expire, `has-status`); its effects own the
  behaviour, read through the one effect iterator (`spec/effects.md` "The effect iterator"). A
  status's effects take a count of 1.
- `polarity` is declared on every status because it can't be derived from the effects.
- `potency: { ofStat, percent }` is declared by a ticking status ("The applier snapshot").
- What a status may carry is checked at load (`spec/effects.md` "Validators").

### Applying and refreshing

- `applyStatus` resolves the duration once, `spec.duration ?? def.defaultDuration`
  (`StatusSpec.duration` is optional), and uses it for a new instance, a refresh and the
  `StatusApplied` event alike.
- A re-application keeps the instance and its id, sets the remaining duration to the new one even
  when shorter, resets `appliedAt` (born this turn), and keeps the **stronger** snapshot. A weaker
  or tied re-application still refreshes, emits `StatusApplied` and fires `on-status-applied`.

### Turn-end cleanup

- The turn's shape is `spec/combat.md` "Turn structure". In its bearer's turn-end cleanup, each
  status counts down by one and expires at 0 (`StatusExpired`); then comes the Web roll ("Turn
  order").
- **Cleanup is bookkeeping only**: counting down, expiring, ending action states and the Web roll.
  Anything that deals damage, heals or fires triggers is a hook.

### Ticks are on-turn-end triggers

- Poison, Burn, Regen and Spore tick in their bearer's `on-turn-end` hooks, **before** that turn's
  countdown, so a 1-turn DoT ticks exactly once. Same machinery as any trigger: there is **no
  status-tick pass**.
- A damage tick emits only a `DamageDealt` tagged `damageSource: 'dot'` with the status's identity,
  and no `TriggerFired`, so the log reads "[creature] took X poison damage".

### Born this turn

- **A status starts at the first action slot it is present for.** One applied or refreshed since
  the current turn's action slot (by the action, its grants, the turn-end hooks or their grants) is
  born: it neither ticks, counts down nor (a Web) rolls that turn, and starts next turn. One applied
  earlier in the turn (turn-start hooks, turn-start cleanup, turn-start grants) was present for the
  action slot, so it ticks, counts down and rolls this turn: a Stun 1 gained at turn start skips
  this turn ("Action locks") and expires at its end, exactly one turn. Applied during another
  creature's turn, a status ticks and counts down at its bearer's next turn end as normal.
- **Authoring: pick the hook for when the status should start.** Applied before the bearer acts
  (`on-turn-start`), it counts this turn: right for a status meant to shape this turn's action.
  Applied from the action on (a spell, a granted cast, an `on-[action]` or `on-turn-end` trigger),
  it starts next turn: right for a status whose effect only matters later. Web acts on the next
  round's turn order, so the Spider Weaver applies it `on-turn-end`, and its own cleanup doesn't
  roll a Web it has just placed. Cast Webs (Vine Snare, Disorient), granted ones included, start
  next turn the same way.
- **Mechanism.** `CombatState.turnClock` is plain data that bumps once per dequeued turn, at the
  action slot, unconditionally (alive, dead or skipped actor). An instance's `appliedAt` is the
  clock when it was applied or refreshed (a refresh keeps the instance and its id); born is
  `appliedAt === turnClock`. Nothing of it appears in events.

### Round end

- Round end keeps the round-level trait triggers (`on-round-end`, e.g. the Treant Sapling) and the
  win check, and does no status work. A status may not carry an `on-round-end` trigger.

### Dying bearers

- A creature that dies fires only `on-death`; its own not-yet-reached hooks are skipped. A DoT tick
  that kills its bearer is still followed by the status's own `on-death` trigger, because each
  status trigger is its own guard instance ("Several triggers"). Win and loss are checked after
  every top-level step, each turn-end hook firing included (`spec/combat.md` "Resolution &
  timing").
- A corpse's statuses are inert (`spec/effects.md` "Death-reset").

### Several triggers

- A status can carry several triggers. Most carry one (Poison, Burn, Regen); Sleep carries its
  `'all'` lock plus `on-damage-taken → remove-status(self, sleep)` to wake, and Spore its tick plus
  an `on-death` spread. Status triggers are flattened into the same shape a trait's triggers
  produce, so `fireHook` treats both alike.
- Each flattened status trigger carries its own guard identity (its status instance id and its
  index), as a trait's effects each carry their own instance id, so the self-re-entry guard is
  scoped to one trigger, never the whole status. Otherwise Spore's tick killing its host would
  block the same status's `on-death` spread.
- A status's `on-death` trigger fires when its **bearer** dies; a trait's `on-death` fires when its
  owner dies. That is why Spore's spread is a trigger on the status itself.

### The applier snapshot

- At application, an instance of a status that declares `potency` records `snapshot: { applierId,
  affinity, potency }`, the potency being `floor(floor(applier's effective ofStat) × percent /
  100)` (an integer percent, one floor; `spec/responses.md` "Flat mode"). An instance holds a
  snapshot iff its status declares a potency. A tick is that potency: there is no stack count.
- **The tick.** The status's one tick response (`deal-damage` or `heal`, on `self`) takes the
  magnitude `{ kind: 'snapshot-potency' }`; that marker is what makes it a tick. Any other damage a
  status deals its bearer is a cost, and any other heal an ordinary heal from the bearer.
- **A damage tick is indirect damage**: `potency × affinity(snapshot vs bearer) × Π(bearer's taken
  factors) − 0.2 × bearer's effective Defence`, then `MAX(1, floor(...))` (`spec/combat.md`
  "Damage channels and the Additional").
- **The source** is the applier while it is alive at tick time, else the bearer. Only a living
  applier is the tick's **dealer**: its `on-damage-dealt` and `on-kill` fire. On the fallback the
  bearer is the logged source and no dealer-side hook fires; a self-applied tick's living bearer is
  its own dealer. The bearer's `on-damage-taken` and `on-death` get **no source** on a tick, so a
  tick offers no `triggering-source` to the bearer's responses; the hooks themselves still fire.
  Carried as `applyDamageAndEmit`'s `origin: { kind: 'tick', dealerId }`.
- **A Regen tick heals** the potency (no Defence, no minimum), its `HealApplied` source chosen by
  the same rule.
- **Pass-on is the rule, not an opt-in field**: an `apply-status` fired by a status's own effect for
  that same status copies the firing instance's whole snapshot (applier id, affinity, potency).
  Any other application snapshots its applier fresh, even an applier that carries the status.
- A tick never uses `scalingStat` mode: that mode runs the firing creature, here the bearer,
  through the formula as the attacker, so its own Defence and damage buffs would shape its own
  poison.

### Action locks

- `action-lock { scope: 'all' | 'attack' | 'cast' }` is a **passive** effect. In content a status
  carries it (Stun and Sleep `'all'`, Silenced `'cast'`, Pacified `'attack'`); like every effect it
  may sit on any carrier.
- The action layer's `checkLegality` reads locks directly, so a locked action is illegal for
  **every** action source: a script rule, the implicit fallback or a `perform-action` grant. A
  scoped lock makes only its own kind illegal and leaves the others choosable; an `'all'` lock
  makes every kind illegal: Attack, Cast, Defend, Provoke and Wait.
- **The skip.** A turn is skipped when an `'all'` lock is active **right after the turn-start hook
  pass**, or **at the action slot**. The first read is what the turn-start grants need: they run
  after it and must already know the turn is skipped (the actor's own grant is refused,
  `spec/combat.md` "Every action source obeys the same rules"). The second keeps a lock gained
  during the turn-start grants from reaching the decide step. A lock gained during the actor's own
  turn-start hooks therefore skips that same turn.
- **Neither read is redundant with `checkLegality`.** The turn-start drain can hold other
  creatures' grants, raised in the cascade of the actor's turn-start hooks, ahead of the actor's
  own; one can remove the lock (cleanse a Stun, wake a Sleeper) before the actor's grant runs. The
  first read still skips the turn, and the actor's grant is still refused.
- The skipped turn emits **`TurnSkipped { creatureId, effectId }`** in the action slot (after the
  turn-start cleanup and grants, only if the actor is alive) and takes no action of any kind;
  turn-end effects still fire. `effectId` names the first `'all'` lock in effect order at the action
  slot or, if none is left there, the one the first read found, by its carrier's definition id
  (the status id for a status), the id `TriggerFired.effectId` carries.

### Turn order

- `turn-order { position: 'first' | 'last', breakChancePercent? }` is a passive effect, never
  hook-fired, read by `buildTurnQueue`, which partitions the living combatants into an act-first
  pole, the normal group and an act-last pole, each sorted by Speed, concatenated first → normal →
  last. A bearer carrying both poles acts first.
- **Web's break-free roll** is `breakChancePercent: 10` on Web's `turn-order` effect: a field, not a
  triggered response, because it is rolled at every creature's turn, not on its bearer's hook. It
  is status-only, since breaking free removes the status instance.
- **The roll happens in turn-end cleanup**, right after that turn's countdown, so a Web that just
  expired draws nothing. It skips Webs born this turn: a Web cast in an action, granted after it, or
  applied by the Spider Weaver at the end of its turn is first rolled at the next creature's
  cleanup. A Web placed by a turn-start hook was present for that turn's action slot, so that
  turn's own cleanup rolls it.
- It runs on every dequeued turn's cleanup, a dead actor's empty bracket and a turn whose actor
  died mid-turn included (so the rate stays "at every creature's turn"), never after a mid-turn
  wipe, over living bearers in side → slot → id order. It follows the `chancePercent` discipline: it
  rolls only when a Web is present, and a board with no Web never touches the RNG. The 3-turn cap
  is Web's duration.

### Health clamp

- When an `apply-stat-modifier` lowers effective max Health below `currentHp`, `currentHp` drops to
  it and **`HpClamped { creatureId, previousHp, newHp, effectiveMaxHealth }`** follows the
  `StatModifierApplied` that caused it, so the drop, neither damage nor heal, is explicit in the
  log rather than inferred.

### has-status

- `has-status` matches a literal status id; spells reach statuses through their `apply-status`
  responses.
