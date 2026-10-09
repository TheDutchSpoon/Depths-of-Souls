# Kickoff — Phase 4.1 — Slice H2b2: status rules

Build ONLY this slice. Standing rules: .claude/workflow/coding-rules.md.

## Read (in addition to the standing list)

- `.claude/phases/4.1/H2b2/brief.md`: this slice's brief.
- `.claude/briefs/phase-4.1-implementation-plan.md`, these headings only:
  - "Slice plan and sequencing rules" (the golden rules and "Content docs stay in sync");
  - "The split: H1, H2a, H2b1, H2b2, H2c" (the H2b2 row) and "Why H2b ships as H2b1 then H2b2";
  - "4.1-H2a — damage rules" (the indirect channel you reuse);
  - "Acceptance (4.1-H)", the H2b2 bullet;
  - the Assumptions checklist, items 112, 113, 114, 115, 129 (the DoT numbers are H2c's: use the
    placeholders, don't tune), 131, 132, 134, 136, 139, 142 and **143** (only a status's own effect
    passes its snapshot on; decided at this kickoff, it refines 113).
- `.claude/phases/phase-4.1-fix-and-consolidation.md`, the "4.1-H2b1" and "4.1-H2a" sections: the
  predicted changed set, the mutation table and the digest attribution are the shape this report
  follows.
- Content: `.claude/content/rotcap-hollow.md` (Spore, Sporch, Myconet and its "Decided at the 4.1-H2
  grill" section), `.claude/content/overgrowth.md` (Venom Bolt's Poison and its decided section),
  `.claude/content/glimmerdark.md` (Blinding Flare, Afterglow and the "Single-instance statuses"
  item), `.claude/species/species-locked.md` (the Sporch row, the response-vocabulary notes).
- CONVENTIONS: "DoT and Regen from the applier's snapshot" and the "Flat-mode stat-derived
  magnitude" bullet after it (superseded for status ticks); "Damage channels and the Additional";
  "Status lifecycle" (single instance, refresh, born-this-turn); "`triggering-source` never
  resolves to the firing creature itself"; "Response vocabulary" (`consume-stacks`); the
  `magnitudeSource` bullet (`consumed-stacks`); "Death-reset"; "Damage observation".
- Code, before planning:
  - `engine/resolution.ts`: `applyStatus`, `applyFlatDamage` (today's tick path), `applyCostDamage`,
    `applyDamageAndEmit` (where `on-damage-taken` gets its source), `executeResponse`'s
    `deal-damage`, `heal` and `consume-stacks` branches, `resolveFlatTotal`,
    `resolveResponseTargets`' `triggering-source` case, `fireHook`;
  - `engine/effects.ts`: `flatEffects` (`statusStacks`), `damageModifierCount`, `takenFactorFor`,
    `instantiateStatus`, `resolveMagnitudeCount` (`consumed-stacks`);
  - `engine/effect-types.ts`: `StatusDef.cap`, `StatusSpec.stacks`, `StatusInstanceState`,
    `ResolvedHookEffect.stacks`, `MagnitudeSource`, the `consume-stacks` response and its
    validators, `TriggeredDef.stacks` (the dedup flag, which **stays**);
  - `engine/types.ts`: `StatusAppliedEvent.stacks`;
  - `data/statuses.ts` (every status), `data/traits/rotcap-hollow.ts` (Seeder, Bloomer, Rotcore,
    Igniter, Cinderlord, Rot Sovereign), `data/spells/core.ts` (Venom Bolt),
    `data/spells/glimmerdark.ts` (Blinding Flare, Afterglow), `data/spells/rotcap-hollow.ts`;
  - `app/demoFight.ts` (the regen-on-hit trait) and `ui/CombatDemo.tsx` (prints the stack count);
  - goldens: `golden-consume-stacks` (retired), `golden-dot`, `golden-f2-dot-one-turn`,
    `golden-f2-win-over-own-tick`, `golden-hollowkin-wretch-self-dot`,
    `golden-sporch-cinderlord-burn-stacks`, every `golden-spore-spread*`,
    `golden-turn-end-dot-kill-burst*`, `golden-b4-cleanse-then-tick`,
    `golden-b4-remove-then-reapply`, `golden-h2b1-observed-tick`, `golden-h2a-cost`.

## Scope

This slice delivers the two status rules. **Single-instance statuses** (ASSUMPTION 114):
`StatusDef.cap`, `StatusSpec.stacks`, the instance's stack count, stack increments, the ×stacks
count on ticks, `magnitude ** stacks` on damage-modifiers, the `consume-stacks` response, the
`consumed-stacks` magnitude source and the stack count on `StatusApplied` are deleted. A
re-application keeps the stronger value and refreshes the timer. **DoT and Regen from the applier's
snapshot** (ASSUMPTIONS 113, 143): at application a ticking status records the applier's id,
affinity and potency; a damage tick is indirect damage from that snapshot, with the applier as its
source while it lives and the bearer after; a Regen tick heals the potency. Content: Vulnerability
×1.5 once, Sporch Igniter one Burn, Cinderlord one Burn per enemy, Spore's spread passing its
snapshot, and the placeholder percentages (Poison 20% Attack, Burn 25% Intelligence, Regen 10% of
the healer's Health, Spore 15% Speed). The plan proposes the data shape that declares a status's
potency and the instance's snapshot. **Not in scope:** any number tuning or the Health remap
(H2c), the damage observer's shape (H2b1, built), and the Overtone's `stacks: false` dedup flag (a
different field; it stays).

## Golden policy

**Deliberate, listed.**

- `golden-consume-stacks` is retired: its mechanism is deleted.
- Goldens whose only change is the stack count dropped from `StatusApplied` change **in that field
  alone**. Show it by importing both trees' fixtures and deep-comparing every `expected*` export
  with `stacks` stripped from `main`'s `StatusApplied` events: they must be equal.
- Every other changed golden is listed with the one rule that changed it: **single instance** (a
  re-application no longer adding a stack: Cinderlord, Igniter, Vulnerability) or **the applier
  snapshot** (a tick's amount, channel or source; Regen's amount). A golden changed by both is
  listed under both, with the arithmetic showing each.
- The corpus digest is regenerated **once**, through `npm run corpus:update`. It hashes each
  fight's whole event log, so every fight with a status changes through the dropped field alone.
  Attribute in layers with scratch switches outside the repo: first, `main`'s logs with `stacks`
  stripped must reproduce the new hash for every fight attributed to the field alone; each
  remaining fight is then attributed to single instance, the snapshot, or a content change
  (Igniter, Cinderlord, Vulnerability, the percentages).
- The plan lists the predicted changed set (tests, goldens, digest causes) **before** anything
  runs. The H2b split counted 41 field-only goldens, 8 tick and 3 stacking on the older corpus:
  recount on today's tree.

## Traps

- **Moving a tick's source to the applier opens retaliation.** `applyDamageAndEmit` passes
  `sourceId` to `on-damage-taken`, and today a tick reaches no retaliator only because its source
  is its bearer, which `triggering-source` excludes. With the applier as source, Snapback, Thorns,
  Bulwark, Retaliate and the Wretch's Confusion would answer every tick. A tick must offer **no**
  `triggering-source` (CONVENTIONS), while `on-damage-taken` itself still fires (Sleep wakes on a
  tick). Say how the tick path carries that, and test it with a living applier
  (`golden-hollowkin-wretch-self-dot` only covers a self-applied tick).
- **The applier's hooks now fire on ticks.** `on-damage-dealt` and `on-kill` run on the applier
  while it lives: Rotfeeder Ripper and Gorgemaw heal, and Sporch Cinderlord's kill-burst can chain
  through its own Burn ticks. That is decided (ASSUMPTION 113); the plan predicts which corpus
  fights it touches. "While it lives" is read at tick time: a revived applier is the source again.
- **The tick formula is CONVENTIONS', not `dealDamageCore`'s.** `potency × affinity(snapshot vs
  bearer) × Π(bearer's taken factors) − 0.2 × bearer's effective Defence`, `MAX(1, floor(...))`:
  no dealt pool, so no `conditional-damage-bonus` (Sporch Ashborn's bonus vs Burning never touches
  a tick), no cross-stat and no armor penetration, which are the applier's live build and absent
  from the snapshot. Defend's ×1.5 Defence and ×0.65 taken apply, as for all indirect damage
  (ASSUMPTION 134). Reuse the indirect formula with those inputs; don't fork a third formula.
- **A tick is never self-inflicted**, applier alive or dead: `selfInflicted` stays false on the
  tick path, and the Flare never sees a tick (ASSUMPTIONS 115, 142).
- **The snapshot passes on only through the status's own effect** (ASSUMPTION 143). Spore's
  `on-death` spread copies the dying bearer's whole snapshot (applier id, affinity, potency); every
  other application snapshots its applier fresh, even an applier carrying the status. The corpse's
  statuses still exist when its `on-death` triggers fire (Death-reset), which is where the spread
  reads them. Say how the spread identifies itself as the status's own effect.
- **An applier dead at application.** Myconet Rotcore poisons every enemy as it dies: the snapshot
  reads its effective Attack then, and its ticks have each bearer as their source from the first.
- **"Stronger" is the potency, and a tie keeps the current instance**, applier and affinity
  included, so the source of later ticks doesn't move on a tie. A weaker re-application still
  refreshes the timer, and still emits `StatusApplied` and fires `on-status-applied`. A
  fixed-magnitude status (Weaken, Vulnerability, Web, Stun, …) just refreshes. Keep today's refresh:
  the duration becomes the new application's, the instance id is kept, `appliedAt` is reset
  (born-this-turn).
- **One potency per status.** Spore carries a tick and a spread; Regen, Poison, Burn and Spore each
  carry exactly one ticking effect. A validator keeps a snapshot read inside a status that declares
  a potency, and keeps one out of traits, perks and spells.
- **`StatPercent` stays for the bearer's own costs.** The Wick's burn and `CATASTROPHIC_COLLAPSE`
  still read `{ ofStat, percent }` of the firing creature; only status ticks move to the snapshot.
  The Wick's heal uses `amountPerStack`, a name for a deleted concept: the plan says whether it is
  renamed (my lean: yes, in this PR, since stacking goes here) and lists what that touches.
- **Regen's `HealApplied` source.** CONVENTIONS fixes a damage tick's source, not a heal's. The plan
  marks it as an ASSUMPTION; my lean is the same rule as damage (the applier while it lives, else
  the bearer), so one tick rule covers both. No hook reads a heal's source today.
- **Two unrelated `stacks` survive.** `TriggeredDef.stacks: false` (the Overtone's dedup flag,
  ASSUMPTION 114) and the balance simulator's stat-modifier "stacks" (`state/balance-sim.ts`) are
  not status stacks. The acceptance grep ("no `cap`, `stacks` or `consume-stacks` in engine or
  data") excludes exactly those two, and the report shows the grep with them named.
- **Count readers that aren't stacks stay.** `magnitudeSource` `count` (e.g. Sporecloud Reaper's
  enemies-with-Spore) counts creatures and is untouched; `damageModifierCount` and
  `takenFactorFor` keep their `magnitudeSource` path and lose only the stacks fallback.
- **The demo prints the stack count** (`CombatDemo.tsx`): drop it there. The demo consumes the
  engine; nothing moves into it.
- **You can't delete files.** When you reach the step that deletes `consume-stacks`, stop and ask
  Duncan to delete `golden-consume-stacks.fixture.ts` and `.test.ts`, then run the gates. Never
  neutralise a test by emptying or skipping it.
- **Content docs fold now.** Fold the H2b2 items of the "Decided at the 4.1-H2 grill" sections of
  `rotcap-hollow.md`, `overgrowth.md` and `glimmerdark.md` into their bodies (the Spore paragraph,
  the Sporch table's "2-stack" and "1 stack", Afterglow's "per stack" row) and delete them from the
  pending sections; the Health and tuning items stay pending. Fix code comments that describe
  stacks, caps or `consume-stacks` as current.

## Must stay green

- All five gates: `npm run test`, `npm run lint`, `npm run format:check`, `npm run build`,
  `npx tsc -b`.
- Every golden outside the listed set, compared by importing the fixtures; in particular every
  `golden-h2a-*` and `golden-h2b1-*` except where the plan predicts a tick change
  (`golden-h2b1-observed-tick`), `golden-resonant-overtone` (the dedup flag), `golden-loop-safety`
  and `golden-sleep-wake`.
- The frozen double-resolve determinism test and the deep-frozen golden runner.
- `corpus-coverage.test.ts`: every spell cast with its effects landing and every status applied,
  with no stale exemption.
- `balance-sim.test.ts`, the data validators and the `perform-action` data test.

## The PR must prove

- The predicted changed set, written in the plan before the first run, against what changed.
- A hand-derived focused golden for each case in the brief, each failing with its mechanism
  removed: a re-application keeping the stronger snapshot and refreshing the timer (and a weaker
  one refreshing only, and a tie keeping the current applier); a DoT tick as indirect damage from
  the snapshot with a living applier as source, then with the applier dead (the bearer as source);
  a retaliator taking a tick from a living applier and not striking back, its `on-damage-taken`
  still firing; Spore spreading with the dying bearer's snapshot; a carrier applying the same
  status fresh with its own snapshot (ASSUMPTION 143); the observer not firing on a tick whose
  applier is dead; a Regen tick healing the healer's potency; Vulnerability ×1.5 once.
- A mutation table, each mutation killed by a named non-digest test: stacking restored (a
  re-application adds a stack); the weaker value replacing the stronger; a tie replacing the
  current applier; the timer not refreshed on a weaker application; the tick reading the bearer's
  stat; the snapshot read live from the applier instead of frozen; the tick on the old flat path
  (no Defence); the dealt pool applied to a tick; the source left as the bearer while the applier
  lives; the dead-applier fallback removed; `triggering-source` offered on a tick; a tick marked
  self-inflicted; the spread snapshotting fresh; a carrier passing its snapshot on.
- No `cap`, status `stacks` or `consume-stacks`/`consumed-stacks` left in `src/engine` or
  `src/data` (a grep, shown, with the two surviving unrelated `stacks` named).
- The field-only goldens equal to `main` with `stacks` stripped, by importing the fixtures.
- The digest regenerated once, every changed fight attributed in the layers above; at least one
  corpus fight has a tick from a living applier, one from a dead applier, and one Spore spread.
- The test count reconciled file by file against `main`, and the files Duncan deleted listed.
- Spec questions, so the docs are updated before H2c's kickoff.

## Docs edited

- `.claude/briefs/phase-4.1-implementation-plan.md`: moved the H2b2 section to this mailbox's
  `brief.md`, leaving its heading and a pointer; ASSUMPTION 113's snapshot pass-on sentence
  narrowed and ASSUMPTION 143 added (only a status's own effect passes its snapshot on; design
  owner, at this kickoff).
- `.claude/phases/4.1/H2b2/brief.md`: new; the H2b2 section, moved byte for byte.
- `.claude/CONVENTIONS.md`: "DoT and Regen from the applier's snapshot", the pass-on bullet
  narrowed to the status's own effect (ASSUMPTION 143).
