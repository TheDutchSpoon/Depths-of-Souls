# Phase 1.5 (interlude) — Tooling + engine demo harness

Status: shipped

Task brief for the coding agent. **Not a design phase** — this is infrastructure + a throwaway
dev harness, done between Phase 1 (combat engine, merged) and Phase 2 (scripting interpreter).
Two independent deliverables; they can land as two separate PRs.

Working style reminder: the user handles all commits/pushes. Everything below is code + local
verification; the real acceptance test for the demo happens once it's on the live Pages URL.

---

## Deliverable A — Dependabot

Add automated dependency updates now, while the tree is small, green, and well-pinned — every
bump then arrives as a small PR pre-vetted by CI (lint + 63 tests + build).

**Create `.github/dependabot.yml`** covering **two** ecosystems:

- `npm` (the project dependencies)
- `github-actions` (the action versions pinned in `.github/workflows/` — these go stale silently
  and are a real supply-chain surface; do not omit this one)

**Settings:**
- **Weekly** cadence (daily is noise for a solo project).
- **Group minor + patch** updates into a single PR per ecosystem (Dependabot's `groups` feature),
  so routine bumps don't fragment into many PRs.
- **Major** updates stay **separate** (one PR each) — they deserve individual scrutiny.
- No auto-merge. CI already gates every bump; the user reviews/merges manually. A bump that passes
  CI but isn't wanted yet (e.g. a major React bump mid-Phase-2) is simply closed.

**Acceptance:** the file is valid; Dependabot is enabled on the repo (repo owner may need to
confirm it's on in repo settings → the config file activates it); the first scheduled/triggered run
opens grouped PRs that pass the existing CI workflow.

---

## Deliverable B — Engine demo harness (throwaway)

The live Pages site currently shows the Phase 0 tick counter. The combat engine works (63 tests
prove it) but nothing *visual* demonstrates it. This adds the first page that runs real engine code
in the browser.

**This is an explicitly throwaway dev harness that Phase 7 (Combat UI & feedback) replaces.**
Comment it as such at the top of the component. Do **not** grow it toward "real" combat UI
(sprites, health bars, animation) — that is Phase 7 scope and depends on Phase 4 content that does
not exist yet. Resist the creep.

**Scope (deliberately minimal):**
- The demo **replaces the tick counter as the Pages root**. The tick counter's job (prove the
  deploy pipeline works) is now done better by the demo running actual engine code.
- One or two **hardcoded parties** (reuse the shape from the engine, but define them in
  `src/app`/`src/ui` — see the guardrail below; do **not** import test fixtures from
  `src/engine/__fixtures__` into shipped app code).
- A **"Run fight" / "Run again"** button that calls `createCombat(...)` → `resolveFight(...)`.
- Render the returned **event log** as plain, readable output — a `<pre>` block or a simple list of
  one line per event (e.g. `TurnStarted hero`, `DamageDealt hero→goblin 12 (raw 12.22)`,
  `FightEnded win`). Text is fine; no styling effort required. Optionally show the final
  `result`.

**Guardrail (the load-bearing rule — do not violate):**
- The harness is a **consumer** of the engine. It imports from `src/engine/` and renders in
  `src/ui`/`src/app`. It must **not** cause `src/engine/` to take on any React/DOM/UI dependency —
  the engine stays pure. If building the harness tempts you to add a rendering concern into the
  engine, that is the line not to cross. (This is also the dogfooding value: if the engine is
  genuinely pure, importing and running it from the UI is trivial. Any friction here is a signal
  the purity boundary leaked.)
- Keep determinism visible: a fixed seed in the hardcoded fight means "Run again" reproduces the
  same log — a nice implicit demonstration that the engine is deterministic. (A "new random seed"
  button is optional and fine, but the default should be reproducible.)

**Acceptance:**
- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` all pass (same four CI
  gates).
- Locally (`vite preview` or dev), clicking the button renders a full event log for a fight.
- Once pushed and deployed: the demo renders at `https://thedutchspoon.github.io/Depths-of-Souls/`
  and running a fight shows the event log — the live proof that real engine code is deployed.

---

## Notes

- These two deliverables are independent — Dependabot could merge first (pure infra, no app
  change), the demo second, or vice versa.
- Neither touches the engine's logic or the golden suite. The demo only *reads* the engine's public
  API (`createCombat`, `resolveFight`, the event types).
- After this interlude, next up is **Phase 2 — Actions, spells & the scripting interpreter** (see
  `ROADMAP.md`), the actual heart of the game.
