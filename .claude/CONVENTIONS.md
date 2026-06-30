# Depths of Souls — Conventions

Engineering rules for this project. The *what* lives in `GAME_DESIGN.md`; this is the *how*.
These exist mostly to keep AI-generated code consistent as the codebase grows.

## TypeScript

- `strict: true`. No implicit `any`. Prefer `unknown` + narrowing over `any`.
- Model game concepts as explicit types/discriminated unions. A `Trait`, an `Action`, a
  `Condition` should each be a union with a `kind`/`type` discriminant so the engine can
  `switch` exhaustively. Use a `never` default case to force handling new variants.
- IDs are branded string types (`type CreatureId = string & { __brand: 'CreatureId' }`) or
  at least named aliases — don't pass bare strings around.
- No magic numbers in logic. Balance constants live in `data/` or a `config` module.

## Engine purity (the load-bearing rule)

`src/engine/**` must be pure and deterministic:

- **No** `import React`, no DOM, no `window`, no `localStorage`.
- **No** `Math.random()` — take a seeded RNG instance as input. One PRNG (e.g. mulberry32 /
  a small xorshift) seeded per floor/combat; thread it through, don't reach for a global.
- **No** `Date.now()` / `performance.now()` in logic — if time matters, pass a tick count.
- Functions take state in, return new state (or events) out. Avoid hidden mutation; if you
  mutate for performance, do it on a local working copy, never on shared store state.
- Combat resolution must be reproducible from `(partySnapshot, scripts, seed)`. This enables
  replays, fast-forward, and reliable tests. Treat any nondeterminism as a bug.

## Combat & scripting

- The resolver is a pure function: `resolveTurn(state) -> { state, events }`. Emit an event
  log (typed events) describing what happened; the UI renders from events, not by peeking
  into resolver internals.
- Combat is **6v6** (party size 1–6 supported for early game). **One round = every living
  creature acts once**, in Speed order (descending), recomputed each round; ties broken
  deterministically (side → slot → id; **player side wins ties**). No multi-actions in v1. A
  fight-level **round cap** (config) is a hard backstop — every fight must terminate; reaching
  it ends the fight as a timeout/draw.
- **Damage formula** (Attack and Cast both):
  `damage = (MAX(OffStat − Defence, 0) + 0.01 × OffStat) × Affinity × Modifiers`, where
  OffStat = Attack or Intelligence. Subtractive core clamped at 0; +1% chip floor (of OffStat);
  **Affinity is its own multiplicative term** (×1.25 / ×0.75 / ×1.0), kept *separate* from the
  Modifiers stack so it compounds multiplicatively. **No "Additional" channel, no damage
  variance, no baseline crits** (crit is a trait-granted Modifier). Fully deterministic.
- The starting action set is **Attack, Cast, Defend, Provoke, Wait** (discriminated union;
  design it to grow). Spells (Cast) have **no cost, freely castable**; scripts pick the gem slot.
  - **Defend**: Defence ×1.5 inside the subtractive core **and** ×0.65 in Modifiers, until the
    creature's next turn.
  - **Provoke**: marks the creature provoking until its next turn.
- **Affinity advantage** (Body > Spirit > Mind > Void > Primal > Body) is data-driven; the
  resolver looks the multiplier up (store ±25% as config constants), it does not branch per pair.
- **DoT damage** does **not** use the damage formula — it carries its own value from the source
  and **bypasses Defence**.
- **Provoke targeting**: offensive actions (Attack/Cast) against the enemy side must target a
  **random provoking enemy** if any enemy is provoking, else the script's selector. "Random"
  **must** draw from the seeded combat RNG (never `Math.random()`). Implement provoke as a
  **target-set override applied after** the script picks an action: it narrows targets, it does
  not change the chosen action. Ally-targeting actions are exempt. **AOE actions (hit-all-
  enemies) are also exempt** — provoke only narrows single-target selection, never an AOE's
  full target set.
- The scripting interpreter evaluates a creature's ordered rules and returns a chosen `Action`.
  **One condition per rule in v1** (no AND/OR); rule **ordering carries the logic** (first valid
  match wins), so reorder UI and "which rule fired" feedback are load-bearing. Conditions,
  selectors, and actions are data-defined and interpreted — never hard-coded per creature.
  Implicit fallback: Attack a default target if valid, else Wait. Rule count per template and
  template count overall are **unbounded**. The `TARGETING` field is only present/applicable
  for actions that select among multiple targets (Attack, single-target Cast) — omit it for
  self-only actions (Defend, Provoke, Wait) and AOE Cast. A `"has status X"` condition matches a
  literal status ID, not a category.
- **Scripts are reusable templates** referenced by creatures (many may share one). The
  interpreter resolves a creature's assigned template each turn.
- Manual mode swaps the *action source* (UI input) for the same resolver. Do not fork the
  combat code path.

## Unified effect framework (load-bearing invariant)

**Traits, status effects, gem augments, and artifact infusions are all instances of ONE
data-driven, hook-based effect model.** Do not build them as separate subsystems — they share
the same interpreter, differing only in how they attach and which hooks they use.

- An effect declares: `kind`, `magnitude`, `duration` (where applicable), `stackingRule`,
  `hooks[]` (on-apply, start-of-turn, end-of-turn, on-the-creature's-turn, on-damage-taken,
  on-damage-dealt, on-expiry, …), and `effects[]` (modify stat, deal DoT, force an action like
  auto-Provoke, apply a sub-status, buff the Modifiers channel, …).
- New content = a data entry. Genuinely novel behavior = at most one new reusable hook
  primitive, then reused. Never special-case an individual trait/status in the resolver. The 8
  v1 stat buff/debuff statuses (Attack/Defence/Intelligence/Speed × buff/debuff) are all **data
  instances of one generic stat-modifier primitive** (`stat`, `direction`, `magnitude`,
  `duration`) — never one hardcoded effect kind per stat.
- **Loop safety (engine invariant)**: an effect/trigger **cannot re-enter its own resolution
  chain** (prevents true infinite loops). A named config constant `MAX_TRIGGER_CASCADE_DEPTH`
  (**default 500**, order of hundreds–1000) caps *chain depth* (not trigger breadth) as a
  backstop for exotic multi-effect cycles. Breadth is effectively unlimited — many distinct
  triggers firing once each is fully supported. Truncation is **deterministic**.
- Statuses: fixed turn duration; stacking refreshes duration **and** stacks intensity to a cap
  **that each status declares explicitly — there is no shared global default**. **DoT carries
  its own damage value and bypasses Defence** (not the damage formula). Tempo effects (e.g.
  Stun) are checked when the affected creature's turn comes up.

## Data-driven content

- Creatures, **species templates**, traits, spells/**gems**, **artifacts**, **statuses**,
  biomes, facilities, **specializations/perks**, and scaling curves are data in `src/data/`,
  validated by types (consider `zod` at load boundaries).
- **Three-tier model**: **species** = a grouping of creatures (data: thematic identity + the
  set of creatures it contains; used by biome spawn tables; intra-species traits synergize by
  design). **Creature** = the specific unit (data: parent species, affinity, fixed base stats in
  10–30, innate trait, sprite, rarity — v1 ships **3 rarity tiers: Common, Uncommon, Rare**,
  designed to expand later). **Instance** (in save) = an owned copy: references a creature +
  level/XP (**uncapped**), current affinity, trait slots (1 or 2), equipped gems (≤3) +
  artifact (1), `hasFused`. Base stats are **fixed per creature** (no per-instance rolls in v1).
  Affinity lives on the creature/instance; one species spans multiple affinities. Duplicate
  creatures may occupy multiple party slots simultaneously; an in-fight death has no
  consequence beyond that one fight.
- A creature keeps **identity** (species + sprite/name) and **affinity** as separate fields, so
  fusion is a clean field-level recombination (species-agnostic): **identity from
  identityParent, affinity from affinityParent, base stats = per-stat average of both parents,
  both innate traits**; result is level 1; both inputs consumed; result is itself fusion-locked
  (`hasFused`). **Fusing two instances of the identical creature is disallowed.** There is no
  level/state prerequisite otherwise. Equipped gems **and artifact** unequip back to inventory
  before the inputs are consumed. A fusion result has **no rarity** (rarity only applies to
  spawnable/collectible static creatures). (There is **no "class"** concept — affinity is the
  only such axis.)
- **Fused creatures are stored as a recipe, derived on load** — the instance saves
  `{ identityParent: creatureId, affinityParent: creatureId }` (two static creature IDs), and
  the engine recomputes identity/affinity/averaged-stats/both-traits from static data each load.
  Valid because fuse-once means a parent is never itself a fusion, and fusion reads only static
  per-creature data. **Accepted consequence**: rebalancing a base creature retroactively changes
  existing fusions derived from it. Do **not** store computed fusion results.
- **Stat growth is linear and derived from base stats — there is NO growth-rate field.**
  Level-N stat = `base × (1 + 0.25 × (level − 1))`. Incremental power comes from the
  **Modifiers channel** (traits/augments/infusions/perks/fusion/facility upgrades), not levels.
- **Gems**: `{ spell, level, augments[] }`; level (**bounded, fixed max, raised by Gem Forge
  tiers**) → augment-slot count (**small fixed max, 3–5**; not damage); leveled via
  **Essence**, free/instant to equip. **Artifacts**: parallel shape (level bounded similarly,
  raised by Artifact Forge tiers; → infusion-slot count, same 3–5 ceiling; leveled via **Ore**),
  stat-focused; few fixed base-types (stat-flavor variants for the single artifact slot, not
  equipment categories). Augments and infusions are **effect-framework objects** (above).
- **Souls**: tracked **per creature** (not per species); 100% = permanent summon unlock; caps
  at 100%; bosses grant none. Soul-gain per kill is a **flat % fixed per rarity tier** (no
  variance); banked the instant the kill happens, regardless of the fight's eventual outcome.
  There is no way to target/bias which specific creature spawns beyond choosing a biome — within
  a biome it's pure rarity-weighted RNG.
- **Currencies** (config-tuned): Essence (gems), Ore (artifacts), Bricks (facilities, rarer),
  Lifeforce (fusion + catch-up leveling), perk points (specs; non-dropped, first-boss-only,
  1000 = one maxed spec [flat list, some perks leveled], refund-on-swap, free/unlimited swap).
  All combat-dropped except perk points; all currencies are **unbounded** (no storage cap).
- **Biomes** are data (name, theme, **species spawn pool**, scaling tweaks, visuals); a floor
  picks a species from the pool, then a specific creature by **rarity-weighted seeded RNG**.
  Biome changes **every 10 floors** (10 in v1) — keep cadence/count as config constants. Floors
  1–100 use the fixed sequence; floor 101+ draws a biome by **seeded RNG** unless pinned via the
  Biome Atlas (pinning may retroactively override a visited floor). v1 content target: **>3
  species/biome, >6 creatures/species** (~180+ creatures total). **Bosses** every 10th floor are
  unique, non-collectable. Track **deepest-reached floor** as state (fast-travel up to it).
  **HP resets every fight**; on wipe, return to hub (no loss).
- **Difficulty/depth model**: each floor maps to an **enemy level range** (not a separate stat
  multiplier) — enemies are ordinary creature instances at that level, using the same linear
  growth formula as player creatures. Enemy level grows **faster than floor number**; range
  **width widens with depth**. A floor contains a **variable, depth-scaled number of fights**.
  Recipe drops (gem/augment/infusion) come from a **global depth-scaled table**, independent of
  which creature died.
- **Facilities**: all facility actions (craft, infuse, fuse, summon) resolve **instantly** on
  payment — no real-time timers/queues, consistent with engine purity's no-wall-clock rule.
  Only **Gem Forge, Artifact Forge, Fusion Chamber** have upgrade tiers (tier counts differ per
  facility); v1 tiers **raise the level cap** craftable/fuseable there. Soul Altar,
  Storage/Vault, and Biome Atlas are **one-time builds** with no tiers.
- Specializations are **data** (named perk collections); perks plug into the effect framework +
  meta-economy hooks. Each starter spec defines a **starter creature**.
- Scaling/balance is config: depth curves (the master difficulty lever), XP/growth, drop rates,
  craft/upgrade costs, status magnitudes — all tunable without engine edits.

## State & persistence

- One store (Zustand recommended). UI subscribes; engine does not depend on the store.
- **Saves are large** — assume big rosters, large inventories, many script templates.
  **IndexedDB is the primary store** (via `idb`/Dexie); `localStorage` holds only tiny things
  (settings, a last-save pointer), never the main save.
- **Save = instances + references only**, never copies of static game data. Instances reference
  creatures/species by ID and read base stats/affinity/traits from shipped data. Fused
  instances store the **recipe** `{ identityParent, affinityParent }`, derived on load (above).
- **Partition by logical record**: `meta`, `collection`, `inventory`, `facilities`, `scripts`,
  so a small change rewrites only the relevant record. **Do not pre-optimize** to per-creature
  records — only split `collection` finer if it becomes a **measured** write bottleneck on very
  large rosters (a documented future trigger, not a v1 task). If a partition is missing/fails to
  parse on load, **reset just that partition to default and warn the player** — never fail the
  whole load over one bad partition.
- **Saves are versioned.** Shape: `{ version: number, data: SaveDataVX }` — **one global version
  number governs the whole save** (not per-partition), even though storage is partitioned. On
  load, run pure migrations `v(n) -> v(n+1)` in sequence up to current. Never load an
  unversioned blob.
- **Autosave** on meaningful events (fight resolved, craft, fusion, descend, perk spent),
  **debounced**, plus on tab-close/visibility-change. A fight is **atomic** — never save
  mid-fight; resolve then save. Never block the game loop on a save.
- **Single save slot** in v1. Provide **export** (compressed at the export boundary only, e.g.
  native `CompressionStream`; IndexedDB records themselves stay uncompressed), **import**
  (decompress + migrate), and **delete save**.

## Testing

- The engine is pure -> unit-test it. Cover: turn order, a few trait interactions, script
  rule precedence, determinism (same seed -> identical event log), the round-cap safety
  backstop, and save migrations.
- Prefer table-driven tests for trait/condition/action primitives.
- A "golden replay" test (fixed party + scripts + seed -> expected event log) catches
  accidental nondeterminism and balance drift early.

## Project layout

```
src/
  engine/    pure TS, no React. resolver, interpreter, rng, scaling.
  data/      content as data: creatures, traits, spells, biomes, facilities, config.
  state/     store, save/load, migrations.
  ui/        React components; render state, dispatch intents.
  app/       wiring, game loop, routing.
```

## Style

- Small modules, named exports, colocate types with their domain.
- Comment *why*, not *what*. The types say what.
- When an open design question (GAME_DESIGN §13) forces a choice, code to an interface and
  leave a `// ASSUMPTION:` note rather than silently deciding.
