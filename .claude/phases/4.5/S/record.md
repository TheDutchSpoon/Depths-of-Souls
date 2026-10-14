# Record — Phase 4.5 — Slice S: The simulator runs in Actions after each merge

**Status: built; the PR run on `bd64909` succeeded.** Run
https://github.com/TheDutchSpoon/Depths-of-Souls/actions/runs/38539664712: 34m32s (job `sim`
34m29s), runtime 2056.5 s, `Contents: read` and `Metadata: read` only, `sim-report` artifact
uploaded. All three specs PASS floor-1, first soul and floor 5; round-cap draws: sorcerer 4740 =
5.5%, brute 3770 = 2.7%, shieldbarer 7730 = 11.9%. Golden policy byte-identical: one added file
outside the mailbox, no `src/` change. 1983 tests in 228 files (1982 passed, 1 skipped), the same
as `main`.

## What was built

- `.github/workflows/sim.yml`, "Simulator report": runs `npm run sim` on every push to `main`, on
  `workflow_dispatch`, and on a pull request that changes `sim.yml` (a `paths` filter, so the
  slice's own PR shows a run).
- Report-only. The sim step is `npm run sim 2>&1 | tee sim-report.txt` under `shell: bash`
  (pipefail), so it fails only when vitest does or the 120-minute job timeout hits. A Summarise
  step writes a Markdown table to `$GITHUB_STEP_SUMMARY` (per spec: floor-1, first soul, floor 5,
  round-cap draws; then the runtime) with one POSIX-awk pass anchored on the report's own text. It
  exits 1 when the capture has no `CI thresholds summary` line, and 0 for any verdict. The raw
  capture is uploaded as the `sim-report` artifact (`if: always()`).
- Own concurrency group `sim-<ref>`, `cancel-in-progress: false`; `permissions: contents: read`;
  `persist-credentials: false`; Node 24, `cache: npm`, `npm ci`; `checkout@v7`, `setup-node@v7`,
  `upload-artifact@v7`.

## Tests and goldens

None added or changed. The extraction step was checked against fixtures built from `formatSpec`
and `formatReport` (`evidence/extraction-fixtures.md`).

## Files changed

Added: `.github/workflows/sim.yml`. Unchanged: `deploy.yml`, `package.json`, `src/`.
