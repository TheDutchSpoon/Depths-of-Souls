# Report r2 — 4.5-S: The simulator runs in Actions after each merge

Answers `handout-r1.md`. `sim.yml` is unchanged from `bd64909`. Nothing committed, no living doc
edited. Evidence: `phases/4.5/S/evidence/sim-report.txt` (the run's artifact, unedited, `cmp`-identical
to the download) and `evidence/extraction-fixtures.md`.

## Item 1 — the PR run's proof

- **Run:** https://github.com/TheDutchSpoon/Depths-of-Souls/actions/runs/38539664712, workflow
  "Simulator report", head `bd64909`, conclusion **success**. Job `sim`: 09:04:24Z to 09:38:53Z by the
  API (34m29s; the hand-out's 34m32s is the Actions UI figure). Artifact `sim-report` (9744 bytes
  zipped), downloaded with `gh run download 38539664712 -n sim-report`.
- **Job summary:** `gh` and the API do not expose a job summary, so it is not quoted from the run. It
  is `Summarise`'s output, which is a pure function of `sim-report.txt`; the same `run:` block cut
  from `sim.yml` and run on the downloaded artifact (GNU Awk 5.4.0, `bash -e -o pipefail`) prints,
  exit 0:

  ```text
  | spec | floor-1 | first soul | floor 5 | round-cap draws |
  | --- | --- | --- | --- | --- |
  | sorcerer | PASS | PASS | PASS | 4740 = 5.5% |
  | brute | PASS | PASS | PASS | 3770 = 2.7% |
  | shieldbarer | PASS | PASS | PASS | 7730 = 11.9% |

  Runtime: 2056.5 s

  The full report is the `sim-report` artifact of this run.
  ```

  No `n/a` anywhere. If the Actions summary page differs from this, the awk on `mawk` is the
  suspect (not installed here); Duncan can confirm by looking at the run page.
- **Runtime:** `Runtime: 2056.5 s` (34.3 minutes), under 60: `timeout-minutes: 120` stands. The log
  line is `Run the simulator … Runtime: 2056.5 s`.
- **Sim step shell**, from `gh run view 38539664712 --log`:
  `shell: /usr/bin/bash --noprofile --norc -e -o pipefail {0}` (as expected; the `npm ci` step shows
  `shell: /usr/bin/bash -e {0}`, so the explicit `shell: bash` is what adds pipefail).
- **Set up job**, `GITHUB_TOKEN Permissions`: `Contents: read`, `Metadata: read`. Nothing else.
- **`deploy.yml` run 38539664741** ("CI & Deploy", `pull_request`, #111), from `gh run view`:
  `✓ test in 1m10s`, `✓ build in 15s`, `- deploy in 0s` (skipped, as on any PR); conclusion success.
  Annotation on `test` and `build`: the `ubuntu-latest` to Ubuntu 26 migration notice on
  October 19, 2026.

## Item 2 — whitespace-tolerance mutant, re-run as named

Mutant: `sed 's/\^\[\[:space:\]\]\*/^/g'` over the extracted `run:` block, so all eight uses
(five anchors, three `sub`s, including the verdict-line trim) become `^`. The old entry's rows with
indented names came from a mutant that left the trimming `sub`s in place; it is replaced.

| Input | Expected | Result |
| --- | --- | --- |
| `evidence/sim-report.txt`, the real report (summary lines indented two spaces by `formatReport`) | every verdict `n/a` | every verdict `n/a`; draws and runtime still filled; exit 0 |
| the same report with every line indented four spaces | exit 1, "printed no report" | exit 1, "printed no report" |
| unmutated step on the real report | full table | PASS everywhere, as above |

Pin: the tolerance is needed for the report as the simulator prints it, not only if vitest indents
it. Full commands and outputs are in `evidence/extraction-fixtures.md`. (The hand-out expected the
"indented" input to fail on the `CI thresholds summary` anchor and the unindented input to give
`n/a`; both held, with the real report as the unindented input.)

## Item 3 — test count

`npm run test`: 228 files passed, **1982 passed, 1 skipped (1983 tests)**, equal to `main`.
`report-r1.md`'s "1981 passed … 1982 tests" was stale; `record.md` is corrected to 1983 / 1982 / 1.

## Item 4 — `record.md`

Status line replaced with the run link, runtime, token permissions, and the three specs' verdicts and
round-cap draws (sorcerer 4740 = 5.5%, brute 3770 = 2.7%, shieldbarer 7730 = 11.9%).

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1982 passed, 1 skipped (228 files, 1983 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 673 citations in 461 files |
| `npm run docs:check -- comments` | PASS, 7423 comments and 1735 titles in 428 files |

`git diff --stat origin/main` outside `.claude/`: one file, `.github/workflows/sim.yml`, 106
insertions, no `src/`, `package.json` or `deploy.yml` change. Golden policy and corpus digest
untouched.

## Mechanism table (updates to r1's)

| Mechanism | Evidence now |
| --- | --- |
| Leading-whitespace tolerance | See item 2. |
| `shell: bash` + pipefail | PR run: header line quoted above. |
| `pull_request` + `paths` trigger | The run exists on #111. |
| `permissions`, token | `Contents: read`, `Metadata: read` only. |
| Artifact upload | `sim-report` present; contents equal what the summary was computed from. |
| `push` to `main`, `workflow_dispatch`, concurrency | Text only until merge. |

## Spec questions

None new. r1's note on `CONVENTIONS.md#balance-simulator` was handled by the review.

## Content changes

None.

## To delete

Nothing. (`gh` 2.102.0 was installed on this machine with winget to fetch the run; nothing in the repo.)
