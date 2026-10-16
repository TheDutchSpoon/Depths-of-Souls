# Report r1 — 4.5-G3: The demo, adjustments, trait and perk text

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed, nothing deleted.
Evidence is in `evidence/` (named below). One deviation from the plan's text, in the Gates section:
the box's ten-line minimum is not written with the `lh` unit.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 257 files, 2235 passed, 1 skipped (2236) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 699 citations in 526 files |
| `npm run docs:check -- comments` | PASS, 7633 comments and 1996 titles in 492 files |
| `npm run e2e` | 1 passed. This container's Playwright wants a Chromium build it doesn't have, so it ran with a scratch config (outside the repo) that points `executablePath` at `/opt/pw-browsers/chromium-1194`; `playwright.config.ts` and `e2e/` are untouched |

**Test count, reconciled file by file against `origin/main`** (a clean `git archive` of it, same
runner, JSON reporter): 2210 → 2236, +26 = −3 + 2 + 2 + 4 + 9 + 9 + 3.

| File | main | here | Change |
| --- | --- | --- | --- |
| `src/app/playback.test.ts` | 23 | 20 | −3 (the only existing test file whose cases change; listed below) |
| `src/app/creatureLine.test.ts` | 7 | 9 | +2 (`templateOf`) |
| `src/app/perkRows.test.ts` | 11 | 13 | +2 |
| `src/app/soulRows.test.ts` | 6 | 10 | +4 |
| `src/app/followLog.test.ts` | — | 9 | new |
| `src/data/descriptions.test.ts` | — | 9 | new |
| `src/data/descriptions.types.test.ts` | — | 3 | new |

No other file's count differs. No existing data test file changed (A9).

**`playback.test.ts`, case by case** (the kickoff's list):

1. "the wait and the first beat" pair → "the first beat": `initialPlayback()` equals `playing(0, 0)` and
   `pendingDelayMs` of it is `SPEEDS[1]`; a jump from the start to fight 3 gives `playing(2, 0)`.
   (Count unchanged, 2 → 2.)
2. The delays test loses its `3000` and `START_WAIT_MS` lines; its title drops "3 seconds waiting".
   (Count unchanged.)
3. Removed: "the current speed again while waiting" and "skip-fight while waiting". (−2)
4. Removed: "a speed change during the wait leaves the key alone". (−1)
5. "every move of the position changes the key" drops its `initialPlayback()` entry.
6. The `skip-floor` line that uses `initialPlayback()` is unchanged.

## Golden policy

- No golden, fixture, corpus entry or `corpus:update` is touched: `git diff --stat origin/main -- src/engine src/state e2e`
  is empty (0 lines), and `src/engine/__golden__` and the corpus digest test pass unchanged in the full run
  (the three `balance-ci-*` tests included).
- Data is additive. `evidence/data-diff-filtered.diff` is `git diff -U0 origin/main -- src/data` with every
  `description:` line and its string removed: the described types, the annotations that use them, the
  two lookups, and nothing else. (The new files, `src/data/traits/described.ts`, `descriptions.test.ts`
  and `descriptions.types.test.ts`, are untracked, so the diff doesn't list them.)
- **Every stock trait and perk, with `description` stripped, equals `main`'s** (`evidence/strip-compare.md`):
  a scratch test dumped all 61 traits and all 32 perks (leveled perks' effects resolved at every level) from
  `origin/main` and from this branch; `cmp` says identical, 64892 bytes each.
- Expected values are compared by importing the data (`traitDescription`, `perkDescription`,
  `STOCK_TRAITS`, `SPECIALIZATIONS`), not by reading diffs.
- Corpus digest: unchanged; not regenerated.

## Mechanisms, and the test that fails without each

Each removal ran in a scratch copy of the tree, never in the repo (`evidence/mutation-checks.md` has every run).

| Mechanism | Test that fails without it | Removal |
| --- | --- | --- |
| Playback starts at once | `playback.test.ts`: "starts playing at fight 1, beat 0, one beat interval from its first beat"; the delays test | first beat's delay set back to 3000 ms: 2 fail |
| A speed change before the first beat reschedules it | the first case (`initialPlayback()` is `playing(0, 0)`, so its key carries the speed) with "a speed change while playing changes the key" (no new case, per the hand-out) | `timerKey` without speed: 1 fails |
| Follows at the bottom | `followLog.test.ts` | `isAtBottom` always false: 5 fail |
| Holds when scrolled up | `followLog.test.ts` | always true: 4 fail |
| Tolerance edge, both sides | `followLog.test.ts`: gap = tolerance is at the bottom, tolerance + 1 is not; 799.5 of 800 is at the bottom only with a tolerance; the tolerance is an input | tolerance ignored: 3 fail |
| Reset on a fight change, a jump to the same fight | `followLog.test.ts` `shouldResetFollow` | always false: 2 fail |
| Soul rows read descriptions, not names | `soulRows.test.ts`: `sorcerer-starter` and `brute-starter` rows equal `traitDescription` of the template's trait ids and differ from every trait name | ids instead of descriptions: 2 fail |
| Soul rows keep the template's trait order | `soulRows.test.ts`: a test template with two stock trait ids through `ctx` (A8) | reversed: 1 fails |
| Soul rows use the shared template lookup | `templateOf` tests and "`soulRows` with an empty `templates` throws" stay; `soulRows.ts` imports `templateOf` from `creatureLine.ts` and has no lookup of its own (checked in the diff, per the hand-out) | `templateOf` made a silent fallback: 3 fail |
| Perk rows carry a description, inactive included | `perkRows.test.ts`: every row of all three specs; `wit-mastery` reads its sentence | blank for inactive perks: 2 fail |
| Trait and perk lookups | `descriptions.test.ts`: known ids return their text; an unknown id and a fixture trait's id throw | fallback `''` instead of a throw: 1 fails each |
| Non-blank, no Markdown, 61 + 32, unique perk ids | `descriptions.test.ts` | a blank trait text: 1 fails; `**` in a perk: 2 fail; a duplicate perk id: 2 fail |
| The compiler refuses | `descriptions.types.test.ts`, three `@ts-expect-error` lines (a) a `DescribedTrait` literal with no `description`, (b) a plain `Trait` in an array typed `(typeof STOCK_TRAITS)[number][]`, (c) a spec literal typed `(typeof SPECIALIZATIONS)[number]` whose `perks` holds a plain `PerkDef`; each is inside a `test` and the value is used in an `expect` | `evidence/compiler-checks.md`: each line made valid in turn, `npx tsc -b` fails with "Unused '@ts-expect-error' directive" (lines 13, 20, 35) |

Not unit-testable, so shown in the browser (below): the follow reading is taken from the last scroll event
(`LogBox.tsx`), the box's scroll never dispatches into the reducer and adds no timer.

## The transcription

`evidence/transcription.md`: 93 rows (61 traits, 32 perks) with id, source anchor, the description as
shipped, what was dropped, and doc number vs code number. Every number was checked against the carrier
(and, for Spore, Burn and Poison, `src/data/statuses.ts`). **No doc number disagrees with the code.**
No stock trait or perk lacks an entry or describes another effect. Judgement calls are the `dropped`
column; the ones worth a look in review:

- Kept as effect text, though long: the Overtone's echo rules, the Wick's burn/kill rule, the Unicorn's
  once-per-hit sentence, and the Thorns and Snapjaw/Bulwark/Wretch "doesn't answer a tick…" sentences.
- Dropped as design remarks: the Gloomjaw Executioner/Ravager and Shellback Brawler flavour clauses, the Leech
  Sovereign's strategy sentence, the Rot Sovereign's "don't feed it" sentence, the Blindclaws Striker's
  restating sentence, the Flickerling Flare's ordering sentence, the Aggressive Caster's "as thin as casting is
  for everyone" sentence.
- The Resonants' shared "themselves included" lives in the section intro in the doc, not in the entries, so it
  isn't in the three descriptions.
- Proficient Warrior keeps "and Proficient (+30% benefit from equipment Stat Slots)" and drops only the inert
  note, since the doc's effect sentence names both.

## Browser click-through (Chromium via Playwright, scratch build with the store exposed on `window`)

The scratch build is a copy of the tree plus two lines in `main.tsx`; nothing of it is in the repo. A sorcerer
run with a six-creature party (two starters, four summons) and `deepestFloor` set to 9, so floor 10's boss
fight is a 6v6 (Broodmother's side against the party). Output: `evidence/click-through-log.txt`; screenshots
`viewer-1920x1080-6v6-midplayback.png`, `viewer-1920x1080-refusal-line.png`, `souls-1920x1080.png`,
`perks-1920x1080.png`, `viewer-1280x720.png`, `viewer-1280x720-scrolled.png`.

- **Starts at once:** after Descend the line-up showed 66 ms later and the first beat 504 ms after the line-up
  (timestamps from a MutationObserver); "starts shortly" never appeared.
- **Results below the log:** the floor line sits at 1162 px, the box ends at 1072 px, the whole time. Copy fight
  1 from the list: status "Copied fight 1 as JSON", box top and height unchanged. Jump from the list restarts
  the fight (21 lines → 0).
- **1920×1080, scroll top, 6v6:** speed buttons at 242 px, box 545 → 1072 px in a 1080 px viewport, box height
  527 px = 23.5 lines. A7 holds: the one-paragraph "Party going in" costs nothing near the 10-line floor.
- **Refusal line** (handout item 1): typing `abc` mid-playback shows the refusal line and drops the preview;
  box top, height and bottom unchanged (545 / 527 / 1072); restoring the floor changes nothing either.
- **1280×720:** box 224 px = exactly 10 lines; the document is 4025 px, so the page scrolls.
- **Hold and follow** (1280×720): following, the box sits at the bottom; scrolled up it held (scrollTop 265 →
  265) while 5 beat renders arrived in 2.4 s; scrolled back to the bottom it followed again, a beat and two beats
  later. **Skip to end of fight** held: scrollTop 69 → 69 (log 15 → 69 lines); following: lands at the bottom.
  **Jump while held**: the new fight starts at 0 lines and follows again (at the bottom with the box overflowing).
- **No stacked timers:** after switching speeds, jumping, scrolling and copying, 1× for 5 s gave 9 beat renders
  (about 2 a second).
- No page errors or console errors in either session.

## Deviation from the plan

**The ten-line minimum is `10 × var(--log-line-height) × 1em`, not `10lh`.** The plan and hand-out wrote
`max(10lh, …)`. Chrome 141 resolved `10lh` on the box to 200 px (20 px a line) the moment it held text, while
its lines render 22.4 px apart, so at 1280×720 the box was 8.9 lines. The box now sets `--log-line-height: 1.4`
in CSS (`.log-box`) and the hook reads the same variable, so the line height has one source. The kickoff allows
"the line height times 10"; A4's `lh` clause is the part that changes. The click-through above was rerun after
the fix.

Smaller notes, no decision needed: the height is re-measured by a layout effect with no dependency list
(the hand-out's second option) plus the `resize` listener, not a `ResizeObserver`, which avoids observing a
section whose own size the hook changes. The gap under the box is 8 px (`FILL_MARGIN_PX`).

## Spec questions

- `phases/4.5/brief.md` line 426 (the G1 section: results "show for 3 seconds, then paced playback starts") and the
  line 563 assumption ("a few seconds … is 3 seconds") are what G1 built, and G3 removes. The G3 section
  overrides them; they read as live rules. Also `phases/4.5/G1/record.md` if it states the wait (immutable).
- No spec file states a wait, a log box or the souls/perks row text, so nothing else is stale.
- The perk lookup is keyed by perk id alone (A5), pinned by a data test. If a later spec reuses an id the
  lookup map would shadow, and that test is the guard.

## Content changes

No content behaviour changes: no id, name, effect, cost or level moved (the strip comparison shows it). The
content docs need no number fixes: the descriptions match the docs' numbers, which match the code.
What changes is player-facing text: 61 trait descriptions and 32 perk descriptions now ship in `src/data`, shown
on the Souls and Perks rows (`evidence/transcription.md` has each).

## To delete

Nothing.
