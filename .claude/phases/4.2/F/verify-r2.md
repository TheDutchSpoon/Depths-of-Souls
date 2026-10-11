# Verify round 2 — Phase 4.2 — Slice F

Base `298914e`; round-2 changes read as `git diff 9d2a78f ef33c8c` (docs only, no `src/` change).

## Result

- `npm run docs:check -- inventory F`: **PASS**, 280 units and 280 rows checked.
- Rows checked: the 8 touched in round 2 (`C:1825`, `C:2057`, `C:2060`, `C:2094`, `C:2106`,
  `WORKFLOWS.md:19`, `WORKFLOWS.md:99`, plus the new "Base-only text" row). The other 272 are
  unchanged since round 1. Findings: **2** (both low). Spec and code disagree: **0**. Stale `src/`
  comments: none new (round 1's 9 stand, already in G's brief).

## Round 1 findings

1. **Summon cost (`C:1825`): resolved.** `CONVENTIONS.md` "Where each number lives" keeps "(free:
   nothing reads it until Phase 8's Soul Altar names the currency it is paid in)". Code agrees:
   `src/data/balance.ts:27` `summonCost: 0`, `src/engine/balance-types.ts:68`, no non-test reader.
2. **Sacrifice-revive: resolved.** The "Base-only text" table lists `OPEN_QUESTIONS.md:49` →
   `OPEN_QUESTIONS.md#sacrifice-revive`; the heading exists (`OPEN_QUESTIONS.md:79`). G's brief
   carries the three dead B anchors with that mapping.
3. **"Opens the PR": resolved.** `WORKFLOWS.md:23` "Who does what" now says the human "commits,
   pushes, opens the PR, merges, and deletes files". Rows `WORKFLOWS.md:19` and `:99` updated and
   consistent.

## Round 2 decisions, against the code

- **CI** (`CONVENTIONS.md` "Every pull request runs the gates", "Deploy only from main…"): matches
  `.github/workflows/deploy.yml`. `on:` is `push: [main]`, `pull_request`, `workflow_dispatch`
  (`:3-6`); jobs `test` (`:17`), `build` with `needs: test` (`:42`), `deploy` with `needs: build`
  and `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` (`:61-63`).
- **Spell and trait libraries** (`CONVENTIONS.md` "Effect carriers live in libraries"): matches.
  `src/data/spells/` has `core.ts`, `overgrowth.ts`, `rotcap-hollow.ts`, `glimmerdark.ts`,
  `index.ts` and no `starters.ts`. `src/data/traits/starters.ts` holds the three starter traits and
  `UNICORN_TRAIT` (`:22`, `:46`, `:59`, `:82`). Arcane Bolt is a biome-1 spell
  (`src/data/spells/overgrowth.ts:97-105`).
- **Source tree** (`CONVENTIONS.md` "Source folders"): `state/` holds the store, `balance-sim.ts`,
  `rewards.ts`, `ids.ts` and no save/load or migrations; `data/` has no facilities. Matches.

## Findings

1. **`WORKFLOWS.md:23`, an unwrapped line.** The round-2 edit lengthened the line to 112 characters
   (the rest of the bullet wraps at 100, the line before it ends at "commits,"). Text is right; the
   wrapping is not. Evidence: `.claude/WORKFLOWS.md:22-24`.
2. **`CONVENTIONS.md` "Source folders", `data/` list is incomplete** (also in the old text, so a
   carry-over rather than a regression, but the round-2 edit rewrote this exact line). It names
   "creatures, traits, spells, biomes, config". `src/data/` also holds `statuses.ts`, `scripts.ts`
   and `specializations.ts` (and `roles`' test only); the statuses file is named two bullets later
   under "Effect carriers live in libraries" (`data/statuses.ts` stays flat), scripts and
   specializations are named nowhere in CONVENTIONS. Evidence: `ls src/data`.

## Spec and code disagree

None found in the round-2 passages.

## Other direction (text with no unit)

The round-2 additions all trace to a row: the summon-cost clause (`C:1825`), the CI wording
(`C:2057`, `C:2060`), the tree and library lines (`C:2094`, `C:2106`), "opens the PR" (`WORKFLOWS.md:19`
and `:99`). G's brief gains only the two notes the request lists.

## Not re-measured

Unchanged: the clean-path levelling (9 at floor 10, 25 at floor 30) and the Brute's 28 / 36.

## Stale comments in `src/` (for 4.2-G)

None new. Round 1's list stands (`engine/config.ts:1-2`, `data/balance.ts:1-4`,
`app/demoFight.ts:17`, `data/species/{glimmerdark,overgrowth,rotcap-hollow}.ts`, `engine/curves.ts:3`,
`state/rewards.ts:108`).
