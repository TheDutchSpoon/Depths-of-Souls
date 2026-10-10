### 4.1-H2d — the balancing pass (deliberate)

Added at the H2c plan review (2026-10-10; ASSUMPTION 149): choosing balance numbers is design work,
so H2c ships only the numbers the H2 grill already decided, and this slice carries the rest.
- **A grill first.** The design owner is grilled on H2c's "after" report and its DoT measurements:
  which levers move each spec toward the CI thresholds (the floor-1 problem creatures in the floor
  1–5 matchup table, the DoT percentages against floors 21–30). The rulings are the slice's
  ASSUMPTIONS; the coding agent implements numbers, it doesn't choose them.
- **The CI threshold test asserted** (ASSUMPTION 148): green on the tuned data, failing on H2c's.
- **Goldens:** ASSUMPTION 147. The mechanism goldens that read a DoT percentage (`golden-dot`, the
  `golden-f2-*` DoT goldens, the `golden-h2b2-*` goldens that read one, the
  `golden-spore-spread-*` mechanism goldens, the `turn-end-dot-kill-burst` pair and
  `golden-hollowkin-wretch-self-dot`) are pinned; each changed number is shown in a hand-derived
  content golden on real data.
- **Before/after report:** H2c's "after" is H2d's "before".
- **Input from the H2c PR review** (`phases/4.1/H2c/review-r1.md`), for reading the matchup table
  in the grill: a row counts **fights**, repeat visits to a floor included, not seeds; and a floor's
  enemies come from the seed and the store's run counter, not from the spec. A spec that leaves
  floor 1 sooner meets fewer templates there (after H2c the Brute meets 12 of floor 1's 18; none of
  its rows is a Treant).

