# Phase 0.5 — Deploy checkpoint

Status: **done — live at `https://thedutchspoon.github.io/Depths-of-Souls/`, confirmed by
the user.**

## What was built

- **`vite.config.ts`**: `base` is now mode-driven — `'/Depths-of-Souls/'` for `production`
  builds (what `vite build` uses by default), `'/'` otherwise (local `vite dev`). Matches
  CONVENTIONS' "environments are driven by Vite mode" rule and avoids the classic Pages
  gotcha (project sites serve from a subpath; omitting `base` 404s the JS bundle).
- **`.github/workflows/deploy.yml`**: one workflow, three jobs. Each job uses
  `actions/setup-node` pinned to **Node 24** (matches the local dev toolchain — Node
  v24.14.1 — so "passes locally, fails in CI" from a Node-version mismatch isn't a risk
  here).
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
- **`package.json` was not touched.** `lint`, `format:check`, `test`, and `build` are all
  pre-existing Phase 0 scripts (`format:check` → `prettier --check .`, the non-writing
  variant — the writing one, `format` → `prettier --write .`, is deliberately not what CI
  runs, since `--write` would make a CI check "pass" by silently reformatting instead of
  failing on unformatted code). The workflow doesn't invent or rename anything.

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

## Incident: four consecutive deploys stuck at `deployment_queued`, then failed

After pushing, the first live run's `deploy` job never got past `deployment_queued` and
the workflow run's own conclusion ended up **cancelled**. A second push produced a second
run where `test` and `build` both succeeded, but `deploy` sat in the Pages backend's queued
state for **exactly 10 minutes** before `actions/deploy-pages` hit its own internal timeout
and failed the job. Confirmed via the (unauthenticated, public) GitHub REST API — no
guessing from Actions-UI text alone:

- `GET /repos/.../actions/runs` — run 1: `cancelled`; run 2: `test`/`build` success,
  `deploy` `failure`.
- `GET /repos/.../deployments/{id}/statuses` — both Pages deployments show
  `waiting → queued → in_progress → error|failure`, i.e. they were genuinely accepted and
  marked in-progress, but the Pages backend never actually finished processing either one.

**Root cause (one confirmed, one contributing/likely):**
- **Confirmed bug in the workflow I wrote**: the `deploy` job's concurrency was governed by
  the *workflow-level* `concurrency: { group: ${{ github.workflow }}-${{ github.ref }},
  cancel-in-progress: true }`. GitHub's own official Pages-deploy template deliberately
  avoids this — cancelling a run that has an **in-flight Pages deployment** can leave the
  `github-pages` environment's internal deployment lock in a bad state, which is a plausible
  explanation for why the *second* attempt got stuck queued behind the *first* one's abrupt
  cancellation.
- **Likely contributing factor**: this was the repo's first-ever Pages deployment (Pages had
  only just been switched on). A stuck/slow first deployment while GitHub finishes
  provisioning the Pages environment is a commonly reported one-time hiccup, independent of
  anything in this workflow.

**Fix #1 applied**: gave the `deploy` job its own job-level concurrency override —
`group: pages`, `cancel-in-progress: false` — so it can never be killed mid-flight; a
newer push's deploy will queue behind an older one instead of cancelling it. The
workflow-level group (cancel-in-progress: true) still applies to `test`/`build`, so CI
still cancels stale runs for those — only the actual Pages deploy step is protected.

**This did not fix it.** A retry after Fix #1 stalled and failed identically (10 minutes,
same status sequence). The user then reset the Pages environment via Settings → Pages
(switched Source away from "GitHub Actions" and back), then re-ran — a fourth attempt,
which *also* stalled with the identical signature. Four consecutive identical failures
survived both a workflow fix and a full source-side reset, which pointed at something
structurally missing from the workflow itself rather than transient backend state.

**Fix #2 — the actual root cause, found in GitHub's own docs**
(`using-custom-workflows-with-github-pages`): the documented reference workflow for a
custom (non-`actions/starter-workflows`) Pages deploy includes an **`actions/configure-pages`**
step in the build job, run *before* the build and artifact upload. This workflow never had
it. GitHub's docs explicitly call out a closely-related failure mode for a different
missing piece ("Not setting `needs` may result in an independent deployment that
continuously searches for an artifact that hasn't been created") — i.e. the exact
"accepted, marked in-progress, then wedged forever" shape seen here, just from a different
missing prerequisite (`needs` was already set correctly in this workflow; `configure-pages`
was not present at all). Without it, the deployment is never properly registered/
initialized against the Pages backend before the artifact shows up, which is a plausible
explanation for every attempt being accepted (`waiting → queued → in_progress`) but never
actually processed.

Added `actions/configure-pages@v5` as the second step of the `build` job (right after
checkout, before `setup-node`/`npm ci`/`npm run build`), matching the order in GitHub's
reference example. Re-validated as syntactically valid YAML and correctly Prettier-formatted.
**Not yet confirmed live** — the next push/retry is what actually proves this fixed it.

*(Aside for later: `actions/configure-pages` also emits a `base_path` output reflecting the
real configured Pages path, which could replace the hardcoded `/Depths-of-Souls/` in
`vite.config.ts` with something that derives automatically — worth revisiting if/when
PR-preview deploys are ever built, since previews need a different subpath per PR. Not done
now; out of scope for just fixing the stuck deploy.)

## Resolution

While the fourth attempt was still stalled, a **live GitHub Pages platform incident**
turned up on `githubstatus.com` (title: "Incident with Pages," status `investigating`,
impact `minor`, started **16:54:10 UTC** — well after the first two attempts, but squarely
inside the fourth attempt's stall window). This was very likely the actual proximate cause
of at least the third and fourth stalls: no workflow-level fix can route around a platform
incident. Earlier in this incident I stated the status page showed "fully operational, no
incidents" — that was accurate *at the time I checked* (~16:37), but I didn't re-check it
on every subsequent failure and kept chasing workflow-level causes instead; the incident
started later and I only found it after being pushed to look again.

Once GitHub's incident cleared, a retry — with both Fix #1 (deploy job concurrency) and
Fix #2 (`actions/configure-pages`) already in place — succeeded. **Confirmed directly by
the user**; not independently re-verified via the API in this session. Both fixes stay in
the workflow going forward: they're correct per GitHub's own documented pattern regardless
of the fact that the platform incident, not these bugs, was the actual blocker on this
particular day.

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

## Next

Phase 1 — the pure combat resolver. See `ROADMAP.md`.
