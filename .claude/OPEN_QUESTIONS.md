# Open questions

Read this when a slice touches a parked question, or at a grill.

Settle each question before the phase or slice that depends on it.

## Balance numbers

All parked: they live in config (`CONVENTIONS.md#where-each-number-lives`) and are tuned in
playtest with the balance simulator.

### The floor → enemy-level-range curve

- The master difficulty lever (the level-vs-floor ratio, the range's width growth) and XP and level
  pacing. The targets are set (`spec/run.md#enemy-levels`); the exact parameters are tuned.
- Watch points: floors 20–30 before Phase 8 (about +40% enemy stats, answered only by perks and
  traits), and the steep climb past floor 100.
- Clean-path levelling (every floor cleared on the first try) keeps party level equal to the floor
  through floor 9, then lags (9 at floor 10, 25 at floor 30), mostly because a boss floor pays one
  fight of XP.
- The floor-30 boss against the DoTs: the Brute's first-try clear is 28 / 36 on the simulator
  report.

### Status-only AoE recasts

- A watch point: a damage-free Pollen Cloud recast only refreshes Sleep, and casters recast it on a
  side already all asleep, which can hold a fight to the round cap. Accepted as part of the draw
  cost. The fix belongs in the role scripts and the Phase 6 conditions (`ROADMAP.md` Phase 6), not
  in the engine.

### Fight count

- The fight count (`spec/run.md#fights-per-floor`) makes floor success compound the per-fight win
  chance over many fights. Kept: the compounding is real and a flat 10 measured faster, but the
  early floors are balanced through the level range instead. Watch point: the per-fight win rate a
  floor needs rises with depth.

### The Unicorn's revive strength

- Up to the revive cap per ally per fight (`content/overgrowth.md#unicorn-lightbearer`,
  `spec/responses.md#revive`); the lever, if needed, is a chance on its trait.

### Drops and costs

- Drop weights and rates for Essence, Ore, Bricks, Lifeforce and recipes.
- Costs: gem craft, augment and level (Essence); equipment craft, infuse and level (Ore); facility
  build and upgrade (Bricks); fusion and catch-up levelling (Lifeforce).
- Facility upgrade-tier counts and exact cap values (Gem Forge, Equipment Forge, Fusion Chamber
  only): the structure is decided (`spec/run.md#facilities`), the numbers are not.

### Content numbers

- Soul gain per rarity (`spec/creatures.md#souls`), and status magnitudes, durations and the DoT
  and Regen potencies (the content docs' status entries): open to later tuning. The potencies are
  kept modest because biome 3's DoTs are mostly the enemy's.

### Fight length

- The typical fight-length target (rounds per on-level fight), and whether `ROUND_CAP` (100,
  `spec/combat.md#turn-queue`) is the right safety cap for it.

## Parked design items

Decided to defer, not undecided.

### Behavioral traits

- Traits that insert extra turns, change scripting options or alter the creature's own
  decision-making: post-v1. Extra actions are built (`spec/responses.md#perform-action`).

### Status effect naming

- The Intelligence and Speed buff and debuff names: data, named later.

### Lifeforce and Essence

- A possible rename, if they feel too samey in the UI.

### Sacrifice-revive

- An idea: the Unicorn's revive opens it as a design space for future specs.

## Genuinely open

Each needs a decision before the content that depends on it.

### A self-describing fight log

- Settle at Phase 7's kickoff (`ROADMAP.md#phase-7--combat-ui--feedback`). A `SpellCast` names
  its gem slot, not its spell, and the slot counts the innate spells fight setup puts first
  (`spec/creatures.md#innate-spells`), so a reader of the log reruns `createCombat` to name a
  cast. Rebuilding a fight from its inputs is sound by design; the question is whether the
  "why did this happen" screen should read a log that names its spells. Adding the spell id
  changes every golden with a cast in it.

### Max Health buffs that switch on and off

- A max Health buff with a condition (a stat-modifier gated on `has-status` or `always`) changes
  effective max Health as its condition switches, without the clamp an applied stat buff gets
  (`spec/statuses.md#health-is-a-modifiable-stat`), so current HP can exceed max. No content has
  one; settle the clamp before authoring one. A status can't carry one at all
  (`spec/effects.md#no-temporary-stat-modifier`).

### The biome roster

- The names and themes of biomes 4–10, and which creature types populate each, to the content target
  (`spec/run.md#biomes`). The first three are authored (`content/`).
- Each settles before its authoring slice; placeholder rosters are fine until then. It is the
  largest content-authoring task in the project.
- The biome order is an onboarding ramp in interaction *scope* (`spec/run.md#the-onboarding-ramp`), so authoring the roster is also an ordering-by-comprehension task, not only a
  which-creatures task.
