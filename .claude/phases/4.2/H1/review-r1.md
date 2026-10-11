# PR review r1 — Phase 4.2 — Slice H1: Comment tooling

Reviewed branch `4.2-h1` at `263ff57` (the build is `213226e`; `263ff57` only removes the report's
`.tmp`), against `main` at `a7c4fa2`, `kickoff.md`, `plan.md` (Revision 2) with `plan-review.md`
Round 3's corrections, `phases/4.2/H/brief.md` and `CONVENTIONS.md`. Cloned, built and run in my
own sandbox (Node 22.22, the lockfile's Vitest 5.0.3 and TypeScript 6.0.3); nothing ran in your
working tree.

## Verdict: fixes

The tooling is close to done. The scanner is right: an independent parser finds the same
comments at the same positions in all 403 files (below). The 4.2-G rehearsal reproduces exactly.
Every pattern hit I read on today's tree is provenance, and 43 of my 47 mutations are caught by the
test the plan names. Three fixes are small and each has a concrete failing case: one
false pass in `comment-proof` and two unpinned conditions. One decide-point widens what counts as
a pragma. A round 2 would only check these.

## Real fixes

1. **`comment-proof` passes a syntax error the parser recovers from.** TypeScript's parser skips a
   stray token at statement level and reports a parse diagnostic, so the AST and the print are
   unchanged. Appending `\n)\n` to `src/engine/rng.ts` in the 4.2-G clone (a file 4.2-G changed)
   gives `comment-proof: PASS, 88 changed files`, exit 0. `transpileModule` reports
   `Declaration or statement expected.` for the same text. `tsc -b` and lint would catch it today,
   so nothing can merge broken. But the tool claims to prove a diff is comment-only, and every later
   comment-only change, plus 4.2-H3's rename option, leans on that claim on its own. Fix: a file
   whose working-tree or base text has a syntactic diagnostic fails, naming the line and message.
2. **A pragma added after the last base pragma is caught only by an unpinned length check.** In
   `compareCode`, the `findIndex` over the base's pragmas misses a pragma appended after them,
   including any pragma added to a file that had none. That is the likeliest way a "comment-only"
   diff would slip in a suppression (`// @ts-nocheck`, `/* eslint-disable */`). Only
   `bp.length !== hp.length` catches it. Delete that condition and the whole suite stays green. The
   existing "added pragma" test prepends `// @ts-ignore`, which shifts the list, so `findIndex`
   catches it instead. This is one mechanism with two sites, and each site needs its own failing
   test (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`).
3. **The duplicate-name check has two conditions, and neither is pinned on its own.** "Has more
   duplicated names" and "has more excess copies" agree whenever the base has no duplicates, which
   is the only case the tests plant. Remove either condition and the suite stays green. The tree has
   no duplicate full test names today, so this is latent, but A9 specifies both conditions. Pin
   each, on the comparison as a helper over two lists of full names, because exact masks can't
   rename one of three identical titles: base `[t, t]` → head `[t, t, t]` fails (excess only), and
   base `[t, t, t]` → head `[t, t, u, u]` fails (names only).

## Scope and labeling

- **Report wording, accepted.** "88 files OK, each with its masked pairs" was the kickoff's
  wording. Only the 8 files with entries print pairs, as the report says. Not a defect.
- **The `rm` of two untracked scratch files in `scripts/`** happened before the no-delete rule was
  applied. They were never tracked, and `git status` agrees. No action.
- **CI not checked by me.** The GitHub API isn't reachable from my sandbox. Please confirm the PR's
  checks are green; my local gates are.
- **A survived mutation that is benign:** counting an empty `SyntaxList` as a leaf changes nothing
  observable. No duplicate comment on the tree or on `{ /* noop */ }` / `f(/* none */)`, and the
  token index shifts the same way on both sides. No test needed.
- **The report's spec questions** are handled under Docs edited: the `citations <file>…` step, the
  docs that list CI's modes (for 4.2-H2), and a home for `comment-proof`. The 48 quotations and
  the two "roles … enabler / payoff / amplifier" quotes are 4.2-H2's hand pass, as the brief says.

## Decide-points

**D1 — should `comment-proof` treat more comment forms as pragmas?** It compares as pragmas only
comments whose body starts with `@ts-`, `eslint-`, `@jsx`, `@vite-ignore`, `prettier-ignore`,
`v8 ignore`, `istanbul` or `/// <`. That is A8's list, which you confirmed. Tools also read three
other forms, and today a diff can change each of them and still pass: in the clone, rewording
`/* eslint no-console: off */` passes, and so does deleting `/*#__PURE__*/`. The forms are:
- ESLint's inline config `/* eslint <rule>: … */`, which can switch a rule off for the whole file;
- `/* global … */` and `/* globals … */`, and `/* exported … */`;
- the bundler annotations `#__PURE__` and `@__PURE__` (and `#__NO_SIDE_EFFECTS__`), which change
  tree-shaking.

None of these is in the tree today (grep).

**Recommend: yes, in this fix round.** It's the same hole D1 at the plan review closed for a moved
pragma: a comment-only diff that changes what a tool does. The fix is one regex and a few `it.each`
rows. ESLint reads its config comments only from `/* */` blocks, so those forms are matched in
block comments only. Against: nothing in the tree uses them, and 4.2-H2 won't add any. If you'd
rather keep A8 as written, I'll put the wider list under the brief's "Decided, not built" for
4.2-H3.

### Decisions (Duncan, 2026-10-11)

- **D1:** taken. `comment-proof` also compares ESLint's block config comments (`eslint `,
  `global(s) `, `exported `) and the bundler annotations as pragmas: hand-out item 4.

## What I verified, and how

- **Gates** (my run on `263ff57`, `npm ci`): test 210 files, 1657 tests, 1656 passed and 1
  skipped; lint, format check, build and `tsc -b` all clean; `citations` PASS, 547 citations in 436
  files; `budgets` shows 12 files, none over. `comments` FAIL, 2962 problems, as expected and not a
  gate. These match the report.
- **Test count, file by file** (JSON reporter, branch vs `main`): 207 → 210 files. Outside
  `scripts/`: 1357 = 1357, no file differs. `anchors` 5→10, `citations` 60→67, `cli` 18→34, plus the
  new `comment-proof` 56, `comments` 61 and `scanner` 34. That makes +179, as reported.
- **No `src/` change:** `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github`
  is empty, so every golden and the corpus digest are byte-identical, trivially.
- **The scanner, independently:** `@typescript-eslint/typescript-estree`'s comment list against
  `scanSource` over all 403 files gives 7,178 comments on both sides, at identical positions in
  every file. No comment is returned twice. Zero-width nodes (`[, /* a */ , b]`), JSX `{/* */}` and
  a missing token each give one comment. The 6,949 → 7,178 explanation in `counts.txt` is right.
- **Patterns against game words:** I read every hit of patterns 3, 8–17 and the non-"Phase N slice"
  hits of pattern 2 in `comments` output on the tree. All are provenance: no boss-phase, "brief"
  as an adjective, or game "locked" or "decided" is hit. Pattern 8 hits only `H2a/H2c/H2d/C2a/C2b/C2c`.
- **4.2-G rehearsal, reproduced** from the evidence's mask in my own clone at `a7c4fa2`: 88 OK,
  `vite.config.ts` FAIL at printed line 26, exit 1. With `vite.config.ts` reset: PASS, 88, exit 0.
  The 11 entries match `phases/4.2/G/evidence/retitled-tests.md` (10 titles) plus the
  `renderFixture` part.
- **Planted faults, my own on that clone:** an untracked non-ignored file fails as added;
  `src/.DS_Store` and `*.local` pass; the stray `)` passes (fix 1).
- **`citations`:** with no paths, the branch's entry on `main`'s tree prints byte-for-byte what
  `main`'s entry prints. Named files pass on this mailbox's kickoff, plan review and report (7
  citations), and on the docs I edited (23 citations).
- **Mutations:** 47 applied in a scratch worktree, each run on the `docs-check` project and then
  restored. No `src/` file imports `scripts/`. 43 are killed, by the tests the plan's table names.
  Among them: the end-before-start filter, the trailing-range read, JSDoc walking, both
  leader-stripping paths, the anchored pragma, pattern 1's old form, pattern 11 bare, the citation
  requirement, `ASSUMPTION:` in a title, the config-file walk, the curry exclusion, the chain,
  block grouping, every mask rule (base masks `new`, head count, base count, the unconsumed check
  for unvisited files, whole-span masking, `old`=`new`, chain or swap), pragma text-only,
  `existsSync`, `--exclude-standard`, `-z` (newline splitting without `-z`; the `core.quotePath
  true` test fails), added, deleted and non-code checks, the CR strip, the quotation window, the
  nearest anchor and the section check, `sectionOf`'s stop level, and the `citations`
  outside-root, directory and no-paths branches. Survived: the pragma length check (fix 2),
  duplicate names-only and excess-only (fix 3), and the empty-`SyntaxList` leaf (benign, above).
- **Citations the diff adds:** `comments.ts` cites `CONVENTIONS.md#comment-why-not-what` and
  `#open-questions-get-an-interface`. Both targets state the rule the comment means.
- **Mailbox:** step files plus `evidence/` only. The `.tmp` is gone in `263ff57`. **To delete:**
  none.

## Docs edited

- `workflow/design-rules.md#writing`: a step file goes out only after
  `npm run docs:check -- citations <the file>` passes. This was the brief's "Decided, not built"
  for this PR review; the file argument lands on `main` with this PR.
- `phases/4.2/H/brief.md`, its list of decisions not built yet: the item above is removed, because
  it is built. 4.2-H2's gate-list item now also names the other docs that list CI's modes
  (`CLAUDE.md#how-the-spec-is-written`, `workflow/pr-review.md#2-install-and-run-the-gates`,
  `skills/slice-verify/SKILL.md`), as the report found.
- `CONVENTIONS.md#comment-only-golden-edits-are-allowed`: a comment-only edit is proved by
  `npm run docs:check -- comment-proof <base>`. That gives the tool its home, so the rule no longer
  says the reviewer strips comments by hand.
- `workflow/pr-review.md#4-verify-claimed-invariants-mechanically`: the comment-only check runs
  `comment-proof <base>` in the reviewer's clone.
- `phases/4.2/H/brief.md`, the `comment-proof` bullet: the pragma forms include ESLint's block
  config comments and the bundler annotations (D1).

`citations` passes, and `budgets` shows none over; `CONVENTIONS.md` is at 86%.
