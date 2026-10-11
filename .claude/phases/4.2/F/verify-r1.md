# Verify round 1 — Phase 4.2 — Slice F

Base `298914e` (`main` after 4.2-E); old text read from `892f1b8` (`C:` / `G:` units) and `298914e`
(`CLAUDE.md`, `ROADMAP.md`, `WORKFLOWS.md` units).

## Result

- `npm run docs:check -- inventory F` (the skill says `4.2-F`; the script takes `F`): **PASS**, 280
  units and 280 rows checked.
- Rows checked: **280**. Findings: **3** (all low). Spec and code disagree: **3** cases. Stale
  `src/` comments: 9 (for 4.2-G).

How the rows were checked:

- **Mechanically, all rows:**
  - every `file.md "Label"` home named in a Reason resolves to a real heading (about 400 labels;
    the only misses were quoted old text, not homes);
  - every label-form citation of the six condensed files, from the whole living-doc tree outside
    `phases/` and `archive/` (28), resolves;
  - every `file.md#anchor` in the B to F inventories resolves, except three from B (see Notes for
    4.2-G);
  - every `phases/` and `archive/` link in `ROADMAP.md` exists.
- **Side by side against the old text:**
  - `C:` (all 68 units): old vs new `CONVENTIONS.md`;
  - `G:` (22 units): `VISION.md` and `OPEN_QUESTIONS.md`;
  - `CLAUDE.md`: all 25 units;
  - `WORKFLOWS.md`: all 34 units, the dropped step paragraphs against `workflow/kickoff.md`,
    `plan-review.md`, `pr-review.md`, `coding-rules.md`, `design-rules.md`.
- **Dropped rows named in the request:**
  - `CLAUDE.md:15`: each fact named in the Reason greps to a heading that states it. Checked first:
    the Cast slot index or random castable gem (`spec/combat.md:34`, `:330-334`), the single-instance
    container (`spec/statuses.md:107`) and "no stat-modifier inside" (`spec/effects.md` "No
    temporary stat-modifier"), the full party in the first session (`spec/creatures.md:95`), the
    turn sequence ("Turn structure"). No fact of the summary is missing from the list.
  - ROADMAP finished-phase bullets: not all 49 re-read sentence by sentence. I took the bullets that
    could hold a rule and looked for the rule in the spec:
    - the variable-length gem array (`spec/combat.md:336`) and AOE frozen at cast-start (`:343`);
    - `Script` / `defaultTarget?` (`spec/scripting.md:156-159`);
    - the single RNG draw for the winning rule (`spec/scripting.md:105`);
    - floor 101+ seeded draw and pins (`spec/run.md:35`, "Pins");
    - the facilities rules: instant actions, tiers only on three buildings, Atlas unlock
      (`spec/run.md:277-293`);
    - fusion: once, not self-fusable, parent order, innate spells travel (`spec/creatures.md`
      "Fusion");
    - gems as items and their migration (`spec/creatures.md` "Gems as items");
    - Dependabot (`.github/dependabot.yml`: weekly, minor/patch grouped, majors separate).
    All found. The superseded ones (`:62`, `:134`, `:140`, `:145`) are superseded as stated.
  - `WORKFLOWS.md:99`: see finding 3. The other sentences have their home.
  - `ROADMAP.md:449` ("keep PRs phase-scoped"): the loose reading is acceptable. The remaining
    "Stay in this slice's scope" is narrower than "phase-scoped" but contained in it, and
    `WORKFLOWS.md` "When a slice is too big" holds the sizing rule. Not counted as a finding.
- **Other direction (sentences with no unit):**
  - `CLAUDE.md` "How the spec is written" traces to the phase brief's "Rules for the new spec" and
    `ROADMAP.md:274-283`. The one addition is "(or, for a later phase, in its `ROADMAP.md` entry)",
    which matches the brief's own "Condensing rules" practice and the ROADMAP's "Decided, not built"
    entries.
  - `OPEN_QUESTIONS.md` "Sacrifice-revive" has no unit (finding 2).
  - Nothing else found.

## Findings

1. **`C:1825`, summon cost.**
   - What is wrong: the Reason drops "(free; nothing reads it until Phase 8's Soul Altar names the
     currency it is paid in)" as a duplicate of `spec/creatures.md` "Souls" and "Summoning at the
     Soul Altar". Those say a summon is "free" (`spec/creatures.md:84`) and that the Altar is
     required later (`:298`). Neither says that `BalanceConfig` carries a `summonCost` that nothing
     reads yet. `CONVENTIONS.md` "Where each number lives" lists "the summon cost" with no note
     that it is inert.
   - Evidence: `src/data/balance.ts:27` `summonCost: 0`; `src/engine/balance-types.ts:68`; no
     `summonCost` reader outside tests; `grep -in "summonCost\|summon cost" .claude/spec` finds
     nothing.
   - Fix: keep a short clause in the list, or name the true home in the Reason.

2. **`OPEN_QUESTIONS.md` "Sacrifice-revive" has no inventory row.**
   - What is wrong: the text is in the new file (`OPEN_QUESTIONS.md:79-81`) and in the base file
     (`OPEN_QUESTIONS.md:49`), but it is not a `G:` unit (absent from `892f1b8`). 4.2-B moved it in
     (B inventory row `species/species-locked.md:143`). F's skeleton only counts `G:1284-1347`, so
     `inventory F` passes without it. B's row now points to
     `OPEN_QUESTIONS.md#13-open-questions--parked-items`, which no longer exists.
   - Fix: add a row, or note in the inventory that base-only lines moved in by earlier slices are
     outside the units.

3. **`WORKFLOWS.md:99`, step 6 "Duncan pushes and opens the PR".**
   - What is wrong: dropped as a duplicate of `workflow/pr-review.md`, but `pr-review.md` only says
     "Duncan gives [the branch] with the command". "Opens the PR" appears nowhere else.
     `WORKFLOWS.md` "Who does what" says the human "commits, pushes, merges", not "opens the PR".
   - Evidence: `grep -rin "opens the PR\|open the PR" .claude/workflow .claude/WORKFLOWS.md
     .claude/skills` finds nothing.

## Spec and code disagree

1. **CI jobs and triggers** (`CONVENTIONS.md` "Every pull request runs the gates", "Deploy only from
   main, only if tests pass").
   - Spec: "on every pull request and every push to `main`" and "The build-and-publish job is gated
     on the test job and guarded to the `main` branch: tests on every change, deploy on `main`."
   - Code, `.github/workflows/deploy.yml:3-6`: `on: push: branches: [main]`, `pull_request`,
     `workflow_dispatch`.
   - Code, `:42-43`: the `build` job has only `needs: test`, so it runs on pull requests.
   - Code, `:61`: only `deploy` has `if: github.ref == 'refs/heads/main' && github.event_name ==
     'push'`.

2. **Spell library layout** (`CONVENTIONS.md` "Effect carriers live in libraries").
   - Spec: "Each is split by grouping, `core.ts` (cross-cutting), `starters.ts` and one file per
     biome ... `data/traits/`, `data/spells/`".
   - Code: `src/data/traits/` has `core.ts`, `starters.ts` and the three biome files.
     `src/data/spells/` has `core.ts` and the three biome files (`overgrowth.ts`,
     `rotcap-hollow.ts`, `glimmerdark.ts`), and no `starters.ts`.

3. **Source tree** (`CONVENTIONS.md` "Source folders").
   - Spec: `data/` is "creatures, traits, spells, biomes, facilities, config"; `state/` is "the
     store, save/load, migrations".
   - Code: `src/data/` has no facilities (Phase 8 builds them: `spec/run.md:272`). `src/state/` has
     the store and the simulator, with no save/load or migrations (Phase 5: `spec/saves.md`).

## Not re-measured

`OPEN_QUESTIONS.md` clean-path levelling (9 at floor 10, 25 at floor 30) and the Brute's 28 / 36
are kept from the old text, as the request says. I did not run the simulator. Everything else in
"Every number" matched:

- `WALL_FAILED_PUSHES` 5 (`state/balance-sim.ts:95`);
- `FLOOR5_WINDOW_RUNS` 20 (`:97`);
- `FLOOR1_MIN_CLEAR_PCT` 80 and `FIRST_SOUL_MAX_RUNS` 30 (`:1205-1206`);
- `CI_RUN_CAP` = max of the two = 30 (`:1211`);
- 40 `SIM_SEEDS` (`:89`);
- `probeBosses: false` in the three `balance-ci-*.test.ts`;
- T1 95% (`:1774`);
- floors 3 / 6 / 10 (`SOUL_BY_FLOOR`, `FULL_PARTY_BY_FLOOR`, `FIRST_BOSS_FLOOR`);
- the nine Phase-3 traits (`data/traits/core.ts`);
- `ROUND_CAP` 100 (`engine/config.ts:1`);
- the `BalanceConfig` list against `DEFAULT_BALANCE_CONFIG` (`data/balance.ts:9-28`);
- Node 24 and `format:check` in CI (`deploy.yml:26-36`).

## Stale comments in `src/` (for 4.2-G)

- `src/engine/config.ts:1-2`: "exact number TBD" and "GAME_DESIGN §13" (`ROUND_CAP` is 100, and
  `OPEN_QUESTIONS.md` "Fight length" asks whether it is right).
- `src/data/balance.ts:1-4`: the balancing pass "tunes the rest", every number "parked ... until
  then" (already in G's brief).
- `src/app/demoFight.ts:17`: "GAME_DESIGN.md §13".
- `src/data/species/glimmerdark.ts:12`, `overgrowth.ts:16`, `rotcap-hollow.ts:13`: "parked balance
  (GAME_DESIGN §13)".
- `src/engine/curves.ts:3`: "still explicitly parked balance (GAME_DESIGN §13)".
- `src/state/rewards.ts:108`: "parked balance (GAME_DESIGN §13)".

## Notes for 4.2-G

- Earlier inventories hold three anchors that no longer resolve: B
  `specializations/shieldbarer.md:59` → `spec/progression.md#9-player-specializations`; B
  `species/species-locked.md:186` → `spec/run.md#4-the-cave-world--structure`; B
  `species/species-locked.md:143` → `OPEN_QUESTIONS.md#13-open-questions--parked-items` (finding 2).
  `inventory B` passes today, so the check does not follow `New home` into the files other slices
  rewrote.
