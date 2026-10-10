# Phase 4.2 — Docs restructure: the context diet

**Status: planned.** Docs only. Decided with the design owner on 2026-10-10 (ROADMAP "Phase 4.2").
Golden policy for every slice: **byte-identical**. `src/` is untouched except in 4.2-G, and there
only in comments.

## Why

Every fresh agent chat reads CLAUDE.md, CONVENTIONS (181 KB) and GAME_DESIGN (105 KB) in full:
about 300 KB before it touches code. Measured on 2026-10-10, the weight comes from:

- each subsystem described in up to three places (CLAUDE.md's rule summary, GAME_DESIGN,
  CONVENTIONS);
- superseded rules kept next to their replacements ("supersedes the … reading below");
- 53 KB of "Phase 4 systems addenda" never folded into the sections they amend;
- the spec running ahead of `main` ("until 4.1-H2b2" markers).

Inline provenance (phase, PR and ASSUMPTION tags) is only ~3% of CONVENTIONS, so stripping it is a
side effect, not the goal. Only about 25 KB of CONVENTIONS is engineering convention; the rest is
the engine spec, which is why an engine slice must read both files today.

## Target layout

| File | Read this when | Holds | Size after 4.2-A |
| --- | --- | --- | --- |
| `CLAUDE.md` | always (every chat) | orientation, the doc map, the non-negotiables | (condensed in E) |
| `CONVENTIONS.md` | always (every chat) | engineering rules only: TypeScript, engine purity, testing and goldens, layout, deployment, plans, style | 25.3 KB |
| `VISION.md` | designing a feature | vision, pillars, core loop, non-goals | 4.4 KB |
| `OPEN_QUESTIONS.md` | a slice touches a parked question, or at a grill | open and parked design questions | 5.2 KB |
| `spec/effects.md` | any trait, perk or effect change | the effect framework: carriers, categories, modifiers, hooks, observation, loop safety, traits | 61.4 KB |
| `spec/combat.md` | any change to how a fight resolves | fight setup, turns, the action pipeline, targeting, damage, the event log, encounters | 52.8 KB |
| `spec/statuses.md` | any status change | status lifecycle and timing, ticks, locks, immunity, the status content | 28.9 KB |
| `spec/creatures.md` | collection, creature or gem changes | species, creatures and instances, affinity, stats, levels, souls, gems, equipment, fusion | 27.4 KB |
| `spec/run.md` | descent, generation or hub changes | floors, biomes, generation, bosses, the hub and facilities, rewards, currencies | 26.3 KB |
| `spec/scripting.md` | script or behaviour changes | conditions, selectors, the interpreter, stock and role scripts | 19.8 KB |
| `spec/responses.md` | with `effects.md`, for any triggered behaviour | the response vocabulary: what a triggered effect can do, its targets and magnitudes | 17.8 KB |
| `spec/progression.md` | progression changes | specializations, perks, starters, incremental layers | 9.4 KB |
| `spec/store.md` | any store or UI-facing state change | the store's ownership, store actions and how they fail, the collection shape, `newGame` | 2.0 KB |
| `spec/saves.md` | save or load changes | `snapshot`/`hydrate`, the save format, partitions, versions and migrations, autosave, file ops | 6.3 KB |

The content docs (`content/`, `specializations/`, `species/`), `ROADMAP` and `WORKFLOWS` keep their
place and are condensed in place (4.2-B and 4.2-F); `species/species-locked.md` is folded into the
biome docs and deleted. `species/_species-backlog.md` (an ideas list, not spec), `workflow/`,
`skills/`, `phases/` and `archive/` are not condensed.

**Names.** `CONVENTIONS.md` keeps its name because it now holds exactly the conventions, and
because Windows is case-insensitive: a new `conventions.md` would collide with `CONVENTIONS.md` on
Duncan's machine. `VISION.md` and `OPEN_QUESTIONS.md` are uppercase like the other top-level living
docs; `spec/` is lowercase like `content/`.

## Rules for the new spec

These hold from 4.2-A on and are what the condensing slices write to.

1. **The spec describes `main`.** A decision that isn't built lives in its phase brief under
   "Decided, not built" and moves into the spec at the PR review of the slice that builds it. No
   "until <slice>" or "(4.1)" markers.
2. **One home per rule.** A rule appears once. A file's `## Design` half holds player-facing
   behaviour, numbers and content tables; its `## Engine rules` half holds mechanisms, invariants
   and data shapes. Never restate one half in the other: link.
3. **No provenance in the spec.** Rules are present tense. Changing a rule rewrites it; nothing
   "supersedes". Where an existing rule was decided is recorded in the 4.2 inventories; later
   decisions are found through the spec's git history.
4. **Every rule is a `###` heading** under its half (`#` is the file title, `##` the halves). A
   rule's parts are bullets under it. From 4.2-G, citations are anchors:
   `spec/combat.md#damage-channels` (GitHub's heading-anchor rules), checked in CI.
5. **Each file opens with one "Read this when …" line**, and has a size budget from 4.2-G on. Going
   over a budget is a review trigger, not a CI failure (see "Checks").
6. **Reading model.** Every chat reads `CLAUDE.md` and `CONVENTIONS.md`. The kickoff names the spec
   files a slice reads. Reviewers read the same, plus any spec file the diff touches.
7. **Content lives in the content docs.** Specific creatures, traits, spells, statuses and bosses,
   with their numbers, are described in `content/`, `specializations/` and the like, which describe
   what `main` ships (the code wins). The spec holds the rules and the system-wide constants (the
   Additional's 0.2 and 10, the level curve), and links to content rather than restating it.

## The file map (4.2-A)

**Source, pinned:** `CONVENTIONS.md` and `GAME_DESIGN.md` at commit `892f1b8` (sha256 prefixes
`91455dd2026ba18d` and `0970f347753833df`). If either differs when 4.2-A is built, stop: the map is
by line number.

Each row is a run of lines, moved **verbatim and in order**; the label is the run's first line, for
checking. In each target file, the `## Design` rows come first (from GAME_DESIGN, in old order),
then `## Engine rules` (from CONVENTIONS, in old order), then `## To fold` (the Phase 4 addenda, in
old order). A half with no rows is left out. `CONVENTIONS.md`, `VISION.md` and `OPEN_QUESTIONS.md`
have no halves (—). Every line of both files is in exactly one row (checked 2026-10-10).

### CONVENTIONS.md (2160 lines)

| Lines | First line (label) | Target | Half |
| --- | --- | --- | --- |
| 1–39 | Depths of Souls — Conventions | `CONVENTIONS.md` | — |
| 40–118 | Generation & the run layer (Phase 4) | `spec/run.md` | Engine rules |
| 119–139 | `materializeCreature(template, { level, side, slot, speciesId, gems… | `spec/creatures.md` | Engine rules |
| 140–148 | Enemy script & loadout at spawn | `spec/run.md` | Engine rules |
| 149–165 | Player gem sets | `spec/creatures.md` | Engine rules |
| 166–175 | Rewards | `spec/run.md` | Engine rules |
| 176–181 | Phase 4 systems addenda (surfaced during content design) | `spec/responses.md` | To fold |
| 182–186 | `on-[action]` hook family | `spec/effects.md` | To fold |
| 187–212 | Action instance-list (locked, resolves the "attack again" ambiguity) | `spec/combat.md` | To fold |
| 213–215 | Grant-action-state response | `spec/responses.md` | To fold |
| 216–243 | Support-spell model | `spec/combat.md` | To fold |
| 244–348 | Response vocabulary — eight verbs (nine until 4.1-H2b2), and "no si… | `spec/responses.md` | To fold |
| 349–379 | DoT and Regen from the applier's snapshot | `spec/statuses.md` | To fold |
| 380–425 | Flat-mode stat-derived magnitude | `spec/responses.md` | To fold |
| 426–433 | Armor penetration | `spec/combat.md` | To fold |
| 434–497 | New primitives / capabilities | `spec/effects.md` | To fold |
| 498–501 | consume-stacks | `spec/responses.md` | To fold |
| 502–513 | status-effect immunity | `spec/statuses.md` | To fold |
| 514–535 | adjacency targeting | `spec/combat.md` | To fold |
| 536–554 | Splashing / Annihilate | `spec/effects.md` | To fold |
| 555–582 | Action locks: `action-lock { scope: 'all' \| 'attack' \| 'cast' }` | `spec/statuses.md` | To fold |
| 583–598 | acted-before-target | `spec/effects.md` | To fold |
| 599–643 | turn-order status | `spec/statuses.md` | To fold |
| 644–647 | Flow | `spec/run.md` | To fold |
| 648–649 | Principles (locked) | `spec/statuses.md` | To fold |
| 650–657 | Death-reset | `spec/effects.md` | To fold |
| 658–658 | No side doors | `spec/responses.md` | To fold |
| 659–662 | Immunity suppresses the *effect*, not the *application | `spec/statuses.md` | To fold |
| 663–677 | Phase 4 Slice F addenda (specializations, perks, starters, the Unic… | `spec/effects.md` | To fold |
| 678–687 | `all-allies` `ResponseTarget` | `spec/responses.md` | To fold |
| 688–711 | `conditional-damage-bonus` gains an `actionKind` axis | `spec/effects.md` | To fold |
| 712–719 | `StatusDef.defaultDuration: number` | `spec/statuses.md` | To fold |
| 720–740 | The Sorcerer starter's extra spell is an innate spell | `spec/progression.md` | To fold |
| 741–754 | Phase 4 Slice H2 addenda (Glimmerdark) | `spec/responses.md` | To fold |
| 755–764 | `TriggeredDef.stacks?: boolean` — a new dedup flag | `spec/effects.md` | To fold |
| 765–773 | Phase 4 Slice H3 addenda (Rotcap Hollow) | `spec/statuses.md` | To fold |
| 774–795 | `random-ally-without-status` — one new `ResponseTarget` variant. | `spec/responses.md` | To fold |
| 796–1020 | Combat & scripting | `spec/combat.md` | Engine rules |
| 1021–1023 | DoT damage | `spec/statuses.md` | Engine rules |
| 1024–1128 | Provoke targeting | `spec/combat.md` | Engine rules |
| 1129–1242 | Interpreter | `spec/scripting.md` | Engine rules |
| 1243–1294 | Event log | `spec/combat.md` | Engine rules |
| 1295–1609 | Unified effect framework (load-bearing invariant) | `spec/effects.md` | Engine rules |
| 1610–1700 | Status lifecycle (Phase 3, re-timed in Phase 4.1-F) | `spec/statuses.md` | Engine rules |
| 1701–1776 | Data-driven content | `spec/creatures.md` | Engine rules |
| 1777–1804 | Currencies | `spec/run.md` | Engine rules |
| 1805–1824 | Unspecified magnitude ⇒ 100%. | `spec/effects.md` | Engine rules |
| 1825–1869 | Where each number lives | `CONVENTIONS.md` | — |
| 1870–1890 | State & persistence | `spec/store.md` | Engine rules |
| 1891–1917 | `snapshot()` / `hydrate()` | `spec/saves.md` | Engine rules |
| 1918–2160 | Testing | `CONVENTIONS.md` | — |

### GAME_DESIGN.md (1347 lines)

| Lines | First line (label) | Target | Half |
| --- | --- | --- | --- |
| 1–71 | Depths of Souls — Game Design Document | `VISION.md` | — |
| 72–249 | 4. The Cave (world & structure) | `spec/run.md` | Design |
| 250–253 | Perk points | `spec/progression.md` | Design |
| 254–461 | 5. Creatures | `spec/creatures.md` | Design |
| 462–688 | 6. Traits, statuses, equipment & the effect framework | `spec/effects.md` | Design |
| 689–787 | Status effects | `spec/statuses.md` | Design |
| 788–805 | Equipment | `spec/creatures.md` | Design |
| 806–972 | 7. Combat (automatic) | `spec/combat.md` | Design |
| 973–1101 | 8. Scripting system (the heart of the game) | `spec/scripting.md` | Design |
| 1102–1209 | 9. Player specializations | `spec/progression.md` | Design |
| 1210–1231 | 11. Persistence | `spec/saves.md` | Design |
| 1232–1235 | The store's boundary | `spec/store.md` | Design |
| 1236–1275 | References, not copies | `spec/saves.md` | Design |
| 1276–1283 | 12. Explicit non-goals (for now) | `VISION.md` | — |
| 1284–1347 | 13. Open questions & parked items | `OPEN_QUESTIONS.md` | — |

**Placement calls** (judgment; see the Assumptions checklist, A3). The groups that are condensed
together (C, D, E and F below) may move a unit between their own files freely, so a wrong call
inside a group costs nothing. Calls that cross groups: Support-spell model and "the stat a spell's magnitude scales
off" go to `combat`, not `creatures`; Death-reset goes to `effects`; Currencies (CONVENTIONS) and
the GAME_DESIGN currencies go to `run`; Equipment goes to `creatures`; Manual mode stays in
`combat`; Perk points and the Sorcerer's innate starter spell go to `progression`; Where each
number lives and the Balance simulator go to `CONVENTIONS.md`; Unspecified magnitude goes to
`effects`.

## Checks

All checks are modes of one Node script (no new dependencies), run as `npm run docs:check --
<mode>`, written in 4.2-A. The 4.2-only modes are removed in 4.2-G.

### Line-proof (4.2-A)

Reads the pinned files with `git show 892f1b8:<path>`, so it never trusts the working tree's old
copies.

- **Nothing lost, nothing doubled:** the multiset of non-blank lines (trailing whitespace stripped)
  of the two old files equals the multiset of non-blank lines of the 13 new files, minus the
  **allowed additions**: each file's `#` title, its "Read this when …" line, and the `## Design`,
  `## Engine rules` and `## To fold` headings.
- **Order and placement:** for each new file and half, its lines are exactly the concatenation of
  the map rows assigned to it, in old order. The check derives this from the map independently of
  the move code, so a bug in one is caught by the other.
- Prints per-file byte totals, to compare with the table above. The table's sizes are the bytes of
  each file's moved rows (decimal kB), without the allowed additions, so a whole file is about
  0.1 kB larger.

### Inventory (4.2-B to F)

`inventory-skeleton <slice>` lists the slice's **units**; `inventory <slice>` checks the filled-in
`phases/4.2/<slice>/inventory.md`.

- **A unit** is a line of a pinned old file that, outside code fences, is a heading, a top-level list
  item (`- ` at column 0), or the first line of a top-level paragraph (not indented, not a
  blockquote, table row or `---`). A paragraph starts only at the top of the file or after a blank
  line, so a paragraph directly under a heading belongs to the heading's unit; a numbered item
  (`1. `) after a blank line is a paragraph start. Nested bullets, tables and code belong to the
  unit above them. CONVENTIONS has 261 units and GAME_DESIGN 262.
- **A slice's units** are those whose map row targets one of the slice's spec files, plus every unit
  of the other files it condenses, read at the slice's base, `git merge-base HEAD main`, so each
  slice inventories those files as it found them (prefix `<path>:<line>`; the glob is expanded at
  the base too). If `main` moves during the slice, the check fails rather than passing on shifted
  lines.

  | Slice | Spec files (from the map) | Other files |
  | --- | --- | --- |
  | B | — | `content/*.md`, `specializations/*.md`, `species/species-locked.md` |
  | C | `creatures`, `run`, `progression`, `store`, `saves` | — |
  | D | `effects`, `responses`, `statuses` | — |
  | E | `combat`, `scripting` | — |
  | F | `CONVENTIONS.md`, `VISION.md`, `OPEN_QUESTIONS.md` | `CLAUDE.md`, `ROADMAP.md`, `WORKFLOWS.md` |
- **The check:** every unit of the slice appears in exactly one row; Fate is one of `kept`,
  `rewritten`, `merged`, `moved`, `dropped`; New home is an existing `file#anchor` (one or more)
  for every fate but `dropped`; Reason is non-empty for every fate but `kept`; no row names a unit
  outside the slice.

### Citations (4.2-G, blocking in CI) and budgets (4.2-G, a review trigger)

- **Citations, blocking:** every citation of the form `<path>.md#<anchor>` in `src/` and in the living docs resolves to
  exactly one heading. A citation of `CONVENTIONS "…"` or `GAME_DESIGN §…` outside `phases/` and
  `archive/` fails.
- **Budgets, reported:** `docs:check` prints each spec file's size against its budget (its size
  after condensing, plus 20%, rounded up to a whole KB). It never fails CI: only the design agent
  edits the spec, so a blocking check would fail an unrelated PR whose author can't fix it.
- **Over budget:** if a review's doc sync takes a spec file over its budget, that same review
  resolves it (`workflow/pr-review.md`, added in 4.2-G): **condense** if the growth is accretion
  (history, duplicates, restated rules); **split the file by subsystem** if it is genuinely new
  rules; or **raise the budget** as Duncan's decision, with the reason in the review's docs-edited
  list. Going over is a prompt to choose, not an order to cut rules.

## Condensing rules (4.2-B to F)

- **What may be dropped:**
  - superseded text;
  - duplicates (keep the one home);
  - provenance (phase, slice, PR and ASSUMPTION tags; "decided", "locked", "review amendment");
  - worked arithmetic that a hand-derived golden already carries, replaced by a `Goldens:` line
    naming it;
  - history of how a rule came about.

  A sentence of **design intent** that a future change must respect ("indirect damage is the
  counter to Defence") is kept: it is a rule, not history.
- **Kept:** function, type and field names that pin an invariant or a data shape.
- **No new rules.** Every sentence of condensed text traces to a unit in the inventory.
- **Spec and code disagree:** never fixed quietly. It's a decide-point for Duncan. The spec then says
  what `main` does; an intended change goes to a brief as "Decided, not built".
- **Content** (specific creatures, traits, spells, statuses, bosses and their numbers) goes to the
  content docs (rule 7). A spec unit that restates content already in a content doc is dropped as a
  duplicate, naming where; content found only in the spec is moved to the right content doc. Numbers
  are checked against `src/data`.
- **Links to a file not yet condensed** use the label form (`spec/combat.md "Damage channels and the
  Additional"`); 4.2-G converts them.
- **Moving a unit to another file** (fate `moved`): its condensed text goes into the target file's
  right half, even if that file isn't condensed yet.
- **Stale `src/` comments found while checking** are listed for 4.2-G, never fixed in B to F.

## Inventory format

`phases/4.2/<slice>/inventory.md`, one table, rows in old-file order:

| Unit | Old label | Decided in | Fate | New home | Reason |
| --- | --- | --- | --- | --- | --- |
| C:349 | DoT and Regen from the applier's snapshot | 4.1-H2b2; numbers 4.1-H2d | rewritten | `spec/statuses.md#dot-and-regen-tick-from-the-appliers-snapshot` | provenance dropped; "supersedes" dropped with its target (C:380); the numbers line dropped as a duplicate of the content docs' status and spell entries |

`Unit` is `C:<line>` (CONVENTIONS), `G:<line>` (GAME_DESIGN) or `<path>:<line>` for the other files. `Decided in`
comes from the old text's own tags (blank when it has none).

## Process for 4.2

- **4.2-A and 4.2-G** run the normal loop (WORKFLOWS "The loop, per slice"). The coding agent writes
  the living docs **by script**, under the 4.2 exception in `workflow/coding-rules.md`, exactly as
  the slice brief says and nothing else.
- **4.2-B to F** swap the roles, because the spec is the design agent's and the coding agent knows
  the code:

  | # | Step | Who | Writes |
  | --- | --- | --- | --- |
  | 0 | Pre-flight | Duncan | the slice branch |
  | 1 | Condense | design agent, `/slice-condense <id>` | the condensed files, `inventory.md`, `verify-request.md` |
  | 2 | First commit | Duncan | commits step 1 |
  | 3 | Verify | coding agent, `/slice-verify <id> <N>` | `verify-r<N>.md` |
  | 4 | Fix | design agent, `/slice-condense <id> <N+1>` | doc fixes, `## Round <N+1>` in `verify-request.md` |
  | 5 | Merge | Duncan | when a verify round has no findings |

  Steps 3 and 4 repeat. A finding that needs Duncan (spec and code disagree) goes to him with a
  recommendation before the next round.
- **Golden policy:** byte-identical for every slice. B to F change only `.claude/`.

## Phase-4.2-only text

Everything added to a lasting file for this phase only (a rule, a paragraph, a skill, a script
mode) carries the marker `(Phase 4.2 only)`, so 4.2-G can find and remove it all. After 4.2-G,
`grep -rn "Phase 4.2 only"` outside `phases/` returns nothing. Today that covers the exception in
`workflow/coding-rules.md`, the paragraph in `WORKFLOWS.md`, `skills/slice-verify/` and
`workflow/condense.md`. Outside the repo: the Cowork command `/slice-condense`.

## During the transition (4.2-A merged → 4.2-G merged)

Citations of the form `CONVENTIONS "…"` and `GAME_DESIGN §…`, in `src/` and in the living docs,
still name the pinned files. Resolve one with this brief's map, or read the old text with
`git show 892f1b8:.claude/CONVENTIONS.md`. No code slices run during 4.2, so nothing builds against
a stale citation.

## Slices

| Slice | Delivers | Loop |
| --- | --- | --- |
| [4.2-A](A/brief.md) | The mechanical restructure, the check script, the doc map | normal |
| [4.2-B](B/brief.md) | The content docs condensed; `species-locked.md` folded in (the pilot) | condense |
| [4.2-C](C/brief.md) | `creatures`, `run`, `progression`, `store`, `saves` condensed | condense |
| [4.2-D](D/brief.md) | `effects`, `responses`, `statuses` condensed (most of the addenda) | condense |
| [4.2-E](E/brief.md) | `combat`, `scripting` condensed | condense |
| [4.2-F](F/brief.md) | The top-level docs: `CONVENTIONS`, `VISION`, `OPEN_QUESTIONS`, `CLAUDE.md`, `ROADMAP`, `WORKFLOWS` | condense |
| [4.2-G](G/brief.md) | Citations to anchors, budgets, CI, clean-up | normal |

Strictly in order. B comes first because once the content docs are the home of content, the spec
slices can drop GAME_DESIGN's content copies as duplicates; it is also the pilot, settling the
inventory format on a medium, low-risk slice (the content docs are already checked against the
code) before D, the biggest. F goes last among the condensing slices because `CLAUDE.md` can shrink
only once every rule it summarises has a home.

## Assumptions checklist

Decided by the design agent without a separate call; confirm or override at 4.2-A's plan review.

- **A1** Names: `CONVENTIONS.md` kept for the engineering file; `VISION.md` and `OPEN_QUESTIONS.md`
  uppercase.
- **A2** The store and saves are separate files (`spec/store.md`, `spec/saves.md`), decided with
  Duncan: UI slices read the store, not the save format, and Phase 5 will grow the save format.
- **A3** The placement calls under "The file map".
- **A4** At 4.2-A, a unit's half is decided by its source file (GAME_DESIGN → Design, CONVENTIONS →
  Engine rules); condensing re-sorts by content.
- **A5** The drop rules, including keeping design-intent sentences.
- **A6** The B–F loop and its role swap.
- **A10** The slice order and grouping (content first as the pilot; `store` and `saves` with
  `creatures`; the top-level docs last), decided with Duncan.
- **A7** 4.2-G rewrites citations in the living docs too, by script, under the exception.
- **A8** Budget = condensed size + 20%, rounded up to a whole KB; reported, not blocking, and
  resolved at the review that crosses it (decided with Duncan).
- **A9** The unit definition for inventories.

## Docs edited

Written at the 4.2 planning grill (2026-10-10): this brief and the six slice briefs; `ROADMAP.md`
(Phase 4.2 section); `WORKFLOWS.md` (pointer to this phase's loop);
`workflow/coding-rules.md` (the 4.2 exception); `skills/slice-verify/SKILL.md` (new).
