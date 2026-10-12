# Depths of Souls — Conventions

Every chat reads this file: the engineering rules for every change.

How the code is written, tested and deployed. What the game does lives in `VISION.md` and `spec/`.

## TypeScript

### Strict types

- `strict: true`. No implicit `any`; prefer `unknown` and narrowing over `any`.

### Game concepts are discriminated unions

- A `Trait`, an `Action`, a `Condition` is each a union with a `kind`/`type` discriminant, so the
  engine can `switch` exhaustively. A `never` default case forces handling a new variant.

### Ids are branded

- Ids are branded string types (`type CreatureId = string & { __brand: 'CreatureId' }`), or at
  least named aliases: never bare strings.

### No magic numbers

- Balance constants live in `data/` or a config module, never as literals in logic ("Where each
  number lives").

## Engine purity

### The engine is pure and deterministic

- This is the load-bearing rule. `src/engine/**` is plain, framework-agnostic TypeScript; React
  only renders state and dispatches intents. That separation is what makes combat deterministic,
  testable and replayable.
- **No** `import React`, no DOM, no `window`, no `localStorage`.
- **No** `Math.random()`: take a seeded RNG as input. One PRNG (mulberry32), seeded per floor and
  per fight, threaded through, never a global.
- **No** `Date.now()` / `performance.now()` in logic: if time matters, pass a tick count.
- Functions take state in and return new state (or events) out. No hidden mutation: mutate for
  performance only on a local working copy, never on shared store state.

### Combat is reproducible from its inputs

- The same `(party, scripts, seed)` gives the same fight, always. That enables replays,
  fast-forward and reliable tests; any nondeterminism is a bug.

### CombatState is plain data, never modified after being returned

- Changes happen only on the per-turn **working copy** `resolveTurn` makes when it starts. The
  snapshot passed in is untouched, so the same snapshot resolved twice gives the same result
  (Phase 7 rewind and Phase 9 preview depend on it).
- The RNG is part of that plain data: the state holds a **bookmark** (`rng: { position: number }`,
  the mulberry32 stream position), and every roll goes through `nextRandom(rng)`, which advances
  the working copy's bookmark.
- No closures, functions, class instances or hidden state inside `CombatState`; a behaviour that
  needs a predicate is written as data.
- Don't make every roll return a new snapshot instead: the outward guarantee is the same, with a
  determinism risk at every future dice roll. Tests prove the rule ("Snapshots are never written
  to").

## Balance numbers

### Where each number lives

- **Combat rule constants** stay in **`engine/config.ts`**: the affinity ±25%, the chip floor, the
  Defend factors, `ROUND_CAP`, the cascade depth, `MAX_REVIVES_PER_CREATURE`.
- **Progression and economy numbers** live in an injected **`BalanceConfig`**: the engine defines
  its shape, `data/balance.ts` its values. It holds the level range (the multiplier curve), the
  fight count, the enemy party size, the boss level offset, the rarity spawn weights, the soul gain,
  the XP curve, XP per kill, currency drops and the summon cost (free: nothing reads it until
  Phase 8's Soul Altar names the currency it is paid in). What each number does is in its spec rule
  (`spec/run.md`, `spec/creatures.md`).
- **Curves are parameters, not functions** (`{ fightCountBase: 10, fightCountPerFloor: 1 }`, never
  a closure), so the config is plain data a simulator can sweep and a save can ignore.
- Generation and the store **receive the config as an argument**; tests pin their own config
  instead of inheriting tuning changes.

### Balance simulator

- A **deterministic**, permanent tool that drives the **real store** with a documented simple
  player policy over many seeds, and reports the design targets as **bands**, not hard rules:
  - **T1**: floor 1 cleared on ≥95% of seeds;
  - **T2**: a soul completed by each seed's first run on floor 3;
  - **T3**: a full party of 6 by its first run on floor 6, where enemies first field six;
  - **T4**: no hard wall before the floor-10 boss;
  - **T5**: the party's level tracks the floor (`spec/run.md#enemy-levels`).
  - T2 and T3 are ceilings (sooner is fine). They read a seed's first run on a floor, so the
    policy's farming doesn't move them, and they count floor runs, not clears: a kill banks soul
    whether the floor is won or lost.
- **A hard wall** (T4) is 5 failed pushes in a row at one floor; re-farm runs between them don't
  reset the count. With a re-farm after each failed push, that is about one session stuck on one
  floor. The simulator records the first wall and keeps going.
- **No band for round-cap draws**: the draw rate is reported, not targeted.
- The report also has a **floor 1–5 matchup table** (per enemy creature: fights, wins, losses and
  round-cap draws, per spec) and the **first-try clear rate per floor** (each seed's first run on
  that floor).
- **CI checks only loose "badly broken" thresholds**: first-try floor 1 ≥ 80%; the median floor
  runs to the first soul ≤ 30; some seed fights on floor 5 or deeper within its first 20 floor
  runs. A test in the normal suite asserts the three verdicts, never a value, over the full 40
  seeds per spec, capped at 30 floor runs with the boss probe off; the cap changes no verdict. The
  bands are reported and guide tuning passes.
- Balance needn't be perfect yet: Phase 6 player scripts and Phase 8 equipment will strengthen the
  starting team.

## Testing

### Three test tiers

- Test the pure engine heavily and the browser lightly: unit tests, golden replays and the corpus
  digest, with an end-to-end smoke test planned.

### Unit tests

- Vitest; small isolated units needing no DOM, async or mocks, because the engine is pure.
- Cover the *consequence-bearing* branches, not line count: the damage formula (core fully absorbed
  → chip floor only; affinity advantage, disadvantage, neutral; the `MAX(1, floor)` clamp; empty
  pools = ×1.0), the turn-order tie-break (player → slot → id), death-mid-round skipping, the
  round-cap → draw path, the empty-party guard, and determinism (same seed → identical event log).
- Prefer **table-driven tests** for the trait, condition and action primitives.

### Golden-replay tests

- The highest-leverage tier: a fixed `(party, scripts, seed)` run to completion, asserting the
  **full event log** deep-equal against a **committed fixture**. One golden covers turn order,
  damage, affinity, death and events in a single assertion.
- **Keep fixtures small** (tiny parties, few rounds) so a diff is human-readable. The suite grows
  every phase to exercise the new mechanics.

### Corpus digest

- A **behaviour tripwire, not a spec**: one test resolves a fixed corpus of real-content fights and
  compares each fight's event-log hash against a committed fixture, which is **generated** and
  labelled as such. Hand-derived goldens remain the definition of correct.
- **The corpus**: generated floors across every shipped biome, boss floors included, plus the
  shipped starters and the Unicorn, and appended coverage fights (appending never changes an
  existing digest entry). Bonus-cast, echo, Provoke and Confusion must all fire in it.
- **It covers all real content.** A test enforces these against the registries, so new content is
  covered or fails loudly:
  - every spell in `ALL_SPELLS` is cast with its effects landing: each effect's consequence event,
    from the caster, on the cast's target (or on the caster, for a `self` effect);
  - every status in `STATUS_REGISTRY` is applied, and every damage-modifier status is
    **exercised**: its bearer deals (a `dealt` modifier) or takes (a `taken` one) damage while it
    holds. An applied modifier that never meets a hit has a magnitude the digest can't see;
  - every specialization perk with effects **matters**: re-running its fight with only that perk
    removed changes the event log. Presence isn't enough: a perk whose trigger never happens, or
    that another perk masks, is invisible to the digest;
  - every corpus creature's equipped spells match its affinity (equip-gating), so the corpus holds
    only loadouts the game can produce. Innate spells are added at fight setup and aren't part of
    the input loadout.
- **Perk effect ids are positional** (`perk-N`, numbered across the side's effect list). A log
  comparison across different perk sets anonymises them, or removing one perk renumbers every later
  one and makes it look like it matters.
- Anything no shipped content can reach goes on the test's explicit **exemption list**, each entry
  with its reason. An exempt item that is covered fails the test, so the slice that makes it
  reachable drops the exemption.
- **Coverage never rides on one lucky seed**: a chance-based mechanism gets enough rolls in its
  fight that a change to the RNG draw order can't silently drop it. The PR shows this with a
  **seed sweep** over the coverage fights' combat seeds and reports the worst case the sweep saw,
  not the roll count at the committed seed.
- **Why it exists**: it answers "did any behaviour move?", which scenario goldens can't. A change
  that shows up only in combinations no golden pins passes them all.
- **Byte-identical PRs leave it unchanged. Deliberate-change PRs regenerate it**, only through its
  update command, and state how many corpus fights changed and which listed change accounts for
  them.
- **The committed fixture is exactly what `renderFixture` writes** for its own rows: header,
  interface, row layout and formatting. The default run checks it, so a hand edit, or a template
  change nobody regenerated from, fails.
- **Proof it covers a mechanism**: the PR that adds a mechanism to the corpus shows the digest
  failing with that mechanism disabled, the same bar as a discriminating golden.

### E2E smoke test

- None exists yet. When added (Playwright): does the app render and the loop run in a real browser.
  It is slower, so it runs on `main` / pre-deploy, not in the inner loop.

### Test environments

- Vitest `projects` split by folder: `src/engine`, `src/data` and `src/state` run in **Node**
  (which also enforces engine purity: DOM globals are undefined there); `src/ui` and `src/app` run
  in **jsdom**. Any other folder under `src/` runs in Node, so a new top-level folder's tests are
  collected without a config change. A third project, `docs-check`, runs the docs checks' own tests (`scripts/**`) in
  Node, apart from `src/`.

### Mechanism goldens vs content goldens

- Mechanism goldens stay on **stable test fixtures** (small, hand-derived, independent of content
  tuning); real content is covered by the per-biome goldens and the integration test.
- Placeholder content does not live in production registries.
  **Known bug:** the nine Phase-3 placeholder traits are still in game data. The fix is listed in
  `ROADMAP.md` Phase 4.5 "Decided, not built" ("Content clean-up").

### Tuning never changes a mechanism golden

- A golden whose subject is a **rule** is a mechanism golden. When it borrows a real status, spell,
  trait or creature, it pins every tuned number it reads in its own fixture (the real def with only
  that number held; for a creature, a base stat), so a tuning PR leaves its expected values
  byte-identical: that byte-identity is the PR's proof that only numbers moved. Only a number the
  golden reads is pinned; a borrowed number no event of the fight reads gets a header note, not a
  pin. The same holds for a **unit test** whose subject is a rule and which borrows real content.
- A golden whose subject is a **named content item** (a creature, trait or spell) is a content
  golden: it reads real data and is re-derived by hand when a tuning PR moves a number it reads.
- A tuning PR shows each effect number it changes (a status potency, a spell's power, a trait's
  magnitude) in a hand-derived content golden on real data, new or re-derived.
- Base stats are the exception: the data tests pin only their **ranges**, so an exact base stat is
  pinned by nothing but the corpus digest. A PR that changes base stats lists every one, old → new,
  in its report (from a script when it changes many), and the PR review checks the list against the
  data.

### A golden failure is a question, not a chore

- It means *either* a regression *or* an intended change: decide which *before* regenerating the
  fixture. Never reflexively "update snapshot"; that turns a regression detector into a rubber
  stamp.

### Goldens are layered and additive

- Golden fixtures are layered by capability and additive across phases: each phase keeps prior
  fixtures **stable** (they pin already-verified behaviour) and **adds** fixtures for the new
  capability. An old golden changes only when a feature *deliberately* changes that behaviour, as a
  conscious, reviewed decision (`WORKFLOWS.md#golden-policy-one-per-pr`).

### Comment-only golden edits are allowed

- A fixture's comments are its derivation, and a stale one misleads the next reader. Any PR may fix
  comments in an existing golden fixture, byte-identical policy included, provided **the diff
  changes no code token** (a trailing comment on a code line may change; the code on that line may
  not). The PR lists each such file, and `npm run docs:check -- comment-proof <base>` passes: both
  sides parse without a syntax error, with comments stripped the old and new file are identical, and
  every pragma keeps its text and place.
  Any change beyond comments falls under "Goldens are layered and additive".

### Two-tier golden discipline

- Small **focused** goldens are **hand-derived**: the expected log computed by hand, with the
  arithmetic and random draws in the fixture's comments.
- A large **integration** golden may be **generated-then-checkpoint-verified** (the load-bearing
  assertions hand-checked: turn order, event counts, key results), but it is **labelled in the
  fixture** as an integration/regression golden whose per-mechanism correctness rests on the
  focused goldens. Never pass off a generated log as hand-verified.

### A focused golden pins what it claims

- **No clamp hides the value it covers**: a heal golden whose heal overflows max HP pins the clamp,
  not the heal amount.
- **Every random draw or extremum it covers has at least two distinct candidates** whose picks lead
  to different logs: a one-spell caster pins nothing about the gem draw.
- The "fails with its mechanism removed" check is how a golden proves both.

### A mechanism at more than one site is tested at each site

- A mechanism built at more than one site needs a discriminating test at each site: a guard in both
  the attack and the single-target cast loop needs a test that fails without each.

### Characterize the empty seams

- Pin the current behaviour of the "no-op today, real later" seams: `getEffectiveStat` returns base
  with no effects; the mod pools yield ×1.0 when empty; the remap-aware OffStat lookup returns
  effective Attack with no remap; `spellPower` is 1.0 for Attack. When a later phase makes one real,
  the test states exactly what changed.

### Every failing fight is reproducible from its seed

- Combat is deterministic, so when a bug appears in play, capture the seed: it becomes a permanent
  regression fixture.

### Every engine change ships with a test

- Every engine change ships with or updates a test; the golden-replay suite is the canary. Prefer
  small, typed, tested units.

### Snapshots are never written to

- A **deep-freeze test helper** freezes an input snapshot recursively and makes any write to it
  crash. Engine tests that resolve the same snapshot more than once, or assert on an input after
  resolving, wrap it in the helper.

### Every golden replays through one shared runner

- The runner deep-freezes the state before **every** turn, so every golden also proves the engine
  never writes to its input. Each fixture exports what the runner needs to build its starting
  state, plus an optional driver for a golden that isn't simply "run N turns" or "run to the end"
  (for example a wound applied after `createCombat`). There is no separate frozen-replay sweep and
  no list of excluded goldens.

## CI

### Every pull request runs the gates

- GitHub Actions runs lint, the format check, the docs checks (`citations` and `comments`,
  blocking; `budgets`, reported only) and every test (unit, golden, corpus digest, the balance thresholds) on every
  pull request, every push to `main` and every manual run, so a regression is caught *before*
  merge and `main` stays green and deployable.

### Deploy only from main, only if tests pass

- Three jobs in order: `test` (the gates), `build`, `deploy`. `build` runs on every change, so a
  pull request also proves the site builds; only `deploy` is guarded to a push to `main`. Tests and
  build on every change, deploy on `main`.

### Local runs match CI's toolchain

- CI installs with `npm ci` on Node 24. Locally: Node 24.15 or later (jsdom 30's minimum), and
  `npm ci` after every pull that changes `package-lock.json`.
- When a tool behaves unexpectedly, check `npx <tool> --version` against the lockfile before
  designing around it: a stale `node_modules` can show behaviour the lockfile's version doesn't
  have.

## Deployment & environments

### GitHub Pages, from a subpath

- The static host is **GitHub Pages**: no backend; the built `dist/` is all that's served. A
  project site serves from the repo subpath, so **`base: '/Depths-of-Souls/'` in `vite.config.ts`**
  is mandatory: without it the bundle 404s and the page is blank.

### One Vite mode per environment

- Environments are driven by **Vite mode**, never by separate code paths. One mode switch
  (`--mode production` / `--mode development` or a custom mode) flips, together, the `base` path,
  the **IndexedDB database name** and any debug or feature flags. Every per-environment difference
  sits behind this one mechanism.

### IndexedDB is namespaced by environment

- A **hard requirement**: the database name comes from a Vite-mode env module (`depths-of-souls` in
  production, `depths-of-souls-dev` otherwise). Prod and dev share an origin (same domain,
  different path), so they share one IndexedDB unless the *name* differs, and a dev build with a
  broken or half-migrated schema could corrupt a real save. Isolation lives in the app, never in the
  hosting topology. Phase 5 builds it (`spec/saves.md`).

### PR previews are not built

- `main` deploys to the production Pages URL; nothing else is deployed. The plan is for each pull
  request to deploy an **ephemeral preview** on its own temporary subpath, torn down when the PR
  closes, so there is no standing dev environment to maintain.

### No router rewrites on Pages

- Pages has no SPA-router rewrite, so a deep-link refresh 404s. There is no router today; if one is
  added, use **hash routing** (`/#/...`) or a `404.html` fallback.

### Saves are per-browser, per-origin

- Export to file (`spec/saves.md#slot-and-file-operations`) is the cross-device and eviction
  backstop, not a sync layer.

## Project layout

### Source folders

```
src/
  engine/    pure TS, no React: combat resolver, interpreter, RNG, scaling, cave generation.
  data/      content as data: species (creatures), traits, spells, statuses, role scripts,
             specializations, biomes, balance config (facilities from Phase 8). No logic.
  state/     the store and the balance simulator (save/load and migrations from Phase 5).
  ui/        React components: render state, dispatch intents. No game rules.
  app/       wiring, game loop, top-level screens (no router; hash routing only if ever needed).
```

### Effect carriers live in libraries

- Effect-carrier definitions (traits and spells; later gem augments and equipment infusions, all
  instances of the one effect framework, `spec/effects.md#one-effect-framework`) live in a
  **library** directory per carrier type: `data/traits/`, `data/spells/`.
- Each is split by grouping, `core.ts` (cross-cutting) and **one file per biome**
  (`overgrowth.ts`, …), plus `starters.ts` for the starters' and the Unicorn's signature traits (no
  spell is starter-only, so `data/spells/` has none). Each is aggregated to its registry by an
  `index.ts` that keeps the **stable exported names** (`STOCK_TRAITS` / `TRAIT_REGISTRY`, and the
  spell equivalents).
- Affinity is a **field** on a spell, never the file axis; spawn pools are biome-scoped.
- `data/statuses.ts` stays **flat**: global vocabulary, not organised by biome.

### Composition files only reference carriers

- `data/species/*` (and later `data/gems/`, `data/equipment/`) only **reference** carriers by id or
  object, and never define one. A biome's `spellPool` is a *selection* of library spells, so it is
  composition and stays with the biome.
- Why: a trait or spell is **not** owned by a species. It is a shared registry entry the model
  grants through `innateTraitIds` or equipping, and defining it inside a species file bakes in an
  ownership the effect framework denies. The loader test's "every creature's trait id resolves in
  the registry" is the guardrail: an unwired library module fails loudly rather than shipping
  inert.

## Implementation plans

### Every assumption is marked

- An implementation plan (a phase or slice brief, or a plan for the coding agent) marks **every
  assumption it makes**, inline and clearly labelled (an **`ASSUMPTION:`** tag), and collects them
  in a checklist, so they are reviewed together *before* implementation, not discovered in the code.
- An assumption is anything the plan *decides* that the docs or a design session didn't pin: a
  chosen default, a reading of an ambiguous spec, a value picked for lack of a stated one, a
  deferred edge case. If the plan had to choose, it is an assumption.
- The checklist is the review: each item is confirmed or corrected before (or with) the plan's
  approval. It catches at plan time what the code-level `// ASSUMPTION:` note ("Open questions get
  an interface") catches in the code.

### Every feature phase ships a demo

- After each phase's engine work, a small **throwaway** visual demo makes the new capability
  visible in the browser: the standing pattern, not a per-phase decision. It **consumes** the engine
  (imports from `src/engine`, renders in `src/ui`/`src/app`; the engine never takes a UI
  dependency), uses **real content, not `__fixtures__`**, is marked throwaway (Phase 7's real combat
  UI replaces them all), and is a **separate PR** after the phase's core work, with its own phase
  folder (brief and record).
- **A fix phase** (one that corrects and consolidates the phase before it) **ships no demo of its
  own**: the next demo covers both, and the ROADMAP records it.
- **Baseline demo UX**, inherited by every demo:
  - a **randomize-seed** button and the **current seed on screen** (seed selection lives in
    `src/ui`/`src/app`, never the engine; `resolveFight(seed)` stays deterministic);
  - **timed playback** that reveals the event log progressively: a *cosmetic* replay of the
    already-computed log (the engine is never made async or steppable), paced on **beats** (each
    turn's action and each `TriggerFired`), with a **skip-to-end**;
  - a paced text-log *viewer*, never sprites, health bars or animation (that's Phase 7).

## Style

### Small modules, named exports

- Small modules, named exports, types colocated with their domain.

### Comment why, not what

- The types say what. A comment says **why**: the reason for a choice, the invariant the code keeps,
  the trap a plausible change would fall into.
- **No provenance.** No phase, slice, PR, review or plan-assumption numbers, no "decided", "locked"
  or "review fix", no "was X before". Where code came from is in git and the mailboxes; in a comment
  it only goes stale.
- **Don't restate a spec rule.** Cite it by anchor (`spec/<file>.md#<anchor>`) and say only what
  this code adds to it. A restated rule rots silently when the spec changes. A quotation beside
  an anchor is the target's own words, or it goes; `npm run docs:check -- comments --quotations`
  lists one within four words of an anchor, on either side, that the target's section doesn't hold.
- **A forward pointer cites the rule, not the phase.** "Inert until Phase 8" becomes a citation of
  the rule that names the phase (a spec file's `## Not built` rule, a `ROADMAP.md` entry), so the
  phase lives in one home and the comment never needs to know which phase is current.
- **Test titles follow the same rules.** A `describe`/`it`/`test` title says what the test pins,
  with no provenance.
- **So do names.** A `src/` file name, identifier or fixture data id (a test trait, script or
  status id) says what the thing pins or is for, never the phase, slice or plan item it came from,
  and a string literal (an error message, a report label) carries no provenance word.
  `npm run docs:check -- comments` fails CI on a phase or slice id in a `src/` file name of any
  extension, in an identifier (`B5_FIXTURE`, `PHASE_4_…`) and in a string literal
  (`'h2b2-reapply-p1'`). Plan-item letters are `A`-`I`, so a derivation handle such as `S1_SCRIPT`
  or `T98` passes, and a test title may open with one (`'E1 ticks first'`). A rename is proved with
  `comment-proof <base> --renames <map>` (`workflow/pr-review.md#4-verify-claimed-invariants-mechanically`).
- `// ASSUMPTION:` is kept for a live open question only (`CONVENTIONS.md#open-questions-get-an-interface`), not
  as a record of a decision a plan once made.
- A golden fixture's setup, arithmetic and random draws are not commentary: they are required
  (`CONVENTIONS.md#two-tier-golden-discipline`).

### Open questions get an interface

- When an open design question (`OPEN_QUESTIONS.md`) forces a choice, build against placeholder data
  and a clean interface, and leave a `// ASSUMPTION:` note rather than silently deciding.
