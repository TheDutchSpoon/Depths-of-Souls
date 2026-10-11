# PR review r1 — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

Reviewed `report-r1.md` against the kickoff, `plan.md`, `plan-review.md`, `G/brief.md`, the phase
brief and the living docs, on branch `4.2-g` at `e53ce62`, pulled and run in my own clone (Node
24.21.0, `npm ci` on both trees). CI's own result I couldn't see (the GitHub UI is blocked).

## Verdict: fixes (small)

The slice does what the kickoff asked, and the claims I could check mechanically all hold. The
fixes are four small items, all comments, tests or a doc comment (`handout-r1.md`): nine citations
that point at a weaker heading than the one stating their fact, one comment the rewrite turned
into a false attribution, a misnamed test with a missing case, and a doc comment that disagrees
with its function. None touches code or a golden's values.

## Real fixes (in `handout-r1.md`)

1. **Nine `~` citations have an exact home.** Plan review A12 sent the 21 `~` rows to the PR review
   to check whether a rule was lost between slices. **None was.** Every fact still has a home,
   and for nine of them the home isn't the heading the rewrite chose:
   - `golden-dot.fixture.ts:15`, `:171` say `createCombat` starts `currentHp` at effective max. That
     is `spec/statuses.md#health-is-a-modifiable-stat`, not `#fight-setup`, which never mentions
     HP. `:15` also quotes old GAME_DESIGN wording beside the anchor; it goes.
   - `golden-spore-spread.fixture.ts:21`, `golden-sporecloud-reaper-no-spore.fixture.ts:14` say
     `on-attack` fires before the hit. That is `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles`
     verbatim, not `spec/effects.md#hook-execution`.
   - `data/traits/glimmerdark.ts:438` cites "the named example" of `scalingStat` (Thorns and Shield
     Bash off Defence). That is `spec/responses.md#magnitude-modes`, not `#flat-mode`.
   - `state/integration.test.ts:397` cites the *accepted risk* of compounding per-fight losses. That
     is `OPEN_QUESTIONS.md#fight-count`; the plan's own note said so.
   - `golden-shieldbarer-starter.fixture.ts:9` (a one-step golden driven by an explicit
     `resolveTurn`) → `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` (the optional
     driver), not `#golden-replay-tests`.
   - `data/species/overgrowth.ts:19` (affinity is per creature) → `spec/creatures.md#affinity`
     ("it lives on the creature, so one species can hold several"), not `#reading-this-biome`.
   - `data/species/starters.ts:19` (each starter's "high X") → the three starter entries in
     `specializations/`, not `spec/progression.md#starter-species-are-stubs`.
2. **`data/species/starters.ts:22-30` now attributes "ideally distinct" to the spec.** After the
   rewrite it says `spec/progression.md#starter-species-are-stubs` "explicitly left the …
   starters' affinity unpinned ("… ideally distinct")". The section says nothing of the sort, and
   D3 decided distinct starter affinities are not a rule. That is why the quote came out of
   `starters.test.ts`'s title. The block is also stale: the affinities are pinned in the starter
   and Unicorn entries, and the soft affinity→stat mapping is `spec/creatures.md#affinity`, not
   `CLAUDE.md`. It is rewritten whole, as a 23rd stale comment.
3. **A test name and a missing case.** `citations.test.ts` "passes a src/ comment wrapped with a
   block-comment leader only for the anchor form" asserts a *failure*. It is also the only test
   that catches removing the ` * ` leader from the `src/` gap (my mutation 3). Plan-review fix 3
   asked for a ` * `-wrapped label form at the `src/` site as well. It isn't there.
4. **`parseBudgets`' doc comment** says "the first table"; the code reads every table row.

The other twelve `~` rows stand. Seven already cite the heading that states the fact:
`balance-types.ts:66` (Souls: summoning is "free"), `actions.ts:666` (Targeting override:
"Confusion redirects only a harmful action"), `resolution-types.ts:97` (perform-action: a refused
grant "emits nothing of its own"), `golden-defend-count-additive-cap.fixture.ts:11` ("Keep fixtures
small"), `integration.test.ts:399` ("A loss or draw ends the descent"), `overgrowth.ts:7` and
`rotcap-hollow.ts:8` (the roles). One more is exact after a one-clause spec edit I made:
`golden-heal-scaling-count.fixture.ts:8` (a creature dead at round start gets no turn).
`spec/combat.md#turn-queue` now says the queue holds the *living* creatures, which is what
`buildTurnQueue` does (`turn-order.ts:47`). Before, only `spec/statuses.md#turn-order` said so, in
passing. Three are the closest home and fine as that: `spells/core.ts:27`,
`spells/index.test.ts:129` and `rotcap-hollow.ts:14`.

## Scope and labeling (not fixes)

- **Quotations beside the new anchors.** About 40 comments and one test title
  (`overgrowth.test.ts:125`) keep an old `species-locked.md`/`GAME_DESIGN`/`CONVENTIONS` quotation
  next to an anchor whose section doesn't contain it (`evidence/review-quotations.txt`). Plan A9
  kept them on purpose and the report lists them for 4.2-H. Duncan decided at this review that H
  enforces it: a quotation beside an anchor is the target's own words, or it goes. That is now in
  H's brief.
- **Rewrite residue** (a dropped possessive, a label echoed after its anchor, "B2 rule 2") is
  cosmetic and listed in H's brief, "Known from 4.2-G's review". It is in comments only, and the
  kickoff kept touched-only comments mechanical.
- **No comment scanner or comment-only proof was committed** (A16: one-off scripts). That was
  fine for G, but H's brief claimed to reuse them. Duncan decided H commits both, as `docs:check`
  modes (`comments`, `comment-proof <base>`).
- The citation script re-flowed some wrapped doc lines past 100 columns. `.claude` isn't
  Prettier-checked, so it's harmless.

## Decisions (Duncan, at this review)

- **A budget condense runs as its own docs-only slice**, before the next kickoff, with the roles
  swapped: the design agent condenses with the inventory guard (`/slice-condense`), and the coding
  agent verifies (`/slice-verify`). This keeps the independent verify that found real losses in
  4.2-B to F. The alternative was condensing inside the review that went over. Written into
  `WORKFLOWS.md`, `workflow/condense.md`, `workflow/budgets.md#over-budget` and
  `skills/slice-verify/`.
- **Over budget: raising the budget is a real option**, not only a fallback, but condensing or
  splitting is preferred where it makes sense, because it cuts what every reading chat pays for.
  Raise when the growth is new rules that belong with the file's others, so a split would scatter
  one subsystem. Written into `workflow/budgets.md#over-budget`; `pr-review.md` keeps only the trigger, since
  most reviews never go over (Duncan).
- **4.2-H's scope grows by two items:** the quotation rule above, and committing the comment
  scanner plus a `comment-proof <base>` mode.

## For Duncan, outside the repo

- `/slice-condense` (your Cowork skill): the "(Phase 4.2 only)" description is replaced by the
  budget-condense one, proposed at this review for you to save. Its body already defers to
  `workflow/condense.md`.

## What was verified, and how

- **Gates** (my clone, Node 24.21.0): `npm run test` 207 files, 1477 tests, 1476 passed and
  1 skipped; lint, `format:check`, `build` and `tsc -b` clean; `docs:check -- citations` PASS
  (532 citations in 436 files); `-- budgets` 12 files, 0 over, exit 0.
- **Test count, file by file** (`vitest --reporter=json` on both trees): every one of `main`'s 201
  files has the same count. The +120 tests are the 6 new `scripts/docs-check/*.test.ts` files (5,
  9, 2, 59, 18, 27). Test names matched one-for-one too: 19 test full names differ, and all of them
  come from the 10 retitled `describe`/`it` strings.
- **Comment-and-title-only, independently.** I wrote my own proof, not a rerun of theirs. Each of
  the 89 changed `.ts`/`.js` files outside `scripts/` was parsed into an AST on both trees, with
  JSDoc and comments excluded, and compared token by token. 88 files have identical token kinds and
  counts. `vite.config.ts` differs as intended (the third project). The only changed token texts are
  11 literals: the 10 titles and the corpus-digest template. Because every code token is identical,
  every golden fixture's exports and the corpus digest are unchanged by construction. The template
  renders the committed fixture header byte for byte (I read both).
- **The rewrite followed the plan.** I parsed the plan's Appendix and `evidence/mapping-src.md`:
  243 against 243. Every anchor matches except the six approved overrides (plan-review fix 1 ×5,
  D3), plus two Appendix keys that moved (`:52`→`:54`, and a `(#2)` key).
- **None left:** no `GAME_DESIGN`, `species-locked` or anchorless `CONVENTIONS` in `src/` or
  `eslint.config.js`. No backticked-path label, paren list or `NAME "…"` in `.claude/` outside
  `phases/`/`archive/`. Two bare prose mentions of the deleted docs remain, which the check allows.
- **The docs diff is citations only.** I word-diffed `.claude/` outside `phases/` from the
  plan-review commit (`614ec49`) to `e53ce62`: 330 changed chunks. After masking quoted labels,
  backticked paths, doc names and `§N`, 76 had other text. I read all 76: every one is a citation
  whose label was wrapped over a line break and joined on conversion.
- **Code read:** `anchors.ts` against github-slugger's loop (`a,a,a-1` → `a-1-1`; `a-1,a,a` →
  `a-2`), `citations.ts` (forms, sites, scope, the `..` rule), `budgets.ts`, `inventory.ts` (the
  base sha is read from the file; units come from `git show <sha>:.claude/<file>`; New homes resolve
  against the working tree), `cli.ts`, `git.ts`, `deploy.yml` and `vite.config.ts`. `citations` and
  `budgets` import no git.
- **Mutation check, 24 mechanisms**, each removed in the source and the `docs-check` project
  re-run. All 24 are caught: the slug dedupe, the fence skip, the `*` leader (caught only by the
  misnamed test, fix 3), the `src/` line break, the paren list, the bare `CONVENTIONS` and
  `species-locked` in `src/`, the `..` rule, `archive/` skipped, `src/` scanned, case-sensitive
  anchors, the `NAME "…"` form, the `GAME_DESIGN §` form, exit 1 on problems, `budgets` never
  failing, `\r` stripped, the base read from the file, the missing-row check, New home
  resolution, New home required unless dropped, the label check, units read at the base, the
  skeleton's `--base`, and the CI step.
- **Stale comments:** I spot-checked #1 (Poison 40, a fifth of Defence), #2 (`bossLevelOffset: 5`),
  #8 (only `executeAttack` reaches `splashTargetIds`), #19 (the private `adjacentLivingTargets`) and
  #22 (every role but `caster` ends Attack → cast random gem) against the code. All hold.
- **The 21 `~` rows**, each read against its target and the code: 7 exact, 1 exact after my
  turn-queue edit, 9 re-pointed (fix 1), 1 rewritten (fix 2), 3 closest-home accepted. No lost rule.
- **Quotation scan:** a regex pass over `src/`. 40 quotations beside an anchor aren't in the
  target's section (`evidence/review-quotations.txt`).
- `grep -rn "Phase 4.2 only" .claude src scripts --exclude-dir=phases` finds nothing after this
  review's doc edits.
- **To delete:** none. The mailbox holds step files and `evidence/` only.

## Docs edited

- `CLAUDE.md` "How the spec is written": kept the reader's rules, added the citations-check and
  size-budget lines (`G/brief.md`, "Known from earlier slices"), and moved the writer's rules to
  `workflow/design-rules.md` (the reader/writer split decided at the kickoff).
- `workflow/design-rules.md` "Doc edits": gained the writer's rules (rewrite in place, Not built,
  the drop/keep lists, stale doc vs bug, content and its doc shape), plus two new ones: renaming a
  heading cited from `src/` needs a hand-out, and over budget is resolved at the PR review.
- `workflow/condense.md`: rewritten from the 4.2-only step to the lasting budget-condense step
  (inventory modes as generalized, `--base` after the condense is committed, splits, the inventory
  format).
- `skills/slice-verify/SKILL.md`: rewritten as the budget-condense verify, against `git show <base
  sha>` and the code.
- `workflow/pr-review.md`: docs checks in the gates; a citation must point at the rule it means
  (this review's lesson); the `## Not built` step; `## Over budget`, a two-line trigger
  pointing at `budgets.md`.
- `workflow/budgets.md`: `## Over budget`, the three options with condense or split preferred and
  raising the budget when neither makes sense (Duncan); read only when a file is over.
- `workflow/coding-rules.md`: the Phase 4.2 exception removed; `docs:check -- citations` added to
  the gates; `/slice-verify` reads the file.
- `WORKFLOWS.md`: the 4.2-only pointer replaced by "Condensing a doc over budget" (Duncan's
  decision); `/slice-verify` added to `skills/`; the condense slice's files added to the mailbox
  listing.
- `CONVENTIONS.md`: "Test environments" names the third Vitest project; "Every pull request runs
  the gates" names the docs checks (report Spec question 2).
- `spec/combat.md#turn-queue`: the queue holds the living creatures (what `buildTurnQueue` does;
  makes the heal-scaling golden's citation exact).
- `phases/4.2/H/brief.md`: the quotation rule and the committed scanner and `comment-proof` mode
  (Duncan); the proof line; its two label-form citations converted; "Known from 4.2-G's review".
- `phases/4.2/G/evidence/review-quotations.txt` (new): the quotation scan.
