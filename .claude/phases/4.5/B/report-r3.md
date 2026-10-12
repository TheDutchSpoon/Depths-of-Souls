# Report r3 — 4.5-B, round 2 hand-out (cleanup)

Two comments and one test title only. Nothing committed, nothing deleted, no living doc edited.
`record.md` needs no change: its numbers (1875 passed, 1 skipped) and file list are unchanged.

## Hand-out items

1. **`resolution.ts`, `FireHookOptions.observedDamage` doc comment.** Now says "All three
   observation hooks FAIL CLOSED" and lists each: `on-damage-observed` skipped when `observedDamage`
   is absent, `on-action-observed` when `observed` is, `on-death-observed` when its `source` (the
   dead creature) is absent or not in the state. Wrap is at most 100 columns.
2. **`damage-observation.test.ts`.** The `describe` is renamed
   `'on-action-observed and on-damage-observed fail closed'`; its two tests are untouched.
3. **`death-observed.test.ts`.** The trailing comment `// V is alive when its observers fire` is on
   its own line above the `expect`, at the same indent.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1875 passed, 1 skipped, 0 failed (215 files, 1876 tests): unchanged |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 636 citations in 439 files |
| `npm run docs:check -- comments` | PASS, 7040 comments and 1651 titles in 406 files |
| `npm run docs:check -- comment-proof 7ca4b09` | OK for `resolution.ts` and `death-observed.test.ts`. FAIL for `damage-observation.test.ts` only because the `describe` title is part of the printed code (base `'both observation hooks fail closed'`, now the new title); `git diff 7ca4b09` of that file shows only that one line |

- `git diff --stat 7ca4b09 -- src` lists only `damage-observation.test.ts` (1 line),
  `death-observed.test.ts` and `resolution.ts`.
- The corpus digest fixture is unchanged from `7ca4b09` (`git diff --stat 7ca4b09 --
  src/engine/__corpus__` is empty); `corpus:update` was not run. No golden changed.
- No mechanism changed, so no removal tests apply.

## Spec questions

None new. The Spec questions in `report-r1.md` stand.

## Content changes

None.

## To delete

None.
