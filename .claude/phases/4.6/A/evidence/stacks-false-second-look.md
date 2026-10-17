# `stacks: false` identity: second look, two options for the design agent to decide

Second-opinion note for slice 4.6-A, written 2026-10-17 against `4.6-a` at `73cc126`. Code
claims re-verified in the tree; the suite was not run (every byte-identical claim below is
structural: the claim point in `fireHook` and the per-call lifetime of the claim set don't move,
and Overtone has one trigger). Duncan asked for the two surviving options written down so the
design agent can pick.

## The problem, in one paragraph

`fireHook` (`src/engine/resolution.ts:511`, claim at 645-647) keeps one `Set<string>` per call of
"who already took its one roll this firing", keyed on `effect.sourceTraitId`. That key is the
carrier's id only (`src/engine/effects.ts:65, 72, 181`), so two `stacks: false` triggers in one
trait share one claim (bug 1), and a trait and a status with the same id share one claim (bug 2).
Neither is reachable today: Overtone is the only user, with one trigger, and no id collides. The
fix must leave Overtone's behaviour byte-identical and must survive Phase 8, where one creature can
carry the same trait twice (innate + infused, `spec/creatures.md#equipment`).

## Corrections to the handoff, so neither option is argued from them

- **Cross-side suppression of Overtone does not happen.** Overtone's filter is
  `relationship: 'ally'` and the claim comes after the filter, so for a player cast only player-side
  Overtones compete (`golden-pass-order-non-stacking.fixture.ts` header says the same). The
  board-wide scope is observable only for an `'any'`/`'enemy'` or non-observation trigger, and no
  content has one. Scope is orthogonal to the key; leave `spec/effects.md#stacks-false`'s scope
  rule alone in this slice.
- **"Removes the `stacks` name clash at `resolution.ts:1423`" is not an upside.** There is no
  second `stacks` field in `effect-types.ts`; that comment explains why `applyStatus` spreads
  `existing` instead of the union. Renaming the field changes nothing there.
- **A claim on a trigger without `chancePercent` is meaningful**: exactly one carrier fires per
  firing, the first in pass order. `death-observed.test.ts:32` tests that shape. No validator
  should reject it.
- **The plan's cost framing of a stored field was pessimistic.** The goldens are in-code fixtures
  with expected events, not serialized state snapshots, and a stored field can be optional and
  stamped only on non-stacking triggers. See option A's cost line.

## Option A: stored definition position (handoff's option 3)

**What changes.** The claim key becomes `<kind>:<carrierId>#<index>`, where `index` is the
trigger's position in its carrier's own effect list:

- trait effects: `resolveBaselineEffects` (`effects.ts:50`) already loops `trait.effects` with the
  index in hand; `BaselineEffectEntry` gains an optional `claimKey?: string`, set only when
  `def.stacks === false`; `withInstance` carries it onto the instantiated `TriggeredEffect`;
- status effects: `flatEffects` (`effects.ts:165`) already has `index`; it builds
  `status:<statusId>#<index>` there, nothing stored;
- side effects (perks): `perk-<ordinal>` / `enemy-effect-<ordinal>` are one def per ordinal
  already, so `effect:perk-<n>#0`, derived in the same loop;
- `effectsForHook` passes `claimKey` through; `fireHook` keys the set on it; `nonStacking` can go
  (key present = non-stacking).

**Content.** Unchanged. Overtone's entry keeps `stacks: false`. The `TriggeredDef` type is
unchanged.

**Spec.** `spec/effects.md#stacks-false`: "matched by `sourceTraitId`" becomes "matched by its
definition: carrier kind, carrier id and position in the carrier's effect list". Same for the
`TriggeredDef.stacks` doc comment (`effect-types.ts:766-774`).

| | |
|---|---|
| bug 1 / bug 2 | fixed / fixed |
| Phase 8 same trait twice on one creature | one claim: both copies instantiate from the same def list, so both get `#0` |
| party-wide perk | one claim per side, as today |
| byte-identical | yes: Overtone keeps one trigger, one key; claim point and set lifetime unchanged |
| data-shape cost | optional field on `BaselineEffectEntry` and `TriggeredEffect`, present only on non-stacking triggers, so only the 8 test/fixture files that already build one are touched; `combat.test.ts` and `effective-stats.test.ts` read `baselineEffects` and need a look |
| new semantics | none: "same definition" is the only meaning `stacks: false` ever had |
| authoring risk | none |
| validation | none new |
| principle fit | identity derived by the engine from the data's own structure; no label counting at lookup (unlike the plan's option 2) |

## Option B: explicit `stackKey` on the trigger (handoff's option 5)

**What changes.** `TriggeredDef.stacks?: boolean` is replaced by `stackKey?: string` (or
`claimKey`, the name the plan already uses for the resolved field). Triggers sharing a key get one
roll between them per hook firing, board-wide, same claim point. `fireHook` keys the set on it.

**Content.** Overtone's entry changes to `stackKey: 'resonant-overtone-echo'` (name free). About
13 `stacks: false` sites in tests and fixtures change their input; expected events stay.

**Spec.** `spec/effects.md#stacks-false` rewritten around key groups; `TriggeredDef` doc comment.

| | |
|---|---|
| bug 1 / bug 2 | fixed / fixed |
| Phase 8 same trait twice | one claim: same def, same key |
| party-wide perk | one claim, as long as the generated perk def carries the key |
| byte-identical | yes, same argument as A |
| data-shape cost | field renamed on `TriggeredDef`; nothing new on `ActiveEffect`; same 8 files touched |
| new semantics | **two gaps that a boolean never had, because two different defs can now share a key:** (1) different `chancePercent` in one group: first in pass order rolls its own chance, so the aggregate depends on who is fastest; (2) same key on different hooks: the sets are per `fireHook` call, so they never interact and the key misleads. Each needs a spec rule or a loader check |
| authoring risk | a copied key silently links two triggers |
| validation | non-empty string in `validateTrait`/`validateStatusDef`; recommended: equal `hook` and `chancePercent` within a group, plus a data test in `src/data` pinning the `key -> [carriers]` map (the project's "every retaliator sets 'direct'" style), so an accidental link shows as a diff |
| principle fit | identity literally in data; buys a mechanic (deliberate cross-trait groups) that no content uses |

## The deciding question

**Should two different traits (or a trait and a status) ever be able to share one roll?**

- No → option A. It fixes the bug without adding a feature, changes no content, and introduces
  nothing that needs policing.
- Yes → option B, and pay for it: the two semantic rules, the validator, the data test, the
  footgun.

Option B can be added later on top of A as an override of the derived key, so nothing done under
A is wasted if the answer ever turns to yes.

## Other factors (the question above is the design call; these are the engineering ones)

1. **What A depends on that B doesn't.** A's key is trait id + position, so it is right only if
   every copy of a trait is instantiated under the trait's own id: Phase 8 infused traits must go
   through the same path as innate traits, never a `perk-<n>`-style label of their own. A must
   write that discipline into `spec/creatures.md#equipment` now. B doesn't care how a trait is
   instantiated. The one real risk for A.
2. **Generated content.** Perks are built per rank at setup. Under A the key is positional and
   automatic; under B every generator must emit a stable, unique key. Favours A.
3. **A new namespace.** B's keys are a global set of strings, unique unless deliberately shared,
   maintained across traits, statuses, perks, augments and infusions. A reuses existing ids.
   Favours A.
4. **Reversibility.** A -> B later is additive (an override of the derived key). B -> A later
   removes a field from content. Favours A.
5. **Readability.** Under B a reviewer sees the group in `glimmerdark.ts`; under A they must know
   the engine's rule. Favours B, mildly.
6. **Principle fit.** "Identity in data" read literally favours B; read as "identity from the
   data's own structure, no bespoke branches" it is satisfied by A. Taste.

Churn and byte-identical risk are a wash. Everything but 5 and the literal reading of 6 points to
A; factor 1 is the one that could flip it.

## Second-opinion recommendation

**Option A.** This is a bug-fix item in a slice whose brief says no content reaches it
(`phases/4.6/brief.md#small-engine-fixes`); A keeps it that way. B is a design addition dressed
as a bug fix. The one honest argument for B is readability of the group in the content file; that
buys nothing today.

Either way, drop the plan's option 2 (position counted at lookup): it gives a second copy of the
same trait its own claim under Phase 8 (`plan.md:144-150` concedes this), so it would be done
twice.

## Things the chosen option's hand-out must carry regardless

- Claim stays after the `damageChannel` skip, the observation filters, the condition and the depth
  cap, and before the chance roll (`spec/effects.md#damagechannel`): RNG draw order unchanged.
- Echo chains: each echo is a new `fireHook` call, a fresh set; no change to chain length.
- Tests from the plan (`plan.md:274-280`) still apply: two triggers in one trait both fire; trait id
  = status id gives two claims; status position 0 vs 1; shared across sides. Add: same trait
  instantiated twice on one creature gives one claim (buildable today with a test registry even
  though content can't do it).
- Byte-identical proof: the only candidate goldens are the three with `stacks: false`
  (`golden-echo-chain-truncated`, `golden-echo-provoke-redirects`, `golden-pass-order-non-stacking`)
  and the corpus's Overtone fights; none may move.
