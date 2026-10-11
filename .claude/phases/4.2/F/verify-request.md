# Verify request — Phase 4.2 — Slice F (round 1)

For `/slice-verify 4.2-F 1`. Base: `298914e` (`main` after 4.2-E). Inventory:
`phases/4.2/F/inventory.md`, 280 units, `npm run docs:check -- inventory F` passes.

## Files condensed

| File | Before | After | Units |
| --- | --- | --- | --- |
| `CONVENTIONS.md` | 25.4 KB | 22.8 KB | 68 (C:) |
| `VISION.md` | 4.4 KB | 4.1 KB | 22 (G:1–G:66, G:1276–1282) |
| `OPEN_QUESTIONS.md` | 5.3 KB | 4.2 KB | 20 (G:1284–1347) |
| `CLAUDE.md` | 13.1 KB | 5.7 KB | 25 |
| `ROADMAP.md` | 36.2 KB | 12.3 KB | 111 |
| `WORKFLOWS.md` | 10.8 KB | 8.6 KB | 34 |

Also edited outside the slice's files: `spec/saves.md` (three lines moved in from ROADMAP Phase 5)
and `phases/4.2/G/brief.md` (notes for G).

After F no file carries a `## To fold` section (`grep -rn "## To fold" .claude --include=*.md`
outside `phases/` and `archive/` finds nothing).

## Row counts per fate

| Fate | C: | G: | CLAUDE.md | ROADMAP.md | WORKFLOWS.md | Total |
| --- | --- | --- | --- | --- | --- | --- |
| kept | 9 | 11 | 6 | 9 | 23 | 58 |
| rewritten | 43 | 24 | 8 | 40 | 9 | 124 |
| merged | 14 | 3 | 7 | 7 | 1 | 32 |
| moved | 1 | 3 | 0 | 6 | 0 | 10 |
| dropped | 1 | 1 | 4 | 49 | 1 | 56 |

## Check hardest

### Every `dropped`

- **`CLAUDE.md:15`, the rule summary** (the whole 74-line paragraph is one unit). The 4.2-F brief
  says a summarised rule can only be dropped if it has a home. Its Reason lists every fact with its
  home in label form; check that each named heading really states the fact, and that no fact of the
  summary is missing from the list. The ones I'd check first: "Cast picks a gem slot index or a
  random castable gem" (`spec/combat.md` "Actions"), "a status is a single-instance container with
  no stat-modifier inside" (`spec/statuses.md` "A status is a timed effect", `spec/effects.md` "No
  temporary stat-modifier"), "target: a full party within the first session" (`spec/creatures.md`
  "Cold start"), and the turn sequence (`spec/combat.md` "Turn structure").
- **ROADMAP finished phases, 49 bullets dropped as history.** The brief says any rule still living
  only there moves to the spec. Each Reason names where the rule now lives (or what superseded it);
  check that no bullet holds a rule the spec lacks. Superseded rather than built: `ROADMAP.md:134`
  (13 hooks, now 17), `:140` (read-time predicate, `suppress-action`), `:145` (round-based status
  timing, Stun as a condition-status, stacking to a cap), `:62` (first-by-slot default target).
  Rules found only in ROADMAP and moved: "one migration scaffold even if trivial" (`:354` →
  `spec/saves.md` "Versions and migrations"), the first-format partition contents (`:362` →
  "Partitions"), the env module (`:362` → `CONVENTIONS.md` "IndexedDB is namespaced by
  environment"), the content-authoring plan (`:441` → `ROADMAP.md` "Content authoring").
- **`WORKFLOWS.md:99`, the per-step paragraphs 0–8**, dropped as duplicates of the `workflow/*.md`
  step files except three bullets kept. Check each sentence of the old paragraphs against the step
  file the Reason names.
- **`WORKFLOWS.md:151`** (doc edits in place), as a duplicate of `workflow/design-rules.md` "Doc
  edits".
- **`G:1328`, the entrance-hub prelude** (Duncan's decision, below).
- **`G:3`'s blockquote** ("this document wins until deliberately revised"), dropped as superseded
  by `CLAUDE.md` "How the spec is written" (the code wins over a stale doc; a bug gets a Known bug
  line).
- **`ROADMAP.md:449`**, "keep PRs phase-scoped", as a duplicate of `workflow/coding-rules.md`
  "Rules" ("Stay in this slice's scope"), not of CONVENTIONS or WORKFLOWS themselves: the brief
  names those two; I took the step files WORKFLOWS points to as the same home. Say if that's too
  loose.

### The large merges

- **`C:1839`, the balance simulator** (and `C:2053` merged in): the bands, the hard wall, the report
  additions and the CI thresholds, with the history and superseded readings removed.
- **`CLAUDE.md:132`** into `CONVENTIONS.md` "The engine is pure and deterministic" and "Source
  folders" (the two trees merged; CLAUDE.md's `app/` "routing" dropped).
- **`ROADMAP.md:362`**, split three ways (see above).
- **`ROADMAP.md:274`–`:283`** (the 4.2 entry's decisions) moved to `CLAUDE.md` "How the spec is
  written", written together with the phase brief's "Rules for the new spec" (Duncan's decision 1).
  That section is the one place in F with sentences that trace to the phase brief rather than to an
  inventory unit; check it adds nothing the brief doesn't say.

### Every number

Checked against the code; please re-check:

- `CONVENTIONS.md` "Balance simulator": T1 ≥95%, floors 3 / 6 / 10, the wall at 5 failed pushes
  (`WALL_FAILED_PUSHES`), CI first-try floor 1 ≥ 80% (`FLOOR1_MIN_CLEAR_PCT`), median first soul ≤
  30 (`FIRST_SOUL_MAX_RUNS`), floor 5 within 20 runs (`FLOOR5_WINDOW_RUNS`), 40 seeds
  (`SIM_SEEDS`), capped at 30 (`CI_RUN_CAP`) with `probeBosses: false` (`balance-ci-*.test.ts`).
- `CONVENTIONS.md` "Where each number lives": the BalanceConfig list against
  `data/balance.ts` `DEFAULT_BALANCE_CONFIG`; the `engine/config.ts` constants.
- `CONVENTIONS.md` CI: the triggers (`.github/workflows/deploy.yml`: `pull_request` and `push` to
  `main`), `npm run format:check` in the job, Node 24.
- `OPEN_QUESTIONS.md`: `ROUND_CAP` 100 (`engine/config.ts:1`); clean-path levelling 9 at floor 10,
  25 at floor 30, and the Brute's 28 / 36, both kept from the old text (not re-measured).
- `CONVENTIONS.md` "Mechanism goldens vs content goldens": nine placeholder traits
  (`data/traits/core.ts`, 9 `Trait` exports).

## Stale-doc fixes made without a decide-point

Each states what `main` does; none changes a design. Flag any you think needed Duncan:

- CI runs on every pull request and every push to `main`, not every push, and includes the format
  check (`C:2057`).
- `VISION.md`'s loop diagram: "fuse / heal / store" → "fuse / summon / store"; there is no healing
  facility (`G:49`).
- `CLAUDE.md`'s deploy line: GitHub Pages only, not "GitHub Pages / Netlify / Cloudflare Pages"
  (`CLAUDE.md:127`).
- The PRNG named as mulberry32, not "e.g. mulberry32 / a small xorshift" (`C:21`).
- ROADMAP Phase 4.5: "Brief: to be written after 4.1-H merges" → "after Phase 4.2" (`:295`).
- `OPEN_QUESTIONS.md` "Behavioral traits": extra actions are built, as the 4.2-D note says
  (`G:1325`); "The biome roster": the first three biomes and the starters are decided (`G:1336`).
- `CONVENTIONS.md` "PR previews are not built" and "E2E smoke test" say plainly that nothing exists
  yet. I kept them in CONVENTIONS rather than moving them to a ROADMAP "Decided, not built": neither
  is a decision with a phase.

## Design calls to check

- **The non-negotiables** (`CLAUDE.md` "The rules that matter most") stay as five one-line
  pointers, each linking its rule's home. The brief keeps "the non-negotiables" in CLAUDE.md, and
  both CLAUDE.md and CONVENTIONS are read by every chat, so the lines are kept short rather than
  dropped.
- **The env module** (4.2-C note: "move them to `spec/saves.md`"): its rule already lives in
  `CONVENTIONS.md` "IndexedDB is namespaced by environment", which every chat reads, so it went
  there and `spec/saves.md` "Saves are large" links it. The partition contents did go to
  `spec/saves.md`, as the note asks.
- **Finished phases** are one bullet each under `## Finished phases`, not one `##` heading each;
  the future phases keep their headings (the ROADMAP anchors cited by 4.2-D's inventory are
  unchanged).
- **`WORKFLOWS.md` "What a mailbox keeps"** is now a `###` heading, since `workflow/design-rules.md`
  and `coding-rules.md` cite it by label and 4.2-G converts labels to anchors.
- **`VISION.md` "v1 is the start-of-beta baseline"** is a new heading over the old scope note, so
  ROADMAP links it instead of restating it.

## Decisions Duncan made (step 4)

1. **The spec-writing rules live in `CLAUDE.md`** "How the spec is written", including the
   `## Not built` half (4.2-C note). Recommended: every chat reads it, so readers learn what a Known
   bug line or a Not built half means.
2. **The entrance-hub prelude is dropped** from `OPEN_QUESTIONS.md` (4.2-B note). I recommended
   keeping it parked as an idea distinct from the scripted intro; Duncan dropped it.
3. **The placeholder traits are a bug**: `CONVENTIONS.md` "Mechanism goldens vs content goldens"
   keeps the rule and adds a `**Known bug:**` line pointing at ROADMAP Phase 4.5 "Content
   clean-up", whose entry now says its PR review removes the line.
4. **The round cap stays open as "is 100 right?"**: `OPEN_QUESTIONS.md` "Fight length" asks whether
   `ROUND_CAP` = 100 suits the fight-length target, still open.

## Notes for later slices

- `phases/4.2/G/brief.md`, new `## Known from earlier slices`: G adds its citations-in-CI and
  budget lines to `CLAUDE.md` "How the spec is written" when it builds them; the stale comment in
  `data/balance.ts:1-4`.
- Already listed in G's brief, confirmed here: the `(Phase 4.2 only)` paragraphs in `CLAUDE.md` and
  `WORKFLOWS.md`; `engine/config.ts:1-2` calling `ROUND_CAP` "exact number TBD".

## Docs edited

- `CLAUDE.md`: condensed to orientation, the non-negotiables, the doc map and the spec-writing
  rules (decision 1); the rule summary dropped.
- `CONVENTIONS.md`: condensed; every rule a `###` under `##` sections; CLAUDE.md's and ROADMAP's
  engineering duplicates merged in; the Known bug line (decision 3).
- `VISION.md`: retitled and condensed.
- `OPEN_QUESTIONS.md`: condensed; every item a `###`; the prelude dropped (decision 2); the round
  cap reworded (decision 4).
- `ROADMAP.md`: finished phases one line each; Phases 5, 8 and 9 point at the spec's `## Not built`
  halves; "Guidance for AI-assisted work" resolved line by line; the 4.2 entry condensed.
- `WORKFLOWS.md`: step rules left to `workflow/*.md`; the 4.1 transition one sentence.
- `spec/saves.md`: the first-format partition contents, the migration scaffold and a link to the
  IndexedDB namespacing, moved from ROADMAP Phase 5.
- `phases/4.2/G/brief.md`: notes from F.
- `phases/4.2/F/inventory.md`, `phases/4.2/F/verify-request.md`: this step's mailbox files.

## Round 2

For `/slice-verify 4.2-F 2`, after `verify-r1.md`. `npm run docs:check -- inventory F` passes: 280
units, 280 rows (the table is unchanged in count; one base-only line is listed below it).

### Findings

1. **`C:1825`, summon cost: fixed.** `CONVENTIONS.md` "Where each number lives" keeps the clause:
   "the summon cost (free: nothing reads it until Phase 8's Soul Altar names the currency it is
   paid in)". The row's Reason now says it is kept and why (no other doc says `summonCost` exists
   unread).
2. **Sacrifice-revive has no row: fixed as a listing, not a row.** A row can't go in the table:
   `inventory F` fails any id that isn't one of F's units. The inventory now ends with
   `## Base-only text (outside the units)`, a table of base lines no unit covers because an earlier
   slice moved them in. I checked for others with `git diff 6abd67a 298914e` over F's six files:
   Sacrifice-revive is the only one. The other additions are in `ROADMAP.md`, whose units are read
   from the base, so they already have rows. B's dead anchor goes to 4.2-G (below); B's merged
   inventory isn't edited.
3. **`WORKFLOWS.md:99`, "opens the PR": fixed.** "Who does what" now has the human "commits,
   pushes, opens the PR, merges, and deletes files". Row `WORKFLOWS.md:99` adds
   `WORKFLOWS.md#who-does-what` and names the merge. Row `WORKFLOWS.md:19` goes from `kept` to
   `rewritten`, because its text changed.

`ROADMAP.md:449` ("phase-scoped" vs "Stay in this slice's scope"): accepted by the verify, no
change.

### Spec and code disagree: Duncan's decisions

All three are **stale docs**: the text now says what `main` does, and no "Decided, not built"
entry is needed.

1. **CI jobs and triggers.** "Every pull request runs the gates" adds "and every manual run"
   (`workflow_dispatch`). "Deploy only from main, only if tests pass" now reads: three jobs in
   order, `test` → `build` → `deploy`; `build` runs on every change, so a pull request also proves
   the site builds; only `deploy` is guarded to a push to `main`. Recommended as stale: building on
   pull requests is stricter than the old text's single main-only job, so the code is the better
   design. Rows `C:2057`, `C:2060`.
2. **Spell library layout.** "Effect carriers live in libraries": `core.ts` and one file per biome,
   plus `starters.ts` for the starters' and the Unicorn's signature traits; `data/spells/` has
   none because no spell is starter-only. Arcane Bolt was deliberately promoted to a biome-1 spell
   (`data/spells/overgrowth.ts`, its comment). Row `C:2106`.
3. **Source tree.** "Source folders": `data/` lists "config (facilities from Phase 8)", and
   `state/` is "the store and the balance simulator (save/load and migrations from Phase 5)".
   This departs from the letter of the condensing rule (a future placement goes to a "Decided, not
   built" listing). I recommended it, and Duncan agreed, because CONVENTIONS already marks future
   folders inline ("Composition files only reference carriers": "and later `data/gems/`,
   `data/equipment/`"). Marking them inline keeps the folder map in one home, and the tree no
   longer claims they exist. The simulator is added because it is in `state/` on `main`. Row
   `C:2094`.

Check: the three rewritten passages against `.github/workflows/deploy.yml`, `src/data/spells/`,
`src/data/traits/starters.ts` and `src/state/`.

### Not re-measured

Unchanged from round 1: the clean-path levelling and the Brute's 28 / 36 are kept from the old
text.

### Notes for later slices (round 2)

`phases/4.2/G/brief.md` "Known from earlier slices" gains two bullets from `verify-r1.md`:

- B's three dead New-home anchors, with the Sacrifice-revive one's current anchor;
- the further `GAME_DESIGN §13` citations in `src/` (`app/demoFight.ts`, the three
  `data/species/*` files, `engine/curves.ts`, `state/rewards.ts`).

The verify's other stale comments (`engine/config.ts:1-2`, `data/balance.ts:1-4`) were already
listed there.

### Docs edited (round 2)

- `CONVENTIONS.md`: the summon-cost clause restored (finding 1); the CI triggers and the three
  jobs, the spell-library layout and the source tree written as `main` has them (decisions 1–3).
- `WORKFLOWS.md`: "Who does what": the human opens the PR (finding 3).
- `phases/4.2/G/brief.md`: two notes from F's verify.
- `phases/4.2/F/inventory.md`: rows `C:1825`, `C:2057`, `C:2060`, `C:2094`, `C:2106`,
  `WORKFLOWS.md:19` and `WORKFLOWS.md:99` updated; the "Base-only text" table added.
- `phases/4.2/F/verify-request.md`: this section.
