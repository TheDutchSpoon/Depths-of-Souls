# Depths of Souls — Roadmap

Build order, designed so each phase produces something runnable and the risky core (the
pure, deterministic engine) comes first. Don't build content systems before the engine
skeleton exists.

Phases 0–10 together produce the **start-of-beta build** — the game's state when beta opens,
not a feature-complete release (see GAME_DESIGN §1, *Scope note*). Beta is the live-content
period after: biomes 11+, deeper species rosters, and post-floor-100 endgame ship then.
**"v1" in these docs = this start-of-beta baseline.**

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
  is Phase 8. **Requires extending the Phase 1 `Creature` type** with
  `equippedSpells: readonly (Spell | null)[]` (bare slots, no Gem wrapper; ~3 slots as a
  variable-length array) — a change to a type other modules depend on, not just new code.
- Implement **Provoke** as a post-selection target override: **single-target** offensive actions
  hit a random provoking enemy (seeded RNG) when any enemy provokes, else the script's selector;
  **AOE casts ignore provoke** and hit their full (cast-start-frozen) set. AOE resolves fully, then
  win/loss is checked (win-check at the action boundary). (No standalone "provoking-enemy" selector —
  dropped as vestigial, since the override already handles it; see GAME_DESIGN §8.)
- Data shapes: `Condition` and `TargetSelector` are **discriminated unions**; `Rule` =
  `{ condition, action, targeting? }`; `Script` = `{ id, rules[], defaultTarget? }` (ordering =
  array position, no priority int; `defaultTarget?` reserved for Phase 6). Creature refs a script by
  **`scriptId`**. Add an **`always`** condition. HP% compared via **integer cross-multiplication**
  (denominator = effective Health), no float. **Condition scope this phase: the testable subset only**
  (`always`, HP%, enemy/ally counts, turn/round, affinity-advantage, is-provoking); **`has-status`
  is deferred to Phase 3** (no status producer exists yet — the union grows then).
- Interpreter (**pure engine**, fills the `decideAction` seam): side-effect-free lookahead, first
  rule whose condition is true **and** action is valid wins (invalid → skip); else implicit fallback
  (Attack, else Wait). **Validity = existence check, not resolution**: a `random-enemy` selector is
  valid iff ≥1 living enemy exists; the RNG draw happens **once, at execution, for the winning rule
  only** (non-winning rules must not consume RNG, or outcomes depend on incidental script structure).
  **Symmetric** — enemies run the same system via five **stock scripts** in `data/`
  (`always-attack`/`-cast`/`-defend`/`-provoke`/`-wait`).
- New intent event **`SpellCast`**; reuse shared `DamageDealt`/`CreatureDied`.
- Tests: unit (conditions at boundaries, selectors + tie-break, precedence, skip-on-invalid,
  fallback); focused **hand-derived** goldens (scripted 1v1, AOE cast, provoke redirect, random
  selector, skip-on-invalid); one **6v6 integration golden** (mixed stock scripts both sides, all
  action types + AOE + a provoke redirect, checkpoint-verified + labeled); plus a distinct
  **seed-sensitivity golden** (same script + party under two different seeds → the two logs differ,
  each stable — proves the RNG is threaded end-to-end, not just that one mechanism works once).
  Phase 1 goldens stay stable. Verify scripted combat is deterministic.

## Phase 2.5 — Scripted combat demo (interlude)
*Brief: `.claude/briefs/phase-2.5-scripted-demo.md`.* Throwaway visual harness (successor to the
Phase 1.5 demo) showing both sides run scripts through the interpreter live on Pages. Same
guardrails: consumes the engine, engine stays pure, real content not fixtures, explicitly replaced
by Phase 7. Separate PR after Phase 2.

## Phase 3 — Traits, statuses & the effect framework (activate the dormant seams)
- **Hook execution model**: scoped iteration (per-creature at per-creature points; all creatures in
  tie-break order at global points) behind an **`effectsForHook`** lookup (index deferred). Hooks
  reuse action machinery + shared consequence events; a **`TriggerFired`** intent event precedes
  triggered consequences. One shared per-creature effect ordering (innate → infusions → statuses).
- **v1 hook vocabulary (13)**: fight-start, turn-start, turn-end, round-end, damage-dealt,
  damage-taken, kill, death, ally-action, enemy-action, ally-death, enemy-death, status-applied.
  Additive/golden-safe to expand.
- **Loop safety** (build now, cheap now / hard to retrofit): instance-level stack-scoped
  self-re-entry guard; `MAX_TRIGGER_CASCADE_DEPTH = 500` (chain depth, not breadth); deterministic
  truncation + a **mandatory `CascadeTruncated`** event; depth transient (never in `CombatState`).
- **Trait model**: `Trait { id, name, effects[] }`; passive/stat (incl. **conditional passives via
  read-time predicate**) + triggered (`{hook, condition?, response}`). Response vocab (parameterized
  by target + magnitude): **deal-damage, apply-status, apply-stat-modifier, suppress-action**. **No
  keywords, explicit targets**; **"attack"/"cast" = the real actions** (DoT the lone bypass).
  Behavioral responses deferred. `Creature.innateTraitIds` (1 base / 2 fused) from a data registry.
- **Status lifecycle**: round-based countdown at round-end; **DoT tick = an on-round-end hook**,
  before decrement; **Stun = a condition-status** (turn-start suppress-action, skip via empty
  bracket); single-instance-per-type stacking to a declared cap; round-end order
  hooks→decrement→expire (`StatusExpired`). Full v1 status content (Poison, Burn, Regen, Stun, and
  timed damage-modifier statuses Weaken/Vulnerability — data instances of built primitives). Raw
  stat buffs/debuffs are **permanent-for-fight multiplicative `stat-modifier` effects, not statuses**
  (shown as the effective stat, uncapped, never-zero).
- **`has-status`** joins the Condition union (completes the Phase 2 deferral). **Spells gain optional
  status-application** so statuses are reachable via Cast.
- **Trait content is representative & temporary** — a handful of real-but-placeholder traits
  exercising each hook/response, treated as real content (data + tests) until the actual creature
  roster is designed (Phase 4+), then replaced.
- **Artifacts are NOT in this phase** — the artifact mechanism (slot, infusions, forge, Ore) is
  Phase 8; Phase 3 builds the effect framework they'll plug into.
- Tests: unit per response type, conditional-passive predicate, status stacking/duration/expiry,
  and **explicit loop-safety** (self-trigger blocked by re-entry guard; a >500 cascade asserts
  deterministic truncation + `CascadeTruncated`). New goldens: triggered-damage (+`TriggerFired`),
  DoT (round-end tick/countdown/expiry), stun (skip via empty bracket), conditional-passive
  (HP-threshold stat change), one loop-safety golden, and a **round-end interaction golden** (a DoT
  tick kills a creature mid-sweep whose `on-death` applies a status: assert `on-death` fires, the
  dead creature's own pending tick is skipped, the new status keeps full duration / starts next
  round, and win/loss is checked after the full sweep). Phase 1/2 goldens stay stable.

## Phase 3.5 — Traits & statuses demo (interlude)
*Brief: `.claude/briefs/phase-3.5-traits-statuses-demo.md`.* Throwaway visual demo (per the standing
"every phase ships a demo" convention) showing traits + statuses live: triggered effects firing, DoT
ticking, stun skipping a turn, `TriggerFired`/status events in the log. Adds the **baseline demo-UX**
inherited by all later `.5` demos — a **randomize-seed** button (+ seed shown) and **timed,
beat-paced playback** (with skip-to-end), both UI-only (the engine stays synchronous/pure/
deterministic). Same guardrails (consumes the engine, engine stays pure, real content, explicitly
replaced by Phase 7). Separate PR after Phase 3; own brief + phase record.

## Phase 4 — Party, specializations, the cave & biomes
Phase 4 is a **systems-plus-seed** milestone: build the party/cave/biome/spec/XP systems for the
**full 10-biome structure** (biome count, cadence, discovery, the floor→level-range curve, and the
perk economy all stay 10-calibrated), but author only the **first 3 biomes** of content. Those 3
are **real, fully-themed, in-game cave biomes** (floors 1–30, each with its own theme/species/
creatures as the player will see them) — "seed" means *first authored*, not placeholder. The
10-biome progression spine isn't *satisfied* until all 10 are authored across later phases; Phase 4
proves the systems against real content and demos the loop, it doesn't ship full beta content.
Ships in **multiple slices + a Phase 4.5 demo**. The systems spine is specified in
GAME_DESIGN/CONVENTIONS (locked via design grill); the **coding agent's implementation plan owns
the slice breakdown** (no separate Phase 4 brief).

- Full **6v6** party vs a floor's creatures; **floor-by-floor descent** with **persistent
  depth** (no run reset; a wipe returns the party to the entrance hub and keeps all progress).
- **Biomes** as data (species spawn pool per biome; specific creature picked by rarity-weighted RNG within a species). Biome
  changes **every 10 floors** (10 biomes in v1; ≥6 species/biome, ≥3 creatures/species).
  Discover biomes by descending. Phase 4 authors the **first 3 real, themed biomes** (floors
  1–30); biomes 4–10 stay placeholder/config-driven until their authoring slice. Floor 101+ draws
  a biome by seeded RNG unless pinned via the Biome Atlas.
- **Fast-travel**: track deepest-reached floor; on wipe return to hub; let the player jump to
  any floor up to their deepest.
- Player **specializations** (Sorcerer, Brute, Shieldbarer) as data with tunable bonuses.
- Creature **XP/leveling** (the only creature-progression currency; **uncapped**). *(Catch-up
  leveling is **Phase 8** — it needs the Fusion Chamber + Lifeforce; Phase 4 is combat-XP leveling
  only.)*
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
  on it — currently the **biome roster**: settle the **first 3 biomes** (names/themes, ≥6 species
  × ≥3 creatures, the 3 per-spec starter creatures, and a solo-clearable floor 1) before the Phase
  4 content slice; the remaining 7 biomes settle before each authoring slice. Placeholder rosters
  are fine for un-authored biomes; the facility list itself is already decided (§4), only its exact
  tier costs/counts remain parked balance numbers.
- **Content authoring rides as a slice within each content-bearing phase** (not as separate
  interlude phases): **3 biomes in Phase 4**, the remaining **7 tapering across later content
  phases** (Phase 6–9), landing on **exactly 10 biomes by end of Phase 10** (Phase 10 is hardening
  — no new content). Ten is load-bearing: 10 bosses × 100 = **1000 perk points = one maxed spec at
  floor 100**, so "progression and depth finish together" (§9). Over- or under-shooting 10 doesn't
  break anything — it just decouples the two milestones the design deliberately aligned. **Biomes
  11+ are beta content** — how beta extends progression past floor 100 (more specializations,
  further perks, or otherwise) is an open beta-time decision, deliberately not settled here.
- Keep PRs/changes phase-scoped. Don't build Phase 8 economy on a Phase 1 engine that lacks
  tests.
- Every engine change ships with or updates a test. The golden-replay test is the canary.
