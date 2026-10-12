# Plan review — Phase 4.2 — Slice H3: Names

## Round 1

Reviewed `plan.md` against `kickoff.md`, `phases/4.2/H/brief.md` (`## Split`, `## Decided, not built`,
`## Known from 4.2-H2's review`), `CONVENTIONS.md` and the code on `4.2-h3` (= `origin/main` `590d82a` plus the
kickoff and plan commits). The plan's survey numbers were re-measured with an independent TypeScript-AST scan
of today's tree, using the plan's own arm regexes: the file arm hits exactly 127 paths (126 goldens plus
`engine/generation-g1.test.ts`), the identifier arm exactly the four identifiers, the literal arm 95 distinct
literals in 47 files. All five new `comments` regexes, and `\b[A-I]-\d\b`, have 0 hits under `src/` and the two
configs.

### Verdict

**Changes needed.** The design is sound and the proof follows the kickoff. Three things would make the proof
wrong or its baselines meaningless (fixes 1–3); the rest are naming and accuracy.

### Plan fixes

1. **The id map must be injective, and the tool must check that.** Rule 4 refuses a `new` that already exists
   on `main`, but nothing refuses two different `old` ids mapping to one `new`. Inside one fixture that merges
   two traits or statuses into one registry key. The comparator then applies the same map to `main`'s side,
   so both olds become the same new there too and the deep-equal passes. A golden whose behaviour happens to
   match passes as well. This is the swap trap from the kickoff, by another route. Add to `loadRenames`:
   two `literals` entries with the same `new` must have the same `old`, across the whole map (one old may still
   map to one new in several files: `f3-bolt-fixture` is defined separately in four fixtures). The same goes
   for `identifiers`. Exit 2, with a test and a mutation-check row. The comparator applies **exact whole-string**
   replacement, using the entries whose `file` is the fixture being compared, never a substring replace.
2. **The `main` baseline needs the project config.** `git archive 590d82a src` extracts no `vite.config.ts`,
   so vitest on that copy runs without the `projects` split (jsdom for `src/ui`/`src/app`, `globals: true`).
   The per-file counts would then come from a different run than the branch's, and a file that fails to load
   reports 0 tests. The Vite SSR loader for the fixtures compare has the same problem. Extract `src` plus every
   root file the runs read: `vite.config.ts`, `tsconfig*.json`, `package.json`, `.prettierrc.json`
   (`corpus-digest.test.ts` resolves it). Sanity-check the baseline: `main`'s total test count from the copy
   must equal the count CI reported for `590d82a`, or the count from a run on `main` itself.
3. **The literal arm's third shape contradicts the table.** `^[A-I]\d[a-z]?\d?\s` matches "E1 ticks at its own
   turn end", which the table lists under "does not match". Test titles are string literals, so a future title
   that opens with a derivation label (`E1`, `P1`, `O1`, kept on purpose) would fail CI. No literal hits it
   today, so this is a design bug, not a measured false positive. **Fix: the literal arm skips test titles**
   (the scanner already knows them, and `comments`' patterns already check titles), and the table is corrected.
   The shape then only sees names and messages, which is what it is for. Add a test: a title
   `'E1 ticks first'` passes, a literal `'D7 thing'` fails.
4. **The file arm needs its own walk.** `commentFiles` collects `.ts`/`.tsx` only, so "every path under `src/`
   (any extension)" is not "the same walk". Say so, and add a test that plants a non-TS file
   (`src/ui/d7-thing.css`) and sees it fail. Today's tree has 0 non-TS hits; the test proves the arm reaches them.
5. **Two family prefixes say less than the goldens pin.**
   - `h2b2` is not one mechanism. `reapply` and `vulnerability-once` pin `spec/statuses.md#no-stacking`;
     the rest pin `spec/statuses.md#the-applier-snapshot`. `golden-applier-snapshot-vulnerability-once` names a
     rule the golden doesn't test. The comment that cites the glob, `engine/status-snapshot.test.ts:1-2`, already
     says the family covers "the two status rules -- single instance and the applier snapshot". Use
     **`status-snapshot-`** for the stems and the id tag: it matches that unit-test file, just as `status-timing-`
     matches `status-timing.test.ts` for `f2`.
   - `observed-` sits next to the existing `golden-action-observed` (action observation, a different hook), and
     `golden-observed-lethal` doesn't say which. All four describe damage observation (their unit test is
     `damage-observation.test.ts`). Use **`damage-observed-`**, and change the `damage-observation.test.ts:4` glob
     with it.
6. **Counts in the text.** `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` has 11 identifier tokens in 9 files (13 with the
   two comment mentions), and **seven** `as CFG` aliases, not six (`curves`, `generation`, `generation-g1`,
   `biomes`, `store`, `rewards`, `integration`). The tool checks the map counts, so only the plan text is wrong.
7. **"As pattern 8" is false.** Pattern 8 is `\b[A-I]\d[a-z]\b`, so it misses `H2b2` (no word boundary after
   the `b`). The identifier arm's suffixed-id shape is right; drop "as pattern 8", or see D3.
8. **The function-export compare.** Say that it compares the transformed source (Vite's esbuild transform drops
   comments, so fixture comment edits don't show), with the identifier map applied as well as the id map, and
   show one `setup` compared in `fixtures-compare.txt`. 18 renamed fixtures export a `setup`.
9. **An expected `--quotations` hit.** The before-anchor arm will list
   `engine/__corpus__/node-shims.d.ts:3`: `"vite/client"`, a JSON value inside a code span, just before
   `CONVENTIONS.md#test-environments`. It is a false positive: list it in `counts.txt` with its target lines,
   as the kickoff allows. Don't add a code-span rule for it in this slice.
10. **Nit, the agent's call:** `generation-cast-role-and-boss-fill.test.ts` leaves out the file's first
    `describe` (full distinct gem sets). A name that covers all three (`generate-floor-loadouts…`, or similar)
    reads better. `golden-cost-and-tick-exclusion` could say whose cost it is (`self-damage-cost-…`). Optional:
    `corpus.ts:7`, in the same block as the `:8` residue, has the dropped-possessive form ("per
    `CONVENTIONS.md#…` rule"). Fix it while there; it is comment-only.

### Assumptions

- **A1** confirm. One walk for the comment checks, one CI step, `ci.test.ts` unchanged (the kickoff's preference).
- **A2** confirm, plus fix 4. Measured: 127 hits, all in the rename table; `1v1`/`6v6` don't match.
- **A3** confirm, plus fix 7. Measured: exactly the four identifiers. The stated cost (a future `E1_X` is
  flagged) is acceptable: the `_`-segment is the shape `B5_` copies.
- **A4** correct: fix 3.
- **A5** confirm. `F3_SPELL_FIGHTS` (`corpus.ts:325`, 2 uses) has to go, or the guard fails. `LOCK_` uses the
  spec's own word (`spec/statuses.md#action-locks`).
- **A6, A7** confirm. Both are in scope by the kickoff's rule, and the scan finds exactly these three beyond the
  92 ids.
- **A8** confirm, plus fix 1.
- **A9** confirm, plus fix 1. Collision checked by kind against `main` by the tool, and across kinds (literal,
  identifier, stem) by the independent scan: that is the kickoff's "as a string literal, file name or identifier".
- **A10** confirm. `rewards.test.ts:177` is a `RegularExpressionLiteral`, and `literalsOf` reads none today.
- **A11** confirm the reading, then **D1**. Both real cases from 4.2-H2's review sit *before* their anchor:
  `traits/overgrowth.ts:269` ("a big retaliate") and `traits/glimmerdark.ts:121` ("+% while acting before its
  target", six words). Short quotes after an anchor are already checked: the scan has no minimum length. The
  one-owner rule (nearest anchor, earlier on a tie) is right.
- **A12** confirm. All five have 0 hits (re-run). The 4.2-H2 report's `B-2`/`B-9` leftovers are gone on `main`.
- **A13** confirm, all six:
  - "a fused instance has no static creature id" holds by design. `spec/creatures.md#fusion` derives a fused
    instance on load from both parents, so it is not a static creature. It is not a forward pointer.
  - "CI thresholds" is `CONVENTIONS.md#balance-simulator`'s own term ("CI checks only loose 'badly broken'
    thresholds").
  - "placeholder trait" matches the `**Known bug:**` line in `CONVENTIONS.md#mechanism-goldens-vs-content-goldens`.
  - `balance-sim.test.ts:1023` still matches "T4 walls' size".
- **A14** decide-point: **D2**.
- **A15** correct: fix 5, nit 10. The `b2`/`f3` pair is named right (checked against both headers). No new stem
  equals an existing one or differs from another only in case. No existing stem matches the new globs
  (`golden-wick-*`, `golden-status-timing-*`, `golden-revive-cap-*`, `golden-grant-*`).
- **A16** correct: fix 5 (the `status-snapshot` and `damage-observed` tags), fix 1. `TEST_BALANCE_CONFIG` is
  fine; it pairs with `DEFAULT_BALANCE_CONFIG`.
- **A17** correct: fixes 1 and 8.
- **A18** correct: fix 2.
- **A19** confirm. `corpus.ts:8` is stale: no test globs `__golden__/` (`frozen-replay-sweep` was deleted).
- **A20** confirm.
- **A21, A22** confirm.

### Golden policy

Matches the kickoff: one deliberate kind (fixture data ids), fixtures deep-equal under the id map, the corpus
byte-unchanged, one test added under `src/`, and test counts per file under the rename map. Fix 2 is what makes
that last comparison trustworthy.

### Mechanism → test

Complete for the plan as written, with all three guard arms, both quotation positions and each `--renames`
rule. Add rows for fix 1 (two olds → one new: exit 2), fix 3 (a title opening with `E1` passes) and fix 4 (a
non-TS file fails).

### Decide-points

**D1 — Correct the brief's wording for the quotation blind spot?** `phases/4.2/H/brief.md#decided-not-built`
says `--quotations` should also catch "a quotation placed before its anchor and one of four words or fewer".
The second half isn't a blind spot. The scan has no minimum quote length, and both real misses were
before-anchor. At this slice's PR review that item moves into `CONVENTIONS.md`, so the wrong half would become
a rule. The plan reads it the right way (A11), but it is changing a brief item, not confirming it, so I'm
bringing it back (`WORKFLOWS.md#the-humans-judgment-call-these-dont-remove`). **Recommend:** rewrite the item
in place as "`--quotations` also catches a quotation that ends within four words before its anchor". I'd edit
the brief once you say so.

**D2 — The corpus check: header only, or the whole render?** The brief asks for a default-run check that the
committed fixture's *header* is `renderFixture`'s. The plan (A14) asserts the whole formatted render of the
committed rows equals the committed file: header, body template and formatting. The PR review would then
write the stronger rule into `CONVENTIONS.md#corpus-digest`: "the committed fixture is exactly
`renderFixture`'s output for its own rows". **Recommend yes.** It costs the same (prettier is already imported
there, and `eol=lf` rules out Windows line endings). It closes the gap between template and file that a
header-only check leaves open, and a prettier upgrade already forces a `format:check` fix to the same file.
If no: the test compares only the text before `export interface`.

**D3 — Extend pattern 8 to the bare suffixed id (`H2b2`)?** Pattern 8 (`\b[A-I]\d[a-z]\b`) misses
`H2b2`, and pattern 5's shape, which the plan's hyphen form copies, misses `Slice-H2b2` for the same reason.
Today, `H2b2` in a comment is caught only when it carries its `4.1-` prefix (pattern 4). Changing pattern 8 to
`\b[A-I]\d[a-z]\d?\b` has 0 hits on the tree and makes the identifier arm's "as pattern 8" true. It goes beyond
the brief's list of missed shapes, so it's your call. **Recommend yes:** one character class, the same family
as the listed shapes, and it is in the tool slice that's already extending `comments`. It needs a planted
test and a mutation row like the others.

### Decisions

Duncan, 2026-10-12: **all three as recommended**, and the plan fixes stand as written.

- **D1: yes.** The quotation blind spot is a quote that ends within four words *before* its anchor. There is
  no separate short-quote item. The plan's A11 reading is the build target.
- **D2: yes.** The default-run test asserts that the committed corpus fixture equals `renderFixture`'s
  formatted output for its own rows: header, body template and formatting (A14 as planned).
- **D3: yes.** Pattern 8 becomes `\b[A-I]\d[a-z]\d?\b`, so a bare `H2b2` (and `Slice-H2b2`) is caught. It
  needs a planted test, a mutation-check row and its 0-hit count on the tree, like the other new shapes. The
  identifier arm's "as pattern 8" is then true (fix 7 is resolved by this).

For round 2 the plan adds what changed at its top, covering fixes 1–9 (10 is optional) and D3's pattern 8
change.

### Docs edited

- `phases/4.2/H/brief.md#decided-not-built`: the missed-shapes item adds the bare suffixed plan-item id and
  pattern 8's new regex (D3), and its quotation clause now says "a quotation that ends within four words
  before its anchor" (D1).
- `phases/4.2/H/brief.md#decided-not-built`: the corpus item says the committed fixture is exactly
  `renderFixture`'s formatted output for its own rows (D2).
