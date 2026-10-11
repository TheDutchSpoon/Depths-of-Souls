# Report r1 — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

Built to `plan.md` as amended by `plan-review.md` (plan fixes 1–12 and decisions D1–D3). All gates
green. Nothing committed, nothing deleted. Evidence is in `evidence/` (listed at the end).

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 207 files, 1477 tests: 1476 passed, 1 skipped (`evidence/gates.txt`) |
| `npm run lint` | clean |
| `npm run format:check` | clean (Prettier re-wrapped four `*.test.ts` files whose retitled `it(...)` line got shorter) |
| `npm run build` | passes |
| `npx tsc -b` | passes (it type-checks `scripts/`, tests included) |
| `npm run docs:check -- citations` | `PASS, 532 citations in 436 files` |
| `npm run docs:check -- budgets` | 12 files, 0 over budget; exit 0 |

Toolchain: Node 24.19.0, TypeScript 6.0.3 (lockfile `~6.0.2`), `npm ci` state as on `main`.

**Test count, reconciled file by file against `main`** (`evidence/test-counts.txt`): `main` 1357 tests
in 201 files; branch 1477 in 207. Files under `src/` whose count differs: **0**; added or removed: 0.
The +120 are all in 6 new files under `scripts/docs-check/` (a third Vitest project, A2):
`anchors` 5, `budgets` 9, `ci` 2, `citations` 59, `cli` 18, `inventory` 27. The two existing projects
and their `include` lists are untouched; the +6 files / +120 tests are the only change to the totals.

## Golden policy: byte-identical

- **Expected values compared by importing, not by reading diffs** (`evidence/fixtures-compare.txt`):
  the 30 changed fixture modules (27 `__golden__` fixtures, `__corpus__/corpus-digest.fixture.ts`,
  `__corpus__/corpus.ts`, `__fixtures__/biomes.ts`) were each imported from a `git archive` of `main`
  and from the branch in a scratch Vitest config, and every export deep-compared (functions by
  comment-free source). 30 of 30 equal.
- **Corpus digest: unchanged.** `npm run corpus:update` was not run; `corpus-digest.test.ts` passes
  against the committed fixture inside the 1476. The fixture's header comment changed (comment-only
  golden edit). Plan-review fix 2: the header `renderFixture` writes equals the committed fixture
  header byte for byte (`evidence/corpus-header-proof.txt`), so the next regeneration makes no diff.
- Every golden still replays through the shared runner; no test added or removed under `src/`; 10 test
  titles changed (`evidence/retitled-tests.md`).

## The `src/` diff is comments and test titles only (`evidence/comment-proof.txt`)

88 changed files (87 under `src/`, plus `eslint.config.js` per plan-review fix 8). For each file, at
`main` and on the branch: the first argument of every `describe`/`it`/`test` call is masked (290
strings in these files, equal counts on both sides) and so is the corpus-digest template literal
(D1); then the TypeScript printer with `removeComments: true` prints both, and the bytes are
compared. **88 of 88 identical.** A changed pragma comment (`@ts-…`, `eslint-…`, `/// <`) fails
too. Both failure modes were shown on a scratch version of `engine/rng.ts` (same file, planted):
a code change (`code differs`, first differing printed line shown) and an added `// @ts-ignore`
(`pragma differs`); each exits 1.

## What changed, and how it was checked

### The checks (`scripts/docs-check.ts` is now a 28-line entry; the logic is `scripts/docs-check/*.ts`)

- **`citations`** (blocking in CI, working tree only, no git). Scans `src/**/*.{ts,tsx}` and
  `.claude/**/*.md` outside `phases/`, `archive/`. Fails on (a) a `<path>.md#<anchor>` that doesn't
  resolve (missing file, missing anchor, a `..` segment), (b) an old form (`CONVENTIONS "…"`,
  `GAME_DESIGN §…`; in `src/` also any bare `GAME_DESIGN`, `species-locked`, or `CONVENTIONS` not
  followed by `.md#`, per plan-review fix 4), (c) a label form (`` `path.md` "L" ``, `` `path.md`
  ("L", …) `` per fix 5, and `<NAME> "L"` for the six top-level docs). In `src/` the gap between a name
  and its label may hold a line break and one comment leader (`//` or `*`, fix 3). A bare mention
  of a deleted doc in `.claude/` prose is allowed (`ROADMAP.md:57`, `SKILL.md:20`). Output
  `<path>:<line>: <what>`, exit 1 on any problem.
- **`resolveAnchors`** now follows GitHub's loop (trap 1): headings `a, a, a-1` give `a, a-1,
  a-1-1`. No living-doc heading has the other two gaps (indented, `_emphasis_`/entity); both stay
  listed in its doc comment.
- **`budgets`** (reported, never fails, no git). Reads `workflow/budgets.md`; prints size, budget,
  % and `ok`/`OVER`/`MISSING`/`no budget` for all 12 files. Size is UTF-8 bytes with `\r` removed.
- **`inventory-skeleton <mailbox> <file>… [--base <rev>]` and `inventory <mailbox>`**, generalized
  (A11). Base defaults to `HEAD`, is resolved to a 40-hex sha and written into `inventory.md`
  (`Base:`, `Files:`); the check reads the units at that sha. No pinned commit, no map, no
  `git merge-base`, no local `main`. The unit definition, the five fates and the row checks are
  unchanged. `move`, `line-proof` and every helper only they used are gone (`tsc -b` clean under
  `noUnusedLocals`). Every mode takes `--root <dir>` (A3); exit 0 pass, 1 problems or tool error, 2
  bad usage.
- **CI** (`evidence/deploy-yml.diff`): `npm run docs:check -- citations` and `-- budgets` in the
  `test` job, after `format:check`, before `npm run test`. `ci.test.ts` reads the real file.

### The rewrite (one-off scripts in the session scratchpad, not committed — A16)

Rules, quoted: **src/** — the span is the old name (a `.claude/species/` prefix, `.md`, a
possessive and a surrounding backtick pair included); then for `CONVENTIONS` a directly following
`"Label"` with no colon, for `GAME_DESIGN` a following `§N`; a quotation after a colon, or after
`species-locked`, stays. The span becomes the anchor, in backticks in a comment, bare in a title,
backticks escaped in the template. Comments, titles and the one template are found with the
TypeScript AST; any token anywhere else would stop the script (none). The script refused to write
unless every one of the 243 tokens had a mapping that resolves in today's tree. **Docs** — a
label (`` `path` "L" `` and chains/paren lists, bare `NAME "L"`) is matched to a heading in the
named file by its text (case-insensitive, markup stripped), exactly one heading, or a unique prefix
(A15); the text around the citation is untouched.

- **`src/`: 243 tokens → 0** old forms (`evidence/old-forms-before-after.txt`): 232 comments, 10
  titles, 1 string (D1). Counts match the plan's. Mapping table: `evidence/mapping-src.md`
  (file:line, replaced text, anchor, source). **31** answered by an inventory row used as-is
  (cross-checked: the script re-derived label → unit → row for each and all 31 agreed with the
  Appendix), **206** hand-mapped as approved, **6** overrides (plan-review fix 1: four rows to the
  `###` rule; `config.ts:2` to `#fight-length`; D3). The only `##` target left is
  `OPEN_QUESTIONS.md#balance-numbers`, which the review accepted.
- **`.claude/` (outside `phases/`, `archive/`): 235 labels in 215 forms → 0**; 232 matched by exact
  heading text and 3 by unique prefix (the three the plan named). Table: `evidence/mapping-docs.md`.
  Before/after, from the new check run on `main` and on the branch: 214 backticked-path labels, 4
  `NAME "…"`, 3 `CONVENTIONS "…"`, 1 `GAME_DESIGN §…`, 2 paren lists → 0. (`main` still has the
  `CLAUDE.md` "During the transition" note the kickoff removed; the after count is the branch's.)
- **D2 (decided: convert):** 44 same-file label references converted to the full
  `<path>.md#<anchor>` form (listed under their own heading in `mapping-docs.md`). One candidate was
  left alone: `content/enemy-behaviour.md:32` `"Cast a random gem"` names the selector in running
  text, not the rule, though a heading shares the name. Quotes that match no single heading stay.
- **The docs diff is citations only** (word-diff of `git diff HEAD -- .claude`: every removed chunk is
  a path, a quoted label or a name; every added chunk is a `path#anchor`). The step files
  (`coding-rules`, `condense`, `design-rules`, `plan-review`) and `skills/slice-verify/SKILL.md` carry
  citation conversions only; the briefs, `workflow/budgets.md` and `workflow/pr-review.md` are untouched.
- **Hand-edits after the script**, all in `mapping-src.md`/`mapping-docs.md`: 15 `src/` comments where a
  wrapped label's tail sat in the *next* `//` comment (the span cannot cross two comment ranges; two of
  them also had a doubled anchor), the `golden-brute-starter` pair, `eslint.config.js:28`, and `ROADMAP.md:115`
  (two more statuses.md headings after a parenthetical).

### Stale `src/` comments: 22 rewritten whole, plus the Splashing comment (`evidence/stale-comments.md`)

Each is file:line, old claim, new comment, and the code fact it was checked against. Every brief
fact held; none differed. Plan-review fix 6 applied: the listed range is rewritten to `CONVENTIONS.md`
"Comment why, not what" (why, no provenance, cite don't restate), not just the wrong sentence. The
Splashing comment (`engine/effect-types.ts:756`, A14/fix 7) now says Splashing uses `actions.ts`'s
private `adjacentLivingTargets` and cites `ROADMAP.md#phase-45--run-loop-demo-interlude` for the
dedupe; no code and no `targeting.test.ts` change. The brief's line list against the Appendix
(plan-review fix 9) is the last table in `mapping-src.md`: `actions.ts` header and `:346` have no
old citation (their nearest rows are `:334`/`:383`), `:373-376` → `:383`, `:397` → `:390`,
`combat.ts:366` → `:367`, `types.ts:33` → `:34`.

## Mechanism → the test that fails with it removed

All in `scripts/docs-check/`, run by the `docs-check` Vitest project. Each rule was removed (or
broken) once in the source, the project re-run and the file restored: **21 of 21 mutations fail at
least one test** (`evidence/mutation-check.txt`). The citations tests run at **both** scan sites
(`describe.each` over `src/` and `.claude/`), so a mutation that hits one site fails that site's test.

| Mechanism | Sites | Test that fails without it (examples) |
| --- | --- | --- |
| GitHub slug dedupe | `anchors.ts` (citation check and inventory New home both call it) | `anchors`: `a,a,a-1` → `a,a-1,a-1-1`, `a-1,a,a` → `a-1,a,a-2`; `citations` at both sites: `#a-1-1` resolves, `#a-2` fails; `inventory`: New home `#a-1-1` passes |
| (a) unresolved anchor / file / `..` | src, `.claude` | `citations` heading missing, file missing, wrong case, `..`; a `phases/` target resolves |
| (b) old forms; src-only bare names | src, `.claude` | each of 6 shapes fails at both sites; `names a deleted doc … in src/ only` |
| (c) label forms (backticked, comma, paren list, bare NAME, wrapped) | src (with `//` and ` * ` leaders), `.claude` | each fails at both sites; prose, `content/x.md: "q"` and `("Label")` pass |
| scope: `phases/`, `archive/`, extensions | scan | `where it looks` |
| no git in `citations`/`budgets` | both | `cli.test`: the real entry, `PATH` empty, no `.git`, exit 0 for both |
| `budgets` never fails; `\r`; bytes; MISSING; no table; no budget | `budgets.ts` | `budgets.test` (9) |
| inventory base sha in the file | skeleton, check | commit the condense, check still passes; set `Base:` to the new commit, check fails |
| default `HEAD`, `--base`, no `main` | skeleton | repo on branch `trunk` only; `--base` older; unknown rev throws |
| unit definition, row checks | `unitsOf`, `runInventory` | ported cases (missing, duplicate, fate, New home ×4, Reason, label, cells, foreign unit) |
| `move`, `line-proof` removed; `--root` | `cli.ts` | `cli.test`: usage, exit 2, no "Phase 4.2"; the same tree from another cwd |
| CI runs both modes | `deploy.yml` | `ci.test` |
| comment-only rewrite | the proof | planted code change and planted pragma, both fail |

## The PR must prove (against the kickoff's list)

- Comment-and-title-only diff, 10 retitled tests: above; `evidence/comment-proof.txt`,
  `evidence/retitled-tests.md`.
- Mapping tables: `evidence/mapping-src.md`, `evidence/mapping-docs.md`.
- `citations` passes and every failure mode fails: `evidence/planted-faults.txt` — the real entry on
  scratch copies of the tree: slug collision (`#a-1-1` passes, `#a-2` fails), unresolved anchor,
  missing file, `..`, `CONVENTIONS "…"`, `GAME_DESIGN §…`, bare deleted-doc names (src only), the four
  label forms and a wrapped one; each non-pass exits 1 with `file:line`.
- CI runs both: `evidence/deploy-yml.diff`. `budgets` prints all 12 and exits 0 on a planted
  over-budget file: `evidence/budgets.txt` (`spec/store.md` at 14.8 KB of 4: `OVER`, `exit code: 0`).
- None left: `evidence/old-forms-before-after.txt` (after = 0 in both trees).
- The generalized inventory: `evidence/inventory-demo.txt` — scratch clone with no `main`; drop a
  bullet from `spec/store.md`; skeleton (Base = HEAD); every row but one → `FAIL … unit
  spec/store.md:9 … is missing (1)`, exit 1; fill it → PASS; commit the condense in the clone →
  PASS again (Base is read from the file). The re-run of `inventory C`, `D`, `E` before I touched the
  script passed at base `3fd6a8f` (`evidence/inventory-CDE-before.txt`); `B` and `F` cannot be re-run.
- Stale comments: `evidence/stale-comments.md`.
- `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases`: only
  `workflow/coding-rules.md`, `WORKFLOWS.md`, `workflow/condense.md` and
  `skills/slice-verify/SKILL.md` (`evidence/phase-4.2-only-grep.txt`).
- To delete: none.

## Assumptions as built

A1–A5, A8–A13, A15–A18, A20, A21 stand as planned. Changes and details:

| # | As built |
| --- | --- |
| A6 | Per review: in `src/` a bare `CONVENTIONS` (not followed by `.md#`), `GAME_DESIGN` or `species-locked` fails; in `.claude/` a bare mention of a deleted doc passes. |
| A7 | Per review: `` `path.md` ("L" `` is detected too. An unbackticked `content/x.md: "quote"` passes. |
| A9 | Refined: a possessive after the name is part of the span (`CONVENTIONS' "Boss floors"` → one anchor); `CONVENTIONS: "…"`, a `GAME_DESIGN` quotation and every `species-locked` quotation are kept as written (they quote content, not a heading); `§N's` keeps its `'s`. |
| A14, A19 | Per review fixes 7 and 6. |
| A18 | Done by import (30 of 30); no fallback needed. |
| (new) | `scripts/docs-check/test-utils.ts` is a helper, not a test; tests import `describe/it/expect` from `vitest` (review fix 10). |

**Plan slip found at build:** D1's template token is on `engine/corpus-digest.test.ts:54`, not `:52`
(the Appendix row was re-keyed; same anchor, `CONVENTIONS.md#corpus-digest`).

## Spec questions (the design agent's text; I did not touch it)

1. `CLAUDE.md` "How the spec is written": add the two one-liners (citations checked in CI by
   `docs:check -- citations`; each spec file has a budget in `workflow/budgets.md`, reported by
   `docs:check -- budgets`), and point `workflow/pr-review.md`'s over-budget rule at them.
2. **Text made stale by this slice:** `workflow/condense.md:13-23` (`move`, `line-proof`,
   `inventory-skeleton <slice>`, `inventory <slice>` are now `inventory-skeleton <mailbox> <file>…
   [--base <rev>]` / `inventory <mailbox>`; plan-review caution A11: the default base `HEAD` is the
   pre-condense text only while the condense is uncommitted, so say to run the skeleton before
   committing or pass `--base`); `skills/slice-verify/SKILL.md:14` (`inventory <slice>`);
   `phases/4.2/brief.md` "Checks" (history, immutable). `CONVENTIONS.md#test-environments` lists two
   Vitest projects and `#every-pull-request-runs-the-gates` lists lint, format and tests; there is now
   a third project (`scripts/**`, Node) and two more CI steps (`citations`, `budgets`).
3. **21 `~` rows: no heading states the fact the comment cites** (closest home used; the plan-review
   D3 row came off the list). A rule may have been lost between slices: `data/spells/core.ts:27`
   (`#spell-power-convention`), `engine/balance-types.ts:66` (`spec/creatures.md#souls`, the summon
   cost), `golden-heal-scaling-count.fixture.ts:8` ("duplicate/dead slots" never get a turn →
   `#turn-queue`), `data/spells/index.test.ts:129` ("determinism is sacred" for append-only spell
   registry order → `CONVENTIONS.md#combat-is-reproducible-from-its-inputs`),
   `data/traits/glimmerdark.ts:440` (`scalingStat` → `#flat-mode`), `engine/actions.ts:666`
   (Confusion → `#targeting-override`), `engine/resolution-types.ts:97` (old "B2 rule 2" →
   `#perform-action`), `golden-defend-count-additive-cap.fixture.ts:11` ("keep fixtures small" →
   `CONVENTIONS.md#golden-replay-tests`), `golden-dot.fixture.ts:15,171` (`currentHp` initialised at
   fight start → `#fight-setup`), `golden-shieldbarer-starter.fixture.ts:9` ("precedent for goldens
   whose target never dies" → `CONVENTIONS.md#golden-replay-tests`),
   `golden-spore-spread.fixture.ts:21` and `golden-sporecloud-reaper-no-spore.fixture.ts:14` (on-attack
   hooks fire before the attack's own damage → `#hook-execution`), `state/integration.test.ts:397,399`
   (the per-fight loss risk and "first non-win" → `#fights-per-floor`, `#a-descent-is-atomic`),
   `data/species/overgrowth.ts:7,19` and `rotcap-hollow.ts:8,14` (roles, the "Coverage" note,
   affinities → the biome docs' role/reading sections), `data/species/starters.ts:19,22` (starter
   stubs → `spec/progression.md#starter-species-are-stubs`).
4. Quotations the rewrite kept because they quote content, not a heading (4.2-H decides whether they
   stay): `"adds: spiderlings"`, `"twice at 100%"`, `"Puppet"`, `"Reclaim"`, `"Attrition-…"`,
   `"Count-scales off …"`, `"Confusion consumes combat RNG"`, `"attacker uses stat-remap …"`,
   `"Starter …"`, and the `CONVENTIONS: "…"` / `GAME_DESIGN: "…"` quotations.
5. `ROADMAP.md:57` and `skills/slice-verify/SKILL.md:20` still name the deleted docs (allowed by
   the check, listed per the kickoff). No prose example of a now-forbidden form exists in `workflow/`
   or `skills/`.

## Content changes

None. No content behaviour changed; the 22 stale-comment fixes correct comments to what the code
already does.

## To delete

None. (Scratch work stayed in the session scratchpad, outside the repo.)

## Evidence (`phases/4.2/G/evidence/`)

`gates.txt`, `test-counts.txt`, `fixtures-compare.txt`, `corpus-header-proof.txt`, `comment-proof.txt`,
`retitled-tests.md`, `mapping-src.md`, `mapping-docs.md`, `stale-comments.md`,
`old-forms-before-after.txt`, `planted-faults.txt`, `mutation-check.txt`, `budgets.txt`,
`deploy-yml.diff`, `inventory-demo.txt`, `inventory-CDE-before.txt`, `phase-4.2-only-grep.txt`.
