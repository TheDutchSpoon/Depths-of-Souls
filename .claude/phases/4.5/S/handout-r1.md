# Hand-out — 4.5-S, round 1

**Verdict: fixes.** `.github/workflows/sim.yml` stays as it is: no item below changes it. The items
fill in the slice's proof and correct three statements in the mailbox. Answer with `report-r2.md`.

Re-read before starting: `CONVENTIONS.md#the-simulator-report-runs-after-each-merge` (new) and
`CONVENTIONS.md#balance-simulator`, both rewritten by the review.

## Items

1. **Put the PR run's proof in the mailbox.** The PR is #111. Its `sim.yml` run on `bd64909` is
   https://github.com/TheDutchSpoon/Depths-of-Souls/actions/runs/38539664712 (job `sim`); it
   succeeded in 34m 32s and uploaded the `sim-report` artifact. Use `gh`:
   `gh run view 38539664712 --log` and `gh run download 38539664712 -n sim-report`. If `gh` isn't
   signed in, ask Duncan for the log lines and the artifact. In `report-r2.md`:
   - the run's URL, its conclusion and the job's duration;
   - the job summary, quoted verbatim;
   - the runtime from the summary's `Runtime:` line. If it is over 60 minutes, say so: the review
     then revisits `timeout-minutes`;
   - the sim step's log header line beginning `shell:`, quoted. Expected:
     `shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}`;
   - the "Set up job" step's `GITHUB_TOKEN Permissions` lines, quoted. Expected: `Contents: read`
     and `Metadata: read`. GitHub gives every token `Metadata: read`; anything else is a finding;
   - the `deploy.yml` run on the same PR (run 38539664741): its jobs and their results, quoted
     from `gh run view 38539664741`.

   Save the downloaded artifact's `sim-report.txt` as `phases/4.5/S/evidence/sim-report.txt`,
   unedited, and name it from the report. If the summary shows `n/a` anywhere, stop and report it
   with the log: don't change `sim.yml` in this round without saying why.

   Pushing the fix commit runs `sim.yml` again on the PR (a `paths` filter on a pull request
   compares the whole PR, which includes `sim.yml`); it queues behind any run in progress. The run
   on `bd64909` is the proof; the new run needn't be waited for.

2. **Correct the whitespace-tolerance mutant** in `evidence/extraction-fixtures.md` and the
   mechanism table of `report-r2.md`. The recorded run's table still has rows with indented spec
   names and a matched runtime, so it wasn't "`^[[:space:]]*` stripped from every anchor".
   Re-run the mutant as named: replace every `^[[:space:]]*` with `^`, in the anchors and in the
   `sub` that trims the verdict line, and run it on two inputs:
   - the indented fixture: expected exit 1 and the "printed no report" line, since the
     `CI thresholds summary` anchor no longer matches;
   - the unindented fixture: expected every verdict `n/a`, because `formatReport` indents its
     verdict lines by two spaces itself.

   Replace the old entry with the command run and both outputs, and in the report's table state
   the second result as the pin: the tolerance is needed for the report as printed, not only if
   vitest indents it. Better still, use the real `sim-report.txt` from item 1 as the unindented
   input.

3. **Fix the test count.** `main` and the branch both run 1983 tests in 228 files: 1982 passed,
   1 skipped. `report-r1.md`'s "1981 passed, 1 skipped … 1982 tests" and the same numbers in
   `record.md` are stale. Re-run `npm run test`, give its numbers in `report-r2.md`, and correct
   `record.md`.

4. **Bring `record.md` up to date.** Replace "Status: built, PR run pending" with the run as it
   happened: the run link, its runtime, and the three specs' verdicts and round-cap draws as the
   summary printed them. Keep the record short; the full table is in the report.

## Must stay true

- `git diff --stat origin/main` outside `.claude/`: one added file, `.github/workflows/sim.yml`,
  unchanged from `bd64909`. No `src/`, `package.json` or `deploy.yml` change.
- Every gate green, as in round 1.
