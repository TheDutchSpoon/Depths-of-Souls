# PR review r3 — Phase 4.2 — Slice H1: Comment tooling

Reviewed branch `4.2-h1` at `358666b` ("fix 2 h2"), against round 2's `3358fe9` and `main` at
`a7c4fa2`, with `review-r2.md`, `handout-r2.md`, `report-r3.md` and `record.md`. Cloned, built and
run in my own sandbox (Node 22.22, `npm ci`); nothing ran in your working tree. Your local branch
and `origin/4.2-h1` are the same commit.

## Verdict: approved

All three hand-out items are built, and each is pinned by the tests the hand-out named. I re-ran
every mutation myself. The fix diff touches only `comment-proof.ts`, `comment-proof.test.ts` and
`scanner.test.ts` under `scripts/`, plus the mailbox and `CONVENTIONS.md` (my round-2 edit). There
are no real fixes and no hand-out. Please confirm the PR's CI checks are green before you merge: I
can't reach the GitHub API from my sandbox.

## Real fixes

None.

## Scope and labeling

- **Three things in the fix are unpinned, and each is fine.** I removed each one and the suite
  stayed green:
  - The order of the two syntax checks. With the base checked first, a file broken on both sides
    would report the base. No test has a file broken on both sides. Either order prints a true
    message and fails the file, so nothing needs pinning.
  - `scriptKind(file)` passed to `ts.createSourceFile`. Without it, TypeScript picks the kind from
    the extension, and that gives the same kind as the scanner's `scriptKind` for every extension
    in scope (`.d.ts` and `.ts` → TS, `.tsx` → TSX, `.js/.cjs/.mjs` → JS, `.jsx` → JSX). So the
    report's reason ("so `.tsx` and `.js` parse as before") is wrong: they'd parse the same without
    it. Keeping it is still right, because it ties the syntax check to the scanner's parse by
    construction.
  - The host's `fileExists` and `readFile`. Nothing calls them for a one-file program with
    `noLib` and `noResolve`. They keep the host from ever reading the disk. Harmless.
- **The `jsx` option is gone.** That's what round 2 asked.
- **The record's evidence line was stale** (it stopped at round 2's mutations). I updated it
  (Docs edited).
- **`.aikido`** is still in the PR diff against `main` (your commit `9164577`). As in round 2, it's
  your call and nothing to review.
- **The report's spec question** stands as answered in round 2: the guarantee lives in
  `CONVENTIONS.md#comment-only-golden-edits-are-allowed`, and the mask format and pragma list stay
  in the tool's header, `USAGE` and `record.md`.

## Decide-points

None.

## What I verified, and how

- **Gates** (my run on `358666b`): test 210 files, 1682 tests, 1681 passed and 1 skipped; lint,
  format check, `tsc -b` and build clean; `citations` PASS, 547 citations in 436 files; `budgets`
  12 files, none over. These match the report.
- **Test count, file by file** (JSON reporter). `docs-check` project, `3358fe9` → `358666b`:
  318 → 325, only `comment-proof.test.ts` (65 → 67) and `scanner.test.ts` (43 → 48). Whole suite,
  `main` → branch: 1478 → 1682. Outside `scripts/` it's 1357 → 1357 over the same 201 files, none
  differing. Inside `scripts/` it's 121 → 325.
- **No `src/` change:** `git diff --stat origin/main -- src vite.config.ts eslint.config.js .github`
  is empty. Against `main`, nothing outside `scripts/` and `.claude/` differs except `.aikido`.
  Goldens and the corpus digest are byte-identical, trivially.
- **Each hand-out item, in the code:**
  - **Item 1.** `syntaxError` builds a one-file program (`noLib`, `noResolve`, `allowJs`) and
    reads `getSyntacticDiagnostics`. The host serves only that file.
  - **Item 2.** The five prose rows are in `scanner.test.ts`.
  - **Item 3.** The message says which side ("in the working tree" or "in the base"), with the
    working tree checked first. The header's pragma sentence is wrapped at 100 columns.
- **Mutations** (12, mine, whole `docs-check` project, each restored, tree clean after).
  Killed:
  - `.d.ts` back through `transpileModule`: both new declaration-file tests.
  - `BLOCK_PRAGMA` without `^`: the `reset the global state` and `The global spell registry` rows.
  - Without the `\s` after `eslint`, `globals?` and `exported`: one row each (`eslintrc`,
    `globalThis`, `exportedNames`).
  - Labels swapped: 3 tests.
  - The base labelled "working tree": the base test.
  - The base not checked: the base test.
  - The working tree not checked: 2 tests.

  Survived: the three above (check order, `scriptKind`, `fileExists`/`readFile`), all
  behaviour-neutral or truthful either way.
- **The whole tree through the new syntax check:** in a scratch clone at `358666b`, I appended a
  comment line to every in-scope file (403, one of them `.d.ts`), then ran `comment-proof HEAD`.
  Result: PASS, 403 changed files, exit 0. No file gives a false syntax error, and nothing throws.
- **4.2-G rehearsal and the round-3 planted faults, reproduced** in my own clone at `a7c4fa2` with
  the evidence's mask (11 entries):
  - As-is: `vite.config.ts` FAIL at printed line 26, exit 1.
  - With `vite.config.ts` reset: PASS, 88 files, exit 0.
  - `node-shims.d.ts` with "Phase" → "Stage" in its first comment: `OK`, PASS, 89 files, exit 0.
  - A stray `)` appended to it: `FAIL src/engine/__corpus__/node-shims.d.ts: syntax error in the
    working tree at line 27: Declaration or statement expected.`, exit 1.

  All four match `evidence/planted-faults.txt`.
- **Mailbox:** step files, `record.md` and `evidence/` only. **To delete:** the empty `.vitest/`
  folder at the repo root. It dates from round 2's run, and round 3 created no new one.

## Docs edited

- `phases/4.2/H1/record.md`, its Evidence line: the mutation check counts round 3's 6 runs, and the
  line names `report-r3.md`. The record becomes immutable at merge, so it has to be right now.

`citations` passes on this file, and `budgets` shows none over.
