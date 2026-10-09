### 4.1-H2b2 — status rules (deliberate)

- **Single-instance statuses** (ASSUMPTION 114): `cap`, `StatusSpec.stacks`, stack increments, the
  `consume-stacks` response and the `consumed-stacks` magnitude source are deleted; re-application
  keeps the stronger value and refreshes the timer.
- **DoT and Regen from the applier's snapshot** (ASSUMPTION 113), DoT ticks as indirect damage
  with the applier as the damage source.
- **Content:** Vulnerability is ×1.5 once; Sporch Igniter applies one Burn; Spore's spread inherits
  the snapshot; Afterglow's Regen and the DoTs read the placeholder percentages (ASSUMPTIONS 113,
  114; `content/*.md`, "Phase 4.1 — decided changes").
- **Goldens:** `golden-consume-stacks` is retired (its mechanism is deleted); goldens that only
  lose the stack count from a status event change in that field alone; every other changed golden
  is listed with its rule. Hand-derived focused goldens for: a re-application keeping the stronger
  snapshot and refreshing the timer; a DoT tick as indirect damage from the applier's snapshot,
  with the applier dead (the bearer is the source); a retaliator taking a tick from a living
  applier and not striking back; Spore spreading with the dying bearer's snapshot; the observer not
  firing on a DoT tick whose applier is dead (its source falls back to the bearer).

