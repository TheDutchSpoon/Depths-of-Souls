# Phase 4 — Slice E2: content-surfaced engine primitives (round 2)

Status: planned

> **Slice naming.** Working name **E2** — a systems slice inserted **between E and F**, in the
> spirit of Slices B/C/D (engine vocabulary surfaced by content design). Deliberately *not* "E.5":
> in this project `.5` denotes a demo (Phase 4.5). Rename/renumber to your scheme if you prefer;
> the only hard requirement is that it merges **before Slice F**.

## Context

A design pass over the full Biome 1–3 roster **and the three spec trees** (the earlier pass
covered only `species-locked.md`'s `free` column) found six capabilities the locked content assumes
but Slices A–E don't build. All six were locked in a design grill; this brief is the build spec.
The corrected dependency map lives in `species-locked.md` (the `free`-label fixes) and the spec
notes (Cull the Weak, Concussive Blows).

**Why one slice, before F, not folded into the content slices:** the earliest consumers are the
**Brute perk tree (Slice F)** — Cull the Weak (#1) and Concussive Blows (#2) — not H2 as first
thought. Building these as content-slice engine work would break the phase's "content slices do no
engine work" rule. All six edit the same triggered-effects core (`fireHook`, hook context, the
cascade/re-entry guard, the per-instance action path), so they're one coherent pass, not
separable modules. **This keeps F, H1, H2, H3 as pure content-assembly.**

## Scope boundary

**In scope**: the six primitives below, their goldens/unit tests, and the doc-sync already
delivered (GAME_DESIGN, CONVENTIONS incl. the actor-vs-observer routing table, species-locked
corrections). **Out of scope**: any content authoring (that's F/H1–H3), stat-modifier *removal*
(deferred — see #3), target-%-max-HP heals (deferred — see #5), and the Bulwark-style live-recompute
stat host (not needed — see #6).

**Byte-identical guarantee**: every primitive is absent-by-default and unreferenced by existing
content, so the full Phase 1–3 + Slice A–E golden suite must pass **unmodified**. Formula-touching
work (#1 enters the damage calc) needs explicit before/after golden proof, per the Slice B/D
discipline.

Build order below is the recommended commit sequence (each its own commit + goldens).

---

## #1 — Source-relative conditions + target-conditional damage  ·  consumers: Cull the Weak (F), Ambusher/Lullpollen-Reaper (H1), Gloomjaws (H2), Sporch (H3)

**Foundation (LOCKED).** Thread the trigger's `source` into condition evaluation
(`evaluateCondition` gains the resolving-against creature), and add **`'target'`** to `HpSubject`
(the flat `'self'|'ally'|'enemy'` union) — meaning "the creature this effect is being resolved
against." It lights up both `hp-percent` and `has-status`. With no such creature in scope (scripting
lookahead), a `'target'` condition evaluates **false** — same precedent as `acted-before-target`
(ASSUMPTION 11). Pure, RNG-free, no new lookahead cost. `HpSubject`'s qualifier is ignored for
`'target'` (single creature).

**Consumption (LOCKED = option a).** "+% damage **to** [statused / low-HP] targets" is a
**damage-modifier whose condition is evaluated against the current target at hit time** — *not* an
`on-damage-dealt` follow-up hit. Cull the Weak rank-50 = one clean `+50%` on the swing; a follow-up
would be a second damage instance that re-fires `on-damage-dealt`, re-splashes, and re-triggers
on-hit effects (wrong for a damage perk). The damage calc gains a target-conditional axis on dealt
modifiers: a modifier may carry an optional condition (subject `'target'`) checked against the
current target during `calculateDamage`. Gloomjaws' "bonus vs low-HP" uses the same path (gate on
target HP%).

**Tests.** Condition reads target status/HP% in a trigger context; evaluates false in scripting
lookahead. Target-conditional damage-modifier: hand-derived golden showing `+X%` applies only when
the target matches (e.g. Weakened vs not), one hit, no second instance.

---

## #2 — Probabilistic trigger response  ·  consumers: Concussive Blows (F), Sleeper (H1)

**LOCKED.** Optional **`chancePercent: number`** on the triggered-effect envelope — a sibling of
`condition` (both gate firing: one deterministic, one probabilistic). Plain number, **baked at
instantiation** (Slice F's perk model does the `1%×rank` arithmetic and stores the result; the
engine carries no rank concept — mirrors how `cross-stat`'s `percentPerRank` is consumed as
`percentPerRank × stat` with no `×rank`). Rolled **once per firing** (not per target), at execution
on the winning path — *after* the condition passes, *before* applying the effect — and **only when
`chancePercent` is present** (cheat-death's discipline: creatures without it never touch
`state.rng`). Deterministic point in the fixed effect-iteration order.

**Tests.** RNG-counter proof: a response with `chancePercent` draws exactly one `state.rng` call
when it fires and zero when its condition fails; a response without it never draws. Same seed →
same fire/no-fire.

---

## #3 — `remove-status` response + `StatusDef.polarity`  ·  consumers: Sleep self-removal (H1), future cleanse/dispel

**LOCKED.** New response verb (the 9th) **`{ kind: 'remove-status', target, filter }`**. `filter` =
a specific `statusId` now; a **polarity** filter (`'buff' | 'debuff'`) is the shape but lands with
the first cleanse/dispel spell. Reuses the existing `StatusExpired` clear path so death-reset and
the round-end sweep stay consistent; multi-removal iterates active statuses in fixed order. Target
reuses `ResponseTarget` (so "cleanse `lowest-hp-ally`" / "dispel `all-enemies`" get targeting free).

Add **`polarity: 'buff' | 'debuff'`** to `StatusDef`, declared on every status from birth (a
status's beneficial/harmful nature isn't mechanically derivable). **Stat-modifier removal is out of
scope** — deferrable with zero migration later, since a stat-modifier's polarity is *derivable*
(`factor > 1` = buff, uniformly, all stats higher-is-better).

**Sleep self-removal** composes from this: the Sleep status carries `on-damage-taken →
remove-status(self, sleep)`, firing **post-damage** so the waking hit still lands #1's vs-Sleeping
bonus, and DoT/AOE wake it. (Web is *not* here — see #5.)

**Tests.** `remove-status` by id clears the status + emits `StatusExpired`; Sleep golden: a hit on a
sleeping target lands the vs-Sleeping bonus, then the target wakes (Sleep gone next turn).

---

## #4 — General action-observation system  ·  consumer: Resonants (H2), foundational going forward

**LOCKED — general system, not two named hooks.** One hook **`on-action-observed`** fired **per
action instance** on **all living creatures**, superseding the (unwired) `on-ally-action` /
`on-enemy-action` pair. Cheap: `effectsForHook` returns nothing for non-observers, so it's a
lookup-per-creature unless they react. Rides `MAX_TRIGGER_CASCADE_DEPTH` + the re-entry guard.

Reacting effects filter on themselves, not on the hook name:
- **`relationship`**: `'self' | 'ally' | 'enemy' | 'any'` (ally includes self, per engine convention),
- **`actionKind`**: `'attack' | 'cast' | 'defend' | 'provoke'`,
- **`excludeActor?`**: drop the actor when the observer *is* the actor.

Context carries **actor + actionKind + instanceIndex**. Per-instance firing means an ally's
Echo/Flurry multi-cast is observed once per instance (Resonants powers up per allied cast instance,
matching the trait wording). No spell/affinity in the payload yet — added later when a consumer
reads it (cheap addition, per grill).

Resonants = `relationship: 'ally'`, `actionKind: 'cast'`, no exclude.

**Actor-self traits do NOT use this** — they stay on their own `on-attack/cast/defend/provoke`
hooks. See the actor-vs-observer routing table in CONVENTIONS (folded in this doc-sync); it's the
authoritative map for the coding agent. A trait subscribes to one hook, so no double-firing.

**Note**: `defend` and `provoke` can co-occur in one action (e.g. Shield up) → two observations,
one per action kind — correct.

**Tests.** Observation fires per instance on all living creatures; `relationship`/`actionKind`/
`excludeActor` filters select correctly; an actor-self trait fires only on its own hook, never
double via observation; cascade guard holds under an observe→act→observe chain.

---

## #5 — Web break-free (turn-loop chance)  ·  consumer: Web status (H1)

**LOCKED.** Web's "10% break-free at the start of **every** creature's turn (3-turn cap)" is a
per-global-turn chance, not the bearer's own hook — so it stays a small **`StatusDef.breakChancePercent`**
field, rolled in the turn loop at each turn-start against every Web-bearer, using #2's
roll-when-present discipline (a non-Webbed board never touches `state.rng`). The 3-turn cap is the
status's existing duration.

(Sleep's break-on-damage is #3, not here — different trigger, composes from `remove-status`.)

**Tests.** RNG-counter: a board with no Web draws nothing in the turn loop; a Web-bearer rolls once
per turn-start; same seed → same break turn.

---

## #6 — `magnitudeSource` on `StatModifierDef` + wire `speciesId`  ·  consumers: Swarmhive Striker (H1), Necromoss (H3)

**LOCKED.** Add **`magnitudeSource?`** to `StatModifierDef`, mirroring `deal-damage`/heal.
Semantics = **freeze-at-application** (option 2): the count is read when the modifier is applied and
held — no live recompute. Striker is therefore an **`apply-stat-modifier` response** (fires once,
e.g. on-fight-start), *not* a live passive; it stays on the discrete-applied side of the
stat-modifier split, so the Bulwark-style live-recompute stat host is **not built**. Necromoss uses
the same route.

Thread **`Creature.speciesId`** (exists since Slice D, unwired) through `materializeCreature` so
`living-allies-of-species` / hive counts read real values.

Swarmhive Striker was **reworded** to "scales per hive-mate **in the team**" (roster size, not live
count) so freeze-at-application reads as intended, not as a stale-live-count bug (`species-locked.md`,
this doc-sync).

**Tests.** A count-scaled stat buff freezes at its application-time count (a later death doesn't
change it); `living-allies-of-species` reads a real count once `speciesId` is wired; hand-derived
golden for a frozen Striker buff.

---

## Heal scaling (folded in — it's a `magnitudeSource`/scaling sibling)  ·  consumers: Treants Elder (H1), Necromoss (H3)

**LOCKED.** The triggered `heal` response (today flat `amountPerStack` only) gains **stat-scaled**
(coefficient × `getEffectiveStat(scalingStat)` — Elder off Health) and **`magnitudeSource`**
(× a count — Necromoss off dead-allies) modes, composing exactly like `deal-damage`; overheal
clamps to effective max HP **after** scaling. Stat-scaling reads **the healer's** stat (mirrors
deal-damage reading the attacker's); target-%-max-HP heals read the target and are **deferred** (no
locked content needs them).

**Tests.** Hand-derived golden: a stat-scaled heal off the healer's Health, clamped at overheal; a
count-scaled heal off dead-allies.

---

## Doc-sync accompanying this brief

- **`species/species-locked.md`** — 6 `free`-label corrections + Swarmhive rewording (delivered).
- **`GAME_DESIGN.md`** / **`CONVENTIONS.md`** — the six locked decisions + the **actor-vs-observer
  routing rule and classification table** (Resonants = observation; the other 15 actor-self traits
  mapped to their hooks). *(In progress — same doc-sync batch.)*
- **ROADMAP.md** — insert this slice before F. *(In progress.)*
