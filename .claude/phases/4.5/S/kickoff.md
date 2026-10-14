# Kickoff — Phase 4.5 — Slice S: The simulator runs in Actions after each merge

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: none. This slice adds one workflow file and touches no engine, store, data or
  UI. `CONVENTIONS.md#balance-simulator` is the rule the workflow serves (its "full report runs
  only in a tuning slice" line is rewritten at this slice's PR review, not by you).
- `phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`: the whole design, bullet
  by bullet. `phases/4.5/S/brief.md` for the done-when.
- `.github/workflows/deploy.yml`: the Node version, `npm ci`, `checkout` with
  `persist-credentials: false`, and the action majors `sim.yml` copies. Also what it must NOT
  copy (Traps).
- `package.json#scripts.sim` and the two things it runs: `src/state/balance-sim.test.ts` (the
  `describe.skipIf(!isSim)` block prints the report with `console.log` and a `Runtime: <n> s`
  line, under a 2-hour test timeout) and `formatReport`/`formatSpec` in `src/state/balance-sim.ts`
  (the exact text the summary step extracts from: the `=== <spec> (<n> seeds) ===` header, the
  `Draws: … round-cap draws <n> = <pct>` line per spec, and the trailing
  `CI thresholds summary (reported, not asserted):` block with one `<spec>: floor-1 PASS, first
  soul PASS, floor 5 PASS` line per spec).
- `phases/4.5/B2/evidence/balance-and-runtime.md#runtime-same-machine-the-reversal-tree-standing-in-for-main`: `npm run sim` took ~25 minutes on
  Duncan's machine; a hosted runner is slower. Size the job timeout from that, not from hope.

## Scope

One new file, `.github/workflows/sim.yml`, that runs `npm run sim` on every push to `main`, on
`workflow_dispatch` for any ref, and on a pull request whose changed paths include `sim.yml`
itself (so this slice's PR shows a real run). It is report-only: no step fails on a balance
number; the job fails only if the run itself fails (vitest non-zero, timeout). Its job summary
(`$GITHUB_STEP_SUMMARY`) shows, per spec, the three CI verdicts and the round-cap draw rate, plus
the runtime; the full report is uploaded as a run artifact. Own concurrency group, queued, never
cancelled. Read-only `permissions`, `persist-credentials: false`, the same Node and `npm ci` as
`deploy.yml`. Not in scope: any change to `deploy.yml`, `package.json`, `src/`, the report's
text or shape, the CI tests, the spec, or `CONVENTIONS.md`. If the summary needs a line the report
doesn't print in a shape a step can extract, stop and ask; the report is not yours to change.

## Golden policy

Byte-identical: every golden, every test, every content doc. `git diff --stat origin/main` on the
PR shows exactly one added file (plus the mailbox).

## Traps

- **Copying `deploy.yml`'s concurrency.** It has `cancel-in-progress: true` at the workflow
  level; `sim.yml` needs its own group with `cancel-in-progress: false`, so a merge during a run
  queues its own report. Don't share the group name with `deploy.yml` or with the `pages` group.
- **Copying `deploy.yml`'s permissions.** `pages: write` and `id-token: write` are the deploy's;
  `sim.yml` is `permissions: contents: read` and nothing else.
- **`workflow_dispatch` is invisible until the file is on `main`.** That is why the `pull_request`
  trigger with a `paths` filter on `.github/workflows/sim.yml` exists; without it the PR cannot
  prove the slice. Don't drop it as redundant, and don't widen it to every PR: every PR already
  runs the `balance-ci-*` verdicts, and a 25+ minute job on each PR is exactly what the brief
  separates out.
- **The summary reads vitest-decorated stdout.** `npm run sim` is vitest with `--silent=false`;
  the report lines come out under vitest's `stdout | …` headers, with the run's own reporter
  lines around them. Capture stdout to a file (`tee`), then extract by the literal report lines
  named under Read, anchored on `=== <spec>` and `CI thresholds summary`, never by line number
  or by "the last N lines". The artifact is that captured file: the full report, decorations
  included, is acceptable; a hand-trimmed one is not.
- **Making it fail on a number.** No `grep -q FAIL && exit 1`, no threshold in YAML: the verdicts
  are asserted by `src/state/balance-ci-*.test.ts` on every PR. The summary shows `PASS`/`FAIL`
  as the report prints them; a `FAIL` there is information, not a red run.
- **The job timeout.** The test's own timeout is 2 hours; GitHub's default job timeout is 6.
  Set `timeout-minutes` explicitly from the measured runtime with headroom for a slower runner,
  and mark the number as an ASSUMPTION in the plan.
- **Action versions.** `deploy.yml` pins `actions/checkout@v7` and `actions/setup-node@v7`; use
  the same majors. `actions/upload-artifact` is not in `deploy.yml`: pick its current major and
  say in the plan where you checked it, not from memory.
- **A second trigger path for `main`.** `on: push: branches: [main]` only. Don't add `pull_request`
  without the `paths` filter, tags, or a schedule.

## Must stay green

The whole normal suite and every gate in `deploy.yml` (`lint`, `format:check`, the three
`docs:check` runs, `test`), unchanged, since nothing they read changes. `deploy.yml` itself is
byte-identical to `main`. The three `balance-ci-*.test.ts` keep their verdicts (they can't move:
no `src/` change).

## The PR must prove

- `git diff --stat origin/main`: one added file, `.github/workflows/sim.yml`, outside the mailbox.
- A green `sim.yml` run on the PR itself (the `paths`-filtered `pull_request` trigger), linked by
  URL in the report, whose job summary shows for each of `sorcerer`, `brute`, `shieldbarer`: the
  three verdicts (floor-1, first soul, floor 5), the round-cap draw rate, and the runtime; and
  whose artifact holds the full report. Quote the summary in the report and save the artifact's
  report under `phases/4.5/S/evidence/`.
- The `deploy.yml` run on the same PR is green and ran exactly as before (same jobs, same steps).
- The workflow text shows: `permissions: contents: read` only; `persist-credentials: false`;
  a dedicated concurrency group with `cancel-in-progress: false`; an explicit `timeout-minutes`;
  Node 24 with `cache: npm` and `npm ci`, as `deploy.yml`.
- The extraction step's commands, quoted, with the report lines they match, so a reviewer can
  check them against `formatSpec` and `formatReport` without running the simulator.
