# Plan hand-out, round 1: 4.6-A

**Verdict: changes needed.** Fold the items below into `plan.md` and list what changed at its top.
Every ASSUMPTION not named here stands as written.

Re-read these lines first; they were edited for this round:
- `phases/4.6/brief.md#fight-setup-checks-its-input`: the unknown-`scriptId` test changes;
- `phases/4.6/brief.md#the-load-time-checks-close-their-gaps`: the two test-inline statuses;
- `phases/4.6/brief.md#small-engine-fixes`: the `stacks: false` claim key;
- `spec/creatures.md#trait-and-gem-slots` and `spec/creatures.md#equipment`: context for the
  claim key.

## 1. The expected guard inventory (Order of work, step 2)

Step 2 still runs the suite with every guard on, before any test is adjusted. Its failures must
equal this list exactly; anything else is a stop-and-ask.

- **`CATASTROPHIC_COLLAPSE` in the registry** (`emitTriggerFired: false` off a tick):
  - goldens `golden-round-end-interaction`, `golden-conditional-passive`,
    `golden-conditional-trigger`, `golden-loop-safety`, `golden-stun`, `golden-triggered-damage`;
  - in `resolution.test.ts`: the two "loop safety" tests and "apply-stat-modifier re-stacking
    (unique instance ids)".

  Dropping the flag clears all nine. Only `golden-round-end-interaction`'s expected log changes.
- **Test-inline statuses with the flag off a tick:**
  - `test-regen` in `resolution.test.ts` ("heal response (Regen) > emits HealApplied clamped …");
  - `single` in `status-containers.test.ts` ("deal-damage, flat mode … is a COST").
- **Non-fresh creatures:**
  - goldens `golden-defend-count-additive-cap`, `golden-heal-scaling-count`,
    `golden-necromoss-reclaim`;
  - `resolution.test.ts`: heal scaling (count), revive response ×3, all-allies,
    all-allies-of-species, revive cap;
  - `combat.test.ts`: taken-reduction passive (Bulwark as a perk), Provoke > redirects a
    single-target attack, turn-start cleanup > skips cleanup … own turn-start hook.
- **Unknown `scriptId`:**
  - `combat.test.ts` "action instance-list composition", 5 tests;
  - `data/species/starters.test.ts` "Sorcerer starter loadout", 2 tests;
  - `state/store.test.ts` intro tests: "runScriptedIntro() > adds the Unicorn on a win", "… on a
    loss too …", and "the scripted intro grants XP > every active-party creature gets the grant …".

No slot, id, `revivesUsed`, additive-cap or perk-level throw is expected.

## 2. Listed test changes (Golden policy, the unit-test paragraph)

Each change keeps the test's assertions byte-identical:

- **Unknown `scriptId`:** each test gets the registry its creatures name.
  - `combat.test.ts` instance-list: `scripts: FIXTURE_SCRIPTS_BY_ID` in place of `new Map()`
    (both `createCombat` sites).
  - `starters.test.ts`: a registry holding `STOCK_SCRIPTS_BY_ID`'s role scripts, plus
    `ALWAYS_CAST_SCRIPT` in the fused-creature test.
  - `store.test.ts`: `makeDeps`'s default `scripts` is `STOCK_SCRIPTS_BY_ID` merged with
    `FIXTURE_SCRIPTS_BY_ID`.
- **Inline statuses:** `test-regen` and `single` drop `emitTriggerFired: false`.
- **A hand-built non-stacking effect** gets its claim key. The `ECHO` fixture in `actions.test.ts`
  ("an echo is gated by the CASTER, never the bearer") gains `claimKey: 'trait:echo-fixture#0'`, for
  both of its tests (item 5).
- **Non-fresh creatures:** they move to `setup` / `updateCreature` as the plan already says.

## 3. `takenFactorFor`'s cap read (load-time checks; the cap ASSUMPTION)

`e.reductionCap ?? 1` is replaced by a resolver-invariant throw when an additive source has no
`reductionCap`, the way `heal` throws on both `flatAmount` and `scalingStat`. A test state built by
hand reaches the resolver without the load-time check. Add a test that the throw fires. The cap
ASSUMPTION (a number `< 1`; negatives not rejected) stands.

## 4. The golden `initial` proof (Golden policy, Proof)

For the three `setup`-moved goldens, `createGoldenState(...)` deep-equals `main`'s `createCombat`
output from the old parties as a **whole `CombatState`**: both parties, `rng`,
`effectInstanceCounter`, `turnClock`, `round` and the registries.

## 5. The `stacks: false` claim key (Small engine fixes; replaces ASSUMPTIONs 8, 9 and 10)

The key is the trigger's definition, stamped where the effect is instantiated, never counted at
lookup: `<kind>:<carrierId>#<index>`.

- **Parts of the key:**
  - kind: `trait`, `side` or `status`;
  - index: the trigger's position in its carrier's own effect list.
- **Trait and side effects:** `resolveBaselineEffects` stamps an optional `claimKey` on the
  `BaselineEffectEntry` of a `stacks: false` trigger only: `trait:<traitId>#<i>`,
  `side:perk-<n>#0`, `side:enemy-effect-<n>#0`. `withInstance` carries it onto the
  `TriggeredEffect`, so revive's re-instantiation from `baselineEffects` keeps it. Effects without
  `stacks: false` carry no new field.
- **Status effects:** `flatEffects` builds `status:<statusId>#<index>` from the index it already
  has. Nothing is stored.
- **Lookup and claim:** `effectsForHook` passes the key through, and `fireHook`'s
  `claimedNonStacking` keys on it.
  - The claim stays after the `damageChannel` skip, the observation filters, the condition and the
    depth-cap check, and before the chance roll.
  - The set stays per `fireHook` call.
- **A non-stacking effect without a key** reaching the claim is a resolver-invariant throw, never
  a fallback to `sourceTraitId`. Only a hand-built test effect can lack one. Today that is the one
  `ECHO` fixture (item 2).
- **Unchanged:** `TriggeredDef.stacks` and all content.
- **Consequences:**
  - a creature carrying one trait twice makes one claim;
  - kind is read from where the effect is instantiated, never from the `perk-<n>` label.
- **Tests** (`stacks-false-claims.test.ts`), each failing with the key reverted to
  `sourceTraitId`, or to a counted position where noted:
  - two `stacks: false` triggers in one trait on one hook both fire;
  - a trait id equal to a status id, each with a `stacks: false` trigger on the same hook: both
    fire;
  - one trait's trigger on two creatures: one claim, shared across sides; the second never rolls,
    pinned by RNG position;
  - status-borne triggers at positions 0 and 1 are two claims;
  - **one trait instantiated twice on one creature** (a test registry, `innateTraitIds: [T, T]`):
    one claim; fails with a counted position;
  - **a side-effect trigger carried by two party members:** one claim;
  - **a revived carrier keeps its key:** still one claim after a revive.

  The existing `actions.test.ts:403`, `damage-channel.test.ts:295`, `death-observed.test.ts` and
  `perform-action.test.ts:228`, and the goldens `golden-echo-chain-truncated`,
  `golden-echo-provoke-redirects` and `golden-pass-order-non-stacking`, stay green unchanged.

## 6. The comment-only golden edits (Comments that go stale; the comment-only ASSUMPTION)

Comment-only, under `CONVENTIONS.md#comment-only-golden-edits-are-allowed` and checked with
`npm run docs:check -- comment-proof`:
- `golden-revive-cap-exclusion`;
- `golden-revive-cap-fizzle`.

`golden-round-end-interaction` and the three `setup` goldens change code, so their comment edits
fall under the golden policy.
