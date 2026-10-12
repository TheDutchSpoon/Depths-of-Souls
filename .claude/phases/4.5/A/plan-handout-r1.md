# Plan hand-out — Phase 4.5 — Slice A — Round 1

**Verdict: approved.** Build `plan.md` with the items below. Where this hand-out and `plan.md`
disagree, this hand-out wins. Items 1–7 are required; item 8 is your call.

1. **Byte-identity proof** (plan: "Proof the report will carry"). The throwaway script imports each of the
   six changed golden fixtures from both trees and deep-equals **every export except `traits`**,
   found by enumerating the module's keys, never from a fixed list. It also checks the moved trait
   definitions: `FIXTURE_TRAITS_BY_ID` holds exactly the nine ids, and for each one
   `FIXTURE_TRAITS_BY_ID.get(id)` deep-equals `TRAIT_REGISTRY.get(id)` imported from the `main`
   worktree. The report shows both results.
2. **Test titles** (plan: §1, the two moved test files). In `traits.test.ts`, the `describe` title
   names the nine mechanism-test fixture traits. In `index.test.ts`, it names the trait registry.
   Neither keeps "stock traits (representative content)". The grouping test's title has no "core/".
3. **`StatPercent` doc** (`engine/effect-types.ts`, around line 49; plan: comment rewrites (a), and the
   `StatPercent` ASSUMPTION). Delete `CATASTROPHIC_COLLAPSE` from the parenthetical and add no
   replacement. The parenthetical reads "(the Wick's burn and heal)": the Wick's trait
   (`data/traits/glimmerdark.ts`, `flatAmount: { ofStat: 'health', percent: … }`) is the real reader.
4. **Regen and Stun `defaultDuration` comments** (`data/statuses.ts`, around lines 86 and 97; plan:
   comment rewrites, and the Regen/Stun ASSUMPTION). Each comment says the value is the fallback
   duration for an apply-status that omits `duration` (`applyStatus`,
   `spec.duration ?? def.defaultDuration`). It names no source. It does not call the value
   documentary or unread, because `applyStatus` reads it. The values stay 3 and 1.
5. **Acceptance grep and Defensive Stance** (plan: mechanism table, "No placeholder in game data"; comment
   rewrites, `data/specializations.ts`).
   - The plan states the exact command. It is case-sensitive and searches for the nine quoted ids
     (`'brutish'`, `'bloodlust'`, `'swift-striker'`, `'retaliate'`, `'grudge'`, `'reckless'`, `'vengeful'`,
     `'reeling'`, `'catastrophic-collapse'`) and the nine const names as whole words, over
     `src/data src/state src/app src/ui`. The expected output is empty, and the report shows it.
   - The Defensive Stance comment cites `spec/responses.md#apply-stat-modifier` (a stat-modifier added by a
     response is permanent for the fight, so each Defend adds one). It does not cite the fixture and does
     not contain `GRUDGE`.
6. **`SplashingDef` doc** (`engine/effect-types.ts`, around line 743; plan: comment rewrites (c)). The doc
   cites `spec/combat.md#adjacency-targeting` for the adjacency lookup. It names neither file and does not
   cite the ROADMAP.
7. **Splashing break-test** (plan: mechanism table, "Single adjacency lookup"). Run it after the private copy
   in `actions.ts` is deleted, and say so in the row: break `targeting.ts`'s `adjacentLivingTargets` (drop
   the `after` neighbour), and both `targeting.test.ts` and `golden-splashing` fail. `actions.ts` already
   imports from `./targeting`, so `adjacentLivingTargets` joins that import list.
8. **Your call** (plan: mechanism table, "Nine ids resolve only from the fixture registry"). Reverting one
   golden's import and one `resolution.test.ts` case is enough to show the unknown-id throw. You don't have
   to revert all six goldens and all three cases.

Unchanged and confirmed:
- the stub `<main><h1>Depths of Souls</h1></main>`;
- `FIXTURE_TRAITS_BY_ID` with `FIXTURE_TRAITS`;
- the `validateTrait` test in `traits.test.ts`, importing `validateTrait` from `../../data/traits`
  (`validateTrait` stays in `data/traits/index.ts` in this slice);
- no RECKLESS behaviour test;
- the deletion checkpoint before any gate.
