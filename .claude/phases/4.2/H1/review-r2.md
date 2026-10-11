# PR review r2 — Phase 4.2 — Slice H1: Comment tooling

Reviewed branch `4.2-h1` at `3358fe9` ("fix h1"), against round 1's `263ff57` and `main` at
`a7c4fa2`, with `review-r1.md`, `handout-r1.md`, `report-r2.md`, `phases/4.2/H/brief.md` and
`CONVENTIONS.md`. Cloned, built and run in my own sandbox (Node 22.22, the lockfile's Vitest 5.0.3,
TypeScript 6.0.3, ESLint 10.12.0, Vite 8.3.3 on Rolldown); nothing ran in your working tree.

## Verdict: fixes

All four round-1 items are built, and each is pinned by the test the hand-out named: I re-ran every
mutation myself. But fix 1 brought in a regression. `ts.transpileModule` throws on a `.d.ts` file, so
a comment-only edit to a declaration file now crashes `comment-proof`. At `263ff57` the same edit
passed. The tree's `src/engine/__corpus__/node-shims.d.ts` carries three `comments` hits that
4.2-H2's sweep will reword, so 4.2-H2's proof would hit this crash. There is also one unpinned
condition, and it's my fault: round 1's hand-out said the existing anchor mutation covered the new
pragma forms, but they went into a separate regex. A round 3 would check only the hand-out's three
items.

## Real fixes

1. **A `.d.ts` file crashes the syntax check.** `transpileModule` emits nothing for a declaration
   file and throws `Debug Failure. Output generation failed` before its diagnostics come back. To
   reproduce: in a scratch repo, commit `src/shims.d.ts` (`// shim for node` plus a `declare const`),
   change `node` to `Node` in the comment, then run `comment-proof HEAD`. The result is that message,
   exit 1, and no file named. `263ff57` gives `OK src/shims.d.ts`, PASS. The tool fails closed, but
   it can't prove a legitimate change and doesn't say which file broke it. The fix is a one-file
   program's `getSyntacticDiagnostics` (public API). I checked that it returns nothing for a clean
   `.d.ts`, `.ts`, `.tsx` (JSX, no `jsx` option) and `.js`, and returns `Declaration or statement
   expected.` for a stray `)` in a `.ts` and in a `.d.ts`.
2. **`BLOCK_PRAGMA`'s anchor and word boundary are unpinned.** Drop the `^` and the suite stays green,
   though 10 block comments on today's tree then count as pragmas (for example
   `src/engine/__fixtures__/biomes.ts`'s `/** The global spell registry …`). Rewording any of them
   would then fail `comment-proof`. Drop the `\s` after each word and the suite also stays green: no
   comment on the tree is affected today, but `/* globalThis … */` would become a pragma. The cause
   is round 1's hand-out ("the existing unanchored-pragma mutation covers the anchor"). That was true
   of `PRAGMA`, but the agent put the block-only forms in their own regex, and each regex needs its
   own pin.

## Scope and labeling

- **The syntax-error message doesn't say which side** (hand-out item 2, cheap). A file broken only in
  the base reports `syntax error at line 3`, and line 3 of the working tree is fine. My round-1
  wording ("working tree or base, whichever has it") left this open.
- **`jsx: Preserve` does nothing.** The report says it stops a `.tsx` file from reporting the missing
  JSX option. I couldn't reproduce that: with and without the option, `transpileModule` reports no
  diagnostic on a JSX sample or on any of the tree's 425 files. Removing it kills no test. Fix 1
  replaces the call anyway, and the hand-out keeps an option only if a test needs it.
- **The report's JSDoc note is wrong, and the behaviour is fine.** ESLint 10.12 does not read
  `/** global foo */` as a directive: `no-undef` still fires, and it doesn't for `/* global foo */`.
  So `comment-proof` treats a few JSDoc comments as pragmas that ESLint ignores. That errs toward a
  loud false FAIL, never a false PASS, and no JSDoc on the tree starts with these words. `PRAGMA`'s
  `eslint-` in a line comment errs the same way and was accepted at A8. No change.
- **The bundler forms match Vite's bundler exactly.** Built with Rolldown: `/*#__PURE__*/ f()` and
  `// #__PURE__` before `f()` drop the call; `/* note: #__PURE__ */` and `/* see @__PURE__ here */`
  keep it. Anchoring at the start of the body is right.
- **One test covers both appended-pragma cases**, where the hand-out asked for two. With the length
  condition removed, only the first `expect` is seen to fail. I disabled that first `expect` and
  re-ran: the second case (a pragma added to a file with none) fails on its own. Accepted.
- **`.aikido`** (your commit `9164577`, which excludes `scripts/docs-check/` from Aikido's scan) is in
  the PR diff against `main`. Round 1 didn't mention it. It's your call, and nothing to review.
- **CI not checked by me** (no GitHub API from my sandbox). Please confirm the PR's checks are green.
- **The report's spec question** (the mask format, syntax rule and pragma forms have no home in the
  docs): the guarantee lives in `CONVENTIONS.md#comment-only-golden-edits-are-allowed`, which now
  includes the syntax rule (Docs edited). The mask format and the pragma list are the tool's own
  behaviour. They live in `comment-proof.ts`'s header, `USAGE` and `record.md`, and a second copy
  in a living doc would drift.

## Decide-points

None. All three hand-out items have a failing case and an obvious fix.

## What I verified, and how

- **Gates** (my run on `3358fe9`, `npm ci`): test 210 files, 1675 tests, 1674 passed and 1 skipped;
  lint, format check, build and `tsc -b` clean; `citations` PASS, 547 citations in 436 files;
  `budgets` 12 files, none over. These match the report.
- **Test count, file by file** (JSON reporter, `docs-check` project, `3358fe9` against `263ff57`):
  300 → 318. Only `comment-proof.test.ts` (56 → 65) and `scanner.test.ts` (34 → 43) changed. The fix
  diff touches only `scripts/docs-check/` and `.claude/`. Against `main`, nothing outside `scripts/`
  and `.claude/` differs except `.aikido`, so the 1357 tests outside `scripts/` are round 1's,
  verified file by file there.
- **No `src/` change:** `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github`
  is empty. Goldens and the corpus digest are byte-identical, trivially.
- **Each round-1 item, in the code:** `compareCode` checks syntax on the working tree, then on the
  base, before anything else (1). The length condition is unchanged and now has its own test (2).
  `duplicatesGrew` is exported, `compareCode` calls it, and `duplicates`' excess count matches the
  tests' arithmetic: `[t,t,t]` has 1 name and excess 2, `[t,t,u,u]` has 2 names and excess 2 (3).
  `BLOCK_PRAGMA` is applied to `/*` comments only, and `PRAGMA` gained `[#@]__(NO_SIDE_EFFECTS|PURE)__`
  (4). Against ESLint 10.12's own pattern (`lib/shared/directives.js`, and `source-code.js` keeping
  every directive except `eslint-disable(-next)-line` out of line comments), the block-only forms
  are right.
- **Mutations** (13, mine, on the `docs-check` project, each restored): killed are dropping the
  syntax check (2 tests), checking the working tree only (the base test), checking the base only
  (the stray-token test), the line number off by one (2), dropping the length condition (the
  appended-pragma test), names-only and excess-only duplicates (one `duplicatesGrew` test each),
  dropping the `/*` guard (the line-comment test), dropping `__PURE__` (3), and `#` only (2).
  Survived: `jsx: Preserve` removed (does nothing, above), and `BLOCK_PRAGMA` without `^` or
  without `\s` (fix 2).
- **The whole tree through the syntax check:** 425 `.ts/.tsx/.js` files, 0 diagnostics with or
  without `jsx: Preserve`, and one throw: `src/engine/__corpus__/node-shims.d.ts` (fix 1).
- **4.2-G rehearsal and planted faults, reproduced** in my own clone at `a7c4fa2` with the
  evidence's mask: as-is, `vite.config.ts` FAIL at printed line 26, exit 1. With it reset: PASS, 88,
  exit 0. A stray `)` appended to `src/engine/rng.ts` gives `syntax error at line 57: Declaration or
  statement expected.`, exit 1. An appended `/* eslint no-console: off */` gives `pragma differs:
  base (none)`, exit 1. Both match `evidence/planted-faults.txt`.
- **Mailbox:** step files, `record.md` and `evidence/` only. **To delete:** the empty `.vitest/`
  folder at the repo root (the report's JSON file in it is gone; the folder remains).

## Docs edited

- `CONVENTIONS.md#comment-only-golden-edits-are-allowed`: what `comment-proof` passing guarantees now
  includes "both sides parse without a syntax error", the rule round 1 decided and this PR built.

`citations` passes on this file and the hand-out, and `budgets` shows none over.
