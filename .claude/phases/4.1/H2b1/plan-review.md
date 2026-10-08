# Plan review — Phase 4.1 — Slice H2b1: Flickerlings and damage observation

## Round 1

Reviewed `plan.md` (built against `c2b0889`) against `kickoff.md`, `brief.md`, the brief's
ASSUMPTIONS 112, 115, 116, 130–132, 137, 138 and 140, CONVENTIONS ("Hook execution model",
"Action reactions" incl. "Damage observation", "Damage channels and the Additional", "Response
vocabulary", "Loop safety"), `content/glimmerdark.md`, and the code on the branch
(`resolution.ts`, `effects.ts`, `effect-types.ts`, `conditions.ts`, `targeting.ts`,
`generation.ts`, `data/spells`, `data/species/glimmerdark.ts`, `state/store-gems.test.ts`,
`engine/__corpus__/corpus.ts`).

### Verdict

**Changes needed.** The design holds up: a sibling hook, a self-inflicted flag carried from the
branch that chose the cost path, and one pool function behind both the Wick's gate and its target
are the right shapes, and every claim I checked against the code is true (a lethal hit flips
`alive` before `DamageDealt`, so the victim never observes its own death blow; `targeting.ts`
already imports `effects.ts`; `applyDamageAndEmit` has exactly three callers). The fixes below are
small, but two of them change the predicted changed set and the mutation table, which must be
written before the first run, so the plan is revised rather than patched during the build.

### Plan fixes

**Real fixes**

1. **`store-gems.test.ts` stops telling biome 2 from biome 3.** With the 0.7 draw, the plan's own
   arithmetic gives `kindred-light` at floor 11 **and** at floor 21, so "the pool follows depth"
   would pass even if floor 11 read the biome-3 pool. Change the constant draw to **0.6**, which
   keeps biome 1 as it is and gives three different picks (`rollLoadout` does one `weightedPick`
   per slot at weight 1, so the pick is index `floor(0.6 × poolSize)` in registry order):
   - biome 1 (Vine Snare, Pollen Cloud, Arcane Bolt, Pacify): 0.6 × 4 = 2.4 → **Arcane Bolt**
     (unchanged);
   - biome 2 (+ Beacon Charge, Kindred Light): 0.6 × 6 = 3.6 → **Beacon Charge**;
   - biome 3+ (+ Spore Cyst): 0.6 × 7 = 4.2 → **Kindred Light**.

   Expectations: floors 0 and 1 `arcane-bolt`; floor 11 `beacon-charge`; floor 21 `kindred-light`;
   floor 11 pinned to biome 1 `beacon-charge` (the comment: a pin-following roll would draw Arcane
   Bolt); floor 150 `kindred-light`. Rewrite the block's derivation comment to match, and update
   the changed-tests table.
2. **Pin `relationship` against the damaged creature, not the dealer.** Every cost has dealer =
   damaged, so nothing in goldens 1–7 can tell "relationship compares the observer with the
   damaged creature" (A4) from "…with the damage source". Add to the filter matrix in
   `damage-observation.test.ts` an ordinary hit where an **enemy hits an ally**: an observer with
   `relationship: 'ally'` and no `selfInflicted` fires, one with `relationship: 'enemy'` doesn't.
   Add the mutation row "relationship read against the damage dealer", killed by that test.
3. **Run `validateObservationFilters` over every trigger carrier**, not only traits: traits
   (`data/traits/index.ts`), perks (`data/specializations.ts`, as the S2 validator already does)
   and the status registry (statuses carry `TriggeredDef`s since 4.1-F1, and `flatEffects` spreads
   their `observationFilter` into `effectsForHook`). The `ResolvedHookEffect.observationFilter`
   doc comment ("always undefined when the source was a status trigger") is stale; fix it.
4. **Both observation hooks fail closed.** Today `fireHook` silently skips the filter when
   `observed` is absent, which is the very trap the kickoff named. Apply A3's rule to
   `on-action-observed` too: a candidate on it is skipped when `observed` is absent. All five call
   sites pass it, so this is byte-identical; it makes the two observation hooks one model instead
   of one strict and one permissive. Add a row to the mechanism test and the mutation table.
5. **The digest predictions rest on a wrong mechanism; tighten them.** `rollLoadout` makes exactly
   one draw per gem slot whenever the pool is non-empty, and every affinity has a spell unlocked at
   biome 1, so neither Overcharge's deletion nor the Flickerlings' different affinities change a
   draw count: the generation stream does not shift. Replace the "distinctness retry" reasoning
   and make the predictions checkable:
   - *species swap*: only fights containing a Flickerling change (its stats, its trait, and its own
     gem picks, since the rarity slots change affinity: Charger Wit → Wick Vitality, Detonator
     Instinct → Flare Wit, Radiant Vitality → Last Gleam Violence);
   - *spell-pool change*: only fights containing a Wit creature whose loadout was rolled at biome
     2 or deeper.

   A fight outside its rung's predicted set that changes at that rung is a stop-and-say, not an
   attribution.
6. **Spell coverage after the pool shift.** Overcharge's deletion moves which Wit spell each draw
   lands on, so a Wit spell that Parts A/B cast today (Beacon Charge, Kindred Light, Pacify, …) may
   stop being cast, and `corpus-coverage.test.ts` then fails. Say so in the plan: if it happens,
   append a `SPELL_FIGHTS` entry for that spell at the end of Part C (as A24 does for the Flare),
   attributed "appended coverage fight", in the same single regeneration.
7. **Loop safety on the new route.** Damage observation adds a new cascade route (damage →
   observer → damage → observer). The guards are the existing ones, but the plan names no test on
   this route. Add a mechanism test: two fixture creatures, each "on an ally's self-inflicted
   damage, pay a cost", where one cost starts the chain; the hand-derived log shows where the
   self-re-entry guard ends it (an observer instance still on the stack is skipped; "ally" includes
   self, so each also observes its own cost). Mutation row: the re-entry check skipped for
   `on-damage-observed` candidates (the chain then runs to `CascadeTruncated`).
8. **Split the tick case out of `golden-h2b1-observed-silent`** into its own
   `golden-h2b1-observed-tick`. H2b2 moves the tick's source to the applier and makes ticks
   indirect, so that case changes in H2b2. On its own, it changes alone, and the ordinary-hit,
   spell-on-caster and zero-cost cases stay byte-identical through H2b2 (goldens are layered).

**Scope and labeling**

9. **Comment sweep scope.** The grep-and-fix covers `src/data` and the engine sources. Leave
   `golden-consume-stacks.fixture.ts`/`.test.ts` and the consume-stacks block in
   `resolution.test.ts` alone: their local `GLOW` fixtures and Glowfly comments belong to the
   mechanism H2b2 retires, and the kickoff pins `golden-consume-stacks` untouched.
10. **Range test:** say explicitly that the Flickerlings' non-Health stats are still asserted
    10–30 (they are: 10–24); only their Health moves to 20–45.
11. **A21's "verified at build" caveat can go:** the derivation is `weightedPick` at weight 1 over
    the affinity-matched slice in registry order (`generation.ts`), as fix 1 uses.

### Assumptions

| Item | Call | Note |
|---|---|---|
| A1 sibling hook `on-damage-observed` | **Confirm** | The Resonants can't be reached by construction, and the name lines up with CONVENTIONS' parked `on-death-observed` note. |
| A2 reuse `ObservationFilter` + `selfInflicted`, per-hook fields validated | **Correct** | Validator over traits, perks and statuses (fix 3). |
| A3 damage hook fails closed | **Correct** | Extend to `on-action-observed` (fix 4). |
| A4 `relationship` vs the damaged creature; hook source = damaged creature | **Confirm** | Needs the dealer ≠ damaged test (fix 2). A Flare reacting to its own cost matches "ally includes self". |
| A5 hook order dealt → taken (survived) → observed (always) → death chain | **Confirm** | Observation is a hit-reaction, so it resolves before death-reactions, as CONVENTIONS already orders them; the victim's own reaction before observers mirrors on-death before on-ally-death. The review writes it into CONVENTIONS. |
| A6 the killed creature doesn't observe its own death blow | **Confirm** | Verified: `applyDamageAndEmit` sets `alive: false` before `DamageDealt`, so `livingIds` excludes it and `all-allies` skips the corpse. |
| A7 required `selfInflicted`; only `applyCostDamage` passes true | **Confirm** | Three callers in all of `src` (`dealDamageCore`, `applyFlatDamage`, `applyCostDamage`). |
| A8 gate as a trigger-only condition, not in the scripting `Condition` | **Decide-point 1** | Recommendation below. |
| A9 "injured" = `currentHp < effectiveMaxHp`, one helper | **Confirm** | `effectiveMaxHp` floors effective Health; a raised ceiling counts as hurt, as ASSUMPTION 140 says. |
| A10 new `ResponseTarget` `lowest-hp-injured-other-ally` | **Confirm** | Follows `random-ally-without-status`; `TargetSelector` untouched, as the kickoff asked. |
| A11 burn then heal, both gated; a lethal burn skips the heal | **Confirm** | |
| A12 the burn keeps the default `'dot'` label | **Confirm** | `CATASTROPHIC_COLLAPSE` precedent; nothing reads the label. A distinct "cost" label is a Phase 7 display question, if ever. |
| A13 heal via `amountPerStack` `StatPercent` | **Confirm** | Exact integer maths, mirrors the burn. H2b2 may rename the field when stacks go. |
| A14 Flare: `all-allies` Speed ×1.15, two Flares multiply | **Confirm** | Spec question for H2c below (compounding). |
| A15 Last Gleam: `all-allies` Attack ×1.2 on `on-ally-death` | **Confirm** | `fireDeathObservers` already excludes the dead creature. |
| A16 placeholder trait ids/names | **Confirm** | |
| A17 `flickerlings` in pool slot 0, rarity order | **Confirm** | |
| A18 Health 38/25/28, range 20–45 for them | **Confirm** | Plus fix 10. |
| A19 Beacon Charge: heal, then `grant-act-first` at its default | **Confirm** | Verified: default duration 3, single-instance. |
| A20 Kindred Light heal-only at 0.2, in place | **Confirm** | |
| A21 store-gems picks | **Correct** | Fix 1 (the 0.7 draw loses the biome 2/3 distinction). |
| A22 `fixture-damage-boost` in `status-containers.test.ts` | **Confirm** | |
| A23 `perform-action.test.ts` unchanged | **Confirm** | Its `'glow'` is a literal on a fixture `consume-stacks`; verify at build as planned. |
| A24 append a Part C fight if no Flare observes a Wick cost | **Confirm** | Extended to spell coverage (fix 6). |
| A25 cumulative digest ladder | **Confirm** | With fix 5's predicted sets as the check at each rung. |
| A26 the review writes CONVENTIONS | **Confirm** | |
| A27 no hook-type index; wall time reported | **Confirm** | |
| A28 `Hook` enumerations gain the new hook | **Confirm** | |
| A29 stale mentions outside `glimmerdark.md` reported, not edited | **Confirm** | `species-locked.md`'s Glow note is the design agent's to fold at the PR review. |

No item in the brief's Assumptions checklist is changed by the plan (115, 116, 140 are met as
written; 116's "if the ally selector can't exclude the bearer, H2b adds that" is met on the
response side, as the kickoff directed), so nothing here needs bringing back to design.

### Decide-points

**1. The Wick's gate: a trigger-only condition, or a general "other ally" subject players get
too? (A8)**

- **(a) Trigger-only, as planned.** A new `other-ally-injured` kind in a `TriggerCondition`
  union (the scripting `Condition` plus that kind), used only by triggers. Scripts can't express
  it; the type keeps it out.
- **(b) General.** A new `HpSubject` `'other-ally'` (living allies minus self) in the shared
  `Condition`. The gate becomes `hp-percent`, subject `other-ally`, qualifier `any`, `< 100`
  (exact: `hpPercentSatisfied` cross-multiplies in integers). It is valid in scripts and in
  `has-status` too.

**Recommendation: (a).** (b) would give players a condition with no matching target: a script
could gate on "another ally is hurt" but its heal would still go through `lowest-hp-ally`, which
includes itself and ignores full Health. Phase 6 would then have to design the selector half
around a condition already shipped and saved in scripts. (a) also has a guarantee (b) lacks: the
gate and the target call the same function, so they can't disagree. (b) needs a test for that.
There is precedent for a condition union outside scripting (`SelfCondition`, 4.1-B S2). The cost
of (a) is one bespoke kind. If Phase 6 wants "another ally is hurt" in scripts, it promotes the
kind together with a matching selector.

### Spec questions (for the docs, not this slice)

- **The Flare's Speed compounds per cost.** While anyone other than the Wick is hurt, the Wick
  burns every turn, and each burn gives the team ×1.15 Speed (×1.32 with two Flares). Speed orders
  turns and feeds Speed-scaled magnitudes (Spore's 15% of Speed). Flagged for H2c's tuning pass,
  not a change here.

### Decisions

- **Decide-point 1 (A8): (a), trigger-only** (Duncan, 2026-10-08), with the condition that Phase 6
  knows about it. Recorded as brief ASSUMPTION 141 and as a Phase 6 input in ROADMAP: the editor
  builds its list from the scripting `Condition` and must not offer trigger-only kinds; if players
  should get "another ally is hurt", it comes with a matching "lowest-HP hurt other ally" selector,
  never the condition alone.
- The confirmed shape of damage observation (A1–A7 with fixes 2–4) is recorded as brief
  ASSUMPTION 142 and written into CONVENTIONS, so the revised plan builds against the docs.
- Verdict stands: **changes needed** (fixes 1–11). The revised plan adds what changed at its top.

### Docs edited

- `.claude/CONVENTIONS.md`, "Hook execution model": `on-damage-observed` placed in the damage-path
  hook order (after `on-damage-taken`, before the death chain, even on a lethal hit); the hook
  vocabulary count 16 → 17 (the list also gains the missing `on-action-observed`).
- `.claude/CONVENTIONS.md`, "Damage observation": the open "H2b's plan proposes the shape" replaced
  by the decided shape (sibling hook, filter fields per hook, damaged creature as source, the
  carried `selfInflicted` flag, both observation hooks fail closed, the validator over every
  carrier); the classification map names the hook.
- `.claude/CONVENTIONS.md`, "Trait model": trigger-only conditions (`TriggerCondition`,
  `other-ally-injured`) and the paired `lowest-hp-injured-other-ally` target reading one pool.
- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTIONS 141 (the trigger-only gate,
  design owner, with the Phase 6 consequence) and 142 (damage observation's shape).
- `.claude/ROADMAP.md`, Phase 6 inputs: trigger-only conditions stay out of the editor; "another
  ally is hurt" only ever ships to scripts with its matching selector.
