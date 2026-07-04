# Phase 3 — Traits, statuses & the effect framework

Status: **done — shipped in three slices/PRs**, all **complete and locally verified**
(A: 169/169; B: 183/183; C: 206/206 tests; all lint/format/build green). Built per the approved
plan at
`.claude/briefs/phase-3-implementation-plan.md` (kept there for the detailed rationale, the
slice/PR sequencing, and the full `ASSUMPTION:`-tagged decision list behind every choice below —
not duplicated here).

## Why three slices

Phase 3 activates the effect-framework seams left dormant since Phase 1 (`getEffectiveStat`/
`getOffensiveStat` passthroughs, the `firePhaseHook` no-op, the empty `dealtMods`/`takenFactors`
pools). "Activate the seams" understates it: **7 of the 13 hooks fire from inside the damage path**,
which makes damage-application the load-bearing recursion + cascade-safety surface. So the phase
ships as three independently-mergeable PRs, each leaving `main` green and deployable:

- **Slice A — effect folding, remap & passive traits** (this record's first section). No hook firing.
- **Slice B — triggered hooks & cascade safety** (`resolution.ts`, the recursion core).
- **Slice C — status lifecycle, round-end sweep, `has-status`, spell-applied statuses.**

Sequential branch-off: B branches off post-A `main`, C off post-B `main`, so B/C never carry a
stale pre-`damageSource` schema.

---

## Slice A — Effect folding, remap & passive traits

Makes the stat seams real (passive `stat-modifier` + `stat-remap`, folded on read), and front-loads
the schema so B/C never re-touch `types.ts`. No triggers, no statuses, no hook firing yet.

### What was built

New files under `src/engine/`:
- `effect-types.ts` — the framework's type surface: `EffectInstanceId` (deterministic brand),
  the `ActiveEffect` union (`stat-modifier` + `stat-remap` for now — grows in B/C), `EffectDef`,
  `Trait`, and the **front-loaded** forward surface used by later slices (the 13-member `Hook`
  union, `ResponseTarget`, `EffectResponse`, `StatusSpec`, `ActivationPredicate`).
- `effects.ts` — pure helpers: `instantiateTraitEffects` (resolves `innateTraitIds` against the
  registry into `ActiveEffect`s with deterministic `creatureId#traitId#ordinal` ids, canonical
  order), `effectiveMaxHp` (folded + floored), `clampedHp`.
- `effects.test.ts` — instantiation (ids, ordering, unknown-id skip, trait-less) + HP helpers.

New content under `src/data/`:
- `traits.ts` — `TRAIT_REGISTRY` + representative Phase-3 trait content: `BRUTISH` (flat +30%
  Attack), `BLOODLUST` (conditional +25% Attack at full HP), `SWIFT_STRIKER` (Speed-as-Attack
  remap). Representative & temporary — replaced when the real roster lands (Phase 4+).
- `traits.test.ts` — one behavioral sanity check per stock trait.

Extended (`src/engine/`):
- `types.ts` — `Creature` gains `innateTraitIds` + `activeEffects`; `DamageDealt` gains the
  **required** `damageSource: 'attack' | 'cast' | 'dot'`; the full new event union is front-loaded
  (`TriggerFired`, `StatusApplied`, `StatusExpired`, `StatModifierApplied`, `HpClamped`,
  `HealApplied`, `CascadeTruncated`), emitted in the slice that owns each mechanism.
- `effective-stats.ts` — `getEffectiveStat` folds `stat-modifier` effects multiplicatively
  (`base × Π(factors)`), including a conditional passive's read-time predicate; `getOffensiveStat`
  resolves `stat-remap` (last-writer-wins in canonical order) before reading the effective stat.
- `creature-lookup.ts` — `getCreature` + `updateCreature` **relocated here** from `combat.ts`
  (the patch type gains `activeEffects`), so Slice B's `resolution.ts` can reuse them without a
  `combat ↔ resolution` import cycle. A behavior-preserving move — proven by byte-identical goldens.
- `combat.ts` — `createCombat` gains a `traits` param, instantiates each creature's innate effects
  into `activeEffects`, and initializes `currentHp` to effective max Health at fight-start;
  `applyDamageAndEmit` gains a `damageSource` param threaded from the attack/cast call sites.
- `config.ts` — `MAX_TRIGGER_CASCADE_DEPTH = 500` (declared now; enforced in Slice B).
- `__fixtures__/creatures.ts` — `makeCreature`/`CreatureOverrides` default the two new `Creature`
  fields.

Compile-compat (the `Creature` type + `CombatEvent` union changed, so these had to land in A):
- `effective-stats.test.ts` — inline `Creature` literal gains the new fields; plus new folding/
  remap test blocks.
- `src/app/demoFight.ts` — all 10 hardcoded `Creature` literals gain `innateTraitIds`/`activeEffects`.
- `src/ui/CombatDemo.tsx` — `describeEvent`'s exhaustive switch gains one case per new event type
  (unreached in A's demo, but required for the widened union to compile).

### The `damageSource` golden churn (field-addition-only)

`damageSource` is **required** on `DamageDealt`, so all **26** `DamageDealt` literals across the 10
existing golden fixtures were field-added — attack damage → `'attack'`, cast damage → `'cast'`. This
is a **deliberate, reviewed schema update**, not a reflexive regenerate: the `git diff` was verified
to show *only* the added field, with the sole removals being the intentional `Readonly<Record>` →
`Partial<Record>` annotation relaxation on `golden-6v6-scripted`'s sparse event-count map (its values
unchanged). All Phase 1/2 goldens then pass **byte-identical** against the real emitted `damageSource`.

### New golden (hand-derived)

`golden-conditional-passive` — HERO carries `BLOODLUST`; at full HP its effective Attack is
`20 × 1.25 = 25`, so its first hit lands 17; after taking damage the predicate goes false and Attack
folds back to 20, so its next hit lands only 12. The 17-vs-12 gap, with no explicit state change,
pins **read-time stat folding** end-to-end through `createCombat`/`resolveFight`. Expected values were
hand-derived via an independent `node -e` calculator (not by running the resolver), per the golden
discipline; matched on the first run.

### Verification performed

- `npm run test` — 169/169 pass (26 files; +20 over Phase 2's 149).
- `npm run lint` / `npm run format:check` — clean.
- `npm run build` — `tsc -b && vite build` succeeds.
- All four are the exact CI gates. The relocation + `createCombat` instantiation/HP-init are proven
  behavior-preserving by the untouched Phase 1/2 goldens.

### Deliberately out of scope for Slice A (later slices / phases)

Triggered hooks and the cascade/loop-safety core (`resolution.ts`, Slice B); the status lifecycle,
round-end sweep, `has-status`, and spell-applied statuses (Slice C); artifacts/gems economy (Phase 8);
behavioral traits (post-v1); the real creature roster (GAME_DESIGN §13, still deferred). The Phase 3.5
demo is a separate PR after the full phase.

---

## Slice B — Triggered hooks & cascade safety

Turns the dormant hook seams into a real, mutually-recursive dispatcher. The damage-application
path becomes the site where 7 of the 13 hooks fire, so this is the load-bearing correctness slice.

### What was built

New file `src/engine/resolution.ts` — the trigger/cascade core:
- **`fireHook(hook, selfIds, source, state, events, cascade)`** — scoped dispatch: the caller
  passes a single creature (per-creature point) or a tie-break-ordered id list (global point).
  Alive-gated — only `on-death` fires on a dead creature. Looks effects up via `effectsForHook`.
  Returns `{ state, suppressed }` (`suppressed` is meaningful only for `on-turn-start` / Stun).
- **`applyDamageAndEmit`** — **relocated here** from `combat.ts` and now fires the damage-path
  hooks in the pinned order: `DamageDealt` → `on-damage-dealt` (source, **unconditional, even on a
  lethal hit**) → `on-damage-taken` (self, **survived only** — death pre-empts it) → if it died:
  `CreatureDied` → `on-death` → `on-kill` → `on-ally-death`/`on-enemy-death` (living observers).
- **`dealDamage`** — the shared real-formula path (OffStat, affinity, pools, min-1) used by *both*
  chosen Attack/Cast (from `combat.ts`) and triggered deal-damage responses — "attack"/"cast" in a
  trait are the real actions. `resolveDefenceAndTakenFactors` (Defend) moved here alongside it.
- **`executeResponse`** — the v1 response vocabulary: `deal-damage`, `apply-stat-modifier`
  (appends the modifier, emits `StatModifierApplied` with concrete before/after, and `HpClamped`
  when a Health debuff pulls `currentHp` below the new max), `suppress-action`, and an
  `apply-status` stub that throws until Slice C.
- **`CascadeState`** — `{ depth, activeInstances }`, transient/call-stack only (never in
  `CombatState`). The stack-scoped self-re-entry guard skips an instance already unwinding;
  `MAX_TRIGGER_CASCADE_DEPTH` bounds chain depth, emitting a mandatory `CascadeTruncated` and not
  executing the over-cap trigger.

Extended:
- `effect-types.ts` — `TriggeredDef` / `TriggeredEffect` added to `EffectDef` / the `ActiveEffect`
  union, including an optional **`condition?: Condition`** (reusing the serializable scripting
  `Condition` union — triggered conditions are data, not a bespoke predicate). `fireHook` evaluates
  it **self-scoped against live state** (per-effect loop order: re-entry guard → condition →
  depth cap → `TriggerFired` → response); a false condition fires nothing and consumes none of the
  truncation budget. Content: `VENGEFUL` (retaliate only while self HP% < 50). **Bounded deferral:**
  the reused union is self/global-scoped, so it cannot yet reference the triggering *source* (e.g.
  "retaliate only if the attacker is Body"); that needs a hook-context condition variant, added when
  content requires it.
- `effects.ts` — `effectsForHook(creature, hook)` (scan-and-filter, canonical order); `withInstance`
  gains the `triggered` case.
- `combat.ts` — `applyDamageAndEmit`/`resolveDefenceAndTakenFactors` removed (now in
  `resolution.ts`); executors slimmed to emit their intent event then delegate to `dealDamage`;
  `resolveTurn` fires `on-fight-start`/`on-turn-start`/`on-turn-end`/`on-round-end` via `fireHook`
  (a fresh `CascadeState` per top-level action/hook), with `on-turn-start`'s `suppressed` result
  skipping the action — that is exactly how **Stun** works, no special resolver branch. Lifecycle
  events now precede their hook (`FightStarted`/`TurnStarted` before the hook fires); the
  no-op-in-B `round-start`/`fight-end` hook calls were dropped (no such hooks in the v1 vocab).
- `phase-hooks.ts` — **deleted** (its `firePhaseHook` no-op is fully replaced by `fireHook`).
- `data/traits.ts` — triggered content: `RETALIATE` (on-damage-taken → 30% Attack at the
  attacker), `GRUDGE` (on-ally-death → +50% Attack to self), `RECKLESS` (on-damage-taken → 30%
  Attack at *itself*, for the loop-safety golden), `VENGEFUL` (the conditional one above).
- `resolution.ts` `applyStatModifier` — a per-target application ordinal folded into the applied
  modifier's `EffectInstanceId`, so re-stacking the same modifier (e.g. Grudge on multiple ally
  deaths) yields distinct, deterministic ids (effect identity must be unique; Slice C's statuses
  lean on it). Folding still stacks multiplicatively.

### A correctness insight worth recording

Mutual retaliation between two creatures (A↔B, both `RETALIATE`) is **bounded to depth 2 by the
re-entry guard itself**: A hits B → B retaliates A → A retaliates B → B's retaliate would fire
again, but B's instance is still unwinding on the stack, so the guard blocks it. With ≤12 creatures
and this stack-scoped guard, a real fight can **never nest 500 deep** — `MAX_TRIGGER_CASCADE_DEPTH`
is a pure backstop, unreachable through normal play. So the depth cap is tested **white-box** (fire
a hook with `cascade.depth` pre-set at the cap, same style as the Phase 1 round-cap test), while the
guard's loop-bounding is tested through a real fight.

### Verification performed

- `npm run test` — **183/183** pass. The **169 prior tests pass byte-identical** — the
  `applyDamageAndEmit` relocation + new hook firing (and the condition/instance-id refinements)
  changed no existing behavior (this is Slice B's explicit merge blocker).
- `npm run lint` / `npm run format:check` / `npm run build` — clean.
- Three hand-derived goldens (independent `node -e` calculator, matched first run):
  `golden-triggered-damage` (`TriggerFired` precedes the retaliation's `DamageDealt`; the **lethal
  hit fires no retaliation** — death pre-empts `on-damage-taken`), `golden-loop-safety` (the
  self-re-entry guard: `RECKLESS` fires once per hit, never loops), and `golden-conditional-trigger`
  (`VENGEFUL` stays silent while healthy, fires once a hit crosses below 50%, none on the kill).
- Unit coverage (`resolution.test.ts`): every response type, the re-entry guard, the white-box
  depth-cap truncation, suppress-action, `StatModifierApplied`/`HpClamped`, the triggered condition
  (true/false), and re-stacked-modifier id uniqueness + multiplicative folding.

### Deliberately out of scope for Slice B (Slice C)

Status lifecycle + the round-end snapshot→tick→decrement→expire sweep; `has-status`; spell-applied
statuses; DoT/Regen/Stun/Weaken/Vulnerability content. The `apply-status` response is a stub that
throws until then. Three hook fire-sites remain unwired — `on-ally-action`, `on-enemy-action`
(no content needs them yet), `on-status-applied` (Slice C) — all additive and golden-safe to add
where the resolver already reaches.

---

## Slice C — Status lifecycle, round-end sweep, `has-status`, spell-applied statuses

Completes the effect framework: timed statuses (DoT/Regen/Stun/Weaken/Vulnerability), the
round-end snapshot→tick→decrement→expire sweep with its own win-check, `has-status` (completing
the Phase 2 deferral), and spell-applied statuses.

### What was built

**Two new `ActiveEffect` categories** (`effect-types.ts`), completing GAME_DESIGN §6's four-category
taxonomy (`stat-modifier`/`stat-remap` from Slice A, these two from C):
- **`condition-status`** (`ConditionStatusDef`/`Effect`) — DoT, Regen, Stun. Fires a `response` on
  a `hook`, the *same* dispatch machinery as a permanent triggered trait, plus live
  `remainingDuration`/`stacks` bookkeeping. `effectsForHook` was broadened to match both
  `TriggeredEffect` and `ConditionStatusEffect` uniformly.
- **`damage-modifier`** (`DamageModifierDef`/`Effect`) — Weaken/Vulnerability. Read **passively**
  by the damage formula's pools (never fired via a hook), analogous to how `stat-modifier` is read
  passively by `getEffectiveStat`.

**`EffectResponse` gained two things** it needed to express DoT/Regen honestly:
- **`flatAmount?` on `deal-damage`** — a fixed per-stack magnitude, independent of any stat,
  bypassing the OffStat/Defence/affinity/pools formula *entirely* (not merely zeroing Defence).
  This is GAME_DESIGN's "own value from the source" read literally: DoT is not "Attack scaled,
  minus Defence" but a flat number a status carries. The unused, never-implemented `bypassDefence`
  field from Slice A/B is retired in favor of this (its presence/absence is the mode switch;
  `offStat`/`spellPower` became optional so existing formula-mode traits are unaffected).
- **A new `heal` response kind** — Regen's HoT, structurally parallel to `deal-damage`'s flat mode.

**`effects.ts`** gains `gatherDealtMods`/`gatherTakenFactors` (read the damage-modifier pool
contributions: dealt is additive `magnitude × stacks`, taken is multiplicative `magnitude ** stacks`),
`hasStatus`, and `instantiateStatus`.

**`resolution.ts`**:
- **`applyStatus`** (new, exported) — single instance per (statusId, creature); re-applying
  refreshes duration to the new application's value and increments stacks to the status's declared
  cap. Emits `StatusApplied`, then fires `on-status-applied` (event-before-hook).
- **`applyFlatDamage`**/**`applyHeal`** (new, private) — the flat-DoT and Regen execution paths.
  `applyFlatDamage` still routes through `applyDamageAndEmit`, so a DoT tick fires the *same*
  damage-path hooks (`on-damage-dealt`/`-taken`/`-death`/`-kill`/…) as any other damage source.
  `applyHeal` clamps to effective max Health — no auto-heal past it.
- **`dealDamage`** now gathers `gatherDealtMods(attacker)`/`gatherTakenFactors(target)` into the
  formula's pools, alongside Defend's existing factor (Defend itself stays resolver-inline, never
  modeled as an effect — required by "no temporary stat-modifier").
- **A real correctness fix in `fireHook`**: the alive-check is now re-evaluated **fresh before every
  individual effect**, not once per creature before its whole effect list. Slice B's version
  snapshotted `self` once per creature; if that creature's *first* on-round-end effect killed it,
  a *second* effect in the same list (e.g. one that would hit someone else) would still have fired
  — silently wrong, and exactly the case GAME_DESIGN's round-end-interaction rule warns about
  ("a creature killed mid-sweep fires only on-death; its own not-yet-reached on-round-end hooks…
  are skipped"). Caught while building `golden-round-end-interaction`, fixed before it shipped.

**`combat.ts`**: `createCombat` gains a 6th `statuses` param (`ReadonlyMap<string, StatusDef>`,
mirroring `scripts`/`traits`); `executeCastSingle`/`executeCastAoe` apply `spell.appliesStatus` to
a surviving target after damage lands. The single `fireHook('on-round-end', …)` call is replaced
by the full **round-end sweep**: `resolveRoundEndSweep` — (1) `snapshotStatuses` (every
status-carrying effect present *before* anything fires), (2) fire all `on-round-end` hooks in
tie-break order, (3)+(4) `decrementAndExpireSnapshot` — decrement and expire **only** the
snapshotted statuses, so a status **born mid-sweep** (e.g. from an `on-death` response) is
untouched and keeps full duration, counting from the *next* round-end. **Win/loss is now checked
once, immediately after the full sweep** — a real fix, not just documentation: previously a
lethal round-end DoT would let a wiped side's opponent take one more unwarranted turn before the
result was noticed (the round-cap-style "check before proceeding" pattern, applied here for the
same reason).

**`scripting-types.ts`/`conditions.ts`**: `HasStatusCondition` (`subject` + literal `statusId`)
completes the Condition union deferred since Phase 2. `evaluateCondition`'s internal
`hpPercentPool` helper was renamed `subjectPool` (now shared by both `hp-percent` and
`has-status`, since both are subject-pool existentials over self/ally/enemy).

**Content** (`data/statuses.ts`, new): `POISON`/`BURN` (flat DoT, 3/5 per stack, no `TriggerFired`),
`REGEN` (flat HoT, 4/stack), `STUN` (on-turn-start suppress-action, cap 1), `WEAKEN` (-20%
dealt/stack, cap 1), `VULNERABILITY` (×1.5 taken/stack, cap 2). `data/traits.ts` adds `REELING`
(on-damage-taken → self-stun) and `CATASTROPHIC_COLLAPSE` (the round-end-interaction exerciser: a
lethal self-hit, a would-be ally-hit that must be skipped, and an on-death apply-status — all on
one trait). `data/spells.ts` adds `VENOM_BOLT` (applies Poison), per CONVENTIONS' "Spell gains an
optional status-application."

### New goldens (hand-derived, matched on first run after one fixture-authoring bug)

- **`golden-dot`** — `VENOM_BOLT` applies Poison via a real Cast; three flat, stack-scaled
  round-end ticks (no `TriggerFired`); the third tick both kills the target and expires the status
  in the same sweep; win/loss checked right after.
- **`golden-stun`** — `REELING` applies Stun on the first hit; the victim's *very next* turn (same
  round) is an empty `TurnStarted`/`TurnEnded` bracket — no special resolver branch, the Phase 1
  skip signal reused exactly. The killing blow next round does **not** re-stun (death pre-empts
  `on-damage-taken`, Slice B's rule, reused here for free).
- **`golden-round-end-interaction`** — the fixture built to *prove* the `fireHook` fresh-alive-check
  fix: `CATASTROPHIC_COLLAPSE`'s self-kill effect fires first, its sibling ally-hit effect is
  skipped (dead by the time the loop reaches it), its `on-death` effect fires regardless and
  applies Weaken to an ally, and that Weaken — born mid-sweep — is confirmed absent from *that*
  sweep's decrement (verified by its full duration surviving into the next round) while still
  affecting damage immediately.

One fixture-authoring bug caught before any of these ran: `golden-dot`'s `TARGET` used
`scriptId: 'always-wait'` but the fixture only registered its own custom script in the `scripts`
map, not the stock scripts — so the lookup missed, fell back to the implicit default, and `TARGET`
attacked instead of waiting. Fixed by merging `STOCK_SCRIPTS_BY_ID` into the fixture's script map.

### PR #22 amendments (two items, landed before merge)

**1. `DamageDealt` carries the causing status's identity.** Per GAME_DESIGN's event contract
("`damageSource` … + the status identity for DoT"), `DamageDealtEvent` gains an optional
`statusId?: string` — present only when a firing `condition-status` produced the hit, absent for
attack/cast and for a *trait's* own `dot`-tagged flat hit (`damageSource` is the damage *flavor*;
`statusId` is the causing *status*, a narrower thing — `CATASTROPHIC_COLLAPSE`'s self-kill is
`'dot'`-flavored but carries no `statusId`, since it's a triggered trait, not a status).
Threaded exactly like `stacks` already was: derived in `fireHook` from the firing effect
(`condition-status` → its `statusId`; anything else → `undefined`), carried on `HookContext`,
passed through `dealDamage`/`applyFlatDamage`/`applyDamageAndEmit`. Because the field is optional
and `toEqual` treats an explicit `undefined` the same as an absent key, **every existing golden
needed zero changes** — confirmed by running the full suite before touching `golden-dot` (only
that one fixture failed, on the two DoT ticks; `golden-stun` and `golden-round-end-interaction`
stayed green untouched). `golden-dot`'s two `dotTick(...)` events gained `statusId: 'poison'`; a
new `resolution.test.ts` case confirms attack/cast `DamageDealt` carry no `statusId`.

**2. Round-end sweep: a status (re)applied *during* its own sweep keeps full duration.** A real,
previously-dormant bug: `applyStatus`'s refresh path reuses the same `instanceId`, so a status
*already in* the snapshot that got refreshed by an `on-round-end` response firing *during* the
same sweep would still get decremented by that sweep's step (3) — wrongly taking a
just-refreshed duration down by one. Not reachable by any v1 content (confirmed: nothing
re-applies a snapshotted status mid-sweep), but a correctness lock worth adding now rather than
after some future status does. Fixed by deriving the "reapplied this sweep" set directly from the
`StatusApplied` events `fireHook`'s own firing step just produced (`resolveRoundEndSweep` scans
`events` from where the sweep's firing started), rather than threading a mutable set through
`applyStatus`/`fireHook`/`executeResponse` (which would otherwise burden the non-sweep spell-cast
caller too). `StatusSnapshotEntry` gained a `statusId` field; `decrementAndExpireSnapshot` skips
any `(creatureId, statusId)` pair present in that set. Verified the fix is load-bearing (not
inert) by temporarily disabling the skip and confirming a new synthetic `combat.test.ts` case
fails as expected (`remainingDuration` wrongly drops from 5 to 4) before restoring it.

Both items verified byte-identical against every existing golden except `golden-dot` (which was
itself authored fresh in this same PR, so its `statusId` field is a birth, not a modification).

### Verification performed

- `npm run test` — **206/206** pass (+2 over the PR's original 204: the `statusId` assertion and
  the sweep-refresh synthetic test). The prior goldens pass byte-identical — confirmed via
  `git status`: only `golden-dot.fixture.ts` shows as modified among `__golden__/*`.
- `npm run lint` / `npm run format:check` / `npm run build` — clean.

### A resolved forward note (from Slice B's PR review)

Slice B flagged that `applyStatModifier`'s count-based ordinal (`#applied#…#<ordinal>`) could
collide if a stat-modifier were ever *removed* and its slot's count reused. Confirmed moot for C:
Slice C's only removal path is `StatusExpired` on `condition-status`/`damage-modifier` effects
(which use the unrelated `#status#<statusId>` id scheme, no ordinal at all, single-instance by
construction). No stat-modifier removal path exists anywhere in Slice C, so the dormant risk
remains dormant — noted here for whoever eventually adds one.

### Deliberately out of scope (Phase 4+)

Real creature/species content (GAME_DESIGN §13, still deferred) — all trait/status content in
Phases 3A–C is representative and temporary, replaced once the roster is designed. Artifacts/gems
economy (Phase 8). `on-ally-action`/`on-enemy-action` remain unwired (no content needs them yet;
additive and golden-safe to add later). The Phase 3.5 demo is a separate PR, next.

## Next

Phase 3.5 — the traits/statuses visual demo (interlude), then Phase 4 (party, specializations,
the cave & biomes). See `ROADMAP.md`.
