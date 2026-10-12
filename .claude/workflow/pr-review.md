# Step 6 — PR review (design agent)

Command in Cowork: `/pr-review <slice-id>`. Read `design-rules.md` first. Fresh chat per round:
a later round takes its state from the mailbox, not from an earlier chat
(`workflow/pr-review.md#later-rounds`).

The GitHub web UI is blocked. Review by pulling, building, running and reading the code, **in your
own sandbox** (never in Duncan's working tree, where the coding agent works). `<branch>` is the
PR's source branch; Duncan gives it with the command, or it's the branch his working tree is on.

**Keep the waits short.** The sandbox has two CPUs, and the test runs are most of a review's time.

- Start each long run in the background as soon as its input is ready: the gates on both trees
  once the installs finish, the corpus dumps, the mutation runs. Read the code (step 3) and the
  docs while they run.
- Don't run what another run already answers. The JSON-reporter run in step 2 is the
  `npm run test` gate; the branch's green gate run is the baseline for step 5. No separate timing
  or baseline runs.

## Inputs

`kickoff.md`, `plan.md`, `plan-review.md`, the approving round's `plan-handout-r<N>.md`
and the latest `report-r<N>.md` from the mailbox, and the living docs on `main`. The build answers
to the plan as that hand-out corrects it: check each item in the code, not on the report's word.

## 1. Pull the branch and main

```sh
git clone -q https://github.com/TheDutchSpoon/Depths-of-Souls.git repo
cd repo && git fetch -q origin <branch>
git worktree add ../wt-pr FETCH_HEAD
git worktree add ../wt-main origin/main
```

To list branches without cloning:

```sh
curl -s "https://github.com/TheDutchSpoon/Depths-of-Souls.git/info/refs?service=git-upload-pack" \
  | tr '\0' '\n' | grep refs/heads
```

If cloning fails, the codeload tarballs work too:
`https://codeload.github.com/TheDutchSpoon/Depths-of-Souls/tar.gz/refs/heads/<branch>`.

## 2. Install and run the gates

```sh
cd ../wt-pr
npm ci
npm run test          # unit + golden replays + corpus digest
npm run lint
npm run format:check
npm run build         # runs tsc -b, then vite build
npx tsc -b            # on its own too, as the agent reports it separately
npm run docs:check -- citations   # blocking in CI
npm run docs:check -- comments    # blocking in CI
npm run docs:check -- budgets     # reported only
```

Always `npm ci`, never a reused `node_modules`. If the PR or the agent reports a tool behaving
strangely, compare `npx <tool> --version` with `package-lock.json` first (PR #73: a stale local
Vitest 4.1.11 against a lockfile pinning 5.0.1). CI runs the same gates on the PR; if CI and your
run disagree, that is itself a finding.

Reconcile the test count with `main` file by file (`vitest run --reporter=json`), not just the
total.

Green gates only prove the code agrees with its own fixtures. Proceed to reading.

## 3. Read the code against the spec

- Check behaviour against the spec on `main` (the kickoff's spec files, plus any spec file the
  diff touches), `CONVENTIONS` and the phase brief, not against the PR's own claims.
- Goldens must be hand-derived: the header shows setup, arithmetic and random draws. Recompute the
  draws independently (mulberry32 from the seed) and spot-check the arithmetic.
- Integration goldens must be labeled generated-then-checkpoint-verified.
- The engine stays pure: no UI, data or state import in `src/engine`.
- **Leftover sweep**, over `src/` and the living docs (all of `.claude/` but `phases/` and
  `archive/`): grep for every name the slice deletes, moves or renames, in each form it takes
  (display name, id, const, file path), and for every claim the slice corrects in a `src` comment
  or string, because the docs often repeat it. Each hit is a doc edit this review makes or a
  hand-out item.
- A citation the diff adds or changes must point at the rule it means. `citations` proves only
  that the anchor resolves: read the target and check it states what the comment says, and that a
  quotation beside it is the target's own words.

## 4. Verify claimed invariants mechanically

- "Existing goldens byte-identical": import every `__golden__/*.fixture.ts` on both trees and
  deep-compare **every export** (a throwaway test with `import.meta.glob`), not only `expected*`:
  some fixtures export sub-fixtures with `*Expected` names (`golden-wick-gates`,
  `golden-last-gleam`), and a shared registry export (`traits`, `statuses`) moves with content, which is
  expected and must be told apart from an expected-value change (4.1-H2d). Then diff each
  changed old fixture: only comments, exports or driving code may differ, as the PR claims.
- Comment-only edits: `npm run docs:check -- comment-proof <base>` passes, run in your clone (with
  comments stripped, old and new are identical; pragmas are compared apart).
- Renames: `comment-proof <base> --renames <map>` with the PR's rename map. Each listed file pair,
  importer specifier, identifier and literal is one token on both sides, line wrapping and
  trailing commas are not compared, and the rest of the code must be equal. Re-derive the map's
  claims apart from the tool: exports deep-equal under the id map, test counts per file under the
  file map, and no new name already on `main`.
- Corpus digest: diff the fixture against `main`'s; the number of changed rows and changed results
  must match the PR's attribution. If the PR says "reverting all flips reproduces main's digest",
  reproduce that.

## 5. Mutation check: do the tests pin what they claim?

For each mechanism the PR adds or changes, remove it (an env-flag guard in a scratch copy is
enough), run the test files the PR names for it plus `src/engine/corpus-digest.test.ts`, and record
what fails. The question is whether the named test catches it, so the full suite isn't needed. If
the named test passes, that is the finding; then run the full suite once to say whether anything
else catches it.

- Every mechanism must be caught by the test the PR names for it.
- A mechanism built at more than one site needs a failing test at each site (CONVENTIONS). PR #73's
  B5 cast-path guard could be deleted with the whole suite green.
- A mechanism caught only by the corpus digest is unpinned: the digest is a tripwire, not a spec.
- Restore the scratch copy (`git checkout -- src`) before anything else.

## 6. Look for live behaviour the spec doesn't cover

The corpus is 500 real-content fights. A throwaway test that resolves them and scans the event logs
finds things no golden looks for (PR #73: a creature still acting after its own `CreatureDied`, in
5 fights). If a PR parks a spec question as hypothetical, check the corpus for it before accepting
that.

## Later rounds

Round `N` (`N` ≥ 2) reviews `report-r<N>.md`, after `/slice-fix <slice-id> <N-1>`, in a fresh chat.

- **Inputs:** the ones above, plus `review-r<N-1>.md` and `handout-r<N-1>.md`. The previous
  review's verification and commit say what is settled and where the fix diff starts.
- **Each hand-out item:** check it is fixed in the code and the tests, not on the report's word.
- **Steps 1, 2 and 4 in full**, against `main` and the previous round's commit: a fix can break
  anything, and these are cheap.
- **Step 5 for what the fix touched:** each mechanism the fix diff
  (`git diff <previous commit> <branch>`) adds or changes, and each pin the hand-out asked for.
- **The approving round reruns the leftover sweep** on the final commit, whatever earlier rounds
  found: it is cheap, and a fix can add a name or a corrected claim.
- **Don't reopen** what the previous round approved unless the fix diff touches it. A problem found
  in untouched code is still a finding.

## Output, in the mailbox

- **`review-r<N>.md`** (`N` matches the report it reviews): the branch and commit reviewed; verdict
  (approved / fixes); real fixes; scope and labeling; decide-points with your recommendation each;
  what was verified and how, including counts; **Docs edited** at the end.
- **`handout-r<N>.md`**, whenever there is anything to fix: real fixes and every cleanup item the
  slice can make (a stale or incomplete comment, a golden header, evidence wording). A review
  never approves with cleanup left in, nor parks it for a later slice. A standalone hand-out for
  the coding agent, who sees nothing else. Duncan runs `/slice-fix <slice-id> <N>`; the coding agent answers with
  `report-r<N+1>.md`, and the next round reviews that.
- **Content docs:** fold the slice's content changes into `content/`, `species/` and
  `specializations/` on the slice branch, written from the code as verified, not from the report
  alone: each "decided changes" item the PR builds moves into its doc's body and leaves the pending
  section; content that is new gets its doc (the designed content and a plain-language explanation
  of how it works).
- **`## Not built` rules:** when the PR builds a rule from a spec file's `## Not built` half, move
  that rule into the file's `## Design` or `## Engine rules`, written as built.
- Decisions the review makes go into the living docs in place, on the slice branch while the PR is
  open. Decisions made after approval go on `main` right after the merge.

## Over budget

After the doc sync, run `npm run docs:check -- budgets`. If a file is over its budget, resolve it in
this review as a decide-point, following `workflow/budgets.md#over-budget`.
