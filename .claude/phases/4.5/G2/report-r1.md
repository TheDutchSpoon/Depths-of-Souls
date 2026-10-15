# Report r1 — 4.5-G2: The demo, the hub

Built to `plan.md` as `plan-handout-r1.md` corrects it. The browser work ran in Edge through Playwright, installed in a scratch folder outside the repo (no repo dependency added).

## Gates

`npm run test` 2199 passed, 1 skipped (2200; main 2152, +48). `npm run lint`, `format:check`,
`npm run build`, `npx tsc -b`, `docs:check -- citations` and `docs:check -- comments` all pass.

Test count by file against main: instanceLabels.test 0 → 6, creatureLine.test 0 → 7,
partyRows.test 0 → 8, soulRows.test 0 → 6, perkRows.test 0 → 9, specSwitcher.test 0 → 5,
debugBoss.test 0 → 3, refusals.test 3 → 7 (the only changed existing test file; it only gains cases).

## Golden policy

Byte-identical. `git diff --stat origin/main -- src/engine src/state src/data` is empty (checked by
running it). No golden, engine or store test was touched; the corpus digest was not regenerated and
the three `balance-ci-*` tests pass in the full run.

## Mechanisms and the test that fails without each

Checked by editing the helper, running its test file, restoring it:

| Mutation | Result |
| --- | --- |
| ordinal dropped from labels | instanceLabels: 3 fail |
| XP threshold written out (`20 × level²`) | creatureLine: 1 fails |
| trait ids instead of names | creatureLine: 2 fail |
| `pickParty` passes `''` instead of `null` | partyRows: 2 fail |
| literal 6 rows | partyRows: 1 fails |
| party members filtered from options | partyRows: 1 fails |
| `Number()` instead of `parseFloorField` | perkRows: 2 fail |
| inactive predicate inverted | perkRows: 2 fail |
| switcher offers the current spec | specSwitcher: 1 fails |
| extra non-boss id in the Debug list | debugBoss: 3 fail |
| 0% souls shown | soulRows: 1 fails |

The refusal switches are exhaustive with a `never` default and keyed `Record<Reason, true>` rows in
the test (a new reason is a type error). Components are untested by design.

## First boss clear

Scan, in a scratch clone of the slice branch outside the repo, composing `balance-sim.ts`'s exports
(`summonPass`, `applyPartyOrder`, `nextRun`, `advanceProgress`, `SIM_SEEDS`, `RUN_CAP`). 3 specs ×
seeds 1..40, cap `RUN_CAP`. Cleared: sorcerer 40/40 (quickest 44 floor runs), brute 40/40 (38),
shieldbarer 28/40 (40). **Pick: brute, seed 10, 38 floor runs.** Cross-check against
`runSeed(..., { probeBosses: false, scripts: DEFAULT_REGISTRIES.scripts })`: floors and cleared
flags up to the floor-10 clear equal the scan's, one for one (38 = 38). Tables:
`evidence/first-clear-scan.md`; the call log with the party before every descent and the deepest
floor after: `evidence/first-clear-log.md`.

## Replay and click-through

- **Replay:** the 38-descent log through the real UI (Start Brute, seed 10): before every Descend the six party dropdowns equalled the logged activeParty, and after every descent the side panel's Deepest floor equalled the scan's (38 of 38, no mismatch, no extra descend). The clearing descent on screen: "Floor 10: cleared", "Defeated Broodmother: first clear, +100 perk points", side panel "100 earned, 0 spent, 100 free", then "Level of Might" 50 and "Set Might" gave "100 earned, 100 spent, 0 free". Log: `evidence/first-clear-replay.md`.
- **Click-through:** `evidence/click-through.md`. Party (swap, benched onto occupied, slot emptied, whole party emptied with the empty-party refusal, refilled, line-up after a reorder), Collection (gems by spell name), Souls (greyed with reason below 100%, summon into a free slot, into the bench, #1..#n labels, summon still available at 100%), Perks (each boss and a repeat, levels bought, invalid-level for abc / blank / 2.5 / -1 / 9999, over-budget, Refund all), the switcher (two other specs only; a switch after bought perks gives 0 spent and the new starter), New game (start screen, old run still in the side panel) and a fresh Start all passed. The inactive label shows on Sorcerer's page (the script's one FAIL line ran that check on Brute, which has no inactive perk).
- **Mid-playback:** viewer line count rose +6 in 4 s undisturbed and +7 in 4 s with a summon, a reorder, a boss kill and a perk field edit in between: the reveal kept running. I did not time beats against the 2-per-second figure beyond that.
- **Not done:** the three playback speeds, skip and jump are G1's and were not re-clicked. Hub actions were not tried with the spec switcher mid-playback.

## Spec questions

- The plan review's note that a perk's max spend can exceed 100 does not hold for current data:
  every perk's `maxLevel × costPerLevel` is at most 100. The `over-budget` test reaches the budget
  with two perks (49 levels of a 2-point perk, then one level of a dearer one). The plan's wording
  for that test row is stale.
- **Question for design: browser tooling.** This slice's browser checks ran in Edge
  through `playwright-core`, installed in a scratch folder outside the repo (no repo change, no
  dependency). Should the workflow docs (`coding-rules.md` or `WORKFLOWS.md`) say that is the
  standard way to do scripted browser checks: scratch install, `channel: 'msedge'` or `'chrome'`,
  dev server on a fixed port with `--strictPort`, scripts kept out of the repo and printed logs
  kept in `evidence/`? Separately, should Playwright become a repo devDependency for end-to-end
  tests, now or when Phase 7's real UI lands? That adds a dependency and CI weight, so it is
  design's and Duncan's call; this slice did not need it. The hub's `aria-label`s (`Party slot n`,
  `Summon <name>`, `Level of <perk>`, `Set <perk>`, `Boss`) are what made the scripts selector-free.
- Perks with `maxLevel` 1 and cost 100 mean one boss pays for exactly one such perk; nothing to fix.

## Content changes

None.

## To delete

None. (Scratch clone and outputs are in the OS temp folder, outside the repo.)
