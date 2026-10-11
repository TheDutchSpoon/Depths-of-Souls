# 4.2-H — Code comments: the context diet for `src/`

Phase brief: `.claude/phases/4.2/brief.md`. Loop: normal. Golden policy: **byte-identical**; the
`src/` diff is comment-only (the proof 4.2-G builds, without G's test-title mask). Decided with
Duncan at the 4.2-G kickoff (2026-10-11). Runs after 4.2-G merges.

## Why

Agents read `src/` as much as the docs, and its comments carry the same weight the docs did. On
2026-10-11, across 401 files and about 8,750 comment lines: ~330 lines cite plan-assumption numbers
("ASSUMPTION 14"), ~660 a phase ("Phase 4 Slice C"), ~625 a 4.1 slice id, ~105 a PR, ~130 say
"locked"; provenance sits in about 270 files. Most of the stale comments the 4.2 verify rounds found
were comments that restated a spec rule or narrated history.

## Scope

- Bring every comment in `src/` to `CONVENTIONS.md` "Comment why, not what" (rewritten at the 4.2-G
  kickoff): provenance stripped; a restated spec rule replaced by its anchor plus whatever this code
  adds; history ("was X before") dropped. The *why* a provenance tag carried is kept: an
  `ASSUMPTION 14 -- living-adjacency, because …` comment keeps the "because".
- The mechanical part (provenance tags and parentheticals) may be done by script; the rest is by
  hand. The plan lists the patterns the script removes and shows a sample of each.
- Golden fixtures: setup, arithmetic and random draws stay (CONVENTIONS "Two-tier golden
  discipline"); only provenance goes.
- `// ASSUMPTION:` markers tied to a live open question stay (two on 2026-10-11).
- A `comments` mode in `docs:check`, blocking in CI, fails on the provenance patterns in `src/`
  comments, reusing 4.2-G's comment scanner. The plan lists the patterns; golden fixtures are not
  exempt from it.

Out of scope: any code change; comments that are correct but long (length alone is not a finding).

## The PR must prove

- Comment-only: with comments stripped, every changed file is byte-identical to `main`'s.
- The `comments` mode passes, fails on a planted tag of each pattern, and runs in CI.
- Before/after counts of each provenance pattern, the after counts zero.
- A sample of hand rewrites (at least one per `src/` folder) showing the *why* kept.
