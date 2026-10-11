# Depths of Souls — Roadmap

Read this when placing a slice in its phase, or checking what is decided but not built.

The build order: each phase produces something runnable, and the risky core (the pure,
deterministic engine) came first. Each phase ships in **slices**, built and reviewed per
`.claude/WORKFLOWS.md`. Phases 0–10 together produce the **start-of-beta build** (`VISION.md#v1-is-the-start-of-beta-baseline`).

## Content authoring

- Content authoring rides as a slice within each content-bearing phase, not as separate interlude
  phases: **3 biomes in Phase 4**, the remaining **7 tapering across Phases 6–9**, landing on
  **exactly 10 biomes by the end of Phase 10** (a hardening phase: no new content).
- Ten is load-bearing: it makes progression and depth finish together (`spec/progression.md#perk-points`). Over- or under-shooting breaks nothing; it just decouples the two milestones the design
  aligned.
- **Biomes 11+ are beta content.** How beta extends progression past floor 100 (more
  specializations, further perks, or otherwise) is a beta-time decision, deliberately not settled
  here.

## Finished phases

- **Phase 0 — Skeleton:** Vite, React and strict TypeScript, ESLint and Prettier, Vitest, a seeded
  RNG and the Zustand store. Record: `.claude/archive/phases/phase-0-skeleton.md`.
- **Phase 0.5 — Deploy checkpoint:** the GitHub Pages pipeline, live since the skeleton. Record:
  `.claude/archive/phases/phase-0.5-deploy.md`.
- **Phase 1 — Combat engine:** the pure resolver, the damage formula, the event log and the
  golden-replay suite. Brief: `.claude/archive/briefs/phase-1-implementation-plan.md`; record:
  `.claude/archive/phases/phase-1-combat-engine.md`.
- **Phase 1.5 — Tooling and engine demo:** Dependabot and the first demo harness. Brief:
  `.claude/archive/briefs/phase-1.5-tooling-and-demo.md`; record:
  `.claude/archive/phases/phase-1.5-tooling-and-demo.md`.
- **Phase 2 — Actions, spells and the scripting interpreter.** Brief:
  `.claude/archive/briefs/phase-2-implementation-plan.md`; record:
  `.claude/archive/phases/phase-2-actions-spells-scripting.md`.
- **Phase 2.5 — Scripted combat demo.** Brief: `.claude/archive/briefs/phase-2.5-scripted-demo.md`;
  record: `.claude/archive/phases/phase-2.5-scripted-demo.md`.
- **Phase 3 — Traits, statuses and the effect framework.** Brief:
  `.claude/archive/briefs/phase-3-implementation-plan.md`; record:
  `.claude/archive/phases/phase-3-traits-statuses-effects.md`.
- **Phase 3.5 — Traits and statuses demo**, which added the baseline demo UX. Brief:
  `.claude/archive/briefs/phase-3.5-traits-statuses-demo.md`; record:
  `.claude/archive/phases/phase-3.5-traits-statuses-demo.md`.
- **Phase 4 — Party, specializations, the cave and biomes:** the systems for the full 10-biome
  structure, with the first 3 biomes authored. Brief:
  `.claude/archive/briefs/phase-4-implementation-plan.md`; record:
  `.claude/archive/phases/phase-4-party-specializations-cave-biomes.md`; its side briefs and records
  are in the same folders.
- **Phase 4.1 — Fix and consolidation:** the Phase 4 close review's fixes, in slices A to H. A fix
  phase, so no demo of its own: the Phase 4.5 demo covers Phase 4 and 4.1. Brief:
  `.claude/phases/4.1/brief.md`; record: `.claude/phases/4.1/record.md`.

## Phase 4.2 — Docs restructure: the context diet (between 4.1 and 4.5)
*Brief: `.claude/phases/4.2/brief.md`. Docs only: no behaviour change and no golden changes; the
`src/` changes are comment-only, plus test titles (citations in 4.2-G, provenance in 4.2-H). Done:
4.2-A to 4.2-G.* Every fresh agent chat read about
300 KB of living docs, most of it CONVENTIONS and GAME_DESIGN. 4.2 splits them into
`spec/<subsystem>.md`, one home per rule, condenses every living doc, makes citations anchors
checked in CI, and strips provenance from code comments (4.2-H). The rules the condensed docs are written to are in `CLAUDE.md#how-the-spec-is-written`.

## Phase 4.5 — Run-loop demo (interlude)
*Brief: to be written after Phase 4.2.* The throwaway visual demo for Phase 4 **and** 4.1,
replacing the 3.5 demo on the live site. It comes **after the fixes and before Phase 5**
deliberately: if the run loop were first exercised in a browser after persistence lands, run-loop
bugs and save bugs couldn't be told apart. Rough intent (the brief pins scope): spec pick →
scripted intro → floor-by-floor descent with the paced log viewer, plus a side panel (floor, biome,
soul %, XP/level, currencies), party arrangement and summoning, fast-travel, boss floors, and perks
(inert perks labelled "inactive until Phase 8"). The baseline demo UX carries forward. Same
guardrails as every demo; own brief and phase record.

**Decided, not built** (the 4.5 brief takes these in):
- **Content clean-up:** the nine Phase-3 placeholder traits move out of game data into test-only
  fixtures (goldens byte-identical); Ember Lance and Venom Bolt are deleted (no niche: Venom Bolt
  overlaps Stinger Swarm); Cinder Nova is promoted to real biome-1 content (the pool's only plain
  AOE damage spell, with reviewed name and numbers). `CONVENTIONS.md#mechanism-goldens-vs-content-goldens` carries a "Known bug" line that the fix's PR review removes.
- **One copy of Splashing's adjacency lookup:** Splashing (`engine/actions.ts`) uses a private
  copy of `adjacentLivingTargets`, byte-identical to the export in `engine/targeting.ts` that only
  `targeting.test.ts` calls, so that test pins code Splashing doesn't run. `actions.ts` imports the
  `targeting.ts` export and the private copy is deleted (goldens byte-identical).
- **Two Shieldbarer perk bugs** (the code doesn't match the perks' design): **Thorns** must answer
  only damage from an attack or a spell (today it answers any damage with a source, trait and perk
  hits and other retaliations included); **Last Stand** must roll only when the lethal damage is
  more than 1 (today it rolls on any lethal damage, so a creature left at 1 HP rolls again on a
  1-damage hit). `specializations/shieldbarer.md` states the design, with a "Known bug" line on each
  perk that the fix's PR review removes.
- **Level-ups after each fight** (a bug): `descend` must apply each fight's XP before the floor's
  next fight, so the party fights it at its new levels. Today it materializes the party once per
  descent and applies the floor's XP after the whole floor. The fix moves balance, so the CI
  balance bands are re-checked in the same PR. `spec/run.md#rewards` states the design, with a
  "Known bug" line that the fix's PR review removes.
- **`on-death-observed`** (a new direction, not a bug): death observation joins the other two
  observation hooks. `on-ally-death` and `on-enemy-death` become one `on-death-observed`, fired on
  every living creature when a creature dies, with the same `ObservationFilter` `relationship`
  (`self`, `ally`, `enemy`, `any`), compared with the dead creature, in the standard tie-break order
  (side → slot → id), like `on-action-observed` and `on-damage-observed`. `on-death` and `on-kill`
  stay separate (actor-self hooks). The 8 trait triggers on the two old hooks
  (`data/traits/core.ts`, `glimmerdark.ts`, `rotcap-hollow.ts`) move over; the Rot Sovereign's pair
  becomes one `any` trigger. Deliberate golden change: the hook name in `TriggerFired`, and the
  firing order on an enemy's death (today the dead creature's allies all fire before its enemies).
  The PR review rewrites `spec/effects.md#hooks`, `spec/effects.md#damage-path-hook-order` and `spec/effects.md#action-reactions-actor-self-hooks-or-observation` to match (17 hooks become 16).
- **HP% qualifiers pick by HP%** (a bug): an `hp-percent` condition's `lowest` or `highest`
  qualifier must test the creature with the lowest or highest HP%, compared by integer
  cross-multiplication with the shared tie-break. Today `evaluateCondition` picks it by current HP.
  Users: the `warden` and `support` role scripts' first rules, so the fix is a deliberate golden
  change for fights with either role, and the CI balance bands are re-checked in the same PR.
  `spec/scripting.md#conditions-in-the-engine` states the design, with a "Known bug" line that the
  fix's PR review removes.
- **A dead creature's turn is skipped entirely** (a new direction, not a bug): a creature that is
  dead when its slot in the frozen queue comes up gets no `TurnStarted`/`TurnEnded` bracket, no
  turn-clock bump and no Web roll; nothing happens for it. A creature that dies during its own turn
  keeps that turn's cleanup and Web roll, since the turn happened. Web's break-free roll becomes "at
  every living creature's turn", so a Web gets stickier as the board empties (about 72% per round
  only in a full 6v6), still capped by its 3-turn duration. Open for the 4.5 grill: whether anything
  else reads dead slots (the act-first and act-last poles). Deliberate golden change for every fight
  where a creature dies before its turn (the bracket events, the turn clock, the Web roll's RNG
  draws), and the CI balance bands are re-checked in the same PR. The PR review rewrites
  `spec/combat.md#turn-queue`, `spec/statuses.md#self-clearing-statuses` (the 72%),
  `spec/statuses.md#born-this-turn` and `spec/statuses.md#turn-order`, and `content/overgrowth.md`'s Web entry.

## Phase 5 — Persistence (large saves)
- Builds `spec/saves.md` (all of it is its `## Not built` half) and the IndexedDB namespacing
  (`CONVENTIONS.md#indexeddb-is-namespaced-by-environment`).

## Phase 6 — Scripting UI
- Builds `spec/scripting.md#the-script-editor`: the block and dropdown rule editor, authoring
  **script templates** and assigning them to creatures, drag-to-reorder and live-preview validity.
- **Inputs recorded so far:**
  - grey out illegal choices with the store's `can…` queries and the engine's `checkLegality`;
  - candidate conditions: "target lacks status X" (casters currently refresh statuses they already
    applied) and a `last-action` condition (script memory);
  - whether a script-level default target overrides the engine's side-aware default;
  - triggers can use **trigger-only conditions** (`TriggerCondition`, `spec/effects.md#trigger-conditions`) that scripts can't. The editor builds its condition list from the scripting
    `Condition` and must not offer them. If players should get "another ally is hurt", add it
    together with a matching "lowest-HP hurt ally other than me" selector, never the condition
    alone (today's `lowest-hp-ally` includes the caster and ignores full Health).

## Phase 7 — Combat UI & feedback
- Render combat from the event log: turn-by-turn playback, fast-forward, speed control.
- Clear "why did this happen" surfacing (which rule fired): core to the legibility pillar.

**Decided, not built:**
- **The scripted intro's story beat:** the intro's outcome is presented as a story beat, the
  starter revived and the Unicorn gained. It is presentation only (HP resets every fight, so a
  revive changes nothing); `spec/run.md#scripted-intro` describes the fight `main` runs.
- **Effective stats on screen:** stacked multipliers aren't mentally computable (`0.8³ = 0.512`,
  not "−60%"), so the UI always shows the computed effective stat and net multiplier first, with
  the per-factor breakdown on hover or in detail; it never makes the player multiply factors. Known
  cost: scripting against a predicted post-debuff stat threshold means reasoning about
  compounding; if playtesting shows that confuses players, an additive-within-a-type,
  multiplicative-across-types hybrid is the documented fallback, replacing the multiplicative fold
  in `spec/effects.md#category-decides-player-facing-treatment`.

## Phase 8 — Progression & incremental layers
- Builds the `## Not built` halves of `spec/creatures.md` (gems as items, fusion, equipment,
  catch-up levelling, summoning at the Soul Altar) and `spec/run.md` (facilities, recipe drops and
  currency sinks), plus further unlocks and equipment variety.
- This is where the long-term game lives; it is meaningful only once Phases 1–7 are solid.

## Phase 9 — Manual mode
- Builds `spec/combat.md#manual-mode`: UI-chosen actions fed into the *same* resolver, with no
  forked combat path.

## Phase 10 — Polish & deploy
- The **production hardening pass**, not a first deploy (the Pages pipeline has been live since
  Phase 0.5): a final balance pass through config, a save-compatibility check across a version
  migration, asset and bundle-size optimization, a custom domain if wanted, and confirming
  IndexedDB persistence and save export and import on the live origin.
- **Biome theme and visuals:** biome data gains a theme, scaling tweaks and visuals (`spec/run.md#biome-theme-and-visuals`).
