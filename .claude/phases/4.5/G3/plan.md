# Plan — 4.5-G3: The demo, adjustments, trait and perk text

Read: `coding-rules.md`, `kickoff.md`, `brief.md` (phase and slice), the demo code and carriers the
kickoff lists. Spec files read are the ones the kickoff names; the change reaches no other
subsystem (nothing in `src/engine`, `src/state`, `e2e`). Before building, `npm ci` and check the
Node and tool versions against `package-lock.json`.

## Golden policy (restated)

Goldens, the corpus digest, every existing engine/store test and `e2e/smoke.spec.ts` are
byte-identical; `src/data` changes additively only (descriptions, the described types and the
annotations using them, the lookups, new data tests, no existing data test touched). The only
existing `src/app` test file that changes is `playback.test.ts`, case by case as the kickoff lists;
`soulRows.test.ts` / `perkRows.test.ts` / `creatureLine.test.ts` only gain cases. If a golden, the
digest or the copied-fight JSON moves, stop and report. No golden is added; no `corpus:update`.

## Approach, by file

### Playback (waiting phase out)

- `src/app/playback.ts`: delete `START_WAIT_MS`; `PlaybackPhase = 'playing' | 'done'`;
  `initialPlayback()` = `{ phase: 'playing', fight: 0, revealed: 0, speed: 1 }`; drop the
  `waiting` branch of `timer-elapsed`; `pendingDelayMs` returns `SPEEDS[speed]` / `null` (done);
  `timerKey` is always `phase:fight:revealed:speed`. `skip-fight`'s guard stays (`!== 'playing'`,
  now only done). No zero-length wait, no mounted flag. The header comment loses its mention of a
  wait.
- `src/app/playback.test.ts`: the changes the kickoff lists, case by case (listed in the report):
  1. "the wait and the first beat" pair → `initialPlayback()` equals `playing(0,0)`, its delay is
     500, and a jump from the start to fight 2 gives `playing(2,0)`;
  2. delays test: drop the `3000` and `START_WAIT_MS` lines (and rename the title);
  3. drop "the current speed again while waiting" and "skip-fight while waiting";
  4. drop "a speed change during the wait leaves the key alone";
  5. "every move of the position changes the key": drop the `initialPlayback()` entry;
  6. the `skip-floor` line using `initialPlayback()` stays (still valid).

### Viewer layout and log box

- `src/ui/DescentViewer.tsx` (no new timer, no dispatch from scrolling). Render order, top to
  bottom: speed + skip buttons; fight title; "Party going in"; **Allies | Foes side by side**
  (two-column flex, each a `<pre>`); the **log box**; then, below it: "After the fight" line,
  **Debug: Copy fight as JSON**, the copy status line, the `DescentResult` (floor line, boss line,
  fight list). The `waiting` ternary and "Playback starts shortly" line go.
- `src/app/followLog.ts` (new, pure, `src/app` helper with unit tests):
  - `FOLLOW_TOLERANCE_PX = 4` (ASSUMPTION A3);
  - `isAtBottom({ scrollTop, clientHeight, scrollHeight }, tolerancePx): boolean` →
    `scrollHeight - (scrollTop + clientHeight) <= tolerancePx`; tolerance is an input;
  - `shouldResetFollow(prev: {fight, revealed}, next: {fight, revealed}): boolean` → true when the
    fight changed or `revealed` decreased (a jump, including to the same fight, empties the box;
    an empty box is at its bottom so it follows again).
- `src/ui/LogBox.tsx` (new, thin): a `<div tabIndex=0 role="log">` holding the text. A `followRef`
  (a ref, outside `PlaybackState`/`timerKey`) is updated **only in the `onScroll` handler**, from
  `isAtBottom` on the last scroll position, so it is read before the new beat renders. A
  `useLayoutEffect` on `[text, fight, revealed]` first applies `shouldResetFollow` against a
  previous-position ref (sets follow true on a fight change or a shrink), then, if following,
  sets `scrollTop = scrollHeight`; that programmatic scroll fires an `onScroll` that reads as at
  the bottom, so follow stays true. Skip-to-end-of-fight goes through the same path (following →
  lands at the bottom; held → untouched).
- Box height: `useFillViewport` (small hook in `src/ui/`) measures the box's top once the layout
  is laid out (a `ResizeObserver` on the block above the box plus `resize` listener; no timers) and
  sets `height: max(10lh, calc(100dvh - <top>px - <margin>))` on the element via its ref (no
  React state, no re-render). `10lh` is the 10-line minimum in line units (ASSUMPTION A4);
  the page scrolls to the results below when the viewport is short. The results never take height
  from the box.
- `src/index.css`: `.lineups` (flex row, gap), `.log-box` (`overflow-y: auto`, `line-height`,
  `white-space: pre-wrap`, `overflow-anchor: none`, border). `App.tsx` is untouched: the hub column
  and side panel stay siblings of the run column, nothing re-keys the viewer.
- `src/ui/DescentResult.tsx`: unchanged (only its position in the viewer moves).

### Hub rows

- `src/app/creatureLine.ts`: export `templateOf(ctx: Pick<HubContext,'templates'>, creatureId)`
  (the existing lookup with the same "no template" throw) and have `creatureLine` use it, so the
  souls row shares the lookup rather than copying it. Behaviour and error text unchanged.
- `src/app/soulRows.ts`: `SoulRow` gains `traitLines: readonly string[]` = the template's
  `innateTraitIds` in order, each through `traitDescription(id)`. `soulRows` gets an optional 4th
  parameter `ctx: Pick<HubContext,'templates'> = HUB_CONTEXT`, so existing 3-arg calls are
  unchanged.
- `src/ui/SoulsSection.tsx`: per row, one line per `traitLines` entry, between the name/% and the
  **Summon** button.
- `src/app/perkRows.ts`: `PerkRow` gains `description: string` via `perkDescription(perk.id)`
  (the store's `Specialization` has none), for every row, inactive included.
- `src/ui/PerksSection.tsx`: the description renders on each row, after the inactive label.

### Data (additive)

- `src/data/traits/described.ts` (new): `export interface DescribedTrait extends Trait { readonly
  description: string }`. Data-owned; `Trait` is untouched.
- Every trait const in `starters.ts`, `overgrowth.ts`, `glimmerdark.ts`, `rotcap-hollow.ts`
  (4 + 19×3 = 61) is re-annotated `: DescribedTrait` and gains `description`. `STARTER_TRAITS`
  becomes `readonly DescribedTrait[]`; `STOCK_TRAITS` becomes `readonly DescribedTrait[]`.
  `TRAIT_REGISTRY` stays `ReadonlyMap<string, Trait>`; `validateTrait` loop unchanged. No cast, no
  `satisfies`, no optional field.
- `src/data/traits/index.ts`: `traitDescription(id): string` over a map built from `STOCK_TRAITS`;
  throws `no stock trait <id>` on an unknown id (fixture ids included).
- `src/data/specializations.ts`: `DescribedPerkDef extends PerkDef { readonly description: string }`
  and `DescribedSpecialization` (`Omit<Specialization,'perks'>` + `perks: readonly
  DescribedPerkDef[]`). `SORCERER`/`BRUTE`/`SHIELDBARER` and `SPECIALIZATIONS` use it (32 perks gain
  `description`); `SPECIALIZATIONS_BY_ID` stays `ReadonlyMap<string, Specialization>`.
  `perkDescription(perkId)` over a map of every perk, throwing on an unknown id. Keyed by perk id
  alone; a data test pins uniqueness across specs (ASSUMPTION A5).
- Nothing in `src/engine`/`src/state` reads a description. Strings carry no phase id, no Markdown.

### Transcription

Each of the 93 entries is transcribed by hand from its content-doc entry per the kickoff's keep/
drop rules, then every number is checked against the carrier's effects in `src/data`. Doc/code
mismatches use the code's number and go in the table and the report's **Content changes**. An
entry that is missing or describes a different effect stops the build and goes under **Spec
questions** (no text from the code). The table (`evidence/transcription.md`, 93 rows: id, source
anchor, description as shipped, sentences dropped, doc number vs code number) is written as the
descriptions are, not by a script that rewrites `src/`.

## Mechanism → the test that fails without it, at every site

| Mechanism | Test (file) | Fails with |
| --- | --- | --- |
| Playback starts at once | `playback.test.ts`: `initialPlayback()` is `playing(0,0)`; `pendingDelayMs` is 500 at 1× (and 167/100 at 3×/5×); jump from the start | waiting branch restored |
| Speed change before the first beat reschedules it | `playback.test.ts`: `timerKey` of the initial state changes with a speed change | key without speed on the initial state |
| Following: follows at the bottom, holds scrolled up | `followLog.test.ts` | always-follow; never-follow |
| Tolerance edge on both sides | `followLog.test.ts`: gap = tolerance → at bottom; gap = tolerance + 1 → not; zero tolerance fails a fractional gap | no tolerance |
| Reset on fight change / jump to same fight / shrink | `followLog.test.ts` `shouldResetFollow` cases (fight change, same fight smaller `revealed`, advance → no reset) | no reset |
| Follow read before render, no timer, no dispatch from scroll | browser click-through (held while ≥3 beats arrive; counter moves, scrollTop unchanged); the reducer/`timerKey` signatures take no scroll input (checked by the unchanged `playback.test.ts` key cases) | measured-after-render reading |
| Soul rows: trait lines are the template's descriptions, in order | `soulRows.test.ts`: `sorcerer-starter` / `brute-starter` rows' `traitLines` equal `traitDescription` of the template's `innateTraitIds` in order and differ from the names; a creature with 2+ traits for order | names instead; wrong order |
| Soul rows use the shared template lookup | `creatureLine.test.ts`: `templateOf` returns the template and throws `no template <id>`; `soulRows` with an empty `templates` throws | second copy / silent fallback |
| Perk rows carry a description, inactive included | `perkRows.test.ts`: every row of all three specs equals `perkDescription(id)`; an inactive perk (`wit-mastery`) has a non-blank one | description dropped for inactive |
| Trait lookup | `traits/descriptions.test.ts` (new file): known id returns its description; unknown id and a fixture trait's id throw | lookup returning `undefined`/fallback |
| Perk lookup | `descriptions.test.ts` (new, `src/data`): known perk id; unknown id throws | same |
| Data: non-blank, no Markdown, 61 + 32 | `descriptions.test.ts`: every `STOCK_TRAITS` and perk description non-blank, no `*`, backtick, `.md#`; counts 61 and 32; perk ids unique across specs | blank text, leftover Markdown |
| Data: described values equal `main` | scratch comparison (not committed): each trait/perk minus `description` equals `main`'s; output in `evidence/` | any edit to id/name/effects/cost |
| The compiler refuses | `descriptions.types.test.ts` (new, `src/data`): `@ts-expect-error` on (a) a `DescribedTrait` without `description`, (b) a plain `Trait` pushed into the stock list type, (c) a plain `PerkDef` in a `DescribedSpecialization`; report shows `npx tsc -b` failing with each directive's error removed (each removed in turn, restored) | `description?:` or plain types accepted |

## Verification the report carries

- Gates: `npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
  `docs:check -- comments`, `npm run e2e`; test count reconciled file by file against `main`.
- `git diff --stat origin/main -- src/engine src/state e2e` empty; filtered data diff (the
  `description:` lines removed) in `evidence/`; the 93-row transcription table.
- Browser click-through (Playwright/Chromium, scripted): fight 1 line-up at once and the first beat
  ~500 ms later with timestamps; results below the log throughout, Jump and Copy working;
  screenshots at 1920×1080 (6v6 mid-playback from the first-clear replay, Souls, Perks with an
  inactive perk) and 1280×720; the box's rendered height in lines at both; hold/follow/jump/skip
  checks; no stacked timers (~2 beats/s at 1×). Screenshots and logs go in `evidence/`.

## Spec conflicts / notes

- None found with the docs. One instruction conflict, resolved by Duncan: `coding-rules.md` says
  never commit, but Duncan asked in this session for the plan to be committed and pushed to
  `4.5-g3`. Only `plan.md` is committed; build steps follow the rule again.

## Assumptions checklist

- [ ] **A1 (the kickoff's):** "1920×1080" is the browser viewport at 100% zoom, not the monitor;
      the box fills whatever viewport there is, so a maximized window on such a monitor fits.
      Confirmed as the plan.
- [ ] **A2:** type and lookup names: `DescribedTrait`, `DescribedPerkDef`, `DescribedSpecialization`,
      `traitDescription(id)`, `perkDescription(perkId)`; `templateOf` for the shared template
      lookup.
- [ ] **A3:** follow tolerance is 4 px (covers fractional scroll at 125% / zoom); the helper takes
      it as an input.
- [ ] **A4:** the box height is set from its measured top with `max(10lh, 100dvh - top - margin)`,
      via a ref (no React state), recomputed on a resize observation; `lh` and `dvh` units are
      available in the project's target browser (current Chromium/Firefox/Safari).
- [ ] **A5:** the perk lookup is keyed by perk id alone; uniqueness across the three specs is
      pinned by a data test (not keyed by spec and perk).
- [ ] **A6:** order below the box: "After the fight" line, per-fight Debug: Copy button, copy
      status line, then the descent result (floor line, boss line, fight list).
- [ ] **A7:** "Party going in" stays one `;`-joined paragraph above the line-ups (a 6v6 fight
      still leaves ≥ 10 lines of box at 1920×1080; the click-through measures it; if not, the plan
      is revised before building).
- [ ] **A8:** `soulRows` gains an optional 4th `ctx` parameter defaulting to `HUB_CONTEXT`, and
      `PerkRow`/`SoulRow` gain fields, so no existing test call changes.
- [ ] **A9:** new data tests go in new files (`descriptions.test.ts`,
      `descriptions.types.test.ts`), so no existing data test file changes.
