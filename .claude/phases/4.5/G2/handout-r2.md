# Hand-out r2 — 4.5-G2: The demo, the hub

Fixes on branch `4.5-g2`. Two items: one in the smoke test, one in `record.md`. Nothing under
`src/` changes.

**Golden policy: still byte-identical.** No golden, corpus digest, engine test, store test or
`src/` file changes.

Answer with `report-r3.md`: what changed per item, the mutation in item 1 run and what failed, and
the gates below.

## 1. The smoke test must prove the Pages subpath

`playwright.config.ts` serves the production build at `/Depths-of-Souls/` so the test loads what
deploys (`phases/4.5/brief.md#an-end-to-end-smoke-test`). Today it doesn't prove it: with the
production `base` in `vite.config.ts` dropped to `/`, `npm run e2e` still passes, because
`vite preview` answers `/Depths-of-Souls/` with its `index.html` fallback and serves the assets
from `/`. On GitHub Pages that build loads nothing.

- In `e2e/smoke.spec.ts`, take the `baseURL` fixture and record every request the page makes to
  the preview server's origin whose path doesn't start with the `baseURL`'s path (a
  `page.on('request', …)` listener beside the `pageerror` one, comparing `new URL(…).origin` and
  `.pathname`). At the end, assert that list is empty, next to the page-error assertion.
- A comment says why in one line: the preview serves `index.html` for any path, so only the
  requests show the build's `base`.
- **Mutation:** in a scratch copy, set the production base to `/` while keeping `mode` used (for
  example `base: mode === 'production' ? '/' : '/'`; dropping `mode` fails the build on
  `noUnusedParameters` instead of the test). Run `npm run e2e`: it must fail on the off-base
  requests (expect `/assets/index-*.js`, `/assets/index-*.css` and `/favicon.svg`). Restore, and
  show it passing again.

## 2. `record.md` states the outcome

- The `perkRows` entry in "New, `src/app`" lists `isInactivePerk`, which no longer exists: list
  what the file exports now (`INACTIVE_LABEL`, `chosenSpecialization`, `perkRows`, the level field
  through `parseFloorField`).
- The Tests section reads as two rounds: state `main` → final, by file (2152 → 2210:
  creatureLine 7, debugBoss 3, instanceLabels 6, partyRows 9, perkRows 11, refusals 3 → 7,
  soulRows 6, specSwitcher 5, specializations 12 → 13, store-startgame 6), plus the one
  `npm run e2e` test outside that count.
- The smoke-test paragraph gains the subpath check from item 1.

## Gates

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `npm run docs:check -- comments`, and `npm run e2e`.
