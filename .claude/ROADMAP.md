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
- **Phase 4.2 — Docs restructure (the context diet):** the living docs split into `spec/`, condensed
  to one home per rule, with anchor citations and no provenance, both checked in CI. Docs only, no
  behaviour change. Brief: `.claude/phases/4.2/brief.md`; record: `.claude/phases/4.2/record.md`.

## Phase 4.5 — Run-loop demo (interlude)
*Brief: `.claude/phases/4.5/brief.md`; slices 4.5-A to 4.5-G2.* First the fixes in
`phases/4.5/brief.md#decided-not-built` (4.5-A to 4.5-F), then the throwaway visual demo for Phase
4 **and** 4.1 (`phases/4.5/brief.md#the-demo`, 4.5-G1 and 4.5-G2), replacing the stub on the live
site. It comes **after the fixes and before Phase 5** deliberately: if the run loop were first
exercised in a browser after persistence lands, run-loop bugs and save bugs couldn't be told apart.
Same guardrails as every demo; own brief and phase record.

## Phase 5 — Persistence (large saves)
- Builds `spec/saves.md` (all of it is its `## Not built` half) and the IndexedDB namespacing
  (`CI_CD.md#indexeddb-is-namespaced-by-environment`).

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
- **Perk text:** perks need player-facing descriptions; `PerkDef` carries only a name.

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
