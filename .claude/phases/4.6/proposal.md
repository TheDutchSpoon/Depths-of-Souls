# Phase 4.6 proposal — review fixes

**For:** the design agent (Cowork) who writes Phase 4.6's brief.

**This is not a brief.** Nothing here is decided. It is the input for writing `.claude/phases/4.6/brief.md`, the way 4.1's brief came out of the Phase 4 close-out review: "walked every finding through with the design owner", then the docs synced and the brief written.

**Inputs:**
- This proposal.
- The review it is built on, `review.md`: the combined review of `main` at `8aef772`, after 4.5-G1. Every finding there has a stable ID (B1, D3, L8 and so on). This proposal cites those IDs.

**Suggested place for both files:** `.claude/phases/4.6/`, as `proposal.md` and `review.md`, committed before the session. `WORKFLOWS.md`'s tree doesn't list either file yet. If you keep them, the session adds them to that tree (see [Deliverables](#deliverables)).

## The session

1. **Pre-flight** (`workflow/design-rules.md`).
   - Read the living docs from the working tree, and check the tree with read-only git.
   - The tree is on `main`, with 4.5-G2 merged and its doc sync committed.
2. **Re-verify the review against current `main`.**
   - The review is a snapshot at `8aef772`. G2 and its doc sync have landed since.
   - For every finding in [Scope](#scope), confirm it still holds and update its `file:line`. Drop any that G2 fixed or changed.
   - Report the result before the walk-through: still holds / moved / gone, one line each.
3. **Walk every finding through with Duncan.**
   - Q1–Q25 below each carry a recommendation. Duncan decides; "document as is" is always a valid answer.
   - A finding with no question attached is a plain fix or doc edit. Confirm the batch.
   - If a question's answer changes another, say so before moving on (Q3 and Q6 share `defendCount`).
4. **Write the brief and the slice briefs** ([Deliverables](#deliverables)).
5. **Sync the docs in place**: the `**Known bug:**` lines and every doc-only item.
6. **Check the citations.** Run `npm run docs:check -- citations` on everything edited, and on the new phase files by name, since the full run skips `phases/`.
7. **List every doc edited**, with a one-line reason each. Duncan reviews the diff and commits.

**Not in this session:**
- code, or anything under `src/`;
- a slice kickoff (4.6-A's kickoff is its own chat);
- doc-budget planning. Report `docs:check -- budgets` as usual; an over-budget file is handled when it happens, not planned here.

## Before the phase: one item for 4.5-G2

- **G2's Debug "Record boss kill" should be a dropdown of the bosses in `BOSS_CREATURES_BY_ID`, never free text.**
  - Today `recordBossKill` accepts any id. An unknown one adds 100 perk points and then crashes the side panel (L1).
  - A dropdown keeps G2 byte-identical, with no store code changed.
  - This belongs to G2's kickoff, not this session.
- **If G2 merged without it,** the crash is reachable in the live demo. Then L1 becomes the first item of 4.6-B, and the brief says so.

## Why a phase here

- **After 4.5-G2:** G2 may not touch engine, store or data code (`phases/4.5/brief.md#demo-golden-rule`).
- **Before Phase 5:** it's the reason 4.5 put the demo before persistence. Saves store what the engine produces, and save bugs should never be confused with engine bugs.
- **No demo of its own:** a fix phase, like 4.1. The live 4.5 demo reads `main`, so it shows each fix as it merges.

## Scope

By the review's routing. "→ design pass" in the review means the session's own doc sync (step 5).

| Where | Findings |
| --- | --- |
| **Doc sync** (this session) | S2, S3, S5–S8, S9's listing gaps, S10. The D4, D7 and D8 wording. The trigger glossary (W1) and the rewordings W2–W12 whose behaviour stays. C1–C4, C6. V6–V9, V13. L13's doc note. Q24's CONVENTIONS amendment |
| **`**Known bug:**` lines** (this session) | One per rule `main` breaks whose design stands, each pointing at its brief entry (`workflow/design-rules.md#doc-edits`). Proposed: `content/overgrowth.md` (B1), `specializations/brute.md` (B4), `specializations/shieldbarer.md` (B3, B6), `spec/effects.md` (L7, L9, L10, L11), `spec/statuses.md` (L2, L3), `spec/combat.md` (L4, L6, L8), `spec/store.md` (L15). A new direction (B2, B5, D1–D3, D5, D6, Q14) goes only to "Decided, not built" |
| **4.6-A**, engine hardening | L2–L12, the L13 validator, S4, V10 |
| **4.6-B**, game-layer hardening and the comment sweep | L1, L14, L15, S1, S9 (`recordBossKill`), S11, V1, V2, V4, V5; then M1–M17, V3, V12 |
| **4.6-C**, rule fixes | B1–B6, D3, D5, D6 |
| **4.6-D**, content | D1, D2, C5 |
| **Deferred** | V11 (bare-string ids), per Q24 |

## Proposed slicing

A proposal: the brief decides.

| Slice | Contents | Golden policy | Reads |
| --- | --- | --- | --- |
| **4.6-A** | Engine hardening | Byte-identical | `spec/combat`, `effects`, `responses`, `statuses` |
| **4.6-B** | Game-layer hardening; the comment sweep as its last commit | Byte-identical | `spec/store`, `run`, `progression`; `CONVENTIONS.md#comment-why-not-what` |
| **4.6-C** | Rule fixes | Deliberate, listed, each change attributed to its fix; CI balance verdicts re-checked | The engine spec files, `specializations/`, `content/overgrowth.md` |
| **4.6-D** | Content | Deliberate content change; CI balance verdicts re-checked | The content docs, `content/enemy-behaviour.md` |
| (4.6-D2) | Tuning, only if a CI verdict flipped | Content numbers, deliberate | — |

**Why these cuts:**
- **Byte-identical versus deliberate is the one cut the rules force** (`WORKFLOWS.md#golden-policy-one-per-pr`).
- **A and B split by spec reading list.**
  - One byte-identical slice would make every chat read nearly the whole spec, which is what the 4.2 context diet set out to avoid.
  - B's comment sweep is its own commit, proven comment-only with `docs:check -- comment-proof <the commit before it>`.
  - Sweeping early means the widened comment check guards C and D in CI.
- **The rule fixes share C, as 4.5-D's three fixes shared a slice.**
  - Each touches a narrow set of fights.
  - The PR attributes every changed golden and corpus row to its fix by switching each fix off in turn, the review's own technique (`workflow/pr-review.md#5-mutation-check-do-the-tests-pin-what-they-claim`).
  - The digest is regenerated once and the verdicts are checked once.
- **Content stays apart (D).**
  - Role changes reroll every Spider and Pollinator fight, which would swamp C's attribution.
  - The 4.5 brief kept the spell change apart for the same reason (`phases/4.5/brief.md#slices`).
- **Pre-agreed split lines,** if a plan comes out too big (`WORKFLOWS.md#when-a-slice-is-too-big`):

  | Slice | Split into |
  | --- | --- |
  | A | **A1:** setup and load-time guards (L3, L5–L8, L11, L12, L13, V10). **A2:** runtime fixes (L2, L4, L9, L10, S4). |
  | C | **C1:** the perk and action fixes (B2–B6). **C2:** statuses and reactions (B1, D3, D5, D6). |
- **Items drop if the walk-through answers "document as is".** C is the slice most likely to shrink.

**Proposed sequencing rules for the brief:**
- **As in 4.5:**
  - Sequential branch-off.
  - Each fix's PR review folds its item into the docs and removes its Known bug line.
  - No tuning inside a fix slice.
  - A slice that flips a CI verdict stops and asks Duncan.
  - At most one tuning slice, after D.
- **A new guard that makes an existing test or golden throw is a stop-and-ask in A and B.** Precedent: 4.5-B's trait validator.
- **C's attribution:** every changed golden and corpus row is listed with the fix that changed it. With that fix switched off by an env flag in a scratch copy, the row must return to `main`'s value.
- **Tests C must add:**
  - the empty-AOE golden (B5), which the corpus can't provide;
  - B2's test gap: a `damageChannel` retaliator on a splash target.
- **Expected balance directions**, so a moved verdict is no surprise:

  | Spec or creatures | Expected move |
  | --- | --- |
  | Shieldbarer | Up (B6) |
  | Brute | Down (B2, B4) |
  | Lullpollen | Up (B1) |
  | Treant teams | Up (D3) |
  | Rotcap Hollow fights | Shift (D5, D6) |
  | Spiders | Changes in D (the Weaver) |

  Watch point: 51 of the 525 corpus fights already end in a round-cap draw (`OPEN_QUESTIONS.md#fight-length`).

## Questions for the walk-through

Each names its finding, the options and a recommendation with the reason.

**Q1 — B1, Sleeper.** How does an attack-applied Sleep survive the hit that applies it?
- (a) **Recommended:** Sleep's wake doesn't fire during the turn its Sleep was born. It reads the born-this-turn window ticks already use (`spec/statuses.md#born-this-turn`).
  - Keeps the Sleeper's doc sentence true.
  - Adds no new state.
  - Covers any future "attack applies a damage-breakable status" design.
  - Side effect: a Pollen Cloud followed by a same-turn echo hit also stays asleep.
- (b) A data-only redesign: `on-turn-end`, 40% to Sleep a random enemy.
- (c) A post-hit point for actor-self hooks. The biggest change: it moves every `on-attack` fight.

**Q2 — B2, a Confused Splashing attacker.**
- (a) **Recommended:** a redirected hit doesn't splash. Removes the free Annihilate hits with the smallest balance move, and matches what Splashing alone already does.
- (b) The splash follows the main target into its own party. A Confused Annihilator would then hit its whole team, a penalty the Brute can't answer (Lucidity is a Shieldbarer perk).

**Q3 — B3, Bulwark after a revive.**
- **Recommended:** a revive resets `defendCount`. The intent of `spec/effects.md#death-reset` ("not a buff-preserving undo") wins.
- Bulwark's entry gains "(a revive starts the count over)".

**Q4 — B4, what a response hit counts as for scoped bonuses.**
- **Recommended:** neither an attack nor a cast.
  - A response hit gets only unscoped bonuses (Ambusher, Cull the Weak), and still no cross-stat.
  - Brute Force and Spell Focus then mean what their text says.
  - It matches `spec/effects.md#traits`: a retaliation is indirect damage, not an attack.

**Q5 — B5, an AOE instance with no living target on its side.**
- **Recommended:** it isn't cast: no `SpellCast`, no hooks, exactly like a single-target instance with no target.
- The check runs after the instance's Confusion roll.

**Q6 — B6, does a granted defending stance count as Defending?**
- (a) **Recommended:** yes. Entering the stance, by the Defend action or by a grant (Shield up, Phalanx, the Snapjaw Lure), bumps `defendCount` and fires `on-defend`.
  - `on-action-observed` stays the action's alone.
  - The Shieldbarer tree then works for its own starter before Phase 6 scripts exist.
  - "Defending" means one thing in every perk text.
- (b) Count it for `defendCount` only.
- (c) No: reword the three perks, and accept two inert perks on the starter.

**Q7 — D1, the Spider Weaver.**
- (A) **Recommended:** role `striker`, `on-attack`, Web the attack's target.
  - Matches its trait name, "Web Strike".
  - Below 80% enemy HP, the striker and the Ambusher both attack the weakest enemy, so the Web lands where the payoff hits.
  - Web rate stays similar, but the Weaver casts its gems only when Pacified.
- (B) Striker, `on-attack`, a random enemy.
- (C) No change.
- An `on-attack` caster isn't viable: the Weaver never attacked in 525 corpus fights.
- History: Phase 4 deliberately moved it off `on-attack` (`archive/phases/phase-4-party-specializations-cave-biomes.md:1681`).

**Q8 — D2, the Pollinator Beneficiary and Resonant Chorus.**
- **Recommended:** both get the `striker` role. Data only; the traits and numbers stay.
- Alternative: rescope the traits. A Chorus gaining Intelligence would duplicate the Adept.

**Q9 — D3, fight-start Health raises.**
- **Recommended:** a Health raise during the fight-start pass raises current HP with it, since nobody is hurt yet. That way "at fight start `currentHp` is the effective max" (`spec/statuses.md#health-is-a-modifiable-stat`) covers fight-start triggers.
- Mid-fight raises (Sapling, Gorgemaw, Voidmaw) stay ceiling-only, and their entries say so.
- Alternative: document that the team opens injured, so the Wick burns from turn 1.

**Q10 — D4, "when it attacks" resolves before the hit.**
- **Recommended:** keep it as the rule, and state it in the trigger glossary and the affected entries (W12).
  - A post-hit point would move every `on-attack` fight.
  - The one entry the timing breaks, the Sleeper, is Q1.

**Q11 — D5, should retaliators answer allies?**
- **Recommended:** enemies only.
  - An optional source filter on `on-damage-taken`, valid on that hook only like `damageChannel`, set on the four retaliators, with a data test holding every `triggering-source` retaliator to it.
  - Thorns' text already says "that enemy".
  - It ends the Wretch re-Confusing its own Confused allies (224 times in the corpus).

**Q12 — D6, what counts as a kill.**
- **Recommended:**
  - DoT kills and trait-hit kills count: the applier owns its DoT (`spec/statuses.md#dot-and-regen-belong-to-their-applier`).
  - Ally kills don't: `on-kill` fires only for a victim on the other side.
  - The Cinderlord's self-renewing Burn is accepted, documented and watched in tuning.
- Alternative: exclude DoT kills too.

**Q13 — D7, turn hooks on lost turns.**
- **Recommended:** reword only. A turn exists even when its action is skipped.
- Skipping the hooks would touch the Wick, the Setter, the Seer's roll and every turn-start buff.

**Q14 — S1, the content frontier.**
- **Recommended:** once every biome slot has content, the frontier is unbounded.
- It's tiny and byte-identical, and stops the spec contradicting itself until the last biome ships.
- Alternative: state a cap at 100 until beta (`ROADMAP.md#content-authoring`).

**Q15 — S4, a zero count on `apply-stat-modifier`.**
- **Recommended:** it fizzles, like `deal-damage` and `heal`.
- Byte-identical: the Swarmhive Striker counts itself, so no content reaches 0.

**Q16 — S5, the intro's enemy Unicorn.**
- **Recommended:** exempt the intro in `spec/run.md#scripted-intro`. It's a fixed fight with a gemless Unicorn, and its result changes nothing. The intro stays identical to the simulator's.
- Alternative: roll it a set.

**Q17 — L1, `recordBossKill`.**
- **Recommended:**
  - G2's dropdown.
  - 4.6-B makes the store refuse an id that isn't a boss in the biome data: `{ ok: false, reason: 'unknown-boss' }`, listed in `spec/store.md#how-store-actions-fail`.

**Q18 — L3, Health modifiers with a condition.**
- **Recommended:** the validator rejects a `stat: 'health'` modifier with a condition. No content has one.
- That's one load-time rule, instead of a clamp and a test at every status apply, expire and remove site.

**Q19 — L4, 0 HP.**
- **Recommended:** effective max Health is at least 1, and a revive restores at least 1 HP.

**Q20 — L5, an unknown `scriptId`.**
- **Recommended:** `createCombat` throws; `null` stays the fallback.
- When Phase 6 lets players delete templates, the store unassigns them.

**Q21 — L8, party order.**
- **Recommended:** `createCombat` validates, and throws otherwise:
  - ids unique across both sides;
  - slots unique per side;
  - each array in slot order.
- One check at the boundary replaces a sort in five helpers.

**Q22 — L12, `triggering-ally`.**
- **Recommended:** delete it. It has no rule and no content.

**Q23 — V5, numbers in logic.**
- **Recommended:**
  - `perkPointsPerBoss` goes into `BalanceConfig`, with the 1000 spec total derived from it.
  - The 0.25 stat growth goes beside the XP curve, or into `engine/config.ts` if the config doesn't reach `scaleStatsToLevel`.
  - A named `LAST_FIXED_FLOOR` replaces the two literal 100s.
  - `spec/run.md` stops calling the generation constants "config".

**Q24 — V11, bare-string ids.**
- **Recommended:** defer.
  - Amend `CONVENTIONS.md#ids-are-branded`: ids that cross the store or save boundary are branded; the rest get named aliases.
  - Add the alias pass to Phase 5's ROADMAP entry, since saves make ids references (`spec/saves.md#references-not-copies`).

**Q25 — C5, two traits named "Gorge".**
- **Recommended:** rename the Sparkeater Gorger's trait. "Devour" is a placeholder; the name is Duncan's call.
- Byte-identical: trait names appear in no event.

## Deliverables

Everything goes into the working tree, for Duncan to review and commit.

- **`.claude/phases/4.6/brief.md`**, in the 4.5 brief's shape:
  - the status line, "Decided with the design owner on <date>";
  - why the phase sits here;
  - the slice table with each slice's golden policy;
  - why the cuts fall where they do;
  - the sequencing rules and balance verdicts;
  - "Decided, not built", one entry per decided item;
  - an Assumptions checklist.
- **`<slice>/brief.md` for each slice** (`phases/4.6/A/`, `B/`, `C/`, `D/`), in the shape of `phases/4.5/G2/brief.md`: Scope, Known, Done when. Each names the spec files its slice reads.
- **The doc sync:**
  - the Known bug lines;
  - the doc-only items from [Scope](#scope);
  - `ROADMAP.md`'s Phase 4.6 entry, plus Phase 5's alias pass if Q24 defers it;
  - `phases/4.5/brief.md`'s status line, if G2's doc sync didn't already update it.
- **`WORKFLOWS.md`:** if `proposal.md` and `review.md` stay in the phase folder, add them to the "Where things live" tree. Changing the process is a normal doc change (`WORKFLOWS.md#docs-and-records`).
- **Draft ROADMAP entry**, to adapt:

  > ## Phase 4.6 — Review fixes (interlude)
  > *Brief: `.claude/phases/4.6/brief.md`; slices 4.6-A to 4.6-D.* The fixes from the review of the Phase 4–4.5 build, after the 4.5 demo and before Phase 5, so persistence starts on a settled engine. A fix phase, so no demo of its own: the live 4.5 demo shows each fix as it merges.

## Starting the session

In a fresh Cowork chat, with the repo connected, on `main` after G2 merges:

> Read `.claude/phases/4.6/proposal.md` and `.claude/phases/4.6/review.md`, then follow the proposal's session steps: re-verify the review against current `main`, walk me through the findings and questions with your recommendation for each, then write the Phase 4.6 brief, the slice briefs and the doc sync. Follow `workflow/design-rules.md`.
