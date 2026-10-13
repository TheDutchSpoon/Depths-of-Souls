# Plan — 4.5-D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

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
- Extract a private `flooredMaxHp(creature)` (`Math.floor(getEffectiveStat(creature, 'health'))`)
  used by `hpPercentSatisfied` (behaviour identical) and by a new exported
  `compareHpPercent(a, b): number` = `a.currentHp × flooredMaxHp(b) − b.currentHp × flooredMaxHp(a)`.
  Negative when `a` has the lower HP%. Pure integer arithmetic, no division. One source for
  "what HP% divides by" for the threshold test and the ordering (kickoff trap 1).
- ASSUMPTION A1: `effects.ts`'s `effectiveMaxHp` (the same expression) is left as is. Making it
  delegate would need `effects.ts` to import `effective-stats.ts` (check for a cycle) and is not
  needed to meet "one source for both"; the two are the same formula and `effects.test.ts` already
  pins `effectiveMaxHp`. If the reviewer wants one copy of the expression, say so.

### `src/engine/tie-break.ts`
- Add `pickExtremumByOrder(pool, order: (a, b) => number, direction)`: sorts a copy by
  `order` (negated for `'desc'`), falls back to `compareBySideSlotId`, returns `[0]`. `pickExtremum`
  stays for the target selectors (not in scope) and is not rewritten onto it.
- ASSUMPTION A2: a new sibling helper rather than widening `pickExtremum`'s `keyOf` type, so the
  selectors' numeric-key path is byte-for-byte untouched.

### `src/engine/conditions.ts`
- `hp-percent` `lowest`/`highest`: `pickExtremumByOrder(pool, compareHpPercent, 'asc' | 'desc')`
  replaces `pickExtremum(pool, c => c.currentHp, …)`. `any` unchanged. `pickExtremum` import drops
  if unused.

### `src/engine/resolution-types.ts`
- `DamageOrigin` `hit` becomes `{ readonly kind: 'hit'; readonly channel: DamageChannel }`. Docs:
  `hit` carries the channel its damage ran in; `cost` and `tick` are indirect by definition (no
  field). Fix the `tick` doc's "no retaliator answers it" so it says it is the engine rule for a
  trigger without `damageChannel`.

### `src/engine/resolution.ts`
- `dealDamageCore` passes `{ kind: 'hit', channel }` (its own `channel` parameter; the one site
  that serves actions and responses).
- `FireHookOptions` gains `incomingChannel?: DamageChannel` ("the channel of the damage that fired
  this hook" — doc comment distinguishes it from `HookContext.channel`, kickoff trap 2).
- `applyDamageAndEmit`: derive `incomingChannel = origin.kind === 'hit' ? origin.channel :
  'indirect'` and pass `{ incomingChannel }` to the `on-damage-taken` `fireHook` only. Dealer-side
  hooks and `on-damage-observed` untouched.
- `fireHook`: new `else if (hook === 'on-damage-taken')` arm in the filter block (before the
  `condition`, depth cap, `claimedNonStacking` claim and chance roll):
  `if (effect.damageChannel !== undefined && effect.damageChannel !== incomingChannel) continue`.
  ASSUMPTION A3: fail closed, like the observation hooks: a candidate with the field and no
  `incomingChannel` supplied is skipped (it cannot happen at the one call site). Skips emit
  nothing, draw nothing, claim nothing.
- `applyDamageAndEmit` cheat-death block (see Last Stand below). Update its comment, which says
  "a nonzero cheat-death chance" and describes the roll as unconditional.
- Update the stale `resolveResponseTargets` `triggering-source` comment: the tick/cost fizzle is
  still the rule for a trigger without the field; add that a `'direct'` trigger never reaches it
  (cite `spec/responses.md#triggering-source-is-never-the-firing-creature`).

### `src/engine/effect-types.ts`
- `TriggeredDef.damageChannel?: DamageChannel` (import the type from `resolution-types.ts`, a leaf
  that already imports from `effect-types.ts` for `EffectInstanceId`: type-only imports both ways
  are fine, but check `tsc -b` — if circular type imports bite, declare
  `DamageChannel` in `effect-types.ts` and re-export from `resolution-types.ts`.
  ASSUMPTION A4: pick whichever `tsc -b`/lint accepts; no behaviour either way).
  Doc comment: valid on `on-damage-taken` only; absent = answers any damage; matched against the
  incoming damage's channel.
- `ResolvedHookEffect.damageChannel?: DamageChannel`.
- New `validateDamageChannels(defs, context)`, beside `validateObservationFilters`: throws
  `effect invariant violated: <where> carries a damageChannel, which only an "on-damage-taken"
  trigger may carry` for a `triggered` def with the field on any other hook.
- Call it from `validateTrait` (so `createCombat`'s registry check runs it too) and
  `validateStatusDef` (the status registry, called from `data/statuses.ts`).
- ASSUMPTION A5: no `chancePercent`/`condition` interaction is validated; only the hook rule.

### `src/engine/effects.ts`
- `effectsForHook` copies `damageChannel: e.damageChannel` into the resolved shape (kickoff trap 3).
  `flatEffects` already spreads a status trigger's fields, so statuses carry it with no change.

### `src/data/specializations.ts`
- `validateSpecialization` calls `validateDamageChannels(effects, \`perk "${perk.id}"\`)` in its
  per-perk loop, next to `validateObservationFilters`.
- Thorns perk: add `damageChannel: 'direct'`. Its comment already says "from an attack or spell".
- Last Stand comment ("When taking damage that would kill the creature, 50% chance to be left at
  1 HP.") rewritten to say it does not roll at 1 HP, citing `spec/effects.md#cheat-death`.

### `src/data/traits/overgrowth.ts`, `glimmerdark.ts`, `rotcap-hollow.ts`
- Snapback (`SNAPJAW_JAWS_TRAIT`), Retaliating Shell (`SHELLBACK_BULWARK_TRAIT`), Madness Touch
  (`HOLLOWKIN_WRETCH_TRAIT`): `damageChannel: 'direct'` on the `on-damage-taken` trigger.
- Doc comments fixed: Shellback Bulwark ("whenever it takes damage") and Hollowkin Wretch
  ("whenever it's struck") say "from an attack or spell". Snapjaw Jaws' says "a retaliate" — add
  the same qualifier. No provenance words, no "was X before".

### No other `src/data` file changes
Sleep's wake-up has no field and wakes on any damage (`data/statuses.ts` unchanged). No content
number moves.

## Golden policy (restated from the kickoff)

Deliberate, listed. Nothing else moves.

- **Corpus digest regenerated once**, only via `npm run corpus:update`. Expected: 49 of 527
  fights, no result changes: HP% 6 (35, 148, 208, 230, 437, 458), retaliation 44 (30 log-only,
  14 diverging), Last Stand 2 (520, 521); 230 moved by HP% and retaliation, 520 and 521 by
  retaliation and Last Stand. Any difference from these numbers is explained in the report.
- **Two goldens move** to fixture retaliators without the field, because the real ones now skip
  the tick before the fizzle they pinned:
  - `golden-hollowkin-wretch-self-dot`: `HOLLOWKIN_WRETCH_TRAIT` → the new
    `MADNESS_TOUCH_SHAPED` fixture (`on-damage-taken` → `apply-status` Confusion at
    `triggering-source`, no field). Traits registry becomes a `Map` of that one fixture. Only the
    `effectId` in the `TriggerFired` changes; the import, the traits registry and the header change
    with it. Header rewritten: no "real Hollowkin Wretch" claim; the creature's stats are the
    fixture's own; says the fixture has the real shape and that the real one skipping a tick is
    pinned by the retaliator golden below.
  - `golden-status-snapshot-tick-no-retaliation`: `SNAPJAW_JAWS_TRAIT` → `RETALIATE`
    (existing fixture) and `HOLLOWKIN_WRETCH_TRAIT` → `MADNESS_TOUCH_SHAPED`. Both `TriggerFired`
    `effectId`s change (`'retaliate'`, the fixture's id). The creature `b` is given
    `innateTraitIds: [RETALIATE.id, MADNESS_TOUCH_SHAPED.id]`, same order, so effect order, the
    tick arithmetic (16, 100 → 84), RNG position (none) and every other line stay. Header
    rewritten; the "Snapback … 60% of its Attack" prose becomes `RETALIATE`'s 30%, still never
    evaluated.
  - Each one's diff is the `effectId`s, the import/registry lines and the header, nothing else
    (checked by importing both versions' `expectedEvents` and diffing, not by reading the diff).
- **Every other golden and unit test stays byte-identical.** `golden-support-heals-own-lowest-hp-ally`
  and `golden-spider-broodwarden` stay identical because their two picks agree.
  `golden-hollowkin-wretch` (real Wretch answering an attack) must stay green; if it reads a tick or
  an indirect hit it moves, which is a flag to stop and report, not to fix.
- **New goldens/tests** (below) are hand-derived, setup/arithmetic/draws in comments, replayed
  through `runGolden`.

## New test fixtures (`src/engine/__fixtures__/retaliators.ts`)

ASSUMPTION A6: a new file, not additions to `traits.ts`. `FIXTURE_TRAITS` is documented and tested
as "exactly the nine fixture traits" (`traits.test.ts`), and that test must stay byte-identical.
The new file exports, each a test-only `Trait`, none registered in game data:

- `RETALIATE_DIRECT`, `RETALIATE_INDIRECT`: `RETALIATE`'s shape (`on-damage-taken` → `deal-damage`
  at `triggering-source`, `offStat: 'attack'`, `spellPower: 0.3`) with `damageChannel: 'direct'` /
  `'indirect'`. Distinct ids.
- `MADNESS_TOUCH_SHAPED`: `on-damage-taken` → `apply-status` Confusion at `triggering-source`,
  no field.
- `INDIRECT_STRIKER`: `on-turn-end` → `deal-damage` at `{ selector: lowest-hp-enemy }`, `offStat:
  'attack'`, `spellPower: 0.3`: an indirect response hit on a chosen victim, for tests 2 and 3.

`RETALIATE` (no field) is reused from `traits.ts` for "without the field".

## Tests, and the mechanism each one pins

Numbers in the headers are derived by hand while writing the fixtures (calculator in a scratch
file, not committed); this plan fixes the setups, not the arithmetic.

### Test 1 — HP% `lowest` / `highest`
- **Golden** `golden-hp-percent-lowest-picks-by-percent` (`.fixture.ts` + `.test.ts`, shared
  runner). Player party: `W` (warden-shaped script, Health 25, wounded to 20: 80%) and `X`
  (Health 100, wounded to 30: 30%), set in `setup` via `updateCreature` (`createCombat` resets HP).
  Enemy: one creature that waits. TURN_STEPS covers `W`'s turn. Script: the `warden` shape, rule 1
  `hp-percent ally lowest < 50 → provoke`, rule 2 attack lowest-hp-enemy. `Provoked` follows. On
  `main` the pick is `W` (20 < 30 current HP), 80% is not < 50, so `W` attacks.
  ASSUMPTION A7: the script is a fixture-local copy of `warden`'s rule 1 with the 50 pinned, not
  the real `WARDEN_SCRIPT`, so a tuning change to the shipped threshold cannot move a mechanism
  golden (`CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`). Real `warden`/`support` are
  already covered by the byte-identical goldens and the corpus.
  Candidates: two with different picks leading to different logs (the focused-golden rule).
- **Unit** in `conditions.test.ts`: `highest` with a pair whose HP and HP% orders disagree
  (A 30/100 = 30%, B 20/25 = 80%): `hp-percent ally highest >= 70` true (B is the HP% highest;
  A-by-current-HP would give false). Same pair `lowest <= 30` true. A tie pair (equal HP%, different
  slots) answers identically for the same threshold: no tie-break claim (kickoff trap 2).
- **Fails with the mechanism removed:** current-HP pick → the golden shows an `AttackDeclared`
  instead of `Provoked`, and the unit `highest >= 70` returns false. One site (`evaluateCondition`
  is the only site; `evaluateTriggerCondition` delegates; `hpPercentSatisfied` is the threshold
  half, already pinned).

### Test 2 — retaliation by channel (unit, `src/engine/damage-channel.test.ts`)
Bearer `B` (player) carries one retaliator variant; attacker `A` (enemy, large Health so it
survives the answers). Each incoming path is driven through its real route and the events and
`state.rng.position` are asserted:

| Incoming | route | `'direct'` | `'indirect'` | no field |
| --- | --- | --- | --- | --- |
| attack | `resolveTurn` with `always-attack` on `A` | answers | skipped | answers |
| spell | `resolveTurn` with `always-cast` and a one-effect damage spell on `A` | answers | skipped | answers |
| indirect response | `A` carries `INDIRECT_STRIKER`; its `on-turn-end` hit | skipped | answers | answers |
| tick | Poison applied to `B` by living `A`, `B`'s turn end | skipped | fires, fizzles | fires, fizzles |
| own cost | `executeResponse` flat self `deal-damage` on `B` | skipped | fires, fizzles | fires, fizzles |

"Skipped" = no `TriggerFired` for the retaliator, no `StatusApplied`/second `DamageDealt` from it,
and `rng.position` unchanged by it. "Answers" = `TriggerFired` + the retaliation `DamageDealt`.
"Fires, fizzles" = `TriggerFired` and nothing else from it (the tick/cost rule, as today).
- **Two direct against each other:** `B` and `A` each carry `RETALIATE_DIRECT`. `A` attacks `B`
  (direct): `B` answers (indirect hit on `A`); `A`'s `RETALIATE_DIRECT` is skipped. One answer, not
  an exchange. Without the filter the cascade runs to the self-re-entry guard and more events show.
- **Skip happens before the chance roll and the `stacks: false` claim:** a `'direct'` variant with
  `chancePercent: 50` hit by an indirect response draws no RNG (position unchanged), and two such
  carriers with `stacks: false` do not let a skipped one claim the slot (a second, matching
  carrier still fires). Pins the placement from kickoff trap 4.
- **Sleep wakes on any damage:** a sleeping bearer takes a tick and an indirect hit; `sleep`'s
  trigger (no field) still fires both times (`on-damage-taken` itself untouched).
- **Fail with the mechanism removed:**
  - ignore `damageChannel` in `fireHook` → every "skipped" cell fails (this file) and test 3;
  - treat every `hit` as direct (derive channel as `'direct'` for `hit`) → the indirect-response
    row fails for `'direct'`/`'indirect'`, and the two-direct case fails;
  - drop `damageChannel` from `effectsForHook` → every "skipped" cell fails (the file builds
    candidates through real creatures and traits, not a hand-built `ResolvedHookEffect`);
  - derive the channel from `damageSource` instead → the spell row passes but the
    indirect-response row fails (a response damage is labelled `'attack'`);
  - skip placed after the chance roll → the RNG-position case fails; after the `stacks` claim →
    the claim case fails.
  Sites: one skip site (`fireHook`'s `on-damage-taken` arm), one channel-carrying site
  (`dealDamageCore`), and two non-`hit` origins (`applyTickDamage`, `applyCostDamage`, which carry
  none) — the tick and cost rows cover the latter two; the attack row covers the action site and
  the spell row covers the spell-effect-loop site, which reaches `dealDamageCore` through a
  different caller (`executeSpellEffects`).

### Test 3 — the real retaliators (content golden, small)
`golden-retaliation-direct-only` through the shared runner. One bearer `P` (player) carries all
four real retaliators: Snapback, Retaliating Shell and Madness Touch as `innateTraitIds` (real
registry), Thorns as the real perk via `playerEffects`
(`resolveSpecializationEffects(SHIELDBARER, thorns: 1)`). Enemy `A` carries `INDIRECT_STRIKER`
(lowest-hp-enemy = `P`) and a large Health, with `always-attack`. `P` is scripted `always-wait`.
No RNG anywhere (no chance rolls, `lowest-hp-enemy` has a sole candidate, and no confused action of
`A`'s occurs inside the window).
- Window (`TURN_STEPS = 2`, `A` then `P`): `A` attacks `P`: all four answer, each emitting
  `TriggerFired` and its effect (three hits and a Confusion on `A`; order = canonical effect order,
  derived by hand). `A`'s `on-turn-end` indirect hit on `P`: none of the four fires. `P`'s turn end:
  a Poison tick pre-applied from living `A` (`setup`, pinned potency with `holdPotency`): none of
  the four fires.
- ASSUMPTION A8: all four on one bearer, so one golden covers "each answers an attack, and skips an
  indirect hit and a tick" for every retaliator; the Thorns effect is the shipped perk, the three
  trait effects the shipped traits (content golden: re-derived by hand on a tuning change).
  Sleep is not present, so a wake-up cannot mask the tick.
- **Fails with the mechanism removed:** ignoring the field, or dropping it from any one of the four
  (each contributes its own `TriggerFired` lines), changes the log. Per-retaliator discrimination:
  the log names each by `effectId`, so dropping one field shows exactly that retaliator's
  `TriggerFired` on the indirect hit and tick. Also covered by test 5.
- Header states what is derived by hand and that the arithmetic rows are
  hand-derived (formula and stats in comments).

### Test 4 — validator (`src/engine/damage-channel.test.ts` or `damage-observation.test.ts`' sibling)
- `damageChannel` on `on-turn-start` (and a sweep over every hook other than `on-damage-taken`)
  throws in `validateTrait`, in `validateStatusDef` (a status carrying the trigger) and in
  `validateSpecialization` (a perk). Plus `createCombat` with such a trait in its registry throws
  (the registry check), and `on-damage-taken` with either value passes in all three carriers.
- **Fails with the mechanism removed:** deleting the rule, or wiring it into only two of the three
  call sites, fails the corresponding carrier's case (one case per carrier).

### Test 5 — data (`src/data/retaliation.data.test.ts`)
- Collects every `triggered` effect with `hook: 'on-damage-taken'` from `TRAIT_REGISTRY`,
  `STATUS_REGISTRY` (each status's `effects`) and every perk of `SPECIALIZATIONS` (level 1 effects),
  and asserts each whose response `target.kind === 'triggering-source'` has
  `damageChannel === 'direct'`. A second assertion pins the set found is exactly the four
  retaliators (non-vacuous), and that Sleep's trigger carries no field.
- **Fails with the mechanism removed:** deleting the field from any of the four makes the
  assertion name it.

### Test 6 — Last Stand at 1 HP (`resolution.test.ts`, inside `cheat-death (Last Stand)`)
Uses the existing `stateWithBearer`/`hit` helpers, a 100% `cheat-death` fixture, and `updateCreature`
to set the bearer's `currentHp` (the file's `hit` currently starts from full HP; add an optional
`bearerHp` parameter, existing callers unchanged):
- bearer at 1 HP takes a lethal hit: dies, `rng.position` unchanged (no draw).
- at 2 HP: rolls (position + 1), saved to exactly 1.
- saved bearer healed to 2 with `applyHeal`, hit again: rolls again (position + 1), saved to 1;
  a bearer left at 1 and hit again does not roll.
- a bearer at 1 HP hit by a *non-lethal* hit cannot exist (damage ≥ 1), so there is no separate
  case; the gate sits inside the `wouldDie` branch.
- **Fails with the mechanism removed:** no gate → the 1-HP case draws and survives; gating on
  `rawNewHp` or post-hit HP instead of `target.currentHp` → the 2 HP case (it would skip or roll
  wrongly) or the 1 HP case fails; a literal `1` in the gate drifting from the constant is not
  testable, so that is held by the single named constant.
- The existing `cheat-death` tests (full-HP bearers) and `golden-cheat-death` (health 20 → saved to
  exactly 1, attacker then dies) stay byte-identical; the cost-Last-Stand tests start at 3 and 5 HP.
  `corpus-coverage.test.ts` must stay green (Last Stand still rolls in the corpus, from the probe).

## Corpus, balance, evidence

- `npm run corpus:update` once, after all three changes, with every changed fight attributed.
- **Attribution by stages** (`evidence/`): three throwaway builds, each with one change (HP% only,
  retaliation only, Last Stand only), built in a scratch copy outside the repo (the scratchpad
  directory), never committed; each one's changed corpus fights against the probe's table; the
  retaliation build's log-only/diverging split (log-only = only fizzled retaliator `TriggerFired`s
  removed, counted per retaliator; diverging = first differing event and the retaliator there);
  then the final build, with 230, 520 and 521 each shown to need both of its changes. Output tables
  go to `evidence/` as Markdown; the throwaway scripts are not kept.
- ASSUMPTION A9: the staged builds are made by copying the repo into the scratchpad directory and
  editing the copy; I can't delete it, so I list the scratch copy under **To delete** (it is
  outside the repo, so it only matters for disk).
- **Mechanism removal** proven by actually removing each mechanism in the scratch copy and running
  the named test, recorded in `evidence/mechanism-removal.md`.
- **Balance**: the three `balance-ci-*` threshold tests only; no `npm run sim`
  (`CONVENTIONS.md#balance-simulator`). A red verdict stops and asks. No tuning.
- Test count reconciled file by file against `main` (1411 passed, 1 skipped in the engine/data/state
  probe baseline; the full-suite baseline is re-measured on `main` before the first edit).

## Stale text fixed in `src/` (outside the type checker)

- Last Stand perk comment (`data/specializations.ts`).
- Shellback Bulwark, Hollowkin Wretch and Snapjaw Jaws doc comments.
- `applyDamageAndEmit`'s cheat-death comment and its doc comment (the `tick`/`origin` paragraph).
- `DamageOrigin` docs, `resolveResponseTargets`'s `triggering-source` comment.
- The two moved goldens' headers; `RETALIATE`'s doc comment is unchanged.
- All new comments say why, cite `spec/<file>.md#<anchor>` by anchor, and carry no provenance;
  `docs:check -- comments` and `-- citations` are in the gates.

## Gates before reporting done
`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`. Node/tool versions checked
against `package-lock.json` first. No commits, no deletions, no living-doc edits.

## Report items I already expect to raise (Spec questions / Content changes)
- `spec/scripting.md#conditions-in-the-engine` (`**Known bug:**` line to remove; HP% rule),
  `spec/effects.md#hooks`, `#damage-observation`, `#validators`, `#cheat-death`,
  `spec/responses.md#triggering-source-is-never-the-firing-creature`,
  `specializations/shieldbarer.md#thorns`/`#last-stand`, `content/overgrowth.md#snapjaw-jaws`,
  `content/glimmerdark.md#shellback-bulwark`, `content/rotcap-hollow.md#hollowkin-wretch`.
- Content changes: the four retaliators now answer only direct damage; Last Stand no roll at 1 HP;
  `warden`/`support` pick by HP%.
- `phases/4.5/D/record.md` written at the end.

## Assumptions checklist
- [ ] **A1** `effects.ts`'s `effectiveMaxHp` is left as is; `effective-stats.ts` gets its own
  private `flooredMaxHp` shared by `hpPercentSatisfied` and the new `compareHpPercent`.
- [ ] **A2** New `pickExtremumByOrder` in `tie-break.ts` instead of widening `pickExtremum`.
- [ ] **A3** `fireHook` fails closed: a `damageChannel` candidate with no `incomingChannel` supplied
  is skipped.
- [ ] **A4** Where `DamageChannel` is declared (resolution-types vs effect-types) is whatever
  `tsc -b` accepts without a circular import; no behavioural impact.
- [ ] **A5** The validator checks only the hook rule, not interaction with `condition`/`chancePercent`.
- [ ] **A6** New fixtures live in a new `__fixtures__/retaliators.ts`, not in `FIXTURE_TRAITS`
  (whose "nine traits" test must stay byte-identical).
- [ ] **A7** Test 1's golden uses a fixture-local script copy of `warden`'s rule 1 (threshold
  pinned), not the real `WARDEN_SCRIPT`.
- [ ] **A8** Test 3 puts all four real retaliators on one bearer (Thorns via the real perk on the
  player side), one small golden, no RNG.
- [ ] **A9** Staged attribution builds are made in a scratch copy outside the repo; Duncan deletes it.
- [ ] **A10** Test 2 is a unit-test file driving real routes (`resolveTurn`, `executeResponse`,
  `applyStatus`), not a golden; the goldens are tests 1 and 3 and the two moved ones.
- [ ] **A11** Test 6 extends the existing `hit` helper with an optional starting HP rather than
  adding a new describe.
- [ ] **A12** The data test (5) gathers triggers from `TRAIT_REGISTRY`, `STATUS_REGISTRY` and
  `SPECIALIZATIONS` level-1 perk effects, and also pins the exact set of four so it can't go vacuous.
