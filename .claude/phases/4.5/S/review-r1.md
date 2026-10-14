# PR review, round 1 — 4.5-S: The simulator runs in Actions after each merge

Reviewed: PR #111, branch `4.5-s` at `bd64909` ("build"), against `main` at `580fb05` (PR #110's
merge). Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r1.md`, `report-r1.md`,
`evidence/extraction-fixtures.md`, and the living docs on the branch.

## Verdict: fixes

`sim.yml` is right against the brief and the plan as the hand-out corrects it: the triggers,
permissions, concurrency, timeout, toolchain and report-only behaviour are all as specified, and
the extraction gives the right table on real `npm run sim` output, run under mawk (the runner's
`awk` may be mawk or gawk). Every extraction mechanism fails without its guard. There is nothing
to change in the workflow itself.

What is missing is the slice's proof, and a review can't supply it. The done-when and the
kickoff's "The PR must prove" need the PR's own `sim.yml` run quoted in the report: its job
summary, two log lines and its artifact, none of which this review could read signed out (fix 1).
The run is green: it succeeded in 34m 32s and uploaded the `sim-report` artifact, and a green
Summarise step means the capture held the `CI thresholds summary` line. Three cleanup items
besides. Hand-out: `phases/4.5/S/handout-r1.md`.

## Real fixes

1. **The PR run's proof is not in the mailbox.** `report-r1.md` marks it PENDING. The run exists
   and is green: `sim.yml` run 38539664712 on PR #111 (`pull_request`, commit `bd64909`). The
   report must link it, quote its job summary, save the `sim-report` artifact under `evidence/`,
   quote the sim step's `shell:` header and the "Set up job" token permissions, give the runtime,
   and show the `deploy.yml` run on the PR ran as before. Logs and the artifact need a signed-in
   GitHub (`gh`), which this review doesn't have. One correction to what the plan expects to see:
   a job's token always carries `Metadata: read` besides what `permissions:` grants, so "Contents:
   read only" reads `Contents: read`, `Metadata: read` in the log, and that is the expected result.

## Cleanup (all in the hand-out)

2. **The whitespace-tolerance mutant in `evidence/extraction-fixtures.md` is not the mutant the
   report names.** The report says every `^[[:space:]]*` was stripped and every verdict went
   `n/a`. But the evidence's table still has rows, with the spec names indented and the runtime
   matched, so the `===` header, `Draws:` and `Runtime:` anchors still matched indented lines.
   Whatever edit was run, it wasn't the one named. The named mutant (every `^[[:space:]]*` → `^`,
   in the anchors and the `sub`) gives a different and stronger result: on the indented fixture
   the step exits 1 with the no-report line, and on the real, unindented output every verdict is
   `n/a`, because `formatReport` itself indents the verdict lines by two spaces. So the tolerance
   is load-bearing on the report as printed, not only against vitest indenting it. The evidence
   and the next report should say what was run.
3. **The test count is stale.** `report-r1.md` and `record.md` say 1982 tests (1981 passed,
   1 skipped). `main` at `580fb05` and the branch both run 1983 (1982 passed, 1 skipped) in 228
   files; 4.5-D's last rounds already reported 1983. The numbers in `report-r1.md` are 4.5-D's
   round-1 numbers.
4. **`record.md` says "PR run pending".** Once fix 1 is in, it states the run as it happened: the
   run's link, its runtime, and the verdicts it printed.

## Scope and labeling

- **The leftover sweep:** the slice renames and deletes nothing. The one corrected claim is
  `CONVENTIONS.md#balance-simulator`'s "the full report runs only in a tuning slice", which the
  kickoff leaves to this review, and the phase brief's "Balance verdicts" bullet repeats it. Both
  are rewritten (Docs edited). `src/state/balance-sim.ts` and its test name `npm run sim` without
  saying where it runs, so they stand. `scripts/docs-check/ci.test.ts` reads `deploy.yml` only,
  which is unchanged.
- **Content:** none; no content doc changes.
- **No `## Not built` rule** is built by this slice.
- **Mailbox:** nothing to delete. `evidence/` holds one file, cited by the report.

## Decide-points

1. **Nothing ties `formatReport`'s text to `sim.yml`'s extraction until a run on `main`.** A PR
   that rewords the `Draws:` line, a `===` header or a verdict line passes every gate; the next
   `main` run then shows `n/a` cells, green (`n/a` is accepted for one missing line), or, if the
   `CI thresholds summary` line moved, a red run. **Recommendation: a doc rule, no trigger
   change.** I wrote it into the new `CONVENTIONS.md#the-simulator-report-runs-after-each-merge`:
   the lines the summary reads, by function, and that a change to them changes the extraction in
   the same PR. A PR review reads `CONVENTIONS`, and the `n/a` shows on the very next `main` run.
   The alternatives cost more than the risk: adding `src/state/balance-sim.ts` to the `paths`
   filter puts a 35-minute run on every PR that touches the simulator, which is what the brief
   keeps off PRs; and a normal-suite test that pipes a smoke report through the workflow's awk
   needs a `src/` test that spawns awk on Windows and Linux alike, a slice of its own for a rare
   change.

**Decisions:**

- **Decide-point 1:** taken as recommended. The coupling is guarded by the rule in
  `CONVENTIONS.md#the-simulator-report-runs-after-each-merge`; the `paths` filter stays on
  `sim.yml` alone, and no test is added.

## Verified, and how

- **Gates** (own clone, `npm ci`, Node 24.21.0 as CI's Node 24, Vitest 5.0.3 as the lockfile
  pins): `vitest run` 1983 tests, 1982 passed, 1 skipped, 0 failed, 228 files; `lint`,
  `format:check`, `build`, `tsc -b` clean; `docs:check` citations PASS (671 citations in 461
  files; 673 after this review's edits), comments PASS (7423 comments, 1735 titles, 428 files),
  budgets 0 over.
- **Test count, file by file** (JSON reporter on both trees): `main` 1983 in 228 files; every file
  has the same tests by full name and status. No test is added or changed.
- **Golden policy, byte-identical:** `git diff origin/main bd64909` outside `.claude/` is one added
  file, `.github/workflows/sim.yml`; `src/`, `scripts/`, `package.json`, `package-lock.json` and
  `deploy.yml` are unchanged, so no fixture or digest row can move (step 4's fixture compare has
  nothing to compare).
- **Workflow text against the kickoff:** triggers `push` to `main` only, `pull_request` with
  `paths: ['.github/workflows/sim.yml']` only, `workflow_dispatch`; no tag or schedule.
  `permissions: contents: read` alone; `persist-credentials: false`; concurrency
  `sim-${{ github.ref }}`, `cancel-in-progress: false`, clear of `CI & Deploy-<ref>` and `pages`;
  `timeout-minutes: 120`; Node 24, `cache: npm`, `npm ci`; `checkout@v7`, `setup-node@v7`,
  `upload-artifact@v7` (all three majors exist as tags: `git ls-remote` on each action's repo);
  the sim step `shell: bash` with `| tee sim-report.txt`; Summarise `if: success()`; upload
  `if: always()`. `actionlint` 1.7.12, with shellcheck, passes on `sim.yml` (and `deploy.yml`).
- **The extraction on real output (A4).** A scratch copy of the branch with `SIM_SEEDS` cut to 2
  seeds ran `npm run sim` under `CI=true GITHUB_ACTIONS=true`, piped through `tee` with
  `-o pipefail` (exit 0, 521 lines, 216 s). Vitest prints both `console.log`s under one
  `stdout | src/state/balance-sim.test.ts > …` header, unindented; `formatReport`'s verdict lines
  carry their own two-space indent. The Summarise `run:` block, cut from `sim.yml` by a YAML parser
  and run as GitHub runs it (`bash --noprofile --norc -eo pipefail`) under **mawk 1.3.4**, gave:
  sorcerer / brute / shieldbarer all `PASS PASS PASS`, round-cap draws `279 = 5.6%`,
  `169 = 2.5%`, `283 = 8.9%`, `Runtime: 216.4 s`, exit 0. Each value checked against the raw
  lines.
- **Mutation check** (mawk, fixtures derived from that real output):

  | Fixture or mutant | Result |
  | --- | --- |
  | interleaved vitest noise and blank lines | table unchanged |
  | every report line indented 4 | table unchanged |
  | decoy `sorcerer: … FAIL` line before the summary block | sorcerer `PASS` |
  | **no `inSummary &&` gate**, decoy | sorcerer `FAIL FAIL FAIL` (caught) |
  | **every `^[[:space:]]*` → `^`**, real output | every verdict `n/a` (caught) |
  | same mutant, indented fixture | exit 1, no-report line (caught) |
  | `CI thresholds summary` block removed | exit 1, no-report line |
  | **`exit 1` → `exit 0`**, block removed | exit 0 (caught) |
  | brute `first soul FAIL` | `FAIL` in the table, exit 0 |
  | one spec's `Draws:` gone, one verdict line gone, no `Runtime:` | `n/a` in those cells, exit 0 |

  The pipefail claim rests on GitHub's documented `shell: bash` command line
  (`bash --noprofile --norc -eo pipefail {0}`); the run's own log header is fix 1.
- **The PR's runs (public pages, no sign-in):** `deploy.yml` run 38539664741 on PR #111:
  success, `test` 1m10s and `build` 15s, `deploy` skipped (0s), one `github-pages` artifact: the
  same jobs as any PR. `sim.yml` run 38539664712: success, 34m 32s (job `sim` 34m 29s), artifact
  `sim-report` 9.52 KB. Its one annotation, on both workflows' jobs, is GitHub's notice that
  `ubuntu-latest` moves to Ubuntu 26 from 19 October; the extraction is POSIX awk and passes under
  mawk, so the move doesn't touch it. The job summary and the logs are not visible signed out
  (fix 1).
- **ASSUMPTION A1, `timeout-minutes: 120`: settled, keep it.** The runner's job took 34.5
  minutes against ~25 on Duncan's machine, under the 60-minute mark the plan review set for
  revisiting, so 120 leaves 3.5× headroom. The cap only bites on a hung run, the minutes are free
  on a public repo, and the simulator only grows deeper with content. The exact `Runtime:` line
  comes with fix 1.

## Docs edited

- `CONVENTIONS.md#balance-simulator`: the full report runs in Actions after each merge, never as a
  slice's gate (was: only in a tuning slice); links the new heading.
- `CONVENTIONS.md#the-simulator-report-runs-after-each-merge` (new, under `## CI`): the workflow as
  built: triggers and why the `paths` filter stays, report-only and the two ways it fails, the job
  summary and artifact, the report lines the summary reads (decide-point 1), the concurrency group,
  permissions and toolchain. `CONVENTIONS.md` is now 28.6 of its 29 KB budget, within it.
- `phases/4.5/brief.md#balance-verdicts`: "only a tuning slice runs the full simulator" → "acts on
  the full report", since every merge now runs it.
