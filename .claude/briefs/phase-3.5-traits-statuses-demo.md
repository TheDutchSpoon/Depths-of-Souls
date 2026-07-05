# Phase 3.5 (interlude) — Traits & statuses demo (visual harness)

Status: shipped — see phases/phase-3.5-traits-statuses-demo.md

Task brief for the coding agent. **Not a design phase** — a throwaway visual demo, done after
Phase 3 (traits, statuses & effects) is merged. Single deliverable, one PR. Own phase record.

Working style reminder: the human handles all commits/pushes. Everything below is code + local
verification; the real acceptance test happens once it's on the live Pages URL.

Successor to the Phase 2.5 scripted-combat demo (`src/ui/CombatDemo.tsx` + `src/app/demoFight.ts`),
which shows both sides running scripts through the interpreter but with **no traits or statuses**
(every demo creature has `innateTraitIds: []` and no `appliesStatus` content). Phase 3.5 wires
**real Phase 3 content** onto the demo parties so the fight itself produces trait/status behavior —
so the effect system is visible in the browser before the Phase 7 combat UI exists.

Key starting fact: **`describeEvent` already handles every Phase 3 event** (`TriggerFired`,
`StatusApplied`, `StatusExpired`, `HealApplied`, `StatModifierApplied`, `HpClamped`,
`CascadeTruncated`) — they were front-loaded for exhaustiveness. So this phase is **almost entirely
content wiring**, not rendering work. The parties just never trigger any of it today.

## Guardrails (same as the 1.5 / 2.5 harnesses — do not violate)

- **Throwaway.** Phase 7 (Combat UI & feedback) replaces this. Keep the "throwaway harness" comments.
  Do **not** grow it toward real combat UI (sprites, health bars, animation) or a status-authoring
  UI. It is a *viewer*, not an editor.
- **Engine stays pure.** The demo only *consumes* the engine (imports from `src/engine`, renders in
  `src/ui`/`src/app`). Nothing in `src/engine` may take a React/DOM/UI dependency.
- **Use real content, not test fixtures.** Traits from `src/data/traits.ts`, statuses from
  `src/data/statuses.ts`, spells from `src/data/spells.ts`, scripts from `src/data/scripts.ts` — or
  hardcoded demo party data in `src/app`. **Never** import from `src/engine/__fixtures__`.
- **Determinism visible.** Keep a fixed `DEMO_SEED`; a run is reproducible. (Tune the seed/parties so
  the target mechanics actually appear — see below.)

## Scope

### 1. Wire real traits + a DoT spell onto the demo parties (`src/app/demoFight.ts`)
Assign `innateTraitIds` and an `appliesStatus` spell so the fight naturally produces the mechanics
ROADMAP 3.5 calls for (**triggered effects firing, DoT ticking, stun skipping a turn**). All of the
following are **real shipped content** and need no new engine/data work:

- **Triggers firing (`TriggerFired`):** give a durable front-line creature `retaliate`, and a second
  `vengeful` (conditional retaliate — fires only below 50% HP, so the log shows it *not* firing early
  then firing once damaged — the read-time condition made visible). `grudge` on a creature whose
  ally dies shows `on-ally-death` → `StatModifierApplied`.
- **DoT ticking (`StatusApplied` → `'dot'` `DamageDealt` per tick → `StatusExpired`):** give a caster
  `venom-bolt` (equipped spell; `appliesStatus: poison, duration 3`) via `always-cast`. Poison then
  ticks at each round-end and expires — provided the fight lasts ≥3 rounds against a target that
  survives that long (tune for this; see §3).
- **Stun skipping a turn:** give a creature `reeling` (`on-damage-taken` → apply `stun` 1r). When it
  takes a hit and survives to its next turn, `on-turn-start` suppression yields an **empty bracket**
  (its `TurnStarted`/`TurnEnded` with no action between) — the visible "skipped turn."
- **Regen / `HealApplied` (throwaway demo trait):** author a **demo-only trait** (hardcoded demo
  content in `src/app`, like the demo parties — *not* added to the shipped `src/data/traits.ts`
  roster, clearly commented throwaway) that applies `regen` off a wired trigger, so regen arises
  naturally in-fight rather than being seeded. **Recommended: `on-damage-taken → apply regen to
  self`** on the provoking tank (draws fire, regenerates when hit — reads on-theme; `HealApplied` is
  the only *positive* number in the log). `on-turn-start → apply regen` is a fine alternative. NB:
  there is **no per-action hook** (no `on-provoke`/`on-cast`; `on-ally-action`/`on-enemy-action`
  exist in the `Hook` type but are **unwired**), so hang it off `on-damage-taken`/`on-turn-start`.
  Keep the trait demo-scoped (pass an augmented registry to `createCombat` if the lookup allows,
  rather than polluting the shipped roster).
- **Damage-modifier status (`weaken`, real):** **keep** `catastrophic-collapse` — it applies `weaken`
  (dealt −%) to an ally on its own death, showing a `damage-modifier` status shift arising from real
  content. Its self-kill only *read* as a bug because the log didn't explain it; the self-damage
  rendering in §2 fixes that, so it reads as an intentional showcase (creature collapses → dies →
  weakens ally). No status seeding needed as a result.

### 2. Extend `describeEvent` for DoT + self-damage rendering (`src/ui/CombatDemo.tsx`)
Two small rendering tweaks so the log reads clearly:
- **DoT attribution:** the `DamageDealt` case currently ignores the new `statusId`. Make a `'dot'`
  tick render its source status, e.g. `"<creature> took 3 poison damage (dot) -- N HP left"`, falling
  back to the existing line for `attack`/`cast`. This is what makes Item-1's `statusId` pay off.
- **Self-inflicted damage:** when `sourceId === targetId`, render distinctly, e.g. `"<creature>
  collapses, taking 999 self-inflicted damage -- 0 HP left"`, so `catastrophic-collapse` (and
  `reckless`) read as intentional rather than as a stray big hit. Generic self-damage rule — no
  per-trait special-casing.

Everything else in `describeEvent` already covers Phase 3.

### 3. Tune for visibility (deterministic)
Because the demo is seeded, "the mechanics appear" is a deterministic fact you can verify by reading
the event log at `DEMO_SEED`. Adjust stats/scripts/seed until a single run's log visibly contains:
a `TriggerFired` (retaliation), a poison `StatusApplied` followed by `'dot'` ticks and a
`StatusExpired`, and a stun-induced empty-bracket turn. Keep the parties small and legible (~4–5 a
side is fine; they don't all need traits).

### 4. Demo UX — randomize seed + timed playback (new for 3.5; **carries forward to all future `.5` demos**)
Two presentation features so the demo is watchable by an audience. **Both are UI-only — the engine
stays synchronous, pure, and deterministic; neither may touch `src/engine`.** These become baseline
for every subsequent demo harness, not a 3.5 one-off.

**4a. Randomize-seed button.** A button that picks a new seed and re-runs, so runs differ.
- Seed *selection* randomness (`Date.now()` / `Math.random()`) lives in `src/app`/`src/ui` **only** —
  never in the engine. `resolveFight(seed)` stays deterministic: same seed → identical fight.
- **Display the current run's seed** on screen so a good fight is reproducible (this keeps
  "determinism visible"). An input box to replay a specific seed is optional (see decisions).
- Prior briefs already listed a "new seed" button as an optional nicety; 3.5 makes it required.

**4b. Timed playback.** Reveal the event log progressively so the fight looks live, instead of
dumping it at once.
- **Cosmetic replay only.** `resolveFight` still computes the whole deterministic log synchronously
  up front; the UI reveals it over time. Do **not** make the engine async or "steppable."
- **Pace on beats, not raw events.** ~0.5s × every event is a 40–60s crawl (a full fight is easily
  80–120 events). Delay on the meaningful beats — each turn's action and each `TriggerFired` — and
  reveal that beat's consequence lines (`DamageDealt`, `StatusApplied`, …) with it. Target a full
  fight playing in **~15–30s** (~0.5s per beat is a fine default).
- Add a **"skip to end"** control (reveal the remainder instantly).
- **Timer hygiene:** clear the timer on unmount and whenever a new run starts — "Run again" /
  randomize-seed **mid-playback** must cancel the in-flight reveal and restart. Stacked/leaked timers
  are the bug to avoid. (A CSS-stagger reveal — inline `animation-delay: index * step` — is a valid
  lower-bug alternative that avoids JS timers; agent's choice.)
- **Still a viewer, still throwaway.** Paced text only — **not** the start of a Phase 7 combat
  animation system: no sprites, health bars, tweening, or sound. Keep it dead-simple, comment it
  throwaway.

## Acceptance

- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` all pass.
- Locally, one run's rendered log **visibly** shows: at least one triggered effect firing
  (`TriggerFired`), a poison DoT applied → ticking each round-end → expiring, and a stun skipping a
  turn (empty bracket). Final `result` shown as before.
- **Randomize seed** produces visibly different fights across clicks; the **seed is displayed** for
  the current run.
- **Playback** reveals the log progressively (paced on beats, ~15–30s for a full fight), with a
  working **"skip to end"**; starting a new run mid-playback cancels the in-flight reveal cleanly (no
  duplicated/leaked timers).
- Deployed: the demo renders at `https://thedutchspoon.github.io/Depths-of-Souls/` and a run shows
  traits + statuses driving the fight, playing out live — the proof Phase 3's effect system works
  end-to-end.
- Does **not** touch `src/engine`, the golden suite, or any `__fixtures__`; reads only the engine's
  public API and real `src/data` content.

## Decisions (settled with the human — build to these)

1. **Regen shown via a throwaway demo trait, not seeding.** No status is pre-seeded. Regen arises
   from a demo-only trait (`on-damage-taken → apply regen to self`, recommended, on the provoking
   tank), so it appears naturally in-fight like poison/stun. See §1. **Burn: skip** (redundant with
   poison). **Vulnerability: optional** — `weaken` (via #2) already demonstrates the damage-modifier
   category; add a second demo trait for vulnerability only if you want the mirror shown.
2. **Keep `catastrophic-collapse`.** It's the real-content source of a `weaken` (damage-modifier)
   showcase. Its self-kill reads as intentional once §2's self-inflicted-damage rendering lands
   (collapses → dies → weakens ally). No seeding needed.
3. **Add the presence smoke test.** One test runs `resolveFight` on the demo parties at the fixed
   `DEMO_SEED` and asserts ≥1 `TriggerFired` and ≥1 `StatusApplied` — guards against a retune
   silently gutting the demo. Asserts *presence*, not a full log; lives with the demo, not in
   `__golden__`; pins `DEMO_SEED`, so the randomize button doesn't destabilize it.
4. **Playback: ~0.5s per beat, target ~15–30s/fight, with a "skip to end" button.** Pace on beats
   (each turn's action, each `TriggerFired`), never per raw event.
5. **Seed: display required, type-a-seed input box included.** The box lets friends share seeds
   ("try 12345"); drop it only if it genuinely fights the layout.

## Notes

- No new engine, data, or golden work — content wiring (incl. one demo-scoped trait), two small
  `describeEvent` tweaks (DoT attribution + self-damage), and the two UI-only demo-UX features (§4).
  All of it consumes the engine's public API; `src/engine` is untouched.
- After this interlude: **Phase 4 — Party, specializations, the cave & biomes** (see `ROADMAP.md`).
