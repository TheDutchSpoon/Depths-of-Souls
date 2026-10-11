# CLAUDE.md

Read this first, in every chat: what the project is, where everything lives, and the rules that
matter most. Keep it short; link out for detail.

## What this project is

A web-based **incremental game**, *Depths of Souls*. The world is **one endlessly descending cave**:
the player delves floor by floor and builds **facilities** at the entrance to support deeper
expeditions. Combat is **automatic** and **6v6**; the player's main lever is **scripting creature
behaviour** with reusable **script templates** (priority rules, like Final Fantasy XII's Gambits).
Manual turn-based combat is a secondary, optional mode on the same engine. No backend: everything
is client-side and statically deployed. The pitch, pillars and loop are in `VISION.md`.

## The rules that matter most

1. **Determinism**: the same party, scripts and seed give the same fight, always; seeded RNG only
   (`CONVENTIONS.md` "Combat is reproducible from its inputs").
2. **Engine purity**: no React, DOM, wall clock or global random inside `src/engine`
   (`CONVENTIONS.md` "The engine is pure and deterministic").
3. **Data over code**: creatures, traits, spells and balance numbers are data; new content is a
   data entry, plus at most one reusable primitive (`spec/effects.md` "One effect framework",
   `CONVENTIONS.md` "No magic numbers").
4. **Scripts are serializable data**: the player's rules are JSON-shaped, saved and replayable
   (`spec/scripting.md` "Scripts are ordered rules").
5. **Versioned saves**: every save has a version, and a shape change adds a migration
   (`spec/saves.md` "Versions and migrations").

## Where things live

Every chat reads this file and `CONVENTIONS.md` (the engineering rules). The kickoff names the
spec files a slice reads; a reviewer reads the same, plus any spec file the diff touches. Each file
opens with a "Read this when …" line.

| File | Read it when |
| --- | --- |
| `VISION.md` | designing a feature (vision, pillars, core loop, non-goals) |
| `OPEN_QUESTIONS.md` | a slice touches a parked question, or at a grill |
| `spec/effects.md` | any trait, perk or effect change |
| `spec/responses.md` | with `effects.md`, for any triggered behaviour |
| `spec/statuses.md` | any status change |
| `spec/combat.md` | any change to how a fight resolves |
| `spec/scripting.md` | script or behaviour changes |
| `spec/creatures.md` | collection, creature or gem changes |
| `spec/run.md` | descent, generation or hub changes |
| `spec/progression.md` | progression changes |
| `spec/store.md` | any store or UI-facing state change |
| `spec/saves.md` | save or load changes |
| `content/`, `specializations/` | a slice adds or changes content: what `main` ships, entry by entry |
| `ROADMAP.md` | where a slice sits; what is decided but not built |
| `WORKFLOWS.md` | before starting or reviewing any slice: the loop, the mailboxes, where every file lives |

### How the spec is written

- **The spec describes `main`.** A decision that isn't built lives under "Decided, not built" in
  its phase brief (or, for a later phase, in its `ROADMAP.md` entry), and moves into the spec at the
  PR review of the slice that builds it. Two exceptions:
  - **A bug**: when `main` contradicts a rule that is still the design, the doc keeps the rule and
    adds a `**Known bug:**` line saying what `main` does and where the fix is listed. The fix's PR
    review removes the line. A doc never copies the bug.
  - **A subsystem designed for a later phase** lives in its file's `## Not built` half, the last
    half. Each rule there names the phase that builds it, and that phase's PR review moves it into
    `## Design` or `## Engine rules`.
- **One home per rule.** A spec file's `## Design` half holds player-facing behaviour, numbers and
  content tables; `## Engine rules` holds mechanisms, invariants and data shapes. Never restate a
  rule elsewhere: link to it.
- **No provenance.** Rules are present tense; changing a rule rewrites it, and nothing
  "supersedes". Where a rule was decided is in the mailboxes, the 4.2 inventories and git history.
- **Every rule is a `###` heading** under its half, its parts bullets under it, and is cited by
  anchor (`spec/combat.md#damage-channels-and-the-additional`).
- **Content lives in the content docs** (`content/`, `specializations/`), which describe what
  `main` ships: the code wins over a stale content doc, never over a decided design (a bug gets a
  `**Known bug:**` line). The spec holds the rules and the system-wide constants, and links to
  content rather than restating it.

(Phase 4.2 only) Until 4.2-G, citations of the form `CONVENTIONS "…"` and `GAME_DESIGN §…`, in
`src/` and in the docs, name the files as they were at commit `892f1b8`. Find the section's new
file with the map in `.claude/phases/4.2/brief.md` ("The file map"), or read the old text with
`git show 892f1b8:.claude/CONVENTIONS.md` (or `GAME_DESIGN.md`). Cross-links between the living
docs use the label form (`spec/combat.md` "Damage channels and the Additional") until 4.2-G
converts them to anchors.

## Tech stack

- **TypeScript** (strict): non-negotiable; types are the contract we build against.
- **React** and **Vite**: a reactive UI over the game-state store; Vite for dev and the static
  build.
- **State**: one typed **Zustand** store (`spec/store.md` "One store").
- **Persistence**: IndexedDB, from Phase 5 (`spec/saves.md`).
- **Deploy**: GitHub Pages, from `vite build` (`CONVENTIONS.md` "GitHub Pages, from a subpath").
- **No backend, no accounts, no network calls in gameplay.** Don't introduce a backend, a new
  framework or a second state library without saying so.
