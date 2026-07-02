# Phase 0.5 — Deploy checkpoint

Status: **code + local verification done; first live Actions run pending a push** (the user
handles all commits/pushes — see working agreement).

## What was built

- **`vite.config.ts`**: `base` is now mode-driven — `'/Depths-of-Souls/'` for `production`
  builds (what `vite build` uses by default), `'/'` otherwise (local `vite dev`). Matches
  CONVENTIONS' "environments are driven by Vite mode" rule and avoids the classic Pages
  gotcha (project sites serve from a subpath; omitting `base` 404s the JS bundle).
- **`.github/workflows/deploy.yml`**: one workflow, three jobs.
  - `test` — `npm ci` → `lint` → `format:check` → `test`. Runs on every push *and* every
    pull request (not just `main`), per CONVENTIONS' CI rule ("catch regressions before
    merge").
  - `build` — `needs: test`; `npm run build`, uploads `dist/` as a Pages artifact. Also
    runs on every push/PR, so a broken build is caught pre-merge, not just pre-deploy.
  - `deploy` — `needs: build`; gated on `github.ref == 'refs/heads/main' && github.event_name
    == 'push'`. Uses `actions/deploy-pages`, targets the `github-pages` environment (which
    itself serializes concurrent deployments — no separate locking needed for that).
  - Workflow-level `concurrency` (keyed on workflow+ref, `cancel-in-progress: true`) cancels
    superseded runs of the *same* branch/PR without affecting unrelated branches.

## Prerequisites confirmed before writing any of this

- Repo `TheDutchSpoon/Depths-of-Souls` is **public**, default branch `main` (checked via the
  public GitHub API — no auth needed).
- GitHub Pages **enabled with Source = GitHub Actions** (the one manual step only the repo
  owner could do; `has_pages` flipped `false` → `true` after doing it).
- `origin` remote reachable over SSH, local/remote `HEAD` already in sync.
- No secrets/PAT required — `actions/deploy-pages` authenticates with the workflow's own
  `GITHUB_TOKEN`, scoped via the `pages: write` / `id-token: write` permissions declared in
  the workflow.

## Verification performed locally (mirrors the CI job exactly)

- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` — all pass, run as
  the literal same commands the workflow invokes.
- Built with `--mode production` and confirmed `dist/index.html` references
  `/Depths-of-Souls/assets/...` and `/Depths-of-Souls/favicon.svg`.
- Built with `--mode development` and confirmed the same file references root-relative
  `/assets/...` instead — proves the mode-driven `base` actually branches correctly, not
  just that the production case looks right in isolation.
- Served the production build with `vite preview` and **curled the actual paths**: the JS
  asset 200s under `/Depths-of-Souls/assets/...` and 404s at the un-prefixed path; hitting
  `/` gets a 302 to the base path (expected preview-server behavior, not a bug).
- Validated the workflow file is syntactically valid YAML (parsed with `js-yaml`); no
  GitHub Actions schema linter was available in this environment, so the job graph itself
  was reviewed manually against GitHub's own documented Pages-via-Actions pattern rather
  than tool-verified.

## What's NOT done yet (deliberately deferred)

- **PR-preview deploys** (CONVENTIONS' "each pull request deploys an ephemeral preview").
  The standard artifact-based `actions/deploy-pages` flow used here replaces the *entire*
  site on every deploy — it can't host production plus N live preview subpaths at once.
  Real PR previews need a different, branch-based mechanism (e.g. a persistent `gh-pages`
  branch with per-PR subfolders, via something like `rossjrw/pr-preview-action`), which is
  a separate tooling decision, not a natural extension of this workflow. Flagged for a
  follow-up rather than silently bolted on.
- **IndexedDB per-environment namespacing** — the naming convention is already decided in
  CONVENTIONS (`depths-of-souls` prod / `depths-of-souls-dev`), but no code exists to apply
  it to, since no IndexedDB/save code exists until Phase 5. Nothing to build yet.
- **The actual first live deployment.** Everything above is verified as far as it can be
  without pushing. The real acceptance test — "the tick counter renders and increments at
  the Pages URL" — only happens once this is pushed and the workflow runs for real on
  GitHub's infrastructure.

## Next, once pushed

1. Watch the Actions run (three jobs: test → build → deploy).
2. Visit `https://thedutchspoon.github.io/Depths-of-Souls/` and confirm the tick counter
   renders and increments — the literal Phase 0.5 acceptance test.
3. Then: Phase 1, the pure combat resolver. See `ROADMAP.md`.
