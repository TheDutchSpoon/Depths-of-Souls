# Phase 0 — Skeleton

Status: **done**. Matches `ROADMAP.md`'s Phase 0 checklist.

## What was built

- **Toolchain**: Vite 7 + React 19 + TypeScript 6 (`strict: true`, explicitly added —
  the current `create-vite` template does not set it by default), npm as the package
  manager.
- **Lint/format**: ESLint 9 (flat config in `eslint.config.js`: `@eslint/js` +
  `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`,
  with `eslint-config-prettier` to defer style to Prettier) + Prettier
  (`.prettierrc.json`, `.prettierignore`). The template defaults to `oxlint` instead of
  ESLint — swapped out to match `ROADMAP.md`'s explicit "ESLint/Prettier" requirement.
- **Tests**: Vitest, configured with the `jsdom` environment (via `vitest/config`'s
  `defineConfig` in `vite.config.ts`) ahead of when UI tests will need it.
- **State**: Zustand.
- **Folder layout** under `src/`, per `CONVENTIONS.md`: `engine/`, `data/`, `state/`,
  `ui/`, `app/`.

## Phase 0 deliverables

- `src/engine/rng.ts` — seeded RNG (mulberry32), the only source of randomness allowed
  in `src/engine` (never `Math.random()`).
- `src/engine/rng.test.ts` — determinism test: same seed → identical sequence, plus a
  different-seeds and an output-range check.
- `src/state/store.ts` — Zustand store holding a `tick` counter.
- `src/app/App.tsx` — trivial game loop (`setInterval` incrementing the store once a
  second) and root wiring; renders `src/ui/TickCounter.tsx`.
- `src/data/` — empty (`.gitkeep` only); no content authored yet (see the biome-roster
  note in `GAME_DESIGN.md` §13 — deliberately deferred).

## A real dependency conflict, and how it was resolved

The scaffold initially resolved **Vite 8** + `@vitejs/plugin-react@6`, but
**Vitest 3.2.6** only supports Vite `^5 || ^6 || ^7` — not 8 (Vite 8 was too new for
Vitest to have caught up). This surfaced as a TypeScript error on the merged
`vite.config.ts` (`test` property not recognized on `UserConfigExport`), not just a
runtime issue. Fix: pinned `vite` to `^7.3.6` and `@vitejs/plugin-react` to `^5.2.0`
(the last major that targets Vite 7), which brought everything — including Vitest's
own nested `vite-node`/`@vitest/mocker` dependencies — onto the same major version.

## Verification performed

- `npm run build` (`tsc -b && vite build`) — passes.
- `eslint .` — passes.
- `prettier --check .` — passes (`.claude/**` is excluded from Prettier's scope; it's
  hand-authored prose, not code).
- `vitest run` — 3/3 tests pass (the RNG determinism suite).
- Actually launched the dev server and drove it with Playwright + Firefox (no
  `chromium-cli` available in this environment): confirmed the page renders the
  "Depths of Souls" heading and the `Ticks: N` counter increments once per second
  (0 → 2 over ~2.2s), with zero console errors.

## Commands

```
npm install     # install dependencies
npm run dev     # dev server
npm run build   # typecheck + production build
npm run test    # vitest run (once)
npm run lint    # eslint .
npm run format  # prettier --write .
```

## Next

Phase 1 — the pure combat resolver (`Creature`/`Action`/`CombatState`/`CombatEvent`
types, Speed-ordered turn resolution, Attack-only to start, golden-replay test). See
`ROADMAP.md`.
