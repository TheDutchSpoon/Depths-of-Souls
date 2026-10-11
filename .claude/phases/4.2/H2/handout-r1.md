# Fix hand-out — Phase 4.2 — Slice H2: Code comments, the sweep — Round 1

Branch `4.2-h2`, build commit `552e5bc`; the proof's base stays `origin/main` at `0126c4a`. This is
the same slice and the same rules as `kickoff.md`:

- every change is a comment or a test title;
- golden policy byte-identical;
- no change under `scripts/` beyond `ci.test.ts`;
- no living doc edited.

The aim is `CONVENTIONS.md#comment-why-not-what`: no provenance, no history, an anchor rather than a
restated rule, and the *why* kept. Every comment you touch is checked against the **code** or the
cited doc, never against the old comment. Line numbers are as of `552e5bc`.

## 1. Restore the eight anchors the mechanical pass deleted

Rule M1 dropped a leading label's whole parenthetical, including an anchor that sat beside the
tag. Each comment below restates its rule with no citation. Put the anchor back where it reads
naturally, and wrap the orphaned short first lines (e.g. "/** The load-time validator for
observation") back to the file's width.

| Where | Anchor |
| --- | --- |
| `src/data/scripts.test.ts:37` | `spec/scripting.md#role-scripts` |
| `src/engine/effect-types.ts:354` (`validateObservationFilters`) | `spec/effects.md#damage-observation` |
| `src/engine/effect-types.ts:391` (`'random'` intent-only) | `spec/combat.md#one-action-pipeline` |
| `src/engine/effect-types.ts:466` (`validateStatusDef`) | `spec/effects.md#no-temporary-stat-modifier` |
| `src/engine/effects.ts:464` (`isActionLocked`) | `spec/statuses.md#action-locks` |
| `src/engine/resolution.ts:436` (`observedDamage`) | `spec/effects.md#damage-observation` |
| `src/engine/resolution.ts:1222` (the tick) | `spec/statuses.md#the-applier-snapshot` |
| `src/engine/test-utils/golden-runner.ts:1` | `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` |

Then check the rest of the diff for the same loss: for every hunk, count the `.md#` citations
removed against those added. A hunk that loses one has either moved it, or the hunk is listed
above. Report the count.

## 2. Comments that are now false

Rewrite each one to what the code does.

- `src/engine/__golden__/golden-necromoss-reclaim.fixture.ts:5,7`: the real Necromoss Wisp has
  `health: 30` (`data/species/rotcap-hollow.ts:211`), not 18. Keep the arithmetic and drop "the
  species' real". The point is that at 18 max HP and 2 dead allies, both rates floor to 1, so that
  scenario can't catch the wrong rate.
- `src/data/traits/glimmerdark.ts:163-164`: when an ally casts, the **Resonant** (the response
  targets `self`, `:182`) gains the stats, not the caster.
- `src/engine/effects.ts:1-3`: the status apply/refresh/decrement/expire lifecycle is not in this
  file (`applyStatus` is in `resolution.ts`, the countdown in `combat.ts`). Say what the module
  holds.
- `src/engine/balance-types.ts:34`: the default is `base: 0, perTenFloors: 1`
  (`src/data/balance.ts:16`), not "2, 1".
- `src/data/spells/rotcap-hollow.ts:108-110`: Burn's other real producers are the Sporch Igniter
  (on-attack) and the Sporch Cinderlord (on-kill).
- `src/engine/spell-effects.test.ts:1224`, a title: the test asserts that `validateSpellEffects`
  rejects the spell at load. Retitle it to say so, e.g. "(rejected at load, not mid-fight)".
- `src/engine/effect-types.ts:769-771`: content does set `actionKind` (the Blindclaws Striker,
  `traits/glimmerdark.ts:136`). Say that absent means `'both'`, and that Cull the Weak, Ambusher,
  Gloomjaws and Sporch's Reaper leave it absent.
- `src/engine/test-utils/rng-draw-count.ts:1-3`: the "(a closure wrapper …, impossible once …)"
  parenthetical described the deleted helper. Say what this helper does and why it reads
  `rng.position`.
- `src/engine/generation.ts:169`: the balance simulator's probe sets `Instance.scriptId`
  (`state/balance-sim.ts:914`). Drop "nothing produces a non-null … yet".

## 3. Citations and quotations that don't hold

- `src/data/traits/overgrowth.ts:91`: `spec/effects.md#count-scaling` does not name the Swarmhive
  Striker; no spec file does. Cite count-scaling for the mechanism only.
- `src/data/traits/rotcap-hollow.ts:12`: the sentence is about Necromoss. Cite
  `content/rotcap-hollow.md#necromoss-witvitality-reclaim`, not the Myconet section.
- `src/engine/effect-types.ts:312`: count-scaling does not name stat-modifier as a host. Cite
  `spec/effects.md#stat-modifier-counts-freeze-at-application`, which states this NOTE's rule, and
  cut the restatement down to what the code adds.
- `src/engine/effect-types.ts:763`: the one-hit "consumption" rule is in
  `spec/effects.md#conditional-damage-bonus`, not `#splashing-and-annihilate`.
- `src/data/species/starters.ts:36-37` and `src/data/traits/starters.ts:9-10`: the quotation
  ("grants one spell as a permanent extra gem …") is not
  `specializations/sorcerer.md#starter-glyphmoth-seer`'s wording, and it is wrong: the starter has
  an innate spell. Drop the quotation and keep the anchor. The `ARCANE_BOLT` "granted gem" at
  `species/starters.ts:38` is the innate spell too.
- Quotations that aren't their target's words. Drop the quotes and keep the anchor:
  - `src/data/traits/overgrowth.ts:269`: "a big retaliate"
  - `src/data/traits/glimmerdark.ts:121`: "+% while acting before its target"
- Re-scan for this by hand: `--quotations` misses a quotation that sits *before* its anchor, and
  one of four words or fewer. Report what you checked.

## 4. References that now point at nothing

- `golden-spore-spread-dot-kill.fixture.ts:24`: "now, per the fix". Say "a distinct per-trigger
  guard identity (see the header)".
- `golden-sorcerer-starter.fixture.ts:72`: "the same draw as before". Make it "(draw #1)".
- `golden-sorcerer-starter.fixture.ts:7-10`: "so the equipped pool stays size 1" doesn't follow.
  Say the fixture authors no `equippedSpells`, so the pool is size 1.
- `golden-b2-silenced-refuses-granted-cast.fixture.ts:138`: "the one new event". Make it "the
  grant's only event".
- `golden-b1-granted-cast-default.fixture.ts:7`: "the log gains". Make it "the log has".
- `src/engine/status-snapshot.test.ts:30`: "(extended to a rule's unit test)". Cite
  `CONVENTIONS.md#tuning-never-changes-a-mechanism-golden` instead.
- `src/engine/resolution.ts:869` and `:1030`: `spell.spellPower * pf` and `sp * pf` name a field
  `Spell` no longer has. Say why the order is kept: the result stays byte-identical with the
  legacy cast path that `spell-effects.test.ts`'s oracle pins.
- Lines with a missing referent or verb:
  - `src/state/balance-sim.ts:4`: "the watch points" (which ones?)
  - `src/data/traits/rotcap-hollow.ts:60-61`: "…the Glimmerdark amplifiers):" lost its verb
  - `src/state/rewards.ts:44`: "deriving a fused creature is `…#fusion`" lost its verb
  - `src/engine/effective-stats.ts:63-64`: a dangling "Self-only:"
  - `src/engine/corpus-coverage.test.ts:167`: "// Appended:"

## 5. Provenance and history still present

`comments` can't see these shapes, so it passes over them. Rewrite each to state what is true now,
or drop it if it only narrates.

**Review words and plan items:**
- `src/engine/combat.ts:51`: "(design-review B-5)"
- `src/engine/generation.ts:221`: "(nit, review)"
- `src/engine/perform-action.test.ts:4`: "(the PR lists the mutation for each)"
- `src/engine/status-containers.test.ts:195`: "(deliberate change)"
- `golden-sleep-wake.fixture.ts:4,6`: "#1's" (name the `conditional-damage-bonus` instead)

**Slice ids:**
- `src/engine/combat.test.ts:939`, a title: "pre-Slice-B". Say what it pins: absent
  `scalingStat` reads the remap-aware Intelligence. Move its row in
  `evidence/history-markers.md` from Kept to Rewritten.
- `golden-h2b1-observed-tick.fixture.ts:2-4`: "H2b2 moved the tick's source…". Keep the *why*: a
  golden of its own, so the tick case can change without touching the others.
- `golden-h2b2-tick-self-applied.fixture.ts:4`: "the id inference H2b1 refused"
- `src/data/spells/overgrowth.ts:228`: "(H's job)"

**"locked" in the decided sense:**
- `golden-action-observed.fixture.ts:1`: "own locked"
- `golden-attack-instance-list.fixture.ts:1`: "(locked)"

**History:**
- `golden-stun.fixture.ts:83-84`: "(it used to expire at the round-end sweep …)". It wraps across
  two lines.
- `golden-f2-weaken-three-turns.fixture.ts:2-5`: "covered only two … only WHICH turns it covers
  moves". Keep the trap in the present tense: under round-end counting it *would* cover two.
- `src/data/spells/overgrowth.ts:81`: "(it dealt 35% before)"
- `src/data/traits/index.ts:129`: "(the Glowflies' three became the Flickerlings'.)"
- `src/data/roles.test.ts:82`: "// Was 'taunter'". Give the reason instead: a Provoke-only script
  never attacks.

**Re-scan for split markers:** join each comment block into one line, then grep your history word
list again, since a marker can wrap across lines. Report the count.

## 6. Stale facts in blocks you touched

- `src/data/spells/overgrowth.ts:3-7`: the file has 16 spells, not 11, and the "every other
  affinity has two" count is wrong. State it from the data, or drop the count.
- `src/data/spells/overgrowth.ts:97-100`: the Sorcerer starter gets Arcane Bolt as an innate spell
  (`traits/starters.ts:36`), not a "fixed slot-0 loadout".
- `src/data/statuses.ts:38-40`: Poison's default *is* read: `MYCONET_ROTCORE_TRAIT`
  (`traits/rotcap-hollow.ts:187`) applies Poison with no duration, and `golden-dot` is a fixture.
- `src/data/traits/glimmerdark.ts:247`: the spread is 4 Wit / 3 Instinct / 5 Violence /
  4 Endurance / 2 Vitality (`glimmerdark.test.ts:89`). Cite `content/glimmerdark.md#affinity-spread`
  rather than restating it.
- `golden-resonant-overtone.test.ts:7`, a title: the original's damage lands **first**, then the
  echo's (fixture `:95`). Fix the title.

## 7. Leftovers from joining lines

- Hyphen joins:
  - `golden-heal-scaling-count.fixture.ts:1`: "Necromoss- shaped"
  - `effect-types.ts:177`: "true- damage"
  - `traits/overgrowth.ts:49`: "deal- damage"
  - `actions.ts:202`: "Provoke/ Wait"
- A double space at `golden-turn-end-dot-kill-burst.fixture.ts:13`.
- `src/state/store-hub.test.ts:93`: "// Null = the role". `null` is an identifier, so keep it
  lower-case. Check the other comment labels the script capitalised for the same mistake.
- Rewrap every comment line this branch made longer than 120 columns (about 75 lines in the changed
  files, against 86 such lines on `main`), at the width of the lines around it. Don't rewrap lines
  this branch didn't lengthen.

## Proof, as before

- **`comment-proof origin/main --mask evidence/mask.json`** passes.
  - The mask maps `main`'s text to the final text, so a title already in the mask gets a new `new`,
    not a second entry.
  - A newly changed title gets an entry: `spell-effects.test.ts:1224`, `combat.test.ts:939`,
    `golden-resonant-overtone.test.ts:7`.
  - Refresh `evidence/comment-proof.txt`, `retitled-tests.md` and `mask.json`.
- **All gates green**, including `comments`, `citations` and `budgets`.
- **Test count** unchanged file by file.
- **Fixtures:** every fixture's exports are still deep-equal to `main`'s.
- **Report and record:** update `history-markers.md`, `quotations.txt` (with the by-hand re-scan)
  and `bare-ids.md` where these items change their rows, and `record.md`'s counts if they move.
  Write `report-r2.md` with one line per item above saying what you did, plus the two counts asked
  for in items 1 and 5.
- **If an item is wrong**, because the code says otherwise, report it and leave the comment; don't
  bend it.
