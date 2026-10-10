# Step 1 — Kickoff (design agent)

Command in Cowork: `/slice-kickoff <slice-id>`. Read `design-rules.md` first.

## Pre-flight

- `main` has the previous slice merged and every doc-sync from its reviews committed.
- The working tree is on this slice's branch, cut from current `main`. If not, ask Duncan to create
  it before writing anything.
- Read `ROADMAP` for where the slice sits, and the slice's brief: `.claude/phases/<phase>/brief.md`
  and `<slice>/brief.md`.

## Output: `kickoff.md` in the mailbox

The standing rules are in `coding-rules.md`, so the kickoff carries only what is specific to this
slice. Name the spec files the slice reads (CLAUDE.md has the map): the coding agent reads those
and `CONVENTIONS.md`, not the whole spec. Fill in the template below. If writing it surfaces a
decision, ask Duncan, then write the decision into the docs (in place) before the kickoff goes out.

```
# Kickoff — Phase <X> — Slice <Y: name>

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)
- Spec files: <the .claude/spec/*.md files this slice reads, picked by each file's "Read this
  when" line; VISION.md for a slice that designs a feature; OPEN_QUESTIONS.md if it touches a
  parked question>
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
