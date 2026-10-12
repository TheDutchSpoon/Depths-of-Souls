# Plan — Phase 4.2 — Slice H3: Names

## Revision 1: what changed

Answers `plan-review.md` round 1 (fixes 1-9, nit 10, decisions D1-D3, all as recommended).

- **Fix 1**: `loadRenames` requires an injective id map (two different `old` to one `new` is exit 2, for `literals` and `identifiers`); the comparator uses exact whole-string replacement per fixture file. New rule 7, test row.
- **Fix 2**: the `main` baseline extracts `src` plus `vite.config.ts`, `tsconfig*.json`, `package.json`, `.prettierrc.json`; its total is checked against a run on `main` (step 2, A18).
- **Fix 3**: the literal arm skips test titles; table corrected; test row added.
- **Fix 4**: the file arm has its own `readdir` walk; non-TS plant test added.
- **Fix 5**: `h2b2` stems and tag become `status-snapshot-`; `h2b1-observed` becomes `damage-observed-` (the `damage-observation.test.ts:4` glob changes with it). Glob list updated.
- **Fix 6**: counts corrected (11 tokens, seven `as CFG` aliases).
- **Fix 7 / D3**: pattern 8 widens to `\b[A-I]\d[a-z]\d?\b`; plant row and 0-hit count added.
- **Fix 8**: function exports are compared by transformed source with both maps; one `setup` shown.
- **Fix 9**: the `node-shims.d.ts:3` `--quotations` false positive is expected and listed in `counts.txt`.
- **Nit 10**: the generation test is `generation-floor-loadouts`; `golden-cost-and-tick-exclusion` says whose cost after the header is read; `corpus.ts:7`'s dropped possessive is fixed with the `:8` residue.
- **D1**: the quotation blind spot is a quote ending within four words before its anchor (A11 unchanged). **D2**: the corpus test asserts the whole formatted render (A14 unchanged).

Reads: `CLAUDE.md`, `workflow/coding-rules.md`, the kickoff, `phases/4.2/H/brief.md`,
`CONVENTIONS.md` (the sections the kickoff lists), H1's and H2's records' tool sections, and the
code the kickoff names (`scripts/docs-check/*`, `deploy.yml`, `golden-runner.ts`,
`__fixtures__/`, `corpus-digest.test.ts`, every renamed golden's test titles). No spec file is
touched: no behaviour changes. `origin/main` is `590d82a` (checked at plan time; the build
re-checks before it starts and stops if it moved).

## What the survey found that the kickoff doesn't list

Each one is in scope by the kickoff's own rule ("a stripped id", "no string literal carries
provenance") and is marked as an assumption below.

1. **A fourth slice identifier**: `F3_SPELL_FIGHTS` (`engine/__corpus__/corpus.ts:325`, 2 uses).
   The name guard would fail on it. ASSUMPTION A5: renamed with the three listed. It is an
   identifier only, so the corpus digest is unaffected.
2. **A 47th file with a fixture data id**: `engine/combat.test.ts:191` has
   `'random-target-b3-fixture'`, with the slice id in the middle, not the start. ASSUMPTION A6:
   renamed with the rest.
3. **Two fixture creature names** carry a slice id: `'B5 (fixture)'` and `'B5 cast (fixture)'`
   (`golden-b5-fizzle-rule4-retarget.fixture.ts:45`, `golden-b5-cast-fizzle.fixture.ts:67`).
   ASSUMPTION A7: they join the fixture-data map (kind `literals`).
4. **Shared ids that bare-strip would collide on**, measured by a string-literal count on today's
   tree (files holding the literal): `'always-wait'` 127, `'always-provoke'` 8, `'attack-lowest'`
   2, `'wait'` 30, `'nova'` 3, `'splashing'` 10, `'shield-bash'` 2, `'watch'` 2, `'bolt'` 1,
   `'seeder'` 1, `'last-words'` 1, `'cast-slot-0'` 1, `'echo-fixture'` 4. So no new id is an old
   id with its prefix deleted: every id gets a mechanism tag (see "Naming").
5. **The quotation scan**: a short quote *after* an anchor is already listed today (checked with a
   planted case), so "of four words or fewer" can't be the after-anchor window. ASSUMPTION A11
   reads the blind spot as: a quote *before* its anchor, within the same four-word window.

## Order of work

Tool first, proof second, renames third (kickoff: "build and test the tool changes first").

1. **Tool** in `scripts/docs-check/`, test-first: new `comments` patterns, the name guard,
   the quotation scan, `comment-proof --renames`, the `--renames` plumbing in `cli.ts`. Mutation
   check each mechanism. Gates for `scripts/` green.
2. **Baselines on `main`** (scratch, outside the repo): `git archive 590d82a` of `src` plus every root file the runs read (`vite.config.ts`, `tsconfig*.json`, `package.json`, `.prettierrc.json`, which `corpus-digest.test.ts` resolves) extracted to the scratchpad with a junction to `node_modules`, so vitest runs with the same `projects` split as the branch. Sanity check: the copy's total test count equals a run on `main` itself (or CI's count for `590d82a`); per-file test counts from
   `vitest run --reporter=json`; the collision sets (every identifier, string literal and file
   stem on `main`'s `src/`).
3. **The maps**, by hand: `evidence/renames.json` (files, identifiers, literals) and
   `evidence/mask.json` (the six strings).
4. **The renames**: plain `mv` of the 127 files; a scratch script applies the maps to import
   specifiers, identifiers and literals (the rule, not the script, goes in the report);
   comment mentions by hand.
5. **The new checks** (corpus header test, six strings, residue).
6. **Evidence and gates.**

The proof never trusts step 1's tool alone: the four checks that don't go through it (fixture
exports deep-equal, per-file test counts, every golden passing, corpus fixture byte-equal) are
built in step 2 and re-run in step 6.

## Module changes, by file

### `scripts/docs-check/comments.ts`

- **Header**: "not wired into CI yet: it fails until the comment sweep has run" is replaced by
  what is true (it runs in CI's `test` job, `deploy.yml`). Pure comment.
- **Six missed shapes** (A12; the sixth is D3), added to existing patterns so ids 1–17 stay stable. Each has 0
  hits on today's tree (the widened pattern 8 included, re-measured at build) (grepped; `\bpre-[Ss]lice` and the rest returned nothing):

  | Pattern | Added regex | Plants |
  | --- | --- | --- |
  | 5 slice name | `/\b[Ss]lice-[A-Z]\d*[a-z]?\b/g` | `Slice-B`, `slice-C2` |
  | 5 slice name | `/\bpre-[Ss]lice\b/g` | `pre-Slice-B`, `pre-slice` |
  | 8 plan item id | `/\b[A-I]-\d\b/g` | `B-2` |
  | 8 plan item id (D3) | the existing `\b[A-I]\d[a-z]\b` becomes `\b[A-I]\d[a-z]\d?\b` | `H2b2`, `Slice-H2b2` |
  | 7 review round | `/\bdesign-review\b/g` | `design-review` |
  | 7 review round | `/\((?:[A-Za-z]+,\s*)?review\)/g` | `(nit, review)`, `Nit (review)` |

  The bare word "review" stays legal (`engine/effect-types.ts:269` "needs a review").
- **Name guard** (A1–A4), folded into `comments`: same walk, same CI step, `ci.test.ts`
  unchanged. New module `scripts/docs-check/names.ts` holds the three arms and is called from
  `findCommentProblems`. The file arm has its own walk: `commentFiles` collects `.ts`/`.tsx` only, so `names.ts` lists every path under `src/` (any extension) with `readdir`, plus the two configs; the identifier and literal arms use `commentFiles`. `CommentProblem.kind` gains `'file' | 'identifier' | 'literal'`;
  pattern ids 18–20. Output keeps the `file:line: what: "snippet"` form (a file-name problem
  is line 1).

  | Arm (id) | Looks at | Matches | Does not match (by design) |
  | --- | --- | --- | --- |
  | 18, file name | every path under `src/` (any extension) and the two configs; pieces from splitting on `/`, `-`, `.` | a piece `^[a-i]\d[a-z]?\d?$` (`g1`, `b5`, `h2b2`, `h2c`); the piece `e` right after `golden`; `phase` or `slice` followed by a digit piece | `1v1`, `6v6`, `t1`-style pieces outside a–i |
  | 19, identifier | every `ts.Identifier` token (declarations, uses, property names, import specifiers, types) | a `_`-segment `^[A-I]\d[a-z]?\d?$` in an identifier with more than one segment (`B5_FIXTURE`, `F3_SPELL_FIGHTS`); a leading camel `^[a-i]\d[a-z]?\d?(?=[A-Z])` (`b5Fixture`); a whole-word suffixed id `^[A-I]\d[a-z]\d?$` (`H2b2`, as pattern 8); `PHASE`/`Phase`/`phase` then `_`+digit or a digit (`PHASE_4_…`) | bare `A2`, `E0`–`E3`, `L1`, `P1`, `O1`, `R1`, `U1`, `T98`; `S1_SCRIPT`/`S2_SCRIPT` (S is not a slice letter) |
  | 20, literal | every string and no-substitution template literal except a module specifier and a test title (fix 3) | `^(?:[a-i]\d[a-z]?\d?\|e)-` (`'h2b2-reapply-p1'`, `'e-echo-fixture'`); `-[a-i]\d[a-z]?\d?-` interior (`'random-target-b3-fixture'`); `^[A-I]\d[a-z]?\d?\s` (`'B5 cast (fixture)'`) | `'a-player-0'`, `'perk-N'`, `'hp-percent'`, `'a2'`, `'e0'`, `'e'` (no hyphen after); **test titles** (the first argument of `describe`/`it`/`test`, which the scanner already knows), so a title opening with a derivation label (`'E1 ticks first'`) passes |

  - **Why the guard reads string literals** (kickoff asks): the 92 distinct fixture ids and the
    three names are the largest provenance left in `src/`, and without an arm they come straight
    back. The shapes are narrow on purpose (a slice-shaped segment *anchored at the start with a
    hyphen*, or hyphen-bounded inside), so the noise the kickoff names (`'a-player-0'`,
    `'hp-percent'`) has no match.
  - **Letters**: a–i / A–I are the slice letters (pattern 8 uses the same range). That is how
    `B5_` is flagged and `S1_` is not, with no shape heuristic. The cost: a future `E1_FOO`
    derivation handle would be flagged and need a different name. Stated, not fixed.
  - **False positives**: measured on today's tree before any rename, the file arm fires on
    exactly the 127 files and the literal arm on the 92 ids + 3 names; the build re-runs both
    on the renamed tree and records 0 in `evidence/counts.txt`. (Today's measured identifier
    hits are `B5_FIXTURE`, `B5_CAST_FIXTURE`, `PHASE_4_PLACEHOLDER_BALANCE_CONFIG`,
    `F3_SPELL_FIGHTS`.)
  - Expected `--quotations` false positive: `engine/__corpus__/node-shims.d.ts:3` (`"vite/client"`, a JSON value in a code span, just before `CONVENTIONS.md#test-environments`). Listed in `counts.txt` with its target lines; no code-span rule is added in this slice.
  - `--counts` prints three extra lines, one per arm (files / identifiers / literals), under
    the existing table.
- **`--quotations`** (A11, D1: there is no separate short-quote item; the blind spot is a quote that ends within four words before its anchor): `findQuotations` also attributes a quote that ends within four words
  *before* an anchor. Each quote has one owner: the nearer anchor within four words, the earlier
  anchor on a tie, so a quote between two anchors is not listed twice. The after-anchor path is
  unchanged. Planted short (≤4-word) quotes are tested in both positions.

### `scripts/docs-check/comment-proof.ts` — the `--renames` option (A8–A10)

`comment-proof <base> [--mask <file>] [--renames <file>]`. Default behaviour is unchanged:
without `--renames` a rename still fails as deleted + added (existing test at
`comment-proof.test.ts:259` stays and is the "option is strict by default" test).

`renames.json` (plain JSON; fields besides these are ignored, so `pins` can carry the
one-line description `names.md` prints):

```json
{
  "files":       [{ "old": "src/…/a.ts", "new": "src/…/b.ts", "imports": 3, "pins": "…" }],
  "identifiers": [{ "file": "src/…/b.ts", "old": "B5_FIXTURE", "new": "…", "count": 6 }],
  "literals":    [{ "file": "src/…/b.ts", "old": "h2b2-reapply-p1", "new": "…", "count": 2 }]
}
```

`file` in `identifiers`/`literals` is the *working-tree* path (same as the mask's `file`);
`count` defaults to 1; `imports` (default 0) is the number of module specifiers, across the
tree, that name the old file.

The rules, each a failure naming the file and exit 1:

1. **File pair.** `old` is in the base and not in the working tree; `new` is in the working
   tree and not in the base; same directory and extension; a code file in scope. Every path that
   is in the base only, or in the working tree only, must be a listed `old`/`new` (today's
   "deleted"/"added" for anything unlisted). **No two paths in the union of both trees differ
   only in case**, and `new` is not case-equal to any base path (Windows checkout).
2. **Specifiers.** In a changed file, an import/export/dynamic-import specifier that resolves
   (against the file's own directory) to a listed `old` stem is read as that entry's token in the
   base, and a specifier resolving to the `new` stem is read as the same token in the working
   tree; nothing else about a specifier may differ. The total hits per entry must equal its
   `imports` (a hit above or below fails, like a mask `count`). An old specifier left in the
   working tree is an unmasked difference and fails.
3. **Identifiers.** Every `ts.Identifier` token spelled `old` in the base file is read as one
   token, every one spelled `new` in the working-tree file as the same token. Counts must equal
   `count` on both sides; `new` must not occur as an identifier anywhere in the base `src/`
   (collision, A9). Aliased imports fall out: `import { OLD as CFG }` has `OLD` in the
   `propertyName` slot, `CFG` is a different identifier and stays; `import { NEW as CFG }` is
   then equal. Dropping the alias changes `CFG` uses, so it fails.
4. **Literals** (fixture data ids and names). Same as identifiers over string and template
   literals, exact cooked-text match, and `new` must occur as a literal nowhere in the base
   `src/`. This is the strict sibling of the mask (the mask allows a new text that already
   exists; the id map never does).
5. **Rest of the file.** After tokenising, both sides are printed with comments removed and
   compared byte for byte; pragma, syntax-error and duplicate-title checks run as today. A
   renamed file with identical text still passes only through its pair entry.
6. **Not consumed.** An entry whose file did not change, an `identifiers`/`literals` entry whose
   `old` count differs from `count`, a `files` entry failing rule 1, all fail ("not consumed" /
   "expects N, found M"), as the mask does.
7. **The id map is injective** (fix 1), checked in `loadRenames` (exit 2). Across the whole map, two `literals` entries with the same `new` must have the same `old`, and likewise `identifiers`. One `old` may map to one `new` in several files (`f3-bolt-fixture` is defined separately in four fixtures); two different olds to one new, in any files, may not.
8. **Mask composes.** `--mask` runs in the same pass over the same file (the six strings sit in
   files that are not renamed, `state/` and `engine/corpus-coverage.test.ts`; a renamed test
   file may also have titles masked).
- **Collision lookup** reads the base once: `git ls-tree` for the file list, `git grep -l -F`
  per new text over `<sha>` to find candidate files, then a parse of just those to confirm the
  hit is an identifier or literal (not a comment). So a new id that appears only in a comment on
  `main` is not a collision.
- **Mask: regex literals** (A10). `literalsOf` also reads `RegularExpressionLiteral` tokens
  (text including slashes and flags), so `rewards.test.ts`'s `/not materializable before Phase 8/`
  is masked as a regex, not rewritten into a string (that would be a code change).
- Output: every changed file as `OK <new path> (renamed from <old>; imports n; identifiers n;
  literals n; masked n)` plus the pairs, so `evidence/comment-proof.txt` shows all of them.

### `scripts/docs-check/cli.ts`

`--renames <file>` taken with `takeOption`, belonging to `comment-proof` only (same error shape
as `--mask`), passed to `runCommentProof`; `USAGE` line updated.

### `src/` (after the tool)

- **127 files renamed** (table below), `import` specifiers follow.
- **Identifiers**: `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` → `TEST_BALANCE_CONFIG` (11 identifier tokens in 9 files, 13 with the two comment mentions; the seven `as CFG` aliases, in `curves`, `generation`, `generation-g1`, `biomes`, `store`, `rewards` and `integration`, keep `CFG`); `B5_FIXTURE` → `FIZZLE_ATTACK_FIXTURE`;
  `B5_CAST_FIXTURE` → `FIZZLE_CAST_FIXTURE`; `F3_SPELL_FIGHTS` → `LOCK_SPELL_FIGHTS` (it holds
  Silence and Pacify). Final spellings are checked for collision by the tool.
- **Fixture data ids and names**: 92 distinct ids + 2 names + `random-target-b3-fixture`, in 47
  files, per "Naming".
- **Comment mentions** of every old name (~40 lines), by hand, reading the code each describes.
- **Six strings** (A13), each in `mask.json` with its test:

  | File | Before | After |
  | --- | --- | --- |
  | `state/rewards.ts:52` | `…fused instances are not materializable before Phase 8` | `staticCreatureIdFor: a fused instance has no static creature id` |
  | `state/rewards.test.ts:176` | `/not materializable before Phase 8/` | `/a fused instance has no static creature id/` |
  | `state/balance-sim.ts:1789` | `T4 walls' size (ASSUMPTION 108): …` | `T4 walls' size: …` |
  | `state/balance-sim.ts:1867` | `ASSUMPTION 22: floor-1 clear >= …` | `CI thresholds: floor-1 clear >= …` |
  | `state/balance-sim.ts:1877` | `ASSUMPTION 22 summary (reported, not asserted):` | `CI thresholds summary (reported, not asserted):` |
  | `state/balance-sim.test.ts:164` | `toContain('ASSUMPTION 22')` | two `toContain`s, one per new string, in the same `it` (count unchanged) |
  | `engine/corpus-coverage.test.ts:27` | `…the Phase-3 mechanism trait 'reeling'…` | `…the placeholder trait 'reeling'…` (`CONVENTIONS.md#mechanism-goldens-vs-content-goldens` calls the Phase-3 traits placeholders) |

  The existing assertion at `balance-sim.test.ts:1023` (`"T4 walls' size"`) still matches.
  The doc comment above `staticCreatureIdFor` already cites `spec/creatures.md#fusion`; the
  message says what is true (a fused instance has no static id), not when.
- **Corpus header test** (A14) in `engine/corpus-digest.test.ts`: `renderFixture`'s header moves
  into one `FIXTURE_HEADER` constant that `renderFixture` interpolates; the one new test
  formats `renderFixture(CORPUS_DIGEST)` with the repo's prettier config (as the update path
  does) and asserts it is byte-equal to the committed `corpus-digest.fixture.ts`, so the header,
  the body template and the rows can't drift apart. It sits next to the digest test and skips
  under `--mode corpus-update` (that run rewrites the file). The fixture is not edited.
- **Residue** (comment-only): `data/traits/starters.ts:18` rewrapped to ~100 columns;
  `engine/__corpus__/corpus.ts:7-8` (line 7 also has the dropped possessive in "per `CONVENTIONS.md#…` rule", fixed with it): "so `frozen-replay-sweep.test.ts`'s fixture glob doesn't pick
  it up" becomes what is true (no test globs `__golden__/`; the module is a corpus builder, not a
  `GoldenFixture` — `CONVENTIONS.md#every-golden-replays-through-one-shared-runner`); verified
  against the code before writing (A19).
- **Living docs untouched.** Stale line to report under Spec questions: `workflow/pr-review.md:77`
  (`golden-h2b1-wick-gates`). A grep of the living docs for every old stem, identifier and id
  at build time lists any other.

## Naming (A15, A16)

### Files (63 fixture/test pairs + `generation-g1.test.ts`)

New stems are what the golden pins, read from each test's `describe` title. Every family whose
glob a comment cites keeps a prefix its glob still matches. All lowercase; no two differ only in
case (the tool checks).

| Old stem (after `golden-`) | New stem (after `golden-`) |
| --- | --- |
| `b1-fallback-lowest-hp` | `fallback-attacks-lowest-hp` |
| `b1-granted-cast-default` | `granted-cast-default-lowest-hp` |
| `b1-support-heals-own-side` | `support-heals-own-lowest-hp-ally` |
| `b2-confused-granted-cast-redirects` | `granted-cast-confused-redirects` |
| `b2-provoke-redirects-echo` | `echo-provoke-redirects` |
| `b2-silenced-refuses-granted-cast` | `granted-cast-refused-by-fixture-lock` |
| `f3-silenced-refuses-granted-cast` | `granted-cast-refused-by-silenced-status` |
| `b2-skipped-turn-refuses-granted-cast` | `granted-cast-refused-on-skipped-turn` |
| `b4-cleanse-then-tick` / `b4-remove-then-reapply` | `exact-instance-cleanse-then-tick` / `exact-instance-remove-then-reapply` |
| `b5-cast-fizzle` / `b5-fizzle-rule4-retarget` | `fizzle-retarget-cast` / `fizzle-retarget-attack` |
| `b6-provoke-stun-cleanup` | `provoke-stun-cleanup` |
| `d3-revive-cap-exclusion` / `-fizzle` | `revive-cap-exclusion` / `revive-cap-fizzle` |
| `e-echo-chain-truncated` | `echo-chain-truncated` |
| `e-grant-actor-dies-first` / `e-grant-during-granted-action` | `grant-actor-dies-first` / `grant-during-granted-action` |
| `f2-dot-one-turn`, `-stun-one-turn`, `-turn-end-interaction`, `-turnstart-self-stun-once`, `-weaken-three-turns`, `-web-turn-end-roll`, `-win-over-own-tick` | `status-timing-` + the same tail |
| `f3-fight-start-wipe` | `fight-start-wipe` |
| `f3-immunity` | `lock-immunity` |
| `f3-pacify-three-turns` / `f3-silence-three-turns` | `pacify-three-turns` / `silence-three-turns` |
| `g1-leech-sovereign-pacified` | `leech-sovereign-pacified` |
| `h2a-additional-{granted,hp-bound,levels,second-instance,spell,splashing}` | `additional-` + the same tail |
| `h2a-cost` | `cost-and-tick-exclusion` (the build reads the header and says whose cost it is, e.g. `self-damage-cost-…`, if it is one) |
| `h2a-flat-indirect` / `h2a-indirect-keeps` / `h2a-indirect` | `indirect-flat-response` / `indirect-keeps-terms` / `indirect-trait-response` |
| `h2a-spell-on-caster` | `spell-on-caster-direct` |
| `h2b1-observed-{cost,lethal,silent,tick}` | `damage-observed-` + the same tail |
| `h2b1-wick-{burn-heal,gates,skips-self}` | `wick-` + the same tail |
| `h2b1-last-gleam` | `last-gleam` |
| `h2b2-{carrier-fresh,reapply,regen-potency,spore-spread,tick-dead-applier,tick-kill-on-death,tick-living-applier,tick-no-retaliation,tick-self-applied,tick-taken-factors,vulnerability-once}` | `status-snapshot-` + the same tail (the family spans `spec/statuses.md#no-stacking` and `#the-applier-snapshot`, as `status-snapshot.test.ts:1-2` says) |
| `h2c-snapback` | `snapjaw-snapback` |
| `h2d-dot-ticks` / `h2d-pollen-cloud` | `poison-burn-spore-ticks` / `pollen-cloud-sleep` |
| (`engine/`) `generation-g1.test.ts` | `generation-floor-loadouts.test.ts` (covers all three `describe`s, including full distinct gem sets; the build re-reads them and may pick a closer name) |

- **The collision pair** (trap 1): `granted-cast-refused-by-fixture-lock` (a trait-borne lock in
  the fixture) and `granted-cast-refused-by-silenced-status` (the real `Silenced` status from
  the real Silence spell), read from both headers. They pin the same refusal; both stay, and the
  report says so. If another pair turns out to pin the same thing it is reported, not merged.
- **Globs** (trap 2), the six: `golden-h2b2-*` → `golden-status-snapshot-*`;
  `golden-h2b1-wick-*` → `golden-wick-*`; `golden-h2b1-observed-*` → `golden-damage-observed-*` (this also changes the glob at `damage-observation.test.ts:4`, and avoids the unrelated `golden-action-observed`);
  `golden-f2-*` → `golden-status-timing-*`; `golden-d3-revive-cap-*` →
  `golden-revive-cap-*` (still matches nothing it shouldn't: `golden-revive` has no `-cap-`);
  `golden-e-*` has no single mechanism (echo, grant), so its one mention
  (`perform-action.test.ts:3`) is rewritten to list `golden-echo-chain-truncated` and
  `golden-grant-*`. The build greps every comment glob afterwards and shows each still matches
  at least one file and only intended ones.
- Existing stems these must not equal are checked by the tool (e.g. `golden-leech-sovereign`,
  `golden-provoke-redirect`, `golden-splashing`, `golden-spore-spread` exist and differ).

### Identifiers and fixture data ids

- **Rule.** New id = *mechanism tag* + `-` + a hand-chosen remainder that says what the item is
  for. The tag is the family above; per-file where a prefix spans families (`b2`, `h2a`, `h2b1`):

  | Old prefix | Tag(s) |
  | --- | --- |
  | `b2-` | `granted-confused`, `fixture-lock`, `granted-skipped`, `echo-provoke` (by file) |
  | `b4-` | `exact-instance` (incl. `resolution.test.ts`, whose `b4-tick-fixture` maps to the same new id) |
  | `b5-` | `fizzle-cast`, `fizzle-attack` |
  | `b6-` | `provoke-stun` (`b6-always-wait` → `provoke-stun-always-wait`, never `always-wait`) |
  | `d3-` | `revive-cap` |
  | `e-` | `echo-chain`, `grant-queue` (`e-t1-defend-fixture` keeps its T1 derivation label in the remainder) |
  | `f2-` | `status-timing` |
  | `f3-` | `lock-timing` |
  | `h2a-` | `additional`, `indirect`, `cost` (by file) |
  | `h2b1-` | `damage-observed`, `wick` (by file) |
  | `h2b2-` | `status-snapshot` (also used by `status-snapshot.test.ts`'s `h2b2-seeder`) |

  One id used in several files keeps one new id; the map is per `(file, old)` so a file can
  differ if its fixture is separate, and the table in `names.md` shows each.
- **The shared-script trap**, in the plan's own words: `'always-wait'` and `'always-provoke'`
  are in `FIXTURE_SCRIPTS_BY_ID` and fixtures merge that map. Four proofs, none through the new
  code: (1) `comment-proof --renames` refuses a new text that exists anywhere on `main`'s `src/`
  as a literal or identifier; (2) an independent scratch scan over the extracted `main` tree
  lists the new ids/identifiers/stems and finds each absent from `main`; (3) every golden still
  passes; (4) the fixtures compare below.
- Display names: `'B5 (fixture)'` → `'fizzle attack (fixture)'`, `'B5 cast (fixture)'` →
  `'fizzle cast (fixture)'`. `random-target-b3-fixture` → `random-target-fixture`, if absent
  from `main` (checked), else tagged.
- **Out of scope as the kickoff says**: real content ids, positional ids (`'a-player-0'`,
  `perk-N`), derivation labels (`E1`, `S1_SCRIPT`, `P1`, `O1`, `T98`, `T1`–`T5`).

## Golden policy (restated)

- **One deliberate kind**: fixture data ids. A golden whose fixture renames a trait/status id
  changes in those strings (`effectId`, `statusId`) and nothing else. The compare script lists
  every such golden and proves its exports deep-equal to `main`'s with the id map applied to
  `main`'s side.
- Every other golden: exports deep-equal to `main`'s as they are, paired by the rename map.
- Corpus digest fixture byte-unchanged; `npm run corpus:update` is not run. The corpus is real
  content and the renamed identifiers (`F3_SPELL_FIGHTS`) don't reach it; shown by `git diff
  --stat` on the fixture, a byte compare with `main`'s, and the digest test passing against it.
- No golden added or removed; fixture comments may change
  (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`).
- Only one test is added under `src/` (the corpus header test); every other test file keeps its
  count under the rename map. `scripts/` grows by the new checks' tests only.

## Mechanism → the test that fails with it removed

All scripts tests use made-up ids (`D7_THING`, `golden-h9z-x`), never a real old name, so the
"no old name left" grep over `scripts/` has no planted string to list (if one slips in it is
listed).

| Mechanism | Site | Test (in `scripts/docs-check/` unless noted) that fails without it |
| --- | --- | --- |
| `Slice-B` hyphen shape | pattern 5 | `comments.test.ts`: a planted `Slice-B` is reported as pattern 5 |
| `pre-Slice` shape | pattern 5 | planted `pre-Slice-B` reported |
| `B-2` plan item | pattern 8 | planted `B-2` reported; prose `A-1`-free control passes |
| `design-review` | pattern 7 | planted `design-review` reported |
| `(nit, review)` / `Nit (review)` | pattern 7 | both plants reported; bare "needs a review" not |
| Name guard: file arm | `names.ts`, called from `comments` | planted `golden-d7-x.test.ts` fails with exit 1 naming the file; `golden-1v1.test.ts`, `stable-name.ts` pass |
| Name guard: identifier arm | `names.ts` | planted `D7_THING`, `d7Thing`, `H2b2`, `PHASE_4_X` each reported; `A2`, `E1`, `T98`, `S1_SCRIPT` pass |
| Name guard: literal arm | `names.ts` | planted `'d7-thing'`, `'x-d7-y'`, `'D7 thing'` each reported; a test title `'E1 ticks first'` passes (fix 3); `'a-player-0'`, `'hp-percent'`, `'a2'`, a module specifier `'./golden-d7-x'` (the file arm owns it) pass |
| File arm reaches non-TS files | `names.ts` own walk | planted `src/ui/d7-thing.css` fails naming the file (fix 4) |
| Guard reaches both configs | `commentFiles` | planted identifier in `vite.config.ts` reported |
| Guard in CI | `deploy.yml` | `ci.test.ts` unchanged: guard rides the existing `comments` step. **Site check**: a test running `main()` (cli) on a planted tree exits 1 |
| `--counts` rows | `runCounts` | `comments.test.ts`: the three name rows are printed with the planted counts |
| Quotation before anchor | `findQuotations` | planted `"words not in target"` placed before a cited anchor listed; one present in the target not listed; between two anchors listed once |
| Quotation ≤4 words | `findQuotations` | planted 2-word and 4-word quotes, before and after an anchor, listed (the after case already passes today; the before case fails without the mechanism) |
| Rename pair accepted | `runCommentProof` | file renamed + listed → exit 0 and prints the pair; without `--renames` the same tree fails deleted+added (existing test) |
| Unlisted rename | rule 1 | one of two renames listed → FAIL naming the unlisted file |
| Unused entry | rule 6 | listed pair whose old file is still in the working tree; a `files` entry for an unrelated path; an identifier entry with `count` too high; a literal entry whose file didn't change → each FAIL |
| Specifier rewrite | rule 2 | importer of a renamed fixture changes only its specifier → passes with `imports: 1`; with `imports: 0` or 2 → FAIL; an importer that keeps the old specifier → FAIL; a specifier to an unlisted new name → FAIL |
| Widened pattern 8 | pattern 8 | planted `H2b2` and `Slice-H2b2` reported; a bare `A2` not |
| Planted code change in a renamed file | rule 5 | `finalDamage: 12` → `13` in the renamed file → FAIL naming the file |
| Identifier renamed outside the map | rule 3 | a second identifier renamed → FAIL; a listed one with extra occurrences renamed (count mismatch) → FAIL |
| Aliased import | rule 3 | `import { OLD as CFG }` → `import { NEW as CFG }` passes; alias dropped → FAIL |
| Identifier collision | rule 3 | `new` already an identifier in the base (same file; another file) → FAIL |
| Id changed outside the map | rule 4 | an unlisted literal changed → FAIL |
| Literal collision | rule 4 | `new` already a literal in the base → FAIL; `new` only in a comment on the base → passes |
| Case-only collision | rule 1 | `Golden-X.ts` vs `golden-x.ts` → FAIL |
| Regex literal in the mask | `literalsOf` | masked regex passes; an unlisted regex change → FAIL |
| Injective map | `loadRenames` | two literal entries (same or different files) with different `old` and the same `new` exit 2; two identifier entries likewise; one `old` to one `new` in two files passes |
| Renames usage errors | `loadRenames` | not an array/object, missing field, `old === new`, chain, bad `imports` → exit 2; cli: `--renames` with a non-`comment-proof` mode → exit 2 |
| Renames pragma/titles | rule 5 | a pragma moved in a renamed file → FAIL (pragmas still checked) |
| Corpus header test | `engine/corpus-digest.test.ts` | with one character of the committed header flipped it fails; with one character of the template flipped it fails (both shown in `evidence/corpus.txt`); restored it passes |
| Six strings | `rewards.test.ts`, `balance-sim.test.ts` | each assertion fails with the old string put back (shown in the report) |
| Renamed ids/imports/identifiers | all `src/` | `tsc -b`, vitest and the compare script fail on any import not following a rename; the compare script catching a planted `finalDamage` change is shown (`evidence/fixtures-compare.txt`) |

**`mutation-check.txt`** (H1's bar): each new mechanism in `scripts/` removed in turn with the
failing test named, at every site above (both quotation positions, all three guard arms, each
`--renames` rule).

## The proof

- `evidence/renames.json`, `evidence/mask.json`, `evidence/names.md` (table: file, identifier
  and id rows, with the one line each pins).
- `evidence/comment-proof.txt`: `npm run docs:check -- comment-proof origin/main --mask
  evidence/mask.json --renames evidence/renames.json`, every changed file printed.
- `evidence/planted-faults.txt`: the five kickoff faults (code change in a renamed file, unlisted
  rename, unused entry, identifier renamed outside the map, id changed outside the map), each
  exit 1 naming the file; plus a planted slice id in a file name and in an identifier, and one
  instance of each new shape for `comments`; and `--quotations` on a planted before-anchor and
  a planted short quote. Plants go in a scratch copy, never `src/`.
- `evidence/counts.txt`: pattern counts before/after; the guard's false positives on the
  renamed tree (0); `--quotations` after-list (empty, or false positives with target lines).
- `evidence/fixtures-compare.txt`: a scratch script (not kept) loads every golden fixture and
  `__fixtures__` module of `main` (extracted copy) and of the branch with Vite's SSR loader
  (two servers, one per root), deep-compares exports (objects, arrays, `Map`/`Set` entries,
  primitives); `main`'s side gets the id map applied to strings and keys, and a function export
  (`setup`; 18 renamed fixtures export one) is compared by its Vite-transformed source (esbuild drops comments, so fixture comment edits don't show) with the id map and the identifier map applied, and one `setup` comparison is shown in the output (A17). Replacement is exact whole-string, using only the entries whose `file` is the fixture being compared, never a substring replace (fix 1). Lists the goldens
  whose expected values changed by id; plants a `finalDamage` change and shows it caught.
- `evidence/corpus.txt`: fixture byte-equal to `main`'s (`git diff --exit-code`, plus a hash);
  the header test failing on a one-character drift and passing restored; the digest test green.
- `evidence/test-counts.txt`: per file, `main` vs branch through the rename map (A18), the one
  new test noted.
- `evidence/mutation-check.txt`, `evidence/gates.txt`.
- **No old name left**: `grep -F` for every old stem, identifier and id over `src/`, `vite.config.ts`,
  `eslint.config.js`, `scripts/`, `.github/`; empty. Any planted use is listed.
- **No collisions**: the independent scan (new ids/names/stems absent from `main` as literal,
  stem or identifier; no two new paths differ only in case).

## Gates

`npm run test`, `lint`, `format:check`, `build`, `npx tsc -b`, `docs:check -- citations`,
`-- budgets`, `-- comments` (new patterns and guard included), then `evidence/gates.txt`. No
`git add`, `git mv`, commit or deletion. **To delete**: none expected; the rename uses `mv`, and
the `rename map` goes in the report. Any scratch checkout lives outside the repo.

## Assumptions checklist

- [ ] **A1** The name guard is folded into `comments` (pattern ids 18–20, module `names.ts`), not
  a sibling mode; `ci.test.ts` and `deploy.yml` unchanged.
- [ ] **A2** File-name arm: pieces `^[a-i]\d[a-z]?\d?$`, `e` after `golden`, `phase`/`slice` +
  digit; applies to every file under `src/` and the two configs.
- [ ] **A3** Identifier arm: `[A-I]\d…` as a `_` segment of a multi-segment identifier, camel
  prefix `[a-i]\d…`, suffixed whole-word ids, `PHASE`+digit. Bare `A2`/`E1`/`T98` and
  `S1_SCRIPT` unflagged; a future `E1_x` would be flagged.
- [ ] **A4** The guard also reads string literals, narrowly (anchored `^id-`, hyphen-bounded
  interior, `^B5 ` names), module specifiers excluded; 0 false positives expected on the renamed
  tree, measured.
- [ ] **A5** `F3_SPELL_FIGHTS` (not in the kickoff) → `LOCK_SPELL_FIGHTS`.
- [ ] **A6** `combat.test.ts:191` (`'random-target-b3-fixture'`) is renamed (a 47th file).
- [ ] **A7** `'B5 (fixture)'` and `'B5 cast (fixture)'` are renamed as fixture data.
- [ ] **A8** `renames.json` shape: `{ files, identifiers, literals }`, `imports` and `count`
  counted strictly, extra `pins` field ignored by the tool; `file` in the last two is the
  working-tree path.
- [ ] **A9** Collision is checked by the tool against all of `main`'s `src/` (identifier,
  literal; file stems and case against both trees); a hit only in a comment is not a collision.
- [ ] **A10** The mask learns regex literals so `rewards.test.ts` stays a regex.
- [ ] **A11** "A quotation before its anchor and one of four words or fewer": a quote ending
  within four words before an anchor is listed (nearest anchor owns it); short quotes tested in
  both positions. If a different blind spot was meant, the reviewer says which.
- [ ] **A12** The five new regexes in the table above; bare "review" stays legal.
- [ ] **A13** The six strings' new text, as tabled (`CI thresholds` label for the ASSUMPTION
  22/108 strings; "placeholder trait" for the Phase-3 string).
- [ ] **A14** The corpus header test asserts the whole formatted render equals the committed
  file (header, body template and rows), not the header alone.
- [ ] **A15** The 63 new file stems and `generation-floor-loadouts`, as tabled; the
  `b2`/`f3` Silenced pair keeps both, named by lock source.
- [ ] **A16** Id scheme: mechanism tag + remainder, per-`(file, old)`; the tag table above;
  `TEST_BALANCE_CONFIG`, `FIZZLE_ATTACK_FIXTURE`, `FIZZLE_CAST_FIXTURE`.
- [ ] **A17** The fixtures comparator loads both trees with Vite's SSR loader and compares
  function exports by transformed source under the id and identifier maps, exact whole-string replacement per fixture file.
- [ ] **A18** `main`'s per-file test counts come from `vitest run --reporter=json` on an
  extracted copy of `590d82a` (`src` plus `vite.config.ts`, `tsconfig*.json`, `package.json`, `.prettierrc.json`) in the scratchpad, `node_modules` junctioned in; the total is sanity-checked against a run on `main`.
- [ ] **A19** Residue wording is written against the code at build time (`corpus.ts:8`,
  `starters.ts:18`, `comments.ts` header); no `src/` behaviour is read from the old comment.
- [ ] **A20** `golden-e-*` has no single mechanism; its one citation lists the new names. The
  other five globs get mechanism prefixes.
- [ ] **A21** Test files in `scripts/` plant made-up ids only, so the "old name left" grep has
  nothing to list.
- [ ] **A22** Evidence scripts (compare, collision scan, test counts, id-map apply) stay in the
  scratchpad; the report quotes each one's rule and keeps its printed output.
- [ ] **A23** (revision 1) Beyond the first plan: pattern 8 widens to `[A-I]d[a-z]d?` (D3); `loadRenames` enforces an injective id map and the literal arm skips test titles (fixes 1, 3); `generation-floor-loadouts` and any `self-damage-cost-…` name are the agent's call, subject to the build re-reading the headers.
