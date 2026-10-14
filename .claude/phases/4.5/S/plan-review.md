# Plan review — 4.5-S

## Round 1

Checked against `phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`, the slice
brief, the kickoff, `.github/workflows/deploy.yml`, `package.json#scripts.sim`,
`src/state/balance-sim.test.ts` (the `describe.skipIf(!isSim)` block), `formatSpec` and
`formatReport` in `src/state/balance-sim.ts`, `CONVENTIONS.md#balance-simulator` and
`phases/4.5/B2/evidence/balance-and-runtime.md#runtime-same-machine-the-reversal-tree-standing-in-for-main`.
Tree: `4.5-s`, the kickoff and plan commits ahead of `origin/main`.

Checked against the source and holding:

- Each anchor matches the real report text. One `=== <specId> (<n> seeds) ===` header per spec.
  Exactly one line per spec block starts with `Draws:`; the matchup header holds `capDraw` but is
  indented and doesn't start with `Draws:`. The per-spec verdict lines come only after
  `CI thresholds summary (reported, not asserted):`; the in-block line starts `CI thresholds:`, not
  `<specId>:`. `Runtime:` is printed with `toFixed(1)`, so `[0-9.]+ s` matches.
- `shell: bash` makes GitHub run the step as `bash --noprofile --norc -eo pipefail {0}`. Without a
  `shell:`, it runs as `bash -e {0}`, and `tee` would hide vitest's exit code. The plan's claim is
  right.
- Triggers, `permissions: contents: read`, `persist-credentials: false`, Node 24 with `cache: npm`
  and `npm ci`, `checkout@v7`/`setup-node@v7`, report-only, and `tee` into the artifact all match
  the brief and the kickoff's Traps.
- Golden policy: byte-identical, one added file outside the mailbox, as the kickoff says.
- Bring-back check: the brief's only S item in its Assumptions checklist (the slice's place in the
  order) is untouched. Nothing to bring back.

**Verdict:** approved, with the plan fixes below, carried by the hand-out. None of them changes the
workflow's shape. Decide-point 1 adds a fifth fix if Duncan takes the recommendation.

### Plan fixes

1. **Name the awk; use POSIX awk only.** The plan says "one `awk` pass" but doesn't say which awk.
   On Ubuntu, `awk` is mawk unless gawk is installed. The local fixture check runs on the coding
   agent's machine, where Git Bash ships GNU awk. A gawk-only construct (three-argument `match()`,
   `gensub`, `\s`, `IGNORECASE`) would pass the local check and break the summary on the runner.
   End state: the script uses POSIX awk only (`match()` with `RSTART`/`RLENGTH`, `sub`, `substr`).
   The fixture check runs under `gawk --posix` (and `mawk` if present) as well as plain `awk`.
2. **Mechanism table, "Anchored extraction": drop "shuffle".** A `Draws:` line belongs to its spec
   because it comes after that spec's header, so shuffling is meant to change the table. The noise
   test is interleaving: vitest lines (`stdout | …`, `✓ …`, `Test Files`, `Duration`) and blank
   lines between the report lines, with the table unchanged.
3. **Mechanism table: give the gating and whitespace mechanisms real fails-without tests.**
   - Gating on `CI thresholds summary`: the plan's claimed fails-without ("drop the gating → `n/a`")
     is wrong. No line before the summary block starts `<specId>: floor-1`, so against the real
     report, dropping the gate changes nothing. The test needs a decoy: a fixture line
     `sorcerer: floor-1 FAIL, first soul FAIL, floor 5 FAIL` before the summary block, and `PASS`
     inside it. With the gate, the table shows `PASS`; without it, `FAIL`.
   - Leading-whitespace tolerance: the indented fixture variant is the test. Without
     `^[[:space:]]*`, the indented rows show `n/a`. Name it in the table.
4. **Mechanism table, `shell: bash` + pipefail: add the observation on the PR run.** The local
   `bash -o pipefail` check proves bash's behaviour, not what the workflow runs. The PR run's log
   header for the sim step prints `shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}`;
   without `shell: bash` it would print `/usr/bin/bash -e {0}`. Quote that line in the report.
5. **A2's wording.** `actions/upload-artifact`'s v7 major is v7.0.0, released 26 Feb, ahead of
   v7.0.1 (10 Apr). v7.0.2 (7 Oct) is a patch. So the major is months old, not "published a week
   ago". Checked on the action's releases page in this review.

### Assumptions

1. **A1, `timeout-minutes: 120`:** confirm. The sim is one test file in one vitest worker, so the
   runner's per-core speed decides the runtime, not its vCPU count. Even a runner three times
   slower than Duncan's machine (about 76 min) fits under 120. The repo is public, so standard
   hosted-runner minutes cost nothing. The report gives the PR run's runtime. If it is over 60 min,
   the report says so and the PR review revisits the number.
2. **A2, `actions/upload-artifact@v7`:** confirm; fix the wording (plan fix 5).
3. **A3, `sim-${{ github.ref }}`:** confirm. The `sim-` prefix makes the group unique, which
   satisfies "its own concurrency group". Expected side effect on this PR: a fix-up push queues
   behind the running sim instead of cancelling it (about one full run per push), as the brief
   intends.
4. **A4, the report lines reach stdout intact:** confirm, as a risk the PR run settles. If the risk
   comes true, the summary shows `n/a` and the artifact holds the raw output to diagnose it.
5. **A5, a missing line prints `n/a` and the step always exits 0:** **decide-point 1.**
6. **A6, specs from the report's headers:** confirm. The `===` headers drive the rows.
7. **A7, `if: success()` on the summary and `if: always()` on the upload:** confirm. A failed sim
   step never prints a report: the test can only throw before its `console.log`, and a timeout kills
   it before then. So there is nothing to summarise. The upload still keeps the partial output.
8. **A8, `ubuntu-latest`:** confirm, as in `deploy.yml`.

### Decide-points

1. **A green run with no report in it.** Under A5, the summary step always exits 0. Now suppose
   vitest exits 0 but the report block is skipped, for example because `--mode sim` drops out of
   `scripts.sim` or `isSim` changes. Then `describe.skipIf(!isSim)` skips the report,
   `describe.skipIf(isSim)` runs the smoke suite instead, and the run goes green with an empty
   summary table. A run that never ran the simulator would show as a pass.
   **Recommendation:** the summary step exits 1 when the capture has no
   `CI thresholds summary (reported, not asserted):` line, and writes a summary line saying the
   report is missing. Any verdict, `FAIL` included, still exits 0, and a single missing line still
   prints `n/a`. Why: the brief's "report only" is about numbers. A missing report means the run
   failed, and the brief already turns a failed run red. The alternative is to keep A5 as it is.
   That costs nothing now, but a broken `sim` script would go unnoticed until someone read an empty
   summary.
   If taken, the edit is to the "Report only" bullet of
   `phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`: a run that prints no report
   fails.

### Notes for this slice's PR review (not plan fixes)

- The `pull_request` trigger with its `paths` filter stays after the merge. So the
  `CONVENTIONS.md#balance-simulator` rewrite can't say the full report "never" runs in a PR. It runs
  on a push to `main`, on a dispatch, and on a PR that changes `sim.yml`.
- After the merge, the first push to `main` shows the `push` trigger working, and 4.5-E's PR, which
  doesn't touch `sim.yml`, shows the `paths` filter working (no `sim.yml` run).

**Decisions:**

- **Decide-point 1:** taken as recommended. The summary step exits 1 when the capture has no
  `CI thresholds summary (reported, not asserted):` line, and writes a summary line saying the
  report is missing. Any verdict, `FAIL` included, exits 0, and a single missing line prints `n/a`.
  This becomes plan fix 6, carried by the hand-out.

**Docs edited:**

- `phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`: the "Report only" bullet
  now says a run that prints no report fails (decide-point 1).
