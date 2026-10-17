# Hand-out, round 1: 4.6-A

**Verdict: fixes (cleanup only).** The build is correct against its spec and every mechanism is
pinned; these four items are leftovers the slice's own changes made. Nothing here changes
behaviour. Golden policy is unchanged: every golden's expected values and the corpus digest stay
as they are on this branch.

Standing rules: `.claude/workflow/coding-rules.md`. Answer with `report-r2.md` in this folder.

## 1. One home for the random-selector check

`validateEffectList` (`src/engine/effect-types.ts`) runs the intent-only `'random'` selector check
with its own inline loop. The two exported functions that did it before,
`validateNoRandomSelectorInResponseTargets` and `validateStatusNoRandomSelectorInResponseTargets`,
now have no caller outside tests, so seven test assertions pin code that production never runs:

- `resolution.test.ts` (the four calls near lines 3065, 3086, 3102, 3116);
- `spell-effects.test.ts` (near lines 1138 and 1157);
- `perform-action.test.ts` (near line 339).

Do this:

- Delete both exported functions. The check lives only in `validateEffectList` (a private helper
  it calls is fine, as long as nothing else calls it).
- Point each of the seven assertions at the validator production uses, with the same effects and
  the same expected outcome (the same `toThrow` regex, or `not.toThrow`): `validateTrait({ id,
  name, effects })` for a plain effect list, `validateStatusDef(status)` for a status. If one of
  those inputs trips a different check first, call `validateEffectList(effects, label, carrier)`
  directly instead, with the carrier kind the old function stood for.
- Only the function called and its import change in those tests; titles and expected messages stay.
- **Proof:** with the random-selector loop removed from `validateEffectList`, the seven repointed
  assertions fail, beside the two that fail today (`load-time-checks.test.ts` "keeps the
  random-selector message of each carrier kind" and `status-containers.test.ts` "rejects a trigger
  inside a status that targets the intent-only 'random' selector"). Record it in
  `evidence/mutation-checks.md`.
- `grep -rn "NoRandomSelectorInResponseTargets" src` then finds nothing.

## 2. A stale comment on `ResolvedHookEffect.nonStacking`

`effect-types.ts`, the doc comment of `nonStacking` (near line 1146) ends "Always undefined for a
status-sourced entry (no v1 status declares it)". That is no longer true: `flatEffects` derives
`nonStacking` and a `status:<statusId>#<index>` claim key for a status's `stacks: false` trigger,
and `stacks-false-claims.test.ts` pins two such triggers in one status. Rewrite the sentence to say
what holds: it is set iff the trigger's definition declares `stacks: false`, on any carrier, a
status's trigger included, and `claimKey` is then always present.

## 3. "createCombat resets HP/statuses" in nine golden fixtures

This slice rewrote the `setup` doc comment "(createCombat resets HP/statuses at fight setup)" in
three fixtures, because `createCombat` resets no statuses: it throws on any input creature with
`activeEffects`. Nine more fixtures still carry the old sentence, on their `setup` doc comment:

- `golden-dot.fixture.ts`
- `golden-rot-sovereign.fixture.ts`
- `golden-sporch-cinderlord-burn-refresh.fixture.ts`
- `golden-spore-spread-dot-kill.fixture.ts`
- `golden-spore-spread-filter.fixture.ts`
- `golden-spore-spread-fizzle.fixture.ts`
- `golden-spore-spread.fixture.ts`
- `golden-turn-end-dot-kill-burst-refresh.fixture.ts`
- `golden-turn-end-dot-kill-burst.fixture.ts`

Replace it with the wording the slice already uses in `golden-revive-cap-fizzle.fixture.ts`:
"(createCombat takes fresh creatures and sets HP at fight setup)". Comment-only: `npm run docs:check
-- comment-proof <this branch's head before the fix>` reports `OK` for all nine. The sentences
saying `createCombat` resets or sets `currentHp` to the effective max are true; leave them.

## 4. The freshness error names the field that failed

`createCombat`'s freshness throw (`combat.ts`) gives one message for every field, ending "fight
setup takes fresh creatures only, or innate spells would double". The innate-spell reason is true
only of `baselineEffects` / `activeEffects`; for `alive: false`, `defending` and the rest it
misleads whoever reads the error.

- Name the field (or fields) that failed in the message, and give the innate-spell reason only
  when one of them is `baselineEffects` or `activeEffects`.
- Keep the phrase `already carries fight-setup output`: `combat.test.ts` and
  `create-combat-input.test.ts` match it.
- In `create-combat-input.test.ts`'s freshness cases, each case also matches its own field name in
  the message (assertion strengthened, title unchanged). List this under the moved or changed
  tests in the report.

## Gates

All the gates in `coding-rules.md`, after `npm ci`. Test count: the same 2412 (2411 passed, 1
skipped) as round 1, file by file; item 1 moves no test between files. Every golden's exports and
the corpus digest are unchanged from this branch's round-1 head (`7e9d2e2`) except the nine
comments in item 3.
