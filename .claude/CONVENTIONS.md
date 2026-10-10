# Depths of Souls — Conventions

Every chat reads this file: the engineering rules for every change.

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
- **`CombatState` is plain data, never modified after being returned** (Phase 4.1-B, fixes B3).
  Changes happen only on the per-turn **working copy** `resolveTurn` makes when it starts; the
  snapshot you passed in is untouched, so the same snapshot resolved twice gives the same result
  (Phase 7 rewind and Phase 9 preview depend on this). The RNG is part of that plain data: the
  state holds a **bookmark** (`rng: { position: number }`, the mulberry32 stream position), and
  every roll goes through `nextRandom(rng)`, which advances the working copy's bookmark. No
  closures, functions, class instances or hidden state inside `CombatState` (this is also why
  S2 replaced the conditional-passive predicate function with data). A **deep-freeze test
  helper** freezes an input snapshot recursively and makes any write to it crash; engine tests
  that reuse a snapshot use it. The fully pure alternative (every roll returns a new snapshot)
  was rejected: same outward guarantee, but a determinism risk at every future dice roll.

- **Where each number lives** (Phase 4.1-A, A7):
  - **Combat rule constants** stay in **`engine/config.ts`**: affinity ±25%, chip floor, Defend
    factors, round cap, cascade depth, `MAX_REVIVES_PER_CREATURE`.
  - **Progression and economy numbers** live in an injected **`BalanceConfig`** whose **shape is
    defined by the engine and whose values live in `data/balance.ts`**: level range (the
    multiplier curve), fight count, enemy party size, boss level offset, rarity spawn weights,
    soul gain, the XP curve (default `20 × level²`, quadratic because XP per floor clear grows with
    floor² — kills ∝ floor at victim levels ∝ floor — so party level can track the floor at every
    depth), XP per kill (**1 × the victim's level**), currency drops, summon cost (free; nothing
    reads it until Phase 8's Soul Altar names the currency it is paid in).
  - **Curves are parameters, not functions** (e.g. `{ fightCountBase: 10, fightCountPerFloor: 1 }`,
    not a closure), so the config is plain data a simulator can sweep and a save can ignore.
    Generation and the store **receive the config as an argument**; tests pin their own config
    instead of inheriting tuning changes.
- **Balance simulator** (Phase 4.1-H, D1): a **deterministic**, permanent tool that drives the
  **real store** with a documented simple player policy over many seeds and reports the design
  targets as **bands**, not hard rules: T1 floor 1 cleared on ≥95% of seeds; T2 a soul completed by
  each seed's first run on floor 3; T3 a full party of 6 by its first run on floor 6, where enemies
  first field six (both ceilings: sooner is fine; 4.1-H2d grill, brief ASSUMPTION 153; until
  4.1-H2d the report reads ~10 floor runs and the first 10 floor runs); T4 no
  hard wall before the floor-10 boss; T5 the level curve above (party ≈ floor).
  - **T2 counts floor runs, not clears** (PR #84 review): a kill banks soul whether the floor is won
    or lost, so a soul can complete before any clear. Floor runs are the player's time; ASSUMPTION 22's
    first-soul threshold keeps that unit. From 4.1-H2d the T2 and T3 bands read a seed's first run
    on floor 3 and floor 6 instead, so the policy's farming doesn't move them (brief ASSUMPTION
    153).
  - **A hard wall** (T4) is 5 failed pushes in a row at one floor (re-farm runs between them don't
    reset the count): with a re-farm after each failed push, about one session spent stuck on one
    floor. The simulator records the first wall and keeps going. Decided at the 4.1-H1 plan
    review, kept at the PR #84 review: on H1's report the flagged walls are real (many sessions per
    floor), not an artefact of the count.
  - **No band for round-cap draws** (4.1-H2 grill, brief ASSUMPTION 121): the draw rate is
    reported, not targeted.
  - **The report adds, from 4.1-H2c** (brief ASSUMPTION 127): a **floor 1–5 matchup table** (per
    enemy creature: fights, wins, losses and round-cap draws, per spec) and the **first-try clear
    rate per floor** (each seed's first run on that floor).
  - CI checks only loose "badly broken" thresholds (brief ASSUMPTIONS 22, 107, 126): first-try floor
    1 ≥ 80%; the median floor runs to the first soul ≤ 30; some seed fights on floor 5 or deeper
    within its first **20** floor runs (10 until the 4.1-H2 grill: on H1's report no seed of any
    spec reached it in 10). From 4.1-H2d a test in the normal suite asserts the three verdicts
    over the full 40 seeds per spec, capped at 30 floor runs with the boss probe off; the cap
    changes no verdict (brief ASSUMPTIONS 148, 149). The bands guide tuning passes (the first one lands before
    the Phase 4.5 demo). Framing (design owner, H2 grill): balance needn't be perfect yet; Phase 6
    player scripts and Phase 8 equipment will strengthen the starting team.

## Testing

**Three tiers** (test the pure engine heavily, the browser lightly):
- **Unit tests** (Vitest) — small isolated units, no DOM/async/mocks needed because the engine is
  pure. Cover the *consequence-bearing* branches, not line-count vanity: the damage formula (core
  fully absorbed → chip-floor-only; affinity advantage / disadvantage / neutral; `MAX(1, floor)`
  clamp; empty pools = ×1.0), turn-order tie-break (player → slot → id), death-mid-round skipping,
  the round-cap → draw path, the empty-party guard, and determinism (same seed → identical event
  log). Prefer **table-driven tests** for the trait/condition/action primitives.
- **Golden-replay / snapshot tests** (Vitest) — the highest-leverage tier: a fixed
  `(party, scripts, seed)` run to completion, asserting the **full event log** deep-equal against a
  **committed fixture**. One golden fight covers turn order + damage + affinity + death + events in
  a single assertion. **Keep fixtures small** (tiny parties, few rounds) so a diff is human-
  readable. The suite starts small (1v1, 6v6, affinity matchup, stomp) and **grows every phase** to
  exercise newly added mechanics.
- **Corpus digest** (Phase 4.1-C2a, PR #71 review) — a **behaviour tripwire, not a spec**.
  - **What it does:** one test resolves a fixed corpus of real-content fights and compares each
    fight's event-log hash against a committed fixture. The fixture is **generated** and labeled
    as such.
  - **The corpus:** generated floors across every shipped biome, boss floors included, plus the
    shipped starters and Unicorn. Bonus-cast, echo, Provoke and Confusion must all fire in it.
  - **It covers all real content** (PR #74 review, built in 4.1-D2). A test enforces these
    against the registries, so new content is covered or fails loudly:
    - every spell in `ALL_SPELLS` is cast with its effects landing: each effect's consequence
      event, from the caster, on the cast's target (or on the caster, for a `self` effect);
    - every status in `STATUS_REGISTRY` is applied, and every damage-modifier status is
      **exercised**: its bearer deals (a `dealt` modifier) or takes (a `taken` one) damage while
      it holds. An applied modifier that never meets a hit has a magnitude the digest can't see;
    - every specialization perk with effects **matters**: re-running its fight with only that perk
      removed changes the event log. Presence isn't enough, because a perk whose trigger never
      happens, or that another perk masks, is invisible to the digest;
    - every corpus creature's equipped spells match its affinity (equip-gating), so the corpus
      holds only loadouts the game can produce. Innate spells are added at fight setup and aren't
      part of the input loadout.
  - **Perk effect ids are positional** (`perk-N`, numbered across the side's effect list). A log
    comparison across different perk sets anonymises them, or removing one perk renumbers every
    later one and makes it look like it matters.
  - Anything no shipped content can reach goes on the test's explicit exemption list, each entry
    with its reason. An exempt item that is covered fails the test, so the slice that makes it
    reachable must drop the exemption.
  - Coverage never rides on one lucky seed: a chance-based mechanism gets enough rolls in its fight
    that a change to the RNG draw order can't silently drop it. The PR shows this with a **seed
    sweep** over the coverage fights' combat seeds, and reports the worst case the sweep saw, not
    the roll count at the committed seed. (PR #77 review: Lucidity had 9 rolls at the committed
    seed and failed the whole test at 4 of 200 offsets, because its casters died early.)
  - Before 4.1-D2, generated floors left 15 of 25 spells, three statuses (Stun, Weaken,
    Vulnerability) and every perk out of the corpus, so a change to them was invisible. Coverage
    fights are appended, so adding them never changes an existing digest entry.
  - **Why it exists:** it answers "did any behaviour move?", which scenario goldens can't. A
    change that only shows up in combinations no golden pins passes them all.
  - **Byte-identical PRs leave it unchanged.**
  - **Deliberate-change PRs regenerate it**, only through its update command. They state how many
    corpus fights changed and which listed change accounts for them.
  - **Proof it covers a mechanism:** the PR that adds a mechanism to the corpus shows the digest
    failing with that mechanism disabled. This is the same bar as a discriminating golden.
  - Hand-derived goldens remain the definition of correct.
- **E2E smoke test** (Playwright) — **planned, none exists yet**: does the app render and the
  loop run in a real browser. Slower; run it on `main` / pre-deploy, not on the inner loop.

**Test environments** (Phase 4.1-A, S4): Vitest `projects` split by folder. `src/engine`,
`src/data` and `src/state` run in **Node** (which also enforces engine purity: DOM globals are
undefined there); `src/ui` and `src/app` run in **jsdom**. (Before the split, jsdom setup took about
74 s of a 95 s run and no test used the DOM.)

**Mechanism goldens vs content goldens** (Phase 4 close review, S3): mechanism goldens stay on
**stable test fixtures** (small, hand-derived, independent of content tuning); real content is
covered by the per-biome goldens and the integration test. Placeholder content does not live in
production registries: the Phase-3 placeholder traits move to test-only fixtures in the Phase 4.5
demo slice (their goldens stay byte-identical).

**Tuning never changes a mechanism golden** (4.1-H2c kickoff, brief ASSUMPTION 147):
- A golden whose subject is a **rule** is a mechanism golden. When it borrows a real status, spell,
  trait or creature, it pins every tuned number it reads in its own fixture (the real def with only
  that number held; for a creature, a base stat), so a tuning PR leaves its expected values
  byte-identical. That byte-identity is the PR's proof that only numbers moved. Only a number the
  golden reads is pinned: a borrowed number no event of the fight reads gets a header note, not a
  pin (4.1-H2c: the Leech Sovereign golden reads none of her Health). The same holds for a
  **unit test** whose subject is a rule and which borrows real content (4.1-H2d plan review:
  `status-snapshot.test.ts` holds Poison at 20%).
- A golden whose subject is a **named content item** (a creature, trait or spell) is a content
  golden: it reads real data and is re-derived by hand when a tuning PR moves a number it reads.
- A tuning PR shows each effect number it changes (a status potency, a spell's power, a trait's
  magnitude) in a hand-derived content golden on real data, new or re-derived. Base stats are the
  exception: the data tests pin only their **ranges**, so an exact base stat is pinned by nothing
  but the corpus digest (4.1-H2c: leaving a remapped Health at its old 20–30 value fails only the
  digest). A PR that changes base stats lists every one, old → new, in its report, from a script
  when it changes many, and the PR review checks the list against the data.

**Discipline:**
- **A golden-test failure is a question, not a chore.** It means *either* a regression *or* an
  intended change — decide which *before* regenerating the fixture. Never reflexively "update
  snapshot"; that turns a regression detector into a rubber stamp.
- **Golden fixtures are layered by capability and additive across phases.** Each phase keeps prior
  fixtures **stable** (they pin already-verified behavior) and **adds** fixtures exercising the new
  capability. Never rewrite an old golden to accommodate a new feature unless the feature
  *deliberately* changes that behavior — a changed old golden must be a conscious, reviewed decision,
  not incidental. (E.g. Phase 1 goldens test raw engine math and stay as-is; Phase 2 adds
  interpreted-fight goldens.)
- **Comment-only edits to an existing golden are allowed** (PR #72 review). A fixture's comments are
  its derivation, and a stale one misleads the next reader. So any PR may fix comments in an
  existing golden fixture, byte-identical policy included, provided **the diff changes no
  code token** (a trailing comment on a code line may change; the code on that line may not).
  The PR lists each such file, and the reviewer checks that, with comments stripped, the old and
  new file are identical. Any change beyond comments falls under the rule above.
- **Two-tier golden discipline.** Small **focused** goldens are **hand-derived** (per-mechanism
  correctness — the expected log computed by hand). A large **integration** golden may be
  **generated-then-checkpoint-verified** (hand-check the load-bearing assertions: turn order, event
  counts, key results) rather than fully hand-traced — but it must be **explicitly labeled in the
  fixture** as an integration/regression golden whose per-mechanism correctness rests on the focused
  goldens. Don't pass off a giant generated log as hand-verified.
- **A focused golden must actually pin what it claims** (PR #71 review):
  - **No clamp may hide the value it covers.** For example, a heal golden whose heal overflows
    max HP pins the clamp, not the heal amount.
  - **Every random draw or extremum it covers needs at least two distinct candidates** whose picks
    lead to different logs. A one-spell caster pins nothing about the gem draw.

  The "fails with its mechanism removed" check is how a golden proves both.
- **A mechanism built at more than one site needs a discriminating test at each site** (PR #73
  review: B5's guard lives in both the attack and the single-target cast loop, and only the attack
  one was tested; deleting the cast one left every test and the corpus green).
- **Characterize the empty seams now.** Pin the current behavior of the "no-op today, real later"
  seams — `getEffectiveStat` returns base with no effects; the mod pools yield ×1.0 when empty; the
  remap-aware OffStat lookup returns effective Attack with no remap; `spellPower` is 1.0 for Attack.
  When a later phase makes them real, the test states exactly what changed.
- **Every failing fight is reproducible from its seed** — combat is deterministic, so when a bug
  appears in play, capture the seed and it becomes a permanent regression fixture.
- **Every engine change ships with or updates a test.** The golden-replay suite is the canary.
- **Snapshots are never written to** (B3): engine tests that resolve the same snapshot more than
  once, or assert on an input after resolving, wrap it in the deep-freeze helper.
- **Every golden replays through one shared runner** (Phase 4.1-C2c, PR #73 review). The runner
  deep-freezes the state before **every** turn, so every golden also proves the engine never writes
  to its input. Each fixture exports what the runner needs to build its starting state, plus an
  optional driver for a golden that isn't simply "run N turns" or "run to the end" (for example a
  wound applied after `createCombat`). There is no separate frozen-replay sweep and no list of
  excluded goldens.
- **Balance is checked by the simulator, loosely** (D1): CI fails only on "badly broken" thresholds;
  target bands are reported, not asserted.

**CI (GitHub Actions):**
- Run **lint + unit + golden tests on every push *and* every pull request** — catch regressions
  *before* merge so `main` stays always-green and always-deployable. Tests are fast (pure engine,
  no browser), so this costs seconds.
- **Deploy only from `main`, and only if tests pass** — the deploy step is gated on the test step
  (build/publish guarded to the `main` branch). Tests-on-every-change, deploy-on-main.
- **Local runs match CI's toolchain** (PR #73 review). CI installs with `npm ci` on Node 24. Locally:
  Node 24.15 or later (jsdom 30's minimum), and `npm ci` after every pull that changes
  `package-lock.json`. A stale `node_modules` once ran Vitest 4.1.11 against a lockfile pinning
  5.0.1, and a tool behaviour seen only there was nearly written into the code and the phase
  record. When a tool behaves unexpectedly, check `npx <tool> --version` against the lockfile
  before designing around it.

## Deployment & environments

- **Static host: GitHub Pages** (no backend; the built `dist/` is all that's served). Project site
  → served from the repo subpath, so **`base: '/Depths-of-Souls/'` in `vite.config.ts`** is
  mandatory (without it the bundle 404s → blank page).
- **Environments are driven by Vite mode**, not by separate code paths. One mode switch
  (`--mode production` / `--mode development` or a custom mode) flips, together: the `base` path,
  the **IndexedDB database name**, and any debug/feature flags. Keep all per-environment differences
  behind this single mechanism.
- **Prod vs dev topology: PR-preview deployments — planned, never built.** `main` deploys to the
  production Pages URL; the plan is for each **pull request** to deploy an **ephemeral preview**
  (its own temporary subpath) torn down when the PR closes. No standing dev environment to
  maintain; "dev" = the change about to merge. The IndexedDB naming rule below applies regardless
  (it lands with Phase 5).
- **IndexedDB MUST be namespaced by environment** (e.g. `depths-of-souls` (prod) vs `depths-of-souls-dev`), driven by the
  Vite mode. This is a **hard requirement**, not a nicety: prod and dev share the same origin
  (same domain, different path), so they share the same IndexedDB unless the DB *name* differs — a
  dev build with a broken/half-migrated schema could otherwise corrupt a real prod save. Isolation
  lives in the app (DB name), never in the hosting topology.
- **No SPA-router URL rewriting on Pages** — deep-link refreshes 404. Not an issue now (single
  page, no router). If a router is ever added, use **hash routing** (`/#/...`) or a `404.html`
  fallback.
- **Saves are per-browser, per-origin** — export-to-file (§ persistence) is the cross-device and
  eviction backstop, not a sync layer.

## Project layout

```
src/
  engine/    pure TS, no React. resolver, interpreter, rng, scaling.
  data/      content as data: creatures, traits, spells, biomes, facilities, config.
  state/     store, save/load, migrations.
  ui/        React components; render state, dispatch intents.
  app/       wiring, game loop, top-level screens (no router in v1; hash routing only if ever needed).
```

### Data layer — carriers vs. composition
- **Effect-carrier definitions** (traits, spells; later gem augments, equipment infusions — all
  instances of the one effect framework, see *Unified effect framework*) live in a **library**
  directory per carrier type: `data/traits/`, `data/spells/`. Each is split by grouping —
  `core.ts` (cross-cutting / Phase-3 generics), `starters.ts`, and **one file per biome**
  (`overgrowth.ts`, …) — aggregated to its registry by an `index.ts` that keeps the **stable
  exported names** (`STOCK_TRAITS` / `TRAIT_REGISTRY`, and the spell equivalents). Affinity is a
  **field** on a spell, never the file axis; spawn pools are biome-scoped.
- **Composition** files — `data/species/*` (and later `data/gems/`, `data/equipment/`) — only
  **reference** carriers by id/object; a composition file **never defines a carrier**. A biome's
  `spellPool` is a *selection* of library spells, so it is composition and stays with the biome.
- `data/statuses.ts` stays **flat** — global vocabulary, not biome-organized.
- **Why**: a trait/spell is **not** owned by a species — it's a shared registry entry the model
  grants via `innateTraitIds` / equip (and will grant via gems + equipment). Defining a carrier
  inside a species file bakes in a false ownership the effect framework denies. The loader/shape
  test's "every creature's trait id resolves in the registry" assertion is the guardrail: an
  unwired library module fails loudly rather than shipping inert.

## Implementation plans

- When a phase or task is worked up as an **implementation plan** (e.g. a phase or slice `brief.md`, or a plan
  handed to the coding agent), **every assumption the plan makes must be explicitly marked** —
  inline, clearly labeled (e.g. an **`ASSUMPTION:`** tag or a dedicated "Assumptions" section) — so
  they can be reviewed together *before* implementation, not discovered later in the code.
- An assumption is anything the plan *decides* that wasn't already pinned in GAME_DESIGN /
  CONVENTIONS / a locked design session: a chosen default, an interpretation of an ambiguous spec,
  a value picked for lack of a stated one, a deferred edge case. If the plan had to choose, it's an
  assumption — surface it.
- Marked assumptions are the review checklist: go over them explicitly, confirm or correct each,
  before (or alongside) approving the plan. This mirrors the code-level rule below (`// ASSUMPTION:`
  notes) but catches the decision one step earlier, at plan time.

- **Every feature phase ships a demo.** After each phase's engine/logic work, a small throwaway
  visual demo (successor to the Phase 1.5 / 2.5 harnesses) makes the new capability visible in the
  browser — the standing pattern, not a per-phase decision. Same guardrails every time: it
  **consumes** the engine (imports from `src/engine`, renders in `src/ui`/`src/app`; the engine
  never takes a UI dependency), uses **real content, not `__fixtures__`**, is **explicitly marked
  throwaway** (Phase 7's real combat UI replaces them all), and is a **separate PR** after the
  phase's core work. It gets its own phase folder (`phases/<phase>/`: brief + record)
  like any other work. **A fix phase** (e.g. Phase 4.1, which corrects and consolidates the
  phase before it) **ships no demo of its own**: the next demo covers both (the Phase 4.5 demo covers
  Phase 4 and 4.1), and ROADMAP records it so it never reads as a skipped convention.
  - **Baseline demo-UX (from Phase 3.5 onward), inherited by every successor harness:** a
    **randomize-seed** button plus the **current seed shown on screen** (seed-selection randomness
    lives in `src/ui`/`src/app`, never the engine; `resolveFight(seed)` stays deterministic), and
    **timed playback** that reveals the event log progressively — a *cosmetic* replay of the
    already-computed deterministic log (the engine is never made async/steppable), paced on **beats**
    (each turn's action and each `TriggerFired`), with a **skip-to-end**. These stay a paced
    text-log *viewer* — not sprites/health-bars/animation (that's Phase 7).

## Style

- Small modules, named exports, colocate types with their domain.
- Comment *why*, not *what*. The types say what.
- When an open design question (GAME_DESIGN §13) forces a choice, code to an interface and
  leave a `// ASSUMPTION:` note rather than silently deciding.
