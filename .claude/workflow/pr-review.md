# Step 6 — PR review (design agent)

Command in Cowork: `/pr-review <slice-id>`. Read `design-rules.md` first. One chat per PR; later
rounds continue in the same chat.

The GitHub web UI is blocked. Review by pulling, building, running and reading the code, **in your
own sandbox** (never in Duncan's working tree, where the coding agent works). `<branch>` is the
PR's source branch; Duncan gives it with the command, or it's the branch his working tree is on.

## Inputs

`kickoff.md`, `plan.md`, `plan-review.md` and the latest `report-r<N>.md` from the mailbox, and the
living docs on `main`.

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
```

Always `npm ci`, never a reused `node_modules`. If the PR or the agent reports a tool behaving
strangely, compare `npx <tool> --version` with `package-lock.json` first (PR #73: a stale local
Vitest 4.1.11 against a lockfile pinning 5.0.1). CI runs the same gates on the PR; if CI and your
run disagree, that is itself a finding.

Reconcile the test count with `main` file by file (`vitest run --reporter=json`), not just the
total.

Green gates only prove the code agrees with its own fixtures. Proceed to reading.

## 3. Read the code against the spec

- Check behaviour against GAME_DESIGN / CONVENTIONS / the phase brief on `main`, not against the
  PR's own claims.
- Goldens must be hand-derived: the header shows setup, arithmetic and random draws. Recompute the
  draws independently (mulberry32 from the seed) and spot-check the arithmetic.
- Integration goldens must be labeled generated-then-checkpoint-verified.
- The engine stays pure: no UI, data or state import in `src/engine`.
- Search for leftovers of anything the PR says it deleted, in `src/` and in the living docs.

## 4. Verify claimed invariants mechanically

- "Existing goldens byte-identical": import every `__golden__/*.fixture.ts` on both trees and
  deep-compare every `expected*` export (a throwaway test with `import.meta.glob`). Then diff each
  changed old fixture: only comments, exports or driving code may differ, as the PR claims.
- Comment-only edits: with comments stripped, old and new are identical.
- Corpus digest: diff the fixture against `main`'s; the number of changed rows and changed results
  must match the PR's attribution. If the PR says "reverting all flips reproduces main's digest",
  reproduce that.

## 5. Mutation check: do the tests pin what they claim?

For each mechanism the PR adds or changes, remove it (an env-flag guard in a scratch copy is
enough), run the full suite, and record what fails.

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

## Output, in the mailbox

- **`review-r<N>.md`** (`N` matches the report it reviews): verdict (approved / fixes); real fixes;
  scope and labeling; the 1–3 decide-points with your recommendation each; what was verified and
  how, including counts; **Docs edited** at the end.
- **`handout-r<N>.md`**, only when there are fixes: a standalone hand-out for the coding agent, who
  sees nothing else. Duncan runs `/slice-fix <slice-id> <N>`; the coding agent answers with
  `report-r<N+1>.md`, and the next round reviews that.
- **Content docs:** fold the slice's content changes into `content/`, `species/` and
  `specializations/` on the slice branch, written from the code as verified, not from the report
  alone: each "decided changes" item the PR builds moves into its doc's body and leaves the pending
  section; content that is new gets its doc (the designed content and a plain-language explanation
  of how it works).
- Decisions the review makes go into the living docs in place, on the slice branch while the PR is
  open. Decisions made after approval go on `main` right after the merge.
