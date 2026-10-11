# Verify round 3 — Phase 4.2 — Slice F

Base `298914e`; round-3 changes read as `git diff 4d3909c 28d9ac5` (docs only, no `src/` change).

## Result

- `npm run docs:check -- inventory F`: **PASS**, 280 units and 280 rows checked.
- Rows checked: the 1 touched in round 3 (`C:2094`). The other 279 are unchanged since round 2.
  Findings: **0**. Spec and code disagree: **0**. Stale `src/` comments: none new (round 1's list
  stands, already in G's brief).

## Round 2 findings

1. **`WORKFLOWS.md:23`, unwrapped line: resolved.** "Who does what" now breaks after "deletes
   files." and "Nothing reaches `main` without the human." starts the next line. The diff changes
   only the break; the words are identical.
2. **`CONVENTIONS.md` "Source folders", `data/` list: resolved.** It now reads "species (creatures),
   traits, spells, statuses, role scripts, specializations, biomes, balance config (facilities from
   Phase 8). No logic." Against `src/data/`: `species/`, `traits/`, `spells/`, `statuses.ts`,
   `scripts.ts` (seven role scripts: `STRIKER`, `GUARDIAN`, `WARDEN`, `CASTER`, `SUPPORT`,
   `OPENER`, `TAUNTER`; `src/data/scripts.ts:26-135`), `specializations.ts`, `biomes.ts`,
   `balance.ts`. Every entry exists and every non-test file is named. Row `C:2094` records the
   change.

## Round 3 changes, against the diff

- **Rewrap of "What a mailbox keeps"** (`WORKFLOWS.md:72-75`): the diff moves only the line break
  before "kept, anywhere in the mailbox:". No text change.
- **Line lengths:** over-100 lines left in `WORKFLOWS.md` are the loop table rows (86-96, tables
  are exempt) and the base's `(Phase 4.2 only)` paragraph (112), which G's brief lists for removal.
- **Inventory row `C:2094`:** states the round-3 change accurately; fate `merged` and New home
  `CONVENTIONS.md#source-folders` still hold.

## Spec and code disagree

None.

## Other direction (text with no unit)

The round-3 edits add no sentence: the `data/` list is a completion of the `C:2094` line, and the
rewraps change no words.

## Not re-measured

Unchanged: the clean-path levelling (9 at floor 10, 25 at floor 30) and the Brute's 28 / 36.

## Stale comments in `src/` (for 4.2-G)

None new. Round 1's list stands (`engine/config.ts:1-2`, `data/balance.ts:1-4`,
`app/demoFight.ts:17`, `data/species/{glimmerdark,overgrowth,rotcap-hollow}.ts`, `engine/curves.ts:3`,
`state/rewards.ts:108`).
