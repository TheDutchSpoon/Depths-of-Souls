# PR review — 4.5-B: on-death-observed, and `createCombat` validates its trait registry

## Round 3

**Branch** `4.5-b`, commit `af3ec4e` ("fix 2"), against `main` at `d9d3e86` and round 2's
`7ca4b09`. Reviewed in my own clone (worktrees for the branch and `main`, fresh `npm ci` each), not
in the working tree. `7ca4b09` is compared by `git diff`: the fix diff touches three `src` files
and nothing under `__golden__`, `__corpus__` or `src/data`.

**Verdict: approved.** The three round-2 hand-out items are done as asked, the fix diff changes
only those three lines' worth of comment and title text, and the final leftover sweep is clean.
No hand-out this round.

### Real fixes

None.

### Round-2 hand-out, checked in the code

1. **`FireHookOptions.observedDamage`'s doc** (`resolution.ts:444–449`) now says all three
   observation hooks fail closed and names each case: `on-damage-observed` without
   `observedDamage`, `on-action-observed` without `observed`, `on-death-observed` when its
   `source` is absent or not in the state. That matches `fireHook`'s inline block (`:542`) and
   `spec/effects.md#damage-observation`'s fail-closed bullet. No line over 100 columns.
2. **`damage-observation.test.ts:332`** is `describe('on-action-observed and on-damage-observed
   fail closed', …)`. Its two tests are unchanged.
3. **`death-observed.test.ts:139`**: the comment is on its own line above the `expect`, same
   indent.

### Leftover sweep (final commit, `src/` and the living docs)

- `on-ally-death` / `on-enemy-death`: no hit. Only the plain words round 1 accepted remain
  (`golden-rot-sovereign`'s "the ally-death growth", the test-local id `'ally-death'`).
- **Hook counts:** every "observation hook" mention in `src/` and the living docs now counts
  three or lists all three (`effect-types.ts:677`, `:716`, `:1007`; `resolution.ts:446`, `:542`;
  `spec/effects.md:310`). `death-observed.test.ts:1`'s "the other two observation hooks" is
  right. No "17 hooks" left.
- `livingIdsOf` has one definition (`creature-lookup.ts`); `validateTrait` is defined only in
  `engine/effect-types.ts`, and `data/traits/index.ts` imports it.
- **Line length:** every line the slice adds over 100 characters (counted in characters, not
  bytes) is a test title or the `effect-types.ts:395` error template, both strings Prettier
  keeps whole. No comment line is over.

### Gates (my run, `af3ec4e`)

| Gate | Result |
| --- | --- |
| `npm run test` (Vitest JSON) | 1875 passed, 1 skipped (1876 tests, 215 files); `main`: 1851 + 1 (1852, 212) |
| `npm run lint`, `format:check`, `build`, `npx tsc -b` | clean |
| `docs:check -- citations` / `comments` | PASS (636 citations in 439 files; 7040 comments, 1651 titles) |
| `docs:check -- budgets` | 12 files, 0 over |
| `docs:check -- comment-proof 7ca4b09` | OK for `resolution.ts` and `death-observed.test.ts`; FAIL for `damage-observation.test.ts` only on the `describe` title, as the hand-out expects |
| Vitest | 5.0.3, matching the lockfile |

**Test count, file by file** against `main`: +13 `death-observed.test.ts`, +5
`rotcap-hollow.test.ts` (`data/traits`), +2 `golden-death-observed.test.ts`,
`damage-observation.test.ts` 64 → 68. Every other file has the same count. That is +24, the
same as rounds 1 and 2. Both trees ran green alone, with no timeouts.

### Invariants, verified mechanically

- **The fix diff** (`git diff --stat 7ca4b09 af3ec4e -- src`): `damage-observation.test.ts` (1
  line), `death-observed.test.ts` and `resolution.ts`, as the report says. The rest of the commit
  range is mailbox files and Duncan's `workflow/pr-review.md` change (`fc459fe`).
- **Every golden fixture export, both trees** (throwaway `import.meta.glob` dump, removed after):
  134 fixtures and 1,234 exports on `main`, 135 and 1,242 on the branch. The three listed
  expected arrays (`golden-damage-observed-lethal`'s `expectedEvents`, `golden-last-gleam`'s
  `allyDiesExpected`, `golden-rot-sovereign`'s `expectedEvents`) are equal after the name map.
  Every other difference is a trait registry carrier, and walked entry by entry the only differing
  registry ids are the 7 migrated traits (8 triggers): Last Gleam, Grudge, Gravedigger, Warder,
  Thicket, the Sovereign, Scavenger. That is the same as round 2.
- **Corpus digest:** `git diff 7ca4b09 af3ec4e -- src/engine/__corpus__` is empty. Against
  `main`, exactly 143 rows differ, as in rounds 1 and 2.

### Mutation check (what the fix touched)

The fix diff changes two comments and one `describe` title. It adds or changes no mechanism, and
the hand-out asked for no new pin, so there is nothing to remove.

### Decide-points

None.

### Mailbox

Holds `brief`, `kickoff`, `plan`, `plan-review`, `plan-handout-r1`, `report-r1`, `record`,
`review-r1`, `handout-r1`, `report-r2`, `review-r2`, `handout-r2`, `report-r3`, this review and
`evidence/corpus-attribution.md`. `record.md`'s numbers and file list still hold. **To delete:**
nothing.

### Docs edited

None this round. Round 1's `spec/effects.md` edits stand, and the fix changes no rule.
