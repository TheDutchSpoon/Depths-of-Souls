# Kickoff — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md, including its Phase 4.2
exception: you write the living docs **by script**, and the script edits citations in them and
nothing else.

## Read (in addition to the standing list)

- Spec files: none as a whole. For each stale comment you fix, read the spec rule (or content
  entry) the corrected comment cites, and check the comment against the code, never against the old
  comment. The list touches `spec/combat.md`, `spec/effects.md`, `spec/responses.md`,
  `spec/scripting.md`, `spec/statuses.md`, `OPEN_QUESTIONS.md` ("Balance numbers") and the content
  docs (`content/`, `specializations/`).
- `.claude/phases/4.2/G/brief.md`, all of it. Its Scope bullets list every stale comment known
  today, and "Known from earlier slices" and "Known from 4.2-A's review" are part of the scope.
- `.claude/phases/4.2/brief.md`: "Rules for the new spec" (rule 4), "The file map", "Checks",
  "Condensing rules", "Inventory format", "Phase-4.2-only text".
- The inventories, the citation script's map from old text to new anchors:
  `.claude/phases/4.2/{B,C,D,E,F}/inventory.md`. Also `B/verify-r1.md` "Stale comments in `src/`
  (for 4.2-G)", and the stale-comment sections of the D, E and F verify reports, which the brief
  summarises.
- `CONVENTIONS.md`: "Comment why, not what" (rewritten at this kickoff), "Comment-only golden
  edits are allowed", "Every pull request runs the gates",
  "Local runs match CI's toolchain".
- Code: `scripts/docs-check.ts` (the whole file: what stays, what goes, what generalizes),
  `.github/workflows/deploy.yml`, `tsconfig.node.json`, `vitest.config.ts`.
- `.claude/workflow/budgets.md`: new, written at this kickoff. The `budgets` mode reads it.

## Scope

Rewrite every old citation (`CONVENTIONS "…"`, `GAME_DESIGN §…`, bare `GAME_DESIGN` /
`CONVENTIONS` section references, `species-locked.md`) in `src/` and the living docs to
`<path>.md#<anchor>`, by script, mapped through the B–F inventories and hand-mapped where they
don't resolve. Convert every label-form cross-link the condensing slices left (`` `spec/x.md`
"Label" ``, `WORKFLOWS "…"` and the like) to an anchor. Fix the stale `src/` comments the brief
lists, to `CONVENTIONS.md` "Comment why, not what". Add the `citations` mode (blocking, run in CI) and the `budgets` mode (reported, run in CI,
never fails). Remove `move` and `line-proof` and their helpers. **Generalize**
`inventory-skeleton` and `inventory` so they guard a later budget condense of any file.

**Out of scope:** any code change in `src/` (the Splashing dedupe is in ROADMAP Phase 4.5);
stripping provenance ("Phase 4 Slice C", "ASSUMPTION 14", "PR #73 review") from comments you aren't
otherwise rewriting: that is 4.2-H, the next slice;
editing any living-doc text other than citations; the step files and skills the design agent
rewrites at the PR review (`workflow/condense.md`, `skills/slice-verify/`, `workflow/pr-review.md`,
the `coding-rules.md` exception, the `WORKFLOWS.md` pointer, `CLAUDE.md` "How the spec is
written", the ROADMAP close).

**Decided at this kickoff (Duncan):**

1. **Test titles:** the 10 citations in `describe`/`it`/`test` titles (all in `src/data/**` and
   `src/engine/*.test.ts`; `grep` them) are rewritten too. The comment-only proof widens to mask
   those title strings. No other string literal may change: if a citation turns up in any other
   string, stop and list it.
2. **Budgets** live in `workflow/budgets.md` (a table the script parses), not in the script. That
   covers the 10 spec files, `CLAUDE.md` and `CONVENTIONS.md`.
3. **Inventory modes generalize instead of being deleted.** Requirements (the interface is yours,
   marked ASSUMPTION):
   - they take one or more living-doc paths and a base revision (default: `HEAD`, i.e. the
     committed file before an uncommitted condense) instead of the pinned commit, the map and the
     slice table;
   - the skeleton writes the resolved base sha into `inventory.md`, and the check reads the units
     at that sha, so a check run after Duncan commits the condense still sees the pre-condense
     text;
   - no `git merge-base`, no local `main`;
   - the unit definition (phase brief "Inventory", A9), the fates and the row check stay as they
     are;
   - the mailbox path is an argument, not `phases/4.2/<slice>`.
4. **Splashing:** fix the comment at `engine/effect-types.ts:760` only. It should say Splashing
   uses `actions.ts`'s private copy. Don't touch the code or `targeting.test.ts`.

**The kickoff's reading of rule 4, open to override at the plan review:** after this slice,
citations are anchors. So `citations` fails on (a) a `<path>.md#<anchor>` that doesn't resolve to
exactly one heading, (b) an old form (`CONVENTIONS "…"`, `GAME_DESIGN §…`), and (c) a label form
(`` `<path>.md` "…" ``, `<NAME> "…"` for a top-level living doc), in `src/` and in `.claude/` outside
`phases/` and `archive/`. Bare prose mentions of a file ("most of it CONVENTIONS and GAME_DESIGN"
in ROADMAP's 4.2 entry) are not citations. The plan says whether to also fail on any mention of a
deleted doc (`GAME_DESIGN`, `species-locked`), as an ASSUMPTION.

## Golden policy

**Byte-identical.** Every golden's expected values and the corpus digest are unchanged. Golden
fixtures change only in comments (CONVENTIONS "Comment-only golden edits are allowed"). The 12
fixtures citing `species-locked.md` and those citing the old docs are in the rewrite. No test is
added or removed under `src/`. 10 test titles change.

## Traps

- **`resolveAnchors` collides on suffixed slugs.** Headings `a`, `a`, `a-1` give `a`, `a-1`,
  `a-1` here, but GitHub gives `a`, `a-1`, `a-1-1`. It must be fixed before the check blocks,
  because "exactly one heading" depends on it. Gaps (2) indented headings and (3) `_emphasis_` or
  HTML entities need fixing only if a living doc has such a heading: the plan says whether any
  does.
- **Comments are found with the TypeScript scanner, not by line regex.** `//` occurs inside
  strings and URLs. Rewrite only comment ranges and the 10 titles. The proof re-parses both trees
  (`removeComments: true`, titles masked) and compares bytes.
- **An inventory row is not an answer.** Citations name an old *section by label*. The script maps
  label → heading line at `892f1b8` → unit → inventory row, and the row can mislead in three ways:
  - `dropped` rows have no New home. Use the home the Reason names.
  - `merged`/spread rows list several anchors. Pick one by hand, in the plan.
  - New homes can be stale. B's three are known (brief "Known from earlier slices"). `inventory C`,
    `D` and `E` all pass today (run 2026-10-11 at base `3fd6a8f`). Run them once more before you
    generalize the modes, and keep the output in `evidence/`. B and F can't be re-run.

  Resolve every mapped anchor against today's tree before writing it.
- **Citation paths are `.claude/`-rooted plain text** (`spec/combat.md#damage-channels-and-the-additional`),
  the same from `src/`, from a file in `spec/`, or from `workflow/`. They are not Markdown links
  relative to the citing file. Targets in `phases/` are allowed (immutable once merged).
- **More than one label form exists.** On 2026-10-11, `.claude/` outside `phases/`/`archive/` held:
  - 164 backticked `` `path.md` "Label" `` links;
  - bare-name forms: `WORKFLOWS "…"` (3), and `CONVENTIONS "…"` at `workflow/coding-rules.md:34`
    and `WORKFLOWS.md:126`;
  - two targets into the phase brief, one of them spelled `.claude/phases/4.2/brief.md`.

  The plan lists every form found, with counts. A *prose example* of a now-forbidden form in
  `workflow/` or `skills/` is not a citation. List it for the design agent, and don't special-case
  it in the check.
- **Old citation counts in `src/` (2026-10-11):**
  - 121 lines mention `CONVENTIONS` (53 of the form `CONVENTIONS "`);
  - 52 lines mention `GAME_DESIGN` (40 of the form `GAME_DESIGN §`);
  - 70 lines cite `species-locked`.

  Bare references ("(CONVENTIONS, 4.1-C2c)", "GAME_DESIGN's ranges") are in scope even where the
  check's shapes wouldn't catch them.
- **`citations` and `budgets` must not call git.** CI's checkout is shallow and has no local
  `main`. Both read the working tree. Only the generalized inventory modes use `git show`.
- **`noUnusedLocals` is on for `scripts/`** (`tsconfig.node.json`). Removing `move` and
  `line-proof` strands helpers (A's review lists `capitalise`, `sha256`, `SPEC_NAMES`, `row` and its
  `D`/`E`/`F`, `pinnedCache`, `MAP`, `READ_WHEN`, the brief parsers). `tsc -b` fails on any left
  behind. The generalized inventory modes keep what they still use. Update the script's header
  comment to name what stays.
- **The check blocks CI but has no tests today.** `vitest.config.ts` collects only `src/**`. Every
  failure mode of `citations` needs a test that fails it: the slug collision, an unresolved anchor,
  each old form, each label form. So does the generalized inventory: a missing row and a wrong
  base. Where those tests live, and whether the Node project's `include` widens to `scripts/**`, is
  an ASSUMPTION. A widened `include` changes the test count, so reconcile it.
- **CI runs Node 24 with type stripping.** No new dependencies, and keep `erasableSyntaxOnly`
  syntax. Add the two modes to the `test` job of `deploy.yml`.
- **Rewriting a citation doesn't mean rewriting its comment.** A stale comment you fix is
  rewritten to CONVENTIONS "Comment why, not what" (why, not history; cite, don't restate). A
  comment you touch only because the script rewrote its citation keeps its other text, provenance
  included, so the mapping table stays mechanical and 4.2-H does the judgment pass.
- **The Phase 4.2 exception is narrow.** Your script may edit citations in the living docs and
  nothing else. You don't edit `workflow/budgets.md`, the briefs, the step files or the skills:
  anything they need goes under **Spec questions**.

## Must stay green

`npm run test`, `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`, with every
golden and the corpus digest unchanged, plus `npm run docs:check -- citations` and
`npm run docs:check -- budgets` (all 12 files under budget). The test count under `src/` is unchanged
file by file.

## The PR must prove

- **Comment-and-title-only `src/` diff:** for every changed file, strip comments (TypeScript
  printer, `removeComments: true`) and mask every `describe`/`it`/`test` first argument in both
  `main` and the branch. The two are byte-identical. Show the script's output in `evidence/` and
  list the 10 retitled tests.
- **The mapping table** (`evidence/`): every rewritten citation as file:line, old text → new
  anchor, and its source (inventory row, or hand-map). Every hand-map (the seven never-matching
  citations, B's three stale anchors, every `dropped` and spread row) is approved at the plan
  review.
- **`citations` passes, and each failure mode fails:** planted-fault runs (slug collision
  `a, a, a-1`, an unresolved anchor, each old form, each label form), each exiting non-zero with
  the file:line.
- **CI runs both modes:** the `deploy.yml` diff. `budgets` prints all 12 files against
  `workflow/budgets.md` and exits 0 on a planted over-budget file.
- **None left:** before/after counts of old forms and label forms in `src/` and `.claude/`
  (outside `phases/`/`archive/`), with the after counts zero.
- **The generalized inventory works:** in a scratch clone, condense one file (drop a paragraph
  from `spec/store.md`, say), run the skeleton, fill all rows but one, and show the check failing
  on the missing row. Then fill it and show the check passing, after committing the condense in the
  clone (the base sha is read from the file).
- **Stale comments:** each one as file:line, old → new, with the code fact it was checked against
  (e.g. `data/statuses.ts` Poison 40, `data/balance.ts:18` boss offset 5).
- **The `Phase 4.2 only` grep:** `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases`
  finds nothing in `src/` or `scripts/`. In `.claude/`, it finds only `workflow/coding-rules.md`,
  `WORKFLOWS.md`, `workflow/condense.md` and `skills/slice-verify/SKILL.md`, which the design agent
  rewrites at the PR review.
- **To delete:** none expected. Nothing is deleted in this slice.

---

## Docs edited at this kickoff

- `CLAUDE.md`: removed the `(Phase 4.2 only)` "During the transition" paragraph. Its old-form
  citation examples would fail the new check, and the phase brief keeps the same note.
- `ROADMAP.md`: Phase 4.2 marked "Done: 4.2-A to 4.2-F" (was A to E). Phase 4.5's "Decided, not
  built" gains the Splashing adjacency dedupe.
- `phases/4.2/brief.md` "Checks": `move` and `line-proof` are removed and the inventory modes
  generalized. Budgets cover `CLAUDE.md` and `CONVENTIONS.md` too, and are read from
  `workflow/budgets.md`.
- `phases/4.2/G/brief.md`: the four kickoff decisions (test titles, budgets file and scope,
  generalized inventory modes, Splashing), the clean-up table (rewrite instead of delete; the
  CLAUDE.md note removed now), and the PR-must-prove lines that change with them.
- `workflow/budgets.md` (new): the 12 budgets, from today's sizes + 20%, rounded up to a whole
  KB.
- `CONVENTIONS.md` "Comment why, not what": rewritten from one line to the comment rule (why, no
  provenance, cite don't restate, `// ASSUMPTION:` only for live open questions, golden arithmetic
  kept), so the comments this slice fixes already follow it.
- `phases/4.2/brief.md`: 4.2-H added (slices table, the `src/` line, the loop line).
- `phases/4.2/H/brief.md` (new): the comment sweep, after this slice.
- `phases/4.2/G/brief.md` (again): the doc-writing rules' reader/writer split, done at this slice's
  PR review; the phase closes at 4.2-H.
- `ROADMAP.md` (again): Phase 4.2's summary names 4.2-H. Phase 8's "Masteries were considered and
  are out of scope" deleted as stale (Duncan): it predates the Sorcerer's Mastery perks and read as
  contradicting them.
- `OPEN_QUESTIONS.md`: "Off-affinity spell equipping" removed. It was stale: the exception is
  designed, as the Sorcerer's five Mastery perks (inert until Phase 8).
- `spec/creatures.md`: "Spells" no longer points at the parked item (the gate has no exception on
  `main`; the Masteries lift it from Phase 8); "Gems as items" (Not built) names the Masteries as the
  gate's one exception.
