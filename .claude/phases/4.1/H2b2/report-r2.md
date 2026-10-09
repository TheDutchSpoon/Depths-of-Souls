# Report r2 — Phase 4.1 — Slice H2b2: two test gaps

Test-only. No change to `src/engine` or `src/data` source (`resolution.ts` was mutated in place for the
mutation runs and restored from a copy; `git status` shows only the files below). Branch
`phase-4.1-slice-h2b2` on `9dcdc14`.

## Fix 1 — the bearer's taken factors on a tick

- **Added:** `golden-h2b2-tick-taken-factors` (`.fixture.ts` + `.test.ts`), hand-derived, header carries the
  arithmetic. Applier A (Attack 100, potency 20) Poisons B (Defence 20, all vitality) and applies the real
  `vulnerability` status, both before any turn.
  - R1 tick: 20 × 1.5 − 4 = **26** (B 100 → 74). Without the factor: 16.
  - R2, B Defends (Defence 30, ×0.65 first, then ×1.5): 20 × (0.65 × 1.5) − 6 = **13.5 → 13** (B 74 → 61).
    Without the bearer's factors: 20 × 0.65 − 6 = 7.
  - The expected values were derived by hand in the header before the first run; the first run matched.
- **Mutation** (`takenFactors: [...defendFactors]` in `applyTickDamage`), full suite: 2 failed, the new golden
  and `corpus-digest.test.ts`; 1294 passed. Restored: green.
- **Before the golden existed:** I did not reproduce a run without it. The full-suite mutation fails the digest
  plus the new golden only, so nothing else catches it; the hand-out's "only the digest" baseline is taken from
  the hand-out, not re-run. (My `--exclude` attempt did not exclude the files, so it proved nothing.)

## Fix 2 — "the same status" in the pass-on rule

- **Added:** one test in `status-snapshot.test.ts`, describe "pass-on rule: only the SAME status inherits the
  firing instance's snapshot". Local status `h2b2-seeder` (potency 20% Attack, one `on-turn-end` tick, a second
  `on-turn-start` trigger applying `poison` to self), checked with `validateStatusDef`. A (Attack 50) applies it
  to B (Attack 20): its snapshot is `{A, vitality, 10}`. Firing B's `on-turn-start` gives Poison
  `{applierId: B, vitality, potency 4}` (B's fresh one), not X's `{A, 10}`.
- **Mutation** (`context.statusId !== undefined ? context.snapshot : undefined`), full suite: 1 failed, the new
  test only; 1295 passed. Restored: green. (The slice has no digest effect for this mutation, as the hand-out
  said.)
- My first draft put the extra status in `state.registries`, which the engine doesn't read (`state.statuses`),
  so it threw "unknown statusId" unmutated. Fixed before the final mutation runs.

## Gates (on the final tree)

| Gate | Result |
|---|---|
| `npm run test` | 193 files, **1296 passed + 1 skipped (1297)** |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |

## Test count against `9dcdc14` (192 files, 1295 tests)

| File | 9dcdc14 → now |
|---|---|
| `golden-h2b2-tick-taken-factors.test.ts` (new) | – → 1 (+1 file, +1) |
| `engine/status-snapshot.test.ts` | 23 → 24 (+1) |
| **Net** | 1295 → 1297 (+2), 192 → 193 files |

## Unchanged things

- No existing fixture or test file is modified (`git status`: `status-snapshot.test.ts` modified; two new golden
  files; the phase record). So every existing golden's expected exports and `corpus-digest.fixture.ts` are
  byte-identical to `9dcdc14` by construction; I did not run an import-and-deep-compare of the two trees.
- Corpus digest: unchanged, not regenerated (`corpus:update` not run); `corpus-digest.test.ts` passes on the final
  tree.
- Golden policy: the new golden is hand-derived, replays through the shared `runGolden`, and compares the
  fixture's own `expectedEvents`.

## Phase record

`.claude/phases/phase-4.1-fix-and-consolidation.md`, "4.1-H2b2": two mutation rows added (24 in all), the test
count line updated (193 files, 1297), and the new golden added to the file list. No living doc or content doc
edited.

## Spec questions

None.

## Content changes

None.

## To delete

Nothing.
