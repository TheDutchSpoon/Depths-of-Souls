# Plan — Phase 4.1 — Slice H2b2: status rules

Written against `kickoff.md` and `brief.md` (this mailbox), `coding-rules.md`, and the code as read
on branch `phase-4.1-slice-h2b2` (resolution.ts, effects.ts, effect-types.ts, types.ts,
data/statuses.ts, the Rotcap/Glimmerdark traits and spells, the golden fixtures, the corpus
digest). Nothing has been run. Every ASSUMPTION is marked inline as `ASSUMPTION (n)` and collected in
the checklist at the end.

## 1. Approach

Two rules, built in this order so each stays reviewable and the gates stay green between them:

1. **Single instance.** Delete the stack concept end to end (type fields, increment, the ×stacks
   count, `consume-stacks`, `consumed-stacks`, the event field). Re-application keeps the stronger
   value and refreshes the timer. At this point a status still ticks on the old flat path.
2. **The applier snapshot.** A status that ticks declares a **potency**; an instance records a
   **snapshot** at application; a tick is indirect damage (or a heal) from that snapshot through the
   one existing indirect formula, with the applier as source while it lives.

Then content, goldens, the corpus, docs.

### The data shape (the kickoff asks the plan to propose it) — ASSUMPTION (1)

```ts
// effect-types.ts
type StatusPotency = StatPercent                        // { ofStat, percent }, percent a positive integer
type SnapshotPotency = { readonly kind: 'snapshot-potency' }   // a magnitude marker: "the instance's potency"
type StatusSnapshot = { applierId: CreatureId; affinity: Affinity; potency: number }

StatusDef      { statusId; effects; polarity; defaultDuration; potency?: StatusPotency }   // `cap` deleted
StatusInstanceState { remainingDuration; appliedAt; snapshot?: StatusSnapshot }            // `stacks` deleted
StatusSpec     { statusId; duration?; inheritSnapshot?: true }                             // `stacks` deleted
deal-damage.flatAmount?: number | StatPercent | SnapshotPotency
heal.flatAmount?:        number | StatPercent | SnapshotPotency   // renamed from `amountPerStack` (ASSUMPTION 2)
```

- `StatusDef.potency` is where a ticking status says which applier stat and what percent it scales.
  One potency per status. `snapshot` exists on an instance **iff** its def declares `potency`.
- A tick is **the response whose magnitude is `{ kind: 'snapshot-potency' }`**; that marker replaces
  ASSUMPTION 131's test ("statusId + flat + self") — ASSUMPTION (4). A status's other self-damage with
  a plain amount is, by the cost rule, a cost.
- `inheritSnapshot: true` on an `apply-status` is how **Spore's spread identifies itself as the
  status's own effect** (ASSUMPTION 143): the flag is legal only in a status's own `apply-status`
  whose `statusId` equals that status, and at run time it reads the **firing instance's** snapshot
  from the hook context. A trait/perk/spell cannot carry the flag or a snapshot magnitude (loaded
  validators), so "a carrier passing its snapshot on" is unrepresentable in data and the engine also
  never looks at the applier's own copy of the status.
- Validators (new, in `validateStatusDef` and a trait/perk counterpart beside
  `validateNoBreakChanceOutsideStatus`, called from `data/traits/index.ts` and
  `data/specializations.ts`; spells reject both through `validateSpellEffects`): a status with
  `potency` carries **exactly one** snapshot-magnitude response (deal-damage or heal, target `self`,
  no `magnitudeSource`); a status without `potency` carries none and no `inheritSnapshot`;
  `potency.percent` a positive integer; `inheritSnapshot` only per the rule above.

### Module changes by file

**`engine/types.ts`** — `StatusAppliedEvent` loses `stacks`.

**`engine/effect-types.ts`**
- Delete: `StatusDef.cap`, `StatusSpec.stacks`, `StatusInstanceState.stacks`,
  `ResolvedHookEffect.stacks`, `FlatOf.statusStacks`, the `consume-stacks` response and its branch in
  `validateResponseTargetNoRandomSelector`, `MagnitudeSource`'s `consumed-stacks`. Comments that
  describe stacks/caps/consume-stacks as current are rewritten (the acceptance grep covers them).
- Add: the types above; the validators above; `heal.flatAmount` replaces `amountPerStack` (the
  `validateSpellEffects` messages follow).
- **Kept, named in the grep:** `TriggeredDef.stacks: false` and `ResolvedHookEffect.nonStacking`
  (the Overtone dedup flag, ASSUMPTION 114).

**`engine/effects.ts`**
- `flatEffects`: stop yielding `statusStacks`. `modifierSource` / `TakenReductionSource` lose
  `stacks`; `damageModifierCount` becomes `magnitudeSource ? resolveMagnitudeCount(...) : 1`
  (the `?? 1` path of an effect outside a status becomes the only default); `takenFactorFor` is
  unchanged otherwise (`magnitude ** 1` is exact, so Weaken/Vulnerability/Defend keep their bits).
- `effectsForHook`: no `stacks`.
- `instantiateStatus(def, id, duration, snapshot | undefined, appliedAt)` replaces the `stacks`
  parameter.
- `resolveMagnitudeCount` loses `consumedStacks` and the `consumed-stacks` case.
- New pure helper `snapshotFor(applier, potency)` = `{ applierId, affinity, potency:
  floor(floor(getEffectiveStat(applier, ofStat)) * percent / 100) }`, integer arithmetic, one floor.

**`engine/resolution.ts`**
- `HookContext`: `stacks` and `consumedStacks` out; `snapshot?: StatusSnapshot` in.
- `fireHook`: after the exact-instance check, when the candidate is status-sourced, read
  `snapshot` **from the live owning instance** (`self.activeEffects` by `sourceInstanceId`), not from
  the list built at the top of the pass — ASSUMPTION (7): a refresh earlier in the same pass can
  replace the snapshot while keeping the id. Pass it in the context.
- `executeResponse`:
  - `deal-damage`: the `count` default `context.stacks` goes (`count` is `magnitudeSource` or
    undefined). New first branch for `flatAmount.kind === 'snapshot-potency'` → `applyTickDamage`.
    The old `statusId && targetId === self` → `applyFlatDamage` branch and `applyFlatDamage` itself
    are deleted. The cost branch (`indirect` and target is self) is untouched.
  - `heal`: same count change; the snapshot branch heals `snapshot.potency` through `applyHeal`
    (no Defence, no minimum, clamped to max Health) with `sourceId` = the tick source (below).
  - `apply-stat-modifier`: the `context.stacks > 1` fallback goes.
  - `apply-status`: passes `context.snapshot` as the inherited snapshot iff the spec says
    `inheritSnapshot`; a flag without a snapshot in context throws a resolver invariant.
  - `consume-stacks` case deleted.
- `applyTickDamage(bearer, snapshot, damageSource, state, ctx, statusId)`: the one **reuse** of
  `calculateIndirectDamage` (no third formula), inputs:
  `magnitude = snapshot.potency`, `defence = resolveDefenceAndTakenFactors(bearer).defence`
  (Defend ×1.5 applies), `attackerAffinity = snapshot.affinity`, `defenderAffinity = bearer.affinity`,
  `dealtMods = []`, `armorPenetrationPercent` omitted, `takenFactors = [...defendFactors,
  ...gatherTakenFactors(bearer, state)]` (the order `dealDamageCore` uses). No `conditional-damage-bonus`,
  no cross-stat, no Additional. Source = `tickSourceId(snapshot, bearerId, state)`: the applier if
  `findCreature(...).alive` at tick time, else the bearer (read at tick time, so a revived applier is
  the source again).
- **`applyDamageAndEmit`'s `selfInflicted: boolean` becomes a required `origin: 'hit' | 'tick' |
  'cost'`** — ASSUMPTION (5). `'cost'` ⇒ `selfInflicted` true (today's only true case). `'tick'` ⇒
  `selfInflicted` false **and** the bearer's own hooks (`on-damage-taken`, `on-death`) are fired with
  **no source**, so `triggering-source` and a `'triggering-source'` actor resolve to nothing, while the
  hooks themselves still fire (Sleep wakes). The applier's hooks (`on-damage-dealt`, `on-kill`) get the
  victim as source as for any hit. `'hit'` is today's behaviour. Required with no default so the
  compiler finds every caller (the H2b1 convention). ASSUMPTION (6): `on-death` after a tick kill gets
  no source either (no content reads it today; the rule "a tick offers no triggering-source" is applied
  to the bearer's whole reaction).
- `applyStatus(sourceId, targetId, spec, state, ctx, inherited?)`:
  - candidate snapshot = `inherited ?? (def.potency && snapshotFor(applier, def.potency))`;
  - existing instance: keep its id; `remainingDuration` = the new application's (`spec.duration ??
    def.defaultDuration`), `appliedAt` reset; the snapshot is replaced **only if the candidate's
    potency is strictly greater** (tie and weaker keep the current instance whole: applier, affinity,
    potency); fixed-magnitude statuses have no snapshot and just refresh — ASSUMPTION (8);
  - a weaker or tied re-application still emits `StatusApplied` (`sourceId` = the applying creature,
    as today — ASSUMPTION (9)) and fires `on-status-applied`;
  - `StatusApplied` has no `stacks`.

**`data/statuses.ts`** — `cap` removed from all 13 statuses; Poison `potency {attack, 20}`, Burn
`{intelligence, 25}`, Regen `{health, 10}`, Spore `{speed, 15}`; each tick response uses
`flatAmount: { kind: 'snapshot-potency' }`, Regen's heal likewise; Spore's spread gets
`status: { statusId: 'spore', inheritSnapshot: true }`; Vulnerability stays `magnitude: 1.5` (now once);
doc comments rewritten (no "per stack", no cap).

**`data/traits/rotcap-hollow.ts`** — Igniter `status: { statusId: 'burn' }`; Cinderlord the same, its
PR #64 "stacks: 1" comment replaced; the Rot Sovereign / Seeder / Bloomer / Rotcore comments that
mention stacking are fixed. **`data/traits/glimmerdark.ts`** — the Wick's heal `amountPerStack` →
`flatAmount` (a bearer percent, so it stays a plain `StatPercent`, not a snapshot). **`data/spells/core.ts`,
`glimmerdark.ts`, `rotcap-hollow.ts`** — comments only (Venom Bolt's Poison, Blinding Flare "x1.5/stack",
Afterglow's Regen, Withering Bolt's Burn); no spell data changes.

**`app/demoFight.ts`** — no code change expected (regen-on-hit applies `regen` with `duration: 3`);
comment check. **`ui/CombatDemo.tsx:223`** — print `gains <status> (<n>r)` without `x<stacks>`. Nothing
moves into the demo.

**`state/balance-sim.ts`** — no change; its `stacks` are stat-modifier stacks (named in the grep). Its
test literals that spell `StatusApplied` lose the field.

### Docs

- `CONVENTIONS.md`: "Status lifecycle" (single instance, refresh), "DoT and Regen from the applier's
  snapshot" (add the data shape: `potency`, the marker, `inheritSnapshot`; the tick-source rule for the
  bearer's `on-death`), "Flat-mode stat-derived magnitude" (drop "status ticks until 4.1-H2b", rename
  `amountPerStack` → `flatAmount`), "Damage channels" (the tick test now the marker), the
  `magnitudeSource` bullet (`consumed-stacks` gone), "Response vocabulary" (`consume-stacks` gone,
  eight → seven responses is **not** claimed here: the list is revised to what is left; see Spec
  questions).
- `content/rotcap-hollow.md`, `overgrowth.md`, `glimmerdark.md`: fold the H2b2 items of "Decided at the
  4.1-H2 grill" into their bodies (Spore paragraph; Sporch table "2-stack"/"1 stack"; Afterglow "per
  stack") and delete them from the pending section; Health and tuning items stay. `species-locked.md`:
  the Sporch row and response-vocabulary notes if they name stacks.
- Phase record: appended to `.claude/phases/phase-4.1-fix-and-consolidation.md` (Phase 4.1 is the
  old layout; `.claude/phases/4.1/brief.md` does not exist), as `coding-rules.md` says.

## 2. Golden policy (restated from the kickoff)

**Deliberate, listed.**
- `golden-consume-stacks` is retired (Duncan deletes `.fixture.ts` and `.test.ts`).
- A golden that only loses `stacks` from `StatusApplied` changes **in that field alone**: proved by
  importing both trees' fixtures (`main` extracted to a scratch directory outside the repo with
  `git archive`, so nothing touches `.git`) and deep-comparing every `expected*` export, with `stacks`
  stripped from `main`'s `StatusApplied` events: equal.
- Every other changed golden is listed with its rule (single instance / applier snapshot / both, the
  arithmetic shown for each). New goldens are hand-derived (setup, arithmetic, draws in comments),
  run through the shared golden runner, deep-frozen.
- The digest is regenerated **once**, through `npm run corpus:update`, attributed in layers (section 5).

## 3. The predicted changed set (written before the first run; recounted by step 0)

Counted from the fixtures on this tree (41 fixtures contain a `StatusApplied`):

| Group | Goldens | Count |
|---|---|---|
| **Retired** | `golden-consume-stacks` | 1 |
| **Single instance** | `golden-sporch-cinderlord-burn-stacks` (stacks 1→2→3 becomes refresh; the file is renamed in intent, name kept, or Duncan renames — ASSUMPTION 10); `golden-turn-end-dot-kill-burst-refresh` (2 stacks → one instance; also snapshot) | 2 |
| **Applier snapshot** (tick amount, source, channel) | `golden-dot`, `golden-f2-dot-one-turn`, `golden-f2-turn-end-interaction` (Spore), `golden-spore-spread-dot-kill`, `golden-turn-end-dot-kill-burst`, `golden-turn-end-dot-kill-burst-refresh` (both rules), `golden-h2a-cost` and `golden-h2b1-observed-tick` (their local mini-poison, ASSUMPTION 11), `golden-hollowkin-wretch-self-dot` (no `StatusApplied`; setup applies Poison) | 9 |
| **Field only** (`stacks` dropped) | the other 31 fixtures with a `StatusApplied` — including `golden-b4-cleanse-then-tick` and `-remove-then-reapply` (their local tick status becomes a `potency` status, but no tick lands), `golden-f2-win-over-own-tick` (the fight ends before the tick), `golden-rot-sovereign`, `golden-spore-spread`, `golden-spore-spread-filter` | 31 |
| **Unchanged** | every other golden, incl. all `golden-h2a-*` and `golden-h2b1-*` except the two named, `golden-resonant-overtone`, `golden-loop-safety`, `golden-sleep-wake` (field only: it has a `StatusApplied`) | rest |

(41 = 1 retired + 1 cinderlord + 8 snapshot-with-`StatusApplied` + 31 field-only; `golden-hollowkin-wretch-self-dot`
is the ninth snapshot golden and has no `StatusApplied`. The H2b-split counts — 41/8/3 — match: 8 tick
goldens, 3 stacking [consume-stacks, cinderlord, refresh].) `golden-sleep-wake` is listed under field
only and is in the kickoff's must-stay-green set: it stays green in everything but that field.
The step-0 deep-compare is what makes "field only" a measured claim rather than this table.

**Non-golden tests changed** (all mechanical unless noted): `cap:` literal removal and `stacks:` removal
from event literals in `actions`, `combat`, `conditions`, `confusion`, `damage-observation`,
`effective-stats`, `interpreter`, `perform-action`, `spell-effects`, `status-timing`, `support-spells`,
`targeting`, `turn-order` tests and `state/balance-sim.test.ts`; **behavioural rewrites** in
`status-containers.test.ts` (stack cap/increment tests → single-instance/refresh), `resolution.test.ts`
(38 `stacks` mentions: stack-scaled ticks/heals/modifier fallback, `consume-stacks`, `applyStatus` stack
cases), `effects.test.ts` (`statusStacks`, damage-modifier counts, `consumed-stacks`); data tests
`statuses.test.ts` (ticks now snapshot), `glimmerdark.test.ts` (`amountPerStack`). `corpus-coverage.test.ts`
stays as is except for the new coverage assertion below.

**Digest causes** (predicted; counted by step 0 on `main`): every fight whose log has a `StatusApplied`
changes (field); fights where a status is re-applied change (single instance: Venom Bolt/Withering
Bolt/Spore Cyst recasts, Igniter, Cinderlord, Rot Sovereign's per-turn Spore, Blinding Flare); fights
with a Poison/Burn/Spore/Regen tick change (snapshot + placeholder percentages); fights where a living
applier now has `on-damage-dealt`/`on-kill` on a tick are the *hook* sub-case — the traits that can
fire are Rotfeeder Ripper and Gorgemaw (heal) and Sporch Cinderlord's kill-burst chaining through its
own Burn. Fights without a status event are predicted **unchanged**.

## 4. Mechanisms and the test that fails with each removed

New files: `status-snapshot.test.ts` (unit: `applyStatus` rules, `snapshotFor`, validators) and eight
goldens (all hand-derived, `golden-h2b2-*`). Each cell names the test; "site" means every place the
mechanism lives.

| Mechanism (sites) | Test that fails with it removed |
|---|---|
| **Re-application: stronger snapshot stays, timer refreshes** (`applyStatus`) | `golden-h2b2-reapply`: Poison applied by A (potency 6), then by B stronger (10), then by C weaker (4), then by D tie (10): ticks show B as source at 10 after B, still B after C and D; the remaining duration is each application's; `StatusApplied` + `on-status-applied` fire each time |
| **Weaker never replaces** | same golden (C step) |
| **Tie keeps the current applier** | same golden (D step: source stays B, not D) |
| **Timer refreshed by a weaker application** | same golden (C step: expiry turn shifts) |
| **Fixed-magnitude status just refreshes; Vulnerability ×1.5 once** (`damageModifierCount`, `applyStatus`) | `golden-h2b2-vulnerability-once`: applied twice, one hit shows ×1.5 (not ×2.25); `effects.test.ts` count test for `damageModifierCount` |
| **No ×stacks on a tick; no `stacks` on the event/instance** (`flatEffects`, `executeResponse` count default, `StatusApplied`) | `golden-h2b2-reapply` (a re-application doesn't double a tick); `status-snapshot.test.ts` asserts a `StatusApplied` has no `stacks` key and an instance no `stacks` |
| **`consume-stacks` / `consumed-stacks` deleted** (types, validator, `executeResponse`, `resolveMagnitudeCount`) | deletion is proved by the typechecker plus the shown grep; `statuses`/trait validators tests no longer have the kind to feed |
| **Snapshot recorded at application; tick reads the snapshot, not the bearer's stat** (`snapshotFor`, `applyTickDamage`) | `golden-h2b2-tick-living-applier`: bearer Attack ≠ applier Attack; potency and the amount come from the applier |
| **Snapshot frozen, not read live** | same golden: the applier's Attack is changed (a stat-modifier on it) between application and the tick; the tick is unchanged |
| **Tick is indirect damage: `− 0.2 × bearer Defence`, floor, min 1** | same golden (bearer Defence 20); Defend variant (×1.5 Defence, ×0.65 taken); `rawDamage` below 1 clamps to 1 |
| **No dealt pool on a tick** (`applyTickDamage` passes `[]`) | same golden: applier carries a dealt-pool source (Sporch Ashborn's `conditional-damage-bonus` vs Burning, plus a Weaken) and the tick ignores both |
| **Source is the applier while it lives** | same golden (`DamageDealt.sourceId`, and the applier's `on-damage-dealt` fires: a heal-on-hit trait) |
| **Dead-applier fallback to the bearer** (`tickSourceId`) | `golden-h2b2-tick-dead-applier`: applier killed, then ticks arrive: source is the bearer; no `on-damage-dealt` for the dead applier; a revived applier (second phase) is the source again |
| **`triggering-source` never offered on a tick; `on-damage-taken` still fires** (`origin: 'tick'` in `applyDamageAndEmit`) | `golden-h2b2-tick-no-retaliation`: the bearer carries the real Snapback and the Wretch's Confusion trait and a Sleep status; a **living** applier's tick fires their `TriggerFired` (hook fires), applies nothing back at the applier, and wakes the sleeper |
| **Tick never self-inflicted** (`origin: 'tick'` ⇒ `selfInflicted: false`) | `golden-h2b2-tick-dead-applier` also carries the real Flickerling Flare (`selfInflicted: true`, bearer's side): it does not fire on a tick whose applier is dead (source = bearer) nor on a living applier's; `golden-h2a-cost` keeps proving it fires on a cost |
| **Regen heals the potency; source applier while alive else bearer** | `golden-h2b2-regen-potency`: healer Health ≠ bearer Health; heal = `floor(floor(healer Health) × 10 / 100)`, clamped to max, no Defence |
| **Spore's spread copies the dying bearer's whole snapshot** (`inheritSnapshot`, `fireHook` snapshot read, `applyStatus` inherited) | `golden-h2b2-spore-spread`: the new host's ticks show the original applier, affinity and potency |
| **Spread snapshotting fresh would differ** | same golden: the dying bearer's own Speed ≠ the applier's; a fresh snapshot would read the bearer |
| **A carrier applies the status fresh with its own snapshot** (ASSUMPTION 143) | `golden-h2b2-carrier-fresh`: an enemy-applied Spore sits on a Sporecloud Seeder; its attack applies Spore to an enemy: that Spore's source/amount are the Seeder's, not the original applier's |
| **Myconet Rotcore: applier dead at application, effective stat read then** | `golden-turn-end-dot-kill-burst` (changed): each bearer's tick source is the bearer; amount from Rotcore's Attack ×20% |
| **Validators** (one potency per status, snapshot only inside a potency status, none in traits/perks/spells, `inheritSnapshot` only in the status's own spread) | `status-snapshot.test.ts`: each rule has a throwing case and a passing case; `data/statuses.test.ts` checks the shipped four |
| **Overtone dedup flag kept** | `golden-resonant-overtone` unchanged |

### Mutation table (each mutation killed by a named non-digest test)

| # | Mutation | Killed by |
|---|---|---|
| 1 | stacking restored (a re-application adds a stack) | `golden-h2b2-reapply` (tick doubles); `golden-h2b2-vulnerability-once` (×2.25); `status-snapshot.test.ts` (no `stacks` key) |
| 2 | the weaker value replaces the stronger | `golden-h2b2-reapply` (C step) |
| 3 | a tie replaces the current applier | `golden-h2b2-reapply` (D step) |
| 4 | the timer not refreshed on a weaker application | `golden-h2b2-reapply` (C step) |
| 5 | the tick reads the bearer's stat | `golden-h2b2-tick-living-applier` |
| 6 | the snapshot read live from the applier | `golden-h2b2-tick-living-applier` (applier modified after application) |
| 7 | the tick on the old flat path (no Defence) | `golden-h2b2-tick-living-applier` (bearer Defence 20, and the Defend variant) |
| 8 | the dealt pool applied to a tick | `golden-h2b2-tick-living-applier` (Ashborn bonus + Weaken on the applier) |
| 9 | the source left as the bearer while the applier lives | `golden-h2b2-tick-living-applier` |
| 10 | the dead-applier fallback removed | `golden-h2b2-tick-dead-applier` |
| 11 | `triggering-source` offered on a tick | `golden-h2b2-tick-no-retaliation` |
| 12 | a tick marked self-inflicted | `golden-h2b2-tick-dead-applier` (Flare would fire) |
| 13 | the spread snapshotting fresh | `golden-h2b2-spore-spread` |
| 14 | a carrier passing its snapshot on | `golden-h2b2-carrier-fresh` |

Each golden carries its derivation in the fixture header comment (setup, arithmetic, RNG draws —
none are expected: every case is scripted with `always-wait`/`always-attack` and fixture traits, so
the seed is inert, as in the existing tick goldens). Mutations 1–14 are verified by applying each to
a scratch copy of the tree **outside the repo** and showing the named test fails; the results go in
the report.

## 5. The corpus digest, in layers (scratch switches outside the repo)

Step 0 (on a `git archive` of `main`, scratch directory, read-only): run the corpus, store per-fight
the log with `stacks` stripped, and count fights by `StatusApplied` / re-application / tick / Regen.
Then, after the implementation, regenerate the digest **once** and attribute:

1. **Field only:** `main`'s logs with `stacks` stripped, hashed the digest's way, must equal the new
   hash → "field". Every fight in this layer is shown by that equality.
2. **Single instance:** a scratch tree = `main` + (every `cap` forced to 1, `stacks` content values
   ignored, Vulnerability/Igniter/Cinderlord on their new content), no snapshot. Fights equal to the
   new digest after this layer and not in layer 1 → "single instance".
3. **Snapshot:** the remainder, against the final tree. A scratch switch (tick source forced to the
   bearer, bearer's hooks given a source) splits "amount/channel only" from "source/hook effects":
   the fights where the applier's `on-damage-dealt`/`on-kill` now fire (Ripper, Gorgemaw, a Cinderlord
   Burn-tick kill chain) are named.
4. **Content:** anything the three layers do not explain is a content change (percentages, Igniter,
   Cinderlord, Vulnerability) and is named; an unexplained fight is a bug, not an attribution.

**Coverage requirement** ("a living-applier tick, a dead-applier tick, one Spore spread in the
corpus"): `corpus-coverage.test.ts` gains an assertion that scans the corpus events for each. If the
step-0 measurement shows the corpus lacks one, a coverage fight is **appended** to Part C (append
only; existing entries' positions and hashes are untouched) and listed as "new" in the attribution —
ASSUMPTION (12). A new fight changes the digest array length; that is part of the one regeneration.

## 6. Order of work

0. Scratch baseline (above). Predicted set already written (section 3).
1. **Single instance:** types, `applyStatus`, `effects.ts`, events, data (`cap`, content), tests,
   comments. `consume-stacks` removed from engine and validators.
   **Stop here and ask Duncan to delete** `src/engine/__golden__/golden-consume-stacks.fixture.ts`
   and `golden-consume-stacks.test.ts`; then run the gates. No test is emptied or skipped.
2. **Snapshot:** potency, snapshot, `applyTickDamage`, `origin`, tick source, Regen, `inheritSnapshot`,
   validators, then the percentages and the Spore spread in data.
3. The eight new goldens and `status-snapshot.test.ts`; update the nine snapshot goldens and the
   field-only ones; deep-compare against `main`; mutation runs.
4. `npm run corpus:update` once; layers; coverage assertion.
5. Docs (CONVENTIONS, content docs), code comments, the acceptance grep.
6. All five gates; the report (`report-r1.md`) in the format of `coding-rules.md`, plus the phase-record
   section.

## 7. Acceptance greps (shown in the report)

`rg -n "\bcap\b|stacks|consume-stacks|consumed-stacks|amountPerStack|statusStacks" src/engine src/data`
(non-test) returns only: `TriggeredDef.stacks`/`nonStacking`/`claimedNonStacking` (the Overtone dedup
flag) and the unrelated `cap` words in comments about round cap / revive cap / Bulwark's
`reductionCap`. The balance simulator's stat-modifier "stacks" (`state/balance-sim.ts`) is outside
`src/engine`/`src/data` and is named separately.

## 8. Assumptions checklist

1. **The data shape** — `StatusDef.potency`, the `snapshot-potency` marker, `StatusSnapshot`,
   `StatusSpec.inheritSnapshot`, `StatusInstanceState.snapshot`; `inheritSnapshot` as the way the
   spread identifies itself as the status's own effect. *Design owner to confirm or redirect.*
2. **`heal.amountPerStack` is renamed `flatAmount`** in this PR (kickoff lean: rename); touches
   effect-types, resolution, `validateSpellEffects` messages, `REGEN`, the Wick trait, `statuses.test.ts`,
   `glimmerdark.test.ts`, CONVENTIONS.
3. **Regen's `HealApplied.sourceId`** is the applier while it lives, else the bearer (kickoff lean; one
   tick rule for damage and heal; no hook reads a heal's source).
4. **A tick is a response whose magnitude is `snapshot-potency`** (replaces ASSUMPTION 131's
   `statusId + flat + self` test); other self-damage inside a status is a cost.
5. **`applyDamageAndEmit` takes a required `origin: 'hit' | 'tick' | 'cost'`** in place of
   `selfInflicted` (cost ⇒ self-inflicted; tick ⇒ not, and no source for the bearer's hooks).
6. **`on-death` after a tick kill also gets no source** (the rule applied to the bearer's whole
   reaction; no content reads it).
7. **The snapshot is read from the live owning instance at fire time**, not from the candidate list
   built at the top of the pass (a same-pass refresh is seen).
8. **A refresh takes the new application's duration even when shorter** (today's rule kept), and only
   the snapshot is subject to "stronger".
9. **`StatusApplied.sourceId` stays the applying creature** even when the kept snapshot is an older
   applier's or the snapshot was inherited.
10. **`golden-sporch-cinderlord-burn-stacks` keeps its file name** (Duncan may rename it; it is
    deletion/creation of a file, which I can't do).
11. **The fixture-local tick statuses** (`golden-h2a-cost`, `golden-h2b1-observed-tick`, and the two
    `golden-b4-*`) are converted to `potency` statuses so they keep meaning "a tick"; their amounts
    are re-derived by hand.
12. **A corpus coverage fight is appended** if step 0 finds no living-applier tick, dead-applier tick
    or Spore spread in the existing corpus.
13. **Dead applier at application (Myconet Rotcore):** the corpse's effective stats (modifiers
    included) are still readable at `on-death` time; verified by `golden-turn-end-dot-kill-burst`.
14. **Armor penetration is not applied to a tick** (the kickoff's formula; it is the applier's live
    build and absent from the snapshot).
15. **The balance simulator, the store and `demoFight` need no engine-facing change** beyond the event
    field and the demo's print.

## Spec questions (surfaced while planning; docs to be settled before H2c's kickoff)

- CONVENTIONS "Response vocabulary" counts the responses; with `consume-stacks` gone the count and the
  "hold the line at nine" wording in `effect-types.ts` need re-stating.
- ASSUMPTION 131 (the tick test) is replaced by the marker (assumption 4 here); the doc text should
  say so.
- Whether `on-death` after a tick kill should offer the applier as `triggering-source` (assumption 6)
  — no content depends on it.
