# PR review, round 1 — 4.5-G3: The demo, adjustments, trait and perk text

Reviewed: branch `4.5-g3` at `ea42fa1`, against `origin/main` at `0f2f2fe`. Inputs:
`kickoff.md`, `plan.md`, `plan-review.md`, `plan-handout-r1.md` and `report-r1.md`. The build
answers to the plan as `plan-handout-r1.md` corrects it.

## Verdict

**Fixes**: two small items in `handout-r1.md`, one test and one text fix. The build itself is
right:

- The waiting phase is gone without a stand-in.
- The single-timer structure is untouched.
- Follow and hold work as specified, at fractional display scaling too.
- The box fills the viewport and re-fits when the content above it changes.
- The described types make the compiler refuse a stock carrier without text.
- All 93 descriptions are the docs' own words, with the code's numbers.

Every claim in the report that I could check reproduced: counts, the strip comparison down to the
byte, the `lh` deviation.

## Real fixes (in `handout-r1.md`)

1. **The trait lookup's "fixture trait" case tests nothing new** (`src/data/descriptions.test.ts`).
   - It uses `'fixture-trait'`, which is no trait's id: it is only a dangling entry in a fixture
     biome's `innateTraitIds`. So the assertion is a second unknown id.
   - The kickoff asked that a fixture trait's id throw, so that a lookup built over a wider
     registry fails. Fix: assert on `BRUTISH.id` from `src/engine/__fixtures__/traits.ts`.

## Scope and labeling (in `handout-r1.md`)

2. **The Resonants' descriptions lose "itself included."**
   - The three descriptions say "Whenever an ally casts a spell". The code's `relationship: 'ally'`
     includes the creature itself.
   - The doc states this once, in the section sentence (`content/glimmerdark.md#resonants-wit-caster-synergy`),
     which the transcription dropped as "not in the entry".
   - Every other trait that includes itself keeps that in its shipped text (the Flare, the Swarmhive
     Striker and Queen, the Blindclaws Setter), so these three read as the odd ones out.
   - The fix folds the doc's own words in: "Whenever an ally, itself included, casts a spell". This
     is text from the doc, not from the code.

Judgment calls I checked and leave as shipped. Each is the doc's verbatim effect text, and the
Phase 7 wording pass (its "Trait and perk text" item, `ROADMAP.md#phase-7--combat-ui--feedback`) owns the polish:

- the Arcane Surge parenthetical, "(not a gem: un-upgradeable, … kept through fusion)";
- the Double Strike's "firing on-attack" and "resolves one additional instance";
- the length of the Overtone's and the Wick's text.

## Decide-points

- **D1. Proficient Warrior's description promises an inert half.**
  - The perk shows as active, because its Splashing half works.
  - Its description also says "Proficient (+30% benefit from equipment Stat Slots)", which does
    nothing until equipment is built.
  - The doc's caveat ("Proficient is inert …; Splashing works now") went out with the phase id.
  - I recommended keeping the caveat without the phase id.
  - **Duncan's decision: leave as shipped.** The description stays the doc's effect sentence.
- **D2. Screenshots in `evidence/`.**
  - The folder holds six PNGs. `WORKFLOWS.md#what-a-mailbox-keeps` said evidence is plain text or
    Markdown, while the brief and the kickoff both ask for screenshots.
  - I recommended keeping them and amending the rule.
  - **Duncan's decision: keep them; the rule now allows a screenshot the kickoff asks for, as PNG.**

## Spec questions from the report

- **The G1 section's "show for 3 seconds" and the G1 assumption (`phases/4.5/brief.md`): no edit.**
  - The brief's G3 section opens by saying it overrides the sections above for what the demo does.
  - A phase brief keeps its built entries, because it is the phase's plan and later slices cite it.
  - `phases/4.5/G1/record.md` is immutable.
  - No living doc states the wait: the leftover sweep found nothing.
- **Perk lookup by id alone:** a data test pins perk id uniqueness, as A5 planned. Now stated in
  `spec/progression.md#specializations-are-data`.

## Outside this slice (noted, not handed out)

- The fight log prints raw floats for stat changes, for example "Swarmhive Striker attack: 88 ->
  140.79999999999998" (the report's 6v6 screenshot).
- This is the log text G1 moved from 3.5. G3 doesn't touch it.
- It belongs with Phase 7's combat-UI work whenever you want it listed. I made no edit.

## What was verified, and how

**Gates**, run in a fresh clone (`npm ci`, Node 22.22.0; jsdom's engine warning is cosmetic):

| Gate | Result |
| --- | --- |
| `npm run test` | 257 files, 2235 passed, 1 skipped (2236) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | pass |
| `npm run docs:check -- comments` | pass |
| `npm run docs:check -- budgets` | 0 over |

`e2e` wasn't run separately: `e2e/` and the app's start flow are unchanged. My own Playwright
session drove the same Brute, seed 10, floor 1 path with no page errors.

**Test count**, file by file against `main` with the JSON reporter: 2210 → 2236. Every changed
file:

| File | main | branch | Change |
| --- | --- | --- | --- |
| `playback.test.ts` | 23 | 20 | −3 |
| `creatureLine.test.ts` | 7 | 9 | +2 |
| `perkRows.test.ts` | 11 | 13 | +2 |
| `soulRows.test.ts` | 6 | 10 | +4 |
| `followLog.test.ts` | — | 9 | new |
| `descriptions.test.ts` | — | 9 | new |
| `descriptions.types.test.ts` | — | 3 | new |

No other file differs. The `playback.test.ts` diff matches the kickoff's list case by case.

**Golden policy:**

- `git diff --stat origin/main -- src/engine src/state e2e` is empty.
- I imported all 145 `__golden__/*.fixture.ts` on both trees and deep-compared every export:
  - 44 exports differ, the `traits` registries and the Wick and Last Gleam sub-fixtures
    (`allyDies`, `aloneAndHurt`, `gleamDies`, `hurtOthersFull`);
  - every difference is a `description` added to an embedded stock trait;
  - no expected value moved.
- The three biome trait files' diff, with `description` lines removed, is only the annotation
  (`Trait` → `DescribedTrait`, 57 consts) and the import (3).
- The strip comparison, rerun on my own: all 61 traits and 32 perks, `description` removed and
  leveled perks resolved at every level, are identical to `main`'s (64,892 bytes each).

**The code against the spec:**

- `playback.ts`: `PlaybackPhase` is `'playing' | 'done'` and `initialPlayback()` is playing at
  0/0. `timerKey` always carries the speed, and there is no zero-length wait or mounted flag.
- `DescentViewer`'s order matches A6. `App.tsx` is untouched, and nothing re-keys the viewer.
- `LogBox` reads the follow state only in `onScroll`, keeps it in a ref, never dispatches and adds
  no timer.
- `useFillViewport` measures the top from the document, on every render and on resize.
- `soulRows` uses `templateOf` and has no lookup of its own. `perkRows` reads `perkDescription` for
  every row.
- No `src/engine` or `src/state` file reads a description.
- The engine stays pure.

**The transcription**, checked independently for all 93 entries by a second agent that hadn't seen
the review:

- Every description is a word-for-word piece of its doc entry. The only other edit is `−` to `-`.
- Every number matches the code, and so does every doc number, including the dropped cost lines.
  That covers Arcane Bolt's `spellPower: 1.0`, Burn's 35% of Intelligence, Poison's 40% of Attack
  and Thorns' fifth (`INDIRECT_DEFENCE_RATE = 0.2`).
- `evidence/transcription.md`'s description column is byte-identical to the shipped strings.
- `inactive` is set on exactly the nine inert perks.

**Mutation checks:**

- The report's 15 removals each fail their named test (`evidence/mutation-checks.md`). I read each
  named test against its mechanism and reran four in my clone, with the same failure counts as the
  report: the 3-second first beat (2 of 20 fail), the tolerance ignored (3 of 9), an inactive
  perk's text blanked (2 of 13), trait ids instead of text (2 of 10).
- Fix 1 shown the same way: a `traitDescription` that also resolves the fixture trait `brutish`
  passes all 9 cases of `descriptions.test.ts`.
- The compiler test holds the real collections, as the plan hand-out asked: `(typeof
  STOCK_TRAITS)[number]` and `(typeof SPECIALIZATIONS)[number]`.
- Two browser-only mechanisms, removed in my clone, are both caught by my browser check:
  - with the per-render re-fit removed (resize only), a line added above the viewer pushes the box
    bottom to 1108 in a 1080 viewport;
  - with the follow reset on a fight change removed, a jump while held stays held: 157 px from the
    bottom once the new fight overflows.

**Browser check** (Chromium 141, scratch build, my own script):

- **Start:** the box appears and the first beat follows 507 ms later. "starts shortly" never
  shows. The floor line sits below the box.
- **A line added above the box:** the plan hand-out's refusal-line check in the report typed `abc`.
  That swaps the preview line for the refusal line, so the box's top never moved and the check
  couldn't fail. I typed floors `5` and `31` instead, where the refusal shows and the preview
  stays. The top moved 36 px, the height shrank by 36 px, and the bottom stayed at 1072 in a
  1080 px viewport.
- **1280×720:** the box is 224 px, exactly 10 lines, at device scale factors 1, 1.25 and 1.5.
- **Follow and hold:** following stays at the bottom over 6 samples at 5×. Held, the scroll
  position stays unchanged while the log grows from 493 to 1276 px. Both hold at every scale
  factor.
- **The `lh` deviation:** on the box itself `10lh` resolves to 200 px against a computed line
  height of 22.4 px, while in a child it resolves to 224 px. The report's reason holds, and
  `10 × var(--log-line-height) × 1em` is exact for a unitless line height.

**Leftover sweep** over `src/` and the living docs, for `START_WAIT_MS`, "starts shortly", the
waiting phase, "3 seconds" and "a few seconds", and the corrected `timerKey` claim: no hits outside
`phases/` and `archive/`.

**Mailbox:** the step files and `evidence/` only. The PNGs are kept under D2. Nothing to delete.

## Docs edited

- `.claude/spec/effects.md` (`#carriers-and-effects`): a stock trait is a `DescribedTrait`; the
  compiler refuses one without text; only the UI reads it, through `traitDescription`.
- `.claude/spec/progression.md` (`#specializations-are-data`): a stock perk is a
  `DescribedPerkDef` in a `DescribedSpecialization`, read by perk id, whose uniqueness a data test
  holds.
- `.claude/ROADMAP.md` (Phase 7, "Trait and perk text"): the stale half ("`PerkDef` carries only a
  name") is replaced by the first-draft descriptions, as the brief's G3 section asks.
- `.claude/content/overgrowth.md`, `content/glimmerdark.md`, `content/rotcap-hollow.md` (Source
  paragraphs): a number change updates the trait's `description` in the same change, as the brief
  asks.
- `.claude/specializations/sorcerer.md`, `brute.md`, `shieldbarer.md` (Source paragraphs): the same
  rule for each perk's and the starter trait's `description`.
- `.claude/WORKFLOWS.md` (`#what-a-mailbox-keeps`): a screenshot the kickoff asks for is kept in
  `evidence/` as PNG (D2).

Budgets after these edits: 0 over; `spec/effects.md` is at 97% of its budget (37.7 of 39 KB),
`spec/progression.md` at 91%. Citations, comments and Prettier pass with the edits applied.
