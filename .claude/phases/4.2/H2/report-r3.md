# Report — Phase 4.2 — Slice H2: Code comments, the sweep — Round 3

Fixes for `handout-r2.md`, on branch `4.2-h2` at `4695336` plus the working tree; the proof's base stays `origin/main` (0126c4a). Every
change is a comment. Nothing is committed and nothing is deleted. No living doc and nothing under `scripts/` changed; no test title changed, so
`evidence/mask.json` is unchanged.

## Gates

`evidence/gates.txt` (Node 24.19.0, npm 11.12.1), all run again after the edits:

| Gate | Result |
| --- | --- |
| `npm run test` | 210 files, 1,682 tests (1,681 passed, 1 skipped) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 640 citations in 436 files |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | PASS, 7,003 comments and 1,627 titles in 403 files; `--quotations` 0 and 0 |
| `comment-proof origin/main --mask evidence/mask.json` | PASS, 347 changed files (346 in round 2: `rng.ts` and `rng.test.ts` now differ from `main`; `evidence/comment-proof.txt` refreshed) |

- **Test count:** 210 files, 1,682 tests, the same totals as round 2; no test was added, removed or retitled, and the 11 files touched this round
  are comment-only, so no file's count can move.
- **Fixtures:** the three fixtures edited this round (`golden-conditional-damage-bonus`, `golden-sorcerer-starter`,
  `golden-b6-provoke-stun-cleanup`) are changed only in comment lines, which `comment-proof` (code tokens identical to `main`'s, all 347 files)
  proves. I did **not** re-run the scratch-clone import comparison of `evidence/fixtures-compare.txt` this round (it needs a clone of the tree); its
  round-2 result (123 EQUAL) stands for the other 120 fixtures, which this round does not touch.
- **Corpus digest:** unchanged; `npm run corpus:update` was not run.
- **Mechanisms:** none added or removed.

## The hand-out, item by item

1. **Plan-item ids.** `rng.ts:48` drops "(B-2)"; `rng.test.ts:64` reads "// Exactly one implementation …"; `effect-types.ts:337` drops "B-9 --"
   and keeps "perks are stat-modifier carriers too". A scan for a hyphenated `[A-Z]-<n>` in a comment finds none left (`evidence/bare-ids.md`, round 3).
2. **Review and history words.** `generation.test.ts:180` is now "// `ref` is spread only when defined …". `combat.ts:269` says the executors
   live in `actions.ts` and `combat.ts` only orchestrates the turn skeleton; I also rejoined the paragraph's short wrapped tail. Rows added to
   `evidence/history-markers.md`.
3. **A creature that doesn't exist.** `golden-conditional-damage-bonus.fixture.ts:1-2` and `conditions.test.ts:323` now name the Sporch Ashborn
   (checked against `data/traits/rotcap-hollow.ts`: `SPORCH_ASHBORN_TRAIT`, `conditional-damage-bonus`, `has-status burn` on the target). The
   `conditions.test.ts` parenthesis lost its quote marks.
4. **The Sorcerer starter's description.** Checked against `specializations/sorcerer.md#starter-glyphmoth-seer` and the trait in
   `starters.ts` (a `perform-action` cast at `on-turn-end` plus an `innate-spell { spell: ARCANE_BOLT }` effect). `starters.ts:11` and the golden's
   line 4 state the cast plainly ("a 50% chance at the end of its turn to cast a random equipped spell"), without quote marks. `starters.ts:16-17`
   now says the innate spell is an `innate-spell` effect on the trait rather than a fixed `equippedSpells` loadout, so it travels through fusion.
   The rest of the paragraph (not a gem, fight-setup prepends it) is untouched. Rows added to `evidence/quotations.txt`.
5. **Rewrap leftovers.** `resolution.ts` tick block rewrapped (the formula span now sits whole on its own line, 108 columns, the other lines at
   100 or less). `store.ts` `{ ok: false, reason }` and the b6 fixture's `action-lock { scope: 'all' }` are each on one line.
   **Backtick count:** the comment lines that differ from `main`'s and hold an odd number of backticks: **11**
   (the splits named above are gone). Each of the 11 continues a span that `main` already wrapped across lines in the same place, so each stays:
   `specializations.ts:3`, `statuses.ts:245`, `glimmerdark.ts:213` and `:214`, `__fixtures__/balance.ts:23` and `:24`, `combat.test.ts:181` and
   `:182`, `effect-types.ts:210`, `:666` and `:1055`. None was split by this branch.

## Spec questions

None new.

## Content changes

None. Comments only.

## To delete

None.
