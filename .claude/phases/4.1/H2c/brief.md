### 4.1-H2c — the first tuning pass (deliberate)

- **Config:** level-range width base 2 → 0 and a rounded-down minimum (ASSUMPTION 118);
  `bossLevelOffset` 3 → 5 (ASSUMPTION 119).
- **Content data:** Health remapped to 20–45 for every creature (ASSUMPTION 125) except the three
  Flickerlings, already on the new scale since 4.1-H2b1 (38 / 25 / 28): the remap skips them; the Shieldbarer
  starter's Attack 15 and `warden` role (ASSUMPTION 123); Snapback 0.3; Arcane Bolt 1.0 (ASSUMPTION
  124).
- **Per-item tuning toward the bands and the CI thresholds** (ASSUMPTION 129): the floor-1
  problem creatures the floor 1–5 matchup table shows, and the DoT percentages. *(Moved to 4.1-H2d
  at the H2c plan review, ASSUMPTION 149: the design owner decides them in a grill on H2c's report.
  H2c measures three DoT sets for that grill and chooses no balance number.)*
  - **Input from the H2b2 PR review:** with the placeholders, 4,971 of the corpus's 5,318 ticks
    (93%) land on the minimum of 1 (a potency of 4–5 from a stat near 20, against a fifth of a
    Defence near 20); corpus draws rose 39 → 52 with H2b2. Tuning the percentages has to lift a
    tick's potency clear of `0.2 × Defence` across the level range, or DoT stays inert.
- **The report additions** (ASSUMPTION 127) and the **floor-5 threshold change** (ASSUMPTION 126).
  The CI threshold test is asserted in 4.1-H2d (ASSUMPTIONS 148, 149).
- **Before/after report** in the PR and the phase record: the report on `main` before H2c (with
  H2a and H2b merged) and after it.
- Content-doc numbers follow the data in the same PR.

- A **deterministic balance simulator**: drives the **real store** (`newGame`, the intro, `setSpec`,
  `descend`, `summon`, `setPartySlot`, `setPerkLevel`) with a **documented simple player policy**
  (ASSUMPTION 21) over a fixed set of seeds, and reports:
  - **T1** floor-1 clear rate (target ≥95% of seeds);
  - **T2** floor runs until the first soul completes (target ~10; floor runs, not clears, since the
    PR #84 review: ASSUMPTION 107);
  - **T3** party size after the first session = the first 10 floor runs (target 6);
  - **T4** the deepest floor reached before a hard wall (target: no wall before the floor-10 boss);
  - **T5** party level vs floor, and enemy level vs floor (target: party ≈ floor, enemy per the
    multiplier curve).
- Output is a readable report (a table per spec). **CI asserts only loose "badly broken"
  thresholds** (ASSUMPTION 22); bands are reported, not asserted.
- **First tuning pass** (H2c, scoped by the H2 grill above): adjust `BalanceConfig` values and the
  numbers of the three new spells (and any creature/spell numbers the report shows as outliers)
  toward the bands. Record the before/after report in the PR and in the phase record. Content-doc
  numbers follow the data in the same PR.
- Watch points to report explicitly: fight-count compounding (floor success vs per-fight win rate),
  floors 20–30, and the Unicorn's revive strength under the cap.
- **Watch point: uncapped stat stacking stalls fights** (PR #73 review, measured on the corpus
  after 4.1-C2c). 40 of the 500 corpus fights end as round-cap draws, and 31 of those have the
  Shieldbarer starter's Rallying Cry (`on-provoke` → ×1.35 Defence to every ally, permanent) stacked
  58 to 101 times on one creature. In corpus fight 374 the Unicorn reaches about 3 × 10¹⁰ effective
  Defence, damage falls to the chip floor, and a Defence-scaled retaliation (Retaliating Shell) hits
  for 75,204. Other traits reach 100–200 stacks too (fights 9, 83, 344, 348).
  - **More data (PR #77 review, after 4.1-D2):** the Part C coverage fights face a wall of
    Shieldbarers that Provoke and Defend for 100 rounds, so they stack hardest. In fight 507
    (Bramble Ward) Rallying Cry fires 513 times and Bramble Ward 300 times, effective Defence
    reaches about 1.6 × 10²³ and one creature carries 201 active effects. These are coverage
    fights, not balance data, so the simulator's draw-rate figures should come from its own runs.
  - **More data (4.1-H2b1 PR review):** the Flickerling Flare's ×1.15 Speed to every ally fires on
    each Wick burn, and the Wick burns every turn while another ally is hurt, so Speed compounds
    (two Flares: ×1.32 per burn). On the regenerated corpus, 20 fights have a Flare reacting; the
    worst reach 45 reactions and ×539 Speed (fight 190), and 43 reactions and ×407 (fights 344 and
    348, both 100-round draws). Five Flickerling fights changed to draws in H2b1 (344, 370, 372,
    490, 494). Same rule as above: if the report shows a fix is needed, it is per item (the factor,
    or how often the Flare can fire), never a cap.
  - **The rule is locked**: `stat-modifier` stacking is multiplicative and uncapped (GAME_DESIGN,
    "Player-facing treatment"). The fix, if the report shows one is needed, is per content item:
    the factor, or how often it can fire (for example once per turn, or a trigger condition), and
    never a global stack cap.
  - The report adds, per spec: the **round-cap draw rate**, and the **largest stack of one trait's
    stat-modifier** seen on a creature. Whether draws get a target band is decided on H1's report,
    before H2's plan. **Decided at the H2 grill: no band for now** (ASSUMPTION 121); the draw rate
    stays in the report.
- **Watch point: boss floors in 6v6** (PR #82 review, measured on the corpus after 4.1-G1).
  - **Lock uptime needs a script that aims at the boss.** Role scripts aim a spell at the lowest-HP
    enemy, so the simple policy never locks a boss. In the G1 corpus, 19 boss fights have a
    player-side Pacify, and it lands on the boss in none of them. The four Leech Sovereign fights
    the F3 attribution named (19, 109, 199, 289) are rerolled fights now, not a measurement of the
    lock.
  - So run every boss floor twice for the same party: once on the simple policy, and once with one
    creature on `Cast Pacify → highest-HP enemy`, the case GAME_DESIGN "Milestone bosses" accepts.
    The store has no script action until Phase 6, but it already materializes an instance's
    `scriptId` against its script registry, so this case runs through the real store (decided at
    the 4.1-H1 plan review, ASSUMPTION 101): the extra script registered, set on one instance from
    a state snapshot, and the snapshot restored after.
  - Report the boss's locked-turn share and the clear rate both ways. A large jump in the clear rate
    means the lock still switches a boss off, and the watch point's per-turn break-through chance
    comes back as a decision. **Measured on H1's report: no jump** (the clear rate falls or holds
    on every boss floor but the Leech Sovereign's, where it rises 4–8 points over all visits), so
    **no break-through chance** (ASSUMPTION 120).
  - **The Rot Sovereign's Attrition** (+10% Attack on every death, either side) has up to 11 other
    deaths to feed on in 6v6, where it had at most 8. T4 and the floor-30 report show whether she
    runs away.
