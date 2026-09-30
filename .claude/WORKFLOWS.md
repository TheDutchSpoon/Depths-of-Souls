# Slice workflow

Each slice is built and reviewed in its **own fresh chat**. The **docs are the memory**, not chat
scrollback. Two habits keep that true:

1. Every locked decision lives in `.claude/`, never only in a chat.
2. When a plan review or PR review surfaces a **new** decision, it's synced into `.claude/`
   **before** the next slice's chat opens. Otherwise a fresh build runs against a stale spec. This
   review → sync → next-slice rhythm is the connective tissue between slices.

The failure mode to avoid: a long-lived chat where decisions live only in scrollback, so the spec
drifts and stale decisions silently outlive their correction.

---

## Who does what

- **Human (TheDutchSpoon):** the decision-maker. Makes every decide-point call, commits, pushes,
  merges, and deletes files. Nothing reaches `main` without the human.
- **Coding agent (Claude Code):** writes the implementation plan, then the code, tests, and the
  slice's phase-record section. Never commits and never deletes files; says what needs deleting.
- **Design & review agent:** writes kickoffs, reviews plans and PRs, writes fix hand-outs and
  doc-syncs. Never writes engine code and never commits. Re-reads the live `.claude/` docs at the
  start of every session.

## The loop, per slice

0. **Pre-flight.** `main` has the previous slice merged and every doc-sync from its reviews
   committed. Locally: `npm ci`, and the toolchain matches the lockfile (CONVENTIONS "Local runs
   match CI's toolchain").
1. **Kickoff.** The design agent writes the kickoff: the template below plus a slice-specific
   block. The human pastes it into a **fresh** coding-agent chat.
2. **Plan.** The coding agent posts an implementation plan with every ASSUMPTION marked inline and
   collected in a checklist, then **stops**. No code before the plan is approved.
3. **Plan review.** In a design chat (review kickoff below), the design agent reviews the plan
   against the docs and the ASSUMPTION checklist. It separates plan fixes from decide-points and
   recommends an answer for each decide-point. The human decides.
4. **Plan-review doc-sync.** Every decision the plan review made is written into `.claude/`, as
   complete replacement files. The human commits them as the **first commit on the slice branch**,
   so the PR carries the spec it was built against.
5. **Build.** The coding agent builds to the approved plan, runs every gate, appends the slice's
   section to the phase record, and reports. Its report lists anything that surfaced a spec
   question.
6. **PR review.** In a review chat (review kickoff below), following `pr-review-runbook.md`. It
   ends in a verdict: approved, or fixes. Fixes go back to the coding agent as a standalone
   **fix hand-out**; the review then continues in the same chat, one round per fix batch, until
   approved.
7. **PR-review doc-sync.** Decisions the PR review made (a new rule, a changed plan for a later
   slice, a watch point) are written into `.claude/` before the next kickoff. While the PR is open
   they're committed on the slice branch; decisions made after approval go on `main` right after
   the merge.
8. **Merge**, then the next slice starts at step 0.

The human can merge steps when a slice is small (for example, skip a separate plan review for a
pure docs or tooling change), but the review → sync → next-slice order never changes.

## Golden policy: one per PR

Every slice declares its golden policy in the brief, and a PR never mixes two:

- **Byte-identical:** every existing golden's expected values are unchanged, and the corpus digest
  fixture is unchanged. Any difference is a bug to fix, never a fixture to regenerate.
- **Deliberate changes:** every changed golden is listed with its reason, and each old golden's
  diff contains only the listed kind of change. The corpus digest is regenerated **once**, only
  through `npm run corpus:update`, and every changed fight is attributed to a listed change.

In both cases every new behaviour lands with a new hand-derived test that is shown failing with
its mechanism removed, at **every** site the mechanism lives (CONVENTIONS "Testing").

## When a slice is too big

Split it into more slices rather than keeping the original lettering fixed: `4.1-C` shipped as
C1, C2a, C2b and C2c. Each part keeps one golden policy, gets its own phase-record section, and
the brief records the split when it's decided.

## Files the review produces

- **Review notes:** one file per PR, with a section appended per round. Real fixes, scope/labeling,
  and the 1–3 decide-points (each with a recommendation) are kept separate.
- **Fix hand-outs:** standalone. They make sense without the review notes or any earlier hand-out,
  since the coding agent sees only the hand-out.
- **Doc-syncs:** complete replacement files, never patches, checked to apply onto the target commit
  and to pass `npx prettier --check` in the repo.
- **Phase records** are written by the coding agent and are immutable once merged. Living docs
  (`GAME_DESIGN`, `CONVENTIONS`, `CLAUDE`, `ROADMAP`, briefs, `WORKFLOWS`) are the mutable source of
  truth.

---

## Coding-agent kickoff (paste at the top of each slice chat, one slice per chat)

The design agent fills in the `<…>` slots and writes the **Slice-specific** block: the golden
policy, traps in the code this slice touches, the tests it must keep green, and what the PR must
prove.

```
Phase <X> — Slice <Y: name>. Build ONLY this slice.

Before writing anything, read:
- .claude/CLAUDE.md
- .claude/briefs/phase-<X>-implementation-plan.md (this slice's section + the
  architecture overview + the Assumptions checklist)
- .claude/CONVENTIONS.md and .claude/GAME_DESIGN.md (the spec you build against —
  docs win over anything in the brief if they disagree; flag the conflict, don't guess)
- the current src/engine + existing goldens (build against real code, not memory)
- for content slices: .claude/species/, .claude/specializations/ and .claude/content/

Toolchain: `npm ci`; your Node and tool versions match the lockfile (CONVENTIONS
"Local runs match CI's toolchain"). If a tool behaves unexpectedly, check its
`--version` against the lockfile before designing around it.

PLAN FIRST. Post the implementation plan, with every ASSUMPTION marked inline and
collected in a checklist, then STOP for design review. No code until the plan is
approved.

Rules:
- Stay in this slice's scope; if it depends on an unbuilt slice, stop and say so.
- Every ASSUMPTION in scope: mark it inline AND in the slice's checklist.
- Golden policy: <byte-identical | deliberate, listed> (see WORKFLOWS "Golden policy").
- Goldens hand-derived (setup, arithmetic and random draws in comments) for focused
  cases; big integration goldens labeled generated-then-checkpoint-verified. No
  run-then-pasted goldens. New goldens replay through the shared golden runner.
- Every new or changed mechanism has a test that fails with it removed, at every site
  the mechanism lives.
- Engine stays pure (no UI/store/data imports in src/engine).
- Green all gates before done: test / lint / format:check / build / tsc -b.
- Leave main green + deployable; the demo (if this slice ships one) consumes the
  engine, doesn't leak into it.
- Don't commit and don't delete files; say what needs deleting.

Slice-specific:
<written by the design agent for this slice>

Output (after the plan is approved and the slice is built):
- the work on the slice branch, ready for a PR against `main`;
- a report that states how each claim was checked: gates, the test count
  reconciled file by file against main, the golden policy (expected values compared
  by importing the fixtures, not by reading diffs), the corpus digest (unchanged, or
  regenerated once with every changed fight attributed), and for each mechanism the
  test that fails with it removed;
- a short note of anything that surfaced a spec question, so the docs get updated
  before the next slice;
- the slice's section in the phase record. For content slices, also a doc in
  .claude/content/ with the designed content and a plain-language explanation of how
  it works.
```

## Plan-review kickoff (paste at the top of a design chat, with the plan)

```
Review the implementation plan for Phase <X> — Slice <Y>. Re-read the live .claude/
docs on `main` first. Check the plan against the docs and the brief, and go through
its ASSUMPTION checklist item by item: confirm, correct, or flag as a decide-point
with your recommendation. Say what the docs need before building starts, and deliver
those as complete replacement files.
```

## PR-review kickoff (paste at the top of a review chat, one PR per chat)

```
Review PR: <link or branch name>. Follow pr-review-runbook.md.
It's a slice of the phase-<X> plan — review against the docs on `main`, not the PR's
own claims. Separate real fixes from scope/labeling; flag the things needing my
decision vs. what you'll action. If it surfaced a new decision, say what the docs need.
```

Later rounds continue in the same chat: paste the coding agent's report after each fix
hand-out.

---

## The human's judgment call these don't remove

When a slice surfaces a spec question, decide: resolve it inline, or pull it back to a design pass
(a grill). Radar: the brief's **Assumptions checklist**. Anything tagged there that a slice wants
to **change** (not merely **confirm**) is a "bring it back" signal. The same holds for a spec
question a review finds live in the corpus: if real content already hits it, it isn't
hypothetical, and it gets decided before the slice merges.
