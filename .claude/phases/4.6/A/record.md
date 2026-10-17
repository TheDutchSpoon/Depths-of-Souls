# Record — Phase 4.6 — Slice A: Engine hardening

**Status: built.** Golden policy byte-identical with two listed exceptions: `golden-round-end-interaction`
gains one `TriggerFired`, and three goldens move non-fresh creature state into their `setup` step
with expected values unchanged. Corpus digest untouched. 2411 tests passed, 1 skipped (net +176
against `main`; 261 files, +4).

## What was built

- **Fight setup checks its input.** `createCombat` throws on a `scriptId` not in the registry (`null`
  stays valid; an omitted registry is empty), on a creature that isn't fresh (`alive: false`,
  `defending`, `provoking`, a non-zero `defendCount` or `revivesUsed`, besides non-empty
  `baselineEffects`/`activeEffects`), on a side whose slots aren't unique integers within 0–5 in
  ascending array order, and on one id twice across both sides. `currentHp` is not checked. The
  party size is `PARTY_SIZE` in `engine/config.ts`; the store re-exports it. The side effects it is
  given go through the same validator as a trait.
- **One effect-list validator.** `validateEffectList(defs, label, 'status' | 'permanent')` in
  `effect-types.ts` is called by `validateTrait`, `validateStatusDef`, `validateSpecialization` (every
  perk level `1..maxLevel`) and `createCombat`'s side effects. It carries the two new checks: an
  additive taken-pool reduction (`taken-reduction` or a `'taken'` `damage-modifier`) needs a
  `reductionCap` below 1, and `emitTriggerFired: false` is legal only on a `snapshot-potency` tick.
  `takenFactorFor` throws on an additive source with no cap.
- **Floors.** `effectiveMaxHp` is `max(1, floor(effective Health))`; a revive restores
  `max(1, round(baselineMaxHp × pct))`.
- **A zero count is a no-op** for `apply-stat-modifier`: it returns before the target loop, with
  `TriggerFired` kept.
- **Small engine fixes.** The Web roll removes from the bearer read fresh (draw count and order
  unchanged). `on-action-observed` looks up its actor before the filter and fails closed with or
  without one. `stacks: false` claims per definition: `trait:<id>#<i>`, `side:<label>-<n>#0`,
  `status:<id>#<i>`, stamped on `BaselineEffectEntry` and `TriggeredEffect` and read through
  `ResolvedHookEffect.claimKey`; a keyless non-stacking effect throws. `triggering-ally` is deleted.
- **The snapshot lock covers Maps and Sets.** `deepFreeze` installs throwing `set`/`delete`/`clear`
  (Map) and `add`/`delete`/`clear` (Set) as non-enumerable own properties before freezing, and throws
  on a Map/Set frozen without the lock.

## Tests and goldens

- New: `create-combat-input.test.ts`, `load-time-checks.test.ts`, `stacks-false-claims.test.ts`,
  `test-utils/deep-freeze.test.ts`; additions in `resolution`, `effective-stats`, `combat` and
  `effects` tests. 44 scratch mutations, one per mechanism and site, all killed
  (`evidence/mutation-checks.md`).
- Guard inventory (`evidence/guard-inventory.md`): the plan's 34 throws, plus
  `__fixtures__/traits.test.ts`, which shared the `CATASTROPHIC_COLLAPSE` cause.
- Golden policy proof by import, whole-`CombatState` equality for the three `setup` goldens
  (`evidence/golden-policy-proof.md`). `CATASTROPHIC_COLLAPSE` loses `emitTriggerFired: false`
  (`damageSource: 'dot'` stays).
- Moved tests (state onto the returned `CombatState`, assertions unchanged): ten in `resolution.test.ts`
  and `combat.test.ts`; registries the creatures name: five `combat.test.ts`, two `starters.test.ts`,
  three `store.test.ts`; two inline statuses drop the flag; `ECHO` in `actions.test.ts` gains its
  claim key.

## Files changed

Edited: `engine/{config,combat,effect-types,effects,effective-stats,resolution,generation}.ts`,
`data/specializations.ts`, `state/store.ts`, `engine/test-utils/{deep-freeze,golden-runner}.ts`,
`engine/__fixtures__/{creatures,traits}.ts`, the six golden fixtures
(`golden-{defend-count-additive-cap,heal-scaling-count,necromoss-reclaim,round-end-interaction}` by
code, `golden-revive-cap-{exclusion,fizzle}` by comment), and the `combat`, `resolution`,
`effective-stats`, `effects`, `actions`, `damage-channel`, `status-containers`, `starters` and
`store` tests. New: the four test files and the evidence files. No living or content doc edited.
