# Report r2 — Phase 4.1 — Slice H2d (hand-out r1: one comment fix)

## Fix 1 — Slice I integration re-pin comment

**Changed:** only the `// 4.1-H2d re-pin (1 -> 0; ...)` comment block in `src/state/integration.test.ts`. No code,
assertion or number changed; no other file under `src/`.

**Stats printed from the run** (throwaway log of fight 2's `DamageDealt` events, removed afterwards; the 30% case was
run by temporarily setting Snapback's `spellPower` to 0.3 in `src/data/traits/overgrowth.ts`, then restored; both
temporary edits are gone, `git diff` shows only the test file):

| Case | Target | rawDamage | affinityMultiplier | final |
|---|---|---|---|---|
| 60% opening counter | Unicorn | 10.5 | 0.75 | 10 |
| 60% counters (x2) | Brute | 15 | 1 | 15 |
| 30% opening counter | Unicorn | 3.75 | 0.75 | 3 |
| 30% counters (x2) | Brute | 6 | 1 | 6 |

Effective Attack and Defence are not events, so they are derived from the printed raws: 0.75·(0.6A) − D/5 = 10.5 and
0.6A − D/5 = 15 give **A = 30, D = 15**, and the Brute's 6 at 30% (0.3·30 − 15/5) confirms Defence 15. Everything
matches the hand-out. Full event sequences also matched: at 60% Unicorn 39→29→11 (Snapjaw's single 18), Brute
33→18→3, no `Revived`; at 30% Unicorn 39→36, Snapjaw's 21 on the Brute (33→12), 12→6→0, `Revived` at 7 HP.

**Comments-stripped comparison:** `ts.createPrinter({ removeComments: true })` over `git show HEAD:src/state/integration.test.ts`
and the working file: **IDENTICAL without comments**.

**Gates:** `npm run test` 201 files / 1356 passed, 1 skipped (same as before: no test added or removed); `lint`,
`format:check`, `build` and `npx tsc -b` green. Prettier was run on the file (no change beyond the comment).

**New comment text:**

```
// 4.1-H2d re-pin (1 -> 0; generated-then-checkpoint-verified). The count moved first at stage 2
// of the digest attribution (Snapback back at 60% of Attack, ASSUMPTION 151); Pollen Cloud and
// the DoT percentages leave this fight as it was. Fight 2 is the Snapjaw Jaws alone, effective
// Attack 30 against Defence 15 on both the Brute and the Unicorn. A counter is 30 x 0.6 = 18,
// times the affinity multiplier, minus a fifth of the Defence (3): on the Brute (x1) 15, on
// the Unicorn (x0.75) 13.5 - 3 = 10.5 -> 10. The Unicorn's opening attack draws the 10 counter
// (39 -> 29, 74% of its max HP), which takes it below 80%, so the striker's rule 1 ("any
// enemy below 80% HP -> attack the lowest-HP enemy") aims the Snapjaw's one attack (18) at the
// Unicorn (29 < the Brute's 33): Unicorn 29 -> 11. The Brute then takes only the two 15
// counters of its double strike, 33 -> 18 -> 3, alive, and the Snapjaw dies to the Unicorn's
// next attack. Nobody dies, so the Unicorn's `random-dead-ally` pool is empty: a targeting
// fizzle, no Revived event. At 30% the opening counter was 30 x 0.3 x 0.75 - 3 = 3.75 -> 3
// (Unicorn 39 -> 36, 92%), no enemy was below 80%, so rule 2's random pick drew the Brute: 21
// (33 -> 12), then two 6 counters (30 x 0.3 - 3) killed it (12 -> 6 -> 0) and the Unicorn's
// next attack revived it. The checkpoint loop below stays: it checks any Revived the fight
// produces.
```

## Standard sections

- **Test count vs `main`:** unchanged (comment-only).
- **Golden policy / corpus digest:** untouched; no fixture or digest change.
- **Mechanism tests:** none new or changed; the existing `toHaveLength(0)` assertion is unchanged.
- **Phase record:** the record doesn't contain the wrong explanation, so it is unchanged.
- **Spec questions:** none.
- **Content changes:** none.
- **To delete:** nothing.
