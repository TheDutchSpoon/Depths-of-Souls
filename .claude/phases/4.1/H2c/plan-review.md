# Plan review — Phase 4.1 — Slice H2c: the first tuning pass

## Round 1

Reviewed `plan.md` (commit `70313e1`) against `kickoff.md`, `brief.md`, ASSUMPTIONS 113, 117–129,
147, 148, CONVENTIONS ("Tuning never changes a mechanism golden") and the code on
`phase-4.1-slice-h2c` (= `main` plus the kickoff and plan commits).

**Verdict: changes needed.** The plan is careful and most of it stands: the curve table is exact (I
recomputed every row, including the floor-108 case), the DoT arithmetic table is exact, the
simulator changes are right, and findings 1–3 correct real errors in the kickoff. But the
content-golden map is wrong for six of its nine files, Arcane Bolt is in a different file, the
integration test does move through the curve, and the DoT step is measured where DoT barely
appears. Three of these trace back to errors in my kickoff; each is marked.

### Plan fixes

**Real fixes**

1. **The content-golden map: rebuild it from what each file logs.** I read the expected events of all
   nine:
   - `golden-rot-sovereign`, `golden-spore-spread` and `golden-sporch-cinderlord-burn-refresh` log
     **no DoT tick** (no `DamageDealt` with `damageSource: 'dot'`; each stops before any bearer's turn
     end), and `StatusApplied` carries no potency. They read no tuned number visibly, so they stay
     byte-identical and cannot show Spore % or Burn %. The plan's "these nine all contain a tick or a
     spell hit" is wrong for these three.
   - `golden-turn-end-dot-kill-burst`, `-refresh` and `golden-hollowkin-wretch-self-dot` are
     **mechanism goldens** under ASSUMPTION 147's own definition: their subjects are rules (a status
     applied in another creature's turn ticks at the bearer's next turn end; the refresh keeps the
     stronger snapshot; `triggering-source` never resolves to the firing creature). Each borrows a
     real trait as its repro. **Pin them** (P11, corrected below). They are also the exact case 147
     names: the refresh twin depends on "the new potency is strictly greater", and the Wretch's tick
     sits on the minimum (raw −2 → 1), a branch a re-derive at 50% would silently leave. My kickoff
     split called them content; that was wrong.
   - So **every DoT percentage needs a new hand-derived content golden on real data**, each with
     its tick above the minimum of 1 and failing with its number reverted:
     - Poison: the real Venom Bolt (the one Poison applier on every floor);
     - Burn: the real Sporch Igniter brand;
     - Spore: the real Sporecloud Seeder;
     - Regen: only if it changes (P9).
   - Re-derived content goldens: `golden-sorcerer-starter`, `golden-resonant-overtone`,
     `golden-resonant-harmonize` (Arcane Bolt). Pinned: 17 + 3 = 20 (fewer if P14 drops an
     unneeded pin).
   - The four content goldens whose headers say "real base stats" (`rot-sovereign`, `spore-spread`,
     `sporch-cinderlord-burn-refresh`, `hollowkin-wretch-self-dot`) copy the old Health (e.g. the
     Sovereign's 30, the Cinderlord's 18). Correct the header to say which copied stats are real and
     that Health is the pre-H2c value; no setup or expected change.
2. **Arcane Bolt is `src/data/spells/overgrowth.ts:121`**, not `core.ts:22` (that is **Ember Lance**,
   31 references). My kickoff named the wrong file. Also: Arcane Bolt is a **biome-1 Wit gem**. Every
   biome-1 Wit caster rolls 3 distinct gems from the 4 biome-1 Wit spells, so about 3 in 4 enemy Wit
   casters carry it. Stage 4 moves those enemy fights too, and the predicted changed set says so.
3. **`state/integration.test.ts` moves through the curve.** Its "Phase 4.1-A defaults" block uses
   `createGameStore()` (the default config) and pins floor 1 at ten wins for the Brute. Floor 1's
   enemy range goes from 1–3 to 1–1, so that fight log moves at stage 1. The kickoff's "never through
   the curve" was wrong for this block. It is generated-then-checkpoint-verified: regenerate it,
   attribute it to its first stage, keep its checkpoints. The same file also asserts Snapjaw Jaws
   fired (line 178) in the CFG-pinned floor-1 run. The default-config descents in `store-gems`,
   `store-hub` and `store-newgame` assert relations (equal events, `ok`); list them as checked and
   expected green.
4. **Stages are cumulative scratch patches, not file swaps.** `starters.ts` carries stage 2 (Health)
   and stage 3 (the Warden); species and trait files can carry stage 6 fixes too. Build each stage
   as a patch on the previous one, and check that each stage's diff is exactly that stage's change.
5. **Measure the DoT stage where DoT lives.** Burn and Spore are applied only by Rotcap Hollow
   content (biome 3, floors 21–30). Poison comes from Venom Bolt (Instinct casters, any biome) and
   from Rotcap traits. The cap-30, probe-off run barely leaves floors 1–10, so its floor-1 guard can't
   see a DoT change, and a loop that starts at 50/40/45 and only steps down on a floor-1 drop ends
   on its first candidate, unmeasured. Run the DoT stage on the full report (cap 400; the probe can
   stay off) and guard on floors 21–30. The target and guard are decide-point 1.
6. **Complete the predicted changed set.** Add `engine/combat.test.ts` (lines 117, 245: the Sorcerer
   trait grants Arcane Bolt, assertions structural), `engine/status-timing.test.ts:750` (a self-Poisoned
   seer at 3 HP; its "3% tick of 100 max HP" comment is stale) and `state/integration.test.ts`
   (fix 3). `store.test.ts` "adds the Unicorn on a win" most likely stays green: HERO still wins (it
   hits 35 core before affinity plus the Additional, and HERO acts again), and the test asserts only
   `win`. Predict a stale comment ("25-HP target"), not a changed expectation.
7. **After each per-item fix, re-run the mechanism-golden import comparison.** Any mechanism golden
   it moves gets that number pinned. This generalizes the plan's Wick/Flare clause:
   `golden-h2b2-carrier-fresh` reads the real Sporecloud Seeder trait, and `golden-h2b2-tick-dead-applier`
   the real Flare trait.
8. **The matchup table needs a floor column (P8).** Floor 1 has one enemy against the party, so a
   floor-1 row attributes each fight exactly; floors 2–5 share fights between templates. The fixes
   aim at floor 1, so key rows by (floor, template) and print floor 1 on its own.
9. **The threshold test needs an explicit timeout.** Vitest's default is 5 s; give it one in line
   with its measured runtime, as the sim test does.

**Labeling and small corrections**

10. `starters.test.ts`: assert the Warden's exact `baseStats` (Health 39 after the remap, Attack 15)
    and its role. Drop "stat total 90": that holds only on the old Health scale (after the remap the
    starters total 103 / 103 / 104). The docs already say "on the old scale".
11. P13's new behavioural test is redundant: the `roles.test.ts` row `'shieldbarer-starter': 'warden'`
    fails under `taunter`, and `scripts.test.ts`'s `warden` block already pins the rules. Drop it.
12. The Health script matches `baseStats: { health: N` only, so no `stat: 'health'` modifier in a trait
    file can be touched.

### Assumptions

- **P1 confirm.** The golden borrows a real creature, and its subject is a rule (a Pacified striker
  casts). The pin holds `baseStats.health` at 30. Spec question for the docs: CONVENTIONS' rule says
  "a real status, spell or trait"; it should say "or creature". I'll fold that after your calls.
- **P2 confirm.** `golden-h2b2-vulnerability-once` reads only Vulnerability.
- **P3 confirm.** Count by what each file reads. The kickoff's "14" didn't match its own split. After
  fix 1 the set is 20.
- **P4 confirm.** The extended "before" pass is the right way to get the two new tables for "before".
- **P5 confirm.** One `Math.floor` in both branches, no config field. The placeholder config stays exact.
- **P6 confirm.** Reading the flag from the finished `runs` also makes it right for capped test runs.
- **P7 confirm.**
- **P8 correct:** add the floor dimension (fix 8). "Fights containing this creature" with the
  fight's result is the right row meaning.
- **P9 confirm.** Regen has no Defence term, so it is never stuck on the minimum, and the remap
  already lifts it by 50–80% (Health 30 → 45 to 14 → 25). 10% becomes the final number: drop "placeholder" from its code comment.
  `golden-h2b2-regen-potency` stays byte-identical.
- **P10 correct: don't pin Snapback.** The golden never evaluates it, and a pin is for a number the
  golden reads. The stated reason doesn't hold: if a tick ever offered a triggering source, Snapback
  would log `TriggerFired` at any power, 0 included, and the golden would fail either way.
- **P11 correct: pin all three** (fix 1). This reverses my kickoff split, for the reason given there.
- **P12 confirm.**
- **P13 correct:** drop (fix 11).
- **P14 correct: remove the pin for every pinned file**, not a sample. It is one golden run per file
  in the clone. A pin whose removal changes nothing is not needed: drop it, and that file stays
  byte-identical as a file.
- **P15 confirm.** Only `stopReason` reads the cap, so any cap above 30 exercises the same path. The
  plan's fallback to seed 1 is fine if the budget needs it.
- **P16 correct:** the min-1 share reads **corpus Parts A and B** (the 500 generated fights). Report
  Part C apart: its coverage walls carry stacked Defence in the 10²³ range, so they tick 1 at any
  percent. The search direction and guard are decide-point 1.
- **P17 correct:** **Health is not a lever.** ASSUMPTION 125 set every creature's Health by the
  formula, so changing one is a stop-and-ask. Whether a non-Health base stat may be a lever, and in
  what order, is decide-point 2.
- **P18 confirm.**
- **P19 correct:** the report attributes no draw to a trait (ASSUMPTION 127). Use what it measures:
  the Flare's largest stack and the round-cap draw rate, before vs after. Rallying Cry is decided
  unchanged (ASSUMPTION 123), so any proposal to change it is a stop-and-ask regardless.
- **P20 confirm**, with fix 12. Skipping the Flickerlings by id is right: 25 and 28 are shared values.
- **P21 correct:** stages as cumulative patches (fix 4). The per-stage digests and the single repo
  regeneration stand.
- **P22 confirm.**
- **P23 confirm.**
- **P24 correct:** the DoT stage needs the full cap (fix 5). The floor-1 per-item loop on cap 30
  stands, and the full report is rerun at the end.

### Decide-points

1. **What sets the DoT percentages, and what guards them?**
   - **Recommendation:** keep the plan's anchor and start (Poison 50 / Burn 40 / Spore 45), with two
     conditions:
     - a tick must clear the minimum on the party-side tank case at every floor (ASSUMPTION 113:
       DoT is the counter to Defence tanks). That needs Poison ≥ 45; 40 ticks 1 at floor 30;
     - the guard moves to the full report's deep game. The DoT stage is compared with the stage-4
       report on first-try clear for floors 21–30, T4, the Rot Sovereign's row and round-cap draws.
       If floors 21–30 lose more than 10 points first-try (on floors with at least 10 seeds
       attempting), or fewer seeds reach floor 30, **stop and ask** rather than step below the
       anchor.
   - **Why:** the same percent that lets a player's Venom Bolt dent an enemy tank sets every Rotcap
     applier's strength against the party. At 50%, an enemy Poison at floor 30 ticks about 93 into a
     typical party creature of about 270 HP, three times. A direct hit there is about 120. That is
     strong, and today nothing in the plan would see it.
   - **The alternative:** the smallest percent that gets DoT off the minimum on typical targets
     (about 35%). It is gentler on biome 3, but a player's DoT then ticks 1 against a Defence-28
     tank at every floor, which drops 113's purpose.
2. **May a per-item fix change a creature's non-Health base stat?**
   - **Recommendation:** yes, within 10–30, with no fixed order against trait numbers. Each fix picks
     the lever that answers its matchup row's cause and names that cause.
   - **Why:** the Shieldbarer's floor-1 losses were to Wit casters (Spider Weaver, Pollinator
     Beneficiary, Pollenlord), and their damage runs mostly through their gems: Arcane Bolt sits in
     about 3 of 4 biome-1 Wit gem sets, and ASSUMPTION 124 just doubled it. That number is decided,
     so their own Intelligence is the only creature-local lever; a trait number can't reach that
     damage. The kickoff's wording ("a factor, a percentage, or how often it fires") was written
     with traits in mind and doesn't settle this.
   - **The cost:** ASSUMPTION 147 exempts base stats from content goldens, so these fixes are covered
     only by the data tests and the report. Each one is listed under Content changes, and I fold it
     into the content docs' stat tables at the PR review.

### Decisions

_(pending Duncan's calls)_

### Docs edited

_(none yet: decisions and the CONVENTIONS "or creature" wording are written in once Duncan answers)_
