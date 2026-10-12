# PR review — 4.5-B: on-death-observed, and `createCombat` validates its trait registry

## Round 1

**Branch** `4.5-b`, commit `74171ef` ("build"), against `main` at `d9d3e86`. Reviewed in my own
clone (two worktrees, fresh `npm ci` each), not in the working tree.

**Verdict: fixes (cleanup only).** No real fixes: the build matches `plan.md` as
`plan-handout-r1.md` corrects it, item by item, checked in the code, and every claim in
`report-r1.md` that I could re-run reproduced exactly. The cleanup items under "Scope and
labeling" go to `handout-r1.md`: a review hands out its cleanup rather than approving with it
left in.

### Real fixes

None.

### Checked against the plan hand-out

1. **Fail closed on every candidate**: `fireHook`'s `on-death-observed` block looks up the dead
   creature from `source` first and skips the candidate if it isn't found, before and regardless
   of the filter. Pinned (see the mutation table).
2. **One-call test with carriers on opposite sides**: W (player) and Y (enemy) carry one
   `stacks: false` `any` observer; V dies; only W fires. Fails under a per-observer loop and under
   a per-side split.
3. **Two golden proofs**: both done, and both re-done by me (below).
4. **Comments counting the observation hooks**: `TriggeredDef.observationFilter`,
   `ResolvedHookEffect.observationFilter`, `ObservationFilter`'s doc and `fireHook`'s inline
   fail-closed block (now naming `fireDeathObservers` among the call sites) all name the three.
5. **`rotcap-hollow.test.ts`**: new, 5 tests, pins each written-out filter and the Sovereign's
   single `any` trigger.
6. **Every mutation run**: the report's table omits the dropped-filter runs for Gravedigger,
   Thicket and Grudge. I ran those too; all caught.

### Code read against the spec and brief

- `fireDeathObservers` is one `fireHook('on-death-observed', livingIdsOf(state).filter(id !== deadId), deadId, …)`.
  The observer list is computed after `on-death` and `on-kill`, as before. `fireHook` still
  snapshots candidates per creature and re-checks `alive` and the owning instance per effect, so
  moving from one call per observer to one call over all of them changes only the
  `claimedNonStacking` scope and the order, which are the two intended changes.
- `relationshipMatches` is a `never`-checked switch. At the action site,
  `actor && !relationshipMatches(…)` is equivalent to the old
  `relationship !== 'any' && actor` block, branch by branch. At the damage site, the three
  `continue`s become one call, also equivalent. Each site keeps its own missing-creature path (A3).
- `isDeathHook` is still `hook === 'on-death'`: the new hook is alive-gated.
- `validateObservationFilters` accepts the new hook and rejects `self` on it. `actionKind`,
  `excludeActor` and `selfInflicted` were already rejected there by the existing branches.
  Statuses, traits and perks all go through this one function.
- `validateTrait` lives only in `engine/effect-types.ts`. `data/traits/index.ts` imports it and has
  no re-export. `createCombat` runs it right after the status loop. Its default registry is an
  empty `Map`, so nothing changes for a caller that passes none.
- `livingIdsOf` is one export in `creature-lookup.ts`. The three private copies are gone, and the
  body is identical to them.
- The engine stays pure: the diff adds no UI, data or state import under `src/engine`.
- **New golden `golden-death-observed`, re-derived.** The fixture defaults (`makeCreature`: Attack,
  Defence, Intelligence and speed 20; Health 20; level at the Additional's zero point) put the
  killer (speed 30) first. Core 40 − 10 = 30, chip 0.01 × 40 = 0.4, raw 30.4, `floor` gives 30,
  which is ≥ 20, so V dies. No RNG is drawn. The observer lists and silences in both cases match
  the filters. `enemyDies` pins the order: under the old allies-then-enemies order, EA and EB come
  before PE and PY. `playerDies` checks the filters only: for a player-side death, the old order
  and the new one coincide.

### Gates (my run)

| Gate | Result |
| --- | --- |
| `npm run test` | 1875 passed, 1 skipped (1876 tests, 215 files); `main`: 1851 + 1 (1852, 212) |
| `npm run lint`, `format:check`, `build`, `npx tsc -b` | clean |
| `docs:check -- citations` / `comments` | PASS (636 / 7038 comments, 1651 titles) |
| `docs:check -- budgets` | 0 over, before and after my doc edit |
| `docs:check -- comment-proof origin/main` | `golden-spore-spread.fixture.ts` OK; every other FAIL is a file the slice changes on purpose |
| Vitest version | 5.0.3, matching the lockfile |

**Test count, file by file** (Vitest JSON, both trees): +13 `engine/death-observed.test.ts` (new),
+5 `data/traits/rotcap-hollow.test.ts` (new), +2 `__golden__/golden-death-observed.test.ts` (new),
`engine/damage-observation.test.ts` 64 → 68. Every other file has the same count as on `main`. This
matches the report.

### Invariants, verified mechanically

- `grep -rn "on-ally-death\|on-enemy-death" src` is empty. `Hook` has 16 members.
- **Every golden fixture export, both trees.** I imported all 134 of `main`'s and 135 of the
  branch's `__golden__/*.fixture.ts` files and deep-compared 1,234 exports. The three listed
  expected arrays (`golden-damage-observed-lethal`'s `expectedEvents`, `golden-last-gleam`'s
  `allyDiesExpected`, `golden-rot-sovereign`'s `expectedEvents`) are equal once the old names are
  mapped. No other expected export changed. Every other differing export is a registry carrier
  (`traits`, or a scenario object holding it), and walked path by path, the only entries that
  differ are the 8 migrated traits: Last Gleam, Scavenger, Warder, Gravedigger, Thicket, the
  Sovereign, plus Grudge. That is shared content moving, not a changed expected value.
- `git diff --stat main -- src/engine/__golden__` lists only the three listed fixtures,
  `golden-spore-spread` (comment-proof OK) and the two new files.
- **Corpus, re-derived independently.** I resolved all 527 fights on both trees and compared full
  logs: 384 byte-identical, 130 identical after the name map, and 13 the same multiset in a
  different order (fights 24, 42, 85, 89, 110, 114, 115, 140, 144, 145, 149, 200, 204, numbered
  from 0 as in the evidence table). All 143 keep the same result, round count and final HPs. Split
  into minimal reordered windows, the 30 windows hold only `TriggerFired(on-death-observed)`, its
  `StatModifierApplied` or `HealApplied`, nothing else. The digest fixture changes in exactly 143
  rows. This matches `evidence/corpus-attribution.md`.

### Mutation check (each mechanism removed, `src/engine` + `src/data` run, corpus digest included)

`src/state` was left out of these runs for time: it holds no named test for any of these
mechanisms and could only add catchers.

| Mechanism removed | Caught by |
| --- | --- |
| `ally` / `enemy` / `any` / `self` branch, action site | `resolution.test.ts` filter rows (19 / 1 / 2 / 1 failures) |
| `ally` / `enemy` / `any` / `self` branch, damage site | `damage-observation.test.ts` filter matrix (19 / 12 / 1 / 6); `any` only by the new explicit-`any` test |
| `ally` / `enemy` / `any` branch, death site | `death-observed.test.ts` rows and `golden-death-observed` (9 / 5 / 9) |
| New order (allies-then-enemies, one call) | order test, the `x dies` rows, `golden-death-observed` `enemyDies` (5) |
| Single call → per-observer loop | the one-call test only (1) |
| Single call → per-side split (keeping the new order) | the one-call test only (1) |
| By-id exclusion → `alive`-only | the self-revive test only (1) |
| Alive gate (`isDeathHook` widened) | 20, the alive-gate test included |
| Fail closed (lookup moved inside the filter) | the fail-closed test only (1) |
| `self` rejection | the validator test (1) |
| `createCombat` trait loop | "a trait handed to createCombat is checked…" (1) |
| Dropped filter: Last Gleam / Scavenger / Warder / Gravedigger / Thicket / Sovereign / Grudge | `glimmerdark.test.ts` / `rotcap-hollow.test.ts` ×5 / `__fixtures__/traits.test.ts`, each by name; the digest also trips for the 5 behaviour-changing ones |

No mechanism is caught only by the corpus digest. The Sovereign's dropped `any` filter is a no-op
in behaviour (absent means `any`), so only the data test can catch it, and it does.

### Live behaviour (corpus scan)

Across the branch's 527 logs: 1,248 `on-death-observed` firings, none by a creature that is dead
at that point, none by the creature that just died, and no trigger other than `on-death` fired by
a dead creature.

### Leftover sweep

`src/`: only `golden-rot-sovereign`'s prose "the ally-death growth" and the test-local trait id
`'ally-death'` in `damage-observation.test.ts`. Both are plain words, not the hook name, so I left
them. Living docs: `spec/effects.md` lines 183, 188, 237 and 381, all rewritten below. No content,
species, CONVENTIONS, ROADMAP or OPEN_QUESTIONS text names the old hooks or the removed
`data/traits` `validateTrait`. The content docs describe the seven triggers by behaviour ("whenever
an ally dies"), which still holds, and none states an observer order, so none changes.

### Scope and labeling (cleanup, in `handout-r1.md`)

1. **`golden-death-observed`'s header doesn't write out the after values.** The expected array
   computes `effectiveAfter: 20 * factor`, and the first one is the float `22.000000000000004`.
   It is arithmetic, not echoed from a run, so it passes the hand-derived bar.
   `golden-rot-sovereign` writes its floats out in prose, and this golden could do the same.
2. **The Rot Sovereign's block comment** (`rotcap-hollow.ts`) was re-wrapped by hand and ends on a
   dangling "blanket, unconditional each / of her own turns.".
3. **`golden-damage-observed-lethal`'s header** lists only FLARE and GLEAM as death observers. A
   and E observe too, with no trait. Incomplete, not wrong.
4. **The evidence table's "first diverging span"** runs from a fight's first differing event to
   its last, across several deaths (fight 114: events 227–1211), and its "first firings" list
   includes non-observer triggers (`hollowkin-wretch`). The counts and the attribution are right;
   only the column reads as one block.
5. **The report's mutation table** skips the dropped-filter runs for Gravedigger, Thicket and
   Grudge. I ran them (above); nothing to hand out.
6. **Comment lines this slice wrote run past 100 columns** (the wrap the surrounding comments
   keep), listed in the hand-out. Older over-long lines stay out of scope.

### Decide-points

1. **Cleanup round: decided** (Duncan): cleanup is always handed out, never left for a later
   slice. Round 2 checks the hand-out items and reruns the gates, the golden proof and the leftover
   sweep.
2. **`spec/effects.md#action-reactions-actor-self-hooks-or-observation` is left as it is**, though
   the brief lists it for rewrite. It names neither old hook, and its content claims still hold:
   the Resonants are the only action observers and the Flare the only damage observer. The death
   observers are described where the filter rules live (`#damage-observation`). Say if you want a
   line there pointing to them.

### Mailbox

Holds `brief`, `kickoff`, `plan`, `plan-review`, `plan-handout-r1`, `report-r1`, `record`, this
review, `handout-r1.md` and `evidence/corpus-attribution.md`. **To delete:** nothing.

### Docs edited

- `.claude/spec/effects.md#validators`: the trait rule. `validateTrait` runs over the stock traits
  at import and over every trait in the registry `createCombat` is given. `relationship: 'self'`
  on `on-death-observed` joins the rejected-filter bullet.
- `.claude/spec/effects.md#hooks`: 16 hooks; `on-death-observed` replaces the two old hooks, and
  its context is the dead creature.
- `.claude/spec/effects.md#damage-path-hook-order`: the last step is `on-death-observed`, fired on
  every living creature but the victim.
- `.claude/spec/effects.md#damage-observation`: `on-death-observed` takes `relationship` alone. New
  bullet for the hook: one pass per death after `on-kill`, tie-break order, the dead creature left
  out by id (so not even a self-revived one observes its own death), `source` is the dead
  creature, one `stacks: false` chance across both sides. "Both observation hooks fail closed"
  becomes all three, the death hook's case added.
- `.claude/spec/effects.md#count-scaling`: the example is now an `on-death-observed` trigger.
- `.claude/workflow/pr-review.md#output-in-the-mailbox`: a review hands out every cleanup item it
  finds (comments, headers, evidence wording), so it never approves with them left in.
