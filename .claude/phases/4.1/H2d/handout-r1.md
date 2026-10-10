# Hand-out r1 — Phase 4.1 — Slice H2d: the balancing pass

For the coding agent. Standing rules: `.claude/workflow/coding-rules.md`. This round is **one comment fix in
one test file**. Change no code, no assertion, no number, no other file under `src/`. Answer with
`report-r2.md` in this mailbox.

## Fix 1 — the cause in the Slice I integration re-pin

**File:** `src/state/integration.test.ts`, test "Slice I integration: real Brute party through real floor 1
… descends floor 1", the comment block that starts `// 4.1-H2d re-pin (1 -> 0; generated-then-checkpoint-verified;`
just above `const revives = outcome.events.filter((e) => e.type === 'Revived')`.

**What's wrong.** The assertion (`toHaveLength(0)`) is right; the explanation is not:
- It computes the counter as "Attack 40 x 0.6 = 24, minus a fifth of the Brute's Defence". 40 is the
  `golden-h2c-snapback` fixture's Attack, not this fight's. In this fight the Snapjaw Jaws' effective Attack is
  **30** and the Brute's Defence **15**.
- It says "The Snapjaw's own two attacks land on the Unicorn (10 and 18)". The Snapjaw attacks **once** (18);
  the 10 is the **Snapback counter** on the Unicorn's opening attack.
- It doesn't name why the Snapjaw's attack goes to the Unicorn instead of the Brute, which is the cause.

**The fight's events (fight 2 of the floor, the Snapjaw Jaws alone):**

At 60% (now):
1. Unicorn attacks the Snapjaw (8; 38 → 30). Snapback counters the Unicorn: 30 × 0.6 = 18, × 0.75 (affinity)
   = 13.5, − 3 (a fifth of Defence 15) = 10.5 → **10**. Unicorn 39 → 29.
2. Snapjaw's turn. Its role is `striker`: rule 1, "any enemy below 80% HP → attack the lowest-HP enemy".
   The Unicorn is at 29 / 39 (74%), so it attacks the lowest-HP enemy, the Unicorn (29 < the Brute's 33):
   **18**, Unicorn 29 → 11.
3. Brute attacks twice (14 each; 30 → 16 → 2). Each draws a counter: 30 × 0.6 = 18, × 1, − 3 = **15**.
   Brute 33 → 18 → 3, alive.
4. Unicorn attacks (8): the Snapjaw dies. Nobody on the player side died, so Guardian's Light finds no dead
   ally: no `Revived`.

At 30% (H2c):
1. The opening counter on the Unicorn is 30 × 0.3 × 0.75 = 6.75 − 3 = 3.75 → **3**; Unicorn 39 → 36 (92%).
2. No enemy is below 80%, so the striker's rule 2 attacks a **random** enemy, and it drew the Brute: **21**,
   Brute 33 → 12.
3. The Brute's two attacks draw two counters of 30 × 0.3 − 3 = **6**: 12 → 6 → 0, the Brute dies.
4. The Unicorn's next attack revives it (the `Revived` the old pin counted).

**Before you write it, confirm the stats from the run, not from this hand-out:** print the Snapjaw's
effective Attack, the Brute's and the Unicorn's Defence and the four counters' `rawDamage` /
`affinityMultiplier` (a throwaway log, removed after). They should read Attack 30, Defence 15 / 15, raw 10.5
and 15 at 60%, 3.75 and 6 at 30%, multipliers 0.75 (Unicorn) and 1 (Brute). If anything differs, write what
the run shows and say so in the report.

**Write** the re-pin comment so it says, in this order: the count moved 1 → 0, first at stage 2 of the digest
attribution (Snapback 60%, ASSUMPTION 151; Pollen Cloud and the DoT percentages leave this fight as it was);
the counter arithmetic with the real stats; the cause (the larger counter on the Unicorn's opening hit takes it
below 80%, so the striker's rule 1 aims its one attack at the Unicorn, and the Brute takes only the two 15
counters, 33 → 18 → 3); what happened at 30% (counter 3, rule 2's random pick drew the Brute, 21 + 6 + 6 kills
it, the Unicorn revives it); and that the checkpoint loop below stays. Keep "generated-then-checkpoint-verified".

**Done when:** the file differs from the branch's current version **only in comments** (compare with comments
stripped, e.g. the TypeScript printer with `removeComments: true`); `npm run test`, `lint`, `format:check`,
`build` and `tsc -b` are green.

## Report

`report-r2.md`: the gates, the stats you printed (the four counters' raw damage and multipliers, the effective
Attack and the two Defences), the comments-stripped comparison, and the new comment text.
