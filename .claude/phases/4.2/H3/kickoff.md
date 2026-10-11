# Kickoff — Phase 4.2 — Slice H3: Names

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: none as a whole. No behaviour changes. For each comment that mentions a renamed thing,
  read the code it describes, never the old comment.
- `phases/4.2/H/brief.md`, all of it. These sections are binding:
  - `phases/4.2/H/brief.md#split`, its 4.2-H3 bullet: this slice's boundary and its golden policy.
  - `phases/4.2/H/brief.md#decided-not-built`: the four items marked "4.2-H3's PR review". This
    slice builds them; the design agent moves them into the docs at the PR review.
  - `phases/4.2/H/brief.md#known-from-42-h2s-review`: residue to clear.
- `phases/4.2/H/plan-review.md#decide-points`: D5 and its follow-up (why names go, and the shape
  of the proof).
- `phases/4.2/H2/review-r1.md#decide-points`: D1, where this slice's tool items came from.
- `phases/4.2/H1/record.md`: the tool as built (the scanner, the 17 patterns, the mask rules, why
  `comment-proof` fails a renamed file). `phases/4.2/H2/record.md`: what the sweep kept.
  - Bare ids kept as derivation labels and test-data names. Those labels stay in this slice too:
    `E1`, `S1`, `P1`, `O1`, `T98`.
  - T1-T5 kept, because `CONVENTIONS.md#balance-simulator` defines them.
- `CONVENTIONS.md#comment-why-not-what`, `CONVENTIONS.md#goldens-are-layered-and-additive`,
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`,
  `CONVENTIONS.md#two-tier-golden-discipline`, `CONVENTIONS.md#a-focused-golden-pins-what-it-claims`,
  `CONVENTIONS.md#corpus-digest`, `CONVENTIONS.md#balance-simulator` (what the report's
  "ASSUMPTION 22" lines are), `WORKFLOWS.md#golden-policy-one-per-pr`.
- Code:
  - `scripts/docs-check/`: `comments.ts`, `comment-proof.ts`, `scanner.ts` and `cli.ts`, with
    their tests, and `ci.test.ts`;
  - `.github/workflows/deploy.yml`;
  - `src/engine/test-utils/golden-runner.ts` and `src/engine/__fixtures__/` (`balance.ts`,
    `scripts.ts`);
  - `src/engine/corpus-digest.test.ts` with its fixture;
  - every golden fixture and test that carries a slice id.

## Scope

Strip provenance from the names in `src/`, and add a check that stops it coming back.

**Names:**
- **File names:** the 127 files whose name carries a slice id, renamed with a plain `mv`
  (`workflow/coding-rules.md#rules`). That is 60 golden fixture/test pairs with a digit
  (`golden-h2b2-reapply`), the three `golden-e-…` pairs, and `engine/generation-g1.test.ts`.
- **Identifiers:** `PHASE_4_PLACEHOLDER_BALANCE_CONFIG` (11 uses in 9 files), `B5_FIXTURE` and
  `B5_CAST_FIXTURE`.
- **Fixture data ids:** about 100 distinct trait, script and status ids in 46 files, such as
  `'h2b2-reapply-p1'`, `'b6-stun-fixture'` and `'e-overtone-fixture'`. 44 of the files are golden
  fixtures; the other two are `engine/resolution.test.ts` and `engine/status-snapshot.test.ts`.
  Duncan decided this at this kickoff.

Each one is named by hand for what it pins or is for, and every comment mention of an old name
follows (about 40 lines, globs included).

**Then the items in `phases/4.2/H/brief.md#decided-not-built` marked for this slice:**
- **The guard:** `comments` (or a sibling mode) fails on a phase or slice id in a `src/` file name
  or identifier.
- **The missed shapes:** `comments` catches each of them, and `--quotations` catches a quotation
  before its anchor and one of four words or fewer. Each new pattern has 0 hits on today's tree,
  by a rough grep. Fix any real hit the real check finds.
- **The six provenance strings**, reworded with the tests that match them:
  - `state/rewards.ts:52` with the `rewards.test.ts:176` regex;
  - the three `state/balance-sim.ts` report strings, with the `balance-sim.test.ts:164`
    assertion. "ASSUMPTION 22" labels the CI thresholds `CONVENTIONS.md#balance-simulator`
    describes;
  - `engine/corpus-coverage.test.ts:27`.
- **A default-run test** that the committed corpus fixture's header is `renderFixture`'s.
- **The `comment-proof` option** that proves the renames (the plan designs it).

**Residue, comment-only:**
- the 135-column line in `data/traits/starters.ts:18`, rewrapped at about 100 columns;
- `engine/__corpus__/corpus.ts:8`, which names `frozen-replay-sweep.test.ts`, a file deleted in
  `d63e59f`; say what is true now, or drop the clause;
- `scripts/docs-check/comments.ts`'s header, which says the mode is "not wired into CI yet". It
  has been in CI since 4.2-H2.

**Out of scope:**
- Any behaviour change.
- Real content ids (`src/data`), positional ids (`'a-player-0'`, `perk-N`) and derivation labels
  (`E1`, `S1_SCRIPT`, `T98`).
- "The new X" comments (`phases/4.2/H2/review-r3.md#scope-and-labeling`).
- Any living doc. List the doc lines your renames make stale under **Spec questions**. So far that
  is one: `workflow/pr-review.md:77` names `golden-h2b1-wick-gates`.

## Golden policy

**Deliberate changes, one kind only: fixture data ids** (`phases/4.2/H/brief.md#split`).

- A fixture data id appears in expected events (`effectId: trait.id`, a `statusId`), so a golden
  whose fixture renames one changes in those strings and in nothing else.
- List every such golden, and prove its exports are deep-equal to `main`'s once the id map is
  applied to `main`'s side.
- Every other golden's exports are deep-equal to `main`'s as they are. A renamed file is paired
  by the rename map.
- The corpus digest fixture is byte-unchanged and `npm run corpus:update` is not run. The corpus
  is real content, so no renamed id reaches it. Show that it doesn't.
- No golden is added or removed, and fixture comments may change
  (`CONVENTIONS.md#comment-only-golden-edits-are-allowed`).
- The only test added under `src/` is the corpus header test. Every other test file keeps its test
  count, paired across renames by the map.

## Traps

- **A stripped id collides.** Name each one for what it pins, never by deleting the prefix.
  - `golden-b2-silenced-refuses-granted-cast` and `golden-f3-silenced-refuses-granted-cast` pin
    the same refusal. One uses a trait-borne fixture lock, the other the real Silenced status from
    the real Silence spell (read both headers). Their names say which.
  - `'b6-always-wait'` without its prefix is `'always-wait'`, the shared fixture script in
    `engine/__fixtures__/scripts.ts`. Some fixtures merge `FIXTURE_SCRIPTS_BY_ID` into their
    scripts map, so a collision silently swaps one script for another. A swap whose behaviour
    happens to match passes every golden *and* the id-map comparison. Show that no new id or name
    exists anywhere on `main`'s `src/` as a string literal, file name or identifier.
  - If two goldens turn out to pin the same thing, report it. Don't merge or delete either one.
- **A family loses its shared prefix.** Comments cite goldens by glob: `golden-h2b2-*`,
  `golden-h2b1-wick-*`, `golden-f2-*`, `golden-e-*`, `golden-d3-revive-cap-*` (six in all). A
  family that pins one mechanism should get a mechanism prefix (`golden-tick-…`), so its glob
  still means something. Otherwise, rewrite the mention to list the names or describe them.
  Leave no glob that matches nothing.
- **The guard cannot tell `B5_` from `S1_` by shape.** `B5_FIXTURE` is a slice id. `S1_SCRIPT`,
  `E1`, `P1`, `O1`, `U1`, `R1`, `L8` and `T98` are derivation handles, and `T1`-`T4` in
  `balance-sim.ts` are design targets. These are the same rules pattern 8 already follows, where
  only a suffixed id (`H2c`) is unambiguous.
  - The plan says exactly what the name guard matches in a file name and in an identifier,
    with its false-positive count on the renamed tree.
  - It says whether the guard also scans string literals: positional ids such as `'a-player-0'`
    and the game's `'hp-percent'` are the noise. If it doesn't, say why.
  - Prefer folding the guard into `comments`: one CI step, one walk, and `ci.test.ts` stays as it
    is. A sibling mode needs its own `deploy.yml` step and assertion.
- **This slice builds the tool that proves it.** 4.2-H1 and 4.2-H2 were split so a sweep was never
  proved by a tool changed in its own PR. Here the brief puts the option in this slice, so the
  proof needs checks that don't go through the new code:
  - fixture exports deep-equal under the id map;
  - test counts per file under the rename map;
  - every golden passing;
  - the corpus fixture byte-equal.

  Build and test the tool changes first. Every new mechanism needs a test that fails with the
  mechanism removed (`H1/evidence/mutation-check.txt` is the bar).
- **The option must stay strict.** Today `comment-proof` fails every rename by design.
  - With the option, it still fails an unlisted rename, a map entry that isn't used, and a changed
    identifier or literal not in a map.
  - It compares a renamed file's code only after rewriting exactly the listed import specifiers,
    identifiers and literals.
  - A map entry that matches more than its listed occurrences fails, like a mask `count`.
- **An aliased import changes on one side only.** `import { PHASE_4_PLACEHOLDER_BALANCE_CONFIG as
  CFG }` renames the imported name and keeps `CFG`, and the comparison has to allow that.
  Comments in `state/integration.test.ts:15` and `state/store.test.ts:10` name the identifier
  itself.
- **Renaming a fixture or test is a file-set change.** Git sees a delete plus an untracked file
  until Duncan stages them.
  - Use `mv`, never `git mv`, and never `git add`.
  - The rename map (`evidence/renames.json`, plain JSON, because the reviewer re-runs the proof
    with it) is the record.
  - Duncan's checkout is on Windows, which ignores case, so no two new names may differ only in
    case.
- **The reworded strings are code.** Each one goes in the mask with its test's regex or
  assertion. Neither string may keep the old provenance word in another form ("before Phase 8"
  becomes what is true now, not "before the gem phase").
- **The corpus header test must fail on drift.** Show that it fails when one character of the
  committed header changes, and that the template still renders byte-equal to the committed
  header.
- **`origin/main` is the proof's base**, at `590d82a` (4.2-H2's merge) at this kickoff. If it
  moves, stop and ask Duncan.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, and
`npm run docs:check -- citations`, `-- budgets` and `-- comments`, whose new patterns and name
guard pass on the branch. Every golden passes, the corpus digest test passes against the
unchanged fixture, and the test count under `src/` is `main`'s file by file, under the rename
map, plus the one header test. Under `scripts/` it grows by the new checks' tests only.

## The PR must prove

- **Rename map:** every renamed file, old → new, with the one line each name says it pins
  → `evidence/renames.json` plus a readable table in `evidence/names.md`. The table covers the
  identifiers and the fixture data ids too.
- **No collisions:** no new name or id existed on `main` as a file name, identifier or string
  literal in `src/`, and no two new paths differ only in case.
- **No old name left:** a grep for every old file stem, identifier and id over `src/`, the two
  configs and `scripts/` returns nothing. A planted test string in `scripts/` that uses one on
  purpose is allowed, and is listed.
- **Proof:** the new `comment-proof` option, with `evidence/renames.json`, the identifier and id
  maps and the mask, passes on the branch and prints every changed file → `evidence/comment-proof.txt`.
  It fails on each of these, with exit 1 naming the file:
  - a planted code change in a renamed file;
  - an unlisted rename;
  - an unused map entry;
  - an identifier renamed outside the map;
  - an id changed outside the map.
- **Goldens:** the list of goldens whose expected values changed, and every fixture's exports
  deep-equal to `main`'s (under the id map where listed) → `evidence/fixtures-compare.txt`. Show
  the comparator catching a planted `finalDamage` change.
- **Corpus:** the fixture byte-equal to `main`'s, and the header test failing on a one-character
  drift → `evidence/corpus.txt`.
- **Guard and shapes:**
  - `comments` passes;
  - it fails on a planted slice or phase id in a `src/` file name and in an identifier, and on a
    planted instance of each new shape;
  - `--quotations` lists a planted before-anchor quote and a planted short one, and its after-list
    on the branch is empty or false positives shown with their target lines;
  - the guard's false-positive count on the renamed tree is 0;
  - → `evidence/planted-faults.txt`, `evidence/counts.txt`.
- **Mutation check:** each new mechanism in `scripts/` removed in turn, with the test that fails
  → `evidence/mutation-check.txt`.
- **The six strings:** before → after, with the matching test lines.
- **Residue:** each item, before and after.
- **Test counts**, file by file, `main` against the branch through the rename map
  → `evidence/test-counts.txt`.
- **Gates** → `evidence/gates.txt`.
- **Spec questions:** the living-doc lines the renames make stale (`workflow/pr-review.md:77` so
  far).
- **To delete:** none expected (renames aren't deletions).

---

## Docs edited at this kickoff

- `ROADMAP.md`, Phase 4.2: "Done: 4.2-A to 4.2-H2" (4.2-H2 merged as `590d82a`). The summary
  now says 4.2-H3's renames are its only golden change.
- `phases/4.2/brief.md`: the golden policy names 4.2-H3's one deliberate change, and `src/`'s
  exceptions name its renames. The B-F process line says "byte-identical for B to F" instead of
  "every slice". The slice table's H3 row adds fixture data ids. (Duncan: fixture ids are in.)
- `phases/4.2/H/brief.md`:
  - the header's golden policy is scoped to 4.2-H1 and 4.2-H2;
  - the 4.2-H3 bullet under `## Split` gives the 127-file count (the `golden-e-…` pairs were
    missing), the identifiers, the fixture data ids, the collision with `'always-wait'`, the
    deliberate golden policy and the id-map proof;
  - the two related "Decided, not built" lines name fixture data ids.
- `workflow/coding-rules.md#rules`: a rename the kickoff calls for is not a deletion. Use a plain
  `mv` and record it in the report's rename map. (Duncan: amend the rule rather than have him run
  the renames.)
