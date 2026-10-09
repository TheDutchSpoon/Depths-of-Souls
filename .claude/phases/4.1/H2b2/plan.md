# Plan — Phase 4.1 — Slice H2b2: status rules

Written against `kickoff.md` and `brief.md` (this mailbox), `coding-rules.md`, `plan-review.md`
(round 1) and the code as read on branch `phase-4.1-slice-h2b2` (resolution.ts, effects.ts,
effect-types.ts, types.ts, data/statuses.ts, the Rotcap/Glimmerdark traits and spells, the golden
fixtures, the corpus digest). Nothing has been run. Every ASSUMPTION is marked inline as
`ASSUMPTION (n)` and collected in the checklist at the end.

## Revision 1: what changed

Addresses every plan fix (1–9) and the two decisions of `plan-review.md` round 1.

- **Decide-point 1 (ASSUMPTION 144/145):** `potency` + `snapshot-potency` kept as the tick
  declaration. `StatusSpec.inheritSnapshot`, its validator and the `apply-status` invariant are
  **dropped**; a status's own `apply-status` of that same status copies the firing instance's
  snapshot by rule (`context.statusId === spec.statusId`).
- **Decide-point 2 (ASSUMPTION 146):** the tick carries its dealer (the living applier, else no
  one). `origin` becomes a small discriminated union carrying it. Hook table per case in section 1;
  a golden per case in section 4.
- **Fix 1:** `golden-sporch-cinderlord-burn-stacks` is **field-only, setup changed**, and is renamed
  `golden-sporch-cinderlord-burn-refresh` (I create the two new files, Duncan deletes the two old).
- **Fix 2:** the "41/8/3 match" sentence is gone; the recount is in section 3.
- **Fix 3:** the digest attribution is positive at every layer; "unexplained" is a reportable
  outcome (section 5).
- **Fix 4:** no interim goldens at step 1; the expected red set is listed (section 6).
- **Fix 5:** Regen is a second site of the snapshot mutations; a non-neutral, asymmetric affinity
  matchup and a mutation row for it; an `on-death` test and row for the tick-kill source.
- **Fix 7:** the acceptance grep covers tests and fixtures; every survivor is named (section 7).
- **Fix 8:** the **Docs section is deleted** and the docs step with it. No living doc or content
  doc is edited by me; the CONVENTIONS items and the content changes go to the report (**Spec
  questions**, **Content changes**).
- **Fix 9:** the `on-kill` reader list is complete, `on-damage-dealt` has no readers, the Executioner
  case is answered (section 3).
- **Assumption table:** 1 and 4 reflect the decisions; 5 states the `perform-action` side effect;
  2 names the invariant message and the `validateSpellEffects` check; 7 is declared unobservable
  with no mutation row; 10 is the rename; 16 (pass-on by rule), 17 (dealer) and 18 (step-1 field
  strip) added.

## 1. Approach

Two rules, built in this order so each stays reviewable and the gates stay green between them:

1. **Single instance.** Delete the stack concept end to end (type fields, increment, the ×stacks
   count, `consume-stacks`, `consumed-stacks`, the event field). Re-application keeps the stronger
   value and refreshes the timer. At this point a status still ticks on the old flat path.
2. **The applier snapshot.** A status that ticks declares a **potency**; an instance records a
   **snapshot** at application; a tick is indirect damage (or a heal) from that snapshot through the
   one existing indirect formula, with the applier as source while it lives.

Then content, goldens, the corpus, the report.

### The data shape (the kickoff asks the plan to propose it) — ASSUMPTIONS (1), (4), decided as 144

```ts
// effect-types.ts
type StatusPotency = StatPercent                        // { ofStat, percent }, percent a positive integer
type SnapshotPotency = { readonly kind: 'snapshot-potency' }   // a magnitude marker: "the instance's potency"
type StatusSnapshot = { applierId: CreatureId; affinity: Affinity; potency: number }

StatusDef      { statusId; effects; polarity; defaultDuration; potency?: StatusPotency }   // `cap` deleted
StatusInstanceState { remainingDuration; appliedAt; snapshot?: StatusSnapshot }            // `stacks` deleted
StatusSpec     { statusId; duration? }                                                     // `stacks` deleted, no flag
deal-damage.flatAmount?: number | StatPercent | SnapshotPotency
heal.flatAmount?:        number | StatPercent | SnapshotPotency   // renamed from `amountPerStack` (ASSUMPTION 2)
```

- `StatusDef.potency` says which applier stat and what percent a ticking status scales. One potency
  per status. `snapshot` exists on an instance **iff** its def declares `potency`.
- A tick is **the response whose magnitude is `{ kind: 'snapshot-potency' }`**; the marker replaces
  ASSUMPTION 131's test ("statusId + flat + self"). Any other self-damage inside a status is a cost
  (ASSUMPTION 116). The marker's branch sets `origin: tick`, which carries 131's other job ("a tick is
  never self-inflicted").
- **Pass-on by rule, no flag** (ASSUMPTION 145/16). In `executeResponse`'s `apply-status`:
  `context.statusId === spec.statusId` ⇒ the new instance copies `context.snapshot` (the firing
  instance's). Anything else snapshots its applier fresh. A trait, perk or spell has no `statusId`
  in its context, so a carrier passing its snapshot on is impossible by construction, and the engine
  never reads the applier's own copy of the status. (`HookContext.statusId` is already set for
  status-sourced effects — the old `statusId && targetId === self` tick test reads it; step 0 confirms
  before step 2 relies on it.)
- Validators (new, in `validateStatusDef`; a trait/perk counterpart beside
  `validateNoBreakChanceOutsideStatus`, called from `data/traits/index.ts` and
  `data/specializations.ts`; spells reject through `validateSpellEffects`): a status with `potency`
  carries **exactly one** snapshot-magnitude response (deal-damage or heal, target `self`, no
  `magnitudeSource`); a status without `potency` carries none; `potency.percent` a positive integer;
  a trait, perk or spell carries no `snapshot-potency`. Dropped with the flag: the `inheritSnapshot`
  validator and the `apply-status` invariant.

### Hook behaviour of a tick, per case (ASSUMPTION 146/17)

`origin` is a required discriminated parameter: `{ kind: 'hit' } | { kind: 'cost' } | { kind: 'tick',
dealerId: CreatureId | null }` (ASSUMPTION 5). `DamageDealt.sourceId` is the logged source in all
cases: the applier while it lives, else the bearer. `dealerId` is the applier while it lives, else
`null`; it is carried, not inferred from `sourceId === target.id`.

| Case | Bearer's `on-damage-taken` / `on-death` | `triggering-source` there | Dealer-side `on-damage-dealt` / `on-kill` |
|---|---|---|---|
| Living applier ≠ bearer | fire | **none** | fire on the applier, victim = bearer |
| Dead applier (fallback) | fire | none | **do not fire** (`dealerId` null; logged `sourceId` is the bearer) |
| Self-applied, bearer alive | fire | none | fire on the bearer (it is the applier); `on-kill` is moot for a self-kill as for any hit |

Side effect, stated (ASSUMPTION 5): a `perform-action` with `actor: 'triggering-source'` on
`on-damage-taken` now gets no actor on a tick (today it gets the bearer). No content has one.

### Module changes by file

**`engine/types.ts`** — `StatusAppliedEvent` loses `stacks`.

**`engine/effect-types.ts`**
- Delete: `StatusDef.cap`, `StatusSpec.stacks`, `StatusInstanceState.stacks`,
  `ResolvedHookEffect.stacks`, `FlatOf.statusStacks`, the `consume-stacks` response and its branch in
  `validateResponseTargetNoRandomSelector`, `MagnitudeSource`'s `consumed-stacks`. Comments that
  describe stacks/caps/consume-stacks as current are rewritten.
- Add: the types above and the validators above; `heal.flatAmount` replaces `amountPerStack`
  (the `heal` mode-exclusivity invariant message and `validateSpellEffects`' "no amountPerStack"
  check follow the rename).
- **Kept, named in the grep:** `TriggeredDef.stacks: false` and `ResolvedHookEffect.nonStacking`
  (the Overtone dedup flag, ASSUMPTION 114).

**`engine/effects.ts`**
- `flatEffects`: stop yielding `statusStacks`. `modifierSource` / `TakenReductionSource` lose
  `stacks`; `damageModifierCount` becomes `magnitudeSource ? resolveMagnitudeCount(...) : 1`;
  `takenFactorFor` is unchanged otherwise (`magnitude ** 1` is exact, so Weaken/Vulnerability/Defend
  keep their bits).
- `effectsForHook`: no `stacks`.
- `instantiateStatus(def, id, duration, snapshot | undefined, appliedAt)` replaces the `stacks`
  parameter.
- `resolveMagnitudeCount` loses `consumedStacks` and the `consumed-stacks` case.
- New pure helper `snapshotFor(applier, potency)` = `{ applierId, affinity, potency:
  floor(floor(getEffectiveStat(applier, ofStat)) * percent / 100) }`, integer arithmetic, one floor.

**`engine/resolution.ts`**
- `HookContext`: `stacks` and `consumedStacks` out; `snapshot?: StatusSnapshot` in.
- `fireHook`: after the exact-instance check, when the candidate is status-sourced, read `snapshot`
  **from the live owning instance** (`self.activeEffects` by `sourceInstanceId`) and pass it in the
  context — ASSUMPTION (7). This is the safe read, and it is **unobservable today** (a same-pass
  refresh makes the instance born so its tick is skipped, and a corpse can't be re-applied); it has
  no mutation row and none is claimed.
- `executeResponse`:
  - `deal-damage`: the `count` default `context.stacks` goes. First branch: `flatAmount.kind ===
    'snapshot-potency'` → `applyTickDamage`. The old `statusId && targetId === self` →
    `applyFlatDamage` branch and `applyFlatDamage` are deleted. The cost branch is untouched.
  - `heal`: same count change; the snapshot branch heals `snapshot.potency` through `applyHeal`
    (no Defence, no minimum, clamped to max Health), `sourceId` from `tickSourceId`.
  - `apply-stat-modifier`: the `context.stacks > 1` fallback goes.
  - `apply-status`: `context.statusId === spec.statusId` ⇒ pass `context.snapshot` as `inherited`.
  - `consume-stacks` case deleted.
- `applyTickDamage(bearer, snapshot, state, ctx, statusId)`: the one **reuse** of
  `calculateIndirectDamage` (no third formula): `magnitude = snapshot.potency`, `defence =
  resolveDefenceAndTakenFactors(bearer).defence` (Defend ×1.5 applies), `attackerAffinity =
  snapshot.affinity`, `defenderAffinity = bearer.affinity`, `dealtMods = []`, no armor penetration,
  `takenFactors = [...defendFactors, ...gatherTakenFactors(bearer, state)]` (the order
  `dealDamageCore` uses). No `conditional-damage-bonus`, no cross-stat, no Additional. It computes
  `tickSourceId(snapshot, bearerId, state)` = the applier if `findCreature(...).alive` **at tick
  time** (a revived applier is the source again), else the bearer; `dealerId` = the applier iff it is
  the source of that branch, else `null`.
- **`applyDamageAndEmit`'s `selfInflicted: boolean` becomes a required `origin`** (above) —
  ASSUMPTION (5). `cost` ⇒ `selfInflicted` true (today's only true case); `hit` is today's
  behaviour; `tick` ⇒ `selfInflicted` false, the bearer's `on-damage-taken` **and** `on-death` fire
  with no source (ASSUMPTION 6: today `on-death`'s source after a tick kill is the bearer, which
  `triggering-source` already refuses, so observable behaviour is kept), and the dealer-side hooks
  fire only for `dealerId`. Required with no default so the compiler finds every caller.
- `applyStatus(sourceId, targetId, spec, state, ctx, inherited?)`:
  - candidate snapshot = `inherited ?? (def.potency && snapshotFor(applier, def.potency))`;
  - existing instance: keep its id; `remainingDuration` = the new application's (`spec.duration ??
    def.defaultDuration`), `appliedAt` reset; the snapshot is replaced **only if the candidate's
    potency is strictly greater** (tie and weaker keep the current instance whole: applier, affinity,
    potency); fixed-magnitude statuses have no snapshot and just refresh — ASSUMPTION (8);
  - a weaker or tied re-application still emits `StatusApplied` (`sourceId` = the applying creature
    — ASSUMPTION (9)) and fires `on-status-applied`;
  - `StatusApplied` has no `stacks`.

**`data/statuses.ts`** — `cap` removed from all 13 statuses; Poison `potency {attack, 20}`, Burn
`{intelligence, 25}`, Regen `{health, 10}`, Spore `{speed, 15}`; each tick response uses
`flatAmount: { kind: 'snapshot-potency' }`, Regen's heal likewise; Spore's spread becomes a plain
`status: { statusId: 'spore' }` (the rule does the pass-on); Vulnerability stays `magnitude: 1.5`
(now once); doc comments rewritten.

**`data/traits/rotcap-hollow.ts`** — Igniter `status: { statusId: 'burn' }`; Cinderlord the same, its
PR #64 "stacks: 1" comment replaced; stacking comments on Rot Sovereign / Seeder / Bloomer / Rotcore
fixed. **`data/traits/glimmerdark.ts`** — the Wick's heal `amountPerStack` → `flatAmount` (a bearer
percent, so it stays a plain `StatPercent`, not a snapshot). **`data/spells/core.ts`, `glimmerdark.ts`,
`rotcap-hollow.ts`** — comments only; no spell data changes.

**`app/demoFight.ts`** — no code change expected; comment check. **`ui/CombatDemo.tsx:223`** — print
`gains <status> (<n>r)` without `x<stacks>`. Nothing moves into the demo.

**`state/balance-sim.ts`** — no change; its `stacks` are stat-modifier stacks (named in the grep). Its
test literals that spell `StatusApplied` lose the field.

**Docs: none edited by me** (coding-rules: the living docs are the design agent's). Doc follow-ups
are in the report's **Spec questions** and **Content changes**. The phase record is appended to
`.claude/phases/phase-4.1-fix-and-consolidation.md` (Phase 4.1 is the old layout), which
coding-rules assigns to me.

## 2. Golden policy (restated from the kickoff)

**Deliberate, listed.**
- `golden-consume-stacks` is retired (Duncan deletes `.fixture.ts` and `.test.ts`).
- A golden that only loses `stacks` from `StatusApplied` changes **in that field alone**: proved by
  importing both trees' fixtures (`main` extracted to a scratch directory outside the repo with
  `git archive`, nothing touching `.git`) and deep-comparing every `expected*` export, with `stacks`
  stripped from `main`'s `StatusApplied` events: equal. This includes a golden whose **setup**
  changed but whose expected events did not (the Cinderlord golden).
- Every other changed golden is listed with its rule (single instance / applier snapshot / both,
  the arithmetic shown for each). New goldens are hand-derived (setup, arithmetic, draws in
  comments), run through the shared golden runner, deep-frozen. **Each changed golden is derived
  once, at step 3, against the final rules** (ASSUMPTION 139 rejected an interim refresh-only rule).
- The digest is regenerated **once**, through `npm run corpus:update`, attributed in layers
  (section 5).

## 3. The predicted changed set (written before the first run; recounted by step 0)

Counted from the fixtures on this tree: **41 fixtures contain a `StatusApplied` event** (43 files
mention the word; `golden-hollowkin-wretch-self-dot` and `golden-spore-spread-fizzle` only in
comments).

| Group | Goldens | Count |
|---|---|---|
| **Retired** | `golden-consume-stacks` | 1 |
| **Field only, setup changed** | `golden-sporch-cinderlord-burn-stacks` → renamed `golden-sporch-cinderlord-burn-refresh`. Expected events: Cinderlord's kill and two `StatusApplied` (ENEMY_A Burn 3 turns; ENEMY_B Burn refreshed to 3 turns). ENEMY_B's 2 stacks live in the **setup** (a throwaway events array), whose `stacks: 2` spec goes. With `stacks` stripped, `main`'s export equals the new one. What it still pins: a refresh resets the duration 1 → 3, with no count. | 1 |
| **Both rules** | `golden-turn-end-dot-kill-burst-refresh` (2 stacks → one instance; and the tick snapshot) | 1 |
| **Applier snapshot** (tick amount, source, channel) | `golden-dot`, `golden-f2-dot-one-turn`, `golden-f2-turn-end-interaction` (Spore), `golden-spore-spread-dot-kill`, `golden-turn-end-dot-kill-burst`, `golden-h2a-cost` and `golden-h2b1-observed-tick` (their local mini-poison, ASSUMPTION 11), `golden-hollowkin-wretch-self-dot` (no `StatusApplied` event; setup applies Poison) | 8 (7 with an event) |
| **Field only** (`stacks` dropped) | the other fixtures with a `StatusApplied` event — including `golden-b4-cleanse-then-tick` and `-remove-then-reapply` (their local tick status becomes a `potency` status but no tick lands), `golden-f2-win-over-own-tick` (the fight ends before the tick), `golden-rot-sovereign`, `golden-spore-spread`, `golden-spore-spread-filter`, `golden-sleep-wake` (the kickoff lists it under must-stay-green; it logs a `StatusApplied`, so it is field-only — kickoff slip noted in the review) | 41 − 1 − 1 − 1 − 7 = **31** |
| **Unchanged** | every other golden, incl. all `golden-h2a-*` and `golden-h2b1-*` except the two named, `golden-resonant-overtone`, `golden-loop-safety` | rest |

Field-only total including the Cinderlord golden: **32**.

**Recount against the H2b split** (which counted 41 field-only, 8 tick, 3 stacking on the older
corpus): the claim that they agree is withdrawn. The split's "41" counted goldens that only lose the
stack count; today's equivalent is **32**. The gap is not reproducible from the tree alone: H2b1
retired `golden-glowfly-detonator` and changed the Glimmerdark content, and other fixtures moved in
H2a/H2b1. **Step 0 explains it** by diffing the fixture list at the split's commit against today's
and listing each fixture added, retired or reclassified; if it can't, the report says the gap is
unexplained. The table is the prediction either way. Tick goldens today: 8 (one without an event);
stacking goldens: 3 → 2 (consume-stacks retired, Cinderlord reclassified, burst-refresh).

**Non-golden tests changed** (all mechanical unless noted): `cap:` literal removal and `stacks:` removal
from event literals in `actions`, `combat`, `conditions`, `confusion`, `damage-observation`,
`effective-stats`, `interpreter`, `perform-action`, `spell-effects`, `status-timing`, `support-spells`,
`targeting`, `turn-order` tests and `state/balance-sim.test.ts`; **behavioural rewrites** in
`status-containers.test.ts` (stack cap/increment tests → single-instance/refresh), `resolution.test.ts`
(38 `stacks` mentions: stack-scaled ticks/heals/modifier fallback, `consume-stacks`, `applyStatus`
stack cases), `effects.test.ts` (`statusStacks`, damage-modifier counts, `consumed-stacks`); data tests
`statuses.test.ts` (ticks now snapshot), `glimmerdark.test.ts` (`amountPerStack`).
`corpus-coverage.test.ts` stays as is except for the new coverage assertion (section 5).

**Digest causes** (predicted; counted by step 0 on `main`): every fight whose log has a `StatusApplied`
changes (field); fights where a status is re-applied change (single instance: Venom Bolt/Withering
Bolt/Spore Cyst recasts, Igniter, Cinderlord, Rot Sovereign's per-turn Spore, Blinding Flare); fights
with a Poison/Burn/Spore/Regen tick change (snapshot + placeholder percentages). Fights without a
status event are predicted **unchanged**.

**Hook sub-case** (a living applier's hooks now run on its ticks). The `on-kill` readers in data are
Rotfeeder Ripper and Gorgemaw (heals), Sporch Cinderlord (kill-burst, which can chain through its own
Burn ticks) and Gloomjaw Executioner (+15% Attack per kill). **No shipped trait, perk or status
listens to `on-damage-dealt`**, so that hook is dropped from the prediction. A DoT from an Executioner
is predicted **unreachable in the corpus**: it is Violence; Venom Bolt (Poison) is Instinct and
Withering Bolt (Burn) is Violence but unlocks at biome 3, while Gloomjaws live in biome 2, and gems
need a matching affinity. Step 0/the final scan checks it (a tick whose applier carries a
`finishing-blow` trait); if one exists it is named in the attribution. The affected fights are named
from the log (a `TriggerFired` of one of the four traits on the applier directly after a tick's
`DamageDealt`).

## 4. Mechanisms and the test that fails with each removed

New files: `status-snapshot.test.ts` (unit: `applyStatus` rules, `snapshotFor`, validators) and ten
goldens (all hand-derived, `golden-h2b2-*`). Each cell names the test; "site" means every place the
mechanism lives (damage tick **and** Regen heal; bearer-side **and** dealer-side hooks).

| Mechanism (sites) | Test that fails with it removed |
|---|---|
| **Re-application: stronger snapshot stays, timer refreshes** (`applyStatus`) | `golden-h2b2-reapply`: Poison applied by A (potency 6), then by B stronger (10), then by C weaker (4), then by D tie (10): ticks show B as source at 10 after B, still B after C and D; the remaining duration is each application's; `StatusApplied` + `on-status-applied` fire each time |
| **Weaker never replaces; tie keeps the current applier; weaker refreshes the timer** | same golden (C and D steps; expiry turn shifts at C) |
| **Fixed-magnitude status just refreshes; Vulnerability ×1.5 once** (`damageModifierCount`, `applyStatus`) | `golden-h2b2-vulnerability-once`: applied twice, one hit shows ×1.5 (not ×2.25); `effects.test.ts` count test for `damageModifierCount` |
| **No ×stacks on a tick; no `stacks` on the event/instance** | `golden-h2b2-reapply` (a re-application doesn't double a tick); `status-snapshot.test.ts` asserts a `StatusApplied` has no `stacks` key and an instance no `stacks` |
| **`consume-stacks` / `consumed-stacks` deleted** | the typechecker plus the shown grep; the validator tests no longer have the kind to feed |
| **Snapshot recorded at application; tick reads the snapshot, not the bearer's stat** — *damage site* (`snapshotFor`, `applyTickDamage`) | `golden-h2b2-tick-living-applier`: bearer Attack ≠ applier Attack |
| **same — heal site** (Regen) | `golden-h2b2-regen-potency`: healer Health ≠ bearer Health |
| **Snapshot frozen, not read live** — *damage site* | `golden-h2b2-tick-living-applier`: a stat modifier on the applier between application and the tick; the tick is unchanged |
| **same — heal site** | `golden-h2b2-regen-potency`: the healer's Health changes (a stat modifier) between application and the tick; the heal is unchanged |
| **Snapshot's affinity** | `golden-h2b2-tick-living-applier`: applier and bearer in a non-neutral matchup that is **asymmetric** (applier→bearer ×1.25, bearer→applier ×0.75), so a dropped, neutral or reversed affinity each changes the amount |
| **Tick is indirect damage: `− 0.2 × bearer Defence`, floor, min 1** | `golden-h2b2-tick-living-applier` (bearer Defence 20); Defend variant (×1.5 Defence, ×0.65 taken); `rawDamage` below 1 clamps to 1 |
| **No dealt pool on a tick** | same golden: applier carries a dealt-pool source (Sporch Ashborn's `conditional-damage-bonus` vs Burning, plus a Weaken) and the tick ignores both |
| **Source is the applier while it lives** — *damage* | `golden-h2b2-tick-living-applier` (`DamageDealt.sourceId`) |
| **same — heal** | `golden-h2b2-regen-potency` (`HealApplied.sourceId`, ASSUMPTION 3) |
| **Dead-applier fallback to the bearer** — *damage* (`tickSourceId`) | `golden-h2b2-tick-dead-applier`: applier killed, then ticks arrive: source is the bearer; a revived applier (second phase) is the source again |
| **same — heal** | `golden-h2b2-regen-potency` gains a phase where the healer dies: `HealApplied.sourceId` falls back to the bearer; the amount is still the frozen potency |
| **Dealer-side hooks: fire for a living applier; do not fire on the fallback; fire for a self-applied tick** (`origin.dealerId`) | `golden-h2b2-tick-living-applier` (the applier's heal-on-hit/`on-kill` fixture trait fires); `golden-h2b2-tick-dead-applier` (a **bearer-side** `on-damage-dealt` fixture trait does **not** fire on the fallback); `golden-h2b2-tick-self-applied` (the same trait fires) |
| **`triggering-source` never offered on a tick; `on-damage-taken` still fires** (`origin.kind: 'tick'`, site 1) | `golden-h2b2-tick-no-retaliation`: the bearer carries the real Snapback and the Wretch's Confusion trait and a Sleep status; a **living** applier's tick fires their `TriggerFired` (hook fires), applies nothing back at the applier, and wakes the sleeper |
| **same — `on-death`** (site 2) | `golden-h2b2-tick-kill-on-death`: a fixture `on-death → deal-damage(triggering-source)` on a bearer killed by a living applier's tick; the trigger fires, the applier takes nothing |
| **Tick never self-inflicted** | `golden-h2b2-tick-dead-applier` also carries the real Flickerling Flare (`selfInflicted: true`, bearer's side): it does not fire on a tick whose applier is dead nor on a living applier's; `golden-h2a-cost` keeps proving it fires on a cost. This is also the "observer not firing on a tick whose applier is dead" case |
| **Spore's spread copies the dying bearer's whole snapshot** (the `apply-status` rule, `fireHook` snapshot read, `applyStatus` inherited) | `golden-h2b2-spore-spread`: the new host's ticks show the original applier, affinity and potency |
| **Spread snapshotting fresh would differ** | same golden: the dying bearer's own Speed ≠ the applier's; a fresh snapshot would read the bearer |
| **A carrier applies the status fresh with its own snapshot** (ASSUMPTION 143; the rule fires only when `context.statusId === spec.statusId`) | `golden-h2b2-carrier-fresh`: an enemy-applied Spore sits on a Sporecloud Seeder; its attack applies Spore to an enemy: that Spore's source/amount are the Seeder's, not the original applier's |
| **Myconet Rotcore: applier dead at application, effective stat read then** | `golden-turn-end-dot-kill-burst` (changed): each bearer's tick source is the bearer; amount from Rotcore's Attack ×20% |
| **Validators** (one potency per status, snapshot only inside a potency status, none in traits/perks/spells) | `status-snapshot.test.ts`: each rule has a throwing case and a passing case; `data/statuses.test.ts` checks the shipped four |
| **Overtone dedup flag kept** | `golden-resonant-overtone` unchanged |

### Mutation table (each mutation killed by a named non-digest test)

Mutations 5, 6 and 10 are applied at **both** sites (the damage tick and the Regen heal) and each
site must fail.

| # | Mutation | Killed by |
|---|---|---|
| 1 | stacking restored (a re-application adds a stack) | `golden-h2b2-reapply` (tick doubles); `golden-h2b2-vulnerability-once` (×2.25); `status-snapshot.test.ts` (no `stacks` key) |
| 2 | the weaker value replaces the stronger | `golden-h2b2-reapply` (C step) |
| 3 | a tie replaces the current applier | `golden-h2b2-reapply` (D step) |
| 4 | the timer not refreshed on a weaker application | `golden-h2b2-reapply` (C step) |
| 5 | the tick/heal reads the bearer's stat | damage: `golden-h2b2-tick-living-applier`; heal: `golden-h2b2-regen-potency` |
| 6 | the snapshot read live from the applier | damage: `golden-h2b2-tick-living-applier`; heal: `golden-h2b2-regen-potency` |
| 7 | the tick on the old flat path (no Defence) | `golden-h2b2-tick-living-applier` (bearer Defence 20, and the Defend variant) |
| 8 | the dealt pool applied to a tick | `golden-h2b2-tick-living-applier` (Ashborn bonus + Weaken on the applier) |
| 9 | the source left as the bearer while the applier lives | damage: `golden-h2b2-tick-living-applier`; heal: `golden-h2b2-regen-potency` |
| 10 | the dead-applier fallback removed | damage: `golden-h2b2-tick-dead-applier`; heal: `golden-h2b2-regen-potency` (healer-dies phase) |
| 11 | `triggering-source` offered on a tick | `golden-h2b2-tick-no-retaliation` |
| 12 | a tick marked self-inflicted | `golden-h2b2-tick-dead-applier` (Flare would fire) |
| 13 | the spread snapshotting fresh | `golden-h2b2-spore-spread` |
| 14 | a carrier passing its snapshot on (the pass-on rule not gated on `context.statusId === spec.statusId`, or the carrier's own copy read) | `golden-h2b2-carrier-fresh` |
| 15 | the tick uses the bearer's affinity, or neutral | `golden-h2b2-tick-living-applier` (asymmetric matchup) |
| 16 | the applier offered as `on-death`'s source on a tick kill | `golden-h2b2-tick-kill-on-death` |
| 17 | dealer-side hooks fire on the fallback bearer | `golden-h2b2-tick-dead-applier` (bearer-side `on-damage-dealt` fixture trait fires) |
| 18 | dealer-side hooks do not fire for a self-applied living applier | `golden-h2b2-tick-self-applied` |

Each golden carries its derivation in the fixture header comment (setup, arithmetic, RNG draws — none
expected: every case is scripted with `always-wait`/`always-attack` and fixture traits, so the seed is
inert, as in the existing tick goldens). Mutations 1–18 are verified by applying each to a scratch
copy of the tree **outside the repo** and showing the named test fails; the results go in the
report. (ASSUMPTION 7's live read has no row: it is unobservable today.)

## 5. The corpus digest, in layers (scratch switches outside the repo)

Step 0 (on a `git archive` of `main`, scratch directory, read-only): run the corpus; store per fight
the log with `stacks` stripped (`H0` = its hash, hashed the digest's way); and per fight record the
**cause evidence** from `main`'s own log: (a) *re-application* — a `StatusApplied` on a creature that
already holds that status, or an application of Vulnerability, Igniter's Burn or Cinderlord's Burn;
(b) *tick/heal* — a status-driven `DamageDealt` or `HealApplied` (Poison, Burn, Spore, Regen).

After implementation, regenerate the digest **once** (`H2` = new hash). A scratch tree
(`main` + single instance + the new content for Vulnerability/Igniter/Cinderlord, ticks still on the
old flat path, `stacks` removed) gives `H1`. Each changed fight is attributed **positively**:

1. **Field only:** `H2 == H0`. Shown by that equality.
2. **Single instance:** `H1 ≠ H0`. Accepted only if evidence (a) is present in `main`'s log. A fight
   with `H1 ≠ H0` and no evidence (a) is reported **unexplained**.
3. **Snapshot:** `H2 ≠ H1`. Accepted only if evidence (b) is present in `main`'s log or the new log. A
   fight with `H2 ≠ H1` and no evidence (b) is reported **unexplained**. Within it, a scratch switch
   (tick source forced to the bearer, bearer's hooks given a source) splits "amount/channel only" from
   "source/hook effects", and the fights where an applier's `on-kill` trait now fires on a tick are
   named from the log (section 3's hook sub-case).
4. **Both:** `H1 ≠ H0` **and** `H2 ≠ H1`: listed under both, with the arithmetic of each (as for
   goldens).
5. **Unexplained:** any changed fight failing 2 or 3. An unexplained fight is a bug to resolve before
   the report, not an attribution.

The placeholder percentages ride layer 3 (they only act through ticks); Igniter, Cinderlord and
Vulnerability ride layer 2.

**Coverage requirement** ("a living-applier tick, a dead-applier tick, one Spore spread in the
corpus"): `corpus-coverage.test.ts` gains an assertion that scans the corpus events for each. If the
step-0 measurement shows the corpus lacks one, a coverage fight is **appended** to Part C (append
only; existing entries' positions and hashes untouched) and listed as "new" in the attribution —
ASSUMPTION (12). A new fight changes the digest array length; that is part of the one regeneration.

## 6. Order of work

0. Scratch baseline (section 5) and the recount (section 3). Predicted set already written.
1. **Single instance:** types, `applyStatus`, `effects.ts`, events, data (`cap`, content), tests,
   comments; `consume-stacks` removed from engine and validators. The field-only fixtures'
   expected events are edited mechanically by **stripping `stacks`** from `StatusApplied` (ASSUMPTION
   18; proved equal by step 0's deep-compare), deriving nothing.
   **Stop and ask Duncan to delete** `golden-consume-stacks.fixture.ts` and `.test.ts`; then run the
   gates. **No goldens are derived at this checkpoint.** Expected red set, in advance: ticks are still
   on the old flat path and a one-stack tick equals the single-instance tick, so only goldens whose
   values depend on a stack count fail — `golden-turn-end-dot-kill-burst-refresh` (2 stacks) and
   the unit tests rewritten in this step; the snapshot goldens stay green until step 2. (This differs
   from the review's "expect the snapshot goldens to fail" because at step 1 ticks have not moved yet.)
   Any other red golden stops the work and goes in the report.
2. **Snapshot:** potency, snapshot, `applyTickDamage`, `origin`, tick source and dealer, Regen, the
   `apply-status` pass-on rule, validators, then the percentages and the Spore spread in data.
3. The ten new goldens and `status-snapshot.test.ts`; update the snapshot goldens once against the
   final rules; create `golden-sporch-cinderlord-burn-refresh` (two files) and **stop to ask Duncan
   to delete** the two `-burn-stacks` files; deep-compare against `main`; mutation runs.
4. `npm run corpus:update` once; layers; coverage assertion.
5. Code comments, the acceptance grep.
6. All five gates; the report (`report-r1.md`) in the format of `coding-rules.md`, with **Spec
   questions**, **Content changes** and **To delete**, plus the phase-record section.

## 7. Acceptance greps (shown in the report)

Over **all** of `src/engine` and `src/data`, tests and fixtures included:
`rg -n "\bcap\b|stacks|consume-stacks|consumed-stacks|amountPerStack|statusStacks|inheritSnapshot" src/engine src/data`.
Every survivor is named; the expected set is:

- `TriggeredDef.stacks`, `ResolvedHookEffect.nonStacking`, `claimedNonStacking` and their tests, and
  `golden-resonant-overtone` (the Overtone dedup flag);
- `cap` words that are not a status cap: round cap, revive cap (10), `MAX_TRIGGER_CASCADE_DEPTH`
  wording, Bulwark's `reductionCap`, `golden-defend-count-additive-cap` (a name);
- `golden-hollowkin-wretch-self-dot` / `golden-spore-spread-fizzle` comments if they say "stacks"
  (rewritten otherwise);
- the Cinderlord golden's old import line **does not survive**: the rename removes it.

`state/balance-sim.ts` (outside both directories) is named separately: its "stacks" are stat-modifier
stacks. Any other hit is a stale status `stacks` and a defect.

## 8. Assumptions checklist

1. **The data shape** — `StatusDef.potency`, the `snapshot-potency` marker, `StatusSnapshot`,
   `StatusInstanceState.snapshot`; no `inheritSnapshot` flag. *Decided (ASSUMPTION 144).*
2. **`heal.amountPerStack` is renamed `flatAmount`** in this PR; touches effect-types (including
   the `heal` mode-exclusivity invariant message and `validateSpellEffects`' "no amountPerStack"
   check), resolution, `REGEN`, the Wick trait, `statuses.test.ts`, `glimmerdark.test.ts`.
   *Confirmed in the review.*
3. **Regen's `HealApplied.sourceId`** is the applier while it lives, else the bearer (one tick rule
   for damage and heal; no hook reads a heal's source). *Confirmed; tested at the heal site.*
4. **A tick is a response whose magnitude is `snapshot-potency`** (replaces ASSUMPTION 131); other
   self-damage inside a status is a cost. *Decided (144).*
5. **`applyDamageAndEmit` takes a required `origin`** (`hit | cost | tick{dealerId}`) in place of
   `selfInflicted`; a `perform-action` with `actor: 'triggering-source'` on `on-damage-taken` now gets
   no actor on a tick (no content has one). *Confirmed; the union form is mine.*
6. **`on-death` after a tick kill also gets no source** (keeps today's observable behaviour; tested
   by `golden-h2b2-tick-kill-on-death`).
7. **The snapshot is read from the live owning instance at fire time.** Unobservable today; no
   mutation row.
8. **A refresh takes the new application's duration even when shorter**; only the snapshot is subject
   to "stronger" (ASSUMPTION 114).
9. **`StatusApplied.sourceId` stays the applying creature**, even when the kept snapshot is an older
   applier's or was inherited.
10. **`golden-sporch-cinderlord-burn-stacks` is renamed `golden-sporch-cinderlord-burn-refresh`**
    and reclassified field-only, setup changed. *Decided; Duncan deletes the two old files.*
11. **The fixture-local tick statuses** (`golden-h2a-cost`, `golden-h2b1-observed-tick`, and the two
    `golden-b4-*`) become `potency` statuses so they keep meaning "a tick" (an unconverted one is a
    cost under 4, and `golden-h2b1-observed-tick`'s watcher would fire); amounts re-derived by hand.
12. **A corpus coverage fight is appended** if step 0 finds no living-applier tick, dead-applier tick
    or Spore spread in the existing corpus.
13. **Dead applier at application (Myconet Rotcore):** the corpse's effective stats (modifiers
    included) are readable at `on-death` time; verified by `golden-turn-end-dot-kill-burst`.
14. **Armor penetration is not applied to a tick** (the kickoff's formula).
15. **The balance simulator, the store and `demoFight` need no engine-facing change** beyond the
    event field and the demo's print.
16. **Pass-on by rule** — `context.statusId === spec.statusId` copies the firing instance's snapshot;
    no flag. `HookContext.statusId` is confirmed set for status-sourced effects in step 0. *Decided
    (145).*
17. **The tick carries its dealer:** the living applier, else no one; the fallback bearer is the logged
    source only; a self-applied living tick is a dealer. *Decided (146).*
18. **Step 1 strips `stacks` mechanically** from the field-only fixtures' expected events (no
    derivation), justified by the step-0 deep-compare, so the step-1 gates are meaningful.

## Spec questions (surfaced while planning; for the report, docs to be settled before H2c's kickoff)

- CONVENTIONS "Response vocabulary" counts the responses; with `consume-stacks` gone the count and the
  "hold the line at nine" wording in `effect-types.ts` need re-stating.
- ASSUMPTION 131 is superseded by 144; CONVENTIONS text for "DoT and Regen from the applier's
  snapshot" (the dealer rule, Regen's source, pass-on by rule, the data shape), "Flat-mode
  stat-derived magnitude" (`amountPerStack` → `flatAmount`), "Damage channels" (the tick recognised by
  its marker), "Damage observation" (`origin` replaces `selfInflicted`) and the `magnitudeSource`
  bullet (`consumed-stacks` gone) go stale on merge. Listed with file and line in the report.
- Whether `on-death` after a tick kill should ever offer the applier as `triggering-source`
  (assumption 6) — no content depends on it.

## Content changes (to list in the report, as built)

Spore (tick 15% Speed + spread passing the snapshot), Poison (20% Attack), Burn (25% Intelligence),
Regen (10% of the healer's Health), Vulnerability (×1.5 once), Sporch Igniter (one Burn), Cinderlord
(one Burn per enemy), Blinding Flare and Afterglow descriptions (no per-stack text). The design agent
folds the content docs at the PR review.
