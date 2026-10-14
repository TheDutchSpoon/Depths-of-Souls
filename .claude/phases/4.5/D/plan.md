# Plan — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

## Revision 2: what changed

Folds `plan-handout-r1.md` items 1-13. Re-read: `kickoff.md`'s golden policy, stale-text trap and
"The PR must prove"; `brief.md`'s golden-policy line.

- **Item 1** (`effective-stats.ts`): one `effectiveMaxHp`, defined in `effective-stats.ts`, re-exported
  by `effects.ts`; no private `flooredMaxHp`. Old A1 is gone.
- **Item 2** (`tie-break.ts`): one picker, `pickExtremumBy`; `pickExtremum` is a wrapper over it. Old
  A2 is gone.
- **Item 3** (`effect-types.ts`): `DamageChannel` is declared in `effect-types.ts`. Old A4 is gone.
- **Item 4** (fixtures): no `__fixtures__/retaliators.ts`; test 2's variants are local to
  `damage-channel.test.ts`. Old A6 is gone.
- **Item 5** (golden policy): the two tick-fizzle goldens are deleted, not moved. Each mutant they
  killed is named against the test that kills it now.
- **Items 6-9** (test 2): the indirect-hit row, exact event slices for tick and cost rows, the
  `stacks: false` case, and the Sleep case as a tick only.
- **Item 10** (test 3): all-real-content setup with two creatures and `TURN_STEPS = 2`.
- **Item 11** (test 1): no HP% tie-pair case.
- **Item 12** (test 5): containment, not set equality.
- **Item 13** (staged builds): each is a `git clone` of the branch base outside the repo.

Built against `kickoff.md`, `phases/4.5/brief.md#hp-qualifiers-pick-by-hp`,
`#retaliation-answers-only-attacks-and-spells`, `#last-stand-never-rolls-at-1-hp`,
`phases/4.5/D/evidence/kickoff-probe.md`, and the spec files the kickoff names. No spec file the
kickoff omits is reached (`spec/saves.md`, `spec/store.md` untouched: no state shape changes).

## Approach in one paragraph

Three independent engine changes, one regeneration of the corpus digest.

1. **HP%**: `evaluateCondition`'s `lowest`/`highest` pick orders the pool by HP% (integer
   cross-multiplication) through the shared side → slot → id tie-break.
2. **Retaliation**: the channel of the damage that fires `on-damage-taken` is carried from the
   branch that chose it into `fireHook`, which skips a candidate whose new optional
   `damageChannel` differs, before condition, chance roll and `stacks: false` claim. A validator
   rejects the field off `on-damage-taken` on every carrier. The four retaliators set `'direct'`.
3. **Last Stand**: `applyDamageAndEmit` gates the `cheat-death` roll on the target's `currentHp`
   before the hit being above the survival HP, a named constant shared with the save.

## Module changes, by file

### `src/engine/config.ts`
- Add `CHEAT_DEATH_SURVIVAL_HP = 1` (combat rule constant, `CONVENTIONS.md#where-each-number-lives`).
  One name for "the HP a save leaves" and "the HP at which no roll happens"
  (`CONVENTIONS.md#no-magic-numbers`).

### `src/engine/effective-stats.ts`
- Define `effectiveMaxHp(creature)` = `Math.floor(getEffectiveStat(creature, 'health'))` here, once,
  exported. `hpPercentSatisfied` calls it (behaviour identical).
- New exported `compareHpPercent(a, b): number` =
  `a.currentHp × effectiveMaxHp(b) − b.currentHp × effectiveMaxHp(a)`. Negative when `a` has the
  lower HP%. Pure integer arithmetic, no division. One source for "what HP% divides by" for the
  threshold test and the ordering (kickoff trap 1).
- `hpPercentSatisfied`'s doc comment points at the one definition instead of saying the value is
  "computed HERE".

### `src/engine/effects.ts`
- `effectiveMaxHp` is removed from its body and re-exported from `./effective-stats`
  (`export { effectiveMaxHp } from './effective-stats'`), so `combat.ts`, `resolution.ts` and
  `targeting.ts` keep their imports. `effects.ts` already imports `effective-stats.ts`: no cycle.
  `effects.test.ts`'s `effectiveMaxHp` cases stay byte-identical.
- `effectsForHook` copies `damageChannel: e.damageChannel` into the resolved shape (kickoff trap 3).
  `flatEffects` already spreads a status trigger's fields, so statuses carry it with no change.

### `src/engine/tie-break.ts`
- New `pickExtremumBy(pool, order: (a, b) => number, direction)`: sorts a copy by `order` (negated
  for `'desc'`), falls back to `compareBySideSlotId`, returns `[0]`.
- `pickExtremum(pool, keyOf, direction)` becomes `pickExtremumBy(pool, (a, b) => keyOf(a) - keyOf(b),
  direction)`. `compareByKey` and `tie-break.test.ts` unchanged; every selector golden stays
  byte-identical (checked by the full suite, no golden regenerated for it).

### `src/engine/conditions.ts`
- `hp-percent` `lowest`/`highest`: `pickExtremumBy(pool, compareHpPercent, 'asc' | 'desc')` replaces
  `pickExtremum(pool, c => c.currentHp, …)`. `any` unchanged. The `pickExtremum` import drops if
  unused.

### `src/engine/effect-types.ts`
- Declare `export type DamageChannel = 'direct' | 'indirect'` here, with its existing doc comment
  moved. `effect-types.ts` imports nothing new.
- `TriggeredDef.damageChannel?: DamageChannel`. Doc comment: valid on `on-damage-taken` only; absent
  = answers any damage; matched against the incoming damage's channel.
- `ResolvedHookEffect.damageChannel?: DamageChannel`.
- New `validateDamageChannels(defs, context)`, beside `validateObservationFilters`: throws
  `effect invariant violated: <where> carries a damageChannel, which only an "on-damage-taken"
  trigger may carry` for a `triggered` def with the field on any other hook.
- Called from `validateTrait` (so `createCombat`'s registry check runs it too) and
  `validateStatusDef` (the status registry, called from `data/statuses.ts`).

### `src/engine/resolution-types.ts`
- Imports `DamageChannel` from `./effect-types` (and drops its own declaration).
- `DamageOrigin` `hit` becomes `{ readonly kind: 'hit'; readonly channel: DamageChannel }`. Docs:
  `hit` carries the channel its damage ran in; `cost` and `tick` are indirect by definition (no
  field). The `tick` doc's "no retaliator answers it" is fixed to say it is the engine rule for a
  trigger without `damageChannel`.

### `src/engine/resolution.ts`
- The re-export of `DamageChannel` names `./effect-types` as its source.
- `dealDamageCore` passes `{ kind: 'hit', channel }` (its own `channel` parameter; the one site that
  serves actions and responses).
- `FireHookOptions` gains `incomingChannel?: DamageChannel`; its doc comment says "the channel of the
  damage that fired this hook" and distinguishes it from `HookContext.channel` (kickoff trap 2).
- `applyDamageAndEmit`: derive `incomingChannel = origin.kind === 'hit' ? origin.channel :
  'indirect'` and pass `{ incomingChannel }` to the `on-damage-taken` `fireHook` only. Dealer-side
  hooks and `on-damage-observed` untouched.
- `fireHook`: new `else if (hook === 'on-damage-taken')` arm in the filter block (before the
  `condition`, depth cap, `claimedNonStacking` claim and chance roll):
  `if (effect.damageChannel !== undefined && effect.damageChannel !== incomingChannel) continue`.
  ASSUMPTION A1: fail closed, like the observation hooks: a candidate with the field and no
  `incomingChannel` supplied is skipped (it cannot happen at the one call site). Skips emit
  nothing, draw nothing, claim nothing.
- `applyDamageAndEmit` cheat-death block (see Last Stand below). Its comment ("a nonzero cheat-death
  chance", roll described as unconditional) and its doc comment's `tick`/`origin` paragraph are
  updated.
- The `resolveResponseTargets` `triggering-source` comment: the tick/cost fizzle is still the rule
  for a trigger without the field; a `'direct'` trigger never reaches it (cites
  `spec/responses.md#triggering-source-is-never-the-firing-creature`).
- Last Stand gate: inside the `wouldDie` branch, before the RNG draw, roll only when
  `target.currentHp > CHEAT_DEATH_SURVIVAL_HP` (the pre-hit HP); the save sets
  `CHEAT_DEATH_SURVIVAL_HP`. No state, no flag.

### `src/data/specializations.ts`
- `validateSpecialization` calls `validateDamageChannels(effects, \`perk "${perk.id}"\`)` in its
  per-perk loop, next to `validateObservationFilters`.
- Thorns perk: `damageChannel: 'direct'`.
- Last Stand comment ("When taking damage that would kill the creature, 50% chance to be left at
  1 HP.") rewritten to say it does not roll at 1 HP, citing `spec/effects.md#cheat-death`.

### `src/data/traits/overgrowth.ts`, `glimmerdark.ts`, `rotcap-hollow.ts`
- Snapback (`SNAPJAW_JAWS_TRAIT`), Retaliating Shell (`SHELLBACK_BULWARK_TRAIT`), Madness Touch
  (`HOLLOWKIN_WRETCH_TRAIT`): `damageChannel: 'direct'` on the `on-damage-taken` trigger.
- Doc comments fixed: Shellback Bulwark ("whenever it takes damage"), Hollowkin Wretch ("whenever
  it's struck") and Snapjaw Jaws ("a retaliate") say "from an attack or spell". No provenance words.

### No other `src/data` file changes
Sleep's wake-up has no field and wakes on any damage (`data/statuses.ts` unchanged). No content
number moves.

## Golden policy (restated from the kickoff)

Deliberate, listed. Nothing else moves.

- **Corpus digest regenerated once**, only via `npm run corpus:update`. Expected: 49 of 527
  fights, no result changes: HP% 6 (35, 148, 208, 230, 437, 458), retaliation 44 (30 log-only,
  14 diverging), Last Stand 2 (520, 521); 230 moved by HP% and retaliation, 520 and 521 by
  retaliation and Last Stand. Any difference is explained in the report.
- **Two goldens are deleted**, fixture and test files both: `golden-hollowkin-wretch-self-dot` and
  `golden-status-snapshot-tick-no-retaliation`. They pinned the tick fizzle with real retaliators,
  which now skip a tick before reaching it. Not moved to fixtures. The fizzle rule still holds for a
  trigger without the field and is pinned by test 2's tick and cost rows; that the real retaliators
  skip a tick is pinned by test 3.
  - `evidence/` names, for each mutant they killed, the test that kills it now: "a tick offers its
    applier as the source" → test 2's tick row; "`triggering-source` resolves to the firing creature"
    → test 2's cost row (a tick offers no source, so a tick never reaches that guard). Each mutant is
    applied in a scratch clone and the named test shown failing.
  - `golden-status-snapshot-tick-kill-on-death`'s header cites test 2's tick row as the first tick
    site, not the deleted golden.
  - The test count shows the two golden files gone.
- **Every other golden and unit test stays byte-identical.** `golden-support-heals-own-lowest-hp-ally`
  and `golden-spider-broodwarden` stay identical because their two picks agree, not because the
  change is inert. `golden-hollowkin-wretch` (real Wretch answering an attack) must stay green; if it
  reads a tick or an indirect hit it moves, which is a flag to stop and report, not to fix.
- **New goldens/tests** are hand-derived, setup/arithmetic/draws in comments; goldens replay through
  `runGolden`.

## Tests, and the mechanism each one pins

Numbers in the headers are derived by hand while writing the fixtures (calculator in a scratch
file, not committed); this plan fixes the setups, not the arithmetic.

### Test 1 — HP% `lowest` / `highest`
- **Golden** `golden-hp-percent-lowest-picks-by-percent` (`.fixture.ts` + `.test.ts`, shared
  runner). Player party: `W` (warden-shaped script, Health 25, wounded to 20: 80%) and `X`
  (Health 100, wounded to 30: 30%), set in `setup` via `updateCreature` (`createCombat` resets HP).
  Enemy: one creature that waits. TURN_STEPS covers `W`'s turn. Script: `warden`'s shape, rule 1
  `hp-percent ally lowest < 50 → provoke`, rule 2 attack lowest-hp-enemy. `Provoked` follows. On
  `main` the pick is `W` (20 < 30 current HP), 80% is not < 50, so `W` attacks.
  ASSUMPTION A2: the script is a fixture-local copy of `warden`'s rule 1 with the 50 pinned, not the
  real `WARDEN_SCRIPT`, so a tuning change cannot move a mechanism golden
  (`CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`). Real `warden`/`support` are covered by
  the byte-identical goldens and the corpus.
- **Unit** in `conditions.test.ts`: the `highest` and `lowest` pairs whose current-HP and HP% orders
  disagree (A 30/100 = 30%, B 20/25 = 80%): `hp-percent ally highest >= 70` true (B is the HP%
  highest; picking by current HP would pick A, false) and `lowest <= 30` true (A is the HP% lowest;
  by current HP B, false). No tie case (the tie-break is unobservable).
- **Fails with the mechanism removed:** current-HP pick → the golden shows an `AttackDeclared`
  instead of `Provoked`, and both unit cases flip. One site (`evaluateCondition` is the only site;
  `evaluateTriggerCondition` delegates; `hpPercentSatisfied` is the threshold half, already pinned).

### Test 2 — retaliation by channel (unit, `src/engine/damage-channel.test.ts`)
Bearer `B` (player) carries one retaliator variant; attacker `A` (enemy, large Health so it survives
the answers). Every variant is local to this file: `RETALIATE`'s shape (`on-damage-taken` →
`deal-damage` at `triggering-source`, `offStat: 'attack'`, `spellPower: 0.3`) with
`damageChannel: 'direct'` and with `'indirect'`, the chance variant, the two-effect `stacks` trait,
and the one-effect damage spell. The existing `RETALIATE` from `__fixtures__/traits.ts` is the
trigger without the field. No fixture file is added or changed; `FIXTURE_TRAITS` and `traits.test.ts`
stay byte-identical. Each incoming path is driven through its real route; events and
`state.rng.position` are asserted.

| Incoming | route | `'direct'` | `'indirect'` | no field |
| --- | --- | --- | --- | --- |
| attack | `resolveTurn`, `always-attack` on `A` | answers | skipped | answers |
| spell | `resolveTurn`, `always-cast` and the one-effect damage spell on `A` | answers | skipped | answers |
| indirect response hit | `A` carries `RETALIATE` and waits; `B` carries the row's variant and attacks `A`; `A`'s answer is the indirect hit on `B` | skipped | answers | answers |
| tick | Poison applied to `B` by living `A`, `B`'s turn end | skipped | fires, fizzles | fires, fizzles |
| own cost | `executeResponse` flat self `deal-damage` on `B` | skipped | fires, fizzles | fires, fizzles |

- **Indirect-hit row:** `B` takes exactly that one hit (asserted). For the no-field and `'indirect'`
  variants `B` answers it; `A`'s `RETALIATE`, still unwinding, is then held by the self-re-entry
  guard. The `'direct'` variant skips it. The tick and cost rows have no attack in them.
- **Tick and cost rows** assert the exact event slice from the `DamageDealt` on (`toEqual`), for every
  variant: "skipped" = the slice holds the damage and nothing from the retaliator; "fires, fizzles" =
  the slice holds the damage and the retaliator's `TriggerFired`, nothing else. `rng.position`
  unchanged by the retaliator in both.
- "Answers" = `TriggerFired` + the retaliation `DamageDealt`.
- **Two direct against each other:** `B` and `A` each carry the `'direct'` variant. `A` attacks `B`
  (direct): `B` answers (indirect hit on `A`); `A`'s `'direct'` retaliator is skipped. One answer,
  not an exchange.
- **Skip happens before the chance roll:** a `'direct'` variant with `chancePercent: 50` hit by the
  indirect-response source (the row above) draws no RNG (position unchanged).
- **Skip happens before the `stacks: false` claim:** one trait on `B` with two `on-damage-taken`
  effects, both `stacks: false`: the first `damageChannel: 'direct'`, the second `'indirect'`.
  `A`'s `RETALIATE` answer (indirect) hits `B`: the first is skipped and the second answers. (Two
  carriers can't test it: `on-damage-taken` fires for one creature per call, and a claim is keyed by
  `sourceTraitId` within that call.)
- **Sleep wakes on any damage (tick only):** a Poison tick from a living applier wakes a sleeping
  bearer: `TriggerFired` `'sleep'`, then `StatusExpired`. No indirect-hit Sleep case.
- **Fail with the mechanism removed:**
  - ignore `damageChannel` in `fireHook` → every "skipped" cell fails (this file) and test 3;
  - treat every `hit` as direct (derive `'direct'` for `hit`) → the indirect-hit row fails for the
    `'direct'` and `'indirect'` variants, and the two-direct case fails;
  - drop `damageChannel` from `effectsForHook` → every "skipped" cell fails (the file builds
    candidates through real creatures and traits, not a hand-built `ResolvedHookEffect`);
  - derive the channel from `damageSource` → the spell row passes but the indirect-hit row fails (a
    response's damage is labelled `'attack'`);
  - skip placed after the chance roll → the chance case fails (RNG position); after the `stacks`
    claim → the `stacks` case fails.
  Sites: one skip site (`fireHook`'s `on-damage-taken` arm), one channel-carrying site
  (`dealDamageCore`), two non-`hit` origins (`applyTickDamage`, `applyCostDamage`, which carry none):
  the tick and cost rows cover the latter two; the attack row covers the action caller and the spell
  row the spell-effect-loop caller (`executeSpellEffects`), which reaches `dealDamageCore` through a
  different path.

### Test 3 — the real retaliators (content golden, small)
`golden-retaliation-direct-only`, through the shared runner. All real content:
- `P` (player, `always-attack`, large Health) carries Snapback, Retaliating Shell and Madness Touch as
  `innateTraitIds` (real registry) and Thorns as the real perk through `playerEffects`
  (`resolveSpecializationEffects(SHIELDBARER, thorns: 1)`).
- `A` (enemy, faster than `P`, `always-attack`, large Health) carries the real Snapback.
- `setup` puts Poison from living `A` on `P`. `TURN_STEPS = 2`:
  - `A` attacks `P`: the four answer (three hits and Confusion on `A`); `A`'s Snapback skips each of
    the three answering hits;
  - `P` attacks `A`: `A`'s Snapback answers with an indirect hit on `P`; `P`'s four skip it;
  - `P`'s turn end: the Poison tick; `P`'s four skip it.
- The header lists every RNG draw in the window (none expected) and derives every number by hand. It
  is a content golden, re-derived on a tuning change.
- ASSUMPTION A3: no draw falls in the window. Confusion on `A` does not act inside it (`A`'s next turn
  is after the window), and none of the four carries a `chancePercent`. Checked against the real
  data while writing the fixture; if a draw exists, the header lists it and the plan's "none" is
  corrected in the report.
- **Fails with the mechanism removed:** ignoring the field, or dropping it from any one of the four,
  changes the log. The log names each by `effectId`, so a dropped field shows exactly that
  retaliator's `TriggerFired` on `A`'s answer hit (for `A`'s Snapback) or on `P`'s indirect hit and
  tick (for `P`'s four). Also covered by test 5.

### Test 4 — validator (`src/engine/damage-channel.test.ts`)
- `damageChannel` on every hook other than `on-damage-taken` (a sweep, including `on-turn-start`)
  throws in `validateTrait`, in `validateStatusDef` (a status carrying the trigger) and in
  `validateSpecialization` (a perk). `createCombat` with such a trait in its registry throws (the
  registry check). `on-damage-taken` with either value passes in all three carriers.
- **Fails with the mechanism removed:** deleting the rule, or wiring it into only two of the three
  call sites, fails the corresponding carrier's case (one case per carrier).

### Test 5 — data (`src/data/retaliation.data.test.ts`)
- Collects every `triggered` effect with `hook: 'on-damage-taken'` from `TRAIT_REGISTRY`,
  `STATUS_REGISTRY` (each status's `effects`) and every perk of `SPECIALIZATIONS` (level 1 effects),
  and asserts each whose response `target.kind === 'triggering-source'` has
  `damageChannel === 'direct'`.
- Non-vacuity by containment: the collected set (triggers targeting `triggering-source`) contains the
  four retaliators, and Sleep's trigger carries no field. It does not assert the set equals the four,
  so a later retaliator doesn't break the test.
- **Fails with the mechanism removed:** deleting the field from any of the four makes the assertion
  name it.

### Test 6 — Last Stand at 1 HP (`resolution.test.ts`, inside `cheat-death (Last Stand)`)
Uses the existing `stateWithBearer`/`hit` helpers, a 100% `cheat-death` fixture, and `updateCreature`
to set the bearer's `currentHp` (the file's `hit` starts from full HP; add an optional `bearerHp`
parameter, existing callers unchanged):
- bearer at 1 HP takes a lethal hit: dies, `rng.position` unchanged (no draw).
- at 2 HP: rolls (position + 1), saved to exactly 1.
- saved bearer healed to 2 with `applyHeal`, hit again: rolls again (position + 1), saved to 1; a
  bearer left at 1 and hit again does not roll.
- no non-lethal 1-HP case: damage ≥ 1 means a hit at 1 HP is always lethal; the gate sits inside the
  `wouldDie` branch.
- **Fails with the mechanism removed:** no gate → the 1-HP case draws and survives; gating on
  `rawNewHp` or post-hit HP instead of `target.currentHp` → the 2-HP or 1-HP case fails; a literal
  `1` drifting from the constant is not testable, so it is held by the single named constant.
- The existing `cheat-death` tests (full-HP bearers) and `golden-cheat-death` (health 20 → saved to
  exactly 1, attacker then dies) stay byte-identical; the cost-Last-Stand tests start at 3 and 5 HP.
  `corpus-coverage.test.ts` must stay green.

## Corpus, balance, evidence

- `npm run corpus:update` once, after all three changes, with every changed fight attributed.
- **Attribution by stages** (`evidence/`): three throwaway builds, each a `git clone` of the branch
  base outside the repo (the scratchpad directory) with one change applied, never a copy of the
  working tree and never committed: HP% only, retaliation only, Last Stand only. Each one's changed
  corpus fights against the probe's table; the retaliation build's log-only/diverging split (log-only
  = only fizzled retaliator `TriggerFired`s removed, counted per retaliator; diverging = first
  differing event and the retaliator there); then the final build, with 230, 520 and 521 each shown to
  need both of its changes. Output tables go to `evidence/` as Markdown; throwaway scripts are not
  kept.
- ASSUMPTION A4: the scratch clones sit outside the repo; I can't delete them, so they are listed
  under **To delete**.
- **Mechanism removal** proven by removing each mechanism in a scratch clone and running the named
  test, recorded in `evidence/mechanism-removal.md`, including the two deleted goldens' mutants.
- **Balance**: the three `balance-ci-*` threshold tests only; no `npm run sim`
  (`CONVENTIONS.md#balance-simulator`). A red verdict stops and asks. No tuning.
- Test count reconciled file by file against `main` (full-suite baseline re-measured on `main`
  before the first edit; the two deleted golden files shown gone, new files shown added).

## Stale text fixed in `src/` (outside the type checker)

- Last Stand perk comment (`data/specializations.ts`).
- Shellback Bulwark, Hollowkin Wretch and Snapjaw Jaws doc comments.
- `applyDamageAndEmit`'s cheat-death comment and its doc comment (the `tick`/`origin` paragraph).
- `DamageOrigin` docs, `resolveResponseTargets`'s `triggering-source` comment,
  `hpPercentSatisfied`'s doc comment.
- `golden-status-snapshot-tick-kill-on-death`'s header.
- All new comments say why, cite `spec/<file>.md#<anchor>`, and carry no provenance;
  `docs:check -- comments` and `-- citations` are in the gates.

## Gates before reporting done
`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`. Node/tool versions checked
against `package-lock.json` first. No commits, no deletions, no living-doc edits.

## Report items I already expect to raise (Spec questions / Content changes / To delete)
- Spec: `spec/scripting.md#conditions-in-the-engine` (`**Known bug:**` line to remove; HP% rule),
  `spec/effects.md#hooks`, `#damage-observation`, `#validators`, `#cheat-death`,
  `spec/responses.md#triggering-source-is-never-the-firing-creature`,
  `specializations/shieldbarer.md#thorns`/`#last-stand`, `content/overgrowth.md#snapjaw-jaws`,
  `content/glimmerdark.md#shellback-bulwark`, `content/rotcap-hollow.md#hollowkin-wretch`.
- Content changes: the four retaliators now answer only direct damage; Last Stand no roll at 1 HP;
  `warden`/`support` pick by HP%.
- To delete: `golden-hollowkin-wretch-self-dot` and `golden-status-snapshot-tick-no-retaliation`
  (fixture and test files each), and the scratch clones.
- `phases/4.5/D/record.md` written at the end.

## Assumptions checklist
- [ ] **A1** `fireHook` fails closed: a `damageChannel` candidate with no `incomingChannel` supplied
  is skipped.
- [ ] **A2** Test 1's golden uses a fixture-local script copy of `warden`'s rule 1 (threshold
  pinned), not the real `WARDEN_SCRIPT`.
- [ ] **A3** Test 3's window has no RNG draw (Confusion on `A` doesn't act in it; no `chancePercent`
  on the four); verified against real data at build.
- [ ] **A4** Staged attribution clones live outside the repo; Duncan deletes them.
- [ ] **A5** The validator checks only the hook rule, not interaction with `condition`/`chancePercent`.
- [ ] **A6** Test 2 is a unit-test file driving real routes (`resolveTurn`, `executeResponse`,
  `applyStatus`), not a golden; the goldens are tests 1 and 3.
- [ ] **A7** Test 6 extends the existing `hit` helper with an optional starting HP rather than adding
  a new describe.
- [ ] **A8** The data test (5) gathers triggers from `TRAIT_REGISTRY`, `STATUS_REGISTRY` and
  `SPECIALIZATIONS` level-1 perk effects, and asserts containment of the four, not equality.
