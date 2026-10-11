# Record — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

**Status: built.** Golden policy byte-identical: every changed fixture's exports deep-equal to
`main`'s, the corpus digest unchanged, and the `src/` diff is comments and 10 test titles only
(the TypeScript printer with comments stripped and titles masked prints all 88 changed files
identically). Test count 1478 (1477 passed, 1 skipped): `main`'s 1357 file by file under `src/`, plus
121 tests of the docs checks.

## What was built

- **`citations`** (`npm run docs:check -- citations`, blocking in CI): every `src/*.ts(x)` and
  `.claude/**/*.md` outside `phases/` and `archive/` cites the docs as `<path>.md#<anchor>`, with the
  path rooted at `.claude/`. It fails on an anchor that doesn't resolve, on an old form
  (`CONVENTIONS "…"`, `GAME_DESIGN §…`; in `src/` also a bare `GAME_DESIGN`, `species-locked` or
  `CONVENTIONS`), and on a label form (`` `path.md` "Label" ``, a paren list, `<NAME> "Label"`). It
  reads the working tree and never calls git.
- **`budgets`** (reported in CI, never fails): each doc in `workflow/budgets.md` against its size
  (UTF-8 bytes, `\r` removed, 1 KB = 1000 bytes).
- **The inventory modes, generalized**: `inventory-skeleton <mailbox> <file>… [--base <rev>]` and
  `inventory <mailbox>` guard a condense of any living doc. The skeleton lists the units of the files
  as committed at the base (default `HEAD`) and writes the resolved sha into `inventory.md`; the
  check reads the units at that sha, so it still sees the pre-condense text after the condense is
  committed. No pinned commit, no map, no local `main`. `move` and `line-proof` are gone.
- **`resolveAnchors`** follows GitHub's slug loop (`a`, `a`, `a-1` give `a`, `a-1`, `a-1-1`).
- **The script is split** so tests can import it: `scripts/docs-check.ts` is the entry,
  `scripts/docs-check/{anchors,budgets,citations,cli,git,inventory,text}.ts` the logic, each function
  taking the root as an argument; every mode takes `--root <dir>`. Exit 0 pass, 1 problems or a tool
  error, 2 bad usage. 121 tests in `scripts/docs-check/*.test.ts`, run by a third Vitest project,
  `docs-check` (`vite.config.ts`); the two existing projects are untouched.
- **CI**: `deploy.yml`'s `test` job runs both modes after `format:check`.
- **243 old citations in `src/`** (232 comments, 10 test titles, the corpus-digest header template)
  rewritten to anchors by a one-off script, from the plan's mapping (31 rows from the B–F inventories,
  206 hand-mapped, 6 review overrides). **235 label-form cross-links in 215 forms in the living
  docs**, and 44 same-file label references, converted to anchors. The docs script edited citations
  and nothing else.
- **Round 2:** the starters' affinity comment in `data/species/starters.ts` was rewritten whole (it said where
  each affinity is set instead of claiming the docs left it unpinned), and nine `~` citations were
  re-pointed at the heading that states the fact. The test count is 1478 (1477 passed, 1 skipped): one more
  `src/` wrap test in `citations.test.ts`.
- **22 stale `src/` comments** rewritten whole to `CONVENTIONS.md` "Comment why, not what", and the
  Splashing comment at `engine/effect-types.ts` (Splashing uses `actions.ts`'s private
  `adjacentLivingTargets`; the dedupe is ROADMAP Phase 4.5). `eslint.config.js` got the same
  citation rewrite.

## Decisions made while building

- The corpus-digest template's citation is rewritten (D1), so `renderFixture`'s header equals the
  committed fixture's header byte for byte.
- Same-file label references are converted when the quoted text equals exactly one heading of the
  same file (D2); one was left alone because it names a selector, not the rule.
- `data/species/starters.test.ts`'s title cites `spec/progression.md#specializations` without the
  old quotation, and no spec rule was added for distinct starter affinities (D3).
- A `species-locked` quotation, a `CONVENTIONS: "…"` quotation and a `GAME_DESIGN` quotation are kept
  next to the new anchor: they quote content, not a heading.
- The span of a rewritten citation includes a possessive after the name; a wrapped label whose tail
  sat in the next `//` comment was cleaned by hand (the script's span cannot cross two comment
  ranges).

## Evidence

`phases/4.2/G/evidence/` (see `report-r1.md`).
