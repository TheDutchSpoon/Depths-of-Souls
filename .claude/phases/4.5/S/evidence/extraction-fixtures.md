# Extraction fixture runs (4.5-S)

Printed output of running the Summarise step's `run:` block, cut from `sim.yml`, against fixtures built from the `formatSpec`/`formatReport` strings (3 specs; vitest `stdout |` headers; unindented, indented, noisy, decoy, partial and no-report variants). Awk: GNU Awk 5.4.0 as `awk` and as `gawk --posix`; `gawk --traditional` gave the same table on plain, indented, noisy and decoy. `mawk` and `actionlint` are not installed here and were not run. Each `run` is `bash -e -o pipefail` with `GITHUB_STEP_SUMMARY` set to a file; `exit=` is the step exit code. The "no gate", "no leading-whitespace tolerance" and "exit removed" runs are the same block with that one mechanism sed-removed.

```text
##### plain awk, plain.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### gawk --posix, plain.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### gawk --posix, indented.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### gawk --posix, noisy.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### gawk --posix, decoy.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### gawk --posix, partial.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | n/a |
| brute | n/a | n/a | n/a | 30 = 1.0% |

Runtime: n/a

The full report is the `sim-report` artifact of this run.
##### missing.txt
exit=1
**The simulator printed no report** (no "CI thresholds summary" line). The raw output is in the `sim-report` artifact.
##### no gate, decoy.txt
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | FAIL | FAIL | FAIL | 12 = 0.4% |
| brute | PASS | FAIL | PASS | 30 = 1.0% |
| shieldbarer | FAIL | PASS | FAIL | 7 = 0.2% |

Runtime: 1500.3 s

The full report is the `sim-report` artifact of this run.
##### no leading-whitespace tolerance, evidence/sim-report.txt (the real report: spec headers at column 0, summary lines indented two spaces)
Mutant: `sed 's/\^\[\[:space:\]\]\*/^/g'` over the extracted `run:` block, so every `^[[:space:]]*` becomes `^` (the five anchors and the three trimming `sub`s); run as `awk -f mut.awk sim-report.txt`.
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | n/a | n/a | n/a | 4740 = 5.5% |
| brute | n/a | n/a | n/a | 3770 = 2.7% |
| shieldbarer | n/a | n/a | n/a | 7730 = 11.9% |

Runtime: 2056.5 s

The full report is the `sim-report` artifact of this run.
##### no leading-whitespace tolerance, same mutant, evidence/sim-report.txt with every line indented four spaces
exit=1
**The simulator printed no report** (no "CI thresholds summary" line). The raw output is in the `sim-report` artifact.
##### unmutated step, evidence/sim-report.txt (what the PR run's summary step computes from its own capture)
exit=0
| spec | floor-1 | first soul | floor 5 | round-cap draws |
| --- | --- | --- | --- | --- |
| sorcerer | PASS | PASS | PASS | 4740 = 5.5% |
| brute | PASS | PASS | PASS | 3770 = 2.7% |
| shieldbarer | PASS | PASS | PASS | 7730 = 11.9% |

Runtime: 2056.5 s

The full report is the `sim-report` artifact of this run.
##### missing-report exit removed, missing.txt
exit=0
**The simulator printed no report** (no "CI thresholds summary" line). The raw output is in the `sim-report` artifact.
##### pipefail
with pipefail exit=1
without pipefail exit=0
```
