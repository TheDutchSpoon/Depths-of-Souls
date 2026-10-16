# Report r2 — 4.5-G3: The demo, adjustments, trait and perk text

Round 1's hand-out, two fixes. Nothing committed, nothing deleted. `record.md` needs no change: it
describes neither the trait lookup's test nor the three Resonant strings.

## 1. The trait lookup's fixture case

**Changed:** `src/data/descriptions.test.ts`, the case "throws on an unknown id and on a fixture
trait’s id". It now imports `BRUTISH` from `src/engine/__fixtures__/traits.ts` and asserts
`traitDescription(BRUTISH.id)` throws `no stock trait brutish`. The `'no-such-trait'` assertion
stays; the dangling `'fixture-trait'` one is gone. The title is unchanged.

**Check (scratch copy of `src/` outside the repo, `node_modules` junctioned):** in the copy,
`STOCK_TRAITS_BY_ID` was built from `STOCK_TRAITS` plus the fixture `BRUTISH` (given a description).

| Lookup map | New case (`BRUTISH.id`) | Old case (`'fixture-trait'`) |
| --- | --- | --- |
| widened with the fixture trait | **fails**: "expected [Function] to throw an error" (1 failed, 8 passed) | passed (9 of 9) |
| restored to `STOCK_TRAITS` | passes (9 of 9) | passes |

So the new assertion pins that a real `Trait` outside the stock list is refused; the old one could not.

## 2. The Resonants’ descriptions

**Changed:** `src/data/traits/glimmerdark.ts`. `resonant-chorus-harmonize`, `resonant-adept-resonate`
and `resonant-overtone-crescendo` now open "Whenever an ally, itself included, casts a spell,". The
rest of each sentence is unchanged, including the Overtone’s "An echo is observed like any cast".
(`git diff -U0` shows exactly these three strings, plus the Chorus’s string moving onto its own line for
Prettier.)

`evidence/transcription.md`, rows 42-44: the description column holds the new text; the dropped column
says the section sentence is folded in as "itself included".

No test pins these strings. The data tests (non-blank, no Markdown, no phase id) pass over them. The
strip comparison was not rerun: only the three `description` strings changed in `src/data`, and the
effects are untouched in the diff above, so the round 1 result (every stock trait and perk equals `main`’s
with `description` removed) stands.

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 257 files, 2235 passed, 1 skipped (2236) |
| `npm run lint` | clean |
| `npm run format:check` | clean (`npx prettier --write` ran over the two edited source files first) |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 700 citations in 526 files |
| `npm run docs:check -- comments` | PASS, 7633 comments and 1996 titles in 492 files |

`npm run e2e` was not rerun: `e2e/` and the UI are untouched this round.

**Test count against `main`:** unchanged from round 1, 2210 → 2236. `descriptions.test.ts` is still 9. No
other file’s count changed.

**Golden policy:** `git diff --stat origin/main -- src/engine src/state e2e` is empty (0 lines). Goldens,
the corpus digest and every existing test pass unchanged; the digest was not regenerated. `src/data`
changed only inside this slice’s own `description` strings and test.

## Mechanism and its test

The only mechanism touched is the lookup’s refusal of non-stock traits: `descriptions.test.ts`, the case
above, fails with the lookup widened to fixtures (shown in item 1).

## Spec questions

None new. Round 1’s remain (the G1 section of `phases/4.5/brief.md` around lines 426 and 563).

## Content changes

Player-facing text only: the three Resonant descriptions now say "itself included", matching
`content/glimmerdark.md#resonants-wit-caster-synergy` and the code’s `relationship: 'ally'`. No id,
number or effect moved.

## To delete

Nothing. (The scratch copy lives in the session scratchpad, outside the repo.)
