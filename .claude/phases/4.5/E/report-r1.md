# Report r1 — 4.5-E: Spell clean-up and Thorn Volley

Built to `plan.md` as `plan-handout-r1.md` corrects it. Nothing committed, no living doc edited.
Evidence is in `phases/4.5/E/evidence/`. `src/data/spells/core.ts` was deleted by Duncan at the
plan's checkpoint, before any gate or evidence run.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 1983 passed, 1 skipped, 0 failed (229 files, 1984 tests) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 678 citations in 463 files |
| `npm run docs:check -- comments` | PASS, 7448 comments and 1737 titles in 430 files |

The three `balance-ci-*` tests, `corpus-coverage.test.ts` and the dedup guard are in that run and
green. `npm run sim` not run (`CONVENTIONS.md#balance-simulator`). No balance verdict went red, so
nothing was tuned. Node v24.19.0.

### Test count, file by file against `main`

`evidence/test-counts.txt`, from the JSON reports of a run of a `git archive HEAD` tree and of the
finished tree: `main` 228 files, 1982 passed, 1 skipped; branch 229 files, 1983 passed, 1 skipped
(the probe's numbers, +1). The only per-file difference is
`__golden__/golden-thorn-volley.test.ts` (new, 1 test). Every other file has the same count,
including the files whose tests were edited. Before the digest was regenerated, the same suite had
exactly one failure, the digest.

## Golden policy

- **Every existing golden's expected values are unchanged**, shown by importing every
  `__golden__/*.fixture.ts` on both trees and deep-comparing each export
  (`evidence/golden-identity.md`, method of `workflow/pr-review.md#4-verify-claimed-invariants-mechanically`):
  144 fixture files on both trees, 1336 exports, and the differences are exactly the allowed ones.
  - `golden-6v6-scripted` `playerParty` and `enemyParty`, `golden-aoe-cast` `playerParty`,
    `golden-dot` `playerParty`: equal once the equipped spell's `id` and `name` are blanked.
  - `golden-aoe-cast`'s `CINDER_NOVA` export: removed.
  - Every `expected*` export is deep-equal.
- The three edits are code-token edits (an import, identifiers, a deleted local spell and its
  export), so they are **not** called comment-only and `comment-proof` is not used. They fall under
  `CONVENTIONS.md#goldens-are-layered-and-additive`.
- **New hand-derived golden:** `golden-thorn-volley` (content golden on the real `THORN_VOLLEY`,
  through `runGolden`). Setup, arithmetic and the 0.3 and 0.5 finals are in its header; I checked
  the arithmetic with `node -e` first and it passed on first run against the derivation (38 / 30 /
  20), not pasted from output. It fails at `spellPower` 0.3 and at 0.5 (`evidence/mutations.md`).
- **Mauler pin:** the roll gave `['weakening-bite', 'thorn-lash', 'silence']`, the kickoff's
  expectation (the test passes with that value; its two registry checkpoints are unedited).
- Trap: `golden-6v6-scripted` still reads the fixture AOE spell (0.3), not `THORN_VOLLEY`. Pointing
  it at `THORN_VOLLEY` fails it (`evidence/mutations.md`).

## Corpus digest

Regenerated once (`npm run corpus:update`), 527 → 525 entries, and the committed rows were
compared against the dump of the working tree (525 of 525 equal). Exactly the probe's numbers
(`evidence/corpus-attribution.md`):

- **Parts A and B:** 152 changed (A 118, B 34); results 190 win → draw, 252, 254, 298, 460 win →
  loss. 435 of 500 fights have a creature whose rolled set differs; every one of the 152 changed
  fights is among them, none with identical sets changed, and every differing creature is Violence
  or Instinct.
- **Part C:** Ember Lance (old 500) and Venom Bolt (old 509) removed; two changed: Thorn Volley's
  fight (old 501 → 500, draw → draw, same event count 3466, new hash) and the `sorcerer` perk
  fight (old 515 → 513, a 1925-event loss → an 85-event win). Every other Part C entry has the
  same hash one index up (after Ember Lance's) or two (after Venom Bolt's); Disorient's does too,
  because its seed 2012 is kept.
- **Seeds kept** (`evidence/seeds-kept.md`): 25 surviving coverage fights compared before/after,
  moved: 0.
- **The `sorcerer` fight's seed sweep** (`evidence/sorcerer-seed-sweep.md`, seeds 900000–900099, the
  coverage test's own anonymising comparison): Echo, Arcane Might and Spell Focus matter at all
  100 seeds (worst case 0 seeds where removal changes nothing). Clear Mind never matters in this
  fight, as on `main`; the coverage case finds it in `sorcerer-silenced`.
- **Poison:** corpus entries holding a Poison `StatusApplied` event, before → after: 53 → 22 (Part A 40 → 20, Part B 11 → 2, Part C 2 → 0). After this slice every one is a generated fight.

## Mechanisms, and the test that fails with each removed

All in `evidence/mutations.md` (16 mutants, each applied alone and restored; the full suite re-run
afterwards is green).

| Mechanism / site | Test that fails without it |
| --- | --- |
| `THORN_VOLLEY` `spellPower` 0.45; aoe shape | `golden-thorn-volley` fails at 0.3, at 0.5 and as `single` |
| `THORN_VOLLEY` first in `ALL_SPELLS` | the order pin in `data/spells/index.test.ts` (appended: fails; a survivor moved: fails) |
| Explicit `seed` on each spell fight | `corpus-digest.test.ts` fails when the seed is derived from the index again (Disorient's fight) |
| Thorn Volley's coverage fight | dropping it fails the digest and shifts the Silence/Pacify case; **the "every spell is cast" case does not fail**, because Parts A and B cast Thorn Volley with its effects landing |
| `sorcerer` perk fight casts Stinger Swarm | `corpus-digest.test.ts` |
| Fixture spells' numbers (0.5, 0.3, 0.4 + Poison 3) | `golden-aoe-cast` and `golden-6v6-scripted` (AOE), `golden-6v6-scripted` (single), `golden-dot` (0.4 and duration 3) |
| Each former user imports the fixtures, not data | `golden-6v6-scripted` pointed at `THORN_VOLLEY` fails |
| Silence/Pacify entries read at 522–523 | the Silence and Pacify case fails when read at 524 |
| `core.ts` gone | `tsc -b` clean; `evidence/no-old-reference.md`: 0 matches in `src/` for the three ids, names and const names |

Two rows the plan listed do not hold, reported rather than papered over:

- **Silence and Pacify keep seeds 2015 and 2016:** deriving them from the index again leaves the
  digest green, because those two fights are an always-cast caster against a wall and draw no
  random number. The explicit seeds hold the invariant (`seeds-kept.md` shows it), but no test
  fails if they move.
- **`THORN_VOLLEY` in `OVERGROWTH_SPELLS`:** omitting it fails nothing. The list is documentation
  and test grouping, not a mechanism, so no test is added; its three existing checks pass with the
  new entries (`THORN_VOLLEY` first, `SILENCE` and `PACIFY` added per decision 1).

## What else changed

- **Fixture spells (A3):** `SINGLE_VIOLENCE_SPELL`, `AOE_VIOLENCE_SPELL`, `POISON_INSTINCT_SPELL`
  (ids `fixture-single-violence`, `fixture-aoe-violence`, `fixture-poison-instinct`) in
  `engine/__fixtures__/spells.ts`, same numbers. Users: `combat.test.ts`, `interpreter.test.ts`,
  `fixture-scripts.test.ts`, `golden-aoe-cast`, `golden-dot`, `golden-6v6-scripted`. The five local
  copies are gone.
- **Seed shape (A4):** `SpellFightSpec.seed` is an explicit field, `buildSpellFight(spec)` takes no
  index. A deletion deletes one entry and moves nothing.
- **Tests edited as listed:** `data/spells/index.test.ts` (pin: `FIRST_22`, then Silence, Pacify,
  then the last three), `state/integration.test.ts` (Mauler), `state/store-gems.test.ts`
  (`thorn-lash`), `data/scripts.test.ts` (`THORN_LASH`), `corpus-coverage.test.ts` (entries
  522–523, length floor 524, comment 520–521).
- **Comments:** `data/spells/overgrowth.ts` header (no count; cites
  `content/overgrowth.md#spell-power-convention`), `glimmerdark.ts` (Disorient, Blinding Flare),
  `rotcap-hollow.ts` (Spore Cyst, Withering Bolt), `data/statuses.ts` (Poison default duration),
  `corpus.ts` (entry numbers, Life Siphon line), the `ALL_SPELLS` doc comment (a deletion is a
  deliberate content change).
- **`OVERGROWTH_SPELLS`:** `THORN_VOLLEY` first, `SILENCE` and `PACIFY` added, the stale
  affinity-count sentence cut.
- **Balance:** the three `balance-ci-*` tests green; the Brute starter's biome-1 Violence pool is now
  Thorn Volley, Thorn Lash, Weakening Bite, Silence (four, as the probe said), so rolled sets move
  for Violence and Instinct creatures.

## Spec questions

1. **`CONVENTIONS.md#effect-carriers-live-in-libraries`** (line 399) names `core.ts` in
   `data/spells/` "for its affinity-generic spells". It no longer exists. The slice brief says the
   PR review drops it, as 4.5-A did for traits.
2. **`CONVENTIONS.md` is over budget** (29,064 bytes of 29 KB; the kickoff's new
   `#corpus-digest` rule took it over). The PR review resolves it
   (`workflow/budgets.md#over-budget`).
3. **`content/overgrowth.md`** is stale: line 8 ("in `src/data/spells/core.ts`") and lines 292–302
   (the "Core spells" section: "Three affinity-generic spells in `src/data/spells/core.ts`", Ember
   Lance, Cinder Nova, Venom Bolt). The kickoff names `#thorn-lash`, `#stinger-swarm` and
   `#core-spells` for the design agent; Thorn Volley's entry is under **Content changes**. Line 214–
   220 (`#spell-power-convention`) still says "the core spells included" and an area spell
   "would deal about 50%", which Thorn Volley now makes literal.
4. **Poison's only deterministic application is gone** (Venom Bolt's fight). Poison is now applied
   only by `MYCONET_ROTCORE_TRAIT`'s on-death trait, reached only in generated fights. Corpus entries with a Poison application go 53 → 22 (Part B 11 → 2, Part C 2 → 0;
   `evidence/corpus-attribution.md`), small enough to name here; the coverage test still fails loudly if that ever
   drops, so no fight was added. The design agent decides whether the count is small enough to
   want a dedicated fight.
5. **Silence and Pacify seeds are invisible to the digest** (above): if the convention in
   `CONVENTIONS.md#corpus-digest` ("every other coverage fight keeps its seed") should be
   test-enforced, nothing enforces it for fights that draw no random number.
6. **The phase brief's `#spell-clean-up-and-thorn-volley`** and `phases/4.5/E/brief.md` say "Cinder
   Nova becomes Thorn Volley"; the data spell is a new `THORN_VOLLEY` const and the corpus fight is
   the same slot. No change needed unless the wording is meant literally.

## Content changes

- **Thorn Volley (new):** id `thorn-volley`, Violence, `aoe`, enemy side, `unlockedAtBiome: 1`, one
  `deal-damage` on `cast-target` with `offStat: 'cast'` and `spellPower: 0.45` (damage-only AOE,
  inside the ~50% band, below single-target Thorn Lash's 1.0). First in `ALL_SPELLS`, first in
  `OVERGROWTH_SPELLS`. Hand-derived hits in `golden-thorn-volley`: at Intelligence 100, 38 / 30 / 20
  against Defence 15 (Wit, ×1.25) / 5 (Vitality, ×0.75) / 25 (Endurance, ×1).
- **Ember Lance deleted** (Violence, single, 0.5), **Venom Bolt deleted** (Instinct, single, 0.4 +
  Poison 3), **Cinder Nova deleted** (Violence, AOE, 0.3): `data/spells/core.ts` is gone.
- **Roll consequence:** the Violence pool at biome 1 drops from five spells to four, the Instinct
  pool keeps exactly three (Howling Instinct, Pounce, Stinger Swarm), so rolled sets for Violence
  and Instinct creatures change (435 of 500 Part A/B fights have such a creature; 152 change). The
  player's Brute starter rolls from the same Violence pool. The Mauler's floor-10 set is now
  `weakening-bite`, `thorn-lash`, `silence`.
- **Poison** is applied only by the Myconet Rotcore trait (no spell). Its `defaultDuration` of 3 is
  the one that trait gets.
- **`OVERGROWTH_SPELLS`** lists Silence and Pacify as well.

## To delete

`src/data/spells/core.ts`: **done by Duncan at the checkpoint** (confirmed, `git status` shows it
deleted). Nothing else.

Scratch only, outside the repo: the `before` and `after` trees, the dump and mutation scripts.
`dist/` is build output of `npm run build` (ignored by git).
