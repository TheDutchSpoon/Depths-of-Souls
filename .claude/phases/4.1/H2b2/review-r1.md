# PR review r1 — Phase 4.1 — Slice H2b2: status rules

Reviews `report-r1.md` against `kickoff.md`, `brief.md`, `plan.md` + `plan-review.md` Round 2's six
build conditions, CONVENTIONS ("DoT and Regen from the applier's snapshot", "Status lifecycle",
"Damage observation", "`triggering-source` never resolves to the firing creature itself") and the
brief's ASSUMPTIONS 113, 114, 143–146. Branch `phase-4.1-slice-h2b2` at `9dcdc14` ("build"), cloned
and run in my own sandbox against `origin/main` (`501a5de`, PR #88 merged).

## Verdict: fixes (two test gaps; the code is right)

The rules are built correctly and match the spec line for line: single instance with the strict
"stronger" gate and an unconditional timer refresh; the snapshot recorded at application through one
floor; the tick through `calculateIndirectDamage` with exactly the spec's inputs (no dealt pool, no
cross-stat, no penetration, Defend's factors applied); the dealer carried as `origin: { kind:
'tick', dealerId }` and never inferred; no source offered to the bearer's `on-damage-taken` /
`on-death`; Regen on the same `tickDealer`; pass-on by rule (`context.statusId ===
spec.statusId`); the missing-snapshot throw. Every claim in the report I could check reproduced
exactly. What is missing is two pins: two inputs of the mechanism can be removed with every named
test green.

## Real fixes (hand-out r1)

1. **The bearer's taken factors on a tick are pinned only by the digest.** Dropping
   `gatherTakenFactors(bearer, state)` from `applyTickDamage` (keeping Defend's factors) fails
   `corpus-digest.test.ts` and nothing else. The kickoff formula has `Π(bearer's taken factors)`,
   and `golden-h2b2-tick-living-applier` calls itself "the focused case for the tick formula and its
   inputs", but its only taken factor is Defend's ×0.65, which arrives through
   `resolveDefenceAndTakenFactors`, not through the status/perk pool. A Vulnerable bearer taking a
   tick is the case DoT exists for (Blinding Flare then Poison). Needs a hand-derived focused golden
   that fails with that line removed.
2. **The "same status" half of the pass-on rule is unpinned.** Replacing
   `context.statusId === response.status.statusId ? context.snapshot : undefined` with
   `context.statusId !== undefined ? context.snapshot : undefined` (any status effect passes its
   snapshot to whatever it applies) leaves the **whole suite green, digest included**. Mutation 13
   removes the whole rule and mutation 14 tests a trait carrier, whose context has no `statusId`, so
   neither reaches the guard's second half. With the mutation, a status whose effect applies a
   *different* ticking status hands over its own snapshot (another stat's potency, another
   applier). No shipped status does this today, which is why a unit test, not a corpus fight, is
   the pin (ASSUMPTION 145 is exactly this comparison).

Both are test-only: no engine, data or golden-expected change, and the digest stays as committed.

## Scope and labeling (no action needed)

- **One pass instead of two checkpoints** (Deviations): accepted. The checkpoints existed so no
  golden was derived for an interim rule (ASSUMPTION 139); building both rules at once satisfies
  that more strongly. It does make Round 2's fix 1 (the step-1 red set) unmeasurable, as the
  report says.
- **The report's mutations ran the named tests only.** I re-ran every row against the full suite;
  the killers are the same, and the digest additionally fails for most, as expected.
- **Fixture stats raised so ticks aren't the minimum** (Attack 50–100, Speed 60–100): fine, each is
  derived in its header.
- **CI:** I couldn't read the PR's check runs from this session (GitHub API not enabled here).
  Please glance that CI is green on `9dcdc14`; my local run of all five gates is.

## Decide-point

**1. Land H2b2 with DoT effectively inert until H2c?** With the placeholder percentages, **4,971 of
the corpus's 5,318 ticks (93%) land on the minimum of 1**: a potency of 4–5 (20–25% of a stat near
20) against `0.2 × Defence` near 4. Corpus draws rise 39 → 52 with this PR. Poison, Burn, Spore,
Igniter, Cinderlord and Rotcore are all near-cosmetic on `main` until H2c tunes the percentages.
**My recommendation: yes, land it.** The slice's job is the rules, and they are right; the numbers
are H2c's by the kickoff's own scope ("use the placeholders, don't tune"), H2c is the next slice,
and nothing ships to players in between (the demo is throwaway). Tuning here would mix a numbers
change into a rules PR and muddy both golden policies. I've recorded the measurement as an input in
the brief's H2c section, and in GAME_DESIGN's open numbers, so H2c's grill starts from it: lifting
potency clear of a fifth of Defence across the level range is the target, not a nicety. The
alternative, a stopgap bump of the four percentages in this PR, would need its own listed golden
and digest attribution for one slice's worth of value.

### Decision (Duncan, 2026-10-09)

- **Decide-point 1: land it.** The rules are this slice's job and the numbers are H2c's, as the
  kickoff already scoped them, so this was settled before the review asked. The minimum-1
  measurement stays recorded as an H2c input (brief, H2c section; GAME_DESIGN open numbers).

## Spec questions (from the report), answered

1. **Flat self-damage in a status is a cost, a flat heal in a status an ordinary heal:** intended.
   A heal has no cost path; ASSUMPTION 144 now says so, and CONVENTIONS' data-shape bullet.
2. **A weaker or tied re-application refreshes, even to a shorter timer:** intended (ASSUMPTION
   114 as the kickoff read it). Written into CONVENTIONS "Status lifecycle" and GAME_DESIGN "No
   stacking".
3. **A self-applied tick's bearer is its own dealer:** already stated in CONVENTIONS and ASSUMPTION
   146. No change.
4. **Minimum-1 ticks:** decide-point 1; recorded for H2c.
5. **Stale living-doc text:** flipped, every line listed (see Docs edited). ROADMAP's H2b2 line
   stays as is: no slice in that list carries a "done" marker, so H2b2 doesn't either. ASSUMPTION
   131 was already marked superseded at the plan review.
6. **Eight responses:** CONVENTIONS (both places), GAME_DESIGN and the brief's summary say eight.

## What was verified, and how

**Gates** (fresh `npm ci`; Vitest 5.0.3 = the lockfile): `npm run test` 1295 (1294 passed + 1
skipped) in 192 files; `lint`, `format:check`, `build`, `npx tsc -b` clean. **Test count**
reconciled file by file with `vitest --reporter=json` on both trees: `main` 1266 / 182 files, and
every per-file delta is exactly the report's table (status-snapshot +23, ten `golden-h2b2-*` +10,
cinderlord-burn-refresh +1, statuses +3, corpus-coverage +1, resolution −3, effects −2,
perform-action −2, consume-stacks −1, cinderlord-burn-stacks −1); every other file unchanged.

**Goldens**, by importing every `*.fixture.ts` on both trees (`import.meta.glob`, every
`expected*` export, `stacks` stripped from `main`'s `StatusApplied`): 79 identical, 31 field-only,
the renamed Cinderlord golden equal to `main`'s after the strip (and only after it), 9 changed (exactly
`golden-dot`, `-f2-dot-one-turn`, `-f2-turn-end-interaction`, `-h2a-cost`, `-h2b1-observed-tick`,
`-hollowkin-wretch-self-dot`, `-spore-spread-dot-kill`, `-turn-end-dot-kill-burst`,
`-turn-end-dot-kill-burst-refresh`), 10 new, 2 gone. No `stacks` key left in any expected export.
The input-edited fixtures differ from `main` only in `cap:` / `stacks:` lines, comments, the
`amountPerStack` rename and the two `golden-b4-*` local statuses converted to `potency` (no tick
lands in either). **Arithmetic** recomputed by hand: vulnerability-once (30.4 × 1.5 = 45.6 → 45),
tick-living-applier (20 × 1.25 − 4 = 21; 20 × 1.25 × 0.65 − 6 = 10.25 → 10), regen-potency
(⌊80 × 10 / 100⌋ = 8), spore-spread (15 × 1.25 − 4 = 14.75 → 14), carrier-fresh (15 − 4 = 11;
6 − 4 = 2), reapply (6 / 10 / 4 / 10, the timer sequence and the R5 expiry), and the changed
`golden-dot` (3), `-f2-dot-one-turn` (16, 6), `-spore-spread-dot-kill` (5),
`-f2-turn-end-interaction` (11), `-turn-end-dot-kill-burst-refresh` (6 vs the weak snapshot's 1).
All are RNG-free except Spore's pool-of-one pick (seed inert).

**Corpus digest**, by dumping every fight's event log on both trees: 527 fights; **70 unchanged**,
**305 field-only** (`main`'s log with `stacks` stripped equals the new log exactly), **152 other**.
Each of the 152 shows a cause in its own logs: 142 a re-application or `stacks > 1` in `main` **and**
a tick, 9 a tick only, 1 a re-application only; **0 unexplained**. Results 222/266/39 → 215/260/52;
23 results and 107 event counts changed. All as reported. (I did not rebuild the report's
scratch H1 tree; the positive evidence above is the part that can fail.)

**Live behaviour** (scan of the new logs): 5,318 ticks — 4,939 from a living applier (137 fights),
370 from a dead applier (47 fights), 9 self-applied; 108 fights with a Spore spread; 20 with an
applier dead at application (Rotcore). Tracking every application (fresh, inherited through a
corpse's spread, or re-applied), **every tick's source is the applier if alive, else the bearer: 0
mismatches**. After a living applier's tick, the retaliators fire and fizzle (Madness Touch 493×,
Retaliating Shell 17×, Snapback 5×) and **nothing lands on the applier**; no `on-kill` or
`on-damage-dealt` fires off a tick (matches the report's "the predicted hook sub-case did not occur").

**Mutations** (scratch copy of the tree, one change at a time, the **full suite** each):

| Mutation | Fails (besides the digest) |
|---|---|
| weaker replaces stronger / tie replaces | `golden-h2b2-reapply`, `status-snapshot` |
| weaker doesn't refresh the timer | `golden-h2b2-reapply`, `status-snapshot`, `resolution` |
| potency from the bearer's stat | 13 goldens (every `golden-h2b2-*` tick case but the self-applied one, identical by construction), `status-snapshot` |
| potency read live (damage / heal) | `golden-h2b2-tick-living-applier`, `damage-observation` / `golden-h2b2-regen-potency` |
| no Defence on a tick / Defend ignored | 16 goldens / `golden-h2b2-tick-living-applier` |
| dealt pool on a tick | `golden-h2b2-tick-living-applier` |
| source stays the bearer | 12 goldens, `resolution`, `status-snapshot`, `corpus-coverage` |
| dead-applier fallback removed | `golden-h2b2-tick-dead-applier`, `-regen-potency`, both burst goldens, `status-snapshot` |
| `triggering-source` on a tick (both hooks / `on-damage-taken` only) | `-tick-kill-on-death` + `-tick-no-retaliation` / `-tick-no-retaliation` |
| applier as `on-death`'s source | `golden-h2b2-tick-kill-on-death` |
| tick self-inflicted / self-inflicted when dealer = bearer | `-tick-dead-applier`, `-tick-self-applied`, `golden-h2b1-observed-tick`, `damage-observation` / the last three |
| spread snapshots fresh | `golden-h2b2-spore-spread`, two older spread goldens |
| carrier passes its snapshot | `golden-h2b2-carrier-fresh` |
| bearer's affinity on a tick | `-tick-living-applier`, `-spore-spread` |
| dealer hooks on the fallback / none for self-applied | `-tick-dead-applier` / `-tick-self-applied` |
| missing snapshot falls back silently | `status-snapshot` |
| Regen credited to the bearer / to a dead healer | `golden-h2b2-regen-potency` (both) |
| `on-damage-taken` / `on-death` skipped on a tick | `-tick-no-retaliation`, `-hollowkin-wretch-self-dot` / 6 goldens |
| trait / perk validator dropped | `status-snapshot` |
| no inner floor on the stat | `status-snapshot` |
| a stronger replace keeps the old applier | `-reapply`, burst-refresh, `status-snapshot` |
| **tick ignores the bearer's status/perk taken factors** | **none (digest only)** → fix 1 |
| **any status effect passes its snapshot** | **none at all** → fix 2 |

**Purity and leftovers:** no `src/engine` source file imports data, UI or state.
`consume-stacks`, `consumed-stacks`, `amountPerStack`, `statusStacks`, `consumedStacks` appear
nowhere in `src` except the rename note in `effect-types.ts`; the remaining `stacks` are the
Overtone's dedup flag, negative assertions and `state/balance-sim.ts`, as the report names them.

**Round 2 build conditions:** 1 moot (one pass, above); 2 used as written; 3 verified by the
fixture import; 4 present and killed (missing-snapshot mutation); 5 present and killed
(self-inflicted when dealer = bearer); 6 stated in the report.

## Docs edited

- `.claude/content/rotcap-hollow.md`: folded the H2b2 items: the Spore paragraph (applier's Speed,
  the spread carrying the infection), a new "Damage over time" paragraph (indirect, a fifth of
  Defence, no dealt bonuses, the applier credited while alive, no retaliation, never stacks),
  Rotcore's row, Igniter's and Cinderlord's rows; the four H2b items left the pending section.
- `.claude/content/glimmerdark.md`: Blinding Flare's Vulnerability ×1.5 once; Afterglow's Regen
  10% of the caster's Health, never stacking, credited to the caster; the "Single-instance
  statuses" item left the pending section.
- `.claude/content/overgrowth.md`: Venom Bolt's Poison (20% of the caster's Attack, indirect,
  stronger stays); its item left the pending section.
- `.claude/species/species-locked.md`: Sporch Cinderlord's row (one Burn, stronger stays),
  `consume-stacks` and stacking in the past tense.
- `.claude/specializations/brute.md`, `sorcerer.md`: "cap 1" dropped from Pacify and Silence.
- `.claude/CONVENTIONS.md`: every stale marker the report lists flipped to the built state
  (response vocabulary eight, the deleted `consume-stacks` and `consumed-stacks` text, `flatAmount`,
  the flat-mode magnitude reading the firing creature, the tick channel test, DoT damage, `StatusDef`
  with `potency?`, the built `DamageOrigin` union, the Cinderlord addendum, Glow's markers to
  4.1-H2b1); "Status lifecycle" gains the refresh-even-when-shorter rule; the data-shape bullet says
  an unmarked heal in a status is an ordinary heal.
- `.claude/GAME_DESIGN.md`: "statuses never stack"; the snapshot pass-on sentence corrected to
  ASSUMPTION 143 (it still said a creature carrying a status passes its snapshot on); the fallback
  bearer fires no dealer traits; the timer refresh even when shorter; past tense for the old
  shape; the open-numbers entry replaced with the placeholder potencies and the 93% measurement.
- `.claude/briefs/phase-4.1-implementation-plan.md`: the response summary says eight; ASSUMPTION
  144 records that an unmarked heal in a status is an ordinary heal; the H2c section gains the
  minimum-1 measurement as an input.
