# Slice workflow

Each step of a slice runs in its **own fresh chat**. The **docs are the memory**, not chat
scrollback, and every hand-off between agents is a **file in the slice's mailbox**, not a paste.
Two habits keep that true:

1. Every locked decision lives in `.claude/`, never only in a chat.
2. When a plan review or PR review surfaces a **new** decision, it's written into `.claude/`
   **before** the next slice's kickoff. Otherwise a fresh build runs against a stale spec. This
   review → sync → next-slice rhythm is the connective tissue between slices.

The failure mode to avoid: a long-lived chat where decisions live only in scrollback, so the spec
drifts and stale decisions silently outlive their correction.

---

## Who does what

- **Human (TheDutchSpoon):** the decision-maker. Makes every decide-point call, runs the commands
  that move a slice from step to step, commits, pushes, merges, and deletes files. Nothing reaches
  `main` without the human.
- **Coding agent (Claude Code in VS Code):** writes the implementation plan, then the code, tests,
  reports and the slice's record. Never commits and never deletes files; says what needs deleting.
  Never edits the living docs, content docs included: its report says what they need.
  Standing rules: `workflow/coding-rules.md`.
- **Design & review agent (Cowork, with the local repo connected):** writes kickoffs, reviews plans
  and PRs, writes fix hand-outs, and edits the living docs in place: every decision, and the
  content docs for the content a slice ships (folded at the PR review). Never writes engine
  or app code, never commits. Re-reads the living docs from the working tree at the start of every
  session. Standing rules: `workflow/design-rules.md`.

## Where things live

```
.claude/
  CLAUDE.md  CONVENTIONS.md  VISION.md  OPEN_QUESTIONS.md               living docs
  ROADMAP.md  WORKFLOWS.md                                              living docs
  spec/            the spec, one file per subsystem (CLAUDE.md has the map)   living docs
  content/  species/  specializations/                                   living docs
  workflow/        the standing rules and step files both agents follow
  skills/          the coding agent's commands (/slice-plan, /slice-build, /slice-fix)
  phases/
    <phase>/
      brief.md     phase-wide: scope, architecture, vocabulary delta, assumptions, slice list
      record.md    short outcome summary + links, written when the phase closes
      <slice>/     the slice's mailbox:
        brief.md        this slice's plan section (written with the phase brief)
        kickoff.md      design agent → coding agent
        plan.md         coding agent → design agent
        plan-review.md  design agent → coding agent, one section per round
        report-r1.md    coding agent's build report
        review-r1.md    design agent's PR review of report-r1
        handout-r1.md   design agent → coding agent, only when there are fixes
        report-r2.md …  and so on, one round per fix batch
        record.md       what was built; immutable once merged
        evidence/       generated output a step file cites (sim reports, scans, tables)
  archive/         Phases 0–4's briefs and records, untouched. History, not current truth.
```

A slice id maps to its mailbox: `4.1-H2b2` → `.claude/phases/4.1/H2b2/`.

**Phase 4.1 was the transition.** Its slices from H2b1 on used the mailbox (`phases/4.1/<slice>/`),
but its brief and record stayed in the old places, `briefs/phase-4.1-implementation-plan.md` and
`phases/phase-4.1-fix-and-consolidation.md`, with each remaining slice's section moved out of the
brief into its mailbox `brief.md` at kickoff. When 4.1 closed, the two files moved unchanged to
`phases/4.1/brief.md` and `phases/4.1/record.md`; references under the old names (in the 4.1
mailboxes and records) mean those files. Phase 4.2's brief
is the first written in the new shape.

Mailbox files are committed on the slice branch, so the PR carries its own plan, reviews and
reports. Once merged they're immutable, like records.

**What a mailbox keeps.** The folder itself holds only the step files above, all Markdown.
Generated output that a step file cites as evidence (a simulator report, a corpus scan, a table a
script printed) goes in `<slice>/evidence/`, as plain text or Markdown, and the citing file names
it by that path. Not kept, anywhere in the mailbox:

- marker files, logs and other scratch output of a run;
- a run whose content another kept file already holds (keep one copy);
- a one-off script that rewrites `src/` (a data remap, say): it can't safely run twice, so keep its
  printed table in `evidence/` and quote the rule it applied in the report.

Anything else the step needs lives in a scratch clone outside the repo, as before.

## The loop, per slice

| #   | Step               | Where   | Duncan types                 | Writes                                     |
| --- | ------------------ | ------- | ---------------------------- | ------------------------------------------ |
| 0   | Pre-flight         | —       | creates the slice branch     | —                                          |
| 1   | Kickoff            | Cowork  | `/slice-kickoff <id>`        | `kickoff.md` (+ doc edits)                 |
| 2   | Plan               | VS Code | `/slice-plan <id>`           | `plan.md`                                  |
| 3   | Plan review        | Cowork  | `/plan-review <id>`          | `plan-review.md` + doc edits               |
| 4   | First commit       | —       | commits steps 1–3            | —                                          |
| 5   | Build              | VS Code | `/slice-build <id>`          | code, `report-r1.md`, the slice's record   |
| 6   | PR review          | Cowork  | `/pr-review <id> [<branch>]` | `review-r1.md` (+ `handout-r1.md`, edits)  |
| 7   | Fix (per round)    | VS Code | `/slice-fix <id> <N>`        | code, `report-r<N+1>.md`                   |
| 8   | Merge              | —       | merges                       | —                                          |

0. **Pre-flight.** `main` has the previous slice merged and every doc-sync from its reviews
   committed. Duncan creates the slice branch from `main`. Locally: `npm ci`, and the toolchain
   matches the lockfile (CONVENTIONS "Local runs match CI's toolchain").
1. **Kickoff** (`workflow/kickoff.md`). The design agent writes the slice-specific kickoff into the
   mailbox. The standing rules aren't repeated in it: they live in `workflow/coding-rules.md`.
2. **Plan.** The coding agent writes `plan.md` with every ASSUMPTION marked inline and collected in
   a checklist, then **stops**. No code before the plan is approved.
3. **Plan review** (`workflow/plan-review.md`). The design agent reviews the plan against the docs
   and the ASSUMPTION checklist, separates plan fixes from decide-points, and recommends an answer
   for each decide-point. Duncan decides; the design agent writes the decisions into the docs in
   place. "Changes needed" → Duncan runs `/slice-plan` again for a revision, then another round.
4. **First commit.** Duncan reviews the doc edits as a git diff and commits the kickoff, plan, plan
   review and doc edits as the **first commit on the slice branch**, so the PR carries the spec it
   was built against.
5. **Build.** The coding agent builds to the approved plan, runs every gate, writes `report-r1.md`
   and the slice's record. The report lists anything that surfaced a spec question.
6. **PR review** (`workflow/pr-review.md`). Duncan pushes and opens the PR; the design agent
   reviews it in its own sandbox and ends in a verdict: approved, or fixes. Fixes go to the coding
   agent as a standalone `handout-r<N>.md`. Decisions the review makes go into the docs in place,
   on the slice branch while the PR is open; decisions made after approval go on `main` right
   after the merge.
7. **Fix.** One round per fix batch: `/slice-fix <id> <N>` → `report-r<N+1>.md` → `/pr-review`
   again (same review chat), until approved.
8. **Merge**, then the next slice starts at step 0.

Duncan can merge steps when a slice is small (for example, skip a separate plan review for a pure
docs or tooling change), but the review → sync → next-slice order never changes.

(Phase 4.2 only) Phase 4.2, the docs restructure, runs a variant loop for its condensing slices: the design agent
writes, the coding agent verifies (`/slice-verify`). See `phases/4.2/brief.md` "Process for 4.2".

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
C1, C2a, C2b and C2c. Each part keeps one golden policy, gets its own mailbox and record, and the
brief records the split when it's decided.

## Docs and records

- **Doc edits are made in place**, in Duncan's working tree, by the design agent: the exact lines
  that change, never a regenerated whole file. Duncan reviews them as a git diff and commits them.
  Each step's file ends with the list of docs it edited.
- **Records** are written by the coding agent and are immutable once merged. Living docs
  (`CLAUDE`, `CONVENTIONS`, `VISION`, `OPEN_QUESTIONS`, `spec/`, `ROADMAP`, briefs, `WORKFLOWS`,
  `workflow/`) are the mutable source of truth.
- **Changing the process** is a normal doc change: edit `WORKFLOWS.md`, `workflow/` or
  `skills/`, in its own commit.

---

## The human's judgment call these don't remove

When a slice surfaces a spec question, decide: resolve it inline, or pull it back to a design pass
(a grill). Radar: the brief's **Assumptions checklist**. Anything tagged there that a slice wants
to **change** (not merely **confirm**) is a "bring it back" signal. The same holds for a spec
question a review finds live in the corpus: if real content already hits it, it isn't
hypothetical, and it gets decided before the slice merges. A plan that needs a third review round
is the same signal.
