### 4.1-H2b1 — Flickerlings and damage observation (deliberate)

- **The observer watches damage events** (ASSUMPTION 115): filtered by the damaged creature's
  relationship to the observer and by whether the damage was self-inflicted, which means exactly
  the cost case (ASSUMPTIONS 116, 132). A DoT tick is never self-inflicted, and neither is a
  direct action that lands on its own actor (ASSUMPTION 137). The plan proposes the shape.
- **Content:** Flickerlings replace Glowflies (the Wick, the Flare, the Last Gleam, ASSUMPTION
  116); Glow is deleted; Beacon Charge grants Grant Act First instead of Glow; Overcharge is
  deleted; Luminous Tide becomes Kindred Light (`kindred-light`), a plain team heal. Glimmerdark's
  affinity spread becomes 4 / 3 / 5 / 4 / 2 (`content/glimmerdark.md`, "Phase 4.1 — decided
  changes").
- **The Wick's "no one else to heal → no burn" gate** and its heal target "lowest-HP ally other
  than itself": the plan proposes the gate and how the bearer is excluded.
- **Stacking is untouched** in this PR: `cap`, `stacks`, `consume-stacks` and `consumed-stacks` stay
  for H2b2. Mechanism tests that borrow Glow move to a fixture status.
- **Goldens:** `golden-glowfly-detonator` is retired (its content is deleted); every other golden is
  byte-identical. Hand-derived focused goldens for: the observer firing on an ally's cost and not
  on an ordinary hit, a DoT tick, a direct action landing on its own actor, or a zero cost; the
  Wick's burn and heal, its heal skipping itself, and no burn with no one else alive; the Last
  Gleam on an ally's death. The digest is regenerated once, every changed fight attributed (the
  species swap, the spell-pool change, the Beacon Charge and Kindred Light changes).

