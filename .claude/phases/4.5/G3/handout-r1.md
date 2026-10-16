# Hand-out, round 1 — 4.5-G3: The demo, adjustments, trait and perk text

Branch `4.5-g3`, reviewed at `ea42fa1`. Make the two fixes below on that branch, then write
`report-r2.md` in `.claude/phases/4.5/G3/`. Standing rules: `.claude/workflow/coding-rules.md`.

The golden policy is unchanged:

- goldens, the corpus digest, every existing engine, store and data test and `e2e/smoke.spec.ts`
  stay byte-identical (`git diff --stat origin/main -- src/engine src/state e2e` stays empty);
- `src/data` changes additively only. Item 2 edits three `description` strings, which are this
  slice's own additions.

Nothing else in the build changes.

## 1. The trait lookup's fixture case uses an id that is not a fixture trait

File: `src/data/descriptions.test.ts`, the case "throws on an unknown id and on a fixture trait's
id" under `traitDescription`.

The problem:

- It asserts `traitDescription('fixture-trait')` throws, but no trait has the id `fixture-trait`.
  The id appears only as a dangling entry in `innateTraitIds` in `src/engine/__fixtures__/biomes.ts`.
- So the assertion is a second unknown id, the same as `'no-such-trait'`.
- What it must pin is that a real `Trait` outside the stock list is refused. A lookup built over a
  wider registry (stock plus fixtures) must fail this case, and today it would pass.

The fix:

- Import a fixture trait from `src/engine/__fixtures__/traits.ts`, for example `BRUTISH`. Data
  tests already import fixtures (`src/data/traits/index.test.ts` does).
- Assert `traitDescription(BRUTISH.id)` throws `no stock trait brutish`.
- Keep the `'no-such-trait'` assertion and drop the `'fixture-trait'` one. The case keeps its
  title, and the file's test count stays 9.

The check in the report: in a scratch copy, build `traitDescription`'s map from `STOCK_TRAITS`
plus the fixture traits. Show this case failing, and show it passing with the map restored.

## 2. The Resonants' descriptions lose "itself included"

Files: `src/data/traits/glimmerdark.ts`, the `description` of three traits:

- `resonant-chorus-harmonize`
- `resonant-adept-resonate`
- `resonant-overtone-crescendo`

The problem:

- Each description opens "Whenever an ally casts a spell". To a player, "an ally" reads as another
  creature.
- The code observes `relationship: 'ally'`, which includes the creature itself
  (`spec/effects.md#action-reactions-actor-self-hooks-or-observation`).
- The content doc says so in its section sentence
  (`content/glimmerdark.md#resonants-wit-caster-synergy`: "All three react whenever a living ally,
  themselves included, casts a spell"), which the transcription dropped because it isn't in the
  entries.
- Every other trait whose doc entry includes the creature itself keeps it in the shipped text:
  Flickerling Flare's "It counts itself as an ally", the Swarmhive Striker's and Queen's "itself
  included", the Blindclaws Setter's "(itself included)".

The fix:

- Each of the three descriptions opens "Whenever an ally, itself included, casts a spell," and
  the rest of each sentence is unchanged.
- The Overtone's text later says "An echo is observed like any cast". Leave it as it is.
- Update the three rows of `evidence/transcription.md`. The description column becomes the new
  text. The dropped column no longer lists "the section sentence"; it says the sentence is folded
  in as "itself included".

No test pins these three strings, so no test changes. The data tests (non-blank, no Markdown, no
phase id) still cover them.

## Report r2

- Each item: what changed, with the check that shows it (item 1's scratch run).
- The gates from `coding-rules.md`, and the test count per changed file against `main`. Expect no
  count change from round 1: 2236 tests, `descriptions.test.ts` still 9.
- The empty `git diff --stat origin/main -- src/engine src/state e2e`.
- The strip comparison rerun: every stock trait and perk, with `description` removed, equals
  `main`'s, as round 1 showed.
