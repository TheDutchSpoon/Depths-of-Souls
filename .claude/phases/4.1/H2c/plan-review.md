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

Duncan, 2026-10-10: **choosing balance numbers is design work, not the coding agent's.** H2c ships
only the numbers the H2 grill already decided (ASSUMPTIONS 118, 119, 123–125), the report
additions (126, 127) and the before/after report. A balancing slice, **4.1-H2d**, follows. It opens
with a grill of Duncan on H2c's report about which levers move each spec toward the CI thresholds,
then implements the rulings and asserts the CI threshold test (ASSUMPTION 148). For that grill, H2c
measures three DoT sets on the full report, with nothing committed: today's placeholders, 35 / 30 /
30 and 50 / 40 / 45 (option B). Recorded as ASSUMPTION 149. The kickoff is amended in place to
match.

What that does to this round, for the plan's revision:

- **Withdrawn:**
  - decide-points 1 and 2;
  - fixes 5, 7 and 9 (no DoT stage, no per-item fixes, no threshold test);
  - the stage-5 and stage-6 attribution;
  - P15 (the capped-prefix test goes to H2d with the threshold test);
  - P17 and P18 (no per-item fixes).
- **Changed:**
  - **Fix 1.** No DoT percentage moves, so no DoT golden changes in H2c. The DoT content goldens and
    the DoT pins (including the three goldens fix 1 reclassified as mechanism) belong to H2d, and
    the reclassification stands for it. In H2c:
    - re-derive the three Arcane Bolt goldens;
    - add `golden-h2c-snapback`;
    - pin only `golden-g1-leech-sovereign-pacified`;
    - correct the four "real base stats" headers.
  - **P3.** One pin in H2c.
  - **P9.** Regen stays a placeholder (H2d decides), not "final".
  - **P14.** Show that the one pin is needed.
  - **P16.** The minimum-of-1 share is now one of the DoT measurements, read on Parts A and B.
  - **P19.** Measure and report only; propose nothing.
  - **P24.** The full report (cap 400, probe off) is run for the three DoT sets.
- **Stand as written:**
  - fixes 2, 3, 4 (stages 1–4), 6, 8, 10, 11, 12;
  - P1, P2, P4–P8, P10, P12, P13, P20–P23.

Next: Duncan runs `/slice-plan 4.1-h2c`. The coding agent revises `plan.md` against the amended
kickoff and this round, and lists what changed at its top. Round 2 reviews that.

### Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`:
  - new **ASSUMPTION 149** (H2c chooses no balance number; H2d's grill does; the three DoT
    measurement sets);
  - the H-split tables and the "Slice plan" row add **4.1-H2d**, with H2c's row narrowed;
  - a new "4.1-H2d — the balancing pass" section; the Acceptance bullets for H2c and H2d;
  - the sequencing summary adds H2d;
  - ASSUMPTIONS 22, 113 (placeholder line), 125, 129 and 148 point at H2d;
  - ASSUMPTION 147: H2c pins only the Leech Sovereign golden, and the DoT pin list for H2d is
    corrected to add the `turn-end-dot-kill-burst` pair and `golden-hollowkin-wretch-self-dot`
    (fix 1, P11). The wrong "26" count is removed.
  - ASSUMPTIONS 149 and 150 written from the first answers were withdrawn the same evening.
- `.claude/phases/4.1/H2c/kickoff.md`: amended in place to the new scope, with an "Amended at the
  plan review" note above its Docs edited list.
- `.claude/phases/4.1/H2c/brief.md`: the per-item tuning and CI-test bullets point at H2d.
- `.claude/CONVENTIONS.md`:
  - "Tuning never changes a mechanism golden": a mechanism golden that borrows a real
    **creature** also pins the base stat it reads (P1);
  - the DoT placeholder numbers and the CI threshold test now say H2d.
- `.claude/GAME_DESIGN.md`: the three "tuned in 4.1-H2c" mentions of the DoT and Regen numbers
  now say H2d.
- `.claude/ROADMAP.md`: H2c's line is narrowed, and H2d is added.
- `.claude/content/overgrowth.md`, `glimmerdark.md`, `rotcap-hollow.md`: "a placeholder until
  4.1-H2c" for Poison, Regen, Spore and Burn now says H2d.

## Round 2

Reviewed `plan.md` revision 1 (commit `154627d`) against the amended kickoff, round 1's Decisions,
ASSUMPTIONS 147–149 and the code. This round I also **ran** the decided set: a scratch copy of the
branch outside the repo (Linux `npm ci`), with every H2c number applied (`Math.floor` in both
branches, width base 0, boss offset 5, the Health remap by script over the four species files with
the Flickerlings skipped by id: 58 creatures, Warden Attack 15 + `warden`, Snapback 0.3, Arcane Bolt
1.0), then the full `vitest run`. 17 tests fail in 11 files. That is the real predicted set, and it
differs from the plan's in four places (fixes 1–4).

**Verdict: approved with amendments** (decide-point 2). The revision does what round 1 and
ASSUMPTION 149 asked: no balance number, stages 1–4 as cumulative patches, the corrected Arcane Bolt
file, the (floor, template) matchup table, the three-set DoT measurement. The curve table is exact
(every row rechecked, floor 108 included), the Health formula and its table are exact, and the
remap count is 58 of 61. What's left is four errors in the predicted set (two are mine from round 1)
and one gap in the report code. Each has a precise fix below, so I'm not sending it round again
unless you want me to.

### Plan fixes

**Real fixes**

1. **No pin in H2c: the Leech Sovereign golden doesn't read her Health.** None of its 11 expected
   events carries her HP. PACIFIER's damage reads her Intelligence and PACIFIER's own max HP, and
   both role rules read PACIFIER's HP. Run with her Health at 45, the golden **passes** (both tests).
   Under the rule ("only a number the golden actually reads gets a pin", CONVENTIONS and the kickoff),
   it gets **no pin**. Its file stays byte-identical except a **comment-only header correction**: the
   setup comment says "her stats are the species' own: Health 30"; correct it to say Health is not
   read by this fight. Add it to the header corrections (now five; P32's comments-stripped check
   covers it). P1, P14 and P22 go. The plan's own P14 fallback would have caught this at build, but
   the kickoff's "the pinned Leech Sovereign golden failing with its pin removed" can't be proven, so
   the kickoff changes (decide-point 1). I confirmed P1 in round 1 without reading the events. That
   was my error.
2. **`state/integration.test.ts` "Phase 4.1-A defaults" does not change.** It passes on the full
   decided set: the Brute party still wins all ten floor-1 fights, and the block asserts only that
   plus the soul% multiples. My round-1 fix 3 said its log moves, which is true, but none of its
   assertions does. P25 becomes "expected green, unchanged; checked", not "regenerate".
3. **Two other `integration.test.ts` tests do change, and the plan predicts neither.** Both run
   the CFG-pinned store (so the curve doesn't reach them; content does):
   - **"Slice I … descends floor 1"**, line 193: `expect(revivedCount).toBe(0)` now gets **1**. The
     comment above it explains why it was 0 since H2a (with the Additional, nobody was dead when the
     Unicorn attacked). With the remap someone is. Re-pin it, generated-then-checkpoint-verified,
     rewrite that comment with the new cause and its first stage, and keep the
     `triggersFor(UNICORN_TRAIT) > 0` and Snapjaw `> 0` checkpoints. (The plan already lists this
     run's Snapback comment.)
   - **"Phase 4.1-G2 … the Pacified Unicorn casts its slot-0 gem instead of waiting"**, line 438. The
     rule still holds: the Unicorn is Pacified (event 25), takes her turn, doesn't Wait, and casts.
     But the gem draw now lands on **slot 1 (Wild Vigor: a `SpellCast` then a
     `StatModifierApplied` on herself)** instead of slot 0 (Life Siphon: damage plus a heal). Slot 0
     and Life Siphon were a generated pin on a random draw, not the rule. Re-pin it
     generated-then-checkpoint-verified: keep the rule assertions (Pacified, her next turn has no
     `Waited` and has her own `SpellCast`), pin the drawn slot and its effect, and add an independent
     checkpoint (the cast slot holds a gem from her stored set, which the sibling test pins). Rename
     the test. Rewrite the describe's header comment (the "137 events on main, 212 now … Life Siphon"
     history) to the new log, and attribute the move to its first stage.
4. **Rallying Cry's and the Flare's largest stacks need report code.** `largestStacks` keeps
   **one** maximum per bucket (growth-player, growth-enemy, shred-player, shred-enemy), attributed
   to whichever trait holds it. The kickoff wants Rallying Cry's largest stack (player growth) and
   the Flare's (Flickerlings are mostly enemy growth) **before and after**. The Warden change is
   meant to shrink Rallying Cry, so "after" it will likely stop being the bucket's maximum, and its
   number vanishes from the report. Add a general per-attribution maximum (bucket × trait id → the
   largest `StackCount`, with floor and seed), printed as the top few per bucket. It is pure fold
   code on the existing `StackCount`s, tested like the matchup table on hand-built fights (two traits
   in one bucket both kept; the smaller isn't lost). It also gives the H2d grill every trait's stacks,
   not just the winner's. The "before" numbers come from the extended pass, as P4 already does for
   the other new tables.

**Labeling and small corrections**

5. **`golden-h2c-snapback`, P's hit.** Fixture creatures default to level 11
   (`DEFAULT_FIXTURE_LEVEL`), where the Additional is 0. So P's hit on E is
   `floor(20 + 0.01 × 20) = 20`, not "20 plus an Additional up to the level-1 cap". Keep the default
   level and write 20 (E 1000 → 980). Snapback itself is checked: `40 × 0.3 = 12` exactly in JS,
   `12 − 0.2 × 10 = 10`, `22` at 0.6, P 100 → 90. Also: goldens assert the **full** event log with
   `toEqual`, so write the whole `expectedEvents` (P's turn is enough, `TURN_STEPS = 1`). "Presence,
   never absence" describes what the log proves, not a weaker assertion.
6. **The predicted set, as measured:**
   - `curves.test.ts`: 3 failing default-config tests (floor 1, 100, 101); their titles say
     `round(...)`, so rename them.
   - The species range tests: 2 per biome file plus 1 in `starters.test.ts`; their titles say 10–30.
   - `roles.test.ts`: 1.
   - The three Arcane Bolt goldens.
   - `corpus-digest`.
   - The two integration tests in fix 3.
   - Everything else is green, including `store.test.ts` (as round 1 predicted), every other golden,
     and `balance-sim.test.ts` as it stands today.
   - I checked the 16 goldens that import real species or starter data: every one builds its
     creatures through `makeParty` with explicit stats and reads only traits, so none moves (the h2b1
     ones use the unchanged Flickerlings).
7. `src/app/demoFight.ts` holds ten old-scale creatures (Health 18–50). It's the throwaway demo, not
   content, so the remap rightly skips it. Say so in the report so the PR review doesn't ask.

### Assumptions

- **P1 correct:** no pin (fix 1). This reverses my round-1 confirm, for the reason given there.
- **P2 confirm.**
- **P4 confirm**; the extended pass also yields the per-trait stacks (fix 4).
- **P5 confirm.** Rechecked: floors 2, 3, 6, 9, 108 are exactly the round ≠ floor rows.
- **P6 confirm.** Today the flag is set at `runs === FIRST_SESSION_RUNS`; reading it from the
  finished `runs` with the new window is right.
- **P7, P8 confirm.**
- **P10 confirm.**
- **P12 confirm.** The scratch run shows no unit test borrowing a tuned number.
- **P14 withdrawn** with P1.
- **P20 confirm.** The script as specified remaps exactly 58.
- **P21 confirm.** Fix 3's two tests get attributed with the digest stages.
- **P22 withdrawn** with P1.
- **P23 confirm.**
- **P25 correct** (fix 2): unchanged, checked green.
- **P26 correct** (fix 5).
- **P27 confirm.** The scan has to regenerate the corpus fights per DoT set in the clone (the digest
  holds hashes, not logs). The plan implies this; say it.
- **P29 confirm.** The policy-only equality test is "a registered, unreferenced probe script is
  inert".
- **P30 correct** (fix 4): the existing `largestStacks` can't attribute both.
- **P32 confirm**, now five files (fix 1).
- **P33, P34 confirm.**

### Decide-points

1. **Does H2c ship with no pin?**
   - **Recommendation: yes.** The Leech Sovereign golden passes with her Health at 45, so a pin
     there would hold a number nothing reads. That is exactly what the rule says not to pin.
     ASSUMPTION 147 itself doesn't change. Only its "H2c pins only the Leech Sovereign golden" line
     does, plus the kickoff's golden policy, "Must stay green" and "The PR must prove" lines. The
     Sovereign file gets the header correction instead, and the import comparison is still run over
     every mechanism golden, all expected exports equal.
   - **The alternative:** keep the pin "for safety". It would document a dependency that doesn't
     exist, and its removal check would fail to fail.
2. **Approve with these amendments, or a round 3?**
   - **Recommendation: approve.** Every fix above is exact (measured, not guessed), and none changes
     scope beyond the small per-trait fold (fix 4). WORKFLOWS treats a third round as a signal to
     pull the slice back into design, and nothing here is a design question. On your yes, I write the
     amendments into the kickoff's "Amended at the plan review" section (the coding agent reads the
     kickoff), so they bind the build, and the plan stands as revised.
   - **The alternative:** have the coding agent fold fixes 1–7 into `plan.md` and review it once
     more. It's cleaner on paper but costs a round for no design content.

### Decisions

Duncan, 2026-10-10:
1. **H2c ships with no pin.** The Leech Sovereign golden gets a comment-only header correction.
   ASSUMPTION 147 stands; its H2c line now says H2c pins nothing.
2. **Approved with the amendments.** No round 3. Fixes 1–7 are written into the kickoff's "Amended at
   the plan review" section, which binds the build alongside `plan.md` revision 1.

**The plan is approved: ready to commit.** The kickoff, the plan, this review and the doc edits go
in as the first commit on `phase-4.1-slice-h2c`, so the PR carries the spec it was built against.

### Docs edited

- `.claude/phases/4.1/H2c/kickoff.md`:
  - Read list, Scope, Golden policy, the Rallying Cry/Flare trap, the pinning trap, Must stay green
    and The PR must prove: no pin (decision 1), five comment-only header corrections, the two moving
    integration tests and the unchanged "Phase 4.1-A defaults" block (fixes 2, 3);
  - "Amended at the plan review": the round-2 amendments, standalone for the coding agent
    (decision 2).
- `.claude/briefs/phase-4.1-implementation-plan.md`: ASSUMPTION 147, the H2c line: H2c pins nothing,
  and why (decision 1).
