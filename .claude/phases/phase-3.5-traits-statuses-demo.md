# Phase 3.5 (interlude) — Traits & statuses demo (visual harness)

Status: **code-complete, locally verified; not yet merged to `main`.** Brief:
`.claude/briefs/phase-3.5-traits-statuses-demo.md`. Implemented on branch `phase-3.5`,
branched from `main` after Phase 3's PR (#22) merged.

## What was built

- `src/app/demoFight.ts` — wired real Phase 3 content onto the same 5v5 scripted parties
  from Phase 2.5, so the fight itself produces trait/status behavior:
  - `tomas` (durable front-liner, `always-defend`): `RETALIATE` (strikes back for 30%
    Attack when hit) + a demo-only `DEMO_ONLY_REGEN_ON_HIT` trait (applies `regen` to self
    on `on-damage-taken`).
  - `liora` (the provoking tank, `always-provoke`): `VENGEFUL` — a conditional retaliate
    that stays silent above 50% HP and fires once wounded below it (the read-time
    condition made visible; confirmed silent in early rounds, then firing in later ones
    at `DEMO_SEED`).
  - `wendel` (`always-wait`): `REELING` — stunned for 1 round whenever hit, producing a
    visibly empty `TurnStarted`/`TurnEnded` bracket (no `Waited` line) the round after.
  - `mira` (`always-cast`): equipped spell swapped from `CINDER_NOVA` to `VENOM_BOLT`
    (`appliesStatus: poison, duration 3`), so her casts apply/refresh poison on whichever
    enemy is currently lowest-HP; the enemy-side AOE caster (`bog-witch`) keeps
    `CINDER_NOVA`, so both the AOE-cast and status-application shapes stay demonstrated,
    one per side.
  - `alpha-wolf` (enemy, `always-provoke`): `GRUDGE` — permanent +50% Attack when an ally
    dies.
  - `sleepy-slime` (enemy, `always-wait`): `CATASTROPHIC_COLLAPSE` — kept per the brief's
    decision #2; self-destructs for 999 damage at the first `on-round-end` (guaranteed,
    deterministic), which both feeds `alpha-wolf`'s `GRUDGE` (on-ally-death) and applies
    `WEAKEN` to the lowest-HP ally via its own `on-death` response — the damage-modifier
    showcase, no separate seeding needed.
  - `cave-goblin`'s Attack raised (12 → 17) so it lands real (non-chip) hits on `liora`
    through her lowered Defence (14 → 7) — the tuning needed for `VENGEFUL` to actually
    dip below 50% HP and fire, rather than sitting permanently above threshold.
  - `stone-troll`'s Health/Defence lowered (45 → 30, 14 → 8) — at the original stats, the
    fight's last few rounds were just `aldric`/`mira` chipping it for 1 while poison ticked
    it down, a long tail after every interesting mechanic had already fired, pushing
    playback past the brief's ~15–30s target (85 beats × 500ms ≈ 42.5s). The lowered stats
    let `aldric`/`mira` land real (non-chip) hits, ending the fight in 70 beats (≈35s) —
    within range of the target with `Skip to end` available for the remainder, without
    touching `BEAT_DELAY_MS` or any of the already-tuned mechanics above (re-verified: all
    of retaliate/vengeful/grudge/reeling/demo-regen, the poison apply→dot→expire lifecycle,
    stun's empty-bracket skip, and the self-inflicted collapse rendering still fire
    identically at `DEMO_SEED`).
  - Exports `demoTraits` (real `TRAIT_REGISTRY` plus the one throwaway demo trait, merged
    — the demo trait itself is never added to `src/data/traits.ts`) and `demoStatuses`
    (`STATUS_REGISTRY`), both threaded into `createCombat`.
- `src/ui/CombatDemo.tsx`:
  - `describeEvent`'s `DamageDealt` case now special-cases `damageSource === 'dot' &&
    statusId` (renders `"<target> took N <statusId> damage (dot) -- M HP left"`) and
    `sourceId === targetId` (renders `"<creature> collapses, taking N self-inflicted
    damage -- M HP left"`), falling back to the original attack/cast phrasing otherwise.
    Generic rules, no per-trait special-casing.
  - **Randomize seed + seed display + seed input** (brief §4a): the run button becomes
    "New random seed" after the first run (picks a seed via `Math.random()`, UI-only —
    `resolveFight` itself stays a pure function of its seed argument); the current seed is
    always displayed; a text input + "Run this seed" button replays any specific seed
    (verified byte-identical log reproduction).
  - **Timed playback** (brief §4b): events are grouped into "beats" (a new beat starts at
    each `TurnStarted` or `TriggerFired`; everything else attaches to the current beat),
    revealed one beat per 500ms via a `setInterval`. A "Skip to end" button appears
    mid-playback and reveals the remainder instantly. The interval is cleared on unmount
    and at the start of every new run (`clearTimer()` called before scheduling a new one),
    so rapid re-clicks (e.g. mashing "New random seed" mid-playback) cannot leak or stack
    timers — verified live (see below). The interval's `setRevealedBeats` updater is a pure
    `Math.min(current + 1, beats.length)`; the stop condition (calling `clearTimer`, a ref
    mutation) lives in its own `useEffect` keyed on `[outcome, revealedBeats]` rather than
    inside the updater, so no side effect runs inside a state updater (StrictMode
    double-invokes updaters specifically to catch that class of bug).
  - `Result: <result>` is only shown once playback finishes, so it doesn't spoil the live
    reveal.
- `src/app/App.tsx` — passes `traits`/`statuses` through; prop renamed `seed` →
  `initialSeed` (the component now owns its own seed state after the first run).
- `src/app/demoFight.test.ts` — the brief's decision #3 presence smoke test: runs
  `resolveFight` on the demo parties at the pinned `DEMO_SEED` and asserts `>=1
  TriggerFired` and `>=1 StatusApplied`. Lives beside the demo, not in `__golden__`.
- No engine changes. `src/engine` untouched.

## Verification performed

- `npm run lint` / `npm run format:check` / `npm run test` (207/207 passing, incl. the new
  presence smoke test) / `npm run build` — all pass.
- Dumped the full event log at `DEMO_SEED` via a throwaway test (removed before commit)
  and confirmed, by reading it directly: `TriggerFired` for `retaliate`, `vengeful`,
  `grudge`, `reeling`, and the demo regen trait; `StatusApplied poison` → per-round `(dot)`
  ticks with escalating stacks → `StatusExpired poison` on three different targets;
  `StatusApplied stun` → an empty turn bracket for `wendel` → `StatusExpired stun`,
  repeating every time he's hit; `weaken` applied by `catastrophic-collapse` and expiring
  2 rounds later.
- **Actually clicked through it in a real browser** (Playwright + Firefox, same pattern as
  Phase 1.5/2.5 — `playwright-core` already present locally, Firefox cached from a prior
  session). Drove the dev server end-to-end:
  - Ran the default seed; confirmed every mechanic above appears in the rendered log text
    (all `TriggerFired`/DoT/stun/self-damage checks passed as literal substrings).
  - Confirmed the "stun skips a turn" empty bracket is literally present (`wendel's turn`
    → `TriggerFired ... stun` → `wendel's turn ends`, no `wendel waits` line between).
  - Clicked "New random seed" twice; confirmed the displayed seed changes each time and
    the log differs.
  - Clicked "New random seed" again mid-playback (rapid re-click) and confirmed the log
    resets cleanly to a short, growing log with no duplicated/garbled lines afterward —
    the timer-cleanup requirement, verified live rather than just by code inspection.
  - Typed the original run's seed into the input box, clicked "Run this seed", clicked
    "Skip to end", and confirmed the replayed log is **byte-identical** to the original
    run's full log (determinism visible end-to-end through the actual UI).
  - Zero browser console errors throughout. Screenshots confirmed the DOM actually
    updates (title, controls, seed display, and progressively-revealed log all render).
- The brief's real acceptance test — confirming this on the live deployed Pages URL —
  still applies after merge, unchanged.

## Next

Phase 4 — Party, specializations, the cave & biomes. See `ROADMAP.md`.
