# Record — Phase 4.5 — Slice D: HP% qualifiers, retaliation answers only direct damage, Last Stand never rolls at 1 HP

**Status: built.** Golden policy deliberate, listed: two goldens deleted, the corpus digest
regenerated once (49 of 527 rows), every other golden and unit test unchanged. 1982 tests passed, 1
skipped (net +75 against the branch base).

## What was built

- **HP% qualifiers pick by HP%.** `evaluateCondition`'s `hp-percent` `lowest`/`highest` orders the
  pool by `compareHpPercent` (`engine/effective-stats.ts`): integer cross-multiplication on the
  floored effective Health, no division. `effectiveMaxHp` is defined once there and re-exported by
  `effects.ts`. `tie-break.ts` has one picker, `pickExtremumBy`, with `pickExtremum` a wrapper over
  it; every selector keeps its current-HP pick.
- **Retaliation answers only direct damage.** A triggered effect gains an optional
  `damageChannel: 'direct' | 'indirect'`, valid on `on-damage-taken` only (`validateDamageChannels`,
  run by `validateTrait`, `validateStatusDef` and `validateSpecialization`). `DamageOrigin`'s `hit`
  carries its channel from `dealDamageCore`; `applyDamageAndEmit` passes the incoming channel
  (indirect for a cost or a tick) to the `on-damage-taken` `fireHook` call, which skips a mismatched
  candidate silently, before the condition, the chance roll and the `stacks: false` claim.
  `DamageChannel` is declared in `effect-types.ts`. Thorns, Snapback, Retaliating Shell and Madness
  Touch set `'direct'`.
- **Last Stand never rolls at 1 HP.** `applyDamageAndEmit` rolls `cheat-death` only when the target's
  HP before the hit is above `CHEAT_DEATH_SURVIVAL_HP` (`config.ts`, 1), the same value a save leaves.
  No state.

## Tests and goldens

- New: `engine/damage-channel.test.ts` (retaliation by channel through real routes; the validator on
  every hook and carrier), `data/retaliation.data.test.ts`, goldens
  `golden-hp-percent-lowest-picks-by-percent` and `golden-retaliation-direct-only`, four cases in
  `conditions.test.ts` (two by HP%, two pinning the denominator), three in `resolution.test.ts`.
- Deleted: `golden-hollowkin-wretch-self-dot` and `golden-status-snapshot-tick-no-retaliation`; their
  rules are pinned by the tick and cost rows of `damage-channel.test.ts`
  (`evidence/mechanism-removal.md`).
- Corpus: 49 rows changed, no result changes (`evidence/corpus-attribution.md`).
- Balance: the three `balance-ci-*` tests green; the simulator not run.

## Files changed

Edited: `engine/{conditions,config,effect-types,effective-stats,effects,resolution,resolution-types,tie-break}.ts`,
`data/specializations.ts`, `data/traits/{glimmerdark,overgrowth,rotcap-hollow}.ts`, the corpus digest
fixture, `conditions.test.ts`, `effective-stats.test.ts` (a comment), `resolution.test.ts` and the
`golden-status-snapshot-tick-kill-on-death` fixture header. New: the tests and goldens above and the
evidence files. Deleted by Duncan: the four golden files. No living or content doc edited.
