# Plan review — 4.5-G2: The demo, the hub

## Round 1

Reviewed against the kickoff, `phases/4.5/G2/brief.md`, `phases/4.5/brief.md#hub-g2`,
`phases/4.5/brief.md#tests-and-verification`, `spec/store.md`, `spec/progression.md`, and the code
the plan builds on (`src/state/store.ts`, `src/state/rewards.ts`, `src/state/balance-sim.ts`,
`src/data/specializations.ts`, `src/data/creatures.ts`, `src/app/names.ts`,
`src/app/floorPicker.ts`, `src/app/refusals.ts`, `src/app/App.tsx`, `src/ui/RunScreen.tsx`).
Tree: `4.5-g2`, kickoff and plan committed, nothing else ahead of `origin/main`.

### Verdict

**Approved**, with the plan fixes below carried by this round's hand-out. The hub design is sound:
helpers take state or the one store action they call, so every swap, refund and starter grant is
the store's; the hub is a sibling of `RunScreen`, and `DescentViewer`'s key (`descent.id`) and its
one prop are untouched by a hub action, so the timer can't restart; the golden policy matches the
kickoff. The fixes are almost all in the first-boss-clear tooling, where the plan re-implements
the simulator's policy that `balance-sim.ts` already exports, guesses a cap the repo's own report
argues against, and leaves the replay's exactness checked at one point per descent.

### Plan fixes

1. **The scan composes the simulator's exported policy; it restates none of it.** `balance-sim.ts`
   exports every piece: `INITIAL_PROGRESS`, `nextRun`, `advanceProgress`, `summonPass`,
   `applyPartyOrder`, `SIM_SEEDS`, `RUN_CAP`, `FIRST_BOSS_FLOOR`. The scan builds
   `createGameStore()` (default deps), runs `newGame` → `setSpec` → `runScriptedIntro`, seeds the
   `summoned` set from the owned instances' `staticCreatureIdFor` (as `runSeed` does), and loops:
   `summonPass` + `applyPartyOrder` once before the first run and after each run; `nextRun` for the
   floor and kind; `descend`; `advanceProgress`. It stops at `deepestFloor >= FIRST_BOSS_FLOOR` or
   `RUN_CAP` runs, and after the clearing descent runs no further policy step. `applyPerkPlan` is
   left out: before the first boss clear the budget is 0, so it only ever calls `refundAllPerks` on
   an empty spend.
2. **The pick is cross-checked against `runSeed`.** For the picked `(spec, seed)`,
   `runSeed(spec, seed, { seeds: [], probeBosses: false, scripts: DEFAULT_REGISTRIES.scripts,
   runCap })` gives `runs`; its floors and `cleared` flags up to the first floor-10 clear equal the
   scan's, one for one. Printed in `evidence/first-clear-scan.md`. Two independent drivers of the
   same policy agreeing is the proof the scan follows it. (`probeBosses: false` and the stock
   scripts are the two switches that make `runSeed` the default-deps store the kickoff asks for.)
3. **The log is exactly the calls the store received, in order.** Summons are logged as
   `summonPass` returns them; each `applyPartyOrder` is logged as the target id list it applied
   (`orderedParty` of the collection at that moment), and the replay makes the same calls,
   `setPartySlot(slot, ids[slot])` for slot `0..ids.length-1` in order, skipping a call only when
   that slot already holds that id at that moment (a state no-op in the store, and a select that
   fires no change event in the browser). Any other skip or reordering desynchronises the replay.
4. **The replay checks the party before every descent, not only the deepest floor after.** The
   scan logs `activeParty` (six ids or empty) before each `descend`; the browser script reads the
   six `Party slot n` dropdown values before clicking **Descend** and compares. A mismatch stops
   the replay and is reported. Deepest floor after each descent stays as the second check. The
   script awaits a render between steps (a summon adds a dropdown option the next pick needs).
5. **The scan runs in a scratch clone, not through a scratch Vitest config.** A clone of the slice
   branch outside the repo (`WORKFLOWS.md#what-a-mailbox-keeps`: "Anything else the step needs
   lives in a scratch clone outside the repo"), with the scan as a test file inside that clone's
   tree, run by its own `npx vitest run <file>`. Nothing of it is committed. The browser replay
   runs against the working tree's dev server. (Replaces ASSUMPTION 8 and its stop-and-ask.)
6. **Every repeated control has its own accessible name.** The plan names the dropdowns but
   leaves several **Summon** and **Set** buttons sharing one text. Each Souls row's button is
   `aria-label="Summon <creature name>"`; each perk row's field is `aria-label="Level of <perk
   name>"` and its button `aria-label="Set <perk name>"` (creature and perk names are unique in
   the data). The Debug select is `aria-label="Boss"`.
7. **The perk field uses the floor field's parser.** `parsePerkLevelField` calls `parseFloorField`
   (`src/app/floorPicker.ts`) rather than repeating its regex: "only trimmed digits are a whole
   number" keeps one home. `floorPicker.ts` itself is not edited.
8. **`bossChoices` names each boss through `bossName(id)`** (`src/app/names.ts`), the kickoff's
   wording, not by reading the creature's `name` a second way.
9. **Report note, corrected.** Neither `store.ts` comment that mentions `src/app` (the run seed is
   generated there) is made stale by the hub; nothing to raise. The brief's "three gems" is now
   "one per regular gem slot" (Docs edited below), so that spec question is closed.

### Assumptions

- **ASSUMPTION 1** (inactive label "inactive (its system isn't built yet)"): **confirm.** It is the
  brief's (G1, G2) assumption, confirmed rather than changed, so no bring-back; it passes the
  refusal test's phase-id pattern.
- **ASSUMPTION 2** (affinity and rarity printed from the id, first letter capitalized): **confirm.**
  No display table exists in `src/data` or `src/app`; a new one would be a second home for the
  same names.
- **ASSUMPTION 3** (one " | "-separated line, structured fields asserted): **confirm.**
- **ASSUMPTION 4** (refusal wording): **confirm.** `no-spec` reads the same as the descend refusal's
  `no-spec`, which is right: one reason, one sentence. Distinctness is checked per union, so the
  existing test style holds.
- **ASSUMPTION 5** (draft starts at the current level; **Set** button, disabled with the refusal):
  **confirm.** After **Refund all** the field keeps its draft while level / max shows 0; that is
  the kickoff's "whatever the drafts hold", not a bug.
- **ASSUMPTION 6** (Party shows each occupant's line; Collection lists the bench only): **confirm**
  (the brief's wording).
- **ASSUMPTION 7** (three columns, hub shown after Start only): **confirm.** Below the run screen
  would put the hub under a growing log, out of view during the mid-playback checks. Give the hub
  column the same `flex: 1; min-width: 0` as the run column so long creature lines wrap instead of
  squeezing the log.
- **ASSUMPTION 8** (scratch Vitest config outside the repo): **correct**, plan fix 5.
- **ASSUMPTION 9** (3 specs × seeds 1..40, cap 60): **correct** the cap to the simulator's
  `RUN_CAP`, seeds stay `SIM_SEEDS`. The repo's only full report
  (`phases/4.5/S/evidence/sim-report.txt`, before slices E and F) has the quickest floor-10 clear
  at 38 (Sorcerer), 42 (Brute) and 54 (Shieldbarer) floor runs, medians 80, 69 and 146. On those
  numbers a cap of 60 still admits each spec's quickest seed, so the pick would be the same; but
  most candidates would read "not cleared", and if E and F slowed progress none might clear, which
  the plan's fallback turns into a stopped slice. With `RUN_CAP` every candidate gets a real
  number, comparable to the simulator's T4 line, at the cost of scan runtime only. See
  decide-point 1 for what that means for the replay.
- **ASSUMPTION 10** (no confirmation on a switch; the Debug select always lists every boss):
  **confirm.** A confirm prompt would also block the browser tooling (a modal dialog).
- **ASSUMPTION 11** (soul rows in map order, "<n>%" unrounded): **confirm.** Gains are whole numbers
  per rarity (`soulGainPercent` 25/20/10) and `descend` caps at 100.
- **ASSUMPTION 12** (unmodified default store; one summon per id): **confirm**, now by import
  (`summonPass`'s `summoned` set) rather than a restated rule, plan fix 1.

### Mechanisms and tests

Every mechanism the kickoff lists has a named test that fails without it, at each site (the label
map has one site and both consumers are checked against it; `pickParty` has the spy test and the
real-store swap). The two that are click-through only (New game never touching the store; hub
actions leaving playback running) are the kickoff's own choice of no Testing Library. The
`over-budget` case is sound: a perk whose max spend exceeds 100 always has `floor(100 / cost) + 1
≤ maxLevel`, so the `+ 1` reaches the budget check and not `invalid-level`.

### Golden policy

Matches the kickoff: byte-identical, `git diff --stat origin/main -- src/engine src/state src/data`
empty, existing `src/app` tests only gain cases.

### Decide-points

1. **The first-boss replay will be long: ~40–60 UI descents, not a handful.** On the last report
   the quickest seed needs 38 floor runs; E and F's level-up fixes may shorten that, but the scan
   decides. Every one is a scripted Descend plus its summons and party picks, checked step by step
   (plan fixes 3 and 4). **Recommendation: accept it.** The cost is runtime of a script, not
   review effort, and the alternatives are worse: widening the seed list beyond `SIM_SEEDS` to
   hunt a shorter run detaches the pick from the simulator's report, and seeding the run with
   Debug kills would show a Debug clear, not the UI clear you asked for.

### Decisions

- **Decide-point 1:** accepted. The first-boss replay is the whole picked run through the UI,
  however many descents the scan's pick takes; no seed list beyond `SIM_SEEDS`, no Debug kills.
- **ASSUMPTION 9:** the cap is the simulator's `RUN_CAP`, confirmed by Duncan after the
  correction was restated: it changes no pick while any candidate clears under 60, and buys a
  full table and no stop if none does.
- Every other assumption and plan fix as above. The (G1, G2) assumption is now settled in the
  brief: both slices confirmed its strings.

### Docs edited

- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#hub-g2`: the Collection line's "its three
  gems" is now its gems one per regular gem slot, an empty slot shown empty, citing
  `spec/creatures.md#trait-and-gem-slots` (the data holds a per-slot array; the plan's spec
  question).
- `.claude/phases/4.5/brief.md`, `phases/4.5/brief.md#assumptions`: the (G1, G2) assumption ticked;
  G1 built the currency and save lines and this plan confirms the inactive label.
