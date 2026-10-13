# Hand-out r1 — 4.5-C: a dead creature's turn is skipped entirely; `resolveTurn` refuses a finished fight

Branch `4.5-c`, reviewed at `2f11823`. The engine change, the roster and the golden changes are
approved as built. This round is one added assertion, plus comment, title and evidence edits. No
engine code, no test logic beyond the one assertion, and no existing expected value changes. Every gate
stays as it is (1908 tests, 1907 passed, 1 skipped). The corpus fixture is not regenerated.

## Items

1. **Pin "no turn-clock bump" in `golden-dead-slot-skip`.** Removing it fails nothing today: with a
   dead slot bumping `turnClock` again, every test passes, the corpus digest included. The bump is
   invisible to behaviour, because every born-this-turn read comes after the actor's own bump. But
   the rule says a dead slot gets no bump, and the fixture header claims it.
   - In `golden-dead-slot-skip.fixture.ts`, add `export const expectedTurnClock = 2` beside
     `expectedDraws`, with a one-line doc: HERO's turn and E's turn each bump once at the action
     slot, and D's dead slot doesn't (a bump there would make it 3).
   - In `golden-dead-slot-skip.test.ts`, import it and assert `state.turnClock` equals it.
   - Confirm it fails with a clock bump added to the dead-slot branch of `resolveTurn`'s dequeue
     loop (scratch copy), and add that row to `evidence/mechanism-removal.md`'s table.
2. **The corpus split: 318 brackets only, 75 at a removed Web draw.** "Brackets only" means stage
   1's reading: `main`'s log with the empty brackets removed and any Web `StatusExpired` inside them
   kept in place. Fight 126 is not brackets-only by that reading. `main`'s dead-slot rolls broke
   `treant-sapling-enemy-0`'s Web; on the branch the Web holds, and the fight ends a turn later,
   so the missing `StatusExpired` is the only visible change. That is a removed Web draw.
   - `record.md` (Tests and goldens, "Corpus"): "393 rows changed (318 brackets only, 75 at a
     removed Web draw: 74 diverge in later events, and in fight 126 only the dead slot's
     `StatusExpired` goes)".
   - `evidence/corpus-table.md`: make 318 / 75 the class table's split, under stage 1's reading.
     Put fight 126 in the Web-draw class with one line saying what changes in it. Keep the
     first-differing-event table for the 74 that diverge in later events. Say once that the
     kickoff's expected 319 / 74 counted fight 126 as brackets-only.
   - `report-r1.md` is history: leave it.
3. **Name `main` by its commit in the evidence.** `evidence/corpus-table.md:6`,
   `evidence/guard-alone.md:3` and `evidence/balance-and-roster.md:8` call `main` "`e8d0ffd`". That is
   the branch's plan-review commit (its `src/` equals `main`'s). Write `main` (`dd703a4`).
4. **`src/engine/combat.test.ts:1030`, test title.** "a Web-bearer draws exactly one roll per
   dequeued turn (count == number of TurnStarted events)": a dead slot is dequeued and draws
   nothing. Make it "per turn".
5. **`src/engine/__golden__/golden-spider-broodwarden.fixture.ts:17`.** "rolls once per LIVING
   Web-bearer at EVERY creature's turn end": make it "at every living creature's turn end".
6. **`src/engine/__golden__/golden-rot-sovereign.fixture.ts:109`.** "WEAK's and ADD's own (now-empty,
   skipped-since-dead) queue slots are never reached": "now-empty" refers to the empty bracket that
   no longer exists. Make it "WEAK's and ADD's own queue slots (both dead) are never reached".
7. **Rewrap the comments the edits left over 100 columns or broken**, words unchanged:
   - `src/data/statuses.ts:124–128` (`WEB`'s doc; line 126 is 136 columns);
   - `src/engine/__golden__/golden-broodmother.fixture.ts:134–136` (the `TURN_STEPS` comment);
   - `src/engine/__golden__/golden-provoke-stun-cleanup.fixture.ts:33–36` (the line "turn-start
     sequencing, not" breaks mid-sentence) and `:138–139`;
   - `src/engine/combat.ts:186–189` (`rollWebBreakFree`'s doc: "against every LIVING" / "bearer of
     an active" / "status-borne …" now wraps short) and `:389–390` ("Turn-start hooks fire on the
     acting creature, after the" / "TurnStarted boundary.").

After the edits: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`,
`docs:check -- citations` and `-- comments`. Items 2 to 7 change no code, so
`npm run docs:check -- comment-proof 2f11823` should pass for every file except
`golden-dead-slot-skip.*` (item 1) and `combat.test.ts` (a title, item 4). Say so in the report.
Report as `report-r2.md`.
