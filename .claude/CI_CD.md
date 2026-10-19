# Depths of Souls — CI/CD

Read this when changing a GitHub workflow, the build or deploy setup, the environments, or a docs
check. The rules every change follows are in `CONVENTIONS.md`.

## CI

### Every pull request runs the gates

- GitHub Actions runs lint, the format check, the docs checks (`citations` and `comments`,
  blocking; `budgets`, reported only) and every test (unit, golden, corpus digest, the balance thresholds) on every
  pull request, every push to `main` and every manual run, so a regression is caught *before*
  merge and `main` stays green and deployable.
- On the same triggers, the `e2e` job installs Playwright's Chromium and runs the end-to-end smoke
  test (`npm run e2e`, `CONVENTIONS.md#three-test-tiers`) against the production build served by
  `vite preview` at the Pages subpath.

### Deploy only from main, only if tests pass

- Four jobs: `test` (the gates), then `build`; `e2e` beside them; `deploy` needs both `build` and
  `e2e`. `build` and `e2e` run on every change, so a pull request also proves the site builds and
  starts a game; only `deploy` is guarded to a push to `main`. Tests, build and smoke test on every
  change, deploy on `main`.

### The simulator report runs after each merge

- `.github/workflows/sim.yml` runs `npm run sim` on every push to `main`, on a manual run for any
  branch (a tuning slice's), and on a pull request that changes `sim.yml` itself: a manual run
  exists only once the file is on `main`, so that `paths` filter is how a change to the workflow
  proves itself. It is a workflow of its own: nothing waits on it, and the gates and the deploy run
  as before.
- Report only: it never fails on a balance number, since every pull request asserts the CI
  verdicts (`CONVENTIONS.md#balance-simulator`). It fails when the run fails (vitest exits non-zero
  or the job times out) and when the run prints no report. The job summary shows, per spec, the
  three CI verdicts and the round-cap draws, plus the runtime; the whole captured output is the
  `sim-report` artifact.
- The summary is read from the report's own lines, in POSIX awk (the runner's `awk` may be mawk):
  `formatSpec`'s `=== <spec> (<n> seeds) ===` header and `Draws:` line, `formatReport`'s
  `CI thresholds summary` block, and the test's `Runtime:` line. A change to those lines changes
  the extraction in `sim.yml` in the same PR. In Actions, the line after vitest's `stdout |` header
  starts with colour codes, so none of those lines may open a `console.log` (the report opens with
  `Balance report:`, and `Runtime:` follows a newline).
- Its own concurrency group per ref, queued and never cancelled: a merge during a run gets its own
  report after it. GitHub keeps one pending run per group, so a third merge inside one run replaces
  the second's pending run.
- Read-only `contents` permission, checkout without persisted credentials, and the same Node and
  `npm ci` as the deploy workflow.

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

## Docs checks

### What the comments check reads

- It enforces `CONVENTIONS.md#comment-why-not-what`.
- `npm run docs:check -- comments` fails CI on a phase or slice id in a `src/` file name of any
  extension, in an identifier (`B5_FIXTURE`, `PHASE_4_…`, `placeholderPhase4Config`) and in a string
  literal (`'h2b2-reapply-p1'`). A string, template or regex literal that is not a module specifier
  or a test title, and the text between JSX tags, also fails on `ASSUMPTION:` and on the markers
  `comments` reads in a comment (ASSUMPTION, phase and slice ids, PR numbers, review words,
  plan-item ids), so `'…before Phase 8'` fails; the workflow words ("brief", "the plan", "grill")
  are not read there, because a player-facing string can hold them. Plan-item letters are `A`-`I`,
  so a derivation handle such as `S1_SCRIPT` or `T98` passes, and a test title may open with one
  (`'E1 ticks first'`).
- In comments and test titles only, it also fails on the history of the code: "legacy … path",
  "moved here from", "first real consumer", "existing implicit behavio(u)r", "keeps working
  unchanged", "'s first file" and "the new `…`" (patterns 21–27). A string literal is not read for
  them: a player-facing string can say "new" or "legacy".
- A rename is proved with `comment-proof <base> --renames <map>`
  (`workflow/pr-review.md#4-verify-claimed-invariants-mechanically`).
- `npm run docs:check -- comments --quotations` lists a quotation within four words of an anchor, on
  either side, that the target's section doesn't hold.
