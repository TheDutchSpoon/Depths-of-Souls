# Phase 3 — Traits, Statuses & the Effect Framework: Implementation Plan

Status: planned

## Context

Phase 1 built the pure resolver (Attack-only) and Phase 2 the action set + scripting
interpreter. Both deliberately left **dormant seams** for the effect framework:
`getEffectiveStat`/`getOffensiveStat` are passthroughs, `firePhaseHook` is a 6-point no-op,
and `calculateDamage`'s `dealtMods`/`takenFactors` pools are always empty. Phase 3 (per
ROADMAP + the locked Phase-3 detail in GAME_DESIGN §6 and CONVENTIONS' "Unified effect
framework") activates all of it: one data-driven, hook-based effect model underpinning
**traits, statuses, and (later) gem augments / artifact infusions**, plus the 13-hook
vocabulary, cascade/loop safety, the trait model, the full status lifecycle, `has-status`,
and spell-applied statuses.

This is the largest engine phase — bigger than 1 and 2 combined — because "activate the
seams" understates it: **7 of the 13 hooks fire from inside the damage path** (not the 6
existing phase-point call sites), which makes the damage-application function the
load-bearing recursion + cascade-safety surface. It is therefore built as **three provable
slices**, each landing green (lint + tests + build) before the next.

Per CONVENTIONS' "Implementation plans" rule, every decision the spec doesn't pin is tagged
**`ASSUMPTION:`** and re-collected in the checklist at the end. Three of these
(effect-storage shape, hook-model recursion site, slicing) were already agreed with the
design owner and are baked in below.

Work happens on the `phase-3` branch (current). Design docs are settled (phase-3-docs merged
+ the working-tree edits adding required `damageSource`, `StatModifierApplied`, `HealApplied`,
and the Health-modifier init/clamp rules).

## Architecture overview

Four effect **categories**, one framework (GAME_DESIGN §6 taxonomy):

| Category | Where it acts | Surfaced as | Lifetime |
|---|---|---|---|
| `stat-modifier` | folds into effective stats `base × Π(factors)` | effective stat (never a status icon) | permanent-for-fight, uncapped |
| `stat-remap` | redirects a formula slot's source stat | — | permanent-for-fight |
| `damage-modifier` | feeds `dealtMods` (additive) / `takenFactors` (multiplicative) pools | timed status icon (Weaken/Vulnerability), may be capped | timed |
| `condition-status` | DoT / Regen / Stun via hooks | timed status icon | timed |

Effects attach two ways: **passive** (present from fight-start, folded on read, optionally
conditional) and **triggered** (`{hook, condition?, response}`, response vocab: deal-damage /
apply-status / apply-stat-modifier / suppress-action). **Statuses** are timed effect instances
(condition-status + timed damage-modifier) applied in-fight by traits or spells.

### Where effects live (agreed)

`Creature` gains **two** fields:
- `innateTraitIds: readonly string[]` — the static reference (1 base / 2 fused), resolved
  from a trait registry.
- `activeEffects: readonly ActiveEffect[]` — the mutable, fight-scoped list, threaded through
  `updateCreature`. `createCombat` instantiates innate-trait effects into it at fight-start.

Canonical per-creature effect order (reused **everywhere** effects are iterated — stat
folding, hook firing, remap resolution): **innate-1 → innate-2 → artifact infusions (none in
v1) → applied statuses (application order)**.

Each `ActiveEffect` carries a **stable `EffectInstanceId`** (deterministic, e.g.
`${creatureId}#${traitId}#${ordinal}` / `${creatureId}#status#${statusId}` — **never RNG**,
so goldens stay reproducible). The instance id is what the re-entry guard keys on.

### The recursion / cascade surface (agreed)

`applyDamageAndEmit` becomes the site where `on-damage-dealt / -taken / -kill / -death /
-ally-death / -enemy-death` fire — and firing a hook can deal more damage, which re-enters
`applyDamageAndEmit`. This mutual recursion + the `on-turn/round/status` hooks live together
in a new **`resolution.ts`** module, threading a **transient `CascadeState`** (never in
`CombatState`, never serialized):

```ts
interface CascadeState {
  depth: number                         // chain nesting; reset per top-level action/hook
  activeInstances: Set<EffectInstanceId> // stack-scoped self-re-entry guard
}
```

- **Self-re-entry guard**: an effect instance already on `activeInstances` is skipped (blocks
  self-loops; allows cross-creature cascades).
- **`MAX_TRIGGER_CASCADE_DEPTH = 500`** (new config const): if firing would exceed it, the
  over-cap trigger does **not** execute; a mandatory **`CascadeTruncated`** event is emitted;
  resolution unwinds cleanly.

### Module layout

```
src/engine/
  effect-types.ts   NEW  Effect/ActiveEffect/Hook/EffectResponse/StatusSpec/EffectInstanceId
  effects.ts        NEW  PURE helpers: canonical ordering, effectsForHook, instantiate-from-trait,
                          stat-modifier folding helper, remap resolution, status apply/stack/
                          decrement/expire, gatherDealtMods/gatherTakenFactors, clampHpToEffectiveMax
  resolution.ts     NEW  fireHook + executeResponse + applyDamageAndEmit (the mutually-recursive
                          core) + CascadeState. Threads {state, events, suppressed}.
  phase-hooks.ts    REMOVE/ABSORB  (its PhasePoint no-op is replaced by resolution.ts's fireHook)
  effective-stats.ts EXTEND  getEffectiveStat folds stat-modifiers (predicate-aware);
                          getOffensiveStat consults stat-remap before the fallback
  creature-lookup.ts EXTEND  move updateCreature + getCreature here (so resolution.ts can reuse
                          them without a combat.ts cycle); patch type gains activeEffects
  scripting-types.ts EXTEND  add HasStatusCondition to the Condition union
  conditions.ts     EXTEND  add the has-status case
  types.ts          EXTEND  Creature (+innateTraitIds, +activeEffects); Spell (+appliesStatus?);
                          DamageDealt (+required damageSource); new events (TriggerFired,
                          StatusApplied, StatusExpired, StatModifierApplied, HpClamped, HealApplied,
                          CascadeTruncated)
  config.ts         EXTEND  MAX_TRIGGER_CASCADE_DEPTH = 500
  combat.ts         EXTEND  createCombat instantiates effects + inits HP; resolveTurn wires the
                          new {state,events,suppressed} hook signature; round-end becomes the
                          3-step sweep with win-check-after-sweep; damage paths gather pools

src/data/
  traits.ts    NEW  Trait { id, name, effects[] } + TRAIT_REGISTRY; representative content
  statuses.ts  NEW  status definitions (Poison, Burn, Regen, Stun, Weaken, Vulnerability) + registry
  traits.test.ts / statuses.test.ts  NEW  light shape/behavior sanity per registry entry
```

**Cycle avoidance**: `combat.ts → resolution.ts → {effects.ts, targeting.ts,
creature-lookup.ts, damage.ts, tie-break.ts}`, one-way. `effect-types.ts` is types-only.
`getEffectiveStat` stays in `effective-stats.ts` (folding needs only the `ActiveEffect` type +
to call a stored predicate — no `effects.ts` import cycle).

## Slice / PR sequencing (three independent merges to main)

Phase 3 ships as **three separate PRs**, each merged to `main` on its own. The bar is stronger
than "green at the end of the branch": **`main` must stay green on all four gates *and* stay
deployable after every single merge** (`main` auto-deploys to Pages).

- **Sequential branch-off.** Branch each slice off `main` *after* the previous merges — B off
  post-A `main`, C off post-B `main`. Do **not** cut all three from today's `main`, or B/C carry a
  stale pre-`damageSource` schema and conflict.
- **A carries more than its feature, on purpose:**
  1. The `damageSource` golden churn (the schema change) — so B/C branch from a `main` that already
     has the new `DamageDealt` shape.
  2. The `updateCreature`/`getCreature` **relocation** to `creature-lookup.ts` — *pulled into A*
     (this plan first bundled it with `resolution.ts` in B). It's a behavior-preserving move provable
     by byte-identical goldens, so isolating it in A leaves B's diff as **pure recursion/hook
     logic**. `resolution.ts` itself still lands in B.
  3. The **full event union** in `types.ts` (`TriggerFired`, `StatusApplied`, `StatusExpired`,
     `StatModifierApplied`, `HpClamped`, `HealApplied`, `CascadeTruncated`) — front-loaded so the
     type surface is stable and B/C never re-touch `types.ts`. A's tests assert only on events A
     actually emits.
  4. **Demo compile-compat** — A changes the `Creature` type (`+innateTraitIds`, `+activeEffects`),
     and `src/app/demoFight.ts` builds `Creature` literals directly (it cannot import the
     `__fixtures__` factory — standing guardrail), so those literals gain the new fields **within
     A's PR** or A won't build.
- **Assertion rule — presence, never absence.** No slice may assert an event is *absent* if a later
  slice emits it (never `expect(events).not.toContainEqual({type:'TriggerFired'})`). Full-log
  `toEqual` goldens assert absence by nature, so A's golden fixtures must use parties whose behavior
  is **final at A's level** (no creature in them gains a trigger/status in B/C) — then their full log
  stays genuinely stable across B/C.
- **B's explicit merge blocker.** Because B moves `applyDamageAndEmit` into `resolution.ts` and adds
  hook firing to it, the Phase 1/2 goldens must stay **byte-identical** (full stop — the
  `damageSource` modulo already merged in A) against post-A `main`. A gate on B's PR, not an
  end-of-phase check — it proves the refactor + new firing didn't alter existing behavior.
- **"Half-built?" test passes for each:** A adds folding/passives (coherent), B adds triggers
  (coherent), C completes statuses. New features aren't visible in the demo until Phase 3.5 — that's
  expected; they're exercised by tests, not the demo.

---

## Slice A — Effect folding, remap & passive traits (no triggers yet)

Makes the stat seams real. No hook firing yet, so this is provable in isolation.

**Types & storage:**
- `effect-types.ts`: `EffectInstanceId` brand; `ActiveEffect` union on `category`; passive
  payloads (`stat-modifier {stat, factor, predicate?}`, `stat-remap {slot: 'attack'|'cast',
  fromStat}`); the `Hook` string union (all 13, declared now, fired in B/C); `EffectResponse`
  and `StatusSpec` types (declared now, used in B/C). **`ASSUMPTION:`** conditional-passive
  predicate is a self-only `(creature) => boolean` that reads *other* effective stats via
  `getEffectiveStat` (never the gated stat — no read-cycle); alternative (reuse a restricted
  `Condition`) noted but not taken (predicates need no combat state).
- `types.ts`: `Creature` gains `innateTraitIds` + `activeEffects`. `DamageDealt` gains
  **required** `damageSource: 'attack' | 'cast' | 'dot'`.
- `__fixtures__/creatures.ts`: `makeCreature` defaults `innateTraitIds: []`, `activeEffects: []`;
  `CreatureOverrides` gains both. `effective-stats.test.ts:6` inline literal gets `activeEffects: []`.

**Folding:**
- `getEffectiveStat`: `base × Π(factors)` over `activeEffects` where `category==='stat-modifier'
  && stat===target && (no predicate || predicate(creature))`, in canonical order. Multiplication
  is commutative so numeric order is irrelevant, but iterate in canonical order for consistency.
- `getOffensiveStat`: `resolveRemappedStat(creature, actionKind)` (scan stat-remap effects for
  the slot, **last-writer-wins in canonical order**, default attack→attack / cast→intelligence)
  → `getEffectiveStat(sourceStat) × spellPower`. Slot stat-modifiers do **not** transfer (we read
  the remapped stat's own modifiers — automatic).

**Health-as-a-stat (from the settled doc edit):**
- `effects.ts` `clampHpToEffectiveMax(creature)`: `currentHp = min(currentHp,
  getEffectiveStat(creature,'health'))`.
- `createCombat`: after instantiating each creature's innate effects into `activeEffects`, set
  `currentHp = getEffectiveStat(creature,'health')` (effective max). **`ASSUMPTION:` for
  trait-less creatures this equals base health, so Phase 1/2 fixtures are byte-identical
  (verify no existing test seeds a deliberately-partial starting HP *through* `createCombat`).**

**Trait registry + content (Slice-A subset):**
- `data/traits.ts`: `Trait {id,name,effects}` + `TRAIT_REGISTRY`. Representative passives:
  a flat `stat-modifier` (+30% Attack), a **conditional** passive (+25% Attack while at full
  HP — predicate `currentHp === getEffectiveStat(_,'health')`), and a `stat-remap`
  (Speed-as-Attack). `createCombat` resolves `innateTraitIds → registry → instantiate` (assign
  deterministic instance ids, append in canonical order).

**Events:** `StatModifierApplied {sourceId, targetId, stat, factor, effectiveBefore,
effectiveAfter}` added to the union now (emitted in Slice B when a *triggered* apply-stat-modifier
runs; fight-start passives are instantiated silently — baseline, not an in-fight event). A
Health-lowering stat-modifier that drops effective max below current HP additionally emits
**`HpClamped {creatureId, previousHp, newHp, effectiveMaxHealth}`** — **only when the clamp
actually moves `currentHp`** — ordered `StatModifierApplied → HpClamped` (cause before effect). A
Health buff raises the cap and emits only `StatModifierApplied` (no auto-heal, no `HpClamped`).

**Tests (A):** `effective-stats.test.ts` extended — single/stacked multiplicative folding,
reductions never reach 0, conditional predicate on/off across an HP change, remap
(incl. last-writer-wins with two remaps), spellPower parity unchanged. Health init/clamp unit
tests. **Golden:** `golden-conditional-passive` (hand-derived) — a creature whose +25%-Attack-at-
full-HP flips off after it takes a hit, changing a later hit's damage; proves read-time folding.

**Golden regression (the big one, done here):** add `damageSource` to all **26** `DamageDealt`
literals across the 10 goldens — **field-addition-only**: attack damage → `'attack'`, cast →
`'cast'`. Regenerate, then **verify the diff shows only the added field, no value/ordering
changes** (a deliberate reviewed schema update, per CONVENTIONS). `combat.test.ts`'s 2 inline
`DamageDealt` literals use `toMatchObject` → unaffected.

---

## Slice B — Triggered hooks & cascade safety

Turns the 6 no-op phase points + 7 damage-path points into a real dispatcher.

**`resolution.ts`:**
- `fireHook(hook, scope, context, state, events, cascade): { state, suppressed }` where
  `scope` is `{kind:'creature', id}` (iterate that creature's effects) or `{kind:'global'}`
  (all creatures in tie-break order — round-end). Lookup via `effectsForHook(creature, hook)`
  in `effects.ts` (scan-and-filter; alive-only, except `on-death` which fires on the dying
  creature). For each matching triggered effect: skip if `cascade.activeInstances.has(id)`;
  evaluate `trigger.condition` against context; if `depth+1 > MAX_TRIGGER_CASCADE_DEPTH` →
  emit `CascadeTruncated`, skip; else emit `TriggerFired`, add id to guard, execute response
  at `depth+1`, remove id.
- `executeResponse(response, context, ...)`: **deal-damage** → resolve `ResponseTarget`
  (`self`/`triggering-source`/`triggering-ally`/`all-enemies`/`{selector}`) → the **same**
  `calculateDamage` + `applyDamageAndEmit` path (real formula, min-1 floor); **apply-stat-modifier**
  → append effect + `clampHpToEffectiveMax` + emit `StatModifierApplied`; **apply-status** →
  `applyStatus` (Slice C stub here); **suppress-action** → return `suppressed:true`.
- `applyDamageAndEmit(sourceId, target, damage, damageSource, state, events, cascade)` — **moves
  here** from combat.ts, gains hook firing. **Pinned order after the hit lands:**
  1. apply HP, emit `DamageDealt` (with `damageSource`).
  2. fire `on-damage-dealt`(source) — **unconditionally, including on a lethal hit** (the attacker
     dealt the damage regardless of whether the target survived).
  3. if the target **survived**: fire `on-damage-taken`(self, ctx `{source, amount}`).
  4. if the target **died**: emit `CreatureDied` → fire `on-death`(self) → `on-kill`(source) →
     `on-ally-death`/`on-enemy-death`(observers). **Death pre-empts the victim's `on-damage-taken`.**
  Hit-reactions (dealt/taken) resolve before death-reactions (died/kill/observers) — a stable,
  hand-derivable order for goldens.

**`combat.ts` wiring:** `firePhaseHook` calls become `fireHook` with the new signature (thread
`{state,events}`; construct a fresh `cascade` per top-level action/hook). `on-turn-start`
firing now returns `suppressed` — resolveTurn skips the action (empty bracket, TurnStarted/
TurnEnded still emit) when true — this is exactly how **Stun** works, no special branch.
Action executors (`executeAttack`/`executeCastSingle`/`executeCastAoe`) call the relocated
`applyDamageAndEmit` with the correct `damageSource`.

**Trait content (B):** a triggered **retaliate** (`on-damage-taken → deal-damage @
triggering-source, 30% Attack`), a triggered **apply-stat-modifier** (`on-fight-start` or
`on-ally-death → +Attack self`). `TriggerFired {sourceId, hook, effectId}` — **`ASSUMPTION:`
`effectId` is the stable *definition* id (traitId/statusId), not the opaque instance id** (human/
golden-legible).

**Tests (B):** unit per response type; re-entry guard blocks a self-retaliation loop; a
constructed >500 chain asserts deterministic truncation + `CascadeTruncated`. **Goldens:**
`golden-triggered-damage` (retaliate → `TriggerFired` precedes its `DamageDealt`), one
`golden-loop-safety` (self-trigger blocked / cascade truncated).

---

## Slice C — Status lifecycle, round-end sweep, has-status, spell statuses

**Statuses (`effects.ts` + `data/statuses.ts`):**
- Status = a timed `ActiveEffect` carrying `statusId`, `remainingDuration`, `stacks`, `cap`.
  **Single instance per (statusId, creature)**; re-apply refreshes duration + increments stacks
  to the status's **declared cap**. Content: **Poison/Burn** (DoT), **Regen** (HoT), **Stun**
  (condition-status, `on-turn-start` suppress-action), **Weaken** (damage-modifier dealt −%),
  **Vulnerability** (damage-modifier taken +%). All data instances of the built primitives.
- `applyStatus` → emit `StatusApplied {targetId, statusId, stacks, duration, sourceId?}` → fire
  `on-status-applied` (event-before-hook).
- **DoT/Regen** = `on-round-end` triggered effects with **special emission**: the deal-damage
  response gains `damageSource:'dot'` + `bypassDefence:true` + `emitTriggerFired:false` (a DoT
  tick emits a `'dot'`-tagged `DamageDealt` and **no `TriggerFired`**); Regen emits
  `HealApplied {sourceId, targetId, amount, remainingHp}` (clamped to effective max, no auto-heal
  past it).

**Damage-modifier pools wired (Slice C):** the damage paths gather pools from effects —
`gatherDealtMods(attacker)` (dealt damage-modifiers) into `dealtMods`; `gatherTakenFactors(defender)`
(taken damage-modifiers) appended alongside Defend's existing `×0.65` in `resolveDefenceAndTakenFactors`.
**Defend stays resolver-inline** (transient — cannot be a permanent stat-modifier), which the new
"no temporary stat-modifier" rule makes mandatory, not incidental.

**Round-end 3-step sweep (`combat.ts`, replaces the single `firePhaseHook('round-end')`):**
1. **Snapshot** statuses present at sweep start (per creature).
2. Fire all `on-round-end` hooks, all creatures, **tie-break order** (incl. DoT ticks; cascades
   incl. `on-death` resolve fully; a creature killed mid-sweep fires only `on-death`, its own
   not-yet-reached ticks skipped).
3. **Decrement** durations — snapshot statuses only.
4. **Expire** snapshot statuses at 0 → emit `StatusExpired {creatureId, statusId}`.
5. **Win/loss checked once, after the full sweep** — the round-end block gains a `finalize` path
   (a DoT can wipe a side at round-end). Statuses born mid-sweep keep full duration, count from
   next round-end.

**`has-status` (completes the Phase 2 deferral):** add `HasStatusCondition {kind:'has-status',
subject:'self'|'ally'|'enemy', statusId:string}` to `scripting-types.ts`; add the case to
`conditions.ts` (pure, no RNG; existential over the subject pool; matches a **literal statusId**;
scopes to status-carrying effects — condition-status + timed damage-modifier — **not**
stat-modifiers).

**Spell-applied statuses:** `Spell` gains `appliesStatus?: StatusSpec`; after a Cast's damage,
apply it to the target(s). Add one demo spell that applies a DoT so it's exercised.

**Tests (C):** status stacking / duration countdown / expiry; Stun skips a turn via the empty
bracket; `has-status` true/false per subject; damage-modifier statuses shift the pools; Regen
`HealApplied` clamp. **Goldens:** `golden-dot` (round-end tick → countdown → expiry), `golden-stun`
(skip via empty bracket), and the **`golden-round-end-interaction`** (a DoT tick kills a creature
mid-sweep whose `on-death` applies a status: assert `on-death` fires, the dead creature's own
pending tick is skipped, the new status keeps full duration / starts next round, win/loss checked
after the full sweep).

---

## Out of scope (per ROADMAP)

- **Phase 3.5 demo** — separate PR after Phase 3, own brief/record.
- **Artifacts / gems / infusions / augments** economy — Phase 8 (the framework they plug into is
  what's built here).
- **Behavioral traits** (extra actions, turn-order edits, scripting-option unlocks) — deferred
  past v1.
- Real creature/species roster — GAME_DESIGN §13, still deferred; Phase 3 trait/status content is
  representative & temporary.

## Verification

- `npm run test`, `npm run lint`, `npm run format:check`, `npm run build` — the four CI gates;
  green locally = green in CI. Run at the end of **each slice**, not just at the end.
- **Regression proof (Slice A):** the 4 Phase-1 + 7 Phase-2 goldens differ **only** by the added
  `damageSource` field — confirm via diff that no value/ordering changed.
- **Golden discipline:** focused goldens (`golden-conditional-passive`, `-triggered-damage`,
  `-loop-safety`, `-dot`, `-stun`, `-round-end-interaction`) are **hand-derived** (expected log
  computed by hand / via a bare `node -e` calculator, never by running the resolver and pasting).
  Any larger integration golden is **explicitly labeled** generated-then-checkpoint-verified.
- **Loop safety is asserted, not assumed:** an explicit self-trigger-blocked test and a >500
  cascade-truncation test with a `CascadeTruncated` assertion.
- Post-implementation: run `/verify` to drive a scripted fight with a triggered trait + a DoT and
  confirm the event log reads correctly end-to-end.

## Assumptions checklist (review before implementation)

1. **(agreed)** Effects live on `Creature.activeEffects` (+ `innateTraitIds`), threaded via
   `updateCreature`; instantiated from the trait registry at `createCombat`.
2. **(agreed)** `resolution.ts` holds the mutually-recursive `fireHook` / `executeResponse` /
   `applyDamageAndEmit` core; `updateCreature`/`getCreature` move to `creature-lookup.ts` to
   avoid a combat↔resolution cycle.
3. **(agreed)** Three slices: A folding+passives → B triggers+cascade → C statuses+sweep.
4. `EffectInstanceId` is deterministic (`creatureId#traitId#ordinal`), never RNG.
5. `CascadeState` (depth + re-entry `Set`) is transient/call-stack, never in `CombatState`;
   `MAX_TRIGGER_CASCADE_DEPTH = 500` new config.
6. `fireHook` returns `{state, suppressed}`; `suppressed` is only meaningful for `on-turn-start`
   (Stun). No special resolver branch for Stun.
7. **(decided)** Damage-path hook order after `DamageDealt`: `on-damage-dealt`(source,
   **unconditional**) → `on-damage-taken`(self, survived-only) → if died: `CreatureDied` →
   `on-death` → `on-kill` → `on-ally-death`/`on-enemy-death`. Hit-reactions before death-reactions.
8. Conditional-passive predicate = self-only `(creature)=>boolean` reading other effective stats
   (not the gated stat). **This is the one deliberately non-serializable spot** — acceptable because
   traits are compiled `src/data/` TS content and conditional passives live on innate traits (not
   saved per-instance state). If traits ever become runtime/moddable data, convert the predicate to
   a declarative `Condition`-like structure.
9. `TriggerFired.effectId` = stable definition id (traitId/statusId), not the instance id.
10. **(decided)** Health-debuff `currentHp` clamp is surfaced by a dedicated
    `HpClamped {creatureId, previousHp, newHp, effectiveMaxHealth}` event, emitted **only when the
    clamp moves `currentHp`**, ordered `StatModifierApplied → HpClamped`. Health buffs emit no
    `HpClamped` (no auto-heal).
11. DoT/Regen = `on-round-end` triggered effects with special emission (dot `DamageDealt` /
    `HealApplied`, no `TriggerFired`); deal-damage response gains `damageSource` + `bypassDefence`
    + `emitTriggerFired` flags.
12. `has-status` scopes to status-carrying effects (condition-status + timed damage-modifier),
    matched by literal `statusId`; ally/enemy existential.
13. Statuses: single instance per (statusId, creature), stack to declared cap, refresh duration
    on re-apply.
14. Defend stays resolver-inline (not modeled as an effect) — required by "no temporary
    stat-modifier."
15. `createCombat` sets `currentHp = effective max Health` at fight-start (== base for trait-less
    creatures, preserving existing goldens).
16. `damageSource` required; all 26 golden `DamageDealt` literals field-added in Slice A
    (field-addition-only, diff-verified).
17. Representative-only trait/status content (replaced when the real roster lands, Phase 4+).
18. `Spell.appliesStatus?` added for spell-applied statuses; one demo DoT spell.
