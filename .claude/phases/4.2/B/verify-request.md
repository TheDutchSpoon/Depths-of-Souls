# Verify request — Phase 4.2 — Slice B (round 1)

Design agent → coding agent. Check the condensed content docs against `main`'s code and against
their old text (`git show 6abd67a:.claude/<path>`), using `inventory.md` in this mailbox.
`npm run docs:check -- inventory B` passes: 228 units, 228 rows, base `6abd67a`.

## Files condensed

| File | Before (bytes) | After (bytes) |
| --- | --: | --: |
| `content/overgrowth.md` | 18,024 | 11,400 (the Unicorn added) |
| `content/glimmerdark.md` | 15,712 | 8,294 |
| `content/rotcap-hollow.md` | 13,847 | 7,639 |
| `content/enemy-behaviour.md` | 6,788 | 5,133 |
| `specializations/brute.md` | 4,703 | 2,258 |
| `specializations/shieldbarer.md` | 4,482 | 2,659 |
| `specializations/sorcerer.md` | 4,300 | 2,895 |
| `species/species-locked.md` | 21,120 | folded in; Duncan deletes it |

Total 88,976 → 40,278 bytes (corrected in round 2).
Shape, now in the phase brief ("Condensing rules"): a title, a
read-when line, a Source paragraph (the code wins); `##` groups, one `###` per status, creature,
boss, spell and perk; each creature opens with "affinity · rarity role · role script", which
replaces the three "How each creature plays" tables.

## Rows per fate

| Fate | Rows |
| --- | --: |
| kept | 13 |
| rewritten | 92 |
| merged | 30 |
| moved | 7 |
| dropped | 86 |

## Check hardest

1. **Every number against `src/data`.** Each trait, spell, status and perk number in the seven
   condensed files: `traits/{overgrowth,glimmerdark,rotcap-hollow,starters}.ts`,
   `spells/{core,overgrowth,glimmerdark,rotcap-hollow}.ts`, `statuses.ts` (potencies, default
   durations, Web's 10%, Confusion's 50%), `specializations.ts` (max level × cost, per-level
   amounts, the nine inert perks), and every role against `defaultScriptId` and `scripts.ts`.
2. **The large merges.** The three roles tables (overgrowth.md:112, glimmerdark.md:109,
   rotcap-hollow.md:110) spread into 54 creature entries and 3 boss entries; the spell tables into one entry per spell
   (overgrowth.md:156, glimmerdark.md:146, rotcap-hollow.md:151); the per-perk tables
   (brute.md:15, shieldbarer.md:18, sorcerer.md:17). Check that no row's content was lost or moved
   to the wrong creature.
3. **The "pending build" sections.** Each item is either dropped as landed (check it really is in
   the code: 4.1-E echo as `perform-action`, 4.1-F timing as `on-turn-end` and bearer-turn
   durations, 4.1-C side-aware support casts, the H2/H2d numbers) or moved (overgrowth.md:219 to
   ROADMAP Phase 4.5 "Decided, not built", because Ember Lance and Venom Bolt are still in
   `spells/core.ts`).
4. **Every `dropped` row as a superseded rule**: rotcap-hollow.md:29 (rounds became bearer turns),
   species-locked.md:76 (Glow), :120 (the Sorcerer's 4-slot loadout became an innate spell), :199
   (boss level), :210 (response vocabulary). And every `dropped` row as a duplicate: the home its
   Reason names must really hold the rule (spec files are still the 4.2-A text, so look in their
   `## To fold` halves too).
5. **Text corrected to the code** (rule 7: the code wins in a content doc). Each of these is a
   claim that `main` contradicts:
   - enemy-behaviour.md:61: "Every Vitality enemy is a support" is false (Treant Sapling guardian;
     Treant Grovekeep and Necromoss Thicket wardens; Sparkeater Voidmaw and Rotfeeder Gorgemaw
     strikers). The conclusion (Life Siphon only on a turn the caster can't attack) still holds,
     because no Vitality creature is a caster or opener and a support's rule 1 casts only
     ally-side gems (corrected in round 2: three Vitality creatures are supports).
   - glimmerdark.md:78: the Sparkeaters' lean was "Wit/Violence"; the code has Violence, Endurance
     and Vitality.
   - glimmerdark.md:27: the Gloomjaws don't share one mechanic (the doc's own :91 says so).
   - overgrowth.md:156: "No affinity carries two plain damage spells" is no longer true (Stinger
     Swarm and Pounce); dropped.
   - glimmerdark.md:146: Kindred Light isn't "the game's first AOE support spell" (Bramble Ward and
     Howling Instinct); dropped as history.
   - rotcap-hollow.md: every "rounds" (Spore, Confusion, spells) is now the bearer's turns, and DoT
     ticks at the end of the bearer's turn.
   - Arcane Bolt is the Sorcerer starter's innate spell, not a granted gem.
6. **Moves into living docs outside B's files**: species-locked.md:186 into `spec/run.md` (the
   boss set-piece bullet under "Milestone bosses"); shieldbarer.md:59 into `spec/progression.md`
   ("Each spec has one control immunity"); species-locked.md:143 into `OPEN_QUESTIONS.md`
   (sacrifice-revive). Check that each says only what its unit said.

## Decisions Duncan made (step 4)

- **The Unicorn's content home is `content/overgrowth.md`** ("Intro: Unicorn Lightbearer"). Its
  trait was written only in species-locked.md.
- **Thorns and Last Stand are bugs.** Their perk texts are the design, and the code is wider:
  Thorns answers any damage with a source (trait and perk hits, other retaliations), not only
  attacks and spells; Last Stand rolls on any lethal damage, a 1-damage hit at 1 HP included, not
  only a hit of more than 1. `specializations/shieldbarer.md` keeps the design text, and each perk
  has a `**Known bug:**` line saying what `main` does; the fix is in ROADMAP Phase 4.5 "Decided,
  not built". Check the design text against the old text, and each Known bug line against the
  code. These two are not findings: they are the documented bugs.
- **Bugs keep their design (new rule).** When `main` contradicts a design that still stands, the
  doc keeps the design and adds a Known bug line; only a stale doc follows the code. Written into
  the phase brief (rules 1 and 7, "Condensing rules") and `workflow/condense.md` step 4. If you
  find another place where the code contradicts a doc, report it as a finding and say whether you
  think it is a bug or a stale doc.

## For later slices (not findings for this round)

- **4.2-C:** `spec/progression.md` restates the starters and the Unicorn (now in the
  specializations docs and overgrowth.md); `spec/run.md` "Milestone bosses" and the content docs
  both describe boss floors (the spec should keep the rule, the content docs the per-boss adds).
- **4.2-D:** `spec/statuses.md` "Status effects" restates the DoT potencies (now in
  rotcap-hollow.md "Damage over time") and has no content home for Weaken, Vulnerability and Regen
  beyond their spells' entries; `spec/statuses.md:340` cites species-locked.md.
- **4.2-E:** `spec/scripting.md` "Role scripts" and enemy-behaviour.md "Role scripts" both carry
  the seven roles.
- **4.2-F:** `OPEN_QUESTIONS.md` still parks the "entrance-hub prelude", while species-locked.md
  said the Unicorn's scripted intro un-parks it. They differ (several weak fights against one
  rigged fight), so decide whether the parked item stays.
- **4.2-G, stale `src/` comments:** species-locked.md is cited 70 times in 29 files of `src/`
  (`verify-r1.md` lists them; corrected in round 2, round 1 named four).

## Docs edited

- `content/overgrowth.md`, `content/glimmerdark.md`, `content/rotcap-hollow.md`,
  `content/enemy-behaviour.md`: condensed (rows in `inventory.md`); the Unicorn added to
  overgrowth.md.
- `specializations/brute.md`, `specializations/shieldbarer.md`, `specializations/sorcerer.md`:
  condensed; Thorns and Last Stand keep their design, each with a Known bug line.
- `ROADMAP.md`: Phase 4.5 gains "Decided, not built" (the content clean-up, with the Venom Bolt
  reason, and the two Shieldbarer perk bugs).
- `spec/run.md`: the boss set-piece bullet (moved from species-locked.md:186).
- `spec/progression.md`: the control-immunity paragraph (moved from shieldbarer.md:59); the
  "P4/P8 column" note rewritten, since the column is gone.
- `spec/creatures.md`: the seed-roster note points at the biome docs instead of species-locked.md.
- `OPEN_QUESTIONS.md`: sacrifice-revive added to the parked design items.
- `phases/4.2/brief.md`: the content-doc shape and the inventory conventions, settled by this
  pilot; the bug exception to rules 1 and 7 and to "Spec and code disagree".
- `workflow/condense.md`: step 4 asks "bug or stale doc?" first.
- `phases/4.2/B/inventory.md` (new) and this file.

## Round 2

Answers `verify-r1.md`. `npm run docs:check -- inventory B` passes: 228 units, 228 rows, base
`6abd67a`. Fate counts are unchanged (kept 13, rewritten 92, merged 30, moved 7, dropped 86).

### Findings

- **F1 (enemy-behaviour.md, Life Siphon's reason): fixed.** Right: Pollinator Duster, Flickerling
  Wick and Necromoss Hollowroot are Vitality supports. The sentence now gives the real reason: Life
  Siphon is Vitality's only damage spell (the only enemy-side Vitality spell in `src/data/spells`),
  no Vitality creature or boss is a caster or opener, and a support's rule 1 casts only ally-side
  gems (`scripts.ts`, `gemSide: 'ally'`), so it reaches Life Siphon only through the fallback. The
  old "while no ally is below 50% HP" clause stays out: it was never exact, since a Pacified support
  with no ally-side gem falls through rule 1 to "cast a random gem" whatever its allies' HP. Row
  `content/enemy-behaviour.md:61`'s Reason and "Check hardest" 5 corrected to match. Stale doc.
- **F2 (rotcap-hollow.md, Hollowkin Wretch): fixed.** "it provokes, then confuses whoever hits it"
  becomes "provoking draws the hits its trait answers": a rationale for the role, like
  the other role notes, not a turn description. Stale doc, not a bug: G1 (`e553576`) gave the
  Wretch `warden` in the same commit that wrote the warden script, conditional from the start; the
  note was loose from the day it was written. Swept the other role notes in the content docs: they
  all give a reason for the role, none describes a turn. Row `content/rotcap-hollow.md:110`'s
  Reason notes the correction.
- **F3 (row `species/species-locked.md:112`): not a finding.** The rule is in
  `spec/progression.md:61`, under "## 9. Player specializations": "its species sits **below the
  ≥3-creature minimum on purpose**". `spec/creatures.md:61` is the Core stats scale bullet and does
  not say it. The row's named home is right; no change.
- **F4 (byte table): fixed.** The table above now has the current sizes, including the round-2
  edits: shieldbarer.md 2,659, enemy-behaviour.md 5,133, total 40,278 (rotcap-hollow.md is back to 7,639).

### Also changed

- The 4.2-G line under "For later slices" now says 70 citations in 29 files, pointing at
  `verify-r1.md`'s list, and the 4.2-G brief carries it: its scope said "the `src/data`
  citations", which would have missed `engine/`, `state/` and 12 golden fixtures. The four other
  stale comments from `verify-r1.md` (`balance-types.ts` default 3, the Web comment in
  `statuses.ts`, the glimmerdark spell and trait narration, the Broodmother "unbuilt" comment) are
  added to the 4.2-G brief's known list.

### Spec and code disagree

None new. F1 and F2 are stale docs: the code is right, and the text now follows it.

### Check this round

The two rewritten sentences against `scripts.ts` and the species files, the two Reasons, the
byte table, and that F3's home holds the rule.

### Docs edited (round 2)

- `content/enemy-behaviour.md`: Life Siphon's reason corrected (F1).
- `content/rotcap-hollow.md`: the Hollowkin Wretch's role note corrected (F2).
- `phases/4.2/B/inventory.md`: Reasons of rows `content/enemy-behaviour.md:61` and
  `content/rotcap-hollow.md:110`.
- `phases/4.2/G/brief.md`: the species-locked citations widened to all of `src/` (70 in 29
  files); four stale `src/` comments added to the known list.
- `phases/4.2/B/verify-request.md`: byte table, "Check hardest" 5 and the 4.2-G note corrected;
  this section.
