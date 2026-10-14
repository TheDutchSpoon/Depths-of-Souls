# Fix hand-out, round 1 — 4.5-D

Branch `4.5-d`, on top of `4adb1ff`. Six items: one real fix (1) and five cleanups. No engine
behaviour changes: every existing golden, the corpus digest and every test not named below stay
byte-identical. Standing rules: `.claude/workflow/coding-rules.md`. Answer with `report-r2.md` in
`.claude/phases/4.5/D/`.

The design review added a heading, `spec/effects.md#damagechannel`, that states the
`damageChannel` rule; read it before item 3.

## 1. Pin `compareHpPercent`'s denominator (real fix)

`compareHpPercent` (`engine/effective-stats.ts`) orders two creatures by
`a.currentHp × effectiveMaxHp(b)` against `b.currentHp × effectiveMaxHp(a)`. No test pins the
`effectiveMaxHp` in it: replace it with base Health (`baseStats.health`) or with the unfloored
`getEffectiveStat(_, 'health')`, and every test but the corpus digest stays green. Every case in
`conditions.test.ts` and the HP% golden uses creatures with no Health modifier, where the three
readings agree.

Add two cases to `conditions.test.ts`'s `evaluateCondition -- hp-percent lowest / highest` block,
each with a hand-derived comment showing both orders, where the denominator decides which creature
is tested. Build the Health modifiers the way `effective-stats.test.ts`'s fractional-Health case
does (`statMod('health', …)` in `activeEffects`). For example:

- **Effective, not base, Health:** A has base Health 100 with a ×0.5 Health modifier (effective
  max 50) at 30 HP = 60%; B is 40/100 = 40%. `lowest < 50`: by effective max B (40%) is tested, true;
  read from base Health A looks lowest (30/100 = 30%), is tested, and is 60%: false.
- **Floored, not fractional:** A has base Health 30 with a ×1.15 Health modifier (effective 34.5,
  max 34) at 34 HP = 100%; B is 99/100 = 99%. `highest >= 100`: floored, A is tested, true; read
  unfloored, A is 34/34.5 ≈ 98.6%, B looks highest, is tested, and is 99%: false.

Verify the numbers by hand before committing them, and show in `evidence/mechanism-removal.md`
that each case fails with its mutant (`baseStats.health`; `getEffectiveStat` without the floor) in
a scratch clone, and that nothing else does but the digest.

## 2. The vacuous `on-round-end` status case

In `damage-channel.test.ts`'s validator sweep, `'a status rejects the field'` returns early for
`on-round-end`, so that case passes without asserting anything. Don't generate it: build the
status cases over the hooks without `on-round-end` (a status trigger on it is rejected by
`validateStatusDef` for its own reason, which a comment there says). The trait and perk cases keep
all 15 hooks. The file's count drops by one (67 → 66). Correct the "validator not run on statuses"
row of `evidence/mechanism-removal.md` to the real count of status cases.

## 3. Five citations to `spec/effects.md#damagechannel`

These comments cite `spec/effects.md#hooks` for the `damageChannel` rule; point each at
`spec/effects.md#damagechannel` instead:

- `src/engine/resolution.ts`, the comment on `fireHook`'s `on-damage-taken` skip;
- `src/engine/effect-types.ts`, `TriggeredDef.damageChannel`'s doc comment;
- `src/engine/damage-channel.test.ts`, line 1;
- `src/data/retaliation.data.test.ts`, line 1;
- `src/engine/__golden__/golden-retaliation-direct-only.fixture.ts`, the header's first sentence.

`effect-types.ts`'s hook-vocabulary comment ("The v1 hook vocabulary (16 in all, …)") keeps
`#hooks`. Run `npm run docs:check -- citations` and `-- comments`.

## 4. A stale location in `effective-stats.test.ts`

The fractional-Health case's comment says "(effects.ts's effectiveMaxHp)". `effectiveMaxHp` is
defined in `effective-stats.ts` now (`effects.ts` re-exports it): say so.

## 5. `golden-retaliation-direct-only`'s header

It says the golden is "re-derived by hand when a retaliator or Poison is retuned", but the fixture
holds Poison at 20% (`holdPotency`), so only a retune of one of the four retaliators moves it. Say
that.

## 6. `golden-hp-percent-lowest-picks-by-percent` asserts its no-RNG claim

Its header says "No RNG is drawn"; its test doesn't check it. Assert
`state.rng.position` equals `initial.rng.position`, as `golden-retaliation-direct-only.test.ts`
does (take `initial` from `runGolden`).

## Report (`report-r2.md`)

- The gates, and the test count file by file against `4adb1ff` (expected: `conditions.test.ts`
  +2, `damage-channel.test.ts` −1, nothing else).
- Item 1's two mutants and what each fails; item 2's corrected count.
- That every golden fixture's exports and the corpus digest are unchanged from `4adb1ff`, and that
  items 3–5 change only comments: `npm run docs:check -- comment-proof 4adb1ff` passes over a
  scratch clone holding only those edits.
