# Slice workflow

Read this before starting or reviewing any slice: the overview of the process. The rules for each
step live in `workflow/*.md`.

Each step of a slice runs in its **own fresh chat**. The **docs are the memory**, not chat
scrollback, and every hand-off between agents is a **file in the slice's mailbox**, not a paste.
Two habits keep that true:

1. Every decision lives in `.claude/`, never only in a chat.
2. When a plan review or PR review surfaces a **new** decision, it's written into `.claude/`
   **before** the next slice's kickoff, or a fresh build runs against a stale spec. This review →
   sync → next-slice rhythm is the connective tissue between slices.

The failure mode to avoid: a long-lived chat where decisions live only in scrollback, so the spec
drifts and stale decisions silently outlive their correction.

---

## Who does what

- **Human (TheDutchSpoon):** the decision-maker. Makes every decide-point call, runs the commands
  that move a slice from step to step, commits, pushes, opens the PR, merges, and deletes files.
  Nothing reaches `main` without the human.
- **Coding agent (Claude Code in VS Code):** writes the implementation plan, then the code, tests,
  reports and the slice's record; never edits the living docs. Its rules:
  `workflow/coding-rules.md`.
- **Design & review agent (Cowork, with the local repo connected):** writes kickoffs, reviews plans
  and PRs, writes fix hand-outs, and owns the living docs, content docs included; never writes
  code. Its rules: `workflow/design-rules.md`.

## Where things live

```
.claude/
  CLAUDE.md  CONVENTIONS.md  VISION.md  OPEN_QUESTIONS.md               living docs
  ROADMAP.md  WORKFLOWS.md                                              living docs
  spec/            the spec, one file per subsystem (CLAUDE.md has the map)   living docs
  content/  species/  specializations/                                   living docs
  workflow/        the standing rules and step files both agents follow
  skills/          the coding agent's commands (/slice-plan, /slice-build, /slice-fix, /slice-verify)
  phases/
    <phase>/
      brief.md     phase-wide: scope, architecture, vocabulary delta, assumptions, slice list
      record.md    short outcome summary + links, written when the phase closes
      <slice>/     the slice's mailbox:
        brief.md        this slice's plan section (written with the phase brief)
        kickoff.md      design agent → coding agent
        plan.md         coding agent → design agent
        plan-review.md  design agent's plan review, one section per round
        plan-handout-r1.md …  design agent → coding agent, one per plan-review round
        report-r1.md    coding agent's build report
        review-r1.md    design agent's PR review of report-r1
        handout-r1.md   design agent → coding agent, only when there are fixes
        report-r2.md …  and so on, one round per fix batch
        record.md       what was built; immutable once merged
        inventory.md  verify-request.md  verify-r1.md …   a condense slice's files instead
        evidence/       generated output a step file cites (sim reports, scans, tables)
  archive/         Phases 0–4's briefs and records, untouched. History, not current truth.
```

A slice id maps to its mailbox: `4.1-H2b2` → `.claude/phases/4.1/H2b2/`. A brief is kept, never
deleted; a slice's `record.md` existing is what marks it shipped.

Phase 4.1's mailboxes and records name its brief and record by their old paths,
`briefs/phase-4.1-implementation-plan.md` and `phases/phase-4.1-fix-and-consolidation.md`: those
are `phases/4.1/brief.md` and `phases/4.1/record.md`.

Mailbox files are committed on the slice branch, so the PR carries its own plan, reviews and
reports. Once merged they're immutable, like records.

### What a mailbox keeps

The folder itself holds only the step files above, all Markdown. Generated output that a step file
cites as evidence (a simulator report, a corpus scan, a table a script printed) goes in
`<slice>/evidence/`, as plain text or Markdown, and the citing file names it by that path. Not
kept, anywhere in the mailbox:

- marker files, logs and other scratch output of a run;
- a run whose content another kept file already holds (keep one copy);
- a one-off script that rewrites `src/` (a data remap, say): it can't safely run twice, so keep its
  printed table in `evidence/` and quote the rule it applied in the report.

Anything else the step needs lives in a scratch clone outside the repo.

## The loop, per slice

| #   | Step               | Where   | Duncan types                 | Writes                                     |
| --- | ------------------ | ------- | ---------------------------- | ------------------------------------------ |
| 0   | Pre-flight         | —       | creates the slice branch     | —                                          |
| 1   | Kickoff            | Cowork  | `/slice-kickoff <id>`        | `kickoff.md` (+ doc edits)                 |
| 2   | Plan               | VS Code | `/slice-plan <id>`           | `plan.md`                                  |
| 3   | Plan review        | Cowork  | `/plan-review <id>`          | `plan-review.md` (+ hand-out, doc edits)   |
| 4   | First commit       | —       | commits steps 1–3            | —                                          |
| 5   | Build              | VS Code | `/slice-build <id>`          | code, `report-r1.md`, the slice's record   |
| 6   | PR review          | Cowork  | `/pr-review <id> [<branch>]` | `review-r1.md` (+ `handout-r1.md`, edits)  |
| 7   | Fix (per round)    | VS Code | `/slice-fix <id> <N>`        | code, `report-r<N+1>.md`                   |
| 8   | Merge              | —       | merges                       | —                                          |

Each step's rules are in its file: kickoff `workflow/kickoff.md`, plan and build
`workflow/coding-rules.md`, plan review `workflow/plan-review.md`, PR review
`workflow/pr-review.md`. Between them:

- **No code before the plan is approved**: the plan step stops at `plan.md`.
- **The first commit on the slice branch** holds the kickoff, the plan, the plan review, its
  hand-outs and their doc edits, so the PR carries the spec it was built against.
- **Fix rounds** repeat steps 7 and 6 (`/slice-fix <id> <N>` → `report-r<N+1>.md` → `/pr-review`
  in a fresh chat, scoped by `workflow/pr-review.md#later-rounds`) until the PR is approved. After the merge, the next slice starts at
  step 0.

Duncan can merge steps when a slice is small (for example, skip a separate plan review for a pure
docs or tooling change), but the review → sync → next-slice order never changes.

### Condensing a doc over budget

When a PR review takes a living doc over its budget (`workflow/budgets.md`) and Duncan chooses to
condense it or split it (`workflow/budgets.md#over-budget`), a docs-only slice runs before the
next kickoff, with the roles swapped: the docs are the design agent's, and the coding agent knows
the code.

| #   | Step         | Where   | Duncan types                   | Writes                                                   |
| --- | ------------ | ------- | ------------------------------ | -------------------------------------------------------- |
| 0   | Pre-flight   | —       | creates the slice branch       | the slice's `brief.md` (from the review)                 |
| 1   | Condense     | Cowork  | `/slice-condense <id>`         | the condensed docs, `inventory.md`, `verify-request.md`  |
| 2   | First commit | —       | commits step 1                 | —                                                        |
| 3   | Verify       | VS Code | `/slice-verify <id> <N>`       | `verify-r<N>.md`                                         |
| 4   | Fix          | Cowork  | `/slice-condense <id> <N+1>`   | doc fixes, `## Round <N+1>` in `verify-request.md`       |
| 5   | Merge        | —       | merges                         | —                                                        |

Steps 3 and 4 repeat until a verify round has no findings. Golden policy: byte-identical; the
slice changes only `.claude/`. The rules are in `workflow/condense.md`.

## Golden policy: one per PR

Every slice declares its golden policy in the brief, and a PR never mixes two:

- **Byte-identical:** every existing golden's expected values are unchanged, and the corpus digest
  fixture is unchanged. Any difference is a bug to fix, never a fixture to regenerate.
- **Deliberate changes:** every changed golden is listed with its reason, and each old golden's
  diff contains only the listed kind of change. The corpus digest is regenerated **once**, only
  through `npm run corpus:update`, and every changed fight is attributed to a listed change.

In both cases every new behaviour lands with a new hand-derived test that is shown failing with
its mechanism removed, at every site (`CONVENTIONS.md#a-mechanism-at-more-than-one-site-is-tested-at-each-site`).

## When a slice is too big

Split it into more slices rather than keeping the original lettering fixed: `4.1-C` shipped as
C1, C2a, C2b and C2c. Each part keeps one golden policy, gets its own mailbox and record, and the
brief records the split when it's decided.

## Docs and records

- The living docs are the mutable source of truth; records are immutable once merged. How doc
  edits are made and reviewed: `workflow/design-rules.md#doc-edits`.
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
