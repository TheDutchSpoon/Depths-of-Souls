# Spec — Responses

Read this with effects.md, for any triggered behaviour.

## To fold

## Phase 4 systems addenda (surfaced during content design)

Engine-vocabulary additions beyond the Grill-1 spine, surfaced while authoring seed content.
**Systems work**, pinned as the manifest the coding agent's plan is reviewed against — not incidental
data.

- **Grant-action-state response** — a triggered response that sets `defending` / `provoking` on a
  target. Reuses the existing action-state flags and Defend's math/goldens; a general primitive, not
  a per-trait special-case.
### Response vocabulary — eight verbs (nine until 4.1-H2b2), and "no side doors"
History: four in Phase 3; `heal` + `revive` joined as the two justified new verbs, `grant-action-state`
+ `consume-stacks` were counted as responses too, and **Phase 4 Slice E2 added `remove-status`**
(spell-driven cleanse/dispel is a near-term certainty, so a general removal verb invoked on *other*
creatures earns its place; `consume-stacks`' self-scoped read-and-clear cannot serve it).

**Phases 4.1-E and 4.1-F change the set (A2 + A3):** `perform-action` is **added** and `suppress-action` is
**removed** (a turn-skip is now a passive `action-lock` inside a status, and "interrupt one action"
is simply `apply-status(stun, 1)`). 4.1-F left nine; **4.1-H2b2 deleted `consume-stacks`**
(statuses no longer stack, brief ASSUMPTION 114), leaving **eight** top-level kinds: `deal-damage`,
`apply-status`, `apply-stat-modifier`, `heal`, `revive`, `grant-action-state`, `remove-status`,
`perform-action`.

**The principle is "no side doors"** (replaces "hold the line at nine", which was held on paper
while action-granting behaviour came in through a side-channel `EffectDef` category and a
`TriggeredDef.echoCast` flag). **Every triggered behaviour is a response: no side-channel
categories, flags or executor hooks.** A verb count is not the goal; routing every behaviour
through the one response path is. New verbs still need a review. Splashing/Annihilate and
`action-instance` are **not** side doors: they modify the *same* action, so being read in the
attack executor is correct.

- **No response acts on a dead target, except `revive`** (PR #74 review). This is a rule of the
  verbs, not of any target kind: every verb with a `target` skips a dead one, whether it was named
  as `self`, `triggering-source`, a selector or `cast-target`. That is `deal-damage`, `heal`,
  `apply-status`, `apply-stat-modifier`, `remove-status` and `grant-action-state` today, and every
  future targeted verb by default. No event is emitted for the skip. It is the verb-level half of
  "dead creatures fire only `on-death`" (interaction edges): a corpse neither reacts nor is acted
  on. Revive resets a creature's effects and action state anyway, so nothing done to a corpse could
  matter; the rule keeps the log honest and removes the case from every future verb.
- **`perform-action`** (Phase 4.1-E, A2) — `{ kind: 'perform-action', actor: 'self' |
  'triggering-source', intent }`, where `intent` is the same rule-shaped intent the action pipeline
  takes (`{ action: RuleAction, targeting?: TargetSelector }`, with `gemSlot: 'random'` and a `'random'`
  target available). It makes the named actor take a **real action** through A1's pipeline (via
  `ctx.runAction`), so every action rule applies (can't-act, Silenced, Confusion → Tunnel Vision →
  Provoke; see "One action pipeline"). Content: **Arcane Surge** = `on-turn-end`, `chancePercent:
  50` → `perform-action(self, { action: cast, gemSlot: 'random' })`; **Resonant Overtone** =
  `on-action-observed` (ally cast), `chancePercent: 10`, `stacks: false` →
  `perform-action(triggering-source, { action: cast, gemSlot: 'random', targeting: 'random' })`.
  - **Actions are atomic:** no action starts while another is resolving. A grant is queued on the
    `ResolutionContext` (its `grants` list) and runs **after the granting action (all its
    instances) completes**; responses stay nested and immediate.
  - **Where grants run** (4.1-E plan review). Each scope that raises grants drains them once, at
    its end:
    - the chosen action's grants run right after that action, before the turn-end hooks (an echo
      follows the cast it echoes);
    - the turn-end hooks' grants run in the skeleton's "granted actions" step;
    - the turn-start hooks' grants run after the turn-start cleanup and before the decide step, so
      a Defend or Provoke granted at turn start isn't ended by that same turn's cleanup;
    - the fight-start and round-end hooks' grants run right after that hook pass. These are
      round-level actions; no shipped content raises them.

    The queue is **first in, first out**: a grant raised by a granted action goes to the back,
    behind grants already waiting.
  - **Bounded by cascade depth**, not by the self-re-entry guard. A queue entry carries the
    granting trigger's depth (which already includes its +1), and the granted action runs at that
    depth. The granting trigger has unwound before its grant runs, so the re-entry guard never sees
    an echo chain; an echo chain can pass through the same Overtone again and still truncates at
    `MAX_TRIGGER_CASCADE_DEPTH`.
  - **Where it may appear:** trait effects, perk effects and status triggers. It is rejected at
    load time inside a spell's effect list. A **data
    test** reads every registry and requires each `perform-action` trigger to carry a real guard:
    a `chancePercent` below 100, or a `condition` other than `always`. That is a lint against
    unconditional self-perpetuating grants; the depth bound is what guarantees termination.
  - **`ActionGranted { sourceId, actorId, effectId }`** (replaces `EchoCastGranted`) is emitted
    when the queued grant **runs and is accepted**: after the actor's legality check and the gem
    and target draws, immediately before the granted action's first event. A grant that is refused
    or fizzles when it runs emits nothing of its own; the earlier `TriggerFired` stays (the uniform
    fizzle shape). So `TriggerFired` and `ActionGranted` are not adjacent: whatever the granting
    action did after the trigger sits between them.
  - **Who acts:** `actor: 'self'` is the bearer. `actor: 'triggering-source'` is the hook's source,
    **including the bearer itself**: an `ally` observation includes self, so Overtone echoes its own
    casts. The "`triggering-source` never resolves to the firing creature" rule is about response
    targets, not this field.
  - **Only the actor's state decides a grant.** The bearer dying after its trigger fired does not
    cancel the grant. The actor being dead, on a skipped turn or locked when the grant runs does
    (B2 rules 1–2).
  - **RNG draw order:** the chance roll at trigger time; then, when the grant runs, the gem, the
    target, and any Confusion or Provoke draws.
  - Distinct from `grant-action-state` ("gains defending") — that sets a flag, it is not an
    action. An "insert an extra turn" primitive is a different, complementary concept (the intent
    can later gain `action: 'script'`); not built.
  - Deleted with it: the `bonus-cast` category (`BonusCastDef`, `maybeFireBonusCast`) and
    `TriggeredDef.echoCast` (`runEchoCast`).
- **`heal`** — restore HP to a *living* target (self / ally / all-allies via targeting); caps at
  effective max HP (no overheal) **after any scaling**; distinct from Regen (the over-time status).
  **Slice E2** gives the triggered `heal` the same magnitude modes as `deal-damage`: flat
  (`flatAmount`, `amountPerStack` until 4.1-H2b2; the Wick's heal, and Regen's tick through its
  `snapshot-potency` marker), **stat-scaled off the *healer's* stat** (`scalingStat`; Treants Elder →
  Health), and **`magnitudeSource`** (× a count; Necromoss → dead-allies). **4.1-D** adds
  **`offStat`** (a remap-aware slot, exactly as on `deal-damage`), so a heal spell keeps its
  remap-aware Intelligence default. `flatAmount`, `scalingStat` and `offStat` are mutually
  exclusive; setting more than one is a resolver-invariant error. **One formula for every
  formula-mode magnitude** (PR #74 review): `deal-damage` and `heal`, `offStat` or `scalingStat`
  mode, fired by a trait or a spell, all compute **stat × (spellPower × multiplier)**. The
  multiplier is the `magnitudeSource` count, a spell instance's `powerPercent / 100`, or 1. Nothing
  checks whether it runs inside a spell. Float multiplication isn't associative, so this order is
  part of the contract. Before 4.1-D a trait's `scalingStat` heal alone computed `(stat ×
  spellPower) × count`. Neither order is more accurate (each floors one below the exact value on
  different inputs), so the change was accepted as float noise: goldens and the corpus are
  unchanged, and Necromoss's heal can differ by 1 HP on rare Health and modifier combinations. No
  rounding or epsilon step is used. **`StatPercent` always
  reads the firing creature (`context.self`).** For self-targeted ticks (Regen/Poison/Burn) that is
  also the target. A percentage of a *different* target's stat (anti-tank %-max-HP damage, a
  %-of-ally's-max-HP heal) is still deferred — no locked content needs it — and would land as an
  explicit stat-source selector, never a reinterpretation of this field.
- **Flat-mode stat-derived magnitude** (percent-hp-condition-ticks brief; it carried the status
  ticks until 4.1-H2b2, which moved them to the snapshot above) — `deal-damage.flatAmount`
  and `heal.flatAmount` (`amountPerStack` until 4.1-H2b2, brief ASSUMPTION 144) each accept
  either a literal number (unchanged) or a `StatPercent`
  (`{ ofStat, percent }`, `percent` a **positive integer**), a percentage of the **firing
  creature's** (`context.self`) own effective stat — the Wick's burn and heal, and
  `CATASTROPHIC_COLLAPSE`. (Until 4.1-H2b2 Regen/Poison/Burn read `{ ofStat: 'health', percent }`
  here, each tick a fraction of the bearer's max HP.)
  Composition: `floor(floor(getEffectiveStat(self, ofStat)) × percent × count / 100)`, where
  `count` is the live `magnitudeSource` count, else 1 (until 4.1-H2b2 the status's `stacks`) —
  the stat is read **floored** and `percent`/`count` are multiplied in
  **before** dividing by 100, so the whole thing is exact integer arithmetic; a float fraction
  (`stat × 0.03`) can land just below an integer and floor one too low (180 × 0.03 × 5 =
  26.999999999999996 → 26 instead of 27), which is why this is an integer percent, not a fraction.
  The floor happens **once**, at the single `Math.floor` in `applyCostDamage`/`applyHeal`. Heals
  have **no minimum** (`applyHeal` floors to ≥ 0), unlike damage's min-1, so a heal can be 0 (a
  Regen snapshot of 10% of a healer below 10 Health is 0) — accepted, not special-cased. **`scalingStat` mode is
  deliberately NOT used for DoTs**: for damage, that
  mode runs the response's `context.self` through the real damage formula as the *attacker*, and
  for a DoT `context.self` is the poisoned creature itself — its own Defence would mitigate its
  own poison, and its own damage-dealt buffs (Glow, cross-stat, armor penetration) would amplify
  it. Flat mode's formula-bypass is what keeps a DoT's tick independent of the victim's own kit.
- **`remove-status`** (Slice E2) — clear a status from a target (`{ target, filter }`). `filter` is
  a specific `statusId` now; a **polarity** filter (`buff`/`debuff`) lands with the first
  cleanse/dispel spell. Statuses carry an explicit **`StatusDef.polarity: 'buff' | 'debuff'`**
  (declared from birth — a status's polarity is not mechanically derivable). Reuses the
  `StatusExpired` clear path (death-reset + turn-end cleanup stay consistent); multi-removal iterates
  active statuses in fixed order. Stat-modifier removal is **out of scope** — deferrable with zero
  migration, since a stat-modifier's polarity IS derivable (`factor > 1` = buff, uniformly).
- **`chancePercent`** (probabilistic responses, Slice E2) — an optional gate on a triggered effect,
  a sibling of `condition` (both decide whether it fires): a plain number, **baked at instantiation**
  (the perk model computes `1%×rank` and stores the result — the engine carries no rank concept,
  mirroring how `cross-stat`'s `percentPerRank` is consumed as `percentPerRank × stat`). Rolled
  **once per firing**, at execution on the winning path (after `condition`, before applying),
  **only when present** (cheat-death discipline — creatures without it never touch `state.rng`).
  Concussive Blows, Sleeper.
- **`revive`** — return a *dead* creature to its slot at **battle-start baseline + a % of baseline
  max HP** (Unicorn: 20%). See Death-reset. **Bounded (Phase 4.1-B, D3):** a creature can be
  revived at most **`MAX_REVIVES_PER_CREATURE = 10`** times per fight (an engine config constant;
  `Creature.revivesUsed` counts). Dead allies at the cap are **excluded from revive targeting**; if
  none qualify, the revive fizzles (`TriggerFired` only) and draws **no** random number. Revive
  builds stay viable; they just can't go infinite. The Unicorn's own strength (up to 10 revives per
  ally per fight) is a tuning question; the lever is a `chancePercent` on its trait.
- **`deal-damage` `scalingStat`** — default **Attack**; can be Defence/etc. — the mirror of spells'
  `scalingStat`, letting a trait/response scale off any stat (Thorns/Shield Bash→Defence,
  Shellbacks, Aggressive Caster→Attack).
- **consume-stacks** response — read a resource-status's stacks → apply effect → clear (Glow).
  **Built in Phase 4 Slice D; deleted in 4.1-H2b2** with stacking (Glow, its last real user, went in
  4.1-H2b1) (brief ASSUMPTIONS 114, 116). History only: it was self-scoped (no `target`) and read
  and cleared the firing creature's own stacks.
- **No side doors** — every triggered behaviour is a response (see the response vocabulary).
- **`all-allies` `ResponseTarget`** — the ally-side mirror of `all-enemies` (resolves via
  `livingAlliesOf(self)`, so it always includes the firing creature). First consumer: the
  Shieldbarer starter's `on-provoke → team +35% Defence`.
- **`bonus-cast`** (the Sorcerer starter's "50% on-turn-end, cast a random equipped spell") was
  built as an `EffectDef` category consulted directly by `resolveTurn`, to avoid a
  `resolution.ts → combat.ts` import cycle. It bypassed every action rule (it fired while Stunned
  or Asleep, ignored Silenced, Provoke and Confusion: review finding B2). **Superseded by Phase
  4.1-E (A2):** Arcane Surge becomes an ordinary `on-turn-end` trigger with a `perform-action`
  response, and the `bonus-cast` category is deleted. The import-cycle reason is gone because
  A1's `ResolutionContext` carries `runAction`.
### Phase 4 Slice H2 addenda (Glimmerdark)

- **Resonant Overtone's echo** (on an observed ally cast, 10% chance the **observed caster** casts
  a uniformly random equipped gem, possibly the same one, at a **random** valid target; echoes are
  themselves observable, so they chain) was built as a `TriggeredDef.echoCast` flag handled by
  `combat.ts` (`runEchoCast`), a sibling of the bonus-cast pattern, with an `EchoCastGranted`
  event. Its bounding decisions stand: the chain threads the **ambient cascade** (depth +1 per hop)
  so `MAX_TRIGGER_CASCADE_DEPTH` + `CascadeTruncated` bound it, and the self-re-entry guard must
  **not** kill the chain. **Superseded by Phase 4.1-E (A2):** Overtone becomes an ordinary
  `on-action-observed` trigger with a `perform-action(triggering-source, …)` response;
  `ActionGranted` replaces `EchoCastGranted`; and under "actions are atomic" the echo runs **after**
  the original cast (all instances and its payload) completes, instead of mid-cast. `echoCast` and
  `runEchoCast` are deleted. RNG draw order per grant: chance gate → (after the original action
  completes) random gem → random target; the 4.1-E plan pins and documents it.
- **`random-ally-without-status` — one new `ResponseTarget` variant.** ASSUMPTION 30 ("a selector
  composition, no new engine primitive") did **not** hold: no `TargetSelector` can filter by
  status. `{ kind: 'random-ally-without-status', statusId: string }`, resolved in
  `resolveResponseTargets` as `livingAlliesOf(self, state).filter(c => !hasStatus(c, statusId))`,
  then one `state.rng` draw — **only when the pool is non-empty** (an empty pool draws no RNG).
  `livingAlliesOf` keys off `self.side`, not `self.alive`, so it resolves correctly from the
  just-died host's own `on-death`. Precedent: `random-dead-ally` (Slice B). Keep this list short —
  a new `ResponseTarget` variant still needs a review, same as any other vocabulary growth.
- **Empty-target / zero-count fizzles emit `TriggerFired` and nothing else (decided).** One uniform
  shape for every "fizzle": the trigger has already passed its condition/chance/depth gates, so
  `TriggerFired` is emitted, and then the response produces **no** further events and **no**
  downstream hooks. Applies to: an empty `ResponseTarget` pool (Spore's spread with every ally
  already Spored; `revive` with no dead ally), `triggering-source` resolving to self, a zero
  `magnitudeSource` count (and, until 4.1-H2b2, `consume-stacks` with 0 stacks). Docs must never describe these as
  "no event."
- **Sporch Cinderlord's kill-burst is creature-level and applies one Burn per remaining enemy
  (decided; built in 4.1-H2b2, which deleted `stacks`).** `on-kill → apply-status(all-enemies,
  burn)`, each Burn snapshotting the Cinderlord. On an enemy already Burning it is an ordinary
  re-application: the stronger snapshot stays and the timer refreshes. (Until 4.1-H2b2 it added
  one stack, up to Burn's cap of 3.) The Burn
  **status** carries no spread trigger; "non-spreading Burn" refers to the status.

