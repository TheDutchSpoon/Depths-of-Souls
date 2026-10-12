# Plan hand-out — 4.5-B, round 1

**Verdict: approved.** Build `plan.md` with the items below; where they disagree, this hand-out
wins.

Re-read `phases/4.5/brief.md#on-death-observed`: it gained a bullet (the hook fails closed).

1. **Fail closed on every candidate** (amends ASSUMPTION A4 and the plan's `engine/resolution.ts`
   third block). In `fireHook`'s `on-death-observed` block, every candidate first looks up the
   dead creature from `source`; if `source` is absent or not in the state, the candidate is
   skipped, whether or not it carries an `observationFilter`. Only then is the filter applied
   (`relationship`, default `any`, through the shared helper: observer = the firing creature,
   subject = the dead creature). Test: `fireHook('on-death-observed', …)` with a `source` id that
   isn't in the state, over one observer carrying a filterless death observer and one carrying an
   `ally` one, fires nothing; it fails with the lookup gate removed (the filterless one fires).
   This replaces the plan's filtered-only fail-closed test.
2. **The one-call test** (amends the mechanism table's "One `fireHook` call" row). The two carriers
   of one `stacks: false` death observer (filter `{ relationship: 'any' }`) sit on **opposite
   sides**. A death fires exactly one `TriggerFired` between them. Show it failing under a
   per-observer loop and under a per-side split (one `fireHook` over the dead creature's allies,
   one over its enemies).
3. **Two golden proofs** (amends "Golden policy"). The three listed goldens
   (`golden-damage-observed-lethal`, `golden-last-gleam`, `golden-rot-sovereign`): import `main`'s
   and the branch's fixtures, map `on-ally-death` / `on-enemy-death` to `on-death-observed`, and
   deep-compare the expected values. Every other golden: an empty `git diff main` over
   `src/engine/__golden__` outside those three and `golden-spore-spread` (which is proved with
   `npm run docs:check -- comment-proof <base>`).
4. **Comments counting the observation hooks** (amends the plan's `engine/effect-types.ts` and
   `engine/resolution.ts` sections). Every comment that names or counts the observation hooks
   names all three: `TriggeredDef.observationFilter`, `ResolvedHookEffect.observationFilter`,
   `FireHookOptions.observedDamage` and `fireHook`'s inline fail-closed block (which also lists
   the call sites: add `fireDeathObservers`).
5. **The rotcap-hollow data test** (amends the "`validateTrait` load loop" row). The six
   `rotcap-hollow.ts` triggers' written-out filters are pinned in a new file,
   `src/data/traits/rotcap-hollow.test.ts`: Myconet Warder, Myconet Gravedigger and Necromoss
   Thicket `ally`; Rotfeeder Scavenger `enemy`; the Rot Sovereign one `any` trigger. It counts as a
   new file in the test reconciliation.
6. **Every mutation run** (amends the "Mutation check" row). The report shows, for every row of the
   mechanism table, the named test failing with that mechanism removed: each relationship branch
   at each of the three sites, the new order, the single call (both variants in item 2), the by-id
   exclusion, the alive gate, fail closed (item 1), the `self` rejection, the `createCombat` trait
   loop, and a dropped filter on a migrated trigger.
