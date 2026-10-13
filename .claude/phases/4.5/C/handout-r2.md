# Hand-out r2 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c`, reviewed at `459ff06`. The engine, the tests, the goldens and the corpus fixture are
approved as built, the `turnClock` pin included. This round is comment wraps and two evidence edits.
No code changes, no test changes, no expected value changes and no new evidence runs. Every gate stays
as it is (1908 tests, 1907 passed, 1 skipped). The corpus fixture is not regenerated.

Items 1 to 4 are line wraps, with the words unchanged. Keep each rewrapped line at most 100 columns,
and don't end a line early in the middle of a sentence.

## Items

1. **`src/data/statuses.ts:124–128`, the `WEB` doc.** Line 127 is 138 columns ("bad-luck backstop.
   The reward lives in the Spiders' Ambusher exploit … Re-applying"). Rewrap lines 124–128 so every
   line is at most 100 columns.
2. **`src/engine/__golden__/golden-spider-broodwarden.fixture.ts:15–18`.** Line 16 ends early ("…
   rolls once per living") and line 17 is 105 columns ("Web-bearer at every living creature's turn
   end, … Both Webs were applied at"). Rewrap lines 15–18.
3. **`src/engine/__golden__/golden-provoke-stun-cleanup.fixture.ts:30` and `:33`.** Each is 101
   columns ("PROVOKER is still alive, … comes up dead," and "Captured as exactly 5 explicit
   resolveTurn steps …"). Rewrap the paragraph each one is in.
4. **`.claude/phases/4.5/C/record.md:35`, the "Corpus" bullet.** The line is 173 columns. Wrap it
   like the bullets around it (two-space continuation indent, about 100 columns). Words unchanged.
5. **`.claude/phases/4.5/C/evidence/corpus-table.md`, which reading each part uses.**
   - Lines 25–30 now have two lead-ins in a row that contradict each other: "Splitting them by
     comparing final with main minus the dead brackets and everything inside them:" and then "Under
     stage 1's reading (… any Web `StatusExpired` inside them kept in place):". The 318 / 75 table
     uses stage 1's reading. Replace both with one lead-in: "Splitting them by comparing final
     with stage 1's reading of `main` (the dead brackets removed, any Web `StatusExpired` inside
     them kept in place):".
   - Line 42, "First differing event of the 74 (main minus dead brackets, then final)": that table
     was counted with everything inside the dead brackets dropped. Make the parenthesis "(main
     minus the dead brackets and everything inside them, then final)". Don't change the table.

After the edits: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` and `-- comments`. Items 1 to 3 change only comments, so
`npm run docs:check -- comment-proof 459ff06` must pass for every file. Say so in the report.
Report as `report-r3.md`.
