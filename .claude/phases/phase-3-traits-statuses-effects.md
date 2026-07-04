# Phase 3 — Traits, statuses & the effect framework

Status: **in progress — shipped in three slices/PRs.** Slices A and B **complete and locally
verified** (A: 169/169 tests; B: 178/178 tests; both lint/format/build green); Slice C pending.
Built per the approved plan at
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
- **Slice C — status lifecycle, round-end sweep, `has-status`, spell-applied statuses.** *Pending.*

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
  union.
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
  Attack at *itself*, for the loop-safety golden).

### A correctness insight worth recording

Mutual retaliation between two creatures (A↔B, both `RETALIATE`) is **bounded to depth 2 by the
re-entry guard itself**: A hits B → B retaliates A → A retaliates B → B's retaliate would fire
again, but B's instance is still unwinding on the stack, so the guard blocks it. With ≤12 creatures
and this stack-scoped guard, a real fight can **never nest 500 deep** — `MAX_TRIGGER_CASCADE_DEPTH`
is a pure backstop, unreachable through normal play. So the depth cap is tested **white-box** (fire
a hook with `cascade.depth` pre-set at the cap, same style as the Phase 1 round-cap test), while the
guard's loop-bounding is tested through a real fight.

### Verification performed

- `npm run test` — **178/178** pass (+9 over Slice A: 5 in `resolution.test.ts`, 2 goldens, 2 trait
  shape tests). The **169 prior tests pass byte-identical** — the `applyDamageAndEmit` relocation +
  new hook firing changed no existing behavior (this is Slice B's explicit merge blocker).
- `npm run lint` / `npm run format:check` / `npm run build` — clean.
- Two hand-derived goldens (independent `node -e` calculator, matched first run):
  `golden-triggered-damage` (`TriggerFired` precedes the retaliation's `DamageDealt`; the **lethal
  hit fires no retaliation** — death pre-empts `on-damage-taken`) and `golden-loop-safety` (the
  self-re-entry guard: `RECKLESS` fires once per hit, never loops).

### Deliberately out of scope for Slice B (Slice C)

Status lifecycle + the round-end snapshot→tick→decrement→expire sweep; `has-status`; spell-applied
statuses; DoT/Regen/Stun/Weaken/Vulnerability content. The `apply-status` response is a stub that
throws until then. Three hook fire-sites remain unwired — `on-ally-action`, `on-enemy-action`
(no content needs them yet), `on-status-applied` (Slice C) — all additive and golden-safe to add
where the resolver already reaches.

## Next

Slice C — status lifecycle, round-end sweep, `has-status`, spell-applied statuses. See
`.claude/briefs/phase-3-implementation-plan.md`.
