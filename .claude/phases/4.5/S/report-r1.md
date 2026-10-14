# Report r1 — 4.5-S: The simulator runs in Actions after each merge

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed, no living doc edited.
Evidence is in `phases/4.5/S/evidence/extraction-fixtures.md`.

**Open until Duncan pushes:** the PR's own `sim.yml` run, its job summary, the artifact, the sim
step's log header and the runtime. Those can only exist after a push; the sections below marked
**PENDING** are filled from that run (a `/slice-fix` round, or Duncan pasting them).

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1981 passed, 1 skipped, 0 failed (228 files, 1982 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean (also `prettier --check .github/workflows/sim.yml`, which parses the YAML) |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 671 citations in 461 files |
| `npm run docs:check -- comments` | PASS, 7423 comments and 1735 titles in 428 files |

Test count: 1982 on the branch, the same as `main` (228 files); no test file is added or changed
(`git status`: only `sim.yml` and the mailbox). `npm run sim` not run
(`CONVENTIONS.md#balance-simulator`). `actionlint` and `mawk` are not installed here, so neither
ran.

## Golden policy

Byte-identical. `git status --short` shows one untracked file outside the mailbox,
`.github/workflows/sim.yml`; `git diff origin/main -- .github/workflows/deploy.yml` is empty. The
corpus digest is untouched (no `src/` change, no `corpus:update`).

## The workflow text

`permissions: contents: read` only; `persist-credentials: false`; `concurrency: group:
sim-${{ github.ref }}`, `cancel-in-progress: false` (not `deploy.yml`'s group or `pages`);
`timeout-minutes: 120`; `node-version: 24`, `cache: npm`, `npm ci`; `checkout@v7` and
`setup-node@v7` as `deploy.yml`; `upload-artifact@v7`. Triggers: `push` to `main`, `pull_request`
with `paths: ['.github/workflows/sim.yml']`, `workflow_dispatch`.

## The extraction step

POSIX awk only (`match()` with `RSTART`/`RLENGTH`, `sub`, `substr`, `index`, `split` on a regex,
bracket classes; no `\s`, three-argument `match`, `gensub`, interval braces). It runs
`awk '…' sim-report.txt >> "$GITHUB_STEP_SUMMARY"` under `bash -e`, so awk's exit code is the
step's. The report lines it matches, from `formatSpec` and `formatReport` in
`src/state/balance-sim.ts`:

| Output | Report line | Awk anchor |
| --- | --- | --- |
| spec name | `=== <specId> (<n> seeds) ===` (line 1783) | `/^[[:space:]]*=== .* \([0-9][0-9]* seeds\) ===/`, name taken by two `sub`s |
| round-cap draw rate | `Draws: <d>/<f> fights = <p>; round-cap draws <c> = <pct>` (line 1841) | `/^[[:space:]]*Draws:/`, first one after a header, `match($0, /round-cap draws .*$/)`, kept from `RSTART + 16` |
| three verdicts | `  <specId>: floor-1 PASS, first soul PASS, floor 5 PASS` (line 1892) | only after `/^[[:space:]]*CI thresholds summary \(reported, not asserted\):/`; `inSummary && /^[[:space:]]*[^ :][^:]*: floor-1 (PASS\|FAIL), first soul (PASS\|FAIL), floor 5 (PASS\|FAIL)/`; first line per spec wins |
| runtime | `Runtime: <n> s` (test line 128) | `/^[[:space:]]*Runtime: [0-9.][0-9.]* s/` |

The `Draws:` line is the only line in a spec block that starts with `Draws:`; the matchup header
holds `capDraw` but is indented and does not start with it. The in-block `CI thresholds:` line
cannot match the verdict anchor (it has no `<spec>: floor-1 PASS`). A missing line prints `n/a`.
A capture with no `CI thresholds summary` line writes "The simulator printed no report …" to the
summary and exits 1; any verdict, `FAIL` included, exits 0.

## Mechanism → what fails without it

All local runs are in `evidence/extraction-fixtures.md`, run against the `run:` block cut from
`sim.yml` itself.

| Mechanism | Evidence |
| --- | --- |
| Anchored extraction | `noisy.txt` interleaves `✓`, `Duration` and blank lines between every report line: same table as `plain.txt`. Same table under `awk`, `gawk --posix` and `gawk --traditional`. |
| Gating on `CI thresholds summary` | `decoy.txt` has `sorcerer: floor-1 FAIL, first soul FAIL, floor 5 FAIL` before the summary block and `PASS` inside it. With the gate: sorcerer `PASS PASS PASS`. With `inSummary && ` removed: `FAIL FAIL FAIL`. |
| Leading-whitespace tolerance | `indented.txt`: correct table. With `^[[:space:]]*` stripped from every anchor: every verdict `n/a`. |
| Missing report fails | `missing.txt`: `exit=1` and the missing-report line. With `exit 1` → `exit 0`: `exit=0`. A `FAIL` verdict (`brute`, `shieldbarer` in `plain.txt`) exits 0. |
| A missing single line is `n/a` | `partial.txt` (one spec with no `Draws:`, one with no verdict line, no `Runtime:`): `n/a` cells, `exit=0`. |
| `shell: bash` + pipefail | Local: `bash -e -o pipefail -c 'false \| tee /dev/null'` exits 1; without `-o pipefail` it exits 0. PR run: **PENDING**, the sim step's log header must read `shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}`. |
| `pull_request` + `paths` trigger | **PENDING**: the run on the PR. Without the trigger there is none. |
| `push` to `main`, `workflow_dispatch` | Text only, unobservable until merge. |
| Concurrency group, `permissions`, `persist-credentials`, `timeout-minutes` | Text only; the PR run's "Set up job" log shows `Contents: read` only (**PENDING**). |
| Artifact upload | **PENDING**: `sim-report` present with the full captured output. |

## PENDING from the PR run

URL of the green `sim.yml` run; its job summary quoted; the artifact saved under
`phases/4.5/S/evidence/`; the sim step's `shell:` header line; the `deploy.yml` run on the PR
unchanged; the runtime (**if over 60 minutes the review revisits `timeout-minutes`, per A1**).

## Assumptions

A1–A8 as in `plan.md` with the hand-out's amendments. A2: `actions/upload-artifact` v7.0.0
released 26 Feb, v7.0.1 10 Apr, latest v7.0.2 (7 Oct), from the review's check of the releases
page. A4 (report lines reach stdout intact) is settled by the PR run.

## Spec questions

- `CONVENTIONS.md#balance-simulator` still says the full report runs only in a tuning slice; the
  PR review rewrites it. Per the plan review, the rewrite must say the report also runs on a PR
  that changes `sim.yml` (the `paths` trigger stays after the merge).

## Content changes

None.

## To delete

Nothing.
