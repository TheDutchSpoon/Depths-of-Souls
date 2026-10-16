# Plan hand-out, round 1 — 4.5-G3

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins.

Re-read: `phases/4.5/brief.md#demo-adjustments-g3`, the "Results under the log" bullet (its
wording changed: the results stay on the page below the box, one page-scroll down when the box
fills the screen; the layout the plan describes is unchanged).

## 1. The log box's height (Viewer layout and log box, `useFillViewport`; ASSUMPTION A4)

- The box's top is its distance from the top of the **document**:
  `getBoundingClientRect().top + window.scrollY`, never the viewport-relative top. The height is
  `max(10lh, calc(100dvh - <top>px - <margin>))`, set through the ref as planned.
- The height is recomputed whenever anything above the box changes height, inside the viewer or
  outside it. That includes `RunScreen`'s refusal line and floor preview line, which appear and
  disappear mid-playback when the floor field is edited or a hub action changes `canDescend`.
  Use a `ResizeObserver` on the run column's section (or a layout effect with no dependency list,
  plus the `resize` listener). The height depends only on what is above the box, so setting it
  never triggers another change.
- The browser click-through adds one check: with playback running at 1920×1080, type an invalid
  floor into the field so the refusal line shows and the preview line goes. The bottom of the box
  stays at the bottom of the viewport. Screenshot it.

## 2. The compiler test (`src/data/descriptions.types.test.ts`; Mechanism table, "The compiler refuses")

- (a) A literal annotated `DescribedTrait` with no `description`.
- (b) A plain `Trait` value in an array annotated `(typeof STOCK_TRAITS)[number][]`, so the test
  holds the exported collection's type, not just the type name.
- (c) A specialization literal annotated `(typeof SPECIALIZATIONS)[number]` whose `perks` holds a
  plain `PerkDef`.
- Each `@ts-expect-error` sits inside a `test`, and the declared value is used in an `expect`, as in
  `src/engine/injured-allies.test.ts`, so the intended error is the line's only error.
- The report's check: make each line valid in turn (add the description, or use the described
  type). `npx tsc -b` then fails with "Unused '@ts-expect-error' directive"; restore the line.
  Show the three failures.

## 3. The mechanism table (Mechanism → the test that fails without it)

- **Speed change before the first beat reschedules it:** covered by the rewritten first case
  (`initialPlayback()` equals `playing(0, 0)`) together with the existing "a speed change while
  playing changes the key". No new case in `playback.test.ts`; its changes stay exactly the six
  listed in the plan.
- **Soul rows use the shared template lookup:** checked in the PR diff, not by a test.
  `soulRows.ts` imports `templateOf` from `creatureLine.ts` and has no template lookup of its own.
  The `templateOf` tests and "`soulRows` with an empty `templates` throws" stay.
- **Order of the trait lines:** no stock creature has more than one innate trait. The order case
  passes a test template with two stock trait ids through `soulRows`'s `ctx` parameter (A8). The
  names-versus-descriptions case uses real creatures (`sorcerer-starter`, `brute-starter`).

## 4. The new test files (ASSUMPTION A9)

- `src/data/descriptions.test.ts` covers:
  - the trait and perk lookups (known ids; unknown ids and a fixture trait's id throw);
  - every description non-blank with no Markdown;
  - the counts 61 and 32;
  - perk ids unique across the three specializations.
- `src/data/descriptions.types.test.ts` holds the compiler test (item 2).
- No other new data test file. Both files run in the Node test project and are checked by
  `npx tsc -b`.
