# Step 1 — Kickoff (design agent)

Command in Cowork: `/slice-kickoff <slice-id>`. Read `design-rules.md` first.

## Pre-flight

- `main` has the previous slice merged and every doc-sync from its reviews committed.
- The working tree is on this slice's branch, cut from current `main`. If not, ask Duncan to create
  it before writing anything.
- Read `ROADMAP` for where the slice sits, and the slice's section of the brief:
  - Phase 4.5 onward: `.claude/phases/<phase>/brief.md` and `<slice>/brief.md`;
  - Phase 4.1: the slice's section of `.claude/briefs/phase-4.1-implementation-plan.md`.

## Phase 4.1 only: move the slice's section out

So the coding agent doesn't read the whole 4.1 brief, move this slice's section out of it at
kickoff:

- Move the slice's section (its heading and everything under it, up to the next heading of the
  same level) from `.claude/briefs/phase-4.1-implementation-plan.md` into `brief.md` in the
  mailbox, **byte for byte**: do it with a script, never by retyping it.
- Leave the heading behind in the 4.1 brief, followed by one line:
  `Moved to .claude/phases/4.1/<slice>/brief.md at its kickoff.`
- Only unbuilt slices move. Nothing that's already built is touched.
- The kickoff's reading list then names the mailbox `brief.md`, plus the specific headings of the
  4.1 brief the slice still needs (the architecture overview, the vocabulary delta, the
  Assumptions checklist), never the whole file.

## Output: `kickoff.md` in the mailbox

The standing rules are in `coding-rules.md`, so the kickoff carries only what is specific to this
slice. Fill in the template below. If writing it surfaces a decision, ask Duncan, then write the
decision into the docs (in place) before the kickoff goes out.

```
# Kickoff — Phase <X> — Slice <Y: name>

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)
- <the brief section(s), by file and heading>
- <content docs for content slices: .claude/species/, .claude/specializations/, .claude/content/>
- <any specific code or golden this slice must understand first>

## Scope
<one paragraph: what this slice delivers, and what it explicitly does not>

## Golden policy
<byte-identical | deliberate changes, listed: which goldens, and why each changes>

## Traps
<places in the code this slice touches where a plausible change is wrong, and why>

## Must stay green
<the tests and goldens this slice must not break>

## The PR must prove
<the specific evidence the report has to show for this slice>
```
