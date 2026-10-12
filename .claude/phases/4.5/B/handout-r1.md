# Hand-out — 4.5-B, round 1

**Verdict: fixes, cleanup only.** The slice's behaviour is approved as built at `74171ef`. Every
item below is a comment, a golden header or evidence wording. No engine behaviour, no expected
event and no test count may change.

## Items

1. **`golden-death-observed.fixture.ts`: write out the after values.** `fires()` computes
   `effectiveAfter: 20 * factor`. Instead, give `fires()` the after value as a literal argument,
   and state each one in the header beside its factor: ×1.1 → `22.000000000000004` (the JS float,
   as `golden-rot-sovereign` writes its floats), ×1.2 → `24`, ×1.3 → `26`, ×1.4 → `28`.
   `enemyDiesExpected` and `playerDiesExpected` must stay deep-equal to `74171ef`'s.
2. **The Rot Sovereign's block comment** in `src/data/traits/rotcap-hollow.ts` (above
   `ROT_SOVEREIGN_TRAIT`) ends on a broken wrap: "blanket, unconditional each" / "of her own
   turns.". Re-wrap the paragraph so its last sentence reads as one line run.
3. **`golden-damage-observed-lethal.fixture.ts`, header step 4**, names only FLARE and GLEAM as
   death observers. Name the whole pass in tie-break order: FLARE (no death observer), GLEAM (fires
   its Last Light: Attack ×1.2 to every living ally, FLARE 14, GLEAM 24, A 20), then A and E (no
   death observer).
4. **Re-wrap the comment lines this slice wrote that run past 100 columns**, to the wrap of the
   comment around them (line numbers at `74171ef`): `src/data/traits/rotcap-hollow.test.ts:3`,
   `src/data/traits/rotcap-hollow.ts:82`, `golden-damage-observed-lethal.fixture.ts:4` and `:23`,
   `src/engine/effect-types.ts:359`, `:689` and `:1007`, `src/engine/resolution.ts:296` and
   `:593`. Error-message strings and test titles stay as they are. Leave older over-long lines
   alone.
5. **`evidence/corpus-attribution.md`, the "Order change" column.** "First diverging span" today
   runs from a fight's first differing event to its last, across several deaths (fight 114: events
   227–1211), and its "first firings" list includes triggers that aren't death observers
   (`hollowkin-wretch`). For each name + order fight, give:
   - the number of reordered blocks, a block being the shortest run of events, from the first
     difference, over which `main`'s mapped log and the branch's hold the same multiset;
   - the first block's event range;
   - the first block's `on-death-observed` firings in `main`'s order and in the branch's.

   The counts, the method paragraph and the other columns stay. There are 30 blocks in total
   across the 13 fights.

## The report (`report-r2.md`) must show

- The gates, as in `report-r1.md`, all green, with the test count unchanged (1876; 215 files).
- `npm run docs:check -- comment-proof 74171ef` passes for every changed `src` file except
  `golden-death-observed.fixture.ts`. For that file: its two expected exports and its scenario
  exports deep-equal `74171ef`'s (a throwaway test importing both versions).
- The corpus digest fixture is unchanged from `74171ef`.
- The new block count per fight in the evidence table sums to 30.
