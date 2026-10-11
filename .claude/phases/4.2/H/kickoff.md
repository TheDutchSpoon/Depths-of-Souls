# Kickoff — Phase 4.2 — Slice H: Code comments, the context diet for `src/`

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- Spec files: none as a whole. For each comment or title you rewrite by hand, read the rule (or
  content entry) it cites or should cite, and check the comment against the **code**, never
  against the old comment. Content quotations live in `content/` and `specializations/`.
- `.claude/phases/4.2/H/brief.md`, all of it. Its Scope bullets, the four kickoff decisions and
  "Known from 4.2-G's review" are the scope.
- `CONVENTIONS.md#comment-why-not-what` (gained the forward-pointer and test-title bullets at this
  kickoff), `CONVENTIONS.md#open-questions-get-an-interface`,
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`,
  `CONVENTIONS.md#two-tier-golden-discipline`, `CONVENTIONS.md#every-pull-request-runs-the-gates`.
- 4.2-G's evidence: `phases/4.2/G/evidence/review-quotations.txt` (the approximate quotation scan
  you re-derive with the scanner), `comment-proof.txt` and `retitled-tests.md` (what G's one-off
  proof did, which `comment-proof` now makes permanent).
- Code: `scripts/docs-check.ts` and all of `scripts/docs-check/` (where the new modes and their
  tests go, and the conventions they follow: root as an argument, `--root`, exit codes 0/1/2),
  `scripts/docs-check/ci.test.ts`, `.github/workflows/deploy.yml`, `vite.config.ts`,
  `tsconfig.node.json`, and `src/engine/corpus-digest.test.ts` with its fixture.

## Scope

Strip provenance from every comment and every `describe`/`it`/`test` title in `src/`,
`vite.config.ts` and `eslint.config.js`, to `CONVENTIONS.md#comment-why-not-what`: plan-assumption
numbers, phase and slice ids, PR and review references, "locked"/"decided" as provenance, and
history. Keep the *why* each tag carried. A forward pointer ("inert until Phase 8") cites the rule
that names the phase. The mechanical part may be done by script; by hand: every block the script
touches, every history marker, the ~40 quotations beside an anchor, the residue the brief lists,
and the two `// ASSUMPTION:` markers (neither is a live open question; see the brief). Add to
`docs:check`, on a scanner built on TypeScript's parser: `comments` (blocking, in CI) and
`comment-proof <base>` (by hand, never in CI), each with tests; and give `citations` a file
argument, `citations <file>…`, that checks exactly the named files, `phases/` included (brief,
"`citations <file>…`").

**Out of scope:** any code change; any string literal other than test titles and the one listed
below; comments that are correct but long; hunting restated rules outside the hand pass (fix one
when you find it); `scripts/` comments (its tests plant provenance on purpose); editing a living
doc. Where a quotation's fact isn't in its target at all, or a comment's fact has no home, it goes
under **Spec questions**, not into a doc.

## Golden policy

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged. Golden
fixtures change only in comments and are listed
(`CONVENTIONS.md#comment-only-golden-edits-are-allowed`); their setup, arithmetic and random
draws stay. No test is added or removed under `src/`; titles change, the test count per file
doesn't.

## Traps

- **"locked" is a game word.** Action locks (`isActionLocked`, `lockedTurns`, "a locked CASTER")
  and spell unlocks ("the tier-2 bolt is still locked") use it as content. `comments` cannot ban
  the bare word, and a script that strips it breaks real comments. Same for "decided" and
  "review". Strip these by hand; the check, if it covers them at all, uses narrow forms, listed
  in the plan with the false positives each one avoids.
- **Bare plan-item ids ride inside provenance.** `(A7)`, `(S4)`, `(G4)`, `D4`, `F2`, `B2 rule 2`,
  `H3+`, `Pre-4.1-D`, `ASSUMPTION (Slice F)`. A script that removes "Phase 4.1-A" and leaves
  "(A7)" has produced broken output. The plan's pattern list shows a sample of each, before and
  after.
- **A raw `ts.createScanner` mis-scans** template literals (it can't tell which `}` closes a
  `${…}` without `reScanTemplateToken`), regex literals and JSX text. Build on
  `ts.createSourceFile` and read comment ranges at token positions, with the right `ScriptKind` per
  file (TS, TSX, JS). `corpus-digest.test.ts`'s `renderFixture` template holds three `//` lines
  that are a string, not a comment: a direct test case.
- **Titles come in more shapes than `it('…')`.** `it.each` (16), `test.each` (3),
  `describe.skipIf` (2), and 8 template-literal titles with `${…}` substitutions. A title with a
  substitution is masked or checked on its literal parts only; say which.
- **One non-title literal changes with a comment.** The corpus fixture's header comment and
  `renderFixture`'s template in `corpus-digest.test.ts` carry the same
  "(`CONVENTIONS.md#corpus-digest`, corpus digest)" residue and must change together, or
  `npm run corpus:update` later rewrites the header. So `comment-proof`'s mask list names string
  literals by file and old/new text, not only titles, and the proof reports each masked one. Any
  other literal change fails it.
- **`comment-proof` must fail on more than a changed print.** An added, deleted or renamed file in
  scope fails (this slice changes no file set). Pragmas are compared separately, because
  `removeComments` strips them: `src/` has one, an `@ts-expect-error` in
  `engine/injured-allies.test.ts`; plant a change to it.
- **Stripping can create duplicate test names.** "(4.1-G1)" and "(4.1-G2)" may be the only
  difference between two titles in one `describe`. No two tests in one file share a full name after
  the change unless they did before; the report shows the check.
- **Prettier still runs on the result.** Deleting a whole comment line can leave two blank lines
  or an empty `/** */`, and `format:check` fails. Don't rewrap prose to fill space: a reflowed
  block makes the review diff unreadable.
- **A citation must point at the rule it means** (4.2-G's review re-pointed nine). A new anchor
  from the hand pass resolves (`citations` passes) *and* names the heading that states the fact.
  A forward pointer cites the `## Not built` rule or the `ROADMAP.md` phase entry, whichever states
  that the feature waits.
- **`// ASSUMPTION:` stays a valid form.** After the slice `src/` has none, but
  `CONVENTIONS.md#open-questions-get-an-interface` keeps the mechanism. `comments` fails every other
  `ASSUMPTION` shape and allows `ASSUMPTION:`. Whether it also requires an `OPEN_QUESTIONS.md#…`
  citation in the same comment is an ASSUMPTION; the kickoff leans yes, as it is the rule made
  checkable.
- **`comments` never calls git** (CI's checkout is shallow); `comment-proof` reads `<base>` with
  `git show` and never runs in CI. `docs-check.ts`'s header says "no dependencies": it now imports
  `typescript` (already a devDependency, installed by `npm ci`), so the header says that.
  `noUnusedLocals` and `erasableSyntaxOnly` hold for `scripts/`.
- **`citations <file>…` changes nothing without paths.** CI's call and its output stay as they
  are. A named file is checked by the living-doc rules (resolve, no old form, no label form), not
  `src/`'s extra bare-name forms, and its anchors resolve against the working tree like any
  other. Paths are repo-relative, or absolute under `--root`; a path outside the root, or a missing
  file, is exit 2. It still never calls git.
- **The quotation scan is approximate** (a regex cut at comment wraps). Re-derive the before list
  with your scanner and show both counts. Whether `comments` checks quotations is the plan's call,
  as an ASSUMPTION; wrapped quotes and markup are where it would false-positive.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`,
`npm run docs:check -- citations`, `-- budgets` and the new `-- comments`, with every golden and the
corpus digest unchanged and the test count under `src/` unchanged file by file. The `docs-check`
project grows by the new modes' tests only.

## The PR must prove

- **Comment-only:** `comment-proof origin/main` passes on the branch and prints each file with its
  masked titles and literals. It fails on a planted code change, a planted pragma change, a planted
  unlisted title change and a planted added file, each exiting non-zero with the file.
- **`comments`:** passes on the branch, fails on a planted tag of each pattern (comment and title),
  allows `// ASSUMPTION:` (as the plan decides it), and runs in `deploy.yml`'s `test` job with
  `ci.test.ts` covering it. Show it does not fire on the "locked" game uses.
- **Counts:** before/after per provenance pattern, in comments and in titles, after counts zero;
  the quotations before (scanner-derived) and after, after zero; the residue items each shown fixed.
- **Every changed title**, old → new (`evidence/`), and no new duplicate full names.
- **Hand rewrites:** at least one per folder (`app`, `data`, `engine`, `state`, `ui`, plus the two
  config files), old → new, showing the *why* kept; and every forward pointer with the anchor it
  now cites.
- **`citations <file>…`:** passes on this `kickoff.md`; fails on a planted label form and a planted
  unresolved anchor in a scratch file under `phases/`; with no paths, its output on the branch is
  the same as before.
- **Golden fixtures:** the list of changed fixtures; every fixture's exports deep-equal to `main`'s.
- **To delete:** none expected.

---

## Docs edited at this kickoff

- `ROADMAP.md`: Phase 4.2 marked "Done: 4.2-A to 4.2-G"; its `src/` line names the test titles.
- `phases/4.2/brief.md`: the `src/` line names 4.2-H's titles and the two config files.
- `phases/4.2/H/brief.md`: Duncan's four kickoff decisions (titles in; a bounded hand pass;
  forward pointers cite the rule; `vite.config.ts` and `eslint.config.js` in); the `// ASSUMPTION:`
  count corrected (two markers, neither a live open question); the PR-must-prove lines for titles.
- `CONVENTIONS.md#comment-why-not-what`: a quotation beside an anchor is the target's own words;
  a forward pointer cites the rule, not the phase; test titles follow the same rules (Duncan,
  this kickoff and 4.2-G's review). Under budget (24.8 of 29 KB).
- `phases/4.2/H/brief.md` (again): `citations <file>…` added to the scope and the proof (Duncan,
  after the kickoff's reading list went out in label form); its `design-rules.md` line under
  "Decided, not built", for the PR review.
- This kickoff's reading list: its CONVENTIONS label citations converted to anchors.
