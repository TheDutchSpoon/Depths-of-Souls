# The two tick-fizzle goldens fail with only the fizzled `TriggerFired`s gone

With the HP%, retaliation and Last Stand changes all in (before any test was added or the corpus
regenerated), `npx vitest run` on the branch: 3 failed, 1904 passed, 1 skipped (baseline on the
branch base: 1907 passed, 1 skipped). The three failures:

| Test | Diff against the committed log |
| --- | --- |
| `golden-hollowkin-wretch-self-dot` | one event removed: Madness Touch's `TriggerFired` (`on-damage-taken`, `hollowkin-wretch`) after the Poison tick's `DamageDealt` |
| `golden-status-snapshot-tick-no-retaliation` | two events removed: Snapback's and Madness Touch's `TriggerFired` (`on-damage-taken`, `b`) after the tick's `DamageDealt`; Sleep's `TriggerFired` and its wake are unchanged |
| `corpus-digest.test.ts` | the expected regeneration (`phases/4.5/D/evidence/kickoff-probe.md#corpus-digest`) |

This matches `phases/4.5/D/evidence/kickoff-probe.md#full-suite-under-all`. No other test is red.
