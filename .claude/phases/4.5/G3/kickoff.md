# Kickoff — Phase 4.5 — Slice G3: The demo, adjustments, trait and perk text

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: `spec/effects.md#carriers-and-effects` (the `Trait` carrier shape, which stays
  `{ id, name, effects }`); in `spec/progression.md`: `spec/progression.md#perks`,
  `spec/progression.md#specializations-are-data`, `spec/progression.md#inert-perks`; in
  `spec/creatures.md`: `spec/creatures.md#trait-and-gem-slots`, `spec/creatures.md#souls`.
- `CONVENTIONS.md#every-feature-phase-ships-a-demo`, `CONVENTIONS.md#effect-carriers-live-in-libraries`,
  `CONVENTIONS.md#composition-files-only-reference-carriers`, `CONVENTIONS.md#comment-why-not-what`
  (string literals included), `CONVENTIONS.md#three-test-tiers`.
- The brief: `phases/4.5/brief.md#demo-adjustments-g3` and `phases/4.5/brief.md#trait-and-perk-text`
  (where they differ from `phases/4.5/brief.md#descent-result-and-viewer-g1` and
  `phases/4.5/brief.md#hub-g2`, the G3 sections are what the demo does), the two (G3) lines of
  `phases/4.5/brief.md#assumptions`, `phases/4.5/brief.md#demo-golden-rule`;
  `phases/4.5/G3/brief.md`. G1's and G2's records (`phases/4.5/G1/record.md`,
  `phases/4.5/G2/record.md`) say what the demo is and where.
- Content docs, the source of every description: `content/overgrowth.md`, `content/glimmerdark.md`,
  `content/rotcap-hollow.md` (creature and boss traits, the Unicorn under
  `content/overgrowth.md#unicorn-lightbearer`); `specializations/sorcerer.md`,
  `specializations/brute.md`, `specializations/shieldbarer.md` (each starter's `## Starter:`
  section and every perk's `###` entry).
- Code, before planning:
  - The viewer: `src/app/playback.ts` and `src/app/playback.test.ts`, `src/ui/DescentViewer.tsx`
    (the one timeout effect on `[key, delay]`), `src/ui/DescentResult.tsx`, `src/ui/RunScreen.tsx`
    (the viewer is keyed by descent id), `src/app/fightList.ts` (`fightHeader`),
    `src/app/fightView.ts` (`splitLineUp`, `lineUpText`), `src/app/App.tsx` and `src/index.css`
    (the three columns), `e2e/smoke.spec.ts`.
  - The hub rows: `src/app/soulRows.ts`, `src/ui/SoulsSection.tsx`, `src/app/perkRows.ts`,
    `src/ui/PerksSection.tsx`, `src/app/creatureLine.ts` (its template lookup and `HUB_CONTEXT`).
  - The carriers: `Trait` and `validateTrait` in `src/engine/effect-types.ts`;
    `src/data/traits/index.ts` (`STOCK_TRAITS`, `TRAIT_REGISTRY`), `src/data/traits/starters.ts`
    (`STARTER_TRAITS`) and the three biome trait files; `src/data/specializations.ts` (`PerkDef`,
    `Specialization`, `SPECIALIZATIONS`, `SPECIALIZATIONS_BY_ID`, the inert-perk comments);
    `src/data/creatures.ts` (`ALL_CREATURE_TEMPLATES`); `src/engine/injured-allies.test.ts` (an
    existing `@ts-expect-error` test that `npx tsc -b` checks).

## Scope

Two parts on G1's viewer and G2's hub, plus additive data:

- **The viewer** (`phases/4.5/brief.md#demo-adjustments-g3`): the descent result (floor line,
  boss line, the fight list with its Jump and Copy buttons) and the header's "After the fight"
  line move below the log box; playback starts at once (the reducer loses its `waiting` phase,
  `START_WAIT_MS` and the "Playback starts shortly" line); the log scrolls in its own box that
  follows new beats at the bottom and holds when scrolled up; the allies' and foes' line-ups sit
  side by side; at a 1920×1080 viewport everything from the speed buttons to the bottom of the log
  box is in view, and on smaller screens the box shrinks to a minimum of 10 lines and the page
  scrolls.
- **The hub:** each **Souls** row shows, before **Summon**, one line per trait of its creature, the
  trait's description; each **Perks** row shows the perk's description, inactive perks included.
- **The data** (`phases/4.5/brief.md#trait-and-perk-text`): a `description` on every stock trait
  (`STOCK_TRAITS`, 61) and every perk of `SPECIALIZATIONS` (32), transcribed from its content-doc
  entry with the code's numbers; a data-owned type that makes the compiler refuse a stock carrier
  without one; a data export that returns a description by id and throws on an unknown id.
- The pure helpers and data tests that go with them, and the click-through.

**Not in this slice:** any change to `Trait` or `PerkDef`, to `src/engine`, `src/state` or `e2e`;
any change to a trait's or perk's id, name, effects, cost or levels; the Collection and party
creature lines (they keep trait **names**); the spell, status or creature text (no descriptions
there); any edit to a content doc (number mismatches go in the report); the Phase 7 wording pass;
any new dependency.

## Golden policy

Goldens, the corpus digest, every existing engine and store test and the end-to-end smoke test
**byte-identical** (`phases/4.5/brief.md#demo-golden-rule`). `src/data` changes **additively
only**: the descriptions, the described types and the annotations that use them, the lookup
export, and new data tests. No existing data test changes.

Existing `src/app` tests change only in `src/app/playback.test.ts`, where the `waiting` phase goes:

- the "wait and the first beat" pair becomes playback starting at fight 1, beat 0, with a jump from
  the start;
- the delays test loses its 3-second lines (`START_WAIT_MS` is gone);
- the two "while waiting" no-op cases go (skip-fight at the start is now a real move, and the
  speed case duplicates "the current speed again");
- "a speed change during the wait leaves the key alone" goes;
- "every move of the position changes the key" drops its `initialPlayback()` entry, which is now
  the same position as `playing(0, 0)`.

Each change is listed in the report, case by case. `soulRows.test.ts` and `perkRows.test.ts` read
row fields one at a time, so a new row field changes none of their cases; they only gain cases.

If any golden, the corpus digest or the copied-fight JSON changes, stop: no event and no fight
input carries a `Trait` or `PerkDef` object (the digest hashes events; a party carries
`innateTraitIds`; the record's perk effects are resolved `EffectDef`s), so a change means one is
serialized somewhere.

## Traps

**Playback**

- **The wait goes, not shrinks.** `PlaybackPhase` becomes `'playing' | 'done'`; `initialPlayback()`
  is playing at fight 0, beat 0, speed 1; `pendingDelayMs` and `timerKey` lose their `waiting`
  branches. No zero-length wait, no `setTimeout(…, 0)`, no "mounted" flag that stands in for the
  old phase. The first beat comes one beat interval (500 ms at 1×) after the line-up shows; a speed
  change before it reschedules it, since the key now always carries the speed.
- **The single-timer structure stays as G1 built it**: one reducer, one timeout effect on
  `[key, delay]`. The log box's scroll behaviour adds no timer and never dispatches into the
  playback reducer; its state is the box's own (a ref), outside `PlaybackState` and `timerKey`, so
  scrolling can't restart a beat.
- **A jump to fight 1 right after a descent returns the identical state** (the reducer's no-op
  rule): correct, don't special-case it.
- `skip-fight`'s guard (`phase !== 'playing'`) now only means done.

**Layout**

- **Below the box:** the "After the fight" line, the per-fight **Debug: Copy fight as JSON**
  button, the copy status line and the descent result. The copy status line must not stay above:
  appearing mid-playback, it would push the box down a line. Above the box: the speed and skip
  buttons, the fight title, "Party going in" and the line-ups. The plan picks the order below.
- **The box's height is viewport-relative**: it takes the space from its top to the bottom of the
  viewport, never less than 10 lines of log (in line units: `lh`, or the line height times 10,
  never a pixel count guessed from a font). A fixed pixel height tuned at 1080 misses "the box
  shrinks", and the space above it varies: a line-up runs 1 to 6 per side, and the picker's
  refusal or preview line may or may not show. Size it for the worst case, a 6v6 line-up.
- The results below the box never take height from it, and the page scrolls to them.
- The hub column and the side panel stay siblings of the run column (`App.tsx`): nothing in this
  slice may re-key or unmount the viewer.

**Follow and hold**

- **Read "at the bottom" before the new beat renders**, from the last scroll position (a scroll
  handler's reading), never by measuring after the log grew: measured after, the box is never at
  the bottom and never follows.
- **Allow a tolerance.** Display scaling and zoom give fractional scroll positions (Windows at
  125% does), so "at the bottom" exact to the pixel fails on Duncan's screen. The pure helper takes
  the tolerance as an input, and its tests pin the edge on both sides.
- **A jump or the next fight empties the box, and an empty box is at its bottom**, so it follows
  again. Reset the follow state on a fight change explicitly; don't rely on a scroll event firing
  when the content shrinks.
- **Skip to end of fight** reveals the rest at once: following, it lands at the bottom; held, it
  stays where the reader is.
- The scroll that follows fires a scroll event of its own: it must read as "at the bottom", not as
  the reader scrolling up.

**Descriptions: types and lookups**

- **The described type is data-owned** (`readonly description: string` on top of `Trait`, and on
  top of `PerkDef`), and **the collections carry it**: `STARTER_TRAITS`, `STOCK_TRAITS`, and the
  three specs through a data-owned spec type whose perks are the described perk type. That is what
  makes the compiler refuse: a trait typed plain `Trait` can't go into `STOCK_TRAITS`.
  `Specialization`, `Trait`, `PerkDef` and `TRAIT_REGISTRY`'s type stay as they are; the described
  values are assignable to them, so the store and engine take them unchanged.
- **Never a cast**, `satisfies Trait`, or `description?:`. TypeScript's excess-property check
  flags `description` in a literal still annotated `: Trait` or inside `: Specialization`: the fix
  is the annotation.
- **The compiler accepts `''`.** A data test holds every description non-blank, with no Markdown
  left (no `*`, backtick or `.md#` citation).
- **The lookups** answer by id over `STOCK_TRAITS` and over every perk of `SPECIALIZATIONS`, and
  throw on an unknown id (a fixture trait's id included). A perk lookup by perk id alone needs perk
  ids unique across the specs: they are today, and a data test pins it (or the lookup is keyed by
  spec and perk; the plan picks). The perk row reads the description through the lookup, since
  `chosenSpecialization` returns the store's `Specialization`, whose perks carry no description.
- Nothing in the engine or the store reads a description.

**Descriptions: the rows**

- **Souls:** the creature's traits are its template's `innateTraitIds`, in order, found through the
  same template lookup the creature line uses (exact id in `ALL_CREATURE_TEMPLATES`, throwing on a
  miss), not a second copy of it. One line per trait id: the description, never the name.
- **Perks:** every row carries its description, inactive perks included, next to their inactive
  label.

**Descriptions: the transcription**

- **Source:** the creature's own entry (`content/<biome>.md#<creature>`), the starter's
  `## Starter:` section (`specializations/sorcerer.md#starter-glyphmoth-seer`,
  `specializations/brute.md#starter-cragfang-mauler`,
  `specializations/shieldbarer.md#starter-stonehorn-warden`), the perk's `###` entry.
- **Only the sentences describing the effect.** Dropped:
  - a creature entry's opener ("Endurance · enabler · taunter (its trait fires on Provoke)"), the
    starters' stats and "the name is a placeholder";
  - remarks about the creature rather than its trait: Stonehorn Warden's role-script sentence, the
    Broodmother's "Unique and non-collectable" and her adds paragraph;
  - a perk's cost line ("1 level × 100 points"): the row already shows level / max and cost;
  - "Inert (needs Phase 8)": the inactive label says it, and a phase id in a string literal fails
    `npm run docs:check -- comments`. The effect sentence before it stays ("Your creatures can
    equip Wit spell gems regardless of affinity.");
  - a note on how the engine models the effect rather than what it does (the Cragfang Mauler's
    "This is an instance-list effect, like Flurry, not an on-attack trigger").
  Every judgment call is in the transcription table (below), so the review can check it.
- **Strip** bold, italics, backticks and parenthesized citations
  (`content/overgrowth.md#snapjaw-jaws` ends on one).
- **Numbers are the code's.** Check every number against `src/data` (chances, factors, power
  percentages, durations, the innate spell's power); where the doc disagrees, the code's number
  goes in and the report lists the mismatch. Never edit the content doc.
- **A stock trait or perk with no entry, or whose entry describes a different effect than the code
  (not just a number), is a stop-and-ask** under Spec questions: never text written from the code.
- **Boss traits get a description too**: no screen shows them (bosses never have soul), but they
  are stock traits and the compiler requires one.

**Strings**

- No player-facing string carries a phase id (`CONVENTIONS.md#comment-why-not-what`); the
  descriptions are string literals, so the comments check covers them.

## Must stay green

All gates in `coding-rules.md`. Every golden, the corpus digest and every existing engine, store
and data test byte-identical, the three `balance-ci-*` tests included. `npm run e2e`, unchanged.
`npm run build`.

## The PR must prove

- **Byte-identical:** `git diff --stat origin/main -- src/engine src/state e2e` is empty.
- **Additive data:** `git diff origin/main -- src/data` with the `description:` lines removed
  shows only the described types, the annotations that use them, the lookups and new tests; the
  filtered diff is in `evidence/`. Every stock trait and perk, with `description` stripped, equals
  `main`'s (a scratch comparison; its output in `evidence/`).
- **Test count**, reconciled file by file against `main`: the only changed existing test file is
  `playback.test.ts`, its changes listed case by case against the Golden policy above; every other
  changed file only gains cases.
- **Each mechanism, with the test that fails without it:**
  - *playback starts at once:* `initialPlayback()` is playing at fight 0, beat 0, and its delay is
    one beat at the current speed; fails with the waiting branch restored;
  - *follow and hold:* the helper follows at the bottom, holds when scrolled up, and its tolerance
    edge on both sides; fails with always-follow, with never-follow, and with no tolerance;
  - *soul rows:* each row's trait lines are its template's trait descriptions, in order, for a
    real creature; fails with names instead;
  - *perk rows:* every row carries its description, an inactive perk included; fails with the
    description dropped for inactive perks;
  - *the lookups:* a known trait and perk id return their descriptions; an unknown id and a
    fixture trait's id throw;
  - *the data:* every stock trait and perk has a non-blank description with no Markdown left; perk
    ids are unique across the specs (or the lookup is keyed by spec);
  - *the compiler:* `@ts-expect-error` lines for a stock trait without a description, a plain
    `Trait` put into the stock trait list, and a plain `PerkDef` in a stock spec; the report shows
    `npx tsc -b` failing with each line's error removed.
- **The transcription table** in `evidence/`: one row per stock trait and perk (61 + 32 = 93):
  id, source anchor, the description as shipped, the sentences dropped, and any number where the
  doc disagrees with the code (doc number, code number). The report's **Content changes** lists
  the mismatches for the PR review to fix in the docs.
- **The browser click-through**, G3's share of `phases/4.5/brief.md#tests-and-verification`:
  - after **Descend**, fight 1's line-up shows at once and the first beat arrives about 500 ms
    later at 1× (timestamps), with no "starts shortly" line; the results sit below the log the
    whole time, and Jump and Copy still work from there;
  - screenshots at a **1920×1080 viewport at 100% zoom**, page scrolled to the top: a fight
    mid-playback with a **6v6 line-up**, everything from the speed buttons to the bottom of the
    log box in view (G2's first-clear replay, `phases/4.5/G2/evidence/first-clear-log.md`, reaches
    floor 10's boss fight with a six-creature party against six); the Souls section with trait
    lines; the Perks section with descriptions, an inactive perk included;
  - one screenshot at a smaller viewport (1280×720) showing the box at no fewer than 10 lines and
    the page scrolling; the box's rendered height in lines at both viewports;
  - scrolling the log up mid-playback holds it while at least three beats arrive (the scroll
    position unchanged, the beat counter moving); scrolling back to the bottom follows again; a
    jump while held starts the new fight empty and following; skip to end of fight lands at the
    bottom when following and stays put when held;
  - no stacked timers after clicking around mid-playback (about two beats a second at 1×);
  - `npm run e2e` passes unchanged.
- **ASSUMPTION** (G3, the kickoff's): "1920×1080" is the browser viewport at 100% zoom, not the
  monitor; the box fills the viewport whatever its size, so a maximized window on such a monitor
  fits too. The plan confirms or corrects it, along with the type and lookup names, the follow
  tolerance, and the order below the box.
- **Spec questions:** any stock trait or perk without a usable entry, and any doc text this slice
  makes stale.

## Docs edited at this kickoff

- `.claude/ROADMAP.md`, the Phase 4.5 entry: its slices run to 4.5-G3, and the demo is G1 to G3
  (it still ended at G2 after the G3 brief landed).
