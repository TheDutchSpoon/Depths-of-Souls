# Record — Phase 4.2 — Slice H3: Names

**Status: built.** Golden policy: one deliberate kind, fixture data ids. 35 golden fixtures carry a renamed id into their expected events and
export the same values as `main`'s once the id map is applied to `main`'s side; the other golden fixtures export values deep-equal to `main`'s as
they are. The corpus digest fixture is byte-unchanged and `npm run corpus:update` was not run. Test count under `src/` is 1358 (1357 passed,
1 skipped): `main`'s 1357 file by file, under the rename map, plus the corpus fixture test. Under `scripts/` it is 493 (`main`: 325), all in the new
checks.

## What was built

- **Names stripped of their provenance.** Every name in `src/` that carried a slice id now says what the thing pins or is for:
  - **127 files**: 63 golden fixture/test pairs (60 with a digit, the three `golden-e-…` pairs) and `engine/generation-g1.test.ts`
    (now `generation-floor-loadouts.test.ts`), moved with a plain `mv`. The families that comments cite by glob got a mechanism prefix,
    so each glob still means something: `golden-status-snapshot-*`, `golden-status-timing-*`, `golden-wick-*`,
    `golden-damage-observed-*`, `golden-revive-cap-*`, `golden-grant-*`. `golden-e-*` has no single mechanism, so its one mention
    lists the new names.
  - **Four identifiers**: `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` → `TEST_BALANCE_CONFIG` (11 tokens in 9 files; the seven `as CFG` aliases
    keep `CFG`), `B5_FIXTURE` → `FIZZLE_ATTACK_FIXTURE`, `B5_CAST_FIXTURE` → `FIZZLE_CAST_FIXTURE`, and `F3_SPELL_FIGHTS` →
    `LOCK_SPELL_FIGHTS` (a fourth slice identifier the kickoff did not list; it holds the Silence and Pacify fights).
  - **95 fixture data ids and names** (103 entries; `h2a-cast-slot-0` and `h2a-wait` are in two fixtures and got two names each) in 47 files:
    44 golden fixtures, `engine/resolution.test.ts`, `engine/status-snapshot.test.ts` and `engine/combat.test.ts` (`'random-target-b3-fixture'`,
    with the id in the middle; also not in the kickoff). Each is a mechanism tag plus what the item is for, never the old id with its prefix
    deleted, so none collides: `'b6-always-wait'` is `'provoke-stun-always-wait'`, not the shared `'always-wait'`.
  - **The pair that pins the same refusal** stays as two goldens named by their lock source: `golden-granted-cast-refused-by-fixture-lock`
    (a trait-borne lock) and `golden-granted-cast-refused-by-silenced-status` (the real Silenced status from the real Silence spell).
  - **Every comment that named an old thing** follows (34 lines in 27 files), read against the code each describes.
- **The name guard**, folded into `comments` (`scripts/docs-check/names.ts`; patterns 18-20; one CI step, `ci.test.ts` unchanged). It fails on a
  slice or phase id in a `src/` file name of any extension and in an identifier (`PHASE_4_X`, `phase4Thing`, `placeholderPhase4Config`), and in a
  string, template or regex literal; `--counts` prints a row per arm. A literal that is not a module specifier or a test title is also read with
  `comments`' patterns 1-9 (ASSUMPTION, phase number and id, slice id and name, PR number, review words, plan-item id, range and rule), so
  "before Phase 8" or "ASSUMPTION 22" in an error message or a report label fails, and so does `ASSUMPTION:` (a value cannot cite an open question); patterns 10-17 are not run there ("a brief stun" is English). The text between JSX tags is read the same way as a value literal. A
  title gets the two hyphen shapes of a slice id only, because `comments` already runs every pattern over it, and is never reported twice.
  A hit is reported under pattern 20, with the matched pattern in the message. The slice letters are `A`-`I`: that is how `B5_FIXTURE` is flagged
  and the derivation handle `S1_SCRIPT` is not. A test title may open with a derivation label (`'E1 ticks first'`). Module specifiers are left to
  the file arm.
- **The missed shapes**: `Slice-B`, `pre-Slice`, `B-2`, a bare suffixed `H2b2` (pattern 8 widens to `\b[A-I]\d[a-z]\d?\b`), `design-review` and
  `(nit, review)`; `--quotations` also reads a quotation that ends within four words before its anchor (the nearer anchor owns a quote, the earlier one on
  a tie).
- **`comment-proof --renames <file>`** (`renames.ts`, `tokens.ts`): the proof of this slice's renames. A listed file pair is one file, the
  importers' specifiers for it and each listed identifier or literal are one token on both sides, and the rest of the code must be equal.
  A new name that already exists on the base, an entry that matches more, fewer or other occurrences than it lists, an unlisted rename, an unused
  entry and a non-injective id map all fail. Without the option a rename still fails as deleted and added.
- **The six strings** (`state/rewards.ts`, `state/balance-sim.ts` ×3, `engine/corpus-coverage.test.ts`, and the assertions that match them) say
  what is true now, not when; the rewards regex and the balance-sim assertion changed with them.
- **A default-run test** that the committed corpus fixture is exactly what `renderFixture` writes for its own rows (header, body template, rows and
  formatting). It fails on one flipped character of the committed header and of the template.
- **Residue**: `data/traits/starters.ts:18` rewrapped; `engine/__corpus__/corpus.ts` says what is true about why it sits outside `__golden__/`;
  `comments.ts`'s header says it runs in CI (so does `scripts/docs-check.ts`'s).

## The proof

`comment-proof origin/main --mask evidence/mask.json --renames evidence/renames.json` reports 151 files OK (127 of them renames) and one FAIL,
`engine/corpus-digest.test.ts`: the one real code change in `src/`, whose whole diff is in `evidence/corpus.txt`. Four checks that do not go
through the new code back it: the fixtures' exports compared with `main`'s under the id map, the per-file test counts under the rename map, every
golden passing, and the corpus fixture byte-equal.

## Decisions made while building

- **`--renames` compares code without its line wrapping and trailing commas.** A new name is a different width, and the formatter then wraps
  an import or call differently (19 of the renamed files). The TypeScript printer keeps the source's line breaks, so the proof compared them. Under
  `--renames` the printed code is re-tokenised and joined, so only the tokens count; the printer ends every statement with a semicolon, so no
  statement boundary is lost. Without the option the comparison is as before.
- **The corpus test reads the committed fixture with a `?raw` import**, not `readFileSync`: `node-shims.d.ts` declares only `writeFileSync`, so
  `readFileSync` would have been a second real code change in `src/` and a second FAIL.
- **Names the plan left to the build**: `generation-floor-loadouts` (the file covers all three of its `describe`s), `golden-cost-and-tick-exclusion`
  (as approved), `random-target-fixture`, `LOCK_SPELL_FIGHTS`.

## Evidence

`phases/4.2/H3/evidence/` (see `report-r1.md`): the rename map and its readable table, the mask, the proof's output, the fixtures compared with
`main`, the corpus, the planted faults, the counts, the collision and old-name scans, the test counts, the mutation check and the gates.
