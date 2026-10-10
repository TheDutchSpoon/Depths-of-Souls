# Open questions

Read this when a slice touches a parked question, or at a grill.

## 13. Open questions & parked items

**Balance numbers (all parked — live in config, tune in playtest):**
- Floor→enemy-level-range curve (the master difficulty lever: level-vs-floor ratio, range
  width-growth rate) and XP/level growth pacing. *Targets are set (§4: party ≈ floor, enemy
  multiplier 1.25 → 2.0 by floor 100, +1pp per floor after); the exact parameters are tuned with
  the balance simulator.* Watch points: floors 20–30 before Phase 8 (about +40% enemy stats,
  answered only by perks and traits) and the steep climb past floor 100. Clean-path levelling
  (every floor cleared on the first try) keeps party level equal to the floor through floor 9,
  then lags (9 at floor 10, 25 at floor 30), mostly because a boss floor pays one fight of XP
  (4.1-H2d grill, brief ASSUMPTION 154). The floor-30 boss against the DoTs: the Brute's first-try
  clear is 28 / 36 after 4.1-H2d (brief ASSUMPTIONS 152, 154).
- **Status-only AoE recasts** (watch point, 4.1-H2d PR review, brief ASSUMPTION 154): a damage-free
  Pollen Cloud recast only refreshes Sleep, and casters recast it on a side already all asleep,
  which can hold a fight to the round cap. Accepted as part of the draw cost; the fix belongs in the
  role scripts and Phase 6's conditions ("target lacks the status"), not in the engine.
- **Fight count** (default 10 + (floor − 1), uncapped): floor success compounds per-fight win
  chance over many fights. **Revisited at the 4.1-H2 grill and kept** (brief ASSUMPTION 117): the
  compounding is real and a flat 10 measured faster, but the early floors are balanced through the
  level range instead (§4). Watch point: the per-fight win rate a floor needs rises with depth.
- **The Unicorn's revive strength** (up to 10 revives per ally per fight under the revive cap);
  the lever, if needed, is a chance on its trait.
- Drop weights/rates for Essence, Ore, Bricks, Lifeforce, and recipes.
- Costs: gem craft/augment/level (Essence), equipment craft/infuse/level (Ore), facility
  build/upgrade (Bricks), fusion + catch-up leveling (Lifeforce).
- Soul-per-kill % per rarity tier (default 25 / 20 / 10 from Phase 4.1-A); status magnitudes/durations/
  DoT and Regen percentages (decided at the 4.1-H2d grill, open to later tuning); affinity
  already fixed (±25%).
- Facility upgrade-tier counts and exact cap values (Gem Forge, Equipment Forge, Fusion Chamber
  only — structure is decided in §4, numbers are not).
- Typical fight-length target (rounds per on-level fight) and the exact fight-length safety
  round-cap value (structure decided in §7, number TBD).
- **DoT and Regen potencies** (decided at the 4.1-H2d grill, brief ASSUMPTION 152, landed in
  4.1-H2d: Poison 40% of Attack, Burn 35% of Intelligence, Spore 35% of Speed, Regen 10% of the
  healer's Health; §6). The placeholders before it (Poison 20 / Burn 25 / Spore 15) put **93% of
  ticks on the minimum of 1** at the H2b2 PR review (a potency of 4–5 from a stat near 20, against
  a fifth of a Defence near 20). No set measured moved a CI verdict; 40 / 35 / 35 makes a DoT do
  something, kept modest because biome 3's DoTs are mostly the enemy's. *(They replaced the
  Phase 4 percent-of-max-HP ticks, Regen 5% / Poison 3% / Burn 5% per stack.)*

**Design items parked (decided to defer, not undecided):**
- **Behavioral traits** (scripting-altering / extra-action traits) — post-v1.
- **Status effect naming** (Intelligence/Speed buff-debuff names) — data, name later.
- **Lifeforce / Essence** possible rename if they feel too samey in UI.
- **Sacrifice-revive** (idea): the Unicorn's revive opens it as a design space for future specs.
- **Entrance-hub prelude** (idea, not committed): a short opening of a few fights vs. very weak
  **non-spawnable** creatures — "clearing the cave entrance to set up base" — doubling as a gentle
  tutorial at the shallow end of the onboarding ramp (§4). Would reuse the fixed-authored-encounter
  path (same as bosses; outside the spawn pool). Possibly before start-of-beta; deliberately
  **unbuilt** for now (no prelude seam until authored).
- **Off-affinity spell equipping** via a trait/perk exception (§5) — deferred post-beta with the
  gem/perk economy; the equip-gate is universal until then.

**Genuinely open (need a decision before the relevant content):**
1. The **biome roster**: the 10 biome names/themes and which creature types populate each
   (v1 target ≥6 species/biome, ≥3 creatures/species ≈180+ total), plus per-spec **starter
   creatures**. **First three decided** (§4): The Overgrowth, Glimmerdark, Rotcap Hollow — the
   remaining seven are open. Deliberately deferred — don't let it block the engine skeleton
   (Phases 0–3), which is built against placeholder data; it's the largest content-authoring task
   in the project. The 1–100 **biome order is an onboarding ramp** (§4) — a ramp in interaction
   *scope* (self-contained/within-species → cross-species at biome 4+), not trait depth; every
   creature is build-relevant from biome 1 — so authoring the roster is also an
   ordering-by-comprehension task, not just a *which-creatures* task.

Lock this down before the phase that depends on it (Phase 4 content, per ROADMAP).
