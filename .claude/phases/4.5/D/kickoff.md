# Kickoff — Phase 4.5 — Slice D: HP% qualifiers, retaliation answers only attacks and spells, Last Stand never rolls at 1 HP

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/scripting.md` (`spec/scripting.md#conditions-in-the-engine`,
  `spec/scripting.md#target-selectors-in-the-engine`, `spec/scripting.md#role-scripts`),
  `spec/effects.md` (`spec/effects.md#hooks`, `spec/effects.md#damage-path-hook-order`,
  `spec/effects.md#damage-observation`, `spec/effects.md#validators`, `spec/effects.md#cheat-death`),
  `spec/responses.md#triggering-source-is-never-the-firing-creature`, and `spec/combat.md`
  (`spec/combat.md#damage-channels-and-the-additional`,
  `spec/combat.md#the-damage-channel-in-the-engine`). The spec still describes `main` until this
  slice's PR review; build against the brief.
- The brief: `phases/4.5/brief.md#hp-qualifiers-pick-by-hp`,
  `phases/4.5/brief.md#retaliation-answers-only-attacks-and-spells` and
  `phases/4.5/brief.md#last-stand-never-rolls-at-1-hp` (the last two rewritten at this kickoff),
  `phases/4.5/brief.md#balance-verdicts` and `phases/4.5/D/brief.md`.
- Content docs: `specializations/shieldbarer.md#thorns`, `specializations/shieldbarer.md#last-stand`,
  `content/overgrowth.md#snapjaw-jaws`, `content/glimmerdark.md#shellback-bulwark`,
  `content/rotcap-hollow.md#hollowkin-wretch`.
- Code, before planning: `engine/conditions.ts` (`evaluateCondition`'s `hp-percent` case),
  `engine/tie-break.ts`, `engine/effective-stats.ts` (`hpPercentSatisfied`), `data/scripts.ts`
  (`warden`, `support`); `engine/resolution.ts` (`dealDamageCore`, `applyDamageAndEmit`,
  `fireHook`'s filter block, `applyTickDamage`, `applyCostDamage`), `engine/resolution-types.ts`
  (`DamageOrigin`), `engine/effect-types.ts` (`TriggeredDef`, `ObservationFilter`,
  `validateObservationFilters`, `validateTrait`, `validateStatusDef`), `engine/effects.ts`
  (`effectsForHook`, `gatherCheatDeathChance`), the perk validation in `data/specializations.ts`,
  and the four retaliators (`data/specializations.ts` Thorns, `data/traits/overgrowth.ts` Snapjaw
  Jaws, `data/traits/glimmerdark.ts` Shellback Bulwark, `data/traits/rotcap-hollow.ts` Hollowkin
  Wretch).
- Goldens and tests: `golden-hollowkin-wretch-self-dot`, `golden-status-snapshot-tick-no-retaliation`,
  `golden-support-heals-own-lowest-hp-ally`, `golden-spider-broodwarden`, `golden-cheat-death`,
  `resolution.test.ts` "cheat-death (Last Stand)", the `cheat-death` cases in
  `damage-observation.test.ts`, `__fixtures__/traits.ts` (`RETALIATE`, `VENGEFUL`, `REELING`),
  `corpus-coverage.test.ts` and `corpus-digest.test.ts`.
- `phases/4.5/D/evidence/kickoff-probe.md`: what the plainest version of each change moves on
  `main`. Your build should reproduce its numbers; any difference is explained in the report.

## Scope

Three changes. **HP%:** an `hp-percent` condition's `lowest`/`highest` qualifier tests the creature
with the lowest/highest HP%, compared by integer cross-multiplication, not the one with the
lowest/highest current HP. **Retaliation:** a triggered effect gains an optional `damageChannel:
'direct' | 'indirect'`, valid on `on-damage-taken` only; a candidate whose channel doesn't match
the incoming damage's is skipped silently. The validator rejects the field on any other hook for
every trigger carrier (traits, statuses, perks). Thorns, Snapjaw Jaws, Shellback Bulwark and
Hollowkin Wretch set `'direct'`, and a data test holds every game-data `on-damage-taken` trigger
whose response targets `triggering-source` to it. **Last Stand:** `cheat-death` does not roll when
the target is at 1 HP before the hit.

**Not in this slice:** the target selectors (`lowest-hp-enemy` and the rest keep current HP); the
`any` qualifier; a channel filter on any hook but `on-damage-taken`; the engine's tick rule
("retaliation never answers a tick" stays, for triggers without the field); any content number;
any outgoing channel (the retaliators still deal indirect damage); any living-doc edit (they go
under **Spec questions** and **Content changes**).

## Golden policy

Deliberate, listed:

- **The corpus digest is regenerated once** (`npm run corpus:update`). Expect 49 of 527 fights, no
  result changes: HP% 6, retaliation 44 (30 log-only, 14 diverging), Last Stand 2, with fights 230,
  520 and 521 moved by two changes each (`phases/4.5/D/evidence/kickoff-probe.md#corpus-digest`).
- **Two goldens pinned the tick fizzle with real retaliators**, which now skip a tick before
  reaching it: `golden-hollowkin-wretch-self-dot` (Madness Touch on its bearer's own Poison tick)
  and `golden-status-snapshot-tick-no-retaliation` (Snapback and Madness Touch on a living
  applier's tick). Both are deleted. The fizzle rule still holds for a trigger without the field,
  and new test 2's tick and cost rows pin it with `RETALIATE`, asserting the exact event slice from
  the damage on: the tick row kills "a tick offers its applier as the source", the cost row
  "`triggering-source` resolves to the firing creature" (unreachable through a tick, which offers
  no source). That the real retaliators skip a tick is pinned by new test 3.
- Every other golden and unit test stays byte-identical. The `warden`/`support` goldens stay
  identical because their two picks agree, not because the change is inert.

**New hand-derived tests**, through the shared runner where they are goldens:

1. **HP% `lowest`:** a `warden` whose allies are at 30/100 and 20/25 HP. The 30% ally is tested
   and the warden Provokes (`main` tests the 80% one and attacks). A unit test of
   `evaluateCondition` covers `highest` with a pair whose current-HP and HP% orders disagree.
2. **Retaliation by channel:** a fixture `on-damage-taken` retaliator with `damageChannel:
   'direct'` answers an attack and a spell, and skips an indirect response, a tick and its own
   cost with no `TriggerFired` and no RNG; one with `'indirect'` answers only the latter three
   (the tick and the cost then fizzle as today); one without the field answers the first three
   and fizzles on the tick and the cost, as today. One case puts two `'direct'` retaliators
   against each other: an attack draws one answer, and that answer draws none.
3. **The real retaliators:** Thorns, Snapback, Retaliating Shell and Madness Touch each answer an
   attack, and skip an indirect hit and a tick silently. A content golden, kept small.
4. **Validator:** `damageChannel` on any hook other than `on-damage-taken` throws, in a trait, a
   status and a perk.
5. **Data test:** every game-data `on-damage-taken` trigger whose response targets
   `triggering-source` carries `damageChannel: 'direct'`.
6. **Last Stand:** a 100% `cheat-death` carrier at 1 HP takes a lethal hit: no roll (the RNG
   position shows no draw), it dies. At 2 HP it rolls and is saved to 1; healed to 2, it rolls
   again on the next lethal hit.

## Traps

- **HP% is integers only.** `pickExtremum` takes a numeric key; a `currentHp / maxHp` float key is
  the wrong tool. Compare `a.currentHp × maxHp(b)` with `b.currentHp × maxHp(a)`, `maxHp` being the
  same floored effective Health `hpPercentSatisfied` divides by: one source for both, not a second
  copy of the formula.
- **The tie-break is unobservable.** Two creatures with equal HP% give the same answer to the same
  threshold, so no test can see which one was picked. Keep the shared tie-break for determinism;
  don't spend a golden on it or claim one shows it.
- **The incoming channel is not `origin.kind`.** `{ kind: 'hit' }` comes from `dealDamageCore`,
  which serves both actions and responses; the channel is its `channel` parameter and must be
  carried from there. Never infer it from `damageSource` either: a response's damage is labelled
  `'attack'` or `'cast'` (Thorns' own hit logs `'attack'`,
  `phases/4.5/D/evidence/kickoff-probe.md#labels`). Ticks and costs are indirect.
- **Two channels, two meanings.** `HookContext.channel` is the channel the *response's own* damage
  runs in (always indirect from `fireHook`). The filter reads the channel of the damage that
  *fired* the hook. Don't reuse one for the other.
- **`effectsForHook` copies fields one by one** into `ResolvedHookEffect`. A new field not copied
  there is silently dropped, and the filter never runs.
- **Where the skip sits.** Before the condition, the chance roll and the `stacks: false` claim,
  like the observation filters: a skipped candidate emits nothing, draws nothing and claims no
  slot. It applies to `on-damage-taken` only; `on-damage-dealt` and `on-damage-observed` are
  untouched.
- **The validator covers every carrier.** Traits (`validateTrait`, also run by `createCombat`),
  statuses (`validateStatusDef`) and perks (the load-time check in `data/specializations.ts`).
  Follow how the observation-filter rule reaches all three.
- **Last Stand reads HP before the hit.** Gate on the target's `currentHp` before damage is
  applied, not on `rawNewHp`, and before the RNG draw. The 1 it reads is the 1 a save sets: one
  named value for both, not two literals (`CONVENTIONS.md#no-magic-numbers`).
- **Nothing to do on heal.** The rule is stateless: a heal raises `currentHp` and the next lethal
  hit rolls. Don't add a flag.
- **Stale text outside the type checker:** the Last Stand comment in `data/specializations.ts`
  ("When taking damage that would kill …"), the Shellback Bulwark and
  Hollowkin Wretch doc comments ("whenever it takes damage", "whenever it's struck"),
  `applyDamageAndEmit`'s cheat-death comment, and `golden-status-snapshot-tick-kill-on-death`'s
  header, which cites the deleted no-retaliation golden as the first tick site.

## Must stay green

All gates in `coding-rules.md`. Every golden and unit test not listed above stays byte-identical.
`corpus-coverage.test.ts` (Last Stand still rolls in the corpus: green in the probe), the three
`balance-ci-*` threshold tests, and the corpus digest after its one regeneration.

## The PR must prove

- **Attribution by stages** (`evidence/`). Three throwaway builds, not committed, each with one
  change: HP% only, retaliation only, Last Stand only. Each one's changed corpus fights against the
  probe's table; the retaliation build's split into log-only (only fizzled retaliator
  `TriggerFired`s removed, counted per retaliator) and diverging (first differing event and the
  retaliator there). Then the final build: its changed set is the union, and each of 230, 520 and
  521 is shown to need both of its changes.
- **Each deleted golden:** each mutant it killed, named against the test that kills it now.
- **Each mechanism fails with it removed:** the current-HP pick fails test 1; ignoring
  `damageChannel` fails tests 2 and 3; treating every `hit` as direct fails test 2's
  indirect-response case; leaving the field out of `effectsForHook` fails test 2; removing the
  validator rule fails test 4; dropping the field from any of the four retaliators fails test 5;
  removing the 1-HP gate fails test 6; gating on HP after the hit fails test 6.
- **Balance** (`phases/4.5/brief.md#balance-verdicts`): the three `balance-ci-*` tests green. Don't
  run `npm run sim` (`CONVENTIONS.md#balance-simulator`); a red verdict stops and asks; no tuning.
- The test count, reconciled file by file against `main`.

## Docs edited at this kickoff

- `.claude/phases/4.5/brief.md#retaliation-answers-only-attacks-and-spells` (was "Thorns answers
  only attacks and spells"): all four retaliators answer only direct damage, through a
  `damageChannel` field on the trigger and a data test (Duncan's call at kickoff); the slice
  table's D row.
- `.claude/phases/4.5/brief.md#last-stand-never-rolls-at-1-hp` (was "Last Stand rolls only above 1
  damage"): no roll at 1 HP, a rule of the `cheat-death` primitive (Duncan's call at kickoff; the
  old "more than 1 damage" wording didn't say what he meant).
- `.claude/phases/4.5/brief.md#hp-qualifiers-pick-by-hp`: the golden-change line, to match the
  probe (no golden distinguishes the two picks).
- `.claude/phases/4.5/D/brief.md`: title, golden policy, scope citations, "Known" and "done when".
- `.claude/specializations/shieldbarer.md#last-stand`: the design text and its `**Known bug:**`
  line; `specializations/shieldbarer.md#thorns`' fix citation.
- `.claude/CONVENTIONS.md#balance-simulator`: the full simulator runs only in a tuning slice;
  every other slice relies on the CI test (Duncan's call at kickoff). `phases/4.5/brief.md#balance-verdicts`,
  `phases/4.5/E/brief.md` and `phases/4.5/F/brief.md` follow it.
- Added `.claude/phases/4.5/D/evidence/kickoff-probe.md`, the probe this kickoff cites.
