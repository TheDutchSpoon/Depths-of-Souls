# Plan review — 4.5-B: on-death-observed

## Round 1

**Verdict:** approved, with the corrections in `plan-handout-r1.md`. Six small plan fixes, one of
them a correction to A4; none needs another round.

Checked against the kickoff, `phases/4.5/brief.md#on-death-observed`,
`phases/4.5/brief.md#createcombat-validates-its-trait-registry`, the slice brief,
`spec/effects.md` (hooks, damage-path order, damage observation, `stacks: false`, validators) and
the code: `fireHook`'s two filter blocks, `fireDeathObservers`, the three `livingIds` copies,
`validateObservationFilters`, `validateTrait` and its four importers, `createCombat`'s status loop,
the seven data triggers, Grudge, and the four listed goldens.

Confirmed on the code, not on the plan's word:

- **The corpus premise holds.** All seven data triggers are deterministic (no `chancePercent`, no
  `stacks: false`), damage-free, and act only on their own side: Last Gleam and Warder put a
  modifier on `all-allies`; Scavenger, Thicket and the Sovereign on `self`; Gravedigger heals
  `self` off its own Health. Swapping the two sides' blocks can only reorder events inside one
  death's observer block, never change one, so A6's stop condition is the right tripwire.
- **The plan's order check on the three goldens is right**: each death has listeners on one side
  only. `golden-last-gleam`'s `gleamDies` has no `TriggerFired`, so its change there is comments.
- **`validateObservationFilters` is shared by traits, statuses and perks**, so the `self`
  rejection covers all three carriers in one branch; the existing per-carrier tests already show
  each carrier calls it.
- **No content doc names the old hooks.** The only living-doc mentions are the four
  `spec/effects.md` lines the brief's rewrite list already covers.

### Plan fixes

1. **A4: fail closed on every candidate.** See Assumptions.
2. **The one-call test needs its carriers on opposite sides.** The plan doesn't say where the two
   `stacks: false` carriers sit. If both are on one side, a per-side split (one `fireHook` over the
   dead creature's allies, one over its enemies: today's structure with the names changed) passes
   the test while still resetting the claim between sides. One carrier per side catches both the
   per-observer loop and the per-side split.
3. **The golden proof is two proofs.** The plan attaches "import, map the names, deep-compare" to
   "every other golden". That proof is for the three listed goldens' expected values. Every other
   golden is byte-identical as a file: an empty `git diff main` over `src/engine/__golden__`
   outside the four listed files.
4. **Comments that count the observation hooks as two**, besides those naming the old hooks:
   `ResolvedHookEffect.observationFilter` (`effect-types.ts`), `FireHookOptions.observedDamage`
   ("Both observation hooks FAIL CLOSED") and `fireHook`'s inline fail-closed block, which also
   lists the call sites.
5. **Name the data test file.** `data/traits/` has no `rotcap-hollow.test.ts`; the plan's
   "new/extended" is a new file, counted as one in the test reconciliation.
6. **Every mutation run, not only the relationship branches.** The table's "Mutation check" row
   covers the helper; the kickoff asks for every mechanism at every site.

### Assumptions

- **A1 (`livingIdsOf` in `creature-lookup.ts`): confirm.** All three users already import that
  module; no cycle.
- **A2 (trait loop after the status loop, before the empty-party guard): confirm.** Mirrors the
  status loop; nothing depends on the order.
- **A3 (helper takes found creatures; each site keeps its missing-creature path): confirm.** The
  existing hooks stay byte-identical with no reachability proof; the kickoff asked for the proof
  only if the plan unified them.
- **A4 (a filterless candidate doesn't need the dead creature): correct.** The plan copies
  `on-damage-observed`'s shape, but misreads where that hook fails closed: its gate is the
  `observedDamage` option, checked for **every** candidate; the missing-damaged skip inside the
  filter is a second, narrower check. The death hook has no option: the dead creature *is* its
  details. `spec/effects.md#damage-observation` says an observation hook fired without its
  details "is skipped, never fired unfiltered", and the kickoff says "a candidate whose dead
  creature can't be found is skipped". Under A4, a call with a wrong or absent `source` fires every
  filterless death observer: the exact failure fail-closed exists to prevent. End state: look up
  the dead creature first, for every candidate, skip if not found, then filter. It is unreachable
  from `fireDeathObservers`, so no golden moves. Written into the phase brief.
- **A5 (two cases in one golden file, fixture-local traits): confirm.** Each case keeps its own
  header block, as `golden-last-gleam` does.
- **A6 (any corpus change beyond a rename or an in-block reorder stops the slice): confirm.** It is
  the kickoff's condition made stricter, and its premise is verified above.

### Decide-points

None this round. A4 is a correction rather than a call: the kickoff already says it and the spec's
fail-closed rule decides it. If Duncan prefers the plan's reading, the brief line and hand-out
item 1 revert.

Noted, not this slice: `livingIdsOf` orders by party array position, while the spec says
side → slot → id. The two agree only while each party array is in slot order, which I found no
check for in `createCombat`. This is pre-existing and shared by every observation hook and global
phase point.

### Decisions

- **Observer order becomes turn order, in its own slice, 4.5-B2, after B** (Duncan). A hook fired
  over every living creature fires on them in live turn order, not side → slot → id. B builds
  `plan.md` and the hand-out as they stand, with side → slot → id; B2 changes the one
  `livingIdsOf` B leaves behind. This also retires the array-versus-slot gap noted above, since turn
  order reads `slot`. Scope (every multi-creature hook, not the observation hooks only) is my
  recommendation, left open in the phase brief's Assumptions for Duncan to confirm.
- **The Web break-free roll goes in turn order too** (Duncan): one order for every pass over the
  living creatures, rather than keeping side → slot → id for the one pass that isn't a hook.

### Docs edited

- `.claude/phases/4.5/brief.md#on-death-observed`: the hook fails closed: a candidate is skipped
  when the dead creature can't be found, with or without a filter (the A4 correction), for the PR
  review to fold into `spec/effects.md#damage-observation`.
- `.claude/phases/4.5/brief.md#slices`: 4.5-B2 added to the slice table, the "why the cuts fall"
  bullet, and the balance-verdict list.
- `.claude/phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`: new "Decided, not
  built" entry for B2, the Web break-free roll included.
- `.claude/phases/4.5/brief.md#assumptions`: B2's scope (every multi-creature hook) as an open
  assumption.
- `.claude/phases/4.5/B2/brief.md`: new slice brief.
