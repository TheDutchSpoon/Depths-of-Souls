# Plan hand-out — 4.5-S, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree with the plan,
this hand-out wins.

Re-read before building: the "Report only" bullet of
`phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge` (it now says a run that
prints no report fails).

## Build items

1. **Extraction step: POSIX awk only** (amends "Extraction step"). The script uses only POSIX awk:
   `match()` with `RSTART`/`RLENGTH`, `sub`, `substr`, POSIX bracket classes. No three-argument
   `match()`, `gensub`, `\s`, `IGNORECASE` or other gawk extensions, because the runner's `awk` may
   be mawk. The local fixture check runs the same command under plain `awk`, under `gawk --posix`,
   and under `mawk` if it is installed, and all of them give the same table.

2. **A missing report fails the summary step** (amends ASSUMPTION A5 and "Choices and why",
   Report-only). If `sim-report.txt` has no line matching
   `^[[:space:]]*CI thresholds summary \(reported, not asserted\):`, the summary step writes a line
   to `$GITHUB_STEP_SUMMARY` saying the simulator printed no report and pointing to the
   `sim-report` artifact, then exits 1. Otherwise it exits 0 whatever the verdicts are (`FAIL`
   included). A single missing line inside a report that is present (a spec's `Draws:` line, a
   verdict line, `Runtime:`) prints `n/a` and does not fail the step. A5 in the checklist reads
   that way.

3. **Mechanism table: "Anchored extraction"** (amends "Mechanism → test that fails with it
   removed"). The noise test interleaves vitest lines (`stdout | …`, `✓ …`, `Test Files`,
   `Duration`) and blank lines between the report lines, and the table comes out unchanged. It
   doesn't shuffle report lines: a `Draws:` line belongs to the spec whose `===` header precedes
   it.

4. **Mechanism table: one row per anchor mechanism** (amends the same table).
   - *Gating the verdicts on `CI thresholds summary`:* the fixture has a decoy line
     `sorcerer: floor-1 FAIL, first soul FAIL, floor 5 FAIL` before the summary block and
     `sorcerer: floor-1 PASS, first soul PASS, floor 5 PASS` inside it. With the gate, the table
     shows `PASS`. With the gate removed, it shows `FAIL`.
   - *Leading-whitespace tolerance:* the indented fixture variant. With `^[[:space:]]*` removed,
     the indented rows show `n/a`.
   - *Missing report fails (item 2):* a fixture with no `CI thresholds summary` line makes the
     step exit 1 and write the missing-report line. A fixture with a `FAIL` verdict exits 0.

5. **Mechanism table: `shell: bash` + pipefail** (amends the same table). Besides the local
   `bash -o pipefail` check, the report quotes the sim step's log header from the PR run, which
   must read `shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}`. Without `shell: bash`
   it would read `/usr/bin/bash -e {0}`.

6. **ASSUMPTION A2's text** (amends the checklist). `actions/upload-artifact@v7`: v7.0.0 was
   released 26 Feb and v7.0.1 on 10 Apr; the latest release is the v7.0.2 patch (7 Oct). Checked
   on the action's GitHub releases page.

7. **ASSUMPTION A1's runtime** (amends the checklist). The report gives the PR run's runtime. If
   it is over 60 minutes, the report says so, so the PR review can revisit `timeout-minutes`.

Everything else in `plan.md` stands as written.
