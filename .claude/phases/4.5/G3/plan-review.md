# Plan review — 4.5-G3: The demo, adjustments, trait and perk text

## Round 1

Reviewed: `plan.md` at `69e104c`, against `kickoff.md`, `phases/4.5/brief.md#demo-adjustments-g3`,
`phases/4.5/brief.md#trait-and-perk-text`, the brief's two (G3) assumptions and
`phases/4.5/brief.md#demo-golden-rule`, and the code the kickoff lists (`src/app/playback.ts` and
its test, `src/ui/DescentViewer.tsx`, `src/ui/RunScreen.tsx`, `src/app/App.tsx`, `src/index.css`,
the hub rows, `src/data/traits/index.ts`, `src/data/specializations.ts`, `vite.config.ts`,
`tsconfig.app.json`).

### Verdict

**Approved, with the plan fixes below**, which the round's hand-out carries. The golden policy
matches the kickoff (byte-identical goldens, digest, engine/store tests and e2e; data additive; only
`playback.test.ts` changes among existing tests, case by case as listed; stop on a moved golden,
digest or copied-fight JSON). The playback change, the follow/hold design and the data typing are
right. One real gap (the box's measured top) and some test claims that are stronger than the tests.

### Plan fixes

1. **The box's top is measured wrong in two cases** (Viewer layout, `useFillViewport`; A4).
   - The plan observes "the block above the box" inside the viewer. Content above the viewer
     changes height too: `RunScreen`'s refusal line and preview line come and go as the floor
     field is edited or a hub action changes `canDescend` (an emptied party), all mid-playback.
     The kickoff names this ("the picker's refusal or preview line may or may not show").
     Observed only inside the viewer, the box keeps its old height and its bottom leaves the
     viewport.
   - "The box's top" must be its distance from the top of the **document**
     (`getBoundingClientRect().top + window.scrollY`), not from the viewport. Measured while the
     page is scrolled (a 1280×720 window, or after scrolling down to Jump), a viewport-relative top
     gives the wrong height.
   - Fix: recompute on any layout change above the box, inside or outside the viewer (a
     `ResizeObserver` on the run column's section, or a layout effect without dependencies plus
     `resize`), always from the document-relative top. Setting the height must not feed the
     observer a change that resizes the box again (the height depends only on what is above it).
     The click-through adds one check: with playback running, type an invalid floor into the
     field (the refusal line shows, the preview goes) and the bottom of the box stays at the
     bottom of the viewport.
2. **The compiler test must hold the real collections, not only the type names**
   (`descriptions.types.test.ts`). As planned, (b) and (c) check `DescribedTrait` and
   `DescribedSpecialization`. If `STOCK_TRAITS` were widened back to `readonly Trait[]`, they would
   still pass. Write (b) against `(typeof STOCK_TRAITS)[number]` and (c) against
   `(typeof SPECIALIZATIONS)[number]`. Follow `src/engine/injured-allies.test.ts`: each directive
   sits inside a `test` and the declared value is used in an `expect`, so the intended error is
   the line's only error (`noUnusedLocals` would otherwise keep the directive satisfied with the
   real error gone). The report's check: make each line valid in turn (add the description, use
   the described type). `npx tsc -b` must then fail with "Unused '@ts-expect-error' directive";
   restore the line.
3. **The mechanism table claims tests that aren't there.** Correct these rows:
   - *Speed change before the first beat:* no case tests `timerKey` on the initial state (the
     plan drops the only one). What covers it is case 1 (`initialPlayback()` equals
     `playing(0, 0)`) plus the existing "a speed change while playing changes the key". Cite
     those two; add no case.
   - *Soul rows use the shared template lookup:* no test fails with a second copy (a copy throws
     too). Say it's checked in the PR diff (`soulRows.ts` imports `templateOf` and has no template
     lookup of its own). Keep the `templateOf` and empty-`templates` tests.
   - *Order of trait lines:* no stock creature has more than one innate trait. The order case uses
     a test template with two stock trait ids, passed through the new `ctx` parameter. Say so.
     The names-vs-descriptions case stays on real creatures (`sorcerer-starter`,
     `brute-starter`).
4. **The new test files have one name each.** The table says `traits/descriptions.test.ts` and
   `descriptions.test.ts`, and A9 says `descriptions.test.ts`. Use
   `src/data/descriptions.test.ts` (trait and perk lookups, the data checks, the counts and perk id
   uniqueness) and `src/data/descriptions.types.test.ts`. Both run in the Node project (its
   catch-all `src/**/*.test.{ts,tsx}`) and are checked by `npx tsc -b` (`tsconfig.app.json`
   includes `src`).

### Assumptions

- **A1** (1920×1080 is the viewport at 100% zoom): **confirm.** It's the kickoff's own reading,
  and the box fills whatever viewport there is.
- **A2** (`DescribedTrait`, `DescribedPerkDef`, `DescribedSpecialization`, `traitDescription`,
  `perkDescription`, `templateOf`): **confirm.**
- **A3** (4 px follow tolerance, as an input): **confirm.** It covers fractional positions at
  125% scaling and stays well under one line (~18 px), so scrolling up a single line still holds.
- **A4** (`max(10lh, 100dvh − top − margin)` via a ref, `lh`/`dvh` available): **correct** the
  measurement per plan fix 1. The formula, the ref and the units stand (`lh` needs Chromium 109,
  Firefox 120, Safari 16.4, all current). `.log-box` sets its own `line-height`, so `10lh` is ten
  lines of its text.
- **A5** (perk lookup keyed by perk id; uniqueness pinned by a data test): **confirm.** The
  store's `perkSpend` is already keyed by perk id alone.
- **A6** (below the box: "After the fight", Debug: Copy, copy status, then the descent result):
  **confirm.** Nothing that can appear mid-playback sits above the box.
- **A7** ("Party going in" stays one paragraph; the click-through measures ≥ 10 lines at 6v6):
  **confirm.** `lineUpText` lines are short (`label: level N, H HP`), so the two line-ups fit side
  by side in the run column.
- **A8** (`soulRows` gains an optional `ctx` defaulting to `HUB_CONTEXT`; rows gain fields):
  **confirm.** The optional parameter keeps `SoulsSection`'s call and every existing test call
  unchanged, and it's what the order case (plan fix 3) needs.
- **A9** (new data tests in new files): **confirm**, with the names fixed by plan fix 4.

Nothing in the brief's Assumptions checklist is changed by the plan.

### Decide-points

- **D1. The results start at the fold.** The box fills the viewport down to its bottom edge, so
  at 1920×1080 everything below it ("After the fight", Copy, the fight list with Jump) begins
  exactly at the bottom of the screen and is always one page-scroll away. The brief says they
  "stay visible the whole time: nothing is hidden". The plan reads that as "on the page, never
  collapsed", not "on screen".
  **Recommendation: keep it (the plan as written)**, and reword the brief's line to say what the
  demo does. Why:
  - the brief's own reason for the move is that the fight being watched comes first;
  - "After the fight" was moved below because it gives the result away, and below the fold is
    where that works best;
  - the alternative, capping the box at some line count so results peek in on tall screens, is
    a number with nothing behind it. At 1080 it still couldn't show the whole list (floor line,
    boss line and up to 10 fight rows) without costing the box most of its height.

### Decisions

- **D1:** kept as planned. The box fills the viewport and the results sit below it, one
  page-scroll down at 1920×1080. The brief's line now says that.

### Notes

- The plan was committed and pushed on its own (`69e104c`), and the brief and kickoff each have
  their own commit, so "the first commit on the slice branch" holds only the brief. The plan
  review, its hand-out and any doc edits go in as the next commit. Duncan's call in the plan
  session, recorded there; nothing for the build.

### Docs edited

- `.claude/phases/4.5/brief.md` (`#demo-adjustments-g3`, "Results under the log"): "stay visible
  the whole time" reworded to what the demo does, the results on the page below the box (D1).
