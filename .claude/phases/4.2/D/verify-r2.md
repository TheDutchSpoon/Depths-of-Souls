# Verify report — Phase 4.2 — Slice D (round 2)

Coding agent → design agent. Checked the eight round-1 fixes in `spec/effects.md`,
`spec/responses.md`, `spec/statuses.md`, `ROADMAP.md`, `phases/4.2/G/brief.md` and
`phases/4.2/D/inventory.md` against `main`'s `src/`, and the round-2 rows against the old text. The
round-1 rows were not re-read; the round-2 edits touch only the rows named below.

## Result

- `npm run docs:check -- inventory D`: **PASS**, 172 units and 172 rows checked (base
  `b3ac8dd44c24607ee85ac49599fe0a593b886dd6`).
- Rows checked this round: **7** (C:327, C:380, C:583, C:678, C:755, C:1658, C:1823), plus G:531's
  ROADMAP pointer. All 172 rows were checked in round 1.
- Findings: **0**.

## Round-1 fixes, checked

1. **acted-before-target (C:583).** `spec/effects.md:329-332` names `random-enemy`, `random-ally` and
   `random`. `peekTargetSelector` returns `null` for exactly those three
   (`src/engine/target-selectors.ts:176-181`). Holds.
2. **`all-allies-of-species` (C:678).** `spec/responses.md:48-55` lists it and adds the bullet: "all-allies
   narrowed to creatures sharing the firing creature's `speciesId`; empty for a firing creature
   without one". Code: `livingAlliesOf(self)` filtered by `c.speciesId !== undefined && c.speciesId
   === self.speciesId` (`src/engine/resolution.ts:697-702`). The bullet says nothing beyond that.
   (A bearer without a `speciesId` matches nothing, so empty is right.) Holds.
3. **Cleanup placement (C:1658).** `spec/statuses.md:129-131` now reads "at either end of the turn:
   the turn-start cleanup ends action states; the turn-end cleanup counts down, expires and runs the
   Web roll". Code: Defend and Provoke end in the turn-start cleanup (`src/engine/combat.ts:407-423`,
   `clearOwnTransientStatus` plus `ActionStateEnded`); the turn-end cleanup is `countDownStatuses`
   and `rollWebBreakFree` (`combat.ts:500-506`). Holds, both cleanups.
4. **Heal's `'cast'` (C:327).** `spec/responses.md:76-77` says "A heal spell that names `offStat` names
   `'cast'`, remap-aware Intelligence". No default is claimed. Holds
   (`validateSpellEffects`, `effect-types.ts:1133-1147`, per round 1).
5. **`stacks: false` (C:755).** `spec/effects.md:347-353` keys the claim on the effect's source,
   "matched by `sourceTraitId`", claimed before the roll. Code: `claimedNonStacking` is a set of
   `sourceTraitId`s, added before the `chancePercent` roll (`resolution.ts:489, 606-609`). Holds.
6. **Flat mode composition (C:380).** `spec/responses.md:97-102` reads `floor(stat) × percent × count
   / 100`, "the result is not floored here", the floor "later, in the cost, heal or damage formula".
   Code: `resolveFlatTotal` returns the unfloored quotient and its comment says the one floor lives in
   `applyCostDamage` and `applyHeal` (`resolution.ts:800-818`); flat damage on another creature floors
   in the indirect formula (`damage.ts:112-117`, per round 1). The stat is read floored
   (`Math.floor(getEffectiveStat(...))`). Holds.
7. **C:1823.** The row's Reason now names `OPEN_QUESTIONS.md` "Balance numbers". That section's first
   bullet holds the master difficulty lever (`OPEN_QUESTIONS.md:8`) and its "Costs:" bullet holds the
   gem, equipment, facility and fusion costs (`OPEN_QUESTIONS.md:28-29`). Holds.
8. **ROADMAP Phase 7 pointer (G:531).** `ROADMAP.md:377-384` now says the hybrid would replace the
   multiplicative fold in `spec/effects.md` "Category decides player-facing treatment". That section
   (`spec/effects.md:31-53`) holds the multiplicative fold. Holds, not circular.

The round-2 inventory Reasons (C:327, C:380, C:583, C:678, C:755, C:1658, C:1823) match the text they
describe. No provenance markers were added.

## Spec and code disagree

None.

## Stale comments in `src/` (for 4.2-G)

None new. `G/brief.md` Scope lists the three round-1 additions (`engine/types.ts:130-135`,
`engine/effect-types.ts:121-127`, `engine/effect-types.ts:277`). `engine/combat.ts:407-413` and
`:500` still cite CONVENTIONS' "Turn structure" by the old label; that is the citation pass already
in G's scope, not a new stale claim. `engine/effect-types.ts:327-338` (the deleted
`species-locked.md`) is covered by G's `species-locked` citation count.
