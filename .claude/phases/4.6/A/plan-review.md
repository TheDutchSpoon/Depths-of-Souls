# Plan review — 4.6-A: Engine hardening

## Round 1

**Verdict: changes needed.** The design holds up against the code. But step 2's expected inventory
is wrong in a way that would stop the build at its first gate. A forecast run of the planned guards
over today's suite (`phases/4.6/A/evidence/plan-review-guard-forecast.md`) found two classes of throw
the kickoff doesn't list: an unknown `scriptId` in 10 tests (three of them store tests) and
`emitTriggerFired: false` on two test-inline statuses. Each has a mechanical fix that leaves its
assertions unchanged. Pre-approving them (decide-point 1) turns that stop into a listed change.
Everything else the forecast measured matches the kickoff: no slot, id, cap or `revivesUsed`
throws; no `Map`/`Set` write after freezing anywhere in the suite; every shipped perk level passes.

### Plan fixes

1. **Step 2's expected inventory is the forecast's.** It lists:
   - six goldens and three `resolution.test.ts` tests that hold `CATASTROPHIC_COLLAPSE`. Dropping
     the flag clears all nine, and only `golden-round-end-interaction`'s expected log changes;
   - the freshness moves: three goldens, and 10 unit tests across `resolution.test.ts` and
     `combat.test.ts`;
   - decide-point 1's two classes, if approved.

   The inventory still runs, before any test is adjusted, and must match this list exactly.
   Anything else is still a stop-and-ask.
2. **Name what replaces `e.reductionCap ?? 1`** in `takenFactorFor`. "Throw-free type narrowing" is
   not a mechanism. A hand-built test state skips the load-time check (it puts `activeEffects`
   straight onto a creature), so the resolver still meets an uncapped additive source. Recommended:
   a resolver-invariant throw, as `heal` already throws on both `flatAmount` and `scalingStat`, plus
   a test that it throws. The silent `?? 1` is the quiet 100% reduction the check exists to forbid.
3. **The golden `initial` proof compares the whole `CombatState`**, not only the two parties: also
   `rng`, `effectInstanceCounter`, `turnClock`, `round` and the registries. A `setup` that moved
   state correctly but disturbed the counter would pass a party-only check.
4. **A `stacks: false` test at the side-effect site.** One perk-borne `stacks: false` trigger
   carried by two party members makes one claim. The `perk-<n>` key is what makes a party-wide perk
   a single carrier, and none of the planned tests cover it.
5. **The comment-only set is only `golden-revive-cap-exclusion` and `golden-revive-cap-fizzle`.**
   `golden-round-end-interaction` changes its expected log, and the three `setup` goldens change
   their inputs. All four fall under the golden policy, not
   `CONVENTIONS.md#comment-only-golden-edits-are-allowed`, so `comment-proof` runs on the two
   revive-cap files only.

### Assumptions

| # | Plan ASSUMPTION | Call |
| --- | --- | --- |
| 1 | (A) `PARTY_SIZE = 6` in `engine/config.ts`, re-exported by `store.ts` | **Confirm.** The store's own slot check (`store.ts:641`) then reads the engine's bound too. |
| 2 | Non-integer or NaN slot is out of range; ascending order only; no contiguity rule | **Confirm.** The contiguity rule stays a Spec question. |
| 3 | Slot and id checks on both sides, before the per-creature checks | **Confirm.** |
| 4 | One `validateEffectList(defs, label, 'status' \| 'permanent')`, messages byte-identical | **Confirm.** The status path keeps its own random-selector context (`status "<id>"'s "<hook>" trigger's response`) and its category, `on-round-end` and potency checks outside the shared list. |
| 5 | Import sweeps every perk level `1..maxLevel` | **Confirm.** The forecast swept every shipped perk at every level: none throws. |
| 6 | Additive cap must be a number `< 1`; negatives allowed; not for multiplicative or dealt | **Confirm.** That is the brief's rule. A lower bound would be a new rule, and no content comes near one. |
| 7 | `Spell.effects` not covered by the `emitTriggerFired` check | **Confirm.** A spell's effects emit no `TriggerFired`, and `validateSpellEffects` already rejects `flatAmount`. |
| 8 | `stacks: false` key = `status:<id>#<pos>` / `effect:<sourceTraitId>#<pos>`, derived at lookup, no stored field | **Decide-point 2** (recommended: confirm). |
| 9 | The same trait twice on one creature gets two claims | **Confirm: unreachable by rule.** No two creature templates share a trait, and fusion refuses two of the same creature (`spec/creatures.md#trait-and-gem-slots`), so innate traits never repeat. Phase 8's infused traits can repeat one, and a derived key would count it twice: decide-point 3. |
| 10 | Trait vs side-effect slot told apart by the `perk-<n>` / `enemy-effect-<n>` label | **Confirm.** |
| 11 | `deepFreeze` throws on a Map/Set frozen before it | **Confirm.** The forecast saw no write after freezing in the whole suite. |
| 12 | Comment-only golden header edits, checked with `comment-proof` | **Correct** to the two files in plan fix 5. |
| 13 | One slice, no A1/A2 split | **Confirm.** The mechanisms are small and independent. With decide-point 1 settled, step 2 has no predictable stop left. |

The plan changes nothing in the brief's Assumptions checklist. It confirms (A).

**Golden policy:** matches the kickoff, both listed exceptions included.

**Mechanism → test, at every site:** complete except plan fixes 2 and 4. The Web test pins the
draw count, and the `on-action-observed` tests cover both branches. The `stacks: false` set covers
both collision kinds and the cross-creature claim. Every load-time check row runs on every carrier
it reaches.

### Decide-points

1. **Pre-approve the two unlisted throw classes?** The kickoff says a store throw is a real bug,
   not a test to adjust. Here it isn't: production's `DEFAULT_REGISTRIES.scripts` holds `striker`.
   The store test's `makeDeps` passes only `FIXTURE_SCRIPTS_BY_ID`, so the real Unicorn has
   silently run the implicit fallback in those three tests. Fixes, each tried green in a scratch
   clone:
   - **unknown `scriptId`:** each test gets the registry its creatures name.
     - `combat.test.ts` instance-list: `FIXTURE_SCRIPTS_BY_ID` in place of `new Map()`.
     - `starters.test.ts`: the role scripts, plus `ALWAYS_CAST_SCRIPT`.
     - `store.test.ts`: `makeDeps` merges `STOCK_SCRIPTS_BY_ID` with `FIXTURE_SCRIPTS_BY_ID`.
   - **inline statuses:** `test-regen` (`resolution.test.ts`) and `single` (`status-containers.test.ts`)
     drop `emitTriggerFired: false`. Neither asserts on `TriggerFired`.

   **Recommend: yes.** Each failure is the guard doing its job on a test that broke the rule, and
   the fix restores the test's evident intent. Leaving it as a stop-and-ask would cost a round trip
   for a decision already in hand. The cost: the store's intro tests now run the Unicorn's real
   role script. Their assertions don't read the fight's course, and the file stays green.
2. **`stacks: false` position: derived at lookup (the plan) or stored on the effect?** Derived
   counts earlier same-carrier effects. That's stable today: a trait's effects are never removed,
   only appended after, and a status's effects are indexed per instance. Stored means a new field
   on every instantiated effect, which changes `activeEffects`' shape under every `toEqual` and the
   golden `initial` proof. Derived fails in one case only: one creature carrying the same trait
   twice gets a second claim. Phase 8's fusion is the only way to reach that. It already refuses
   two instances of the same creature, because "two identical innate traits are no trade-off", but
   not two different creatures that share a trait.

   **Recommend: confirm derived, and add one rule to `spec/creatures.md#fusion`: two parents that
   share an innate trait can't fuse.** It has the same rationale as the same-creature rule, keeps a
   creature's traits distinct, and leaves the claim key correct without a stored field. Today only
   the Sorcerer starter's trait is carried by two creatures, one of them a test fixture.

### Decisions

- **Decide-point 2:** derived position, as planned. No fusion rule is needed: no creature shares
  a trait. The docs didn't say so, so `spec/creatures.md#trait-and-gem-slots` now states it.
- **Decide-point 1:** open.
- **Decide-point 3** (raised after decide-point 2): open. Phase 8's infused traits are a third trait
  source (`spec/creatures.md#equipment`). An infused trait the creature already carries, innate or
  infused, is a second carrier of one source. The derived key would give it a second claim, and the
  rule allows one. Recommended: keep the derived key in 4.6-A, since nothing repeats a trait before
  Phase 8, and give Phase 8 the job of storing each effect's position within its source. The claim
  then stays one per definition wherever the trait is carried, with no infusion rule.

### Docs edited

- `spec/creatures.md#trait-and-gem-slots`: a creature's innate trait is its own; no two creature
  templates share one, so a creature's innate traits never repeat.
