# Spec — Progression

Read this when changing progression: specializations, perks and perk points, the power curve.

## Design

### Build power is the incremental curve

- The "numbers go up" fantasy lives in **build sources** stacking in the build-modifier pools and
  effective stats (traits, gem augments, equipment infusions, fusion, facility upgrades, spec
  perks), **not** in levels (`spec/creatures.md` "Levels and XP").

### Specializations

- The player picks a **specialization**, which shapes their own bonuses and playstyle, distinct
  from creature affinities. Each defines a **starter creature** that fits its playstyle: the
  player's one cold-start creature (`spec/creatures.md` "Cold start").
- v1 ships three; more may be added and existing ones edited, so specializations are **data**, not
  hard-coded classes:

  | Specialization | Focus | Starter and perks |
  | --- | --- | --- |
  | Sorcerer | gems and the Cast action | `specializations/sorcerer.md` |
  | Brute | the Attack action and physical builds | `specializations/brute.md` |
  | Shieldbarer | Defend, Defence, survival and Provoke-tanking | `specializations/shieldbarer.md` |

- **All content is open to every specialization** (the same creatures, gems, equipment, biomes and
  facilities): a spec changes *how* you play, never *what* you can reach.
- **Each spec has one control immunity** to an enemy-applied status: **Clear Mind** (Silenced),
  **Aggressive** (Pacified), **Lucidity** (Confused). Enemies apply all three through their
  generated gem sets, so each earns its keep in single-player.

### Starter species are stubs

- Each starter, and the Unicorn, belongs to a species found only in a deep biome that is authored
  later. In the seed content only that one creature exists, so its species sits **below the
  ≥3-creature minimum on purpose**: a forward reference, not a gap.

### Perks

- A specialization is a **flat list of perks**: no prerequisites or tiers, any perk bought in any
  order. Some are single purchases, others **levelled** up to a per-perk cap; the full set at max
  levels costs exactly **1000 points**.
- A perk is a plain effect carrier. v1 perks are **combat effect-framework objects only**; perks
  that touch the meta-economy (soul gain, currency drops, facility efficiency) are deferred past
  beta, and no framework for them is built.

### Perk points

- Perk points are **not dropped**: they come **only from first-time boss kills**, **100 per boss**,
  one boss per biome. 10 bosses in v1 give 1000 points, exactly enough to **max one specialization
  at floor 100**: character progression and cave depth finish together.
- Bosses are the **sole** source, and only the **first clear** of each counts. The earned total is
  derived from the bosses cleared, never stored.

### Spending perk points

- Points are spent **freely** as they're earned: the player sets any perk to any level from 0 to its
  maximum, as long as the total stays within the earned budget, and can refund everything at once.
- Perks that work only once Phase 8 systems exist can be bought too, labelled inactive.

### Swapping specialization

- The specialization is **swappable any time, free and unlimited**: no cooldown, no fee. A swap
  **refunds all spent points** for full re-spend in the new spec; the earned total is the budget,
  and a swap reallocates it (a build change, not a grind reset).
- A swap grants the new spec's starter if the player doesn't own it yet, and never takes a creature
  away.

