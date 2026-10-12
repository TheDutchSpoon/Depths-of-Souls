# Hand-out — 4.5-B, round 2

**Verdict: fixes, cleanup only.** The slice's behaviour, goldens and corpus digest are approved
as built at `7ca4b09`. Every item below is a comment or a test title. No engine behaviour, no
expected event, no golden and no test count may change.

## Items

1. **`src/engine/resolution.ts`, `FireHookOptions.observedDamage`'s doc comment** (lines
   444–448). It still says "Both observation hooks FAIL CLOSED" and names two hooks. There are
   three. Rewrite the sentence so it says all three observation hooks fail closed: a candidate on
   `on-damage-observed` is skipped when `observedDamage` is absent, one on `on-action-observed`
   when `observed` is, and one on `on-death-observed` when its `source` (the dead creature) is
   absent or not in the state. Match `fireHook`'s inline fail-closed comment (around line 541),
   which already says this. Keep the comment's wrap (at most 100 columns).
2. **`src/engine/damage-observation.test.ts:332`**: `describe('both observation hooks fail
   closed', …)` covers only `on-action-observed` and `on-damage-observed`. The death hook's
   fail-closed test is in `death-observed.test.ts`. Rename the block to
   `'on-action-observed and on-damage-observed fail closed'`. Its two tests stay as they are.
3. **`src/engine/death-observed.test.ts:139`**: the trailing comment
   `// V is alive when its observers fire` takes the line to 101 columns. Move it onto its own line
   above the `expect`, at the same indent.

## The report (`report-r3.md`) must show

- The gates, as in `report-r2.md`, all green, with the test count unchanged (1875 passed, 1
  skipped; 1876 tests, 215 files).
- `npm run docs:check -- comment-proof 7ca4b09` passes for `resolution.ts` and
  `death-observed.test.ts`. For `damage-observation.test.ts`, `git diff 7ca4b09` of that file shows
  only the `describe` title.
- `git diff --stat 7ca4b09 -- src` lists only those three files.
- The corpus digest fixture is unchanged from `7ca4b09`.
