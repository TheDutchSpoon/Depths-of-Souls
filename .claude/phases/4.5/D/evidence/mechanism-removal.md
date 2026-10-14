# 4.5-D mechanism removal

Each mutant was applied alone to a scratch clone holding the finished tree (outside the repo, the
working tree's files copied in, nothing committed), and the full suite run. The corpus digest fails
under every mutant that moves a fight's log and is left out of the lists below; `zz-dump` is the
attribution script's own test. The two deleted goldens are still in the clone (they were deleted from
the repo, not from the clone) and are left out too.

| Mutant | Tests that fail |
| --- | --- |
| HP% qualifier picks by current HP | `golden-hp-percent-lowest-picks-by-percent`; `conditions.test.ts` `highest` and `lowest` cases |
| `fireHook` ignores `damageChannel` | `damage-channel.test.ts`: attack and spell rows (`indirect` variant), indirect-hit row (`direct`), two-direct, chance, `stacks`, tick row (`direct`), Sleep tick, cost row (`direct`); `golden-retaliation-direct-only` |
| every `hit` treated as direct | `damage-channel.test.ts` indirect-hit row (`direct` and `indirect`), two-direct, chance, `stacks`; `golden-retaliation-direct-only` |
| channel derived from `damageSource` | the same set as the line above: a response's hit is labelled `attack`, so the indirect-hit row fails |
| `damageChannel` left out of `effectsForHook` | the attack, spell, indirect-hit, two-direct, chance, `stacks`, tick, Sleep and cost rows; `golden-retaliation-direct-only` |
| skip after the chance roll | `damage-channel.test.ts` chance case and `stacks` case |
| skip after the `stacks: false` claim | `damage-channel.test.ts` `stacks` case |
| validator not run on traits | every trait case in the validator sweep, and the `createCombat` registry case |
| validator not run on statuses | all 14 status cases in the sweep (15 hooks less `on-round-end`, which has none) |
| validator not run on perks | every perk case in the sweep |
| validator rule removed | every carrier case in the sweep, and the `createCombat` case |
| Snapback, Retaliating Shell, Madness Touch, Thorns each lose the field | `retaliation.data.test.ts` (names it) and `golden-retaliation-direct-only`, in each of the four |
| no 1-HP gate | `resolution.test.ts` `never rolls at 1 HP`: the 1-HP case and the heal case |
| gate on the HP after the hit | the 2-HP case, the heal case, and the pre-existing Last Stand cases (the gate never opens) |

## What the two deleted goldens pinned, and what pins it now

| Rule | Mutant | Fails now |
| --- | --- | --- |
| a tick offers its applier as the source | `bearerSideSource = sourceId` for a tick | `damage-channel.test.ts` tick row, `indirect` and `no field` variants; `golden-status-snapshot-tick-kill-on-death` |
| `triggering-source` resolves to the firing creature | drop the `context.source !== context.self` check | `damage-channel.test.ts` cost row, `indirect` and `no field` variants |
| `on-damage-taken` is skipped on a tick | `fireHook` not called for a `tick` origin | `damage-channel.test.ts` tick row (`indirect`, `no field`) and the Sleep tick case |
| the self-applied tick's arithmetic | the tick's magnitude doubled | `golden-status-snapshot-tick-self-applied`, with the tick goldens and `resolution.test.ts` DoT case |
| the minimum of 1 on indirect damage | `Math.max(0, …)` for `Math.max(1, …)` | `damage-channels.test.ts` (never chip-only), `golden-cost-and-tick-exclusion`, `golden-damage-observed-tick`, `golden-indirect-flat-response` |

The self-applied-tick mutant doubles the magnitude, a stand-in for "the arithmetic is wrong"; the
goldens named fail on a changed number. The self-dot golden's own subject, Madness Touch not
confusing its bearer on its own tick, is held by the first three rows (a `direct` retaliator skips
the tick; one without the field fizzles on it and is shown fizzling).

## Round 2: `compareHpPercent`'s denominator

Each mutant applied alone to a scratch clone of the finished tree (outside the repo), full suite.

| Mutant | Tests that fail |
| --- | --- |
| `compareHpPercent` divides by `baseStats.health` | `conditions.test.ts` "orders by effective max HP, not base Health"; the corpus digest |
| `compareHpPercent` reads `getEffectiveStat(_, 'health')`, unfloored | `conditions.test.ts` "orders by floored effective max HP, not fractional Health" |

Nothing else fails under either. The unfloored mutant leaves the corpus digest green (no corpus
fight orders creatures with a fractional Health modifier).
