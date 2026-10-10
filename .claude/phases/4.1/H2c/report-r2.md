# Report r2 — Phase 4.1 — Slice H2c: comment fixes

Comment-only round from `handout-r1.md`. No code, assertion, fixture or data changed.

## Hand-out items

1. **`src/data/statuses.ts` header.** Last clause now reads "4.1-H2d tunes them, after its design
   grill." The four "(placeholder)" `potency` notes are untouched.
2. **`src/state/integration.test.ts`, the scripted-intro comment.** Rewritten with the current
   numbers. Checked by logging the intro fight's `DamageDealt` events (a temporary `console.log`,
   run once, removed; no `TMPLOG` remains in the diff). Each number against its event
   (`[source, rawDamage, finalDamage, affinity, remainingHp]`):
   - Unicorn stand-in → Brute: `[0.1875, 7, 1.25]`, Brute HP 26 in round 1 and 19 in round 2
     (33 → 26 → 19). 7 = max(1, floor(0.1875)) + `min(floor(0.2 × 33), 10)` = 1 + 6.
   - Brute → stand-in, round 1: `[11.475, 18, 0.75]` twice, remaining HP 21 then 3 (39 → 21 → 3).
     18 = 11 + `min(floor(0.2 × 39), 10)` = 11 + 7.
   - Round 2: only one Brute `DamageDealt` (18, remaining 0): the first instance kills (3 − 18 < 0),
     instance 2 never fires.
   The stand-in's speed 20 / 39 HP and the Brute's 33 HP are the figures the hand-out gave; the
   events' remaining-HP values are consistent with them.
3. **Phase record, 4.1-H2c "Deviations and spec notes".** First bullet corrected to "three
   assertions in two tests" (naming the Slice I descends-floor-1 test with the revive count at
   stage 4 and the Brute's attacks per turn at stage 2, and the G2 Pacified Unicorn test's gem draw
   at stage 2). The "Fix round r1" line is added at the end of the section, after "Files changed".

## Proof

- **Gates, all green:** `npm run test` (195 files, 1333 tests: 1332 passed, 1 skipped, unchanged from
  r1), `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b` (exit 0).
- **`src/` identical to r1 with comments stripped:** `git diff -U0 src/` filtered to changed lines
  that are not `//` comment lines yields 0 lines.
- **`git diff --stat`:** only `.claude/phases/phase-4.1-fix-and-consolidation.md`,
  `src/data/statuses.ts` and `src/state/integration.test.ts`, plus this `report-r2.md` (new).
- **Golden policy / corpus digest:** no golden or fixture touched; digest unchanged.
- **Mechanisms:** none changed, so no removal test applies.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing. (Mailbox evidence files are left for Duncan, per the hand-out.)
