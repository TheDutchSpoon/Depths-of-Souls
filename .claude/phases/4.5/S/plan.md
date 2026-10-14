# Plan — 4.5-S: The simulator runs in Actions after each merge

Read: `.claude/CLAUDE.md`, `workflow/coding-rules.md`, the kickoff and slice brief,
`phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`, `.github/workflows/deploy.yml`,
`package.json#scripts.sim`, `src/state/balance-sim.test.ts` (lines 122-130),
`formatSpec`/`formatReport` in `src/state/balance-sim.ts` (lines 1780-1896), and
`phases/4.5/B2/evidence/balance-and-runtime.md`. No spec file is touched or needed.

## Approach and module changes, by file

Exactly one new file outside the mailbox: `.github/workflows/sim.yml`. No change to `deploy.yml`,
`package.json`, `src/`, the report, the tests, the spec or `CONVENTIONS.md`.

### `sim.yml` shape

```yaml
name: Simulator report

on:
  push:
    branches: [main]
  pull_request:
    paths: ['.github/workflows/sim.yml']
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: sim-${{ github.ref }}
  cancel-in-progress: false

jobs:
  sim:
    runs-on: ubuntu-latest
    timeout-minutes: 120          # ASSUMPTION A1
    steps:
      - uses: actions/checkout@v7
        with: { persist-credentials: false }
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - name: Run the simulator
        shell: bash               # explicit shell turns on pipefail, so vitest's exit code survives tee
        run: npm run sim 2>&1 | tee sim-report.txt
      - name: Summarise
        if: success()
        shell: bash
        run: <extraction, below>
      - uses: actions/upload-artifact@v7   # ASSUMPTION A2
        if: always()
        with:
          name: sim-report
          path: sim-report.txt
          if-no-files-found: warn
```

Choices and why:

- **Triggers**: `push` to `main` only; `pull_request` with `paths: ['.github/workflows/sim.yml']`
  only; `workflow_dispatch`. No tags, no schedule, no unfiltered `pull_request`
  (kickoff Traps).
- **Concurrency**: own group `sim-<ref>`, `cancel-in-progress: false`, at workflow level. It
  can't collide with deploy's `CI & Deploy-<ref>` or `pages`. Per-ref (not one global group) so a
  tuning branch's `workflow_dispatch` doesn't sit in `main`'s queue; a second merge during a
  `main` run queues, and a third replaces the pending second, as the brief accepts. ASSUMPTION A3.
- **Permissions**: `contents: read` only, no `pages`/`id-token`. `persist-credentials: false`.
- **Node/npm**: `node-version: 24`, `cache: npm`, `npm ci`, `checkout@v7`, `setup-node@v7`, as
  `deploy.yml`.
- **Report-only**: the sim step fails only on a non-zero exit (vitest failure or timeout). No
  grep-and-exit, no threshold in YAML. The summary step prints `PASS`/`FAIL` as the report does and
  always exits 0 once it has run. A missing line prints `n/a`, never fails the step
  (ASSUMPTION A5).
- **Capture**: `npm run sim 2>&1 | tee sim-report.txt`. The artifact is that file whole, vitest
  decorations included. `if: always()` so a failed or timed-out run still uploads the partial
  output for diagnosis. `sim-report.txt` is written in the workspace, not committed.

### Extraction step (to be quoted in the report with the lines it matches)

One `awk` pass over `sim-report.txt`, anchored on the literal report text, never on line numbers
or tail counts. Leading whitespace is tolerated (`^[[:space:]]*`) because vitest may indent
captured `console.log` output.

| Output | Report line it matches (`balance-sim.ts`) | Anchor |
| --- | --- | --- |
| spec name (the current section) | `formatSpec` line 1783: `=== <specId> (<n> seeds) ===` | `^[[:space:]]*=== (.+) \([0-9]+ seeds\) ===` |
| round-cap draw rate | `formatSpec` line 1841: `Draws: <d>/<f> fights = <p>; round-cap draws <c> = <pct>` | first `^[[:space:]]*Draws:` after a header; capture from `round-cap draws ` to end of line |
| three verdicts | `formatReport` line 1892: `  <specId>: floor-1 PASS, first soul PASS, floor 5 PASS` | only after `CI thresholds summary (reported, not asserted):`; match `^[[:space:]]*<spec>: floor-1 (PASS\|FAIL), first soul (PASS\|FAIL), floor 5 (PASS\|FAIL)` |
| runtime | test line 128: `Runtime: <n> s` | `^[[:space:]]*Runtime: [0-9.]+ s` |

Summary written to `$GITHUB_STEP_SUMMARY` as a Markdown table, one row per spec:
`spec | floor-1 | first soul | floor 5 | round-cap draws`, then a `Runtime: <n> s` line, then a
pointer to the `sim-report` artifact. The spec set comes from the report's own headers (so a new
spec appears without a YAML edit); the three expected today are `sorcerer`, `brute`,
`shieldbarer`. The `Draws:` capture is the first `Draws:` line after each `===` header; I will
confirm in `formatSpec` that no earlier line in a spec block starts with `Draws:` (lines 1783-1841
read: none do) and that matchup/other rows are indented differently.

The extraction script is inline in the YAML (no separate file, to keep "one added file").

### Local checks before handing over (outside the repo)

- Build a fixture from the exact `formatSpec`/`formatReport` strings (three specs, vitest-style
  `stdout | …` headers, indented and unindented variants, plus a `Runtime:` line) in the scratchpad,
  run the same extraction command against it, and show the table. Also a negative fixture (no
  `Runtime:`, a `FAIL` verdict) to show it prints `n/a` / `FAIL` and exits 0.
- `actionlint` on `sim.yml` if it can be run via `npx`/binary; otherwise a YAML parse and a
  note that actionlint was not run.
- The full gates from `coding-rules.md` (nothing they read changes; run to confirm green).
- I will not run `npm run sim` locally (`CONVENTIONS.md#balance-simulator`'s ~25 min; the real run is
  the PR's).

## Golden policy (restated)

Byte-identical: every golden, every test, every content doc. The corpus digest is untouched (no
`src/` change). `git diff --stat origin/main` shows exactly one added file outside the mailbox,
`.github/workflows/sim.yml`. No `npm run corpus:update`.

## Mechanism → test that fails with it removed

A workflow has no unit tests, and the slice may add no other file. The "test" for each mechanism
is a named observation on the PR's own run or on the workflow text, plus the local fixture check
where it applies. Honest limit: `push`-to-`main` and `workflow_dispatch` cannot fire until the
file is on `main`; for those the proof is the workflow text only, and the report says so.

| Mechanism | Fails-without evidence |
| --- | --- |
| `pull_request` + `paths` trigger | Remove it: no `sim.yml` run on the PR, so "a green run on the PR itself" cannot be shown. Also check no `sim.yml` run appears on a PR that doesn't touch `sim.yml` (not testable inside this PR; the filter is read from the text). |
| `push: branches: [main]` | Text only; unobservable until merge (first `main` push after merge shows it). |
| `workflow_dispatch` | Text only; unobservable until merge. |
| Own concurrency group, `cancel-in-progress: false` | Text; group name differs from `CI & Deploy-…` and `pages`. Not exercisable in one PR run. |
| `permissions: contents: read` | Text; and the run's "Set up job" log shows `GITHUB_TOKEN Permissions: Contents: read` only. |
| `persist-credentials: false` | Text; checkout step in the log. |
| `timeout-minutes` | Text; the job page shows the limit. |
| `shell: bash` + `tee` + pipefail | Local check: `bash -e -o pipefail -c 'false \| tee /dev/null'` exits 1, and without pipefail exits 0. That demonstrates a failing `npm run sim` would be hidden by `tee` if the explicit shell were removed. |
| Anchored extraction | Fixture run: shuffle/indent the fixture lines and add noise lines (`Test Files`, `Duration`); the table is unchanged. Break an anchor (e.g. drop `CI thresholds summary` gating) and a spec's verdicts stop being matched, so the table shows `n/a`. |
| Summary never fails on a number | Negative fixture: a `FAIL` verdict appears as `FAIL`, step exit code 0. |
| Artifact upload | PR run: artifact `sim-report` present and its content is the full captured output; saved under `phases/4.5/S/evidence/`. |

## What the PR must prove — how I'll supply it

All of these need Duncan's push; I do not commit. After the push and the green run I need the run
URL, the summary text, and the downloaded artifact (or I save the artifact if given the file) to
quote them in `report-r1.md` and put the report under `phases/4.5/S/evidence/`. The report will
quote the extraction commands against the lines in the table above, and show `deploy.yml`
byte-identical (`git diff origin/main -- .github/workflows/deploy.yml` empty).

## Assumptions checklist

1. **A1 — `timeout-minutes: 120`.** Local `npm run sim` took 1515 s (25m16s) on Duncan's machine
   after B2's +39% (`phases/4.5/B2/evidence/balance-and-runtime.md#runtime-same-machine-the-reversal-tree-standing-in-for-main`).
   A 2-vCPU `ubuntu-latest` runner is unmeasured; 120 min is ~4.7× that and matches the test's own
   2-hour timeout, well under GitHub's 6 h default. If the PR run is much slower than 25 min, the
   number moves.
2. **A2 — `actions/upload-artifact@v7`.** GitHub's releases API for `actions/upload-artifact`
   (`/repos/actions/upload-artifact/releases/latest`) returned `v7.0.2`, published 2026-10-07,
   checked in this session (not from memory). Please confirm you accept a major published a week ago
   alongside `checkout@v7`/`setup-node@v7`.
3. **A3 — concurrency group `sim-${{ github.ref }}`** (per ref) rather than one global group. A
   global group would serialize a tuning branch's dispatch behind `main`'s run.
4. **A4 — vitest `console.log` output reaches stdout with the report lines intact** (each on its
   own line, possibly indented) under `--silent=false`, in the CI environment. Extraction tolerates
   leading whitespace but not wrapped lines. Verified only against a hand-built fixture until the PR run.
5. **A5 — a missing extracted line prints `n/a` and the step still exits 0** (report-only; a
   truncated report is surfaced in the summary and artifact, but the sim step's own exit code is
   what turns the run red).
6. **A6 — the summary lists specs from the report's headers** rather than hard-coding
   `sorcerer`, `brute`, `shieldbarer`.
7. **A7 — `if: always()` on the artifact upload** so a failed/timed-out run still uploads partial
   output; and `if: success()` on the summary.
8. **A8 — `ubuntu-latest`** as in `deploy.yml`, with `cache: npm` (the cache key comes from
   `package-lock.json`, so a first run is a cache miss).
