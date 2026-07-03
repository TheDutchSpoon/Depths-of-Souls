# Phase 3 — Traits, statuses & the effect framework

Status: **in progress — shipped in three slices/PRs.** Slice A **complete and locally verified**
(169/169 tests, lint, format, build green); Slices B and C pending. Built per the approved plan at
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
- **Slice B — triggered hooks & cascade safety** (`resolution.ts`, the recursion core). *Pending.*
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

## Next

Slice B — triggered hooks & cascade safety. See `.claude/briefs/phase-3-implementation-plan.md`.
