# Report r2 — 4.6-A: Engine hardening

Answers `handout-r1.md`. Cleanup only: no behaviour change except the wording of the freshness
error. Nothing committed, nothing deleted, no living doc edited. Evidence rows are appended to
`evidence/mutation-checks.md`; the phase record (`record.md`) is updated.

## Hand-out items

1. **One home for the random-selector check.** Deleted `validateNoRandomSelectorInResponseTargets`
   and `validateStatusNoRandomSelectorInResponseTargets` from `effect-types.ts`; the check lives in
   `validateEffectList`'s loop (via the existing private `validateResponseTargetNoRandomSelector`).
   Repointed the seven assertions, same effects, same regex / `not.toThrow`, titles unchanged:
   `resolution.test.ts` ×4 (`validateTrait`, `validateStatusDef`, `validateTrait`, `validateStatusDef`),
   `spell-effects.test.ts` ×2 (`validateTrait`, `validateStatusDef`), `perform-action.test.ts` ×1
   (`validateTrait`). No input tripped another check first, so `validateEffectList` is not called
   directly. `grep -rn NoRandomSelectorInResponseTargets src` finds nothing.
   *Checked:* with the loop body removed from `validateEffectList`, five tests fail: the two named in
   the hand-out, plus `resolution.test.ts` ×2 and `spell-effects.test.ts` ×1 (that test holds two of
   the repointed assertions). **Deviation from the hand-out's "the seven fail":** the three
   `not.toThrow` assertions cannot fail when a throwing check is removed, so four of the seven
   `toThrow` assertions are the ones that fail (3 tests). The `not.toThrow` ones still pin that the
   production validator accepts a legal input. File restored from a byte copy; row in
   `evidence/mutation-checks.md`.
2. **`nonStacking` comment.** Rewritten: set iff the trigger's definition declares `stacks: false`,
   on any carrier (a status's trigger included), and `claimKey` is then always present. Comment only.
3. **Nine fixtures.** "(createCombat resets HP/statuses at fight setup)" → "(createCombat takes
   fresh creatures and sets HP at fight setup)" in the nine listed fixtures. *Checked:* `npm run
   docs:check -- comment-proof 7e9d2e2` prints `OK` for all nine; `grep "resets HP/statuses" src`
   finds nothing. (The command's `FAIL` lines are the six files that changed code, as expected.)
4. **Freshness error names the field.** `createCombat` collects the failing fields
   (`baselineEffects`, `activeEffects`, `alive: false`, `defending`, `provoking`, `defendCount`,
   `revivesUsed`) and the message reads `... already carries fight-setup output (<fields>) -- fight
   setup takes fresh creatures only`, with `, or innate spells would double` appended only when
   `baselineEffects` or `activeEffects` is among them. *Checked by:* two mutations, both killed
   (`evidence/mutation-checks.md`): the message naming no field (14 red), the innate reason given for
   every field (5 red).

**Changed tests (create-combat-input.test.ts):** each freshness case (both the `creature` and the
`enemy` variants) now also matches its own field in `(<field>)` (titles unchanged); the `creature`
variant also asserts the innate-spell reason is present exactly for the two effect-list fields
(through a small local `thrownMessage` helper). No test added or moved.

## Gates (after `npm ci`, which ran clean)

| Gate | Result |
| --- | --- |
| `npm run test` | 2411 passed, 1 skipped (261 files, 2412 tests), same as round 1; see flake note |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 748 citations in 530 files |
| `npm run docs:check -- comments` | PASS, 7691 comments and 2094 titles in 496 files |

**Flake note.** On the first full run, `state/balance-sim.test.ts` "same seeds give a deep-equal
report, built twice" hit the 5 s default timeout under parallel load (6.6 s); alone the file passes
(77 passed, 1 skipped), and a full-run rerun was not repeated after it. It is unrelated to this
diff (I did not touch it); I'd treat it as a timing flake on this machine.

**Test count, file by file against round 1:** unchanged in every file (2412). Item 1 moves no test
between files; item 4 adds no test.

**Golden policy.** No golden's exports changed: the nine fixtures differ by one comment line each
(`comment-proof` `OK`). The corpus digest is untouched (no `corpus:update`, no engine behaviour
change).

## Spec questions

None. A grep of `.claude` finds the removed validators and the old freshness wording only in past records and mailboxes; `CONVENTIONS.md` line 303 ("takes fresh creatures only") stays true.

## Content changes

None.

## To delete

None.
