# PR review, round 2 — 4.5-G3: The demo, adjustments, trait and perk text

Reviewed: branch `4.5-g3` at `0f30e43`, against `origin/main` at `0f2f2fe`. The fix diff starts at
round 1's commit `ea42fa1`. Inputs: `kickoff.md`, `plan.md`, `plan-review.md`,
`plan-handout-r1.md`, `review-r1.md`, `handout-r1.md` and `report-r2.md`.

## Verdict

**Approved.** Both hand-out items are fixed in the code. The fix diff touches nothing else:

- `src/data/descriptions.test.ts`: 3 lines changed;
- `src/data/traits/glimmerdark.ts`: 3 strings changed;
- no other file under `src/`, `e2e/` or `scripts/`, and no change to `package.json` or
  `package-lock.json`.

## Real fixes

None left.

- **Item 1, the fixture case.** The case now asserts `traitDescription(BRUTISH.id)` throws
  `no stock trait brutish`, with `BRUTISH` imported from `src/engine/__fixtures__/traits.ts`. The
  `'no-such-trait'` assertion stays. The title and the file's 9 cases are unchanged. The message
  is built as `` `no stock trait ${BRUTISH.id}` `` rather than the literal; it is the same string
  (`BRUTISH.id` is `'brutish'`).
- **Item 2, "itself included".** The three Resonant descriptions open "Whenever an ally, itself
  included, casts a spell,". The rest of each sentence is byte-for-byte round 1's. All three carry
  `observationFilter: { relationship: 'ally', actionKind: 'cast' }`, and `ally` includes self
  (`spec/effects.md#action-reactions-actor-self-hooks-or-observation`). That matches the
  section sentence in `content/glimmerdark.md#resonants-wit-caster-synergy`.
- **The evidence file.** `evidence/transcription.md`'s description column matches all 61 shipped
  trait strings exactly. The three rows' dropped column now says the section sentence is folded in.

## Scope and labeling

- **The report skipped the strip comparison** the hand-out asked for. It argued the rerun was
  unneeded, and the code bears that out. I reran it (below), so nothing is missing from the
  record. No hand-out item: the report is not part of the build.
- **The content doc stays as it is.** The three `###` entries in `content/glimmerdark.md` still
  read "Whenever an ally casts a spell". The section sentence is the one home of "themselves
  included", and the entries sit under it. The shipped text has to stand alone; the doc entry
  doesn't. Repeating the rule in each entry would duplicate it. No edit.

## Decide-points

None. Round 1's D1 (Proficient's description) and D2 (PNG evidence) stand as Duncan decided, and
the fix diff touches neither.

## What was verified, and how

**Gates**, in a fresh clone (`npm ci` on both trees, Node 22.22.0):

| Gate | Result |
| --- | --- |
| `npm run test` (JSON reporter) | 257 files, 2235 passed, 1 skipped (2236) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 700 citations in 526 files |
| `npm run docs:check -- comments` | PASS, 7633 comments and 1996 titles in 492 files |
| `npm run docs:check -- budgets` | 13 files, 0 over |

**Test count**, file by file against `main` (2210, 254 files) with the JSON reporter: 2236 in 257
files. The changed files are exactly round 1's, with the same counts:

- `playback.test.ts`: 23 → 20;
- `creatureLine.test.ts`: 7 → 9;
- `perkRows.test.ts`: 11 → 13;
- `soulRows.test.ts`: 6 → 10;
- new files: `followLog.test.ts` 9, `descriptions.test.ts` 9, `descriptions.types.test.ts` 3.

**Golden policy:**

- `git diff --stat origin/main 0f30e43 -- src/engine src/state e2e` is empty.
- I imported all `__golden__/*.fixture.ts` on three trees (`main`, `ea42fa1` and `0f30e43`),
  1341 exports each, and deep-compared every export:
  - **`main` against the branch:** 44 exports differ, the same set as round 1 (the `traits`
    registries and the Wick and Last Gleam sub-fixtures). With every `description` removed, none
    differs.
  - **Round 1 against round 2:** the same 44 exports differ. With the three Resonant
    descriptions masked, none differs. That is expected: those registries embed every stock
    trait. No expected value moved.
- **Strip comparison, rerun:** I took `STOCK_TRAITS` and `SPECIALIZATIONS` with every
  `description` removed, functions compared by source. They are identical on `main`, `ea42fa1`
  and `0f30e43` (21,792 bytes each). This is my own serialization, so the byte count differs
  from round 1's 64,892.
- **Stock descriptions:** exactly three of the 61 trait descriptions changed between round 1 and
  round 2, the three Resonants.

**Mutation check, item 1** (scratch worktree):

- I built `STOCK_TRAITS_BY_ID` from `STOCK_TRAITS` plus `BRUTISH` (given a description).
- **The new test:** the case fails ("expected [Function] to throw an error"; 1 failed, 8 passed).
  With the map restored, all 9 pass.
- **Round 1's test file under the same widened map:** all 9 pass. So the old case could not
  catch this, and the new one does. Item 2 adds no mechanism; no test pins the strings, as the
  hand-out said.

**Leftover sweep**, rerun on the final commit over `src/` and the living docs. I searched for
`START_WAIT`, "starts shortly", `'waiting'`, "3 seconds", "three seconds", "a few seconds",
`timerKey`, `fixture-trait` and "Whenever an ally casts". None is a leftover:

- "a few seconds" in `spec/saves.md` is the save debounce, which has nothing to do with this
  slice.
- `fixture-trait` appears in `src/engine/__fixtures__/biomes.ts` and
  `src/engine/spell-effects.test.ts`. Both are engine fixtures this slice doesn't touch, and they
  were the dangling id round 1 found.
- "Whenever an ally casts" appears only in the three `content/glimmerdark.md` entries, which stay
  as they are (see Scope).

**Mailbox:** the step files and `evidence/` only. The PNGs are kept under round 1's D2. Nothing
to delete.

## Docs edited

None. Round 1's doc edits (in `e4688fc`) cover the slice, and the fix diff makes no new decision.
