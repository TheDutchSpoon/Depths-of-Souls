# Verify report — Phase 4.2 — Slice E (round 1)

Coding agent → design agent. Checked `spec/combat.md` and `spec/scripting.md` against `main`'s code
and the pinned old text (`git show 892f1b8:.claude/CONVENTIONS.md` / `GAME_DESIGN.md`), row by row.

## Result

- `npm run docs:check -- inventory E`: **PASS**, 87 units and 87 rows checked (base `f666d7c`).
- Rows checked: **87**. Fates recount to the request's table (54 rewritten, 25 merged, 8 dropped,
  0 kept, 0 moved).
- Findings: **6** (all low: no rule is lost, and no number is wrong).
- Label links: every `file.md "Label"` link in the two files resolves to a heading (59 checked, none
  missing), and every inbound label from the other living docs resolves to a heading of
  `spec/combat.md` or `spec/scripting.md`.
- No `4.1`, "Slice", ASSUMPTION, PR or "supersedes" text is left in either file; `## To fold` is
  gone.
- Dropped rows and the dropped duplicates inside rows all check out. The named homes hold the rule:
  G:825 (`spec/responses.md` "revive": `MAX_REVIVES_PER_CREATURE = 10`), G:895 (`spec/effects.md`
  "Effective stats"), the role table (`content/enemy-behaviour.md` "Role scripts" against
  `src/data/scripts.ts`: all seven rows match the rules, thresholds and `gemSide`), the
  conditional-damage-bonus block (`spec/effects.md` "conditional-damage-bonus", including the new
  one-modified-hit bullet), the status-timing bullets (`spec/statuses.md` "Timing", "Round end"),
  the fast-travel range (`spec/run.md` "The cave") and the Phase 6 items (`ROADMAP.md` Phase 6:
  cross-side warning, `last-action`, "target lacks status", `defaultTarget` interaction).
- Numbers match `engine/config.ts` and `damage.ts`: Additional 20% (`ADDITIONAL_MAX_HP_PERCENT`) and
  10 (`ADDITIONAL_BASE_CAP`), fade 1 per level, `INDIRECT_DEFENCE_RATE` 0.2, chip `CHIP_FLOOR_RATE`
  0.01, ×1.25 / ×0.75, Defend ×1.5 / ×0.65, `ROUND_CAP` 100, eleven player selectors (12 with
  `'random'`), seven roles, five `always-*` fixtures (`__fixtures__/scripts.ts:12-47`).
- The mechanics you listed under "Check hardest" 1 all match the code. Evidence: `combat.ts:237-244`
  (mutual wipe is a `draw`), `:307-346` (fight-start check before `RoundStarted`; round-end pass
  then check, then the `ROUND_CAP` gate before the next round), `:364-369` (dead actor keeps the
  bracket), `:377-434` (turn skeleton; wipe closes the bracket), `:503-508` (cleanup, `TurnEnded`
  last); `actions.ts:178` (`castableGemSlots`), `:303` (`resolveGemSlot` draws once even for one
  castable gem), `:392` (`resolveInstanceTarget`: Tunnel Vision and ally-side skip Provoke, no
  Confusion), `:480-500` (`executeAttack` computes `splashIds` before the pre-hit hooks, attacks
  only); `targeting.ts:67-119` (Confusion first with a second draw among living allies, itself
  included; one Provoke draw even for one provoker; selector not resolved); `effects.ts:328`
  (penetration summed and clamped to [0, 1]); `damage.ts:38-67` and `resolution.ts:244-275`
  (cross-stat after spellPower and in the chip, direct only; the Additional only on the direct
  branch); `types.ts:226-461` (event families); `conditions.ts:19-34` and
  `scripting-types.ts:5-102` (kinds, comparators including `!=`, `has-status` via `hasStatus`).

## Findings

**F1. G:811 / C:808 — "granted action" timing is still not exact.** `spec/combat.md` "Rounds and
turns" says a granted action "runs inside the same turn, after the action that caused it", and
"Turn queue" says it "runs inside the turn that raised it". `combat.ts` runs a grant at the step of
the scope that raised it: turn-start hooks' grants before the action (`combat.ts:428-431`), the
action's grants right after it (`:465`), turn-end hooks' grants after those hooks (`:492-495`), and
fight-start and round-end hooks' grants at round level, in no creature's turn (`:319`, `:268`).
"After the action that caused it" is wrong for a hook-raised grant, and "the turn that raised it"
leaves out the round-level ones. The doc's own "Turn structure" diagram and `spec/responses.md`
"perform-action" ("Where grants run") have it right. The G:811 sentence is carried over from the old
text; C:808's row says it was "corrected" but only the second half was.

**F2. G:994 — an unrecorded change: the ally HP% qualifier.** G:994 lists "ally HP% (any /
lowest)". `spec/scripting.md` "Conditions" says "self, ally or enemy HP% (any, lowest or highest)".
The code agrees with the new text (`conditions.ts:94-107` applies all three qualifiers to every
subject), so it is a stale-doc fix, but it is not in Duncan's approved batch and the G:994 row's
Reason doesn't record it. Record it in the row or confirm it.

**F3. C:1129 / G:994 — a pointer that doesn't lead to what the sentence before it names.**
`spec/scripting.md` "Conditions", last bullet: "Fight-context conditions ('is this a boss fight',
the current floor) are deferred past v1. The candidates for Phase 6 are in `ROADMAP.md` Phase 6."
`ROADMAP.md` Phase 6 lists "target lacks status X" and `last-action`; it doesn't mention
fight-context conditions (grep of `ROADMAP.md`, `OPEN_QUESTIONS.md` and `VISION.md` finds none), so
after this condense the boss-fight and current-floor candidates live in the spec bullet only.

**F4. G:869 — a function name in the formula that `main` doesn't have.** `spec/combat.md` "Damage
formula" writes `effOffStat = getEffectiveStat( remapResolve(creature, action) ) × spellPower`.
There is no `remapResolve` in `src/`: the lookup is `getOffensiveStat(creature, actionKind,
spellPower)` (`effective-stats.ts:123-131`, over the private `resolveRemappedStat`, which resolves
several remaps last-writer-wins). The rule is right; the name is the old pseudo-code, kept where
CLAUDE.md says to keep names that pin an invariant. Name the real function, or mark the block as
pseudo-code.

**F5. C:1029 — the row doesn't record a kept "Rejected:" bullet.** `spec/combat.md` "One action
pipeline" ends with "Rejected: patching each action source, routing everything through
`decideAction`, legality inside the executor, an import cycle, a global registry, a runner stored in
state. Generator or stack-machine resolution pays off only if players make choices mid-cascade…".
The C:1029 row's Reason lists what was dropped and doesn't mention that the rejected alternatives
stay, while the C:956 row drops the same kind of text as "history, process" (and C:1213/G:1065 keep
"utility-scoring AI was rejected" in "Enemies run scripts too"). Either drop the bullet as history
(condensing rule: "history of how a rule came about") or keep it and say so in the row. The
single-module "acceptable but scales worse" sentence was dropped, so the bullet is a partial keep.

**F6. C:808 — "empty bracket: no hooks, no action" omits the Web roll.** `spec/combat.md` "Turn
queue" says a creature that dies before its turn keeps "an empty `TurnStarted`/`TurnEnded` bracket:
no hooks, no action". `combat.ts:506` runs `rollWebBreakFree` for every dequeued turn, a dead actor's
included, and it can emit `StatusExpired` and draw RNG inside that bracket. `spec/statuses.md` "Turn
order" says so; the combat sentence reads as if nothing happens. It needs "no hooks, no action, no
countdown" plus a link, or "empty" dropped.

## Spec and code disagree

1. **HP% qualifier** (known; the design stands, Duncan's decision). Spec, `spec/scripting.md`
   "Conditions": "'Lowest' and 'highest' pick the ally or enemy with the lowest or highest **HP%**,
   and test it." Code, `conditions.ts:99-103`:
   `pickExtremum(pool, (c) => c.currentHp, condition.qualifier === 'lowest' ? 'asc' : 'desc')`. The
   `**Known bug:**` line in "Conditions in the engine" and `ROADMAP.md` Phase 4.5 "HP% qualifiers pick
   by HP%" match this. The listed users are complete: only `warden` and `support` use a
   `lowest` qualifier (`data/scripts.ts:79`, `:108`; no other `qualifier: 'lowest'|'highest'` in
   `src/` outside tests).
2. **Grant timing** (F1). Spec, `spec/combat.md` "Rounds and turns": "a trait may grant an extra
   *action*, which runs inside the same turn, after the action that caused it". Code,
   `combat.ts:428`, `:465`, `:492` (per scope, inside a turn) and `:319`, `:268` (fight start, round
   end: no turn).
3. **The lookup's name** (F4). Spec: `remapResolve(creature, action)`. Code: `getOffensiveStat` in
   `effective-stats.ts:123`.

The stale-doc fixes Duncan approved all match the code: conditions are `round-number` only
(`scripting-types.ts:50-54`), "an enemy is weak to me" is existential (`conditions.ts:123`), `!=`
is built (`conditions.ts:29`), nothing compacts dead creatures (no match for "compact" in `src/`),
a mutual wipe is a `draw` (`combat.ts:240`), Splashing is attacks only (`actions.ts:435-500`,
`splashTargetIds` has one caller), and `support`'s side filter is `gemSide` (`scripting-types.ts:186-190`,
`data/scripts.ts:108-118`).

## Stale comments in `src/` (for 4.2-G)

Not in the lists you gave:

- `engine/scripting-types.ts:144-149` says `targetSelectorHasCandidate` "still handle[s]" the
  `'random'` selector. `target-selectors.ts:36` throws on it (so does `:132`), and `actions.ts:165` intercepts it
  first. `spec/combat.md` "One action pipeline" says it throws, so the comment contradicts the spec.
- `engine/types.ts:323-325`: "only a self-inflicted cost and a status tick skip Defence". A tick
  meets a fifth of Defence like any indirect damage (`resolution.ts:1247-1254`,
  `calculateIndirectDamage`); only a cost skips it.
- `engine/effect-types.ts:760` names `targeting.ts`'s `adjacentLivingTargets` as the Splashing
  lookup. Production uses a private copy at `actions.ts:458`; the exported one at
  `targeting.ts:148` is called only by `targeting.test.ts:326-368`, so those tests cover code
  Splashing doesn't run. `spec/combat.md` "Adjacency targeting" names the function without a file,
  so it is right either way.
- `engine/config.ts:1-2`: "Placeholder per GAME_DESIGN §13 (exact number TBD)" for `ROUND_CAP`. A
  citation 4.2-G rewrites anyway; the "TBD" is the part to look at.
- `engine/combat.ts:160`, `:366`, `:385`, `:410`, `:500`, `actions.ts` (header, `:346`, `:373-376`,
  `:397`) and `types.ts:33` still cite `CONVENTIONS "…"` and `GAME_DESIGN §…` (for 4.2-G's script).

Already on your list and confirmed: `scripting-types.ts:9-22` (the comment is pasted twice),
`:78-89`, `target-selectors.ts:53-55` ("the one blessed RNG draw site": `random-ally` draws too),
`data/scripts.ts:132`.
