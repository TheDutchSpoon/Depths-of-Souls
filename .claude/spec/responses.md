# Spec — Responses

Read this with `spec/effects.md`, for any triggered behaviour.

## Design

### No side doors

- **Every triggered behaviour is a response**: no side-channel effect categories, flags or
  executor hooks. A verb count is not the goal; routing every behaviour through the one response
  path is. A new verb or a new `ResponseTarget` still needs a review.
- Splashing, Annihilate and action instances are not side doors: they modify the **same** action,
  so the attack executor reading them is correct.

### The verbs

- Eight response kinds, each parameterized by **target** and **magnitude**: `deal-damage`,
  `apply-status`, `apply-stat-modifier`, `heal`, `revive`, `grant-action-state`, `remove-status`
  and `perform-action`.
- Skipping a turn is not a verb: it is a passive lock inside a status, and "interrupt one action"
  is simply `apply-status(stun, 1)` (`spec/statuses.md` "Action locks").

## Engine rules

### No response acts on a dead target

- Apart from `revive`, every verb with a `target` skips a dead one, however it was named (`self`,
  `triggering-source`, a selector, `cast-target`): `deal-damage`, `heal`, `apply-status`,
  `apply-stat-modifier`, `remove-status` and `grant-action-state` today, and every future targeted
  verb by default. No event is emitted for the skip.
- It is the verb-level half of "dead creatures fire only `on-death`" (`spec/effects.md` "Dead
  creatures"): a corpse neither reacts nor is acted on. A revive resets a creature's effects and
  action state anyway, so nothing done to a corpse could matter; the rule keeps the log honest.

### Fizzles

- Every fizzle has one shape: the trigger has passed its condition, chance and depth gates, so
  `TriggerFired` is emitted, and the response then produces **no** further events and **no**
  downstream hooks. That covers an empty target pool (Spore's spread with every ally already
  Spored, a `revive` with no eligible dead ally), `triggering-source` resolving to no one, and a
  `magnitudeSource` count of 0. Docs must never describe a fizzle as "no event".
- **A zero count is a full no-op**: a `deal-damage` or `heal` whose `magnitudeSource` resolves to 0
  deals or heals nothing: no `DamageDealt`, no min-1 floor, no downstream hooks (`on-damage-taken`,
  Sleep's wake).

### Response targets

- A response names its target: `self`, `triggering-source`, `triggering-ally`, `all-enemies`,
  `all-allies`, `all-allies-of-species`, a full `TargetSelector`, `random-dead-ally` ("revive"),
  `random-ally-without-status`, `lowest-hp-injured-other-ally` (`spec/effects.md` "Trigger
  conditions") and, inside a spell, `cast-target`.
- **`all-allies`** is the ally-side mirror of `all-enemies`, resolved through
  `livingAlliesOf(self)`, so it always includes the firing creature.
- **`all-allies-of-species`** is `all-allies` narrowed to creatures sharing the firing creature's
  `speciesId`; it is empty for a firing creature without one.
- **`random-ally-without-status { statusId }`**: `livingAlliesOf(self)` minus those carrying the
  status, then one RNG draw, **only when the pool is non-empty**. No `TargetSelector` can filter by
  status, hence the variant. `livingAlliesOf` keys off `self.side`, not `self.alive`, so it
  resolves correctly from a just-died host's own `on-death` (Spore's spread).

### triggering-source is never the firing creature

- `triggering-source` resolves to **no target** when the hook's source is the firing creature
  itself (a creature's own cost reaching its `on-damage-taken`). The hook still fires, and the
  fizzle emits `TriggerFired` only.
- A status tick offers no source at all (`spec/statuses.md` "The applier snapshot"), so on a tick
  `triggering-source` also resolves to no target, even while the applier lives: **retaliation
  never answers a tick**. The hook itself still fires (a DoT still wakes a sleeper).
- The rule is about response targets: `perform-action`'s `actor: 'triggering-source'` is not a
  target, and resolves to the source even when that is the bearer.

### Magnitude modes

- `deal-damage` and `heal` take one of three modes; setting more than one is a resolver-invariant
  error:
  - **`offStat`** (`'attack'` or `'cast'`): the remap-aware formula slot. A heal spell that names
    `offStat` names `'cast'`, remap-aware Intelligence.
  - **`scalingStat`**: any stat, read directly with no remap, letting a response scale off any stat
    (Thorns and Shield Bash off Defence). A heal's `scalingStat` reads the **healer's** stat.
  - **flat**, `flatAmount` ("Flat mode").
- `deal-damage`'s default stat is Attack (`offStat: 'attack'`).
- **One formula for every formula-mode magnitude**: `deal-damage` and `heal`, `offStat` or
  `scalingStat`, fired by a trait or a spell, all compute **stat × (spellPower × multiplier)**.
  The multiplier is the `magnitudeSource` count, a spell instance's `powerPercent / 100`, or 1.
  Nothing checks whether it runs inside a spell. Float multiplication isn't associative, so this
  order is part of the contract; no rounding or epsilon step is used.
- **Unspecified magnitude is 100%**: a `deal-damage` or coefficient that omits its magnitude means
  100% of the relevant OffStat (`spellPower` defaults to 1). A blank is meaningful, not an error.

### Flat mode

- `flatAmount` is a literal number, a **`StatPercent`** or a status tick's `snapshot-potency` marker
  (`spec/statuses.md` "The applier snapshot").
- A `StatPercent` (`{ ofStat, percent }`, `percent` a **positive integer**) is a percentage of the
  **firing creature's** (`context.self`) own effective stat: the Wick's burn and heal,
  `CATASTROPHIC_COLLAPSE`.
- Composition: `floor(stat) × percent × count / 100`, `count` being the live `magnitudeSource`
  count, else 1, and the result is not floored here. The stat is read floored and `percent` and
  `count` are multiplied in before dividing by 100, so the numerator is exact integer arithmetic: a
  float fraction can land just below an integer and floor one too low (180 × 0.03 × 5 =
  26.999999999999996 → 26 instead of 27), which is why `percent` is an integer, not a fraction. The
  floor happens once, later, in the cost, heal or damage formula that takes the amount.
- Heals have **no minimum**, unlike damage's 1, so a heal can be 0. That is accepted, not
  special-cased.
- A percentage of a *different* creature's stat (anti-tank %-max-HP damage, a heal for a % of an
  ally's max HP) isn't supported; no content needs it. It would be an explicit stat-source
  selector, never a reinterpretation of `StatPercent`.

### heal

- `heal` restores HP to a **living** target, capped at its effective max HP **after any scaling**
  (no overheal). It is distinct from Regen, the status that heals over time.

### apply-status

- `apply-status { target, status: { statusId, duration? } }`; an omitted duration is the status's
  `defaultDuration` (`spec/statuses.md` "Applying and refreshing").

### apply-stat-modifier

- `apply-stat-modifier { target, stat, factor, magnitudeSource? }` adds a stat-modifier, permanent
  for the fight; a `magnitudeSource` count is frozen at application (`spec/effects.md`
  "Stat-modifier counts freeze at application").

### grant-action-state

- `grant-action-state` sets `defending` or `provoking` on its target, reusing Defend's math and
  Provoke's redirect: a general primitive, not a per-trait special case. It sets a flag; it is not
  an action (contrast `perform-action`).

### remove-status

- `remove-status { target, filter: { statusId } }` clears a status from a target, reusing the
  `StatusExpired` path, so death-reset and turn-end cleanup stay consistent. It is invoked on
  *other* creatures, which is what spell-driven cleanse and dispel need.
- The filter names one status. A **polarity** filter (`buff` or `debuff`, `spec/statuses.md`
  "Polarity, cleanse and dispel") comes with the first cleanse or dispel spell.
- Removing stat-modifiers is out of scope, and deferrable with no migration: a stat-modifier's
  polarity is derivable (`factor > 1` is a buff, uniformly).

### revive

- `revive` returns a **dead** creature to its slot at its battle-start baseline (`spec/effects.md`
  "Death-reset") with `currentHp = round(baseline max HP × pct)`.
- **Bounded**: a creature can be revived at most **`MAX_REVIVES_PER_CREATURE = 10`** times per
  fight (`engine/config.ts`; `Creature.revivesUsed` counts). Dead allies at the cap are excluded
  from revive targeting; if none qualify, the revive fizzles and draws **no** random number. Revive
  builds stay viable; they just can't go infinite.

### perform-action

- `{ kind: 'perform-action', actor: 'self' | 'triggering-source', intent }`, `intent` being the
  rule-shaped intent the action pipeline takes (`{ action, targeting? }`, with `gemSlot: 'random'`
  and a `'random'` target available). It makes the actor take a **real action** through the one
  pipeline (via `ctx.runAction`), so every action rule applies: can't-act, Silenced, Confusion,
  Tunnel Vision, Provoke (`spec/combat.md` "One action pipeline").
- **Actions are atomic**: no action starts while another is resolving. The response only queues a
  grant on the `ResolutionContext` (its `grants`), which runs **after the granting action, all its
  instances, completes**. Responses stay nested and immediate.
- **Where grants run.** Each scope that raises grants drains them once, at its end:
  - the chosen action's grants run right after that action, before the turn-end hooks (an echo
    follows the cast it echoes);
  - the turn-end hooks' grants run in the turn's "granted actions" step;
  - the turn-start hooks' grants run after the turn-start cleanup and before the decide step, so a
    Defend or Provoke granted at turn start isn't ended by that same turn's cleanup;
  - the fight-start and round-end hooks' grants run right after that hook pass. These are
    round-level actions; no shipped content raises them.

  The queue is **first in, first out**: a grant raised by a granted action goes to the back, behind
  grants already waiting.
- **Bounded by cascade depth**, not by the self-re-entry guard. A queue entry carries the granting
  trigger's depth (which already includes its +1), and the granted action runs at that depth. The
  granting trigger has unwound before its grant runs, so the guard never sees an echo chain: a chain
  can pass through the same Overtone again and still truncates at `MAX_TRIGGER_CASCADE_DEPTH`
  (`spec/effects.md` "Loop safety").
- **Where it may appear**: trait effects, perk effects and status triggers; a spell's effect list
  rejects it at load. A **data test** reads every registry and requires each `perform-action`
  trigger to carry a real guard: a `chancePercent` below 100, or a `condition` other than `always`.
  That is a lint against unconditional self-perpetuating grants; the depth bound is what guarantees
  termination.
- **`ActionGranted { sourceId, actorId, effectId }`** is emitted when the queued grant **runs and is
  accepted**: after the actor's legality check and the gem and target draws, immediately before the
  granted action's first event. A grant refused or fizzling when it runs emits nothing of its own;
  the earlier `TriggerFired` stays. So `TriggerFired` and `ActionGranted` are not adjacent: whatever
  the granting action did after the trigger sits between them.
- **Who acts**: `actor: 'self'` is the bearer; `'triggering-source'` is the hook's source,
  **including the bearer itself**: an `ally` observation includes self, so Overtone echoes its own
  casts.
- **Only the actor's state decides a grant.** The bearer dying after its trigger fired doesn't
  cancel it; the actor being dead, on a skipped turn or locked when the grant runs does
  (`spec/combat.md` "Every action source obeys the same rules").
- **RNG draw order**: the chance roll at trigger time; then, when the grant runs, the gem, the
  target, and any Confusion or Provoke draws.
- An "insert an extra turn" primitive is a different concept from a granted action, and not built
  (`spec/effects.md` "Traits").
