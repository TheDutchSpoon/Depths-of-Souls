# PR review, round 2 — 4.5-S: The simulator runs in Actions after each merge

Reviewed: PR #111, branch `4.5-s` at `bca8adc` ("fix"), against `main` at `580fb05` and round 1's
commit `e61998c`. The fix diff (`git diff e61998c bca8adc`) is mailbox only: `report-r2.md`,
`record.md`, `evidence/extraction-fixtures.md` and the new `evidence/sim-report.txt`. Inputs:
`kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r1.md`, `review-r1.md`, `handout-r1.md`,
`report-r2.md`, the evidence, and the living docs on the branch.

## Verdict: approved

Every hand-out item is done, and each checks out against the run, the artifact and the code. No
hand-out this round. Two small edits are made by this review (Docs edited): a duration label in
`record.md`, and one sentence in `CONVENTIONS.md` for a fragility the real artifact shows
(decide-point 2). Decide-point 1, the job summary read on the run page, matched.

## Hand-out items, checked

1. **The PR run's proof.** Done, with one substitution. The run link, conclusion, duration, the
   `shell:` header, the token permissions and the `deploy.yml` run are quoted. The job summary is
   not quoted from the run: neither `gh` nor the REST API returns a step summary, and the run page
   shows it only to a signed-in user. The report recomputes it from the downloaded artifact under
   GNU awk instead. This review closes the gap it named ("mawk is the suspect"): the Summarise
   `run:` block, cut from `sim.yml` by a YAML parser and run as GitHub runs it
   (`bash --noprofile --norc -eo pipefail`) under **mawk 1.3.4** on `evidence/sim-report.txt`,
   prints the same table byte for byte, exit 0. Each cell checked against the raw lines: `Draws:`
   lines 165, 345, 510; verdict lines 526–528; `Runtime:` line 530. Decide-point 1 is the last step.
   The artifact is the runner's own output: runner paths (`/home/runner/work/…`), vitest's CI
   colour codes, `Start at 09:04:34`, and `Duration 2056.94s` against `Runtime: 2056.5 s` and the
   job's 34m 29s.
2. **The whitespace-tolerance mutant.** Done as named. `sed 's/\^\[\[:space:\]\]\*/^/g'` leaves no
   `[[:space:]]*` in the block (8 before, 0 after: five anchors, three `sub`s). Rerun here under mawk:
   real artifact, every verdict `n/a`, draws and runtime filled, exit 0; artifact indented four
   spaces, exit 1 with the no-report line; the unmutated step on the indented artifact, the full
   table. All three match the evidence.
3. **Test count.** 1983 tests in 228 files, 1982 passed, 1 skipped, on the branch and on `main`.
4. **`record.md`.** States the run as it happened. It called the run's 34m32s the job's; the job
   is 34m29s (the run page shows both). Corrected by this review, a label only.

## Real fixes

None.

## Scope and labeling

- **Leftover sweep** (rerun on `bca8adc`, as the approving round does): the slice renames or
  deletes nothing. The one corrected claim, "the full report runs only in a tuning slice", has no
  hit left in `src/`, `scripts/` or the living docs; round 1 rewrote `CONVENTIONS.md` and the phase
  brief. `src/state/balance-sim.ts` and its test name `npm run sim` without saying where it runs.
- **Mailbox:** step files plus two evidence files, both cited by `report-r2.md`. Nothing to delete.
- **Content:** none. **No `## Not built` rule** is built by this slice.
- **The concurrency group, seen live.** Pushing round 1's commit and this fix started runs #2
  (`e61998c`, 10:16Z) and #3 (`bca8adc`, 10:21Z) on the PR. #3 shows "This workflow is waiting for
  Simulator report #2 to complete before running": queued, not cancelled, as the brief intends.
  Committing this review's edits queues one more, which replaces #3 if #2 is still running. None
  of them needs waiting for; the run on `bd64909` is the proof.

## Decide-points

1. **The job summary, verbatim.** The done-when wants a run "whose job summary carries the three
   CI verdicts and the round-cap draw rate". The run shows it, but nobody in the loop has quoted
   it: the coding agent can't fetch it, and neither can this review (the summary needs a signed-in
   GitHub). **Recommendation: approve now, and Duncan opens
   https://github.com/TheDutchSpoon/Depths-of-Souls/actions/runs/38539664712 signed in and checks
   the summary reads sorcerer / brute / shieldbarer `PASS PASS PASS`, round-cap draws
   `4740 = 5.5%`, `3770 = 2.7%`, `7730 = 11.9%`, and `Runtime: 2056.5 s`.** Why: the Summarise step
   is a pure function of the artifact, and the same input under the runner's awk gives that table,
   so a mismatch is very unlikely. Another fix round would cost a full sim run per push and still
   couldn't fetch the page. If the page differs, that is a real fix and the slice reopens.
2. **A line the summary reads must not open a `console.log`.** Vitest in Actions writes its colour
   codes at the start of the first line after each `stdout |` header (artifact line 9:
   `ESC[22mESC[39mBalance report: …`). The anchors start `^[[:space:]]*`, and ESC is not
   whitespace. Today that line is `Balance report:`, which nothing reads, and `Runtime:` sits behind
   a `\n`. But if a later change made `=== sorcerer` the first line printed, the extraction would
   drop the sorcerer row. The run would stay green: no `n/a`, just a table with two specs. Mutant
   run here (codes put on the first `===` line and on `Runtime:`): brute and shieldbarer only,
   `Runtime: n/a`, exit 0. **Recommendation: one sentence in the existing
   `CONVENTIONS.md#the-simulator-report-runs-after-each-merge` rule, no `sim.yml` change. Done.**
   Why: the report's shape is not this slice's to change, and stripping escape codes in awk would
   change an approved workflow for a risk that only a report-shape change can trigger. That kind
   of change already has to read this rule. The alternative is a `gsub` of `\033\[[0-9;]*m` at the
   top of the awk, a hand-out and another sim run on the PR.

**Decisions:**

- **Decide-point 1:** settled. Duncan read the run's job summary signed in, as pasted:

  ```text
  Vitest Test Report
  Summary
      Test Files: ✅ 1 pass · 1 total
      Test Results: ✅ 1 pass · 1 total
      Other: 78 skips · 78 total

  spec        floor-1  first soul  floor 5  round-cap draws
  sorcerer    PASS     PASS        PASS     4740 = 5.5%
  brute       PASS     PASS        PASS     3770 = 2.7%
  shieldbarer PASS     PASS        PASS     7730 = 11.9%

  Runtime: 2056.5 s

  The full report is the sim-report artifact of this run.
  ```

  Every cell equals the table computed from the artifact under mawk. The "Vitest Test Report"
  block above it is not `sim.yml`'s: Vitest's own reporter adds it to the job summary when it runs
  in GitHub Actions.
- **Decide-point 2:** taken as recommended; the `CONVENTIONS.md` sentence stands, `sim.yml`
  unchanged.

## For 4.5-F2's kickoff (not this slice)

`CONVENTIONS.md#balance-simulator` says a tuning slice compares against "the last committed
report". From this merge on, every `main` push leaves a fresh report as a run artifact. Artifacts
expire (90 days by default), so the kickoff should say whether F2's "before" is the latest `main`
run's artifact, saved into its `evidence/`, or a committed report. Round 1 approved that line and
the fix doesn't touch it, so it is a note here, not a decide-point.

After the merge (from the plan review): the first push to `main` shows the `push` trigger working,
and 4.5-E's PR, which doesn't touch `sim.yml`, shows no `sim.yml` run.

## Verified, and how

- **Gates** (own clone, `npm ci`, Node 24.21.0, Vitest 5.0.3 as the lockfile pins), on `bca8adc`:
  `vitest run` 1983 tests, 1982 passed, 1 skipped, 0 failed, 228 files; `lint`, `format:check`,
  `build`, `tsc -b` clean; `docs:check` citations PASS (673 citations in 461 files), comments PASS
  (7423 comments, 1735 titles, 428 files), budgets 0 over.
- **Test count, file by file** (JSON reporter on both trees): `main` 1983 in 228 files; every file
  has the same tests by full name and status.
- **Golden policy, byte-identical:** `git diff 580fb05 bca8adc` outside `.claude/` is one added
  file, `.github/workflows/sim.yml` (106 lines), byte-identical to `bd64909`'s; `src/`, `scripts/`,
  `package.json`, `package-lock.json` and `deploy.yml` unchanged. No fixture or digest row can
  move, so step 4's fixture compare has nothing to compare.
- **The PR's runs** (public pages): run 38539664712 success, 34m 32s total, job `sim` 34m 29s,
  artifact `sim-report` 9.52 KB, one notice (the `ubuntu-latest` move to Ubuntu 26 from 19
  October; the extraction passes under mawk, so it doesn't matter here). Runs #2 and #3 as under
  Scope.
- **Step 5 for the fix:** the fix adds no mechanism. The pins the hand-out asked for are rerun
  above under mawk (item 2). The escape-code mutant is decide-point 2.

## Docs edited

- `CONVENTIONS.md#the-simulator-report-runs-after-each-merge`: a line the summary reads may not
  open a `console.log`, because vitest's colour codes start the line after its `stdout |` header
  (decide-point 2). `CONVENTIONS.md` is now 28.8 of its 29 KB budget, within it.
- `phases/4.5/S/record.md`: 34m32s is the run's duration, not the job's (the job is 34m29s); the
  paragraph is re-wrapped.
