# Report r1 — 4.6-A: Engine hardening

Built to `plan.md` as `plan-handout-r2.md` corrects it (the round-1 hand-out is already folded into
the plan). One slice, not split into A1/A2. Nothing committed, nothing deleted, no living doc edited.
Evidence is in `phases/4.6/A/evidence/`.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 2411 passed, 1 skipped, 0 failed (261 files, 2412 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 747 citations in 530 files |
| `npm run docs:check -- comments` | PASS, 7692 comments and 2094 titles in 496 files |
| `npm run docs:check -- comment-proof HEAD` | `OK` for `golden-revive-cap-exclusion` and `golden-revive-cap-fizzle`; the other changed files fail it as expected (code changed), including the four goldens that change code |

**Toolchain caveat.** I did not run `npm ci`: it empties `node_modules`, which is a deletion. The
installed tools are vitest 5.0.3, prettier 3.9.9 and vite 8.3.3 against the lockfile's 5.0.4,
3.9.10 and 8.3.4 (typescript 6.0.3 and eslint 10.12.0 match). Node is v24.19.0. If CI disagrees on
formatting or a test, that gap is the first suspect; an `npm ci` and a re-run of the gates settles it.

### Test count, file by file against `main` (2236 tests → 2412, +176; passed 2235 → 2411)

Counted from the JSON reports of a run on the untouched branch head (step 0) and a run of the
finished tree.

| File | main | branch |
| --- | --- | --- |
| `engine/create-combat-input.test.ts` (new) | – | 33 |
| `engine/load-time-checks.test.ts` (new) | – | 100 |
| `engine/stacks-false-claims.test.ts` (new) | – | 11 |
| `engine/test-utils/deep-freeze.test.ts` (new) | – | 14 |
| `engine/resolution.test.ts` | 83 | 94 (+11: 2 Health floors, 2 revive floors, 4 zero-count, 3 `on-action-observed` fail-closed) |
| `engine/effective-stats.test.ts` | 18 | 23 (+5: `effectiveMaxHp` floor) |
| `engine/combat.test.ts` | 38 | 39 (+1: the two-Web cleanup) |
| `engine/effects.test.ts` | 50 | 51 (+1: `takenFactorFor` throw) |

Every other file has the same count (257 files → 261). The moved and re-registried tests are net
zero; `damage-channel.test.ts` changed a title and a comment only.

## Guard inventory (evidence: `guard-inventory.md`)

Run with every guard on and no test adjusted: 36 failures, in 15 files. 34 are the plan's step-2
list exactly (9 + 2 + 13 + 10). Two things beyond it:

- **`__fixtures__/traits.test.ts` "every fixture trait passes the load-time trait validators"**
  failed too. It is the same cause as the nine `CATASTROPHIC_COLLAPSE` failures (the fixture trait
  with the flag), it validates the trait directly rather than through a registry, and dropping the
  flag clears it. The kickoff says the test "doesn't pin the flag"; it passes unchanged. I went on
  rather than stopping, because the listed change is the fix; flagging it here.
- `combat.test.ts` "createCombat throws when re-fed a creature that already carries fight-setup
  output" failed on my own wording (it matches `/fight-setup output/`). The message keeps the phrase;
  the test is unchanged. Not a guard throw.

No slot, id, `revivesUsed`, additive-cap or perk-level throw fired anywhere in the existing suite,
and no test built two creatures on `makeCreature`'s default slot.

## Golden policy (evidence: `golden-policy-proof.md`)

Compared by importing the fixtures on both sides (a scratch dump outside the repo), not by reading
diffs:

- **144 of 145 goldens are identical** in every `expected*` export.
- **`golden-round-end-interaction`**: `expectedEvents` is 31 events on `main`, 32 here. Removing
  index 12, `{ type: 'TriggerFired', sourceId: p1, hook: 'on-round-end', effectId:
  'catastrophic-collapse' }`, gives `main`'s array exactly; index 13 is P1's 999 `DamageDealt`.
  `expectedResult` is unchanged.
- **The three `setup` goldens** (`golden-defend-count-additive-cap`, `golden-heal-scaling-count`,
  `golden-necromoss-reclaim`): expected events and result are equal to `main`'s, and
  `createGoldenState(...)` deep-equals what `main`'s `createCombat` made from the old parties, as a
  **whole `CombatState`** (both parties, `rng`, `effectInstanceCounter`, `turnClock`, `round`, the
  registries). The dead allies are `{ alive: false }` with `currentHp` left at the effective max,
  not 0; `defendCount` is 15. `golden-necromoss-reclaim`'s `setup` keeps WISP's 5 HP and gains the
  three dead allies; the other two got a new exported `setup`. None of the three carries a
  `stacks: false` trigger (ASSUMPTION K), so the stamped claim key doesn't touch their `initial`.
- **Corpus digest**: unchanged. `corpus-digest.fixture.ts` is untouched and its test passes; no
  `corpus:update`.
- **Comment-only golden edits**: `golden-revive-cap-exclusion` and `golden-revive-cap-fizzle` (their
  headers said `createCombat` resets `revivesUsed`/HP). `comment-proof` is `OK` on both.
  `golden-round-end-interaction` and the three `setup` goldens change code, so their comment edits
  fall under the golden policy above. The round-end header's "matches DoT convention" comments are
  rewritten; `damageSource: 'dot'` stays.

### Moved tests, assertions unchanged

State moved onto the returned `CombatState` with `updateCreature` (dead allies as `{ alive: false }`,
`currentHp` at max):

- `resolution.test.ts`: heal scaling (count) (two dead allies); revive response ×3 (dead ally;
  dead + defending + provoking; perks); all-allies; all-allies-of-species; revive cap (the old
  `currentHp: 0` input was discarded by `createCombat`, so only `alive: false` moves).
- `combat.test.ts`: Provoke redirects a single-target attack (`provoking`); turn-start cleanup
  skips cleanup … own turn-start hook (`provoking`); taken-reduction passive … as a perk
  (`defendCount: 15`).

Registries the creatures name: `combat.test.ts` instance-list ×5 (`FIXTURE_SCRIPTS_BY_ID` at both
`createCombat` sites); `starters.test.ts` ×2 (`STOCK_SCRIPTS_BY_ID`, plus `ALWAYS_CAST_SCRIPT` in the
fused creature's); `store.test.ts` ×3 (`makeDeps` defaults to `STOCK_SCRIPTS_BY_ID` merged with
`FIXTURE_SCRIPTS_BY_ID`, the fixture entries winning on a shared id).

Flag dropped: `test-regen` (`resolution.test.ts`), `single` (`status-containers.test.ts`). `ECHO` in
`actions.test.ts` gains `claimKey: 'trait:echo-fixture#0'` (both tests). `damage-channel.test.ts`'s
`stacks: false` test: assertions byte-identical, title and comment rewritten per the hand-out.

## Mechanism → the test that fails with it removed (evidence: `mutation-checks.md`)

I removed or reverted each mechanism in a scratch edit, one at a time, restored the file, and ran
the named test files: **44 mutations, none survived**. The table lists the red count, the files and
the first red test for each. Per site:

| Mechanism | Sites tested |
| --- | --- |
| unknown `scriptId` | `create-combat-input.test.ts` (player, enemy, null, omitted registry) |
| freshness | one test pair per field (player + enemy): `alive`, `defending`, `provoking`, `defendCount`, `revivesUsed`, `baselineEffects`, `activeEffects`; `currentHp` below max passes |
| slots, ids | out of range (-1, 6, 1.5, NaN), duplicate, out of order, gap allowed, both sides; id on both sides and twice on one |
| side-effect validation | `player.effects`, `enemy.effects` (one test each, via `load-time-checks.test.ts` and `create-combat-input.test.ts`) |
| both load-time checks | each on trait, trait in the `createCombat` registry, perk, player and enemy side effect, status, status in the registry; both taken shapes; `emitTriggerFired: false` on `deal-damage` and `heal`; a real tick (both kinds) passes |
| perk levels | a bad level 3 of 4 throws at import; the sweep stopping at level 1 turns it red |
| `takenFactorFor` throw | `effects.test.ts`, both taken shapes, hand-built state |
| max-Health floor | `effective-stats.test.ts` (raw stat 0, max 1, fractional, clamp, HP%), `resolution.test.ts` (`HpClamped.newHp: 1`, alive; fight-start 1 HP) |
| revive floor | `pct` 0.01 of 20 → 1; 0.2 of 20 still 4 |
| zero-count stat modifier | `TriggerFired` present, no `StatModifierApplied`, no `HpClamped`; one dead ally still applies |
| Web roll | two break-free statuses, seed 7 (draws 0.0117, 0.0620 from an independent mulberry32 trace), both gone, two `StatusExpired` in order, exactly 2 draws |
| `on-action-observed` | actor not found, filtered and unfiltered; no `source` at all; a real actor still fires |
| `stacks: false` | two triggers in a trait; two in a status; trait id = status id; one trait on two sides (one draw); `[T, T]`; side effect on two members; two side effects; revived carrier keeps its key; missing key throws; skipped by `condition`; skipped by `observationFilter` relationship |
| deep-freeze | `Map` set/delete/clear, `Set` add/delete/clear, nested in object/array/Map, `toEqual` unaffected, reads work, pre-frozen throws, `deepFreeze(createCombat(...))` blocks `scripts.set` |
| `triggering-ally` gone | `npx tsc -b` clean (the exhaustive `switch`) and `grep -rn triggering-ally src` is empty |

## Plan checklist, as built

- **ASSUMPTION (A):** `PARTY_SIZE = 6` in `engine/config.ts`; `store.ts` imports it and re-exports it
  (`export { PARTY_SIZE }`), so `balance-sim.ts` and the tests that import it from the store are
  untouched. Confirmed.
- **Slots:** a non-integer or NaN slot is "out of range"; strictly ascending is the only order rule;
  `[0, 2]` and `[3]` pass (pinned). No contiguity rule built.
- **Slot and id checks** run on both sides, after the empty-party check and before the per-creature
  side and freshness checks.
- **One entry point:** `validateEffectList(defs, label, 'status' | 'permanent')`. Existing error
  messages are byte-identical (the random-selector context differs by carrier kind, as before).
  `validateStatusNoRandomSelectorInResponseTargets` stays exported and is now unused outside
  `resolution.test.ts`.
- **Perk sweep:** every level `1..maxLevel`, via `resolvePerkEffects`. It threw on no shipped content.
- **Cap check:** `reductionCap` must be a number below 1; negative caps are not rejected; NaN is.
  `takenFactorFor` throws on an additive source with none.
- **`Spell.effects`** is not covered by the `emitTriggerFired` check.
- **Deep-freeze:** a Map/Set frozen before `deepFreeze` throws a clear error instead of being
  skipped. No existing test hit it, and no existing test wrote into a registry a golden had frozen.
- **`stacks: false` key:** `trait:<id>#<i>`, `side:<label>-<n>#0`, `status:<id>#<i>`, stamped on
  `BaselineEffectEntry` and `TriggeredEffect` (`stacks: false` triggers only), built in `flatEffects`
  for a status, never counted at lookup. `ResolvedHookEffect.claimKey` is passed through
  `effectsForHook`; a `nonStacking` effect without one throws. The claim sits where it did: after the
  `damageChannel` skip, the observation filters, the condition and the depth cap, before the chance
  roll.
- **A stays one slice.**

## Spec questions

The seven `**Known bug:**` lines, each as built:

1. `spec/combat.md#fight-setup` (line 186): `createCombat` throws on a creature with `alive: false`,
   `defending`, `provoking`, a non-zero `defendCount` or `revivesUsed`, besides non-empty
   `baselineEffects`/`activeEffects`; on a `scriptId` that is neither `null` nor in the registry (an
   omitted registry is empty); on a slot that is not an integer in 0–5 or a side not in ascending
   slot order (duplicate or out-of-order); on one id twice across both sides; and it validates
   `player.effects` / `enemy.effects` as a trait. `currentHp` is not checked. The section also needs
   those rules written.
2. `spec/combat.md#aoe-cast` (line 368): the "slot order" reading is now guaranteed by the boundary
   check; the five readers are unchanged.
3. `spec/combat.md#resolution--timing` (line 273): `effectiveMaxHp` is `max(1, floor(effective
   Health))`, and a revive restores `max(1, round(baselineMaxHp × pct))`. **The floor also reaches the
   Additional**, through `calculateAdditional(attacker.level, effectiveMaxHp(target))`
   (`resolution.ts:258`; the rule's home is `spec/combat.md#damage-channels-and-the-additional`). It
   is byte-identical, because no content reaches a max Health below 1. Also write the floors into
   `spec/statuses.md#health-is-a-modifiable-stat` and `spec/responses.md#revive`.
4. `spec/effects.md#validators` (line 169): the cap check (`taken-reduction` and a `'taken'`
   `damage-modifier`, both additive, `reductionCap` a number below 1) and `emitTriggerFired: false`
   only on a `snapshot-potency` tick, on every carrier, through one `validateEffectList`; side effects
   are validated; a perk is validated at every level `1..maxLevel` at import. The bullet list there
   ("`validateTrait` rejects …") should now name `validateEffectList`.
5. `spec/effects.md#damage-observation` (line 353): `on-action-observed` looks up its actor before
   the filter, so with or without one a missing actor skips the candidate.
6. `spec/statuses.md#turn-order` (line 265): the Web removal reads the bearer's `activeEffects`
   fresh; the bearer list and each bearer's effect list are still taken once, so draw count and order
   are unchanged.
7. `spec/responses.md#fizzles` (line 43): an `apply-stat-modifier` with a `magnitudeSource` count of
   0 returns before the target loop; `TriggerFired` stays, nothing follows. `spec/effects.md#count-scaling`
   (line 460) says only `deal-damage` and `heal` and should add `apply-stat-modifier`.

Living-doc text this makes stale:

- `spec/responses.md:49` lists `triggering-ally` (deleted from the union and the resolver).
- `spec/effects.md#stacks-false` (lines 394–403): "matched by `sourceTraitId`" is now a per-definition
  claim: carrier kind, carrier id and the trigger's position. Two triggers in one trait are two
  claims; a trait and a status with one id are two; one trait carried twice, or by two creatures, or
  a side effect carried by two members, is one.
- `spec/effects.md#hook-execution` (the tick as the only exception to `TriggerFired`) is now
  enforced at load; confirm it says "enforced".
- `CONVENTIONS.md#combatstate-is-plain-data-never-modified-after-being-returned`: the sentence the
  brief names (the registries a fight carries are read-only Maps, frozen by the helper). One thing
  for that sentence: a Map shared by a whole test file is locked for the rest of the file once a
  frozen state carries it, and a pre-frozen Map/Set throws.
- `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` (line ~296) says a wound is the
  example of `setup`; dead allies and a preset `defendCount` are now `setup` uses too.

Questions the docs don't answer:

- **Slot contiguity.** I built none: `[0, 2]` and `[3]` pass and are pinned by a test. If a party
  must be dense, that is a new rule and a new throw.
- **`__fixtures__/traits.test.ts`** was an unlisted victim of the `CATASTROPHIC_COLLAPSE` flag (see
  the inventory). If the kickoff list is meant to be exact, say so for the next slice.

## Content changes

None shipped. The only content-like change is the **test fixture** trait `CATASTROPHIC_COLLAPSE`
(`__fixtures__/traits.ts`): its first effect loses `emitTriggerFired: false` and keeps `damageSource:
'dot'`; the round-end golden's expected log gains the one `TriggerFired`.

## Files

Engine: `config.ts` (`PARTY_SIZE`), `combat.ts` (input checks, Web read, doc), `effect-types.ts`
(`validateEffectList`, the two checks, `claimKey` fields, `triggering-ally` out), `effects.ts` (claim
keys, `takenFactorFor` throw), `effective-stats.ts` (floor), `resolution.ts` (revive floor,
zero-count guard, `on-action-observed`, claim), `generation.ts` (comment). Data: `specializations.ts`.
State: `store.ts` (re-export). Test utilities: `deep-freeze.ts`, `golden-runner.ts` (comment).
Fixtures: `creatures.ts` (comments), `traits.ts`. Goldens: the six listed above. Tests: the four new
files and `combat`, `resolution`, `effective-stats`, `effects`, `actions`, `damage-channel`,
`status-containers`, `starters` and `store` tests.

**Rename map:** none.

## To delete

Nothing.
