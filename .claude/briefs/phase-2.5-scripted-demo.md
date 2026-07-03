# Phase 2.5 (interlude) — Scripted combat demo (visual harness)

Status: planned (not yet built)

Task brief for the coding agent. **Not a design phase** — a throwaway visual demo, done after
Phase 2 (actions, spells & the scripting interpreter) is merged. Single deliverable, one PR.

Working style reminder: the user handles all commits/pushes. Everything below is code + local
verification; the real acceptance test happens once it's on the live Pages URL.

This is the successor to the Phase 1.5 demo harness (`src/ui/CombatDemo.tsx`), which showed a
single hardcoded fight. Phase 2.5 upgrades that demo to show **scripted** combat — both sides
running real scripts through the Phase 2 interpreter — so the scripting system is visible in the
browser before the real Phase 6 authoring UI exists.

## Guardrails (same as the Phase 1.5 harness — do not violate)

- **Throwaway.** Phase 7 (Combat UI & feedback) replaces this. Comment it as such. Do **not** grow
  it toward real combat UI (sprites, health bars, animation) or toward a real script-authoring UI
  (that is Phase 6). This is a *viewer*, not an editor.
- **Engine stays pure.** The demo is a *consumer* of the engine: it imports from `src/engine/` and
  renders in `src/ui`/`src/app`. Nothing in `src/engine/` may take a React/DOM/UI dependency. If
  building the demo tempts you to push a rendering concern into the engine, that is the line not to
  cross.
- **Use real content, not test fixtures.** Parties and scripts come from real data (`src/data/`,
  e.g. the five stock scripts) or hardcoded demo data in `src/app` — **never** imported from
  `src/engine/__fixtures__` (test-only).
- **Determinism visible.** Default to a fixed seed so a run is reproducible; a "new seed" button is
  optional.

## Scope

Replace (or extend) the Phase 1.5 `CombatDemo` with a scripted-combat view:

- **Both sides run scripts** via the interpreter — reuse the five stock scripts from Phase 2
  (`always-attack`, `always-cast`, `always-defend`, `always-provoke`, `always-wait`) assigned across
  a small demo party on each side, so the viewer shows heterogeneous per-creature behavior (one
  creature attacking, one casting the 30% AOE, one defending, one provoking).
- At least one creature per side should have a **gem equipped** so `always-cast` actually fires the
  30%-Intelligence all-enemies spell — this makes the AOE and the spellPower coefficient visible.
- **Render the event log** produced by `resolveFight`, readable as before (extend the existing
  `describeEvent` to cover the new intent event `SpellCast` and, if present by then, any new
  consequence events). Show the final `result`.
- A **"Run fight" / "Run again"** button. Same minimal styling effort as the 1.5 harness — text /
  `<pre>` is fine.
- Optional nicety (only if cheap): let the viewer pick which stock script each demo creature uses
  from a dropdown, to show different scripts producing different fights. Skip if it adds real
  complexity — the point is to *see the interpreter run*, not to build an editor.

## Acceptance

- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` all pass.
- Locally, clicking the button renders a full event log for a scripted fight where both sides took
  scripted actions (visible Attack, Cast/AOE, Defend, Provoke in the log).
- Once pushed and deployed: the scripted demo renders at
  `https://thedutchspoon.github.io/Depths-of-Souls/` and running a fight shows the interpreter
  driving both sides — the live proof that Phase 2's scripting works end-to-end.

## Notes

- Does not touch engine logic, the interpreter, or the golden suite — it only *reads* the engine's
  public API (`createCombat`, `resolveFight`, the event types) and the stock-script data.
- After this interlude: **Phase 3 — Traits as data** (see `ROADMAP.md`).
