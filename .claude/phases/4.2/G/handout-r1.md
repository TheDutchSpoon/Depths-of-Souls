# Hand-out r1 — Phase 4.2 — Slice G: Citations, budgets, CI, clean-up

For the coding agent. Branch `4.2-g`, on top of `e53ce62`. Read `.claude/workflow/coding-rules.md`
first. Everything here is a comment, a test or a doc-comment change: no `src/` code changes, and
the golden policy stays **byte-identical** (comment-only golden edits are allowed,
`CONVENTIONS.md#comment-only-golden-edits-are-allowed`). Answer with `report-r2.md`.

## 1. Re-point nine citations at the heading that states the fact

The rewrite pointed these at the closest heading it could find, marked `~` in the plan. Each fact
has an exact home in today's docs. Change only the anchor; keep the rest of the comment as it is
(4.2-H does the wording), except where a row says so.

| `src/` file:line (on `e53ce62`) | Now | Change to | The target states |
| --- | --- | --- | --- |
| `engine/__golden__/golden-dot.fixture.ts:15` | `spec/combat.md#fight-setup` | `spec/statuses.md#health-is-a-modifiable-stat` | "At fight start `currentHp` is the **effective** max Health". Also drop the quotation after the anchor (`: "currentHp inits to effective max Health at fight-start"`): it is old wording the target doesn't contain. |
| `engine/__golden__/golden-dot.fixture.ts:171` | `spec/combat.md#fight-setup` | `spec/statuses.md#health-is-a-modifiable-stat` | as above |
| `engine/__golden__/golden-spore-spread.fixture.ts:21` | `spec/effects.md#hook-execution` | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` | "`on-attack`, `on-cast` and `on-action-observed` fire **before** each instance's hit" |
| `engine/__golden__/golden-sporecloud-reaper-no-spore.fixture.ts:14` | `spec/effects.md#hook-execution` | `spec/combat.md#a-target-killed-by-its-pre-hit-hooks-fizzles` | as above |
| `data/traits/glimmerdark.ts:438` | `spec/responses.md#flat-mode` | `spec/responses.md#magnitude-modes` | "`scalingStat`: any stat … (Thorns and Shield Bash off Defence)". Write `per the example in` before the anchor, so the line no longer reads "per `…` own named example". |
| `state/integration.test.ts:397` | `spec/run.md#fights-per-floor` | `OPEN_QUESTIONS.md#fight-count` | the accepted risk that floor success compounds the per-fight win chance |
| `engine/__golden__/golden-shieldbarer-starter.fixture.ts:9` | `CONVENTIONS.md#golden-replay-tests` | `CONVENTIONS.md#every-golden-replays-through-one-shared-runner` | a fixture's optional driver for a golden that isn't "run N turns" or "run to the end" |
| `data/species/overgrowth.ts:19` | `content/overgrowth.md#reading-this-biome` | `spec/creatures.md#affinity` | affinity "lives on the creature, so one species can hold several" |
| `data/species/starters.ts:19` | `spec/progression.md#starter-species-are-stubs`/the spec docs | `specializations/brute.md#starter-cragfang-mauler`, `specializations/shieldbarer.md#starter-stonehorn-warden`, `specializations/sorcerer.md#starter-glyphmoth-seer` | each starter's "high X" (replace the whole parenthesis, `/the spec docs` included) |

## 2. Rewrite the affinity comment in `data/species/starters.ts` whole

`data/species/starters.ts:22-30` (the `ASSUMPTION (Slice F)` block on the starters' affinities) is
stale, and the rewrite made it claim something false:

- it now says `spec/progression.md#starter-species-are-stubs` "explicitly left the Brute/Shieldbarer
  starters' affinity unpinned ("affinities settle … ideally distinct")". That section says nothing
  of the kind; the quotation is old `species-locked.md` text. At the plan review Duncan decided
  distinct starter affinities are **not** a rule (D3), and took the same quotation out of
  `starters.test.ts`'s title for this reason;
- the affinities are pinned now, in each starter's entry, and the Unicorn's in its own
  (`content/overgrowth.md#unicorn-lightbearer`: Vitality), so "unpinned" and "likewise unpinned by
  any doc" are wrong;
- the affinity→stat correspondence it credits to `CLAUDE.md` is `spec/creatures.md#affinity`.

Rewrite the block to `CONVENTIONS.md#comment-why-not-what`, as you did the 22 stale comments: say
where each affinity is set (the three starter entries above and the Unicorn's), and, if it still
earns its place, that each starter's affinity matches its high stat through the soft
correspondence (`spec/creatures.md#affinity`). No `ASSUMPTION` marker, no slice tag, no
quotation, no history. Check each claim against `data/species/starters.ts` (the `affinity` fields).
Add it to `evidence/stale-comments.md` as row 23, in the same columns.

## 3. Tests of the `src/` wrap

- In `scripts/docs-check/citations.test.ts`, the test titled
  `passes a src/ comment wrapped with a block-comment leader only for the anchor form` asserts a
  **failure** (`old form`). Retitle it to what it checks: an old form wrapped over a ` * ` leader
  fails.
- Plan-review fix 3 asked for the wrap tests to use a real `//`-wrapped **and** a ` * `-wrapped
  comment at the `src/` site. The label form only has the `//` one. Add a ` * `-wrapped label form
  (`` /**\n * see `spec/combat.md`\n * "Damage formula"\n */ ``) that fails with `label form`.
- Show both failing with the `*` leader removed from `SITES.src.gap` (append the result to
  `evidence/mutation-check.txt`).

## 4. `parseBudgets`' doc comment

`scripts/docs-check/budgets.ts`: the doc comment says "the rows of the first table", but the
function reads every table row whose first cell is a backticked path and second a number. Make the
comment say what the code does. (`workflow/budgets.md` has one table, so nothing changes today.)

## Re-run and report

- All gates, plus `npm run docs:check -- citations` and `-- budgets`; the test count, file by file
  (+1 test in `citations.test.ts`, run once per site if you add it under `describe.each`: say
  which).
- The comment-and-title-only proof over every `src/` file changed against `main`, as in round 1:
  all identical. Show the output for the five fixture and data files this round touches.
- Fixture exports deep-equal to `main` for the four golden fixtures this round touches.
- `evidence/mapping-src.md`: the nine rows updated (source `review-r1 fix 1`); `starters.ts:22`
  noted as rewritten whole.
- `record.md`: add a line that the starters' affinity comment was rewritten and nine `~` citations
  re-pointed.
