# Depths of Souls — Roadmap

Build order, designed so each phase produces something runnable and the risky core (the
pure, deterministic engine) comes first. Don't build content systems before the engine
skeleton exists.

## Phase 0 — Skeleton
- Vite + React + TypeScript (strict) project. ESLint/Prettier. One test runner (Vitest).
- Folder layout from CONVENTIONS. Empty `engine/`, `data/`, `state/`, `ui/`, `app/`.
- Seeded RNG utility in `engine/` with a determinism test.
- Pick and wire the store (Zustand). A trivial "tick increments a counter" loop on screen.

## Phase 1 — Combat engine (pure, no scripting yet)
- Core types: `Creature` (stats: Health, Attack, Intelligence, Defence, Speed; one of five
  affinities), `Action`, `CombatState`, typed `CombatEvent`.
- Support **6v6** (and any party size 1–6). Turn order by Speed with deterministic tie-break
  (ties: player side first → slot → id).
- Affinity-advantage lookup (Body > Spirit > Mind > Void > Primal > Body) as data.
- A fight-level **round cap** (config) as a determinism backstop — fight resolution must always
  terminate, even given a pathological script.
- `resolveTurn(state) -> { state, events }` with only the **Attack** action at first.
- Run a fixed small fight to completion from a seed; assert a golden event log. **This is the
  proof the architecture works — get it green before moving on.**

## Phase 2 — Actions, spells & scripting interpreter
- Flesh out the action set: **Attack, Cast, Defend, Provoke, Wait**. Spells (Cast) are data
  with **no cost and freely castable**, and carry a **target shape** (single-target or
  AOE/all-enemies); wire basic spell effects + creature known-spell lists.
- Implement **Provoke** as a target-set override: **single-target** offensive actions hit a
  random provoking enemy (seeded RNG) when any enemy provokes, else the script's selector;
  **AOE casts ignore provoke** and always hit their full target set.
- Data shapes for `Condition`, `TargetSelector`, `Action`, and a `Rule` (priority + condition
  + action + targeting, where targeting is omitted for self-only/AOE actions). A `Script` is an
  ordered list of rules, authored as a **template**, unbounded in rule count.
- Interpreter: given a creature + its assigned template + state, pick the first valid
  matching rule's action; else default (Attack, else Wait).
- Start tiny: conditions (self HP%, enemy HP%, turn number, affinity advantage), targets
  (lowest-HP enemy, highest-Attack enemy, self, ally), actions (the five above).
- Tests for rule precedence, Provoke targeting, and fallback. Verify scripted combat is
  still deterministic.

## Phase 3 — Traits as data
- `Trait` data model: triggers + effects, interpreted by the engine.
- A handful of traits exercising each v1 category (**passive stat, triggered** — behavioral
  traits are deferred past v1 per GAME_DESIGN §6).
- Implement the loop-safety backstop (`MAX_TRIGGER_CASCADE_DEPTH = 500`) and self-re-entry
  prevention from the start, even with few traits — cheap to add now, hard to retrofit.
- Hook trait effects into the resolver via the event system, not special cases.

## Phase 4 — Party, specializations, the cave & biomes
- Full **6v6** party vs a floor's creatures; **floor-by-floor descent** with **persistent
  depth** (no run reset; a wipe returns the party to the entrance hub and keeps all progress).
- **Biomes** as data (species spawn pool per biome; specific creature picked by rarity-weighted RNG within a species). Biome
  changes **every 10 floors** (10 biomes in v1; >3 species/biome, >6 creatures/species).
  Discover biomes by descending; placeholder roster is fine. Floor 101+ draws a biome by seeded
  RNG unless pinned via the Biome Atlas.
- **Fast-travel**: track deepest-reached floor; on wipe return to hub; let the player jump to
  any floor up to their deepest.
- Player **specializations** (Sorcerer, Brute, Shieldbarer) as data with tunable bonuses.
- Creature **XP/leveling** (the only creature-progression currency; **uncapped**).
- Data-driven enemy generation and a **floor→enemy-level-range curve** (config, not literals) —
  enemies are ordinary creature instances at that level, not a separately-scaled stat block.

## Phase 5 — Persistence (large saves)
- Versioned save/load with **IndexedDB as the primary store** (saves are large);
  `localStorage` only for settings. One migration scaffold even if trivial. One global version
  number governs the whole save.
- Partitioned writes for big collections (creatures, templates), not one blob per save. A
  missing/corrupt partition resets to default + warns, rather than failing the whole load.
- Export/import to file, **compressed at the export/import boundary only** (e.g. native
  `CompressionStream`); IndexedDB records stay uncompressed. Autosave on debounce, never
  blocking the game loop.

## Phase 6 — Scripting UI
- The block/dropdown rule editor (no free text). Author **script templates** and assign a
  template to each creature (one template can be shared by many).
- Reorder rules (drag), live-preview validity.

## Phase 7 — Combat UI & feedback
- Render combat from the event log: turn-by-turn playback, fast-forward, speed control.
- Clear "why did this happen" surfacing (which rule fired) — core to the design pillar of
  legibility.

## Phase 8 — Progression & incremental layers
- **Facilities**: entrance-hub structures (Gem Forge, Artifact Forge, Fusion Chamber, Soul
  Altar, Storage/Vault, Biome Atlas) as data; all actions resolve instantly (no timers). Only
  Gem Forge/Artifact Forge/Fusion Chamber have upgrade tiers (v1: cap-raising only); the rest
  are one-time builds. Includes the Biome Atlas, unlocked once all biomes are discovered.
- **Fusion**: once per creature (track `hasFused`); result takes identity from parent-1 creature,
  affinity from parent 2, averaged base stats, both innate traits; species-agnostic (but not
  self-fusable); player picks fusion order.
- Further unlocks and artifact variety. **No prestige, no resets** — progression is
  forward-only. (Masteries were considered and dropped from scope.)
- This is where the long-term game lives; only meaningful once 1–7 are solid.

## Phase 9 — Manual mode
- Toggle that feeds UI-chosen actions into the *same* resolver. No forked combat path.

## Phase 10 — Polish & deploy
- Static build, deploy to chosen host, save-compatibility check, balance pass via config.

---

### Guidance for AI-assisted work
- Resolve the relevant GAME_DESIGN §13 open question *before* building a phase that depends
  on it — currently just the **biome roster** (settle it before Phase 4 content). Placeholder
  rosters are fine until then; the facility list itself is already decided (§4), only its exact
  tier costs/counts remain parked balance numbers.
- Keep PRs/changes phase-scoped. Don't build Phase 8 economy on a Phase 1 engine that lacks
  tests.
- Every engine change ships with or updates a test. The golden-replay test is the canary.
