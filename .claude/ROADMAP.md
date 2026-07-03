# Depths of Souls — Roadmap

Build order, designed so each phase produces something runnable and the risky core (the
pure, deterministic engine) comes first. Don't build content systems before the engine
skeleton exists.

## Phase 0 — Skeleton
- Vite + React + TypeScript (strict) project. ESLint/Prettier. One test runner (Vitest).
- Folder layout from CONVENTIONS. Empty `engine/`, `data/`, `state/`, `ui/`, `app/`.
- Seeded RNG utility in `engine/` with a determinism test.
- Pick and wire the store (Zustand). A trivial "tick increments a counter" loop on screen.

## Phase 0.5 — Deploy checkpoint (GitHub Pages, do this early)
Deploy the Phase 0 skeleton to GitHub Pages **now**, before Phase 1. Rationale: same philosophy
as the golden test — prove the *deployment pipeline* against the simplest possible artifact, so
every later phase inherits a known-good deploy instead of discovering hosting problems at the end.
The Phase 0 tick-counter page is already renderable; if it shows up live, the whole pipeline (base
path, CI build, Pages serving, asset loading) is proven end-to-end.
- **Set `base` in `vite.config.ts`** to the repo path: `base: '/Depths-of-Souls/'`. This is the
  one true gotcha — a **project** Pages site serves from `https://thedutchspoon.github.io/
  Depths-of-Souls/` (a subpath), and Vite defaults to root `/`, so without this the JS bundle
  404s and you get a blank page. (Only a user/org site at the domain root could skip this.)
- **GitHub Actions workflow** that runs on push to `main`: `npm ci` → `eslint`/`vitest run`
  (let the tests gate the deploy, per the canary philosophy) → `npm run build` → publish `dist/`
  to Pages. Enable Pages in repo settings pointed at the Actions deployment.
- **Verify live**: the tick counter renders and increments at the Pages URL. That's the whole
  acceptance test for this checkpoint.
- **No SPA-router rewrite exists on Pages** — deep-link refreshes 404. Not an issue now (single
  page, no router). If a router is ever added, use **hash routing** (`/#/...`) to sidestep it, or
  add a `404.html` fallback. Note it and move on.
- From here, every phase is continuously deployed: merging to `main` re-runs tests and republishes,
  so "does it work hosted" is answered on every push, not deferred to Phase 10.
- **Environments** (see CONVENTIONS → Deployment): `main` → production URL; each PR → an ephemeral
  **preview** deploy, torn down on close. Drive per-environment differences (base path, IndexedDB
  name, debug flags) off a single **Vite mode**. **Namespace IndexedDB per environment**
  (`depths-of-souls` prod / `depths-of-souls-dev`) from the start — prod and dev share an origin, so a shared DB name would
  let a dev build corrupt a real save. (No save code exists until Phase 5, but fix the DB-naming
  convention now.)

## Phase 1 — Combat engine (pure, no scripting yet)
*Design detail lives in GAME_DESIGN §6–§7 and CONVENTIONS (combat rules + effect framework).*
- Core types: `Creature` (stats: Health, Attack, Intelligence, Defence, Speed; one of five
  affinities; `id`/`side`/`slot`/`currentHp`/`alive`), `Action` (union; **Attack only** this
  phase), `CombatState` (holds the **RNG state** + frozen round queue), typed `CombatEvent`.
- Support **6v6** (and any party size 1–6). **Frozen round-start queue** by effective Speed; ties:
  **player side → slot → id**; never recompute mid-round.
- All stat reads via **`getEffectiveStat`** (passthrough to base now); OffStat via a **remap-aware
  lookup** seam. Base stats immutable.
- Damage formula with **two pools** (dealt additive, taken multiplicative), standalone affinity,
  unconditional chip floor, **integer `MAX(1, floor(raw))`**. Pools empty ⇒ 1.0 in Phase 1, but
  wire them in.
- **Phase-point hook seams** (fight/round/turn start-end), all no-ops now; **no** `resolveRound`.
- Three-value result (`win`/`loss`/`draw`); **round cap** (config) backstop; win/loss checked after
  every action; dead creatures flagged not removed; rewards bank per kill.
- Resolver API: `createCombat` factory (guards empty parties) + `resolveTurn` stepper +
  `resolveFight` wrapper. Attack default target = **first living enemy by slot**.
- **Event log**: intent events (per-action union, always emitted) + shared consequence events
  (`DamageDealt` w/ full breakdown, `CreatureDied`) + lifecycle (`FightStarted`, `RoundStarted`,
  **`TurnStarted`/`TurnEnded`**, `FightEnded` — turn boundaries are real events, not just internal
  hook checkpoints, so playback has an explicit boundary even for no-op turns); flat array;
  narration not event-sourcing.
- **Golden-replay suite**: a small set of fixed fights (1v1, 6v6, affinity matchup, stomp),
  full-event-log deep-equal vs committed fixtures; grows each later phase. **Get it green before
  Phase 2 — it's the proof the architecture holds.**

## Phase 1.5 — Tooling + engine demo harness (interlude)
Two independent, non-blocking deliverables, done now while the engine is fresh and the tree is
small: **Dependabot** (npm + github-actions ecosystems, weekly, grouped minor/patch, separate
major, no auto-merge) and a **throwaway engine demo harness** replacing the Phase 0 tick counter
on the live Pages site — a button that runs `createCombat`/`resolveFight` on a hardcoded fight
and renders the real event log, proving deployed engine code actually works. Explicitly guarded
against scope creep into Phase 7's real combat UI, and against leaking any React/DOM dependency
into `src/engine/`. Full brief: `.claude/briefs/phase-1.5-tooling-and-demo.md`.

## Phase 2 — Actions, spells & scripting interpreter
- Flesh out the action set: **Attack, Cast, Defend, Provoke, Wait**. Spells (Cast) are data
  with **no cost and freely castable**, carry a **target shape** (single / all-enemies) and a
  **spellPower** coefficient (scales OffStat pre-Defence; Attack = 1.0). A rule's Cast references a
  **gem slot index** (not a spell ID); minimal `Spell` shape only — forge/augment/leveling economy
  is Phase 8.
- Implement **Provoke** as a post-selection target override: **single-target** offensive actions
  hit a random provoking enemy (seeded RNG) when any enemy provokes, else the script's selector;
  **AOE casts ignore provoke** and hit their full (cast-start-frozen) set. AOE resolves fully, then
  win/loss is checked (win-check at the action boundary).
- Data shapes: `Condition` and `TargetSelector` are **discriminated unions**; `Rule` =
  `{ condition, action, targeting? }`; `Script` = `{ id, rules[], defaultTarget? }` (ordering =
  array position, no priority int; `defaultTarget?` reserved for Phase 6). Creature refs a script by
  **`scriptId`**. Add an **`always`** condition. HP% compared via **integer cross-multiplication**
  (denominator = effective Health), no float.
- Interpreter (**pure engine**, fills the `decideAction` seam): side-effect-free lookahead, first
  rule whose condition is true **and** action is valid wins (invalid → skip); else implicit fallback
  (Attack, else Wait). **Symmetric** — enemies run the same system via five **stock scripts** in
  `data/` (`always-attack`/`-cast`/`-defend`/`-provoke`/`-wait`).
- New intent event **`SpellCast`**; reuse shared `DamageDealt`/`CreatureDied`.
- Tests: unit (conditions at boundaries, selectors + tie-break, precedence, skip-on-invalid,
  fallback); focused **hand-derived** goldens (scripted 1v1, AOE cast, provoke redirect, random
  selector, skip-on-invalid); one **6v6 integration golden** (mixed stock scripts both sides, all
  action types + AOE + a provoke redirect, checkpoint-verified + labeled); an RNG-dependent golden.
  Phase 1 goldens stay stable. Verify scripted combat is deterministic.

## Phase 2.5 — Scripted combat demo (interlude)
*Brief: `.claude/briefs/phase-2.5-scripted-demo.md`.* Throwaway visual harness (successor to the
Phase 1.5 demo) showing both sides run scripts through the interpreter live on Pages. Same
guardrails: consumes the engine, engine stays pure, real content not fixtures, explicitly replaced
by Phase 7. Separate PR after Phase 2.

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
- The Pages deploy pipeline already exists (Phase 0.5) and has been live since the skeleton — this
  phase is the **production hardening pass**, not a first deploy: final balance pass via config,
  save-compatibility check across a version migration, asset/bundle-size optimization, a custom
  domain if wanted, and confirming IndexedDB persistence + save export/import behave on the live
  origin (per-browser saves; export-to-file is the cross-device/eviction backstop).

---

### Guidance for AI-assisted work
- Resolve the relevant GAME_DESIGN §13 open question *before* building a phase that depends
  on it — currently just the **biome roster** (settle it before Phase 4 content). Placeholder
  rosters are fine until then; the facility list itself is already decided (§4), only its exact
  tier costs/counts remain parked balance numbers.
- Keep PRs/changes phase-scoped. Don't build Phase 8 economy on a Phase 1 engine that lacks
  tests.
- Every engine change ships with or updates a test. The golden-replay test is the canary.
