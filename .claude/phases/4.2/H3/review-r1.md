# PR review — Phase 4.2 — Slice H3: Names — Round 1

Reviewed branch `4.2-h3` at `603ef62` ("build") against `origin/main` at `590d82a`, which hasn't
moved since the kickoff. Inputs: `kickoff.md`, `plan.md`, `plan-review.md` (Round 2 approves, with
fixes 1-8 and D4 (a) binding at build), `report-r1.md`, `record.md`, the evidence folder,
`phases/4.2/H/brief.md`, and the living docs on the branch.

**Verdict: fixes, small.** The renames are right and I re-derived every proof without the PR's
tool: the fixtures' exports, the per-file test counts, the corpus fixture, the collision and
old-name scans. The guard, the new shapes and `--renames` are sound, and 10 of my 12 mutations are
caught. Two are not: each half of the importer-specifier count can be removed with the suite green
(fix 1, tests only). D1 asks whether the guard should also cover the kind of string that started
this item: "before Phase 8" in an error message. `handout-r1.md` holds fix 1 and, if you say yes,
D1.

## Real fixes

**1. The importer-specifier count is pinned only as a whole.** `comment-proof.ts` fails a renamed
file whose importers don't match its `imports` count:
`if (specBase[i] !== expected || specHead[i] !== expected)`. Removing either half leaves all 463
`scripts/` tests green. Mutation 51 removed the whole condition, and the one test behind it
("fails when the entry says 0 or 2 importers and the tree has 1") has the same count on both sides,
so either half alone catches it. Today `compareCode` fails the importer that changed anyway, so
this is a second line, not a hole. Still, it is a mechanism at two sites with no test at either
(`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`), the shape of PR #73's
cast-path guard. The fix is two tests where the base and working-tree counts differ, each asserting
the count line, and two mutation rows.

## Scope and labeling

No action needed on any of these:

- **Names that are the old name minus its prefix.** 40 file stems (`golden-wick-gates`,
  `golden-revive-cap-fizzle`) and two ids (`cost-via-selector`, `random-target-fixture`) are the old
  name with the slice id deleted. The kickoff's "never by deleting the prefix" is about collisions.
  None of these collides with anything on `main`, and each stem already says what it pins.
- **`golden-e-*`'s replacement** in `perform-action.test.ts:3` adds `golden-granted-cast-*` and
  `golden-echo-provoke-redirects`. That is faithful: the line on `main` said "(golden-e-*, the
  granted-cast/echo goldens)".
- **Line width.** The renames left 14 comment lines between 101 and 112 columns, and a few ragged
  wraps (`golden-lock-immunity:2-3`). There is no width rule below the 120 columns that 4.2-H2's D2
  used.
- **The identifier arm misses a slice id mid-camel** (`wickH2b1Gates`). Widening it would flag
  `runA1`…`runB2` in today's tree (measured), so the plan's choice stands. A phase id mid-camel is
  different; that is D1.
- **Record and report:** accurate against what I measured. The three scratch files the report put
  under **To delete** are already gone from your tree, so the mailbox has nothing to delete.

## Spec questions (from the report)

- `workflow/pr-review.md:78`: renamed to `golden-wick-gates`, `golden-last-gleam` (edited).
- `phases/4.1/brief.md`: a closed phase's brief, where the old names are history. Left as is.
  `phases/4.2/H/brief.md:87-92` names the old stems as the work. Left as is.
- `CONVENTIONS.md:224` and `workflow/pr-review.md:82`: a rename isn't comment-only, so
  `#comment-only-golden-edits-are-allowed` stays. `pr-review.md` gets a Renames line, and
  `#comment-why-not-what` names `--renames` as the proof of a rename (edited).
- `CONVENTIONS.md#corpus-digest` and `#comment-why-not-what`: written in (edited). The new shapes
  (`Slice-B`, `design-review`, …) are not listed in `CONVENTIONS.md`: `PATTERNS` in `comments.ts` is
  their one home.
- The `--quotations` false positive at `engine/__corpus__/node-shims.d.ts:3`: accepted, as the plan
  review said.
- `phases/4.2/H/brief.md#decided-not-built`: emptied (edited).

## Decide-points

**D1. Should the guard also read value literals for provenance words, and a phase id mid-camel?**
The brief's rule, now in `CONVENTIONS.md#comment-why-not-what`, is that no string literal in `src/`
carries provenance. The six strings this slice rewords came from that class: "before Phase 8",
"ASSUMPTION 22", "the Phase-3 mechanism trait". The guard reads literals only for slice-id shapes
(`'h2b2-x'`), and `comments` reads comments and titles, so none of the six would be caught if it
came back. I ran `comments`' 17 patterns over every value literal under `src/`:

- on `main`: 7 hits, exactly the six strings and the `rewards.test.ts` regex;
- on the branch: 0.

Separately, the identifier arm catches `PHASE_4_X` and `phase4Thing` but not `placeholderPhase4Config`.
A mid-identifier `Phase<digit>` has 0 hits on the tree.

- **(a) Recommended: build both in round 2.**
  - The literal arm also runs patterns 1-9 (ASSUMPTION, phase and slice ids, PR numbers, review
    words, plan-item ids) over value literals, regex literals included.
  - It leaves out the word patterns 10-17 (`brief`, `kickoff`, `grill`, `the plan`, `sign-off`,
    "locked …", "decided …"): they collide with English a player-facing string can hold ("a brief
    stun").
  - Titles stay with `comments`.
  - The identifier arm also matches `Phase`/`PHASE` plus a digit after a lower-case letter or digit.
  - The cost is one loop and one regex, with tests and mutation rows like the other arms. `src/`
    doesn't change, so the round-2 proof is the round-1 proof re-run.
- (b) Park it as a "Decided, not built" item in `ROADMAP.md` for a later slice. 4.2-H then closes
  with the rule partly checked.
- (c) No. The six strings were a one-off, and the rule stays checked by hand at review.

I recommend (a) because this slice's job is "add a check that stops it coming back", and these
literals are the one place it can come back unseen. If you choose (b) or (c), delete section 2 of
`handout-r1.md`.

## Decisions

Duncan, 2026-10-12: **D1 (a)**, as recommended. Round 2 builds both:
- the literal arm runs patterns 1-9 over value literals, regex literals included, and never
  patterns 10-17;
- the identifier arm catches a phase id mid-camel.

`handout-r1.md` keeps section 2. The round-2 review widens the CI sentence in
`CONVENTIONS.md#comment-why-not-what` to match what is built.

## What I verified, and how

All of this ran in my own clone (worktrees of `603ef62` and `590d82a`, `npm ci` on each, Node
22.22.0 with the lockfile's Vitest 5.0.3), never in your working tree.

**Gates on the branch:**
- `npm run test`: 212 files, 1,821 tests (1,820 passed, 1 skipped)
- `lint`, `format:check`, `build` and `npx tsc -b`: clean
- `citations`: PASS, 641 citations before my doc edits
- `comments`: PASS, 7,008 comments and 1,629 titles in 403 files
- `budgets`: 12 files, 0 over

I couldn't read the CI result: the GitHub API is closed to this session. Worth a glance on the PR.

**Test counts, file by file, from `vitest run --reporter=json` on both trees, paired through
`renames.json`:**
- `src/`: 201 files on each side. `main` has 1,357 tests and the branch 1,358. 64 renamed test
  files, none with a different count. The one difference is `engine/corpus-digest.test.ts`, 1 → 2.
- `scripts/`: 325 → 463 tests: `comments.test.ts` 61 → 82, plus the new `names.test.ts` (58) and
  `renames.test.ts` (59).

**The proof.** I ran `comment-proof origin/main --mask evidence/mask.json --renames
evidence/renames.json` in my clone: 151 OK and one FAIL, `engine/corpus-digest.test.ts`, with
exit 1. Its OK and FAIL lines are identical to `evidence/comment-proof.txt`. I planted three faults
against the real map, and each fails naming its file:
- a code change in a renamed fixture (`golden-wick-gates`, a speed);
- an id changed outside the map (`golden-granted-cast-confused-redirects`), which fails on the
  literal count;
- an unlisted rename (`ids.ts` → `ids-moved.ts`), which fails as added plus deleted.

**The one real code change.** I read `corpus-digest.test.ts`'s whole diff: one `?raw` import and
one `it`, skipped in `corpus-update` mode. The `?raw` deviation is right, because `readFileSync`
would have needed a shim change as well. `.gitattributes` sets `eol=lf`, so a Windows checkout
reads the same bytes. The corpus fixture is byte-equal to `main`'s.

The new test fails on a one-character change to the committed header and on an extra blank line.
It passes a trailing space added to the template, because prettier strips it; that is correct for
a formatted-output check.

**Fixtures, with my own comparator, not the PR's script.** A throwaway Vitest file on each tree
imports every `__golden__/*.fixture.ts` and every `__fixtures__` module with `import.meta.glob`
and serialises every export: `Map`, `Set`, `undefined`, and a function by its source. A Python
script then compares `main`'s side with the branch's:
- file paths are paired through the files map, export names through the identifier map, and
  strings through exact whole-string replacement from that file's literal entries;
- inside a function's source, only quoted ids are replaced;
- a derived `"<id> (fixture)"` name is mapped as well.

Results:
- **140 modules, 0 differ.** 98 literal entries are used, and the other 5 are in the three unit
  tests. 7 derived names are mapped, the same 7 the evidence lists.
- **44 modules carry a renamed id.** Without the map, 35 of them differ in an `expected*` export:
  the same 35 `fixtures-compare.txt` lists.
- A planted `finalDamage` change in `golden-1v1` is reported at `expectedEvents[4]`.

**Collisions and leftovers, by grep and parse, apart from the tool:**
- **No collisions.** No new literal, identifier or file name exists on `main`'s `src/` or in the
  configs as a quoted literal, identifier or file name. The one stem-against-literal match,
  `last-gleam`, is a trait id against a file name, as the report says.
- **Paths and the map.** No two branch paths differ only in case, and the id map is injective.
- **No old name left.** I grepped each of the 163 distinct old stems, ids and identifiers as a
  whole token over `src/`, `scripts/`, `.github/` and both configs: 0 hits. The only
  `golden-<id>-` strings left are the planted `d7`/`h9z` ones in the two new test files.
- **The globs still mean what they meant.** The 7 globs in `src/` comments each match files. Each
  renamed family is exactly `main`'s family under the map: `status-snapshot-*` 22 files,
  `status-timing-*` 14, `wick-*` 6, `revive-cap-*` 4, `grant-*` 4.

**The guard against `main`.** I ran the branch's `scripts/` on `main`'s tree:
- `--counts`: 127 file names, 25 identifier tokens in 12 files and 111 literals in 47 files;
  `comments` fails with 263 problems;
- on the branch: 0, 0 and 0;
- `--quotations` on the branch lists only the known `node-shims.d.ts:3`.

**Mutations.** I made 12 of my own, separate from the PR's 63. Each edited one line in my clone,
then ran the 463 `scripts/` tests, then restored the tree with `git checkout`.

Caught:
- the injectivity check (3 tests)
- the trailing-comma filter alone (1)
- the whole layout-free comparison (1)
- the literal-collision lookup (1)
- the identifier-collision lookup (2)
- the interior literal shape (3)
- titles skipping every shape instead of only the third (1)
- the quotation parity check (1)
- the specifier skip in the literal arm (1)

Survived:
- the base half of the specifier count
- the working-tree half of the specifier count (fix 1)

A probe that widens the phase arm to mid-camel fails no test, as expected (D1).

I also checked whether the layout-free comparison could equate `[,]` with `[]` once it drops
trailing commas. It doesn't: the elision is its own token, and the proof exits 1. `f(a,)` against
`f(a)` and `<X,>` against `<X>` pass, which is right.

**Code read against the spec:**
- `names.ts`, `tokens.ts`, `renames.ts`, and the diffs of `comment-proof.ts`, `comments.ts`,
  `cli.ts` and `scanner.ts`.
- The six strings: each new text is true and keeps no provenance word, and `balance-sim.test.ts`'s
  single `'CI thresholds'` assertion matches only the report line.
- The three residue items.
- `corpus.ts`'s new citation: `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` says
  each fixture exports what the runner needs, which is what the comment claims `corpus.ts` doesn't.
- `src/engine` gains no UI, data or state import. The only non-test `src/` changes are
  `rewards.ts` (the error text), `balance-sim.ts` (three report strings) and `data/traits/starters.ts`
  (a comment).
- `deploy.yml` and `ci.test.ts` are unchanged.

**Not run:** the corpus event-log scan (`workflow/pr-review.md#6-look-for-live-behaviour-the-spec-doesnt-cover`).
No behaviour changes, the digest is byte-equal and the digest test passes.

## Docs edited

- `CONVENTIONS.md#comment-why-not-what`:
  - a "So do names" bullet: file names, identifiers, fixture data ids and string literals carry no
    provenance. It says what `comments` fails CI on (the A-I letters, derivation handles, a title
    opening with one), and that a rename is proved with `comment-proof --renames`.
  - the quotation sentence names `--quotations` and its window on either side of the anchor.
- `CONVENTIONS.md#corpus-digest`: the committed fixture is exactly what `renderFixture` writes,
  checked in the default run.
- `CLAUDE.md#how-the-spec-is-written`: "No provenance" covers file names, identifiers and string
  literals too.
- `workflow/pr-review.md#4-verify-claimed-invariants-mechanically`: the renamed sub-fixture names,
  and a Renames line covering `--renames` and the checks to run apart from it.
- `phases/4.2/H/brief.md#decided-not-built`: the four 4.2-H3 items are removed, now that they're
  built and in the spec.

If D1 is (a), the round-2 review widens the CI sentence in `#comment-why-not-what` to match. If it
is (b), I add the item to `ROADMAP.md`.
