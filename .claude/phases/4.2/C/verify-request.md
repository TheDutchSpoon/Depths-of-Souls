# Verify request — Phase 4.2 — Slice C (round 1)

Design agent → coding agent. Check the five condensed spec files against `main`'s code and against
their old text (`git show 892f1b8:.claude/CONVENTIONS.md` and `GAME_DESIGN.md`, or the 4.2-A text
at `git show 171d5fb:.claude/spec/<file>.md`), using `inventory.md` in this mailbox.
`npm run docs:check -- inventory C` passes: 154 units, 154 rows, base `171d5fb`.

## Files condensed

| File | Before (bytes) | After (bytes) |
| --- | --: | --: |
| `spec/creatures.md` | 27,537 | 17,376 |
| `spec/run.md` | 26,639 | 17,417 |
| `spec/progression.md` | 9,673 | 3,515 |
| `spec/store.md` | 2,091 | 2,333 (the store half of the run-layer intro moved in) |
| `spec/saves.md` | 6,415 | 3,495 |

Total 72,355 → 44,136 bytes, of which 9,596 are the new `## Not built` halves (creatures 4,319,
run 1,884, saves 3,393; see "Decisions Duncan made").

## Rows per fate

| Fate | Rows |
| --- | --: |
| kept | 1 |
| rewritten | 103 |
| merged | 33 |
| moved | 2 |
| dropped | 15 |

## Check hardest

1. **Every number against `src/`.** Soul gain 25 / 20 / 10 (`data/balance.ts`); XP to next level
   `20 × level²` and XP per kill = the victim's level (`engine/leveling.ts`); the level formula;
   `fightCount` `10 + (floor − 1)`; `enemyPartySize` `min(6, floor)`; the level range (minimum
   `floor(floor × m)`, width `floor(floor / 10)`) and its worked values: floors 1–9 at 1, 2, 3, 5, 6,
   7, 9, 10, 11, floor 10 at 13–14, floor 30 at 44–47 (`engine/curves.ts`); the boss offset 5;
   `DEFAULT_GEM_SLOT_COUNT` 3; 100 perk points per boss (`perkPointsFor`).
2. **Every claim about `main`'s mechanics**, especially the ones written from the code:
   - `spec/run.md` "Floor runs": `descend` reaches `deepestFloor + 1`; a descent draws from
     `runSeed`/`runCounter` and advances `runCounter`; every descent adds its biome to
     `discoveredBiomes`; `deepestFloor` advances only on a full clear.
   - `spec/run.md` "Boss floor generation": the order of draws (boss gem set, then each add's level
     and gem set, then the fill), the fill pool minus the boss's `speciesId`.
   - `spec/run.md` "Enemy script and gem set": generation passes no `scriptId`, so
     `materializeCreature` falls back to `defaultScriptId`.
   - `spec/creatures.md` "Instance" (`scriptId: null` runs the role; a fusion source throws when
     materialized) and "materializeCreature" (`gems?`, `scriptId?`).
   - `spec/store.md`: the `GameState` field list, the actions, the failure reasons.
   - `spec/creatures.md` "Player gem sets": the unlock biome ignores pins and caps at floor 100.
3. **The Known bug in `spec/run.md` "Rewards".** The design says level-ups apply after each fight;
   check that `main` really applies all of a floor's XP after the whole floor
   (`state/store.ts` `descend`: `resolvePlayerParty` once before the fight loop, `applyXpToParty` in
   the final `set`), and that the ROADMAP Phase 4.5 listing says what the fix must do.
4. **Every `dropped` row.** Each names the home it duplicates: check the home really holds the rule
   (the starters in `specializations/*.md`; `spec/run.md`, `spec/creatures.md` and `VISION.md`
   for the old §10 summary; `CONVENTIONS.md` "Where each number lives"). And every rule dropped
   *inside* a rewritten or merged row as a duplicate (spec/combat.md "Affinity advantage",
   "Encounters, rewards & wipes", the `alive: false` sentence in "Resolution & timing";
   OPEN_QUESTIONS.md "Balance numbers"; spec/effects.md's specializations bullet under
   "Unspecified magnitude ⇒ 100%.").
5. **The large merges**: C:107 + G:146 into `spec/run.md` "Enemy levels"; G:107 + C:84 into the
   three boss headings; G:420–448 + C:1732 + C:1741 + G:1240 into `spec/creatures.md` "Fusion";
   C:1891–1914 + G:1210–1269 into `spec/saves.md`. Check that no rule was lost or changed.
6. **The `## Not built` halves.** Each rule there must really be unbuilt in `main` (gems as items,
   fusion, equipment, catch-up levelling, the Soul Altar, facilities, recipe drops and sinks, biome
   theme and visuals, the whole save format). Conversely, nothing built may sit there: pinning is
   built and ungated (`pinBiome`), so it is in Design "Pins" and only the Atlas gate is Not built;
   summoning is built and free, so only the Altar requirement is Not built.

## Decisions Duncan made (step 4)

- **Unbuilt subsystems live in a `## Not built` half** at the end of their spec file, not in ROADMAP
  "Decided, not built". Each rule there names the phase that builds it; that phase's PR review moves
  the rule into `## Design` or `## Engine rules` of the same file. A slice-sized decision still goes
  to its phase brief. Written into the phase brief, rules 1 and 2. `spec/saves.md` is all Not built
  (Phase 5).
- **Level-up timing is a bug.** The design (level-ups after each fight, so the party fights the
  floor's next fight at its new levels) stays in `spec/run.md` "Rewards" with a `**Known bug:**`
  line; the fix is in ROADMAP Phase 4.5 "Decided, not built" and moves balance, so the CI bands are
  re-checked with it. Not a finding.
- **The seed spell set is a stale doc.** The ~10 spells per affinity (~50 in all) and the full kit
  per affinity are dropped: `main` ships 36 and Cinder Nova is the only plain AOE damage spell, and
  the cumulative-unlock rule (each biome adds at least 4–5 of its own) replaced that plan. The
  lasting authoring rules stay in `spec/creatures.md` "Authoring spells".
- **Stale-doc fixes approved as a batch** (the doc follows `main`): `canEquip(spell, affinity)`; the
  store's state list is the real `GameState`; "deepest-reached" is the deepest *cleared* floor;
  Zustand is in use; biomes carry only a name, a species pool and a boss (theme, scaling tweaks
  and visuals to Not built). Two more of the same kind, signature-only, applied under that batch:
  `biomeForFloor(floor, biomes, atlasPins, runSeed)` and `materializeCreature`'s `gems?` and
  `scriptId?` options. Report either if you think it isn't stale.
- **One added rule:** `spec/progression.md` "Swapping specialization" now says a swap grants the new
  spec's starter if it isn't owned, and never removes one (Phase 4 ASSUMPTION 28; `setSpec`,
  `store.test.ts`). It is the only sentence without an old unit; row G:1175 records it.

If you find another place where the code contradicts the text, report it as a finding and say
whether you think it is a bug or a stale doc.

## For later slices (not findings for this round)

Each note is also in that slice's `brief.md` under "Known from earlier slices" (D, E, F), or in
G's "Clean-up"; 4.2-B's notes for D, E and F were carried over the same way.

- **4.2-D:** `spec/effects.md`'s specializations bullet (under "Unspecified magnitude ⇒ 100%.":
  specs are data, the Σ = 1000 load check, derived perk points, `setPerkLevel`/`refundAllPerks`,
  no phase tag on `PerkDef`) is progression engine rules: move it to `spec/progression.md`
  `## Engine rules`, with the store action details to `spec/store.md` "Store actions".
- **4.2-E:** `spec/combat.md` "Encounters, rewards & wipes" is now the one home of per-kill
  banking and wipe → hub; `spec/run.md` and `spec/creatures.md` link to it, and to "Affinity
  advantage", "Fight setup" and "The stat a spell's magnitude scales off". Keep those labels as
  headings or update the links.
- **4.2-F:** ROADMAP Phase 5 ("Inputs already decided") and Phase 8 restate `spec/saves.md` and the
  creatures/run Not built halves; keep one home (the ROADMAP partition list and the IndexedDB-name
  env module are not in saves.md yet). `CONVENTIONS.md` "Where each number lives" restates the XP
  curve's rationale, now at `spec/creatures.md` "Levels and XP". `CLAUDE.md`'s rule summary restates
  most of these files.
- **4.2-F or G:** wherever the spec rules land after 4.2 (they live in the phase brief today), and
  `workflow/pr-review.md`, need the `## Not built` half: a PR review that builds a Not built rule
  moves it up.
- **4.2-G, stale `src/` comments:** none new.

## Docs edited

- `spec/creatures.md`, `spec/run.md`, `spec/progression.md`, `spec/store.md`, `spec/saves.md`:
  condensed (rows in `inventory.md`); `## Not built` halves added.
- `phases/4.2/brief.md`: rules 1 and 2 gain the `## Not built` half (Duncan's decision).
- `ROADMAP.md`: Phase 4.5 "Decided, not built" gains the level-up timing fix.
- `content/enemy-behaviour.md`, `content/overgrowth.md`, `specializations/brute.md`,
  `specializations/shieldbarer.md`, `specializations/sorcerer.md`: label links repointed to the new
  headings ("Milestone bosses" → "Boss floors", "Flow" → "Scripted intro", "Biome progression" →
  "Spells unlock cumulatively", "9. Player specializations" → "Perks", "Perk points" and "Spending
  perk points").
- `phases/4.2/D/brief.md`, `E/brief.md`, `F/brief.md`: "Known from earlier slices", with 4.2-B's
  and 4.2-C's notes for each; `G/brief.md`: the `## Not built` step for `workflow/pr-review.md`.
- `workflow/condense.md`: "Finish" says notes for later slices go into their briefs.
- `phases/4.2/C/inventory.md` (new, from `inventory-skeleton`) and this file.
