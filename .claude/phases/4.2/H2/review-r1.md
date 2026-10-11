# PR review — Phase 4.2 — Slice H2: Code comments, the sweep — Round 1

Reviewed branch `4.2-h2` at `552e5bc` ("build") against `origin/main` at `0126c4a`, which hasn't
moved since the kickoff. Inputs: `kickoff.md`, `plan.md`, `plan-review.md`, `report-r1.md`,
`record.md`, the evidence folder, `phases/4.2/H/brief.md`, and the living docs on the branch.

**Verdict: fixes.** The machinery is sound and I reproduced every proof. The diff is comment-only,
every golden and the corpus digest are byte-identical, the test count is unchanged file by file,
`comments` passes and is pinned in CI. The sweep itself falls short of
`CONVENTIONS.md#comment-why-not-what` in three ways:

- One mechanical rule deleted eight valid citations.
- About twenty rewrites now state something false or point at nothing.
- About twenty provenance and history markers survived, because `comments` cannot see their
  shapes.

All of the fixes are comment and title edits under the same proof. `handout-r1.md` lists them.

## Real fixes

**1. Rule M1 deleted eight anchors along with their labels.** M1 drops a leading label together
with its parenthetical. When that parenthetical held an anchor beside the tag, as in
``Phase 4.1-H2b1 (`spec/effects.md#damage-observation`):``, the anchor went too, so these
comments now restate a rule with nothing to cite. That is the opposite of the convention. I found
them with a per-hunk count of `.md#` citations removed against citations added. 14 hunks lose one;
6 of those moved it elsewhere or dropped a duplicate; these 8 are real losses:

- `data/scripts.test.ts:37` → `spec/scripting.md#role-scripts`
- `engine/effect-types.ts:354` → `spec/effects.md#damage-observation`
- `engine/effect-types.ts:391` → `spec/combat.md#one-action-pipeline`
- `engine/effect-types.ts:466` → `spec/effects.md#no-temporary-stat-modifier`
- `engine/effects.ts:464` → `spec/statuses.md#action-locks`
- `engine/resolution.ts:436` → `spec/effects.md#damage-observation`
- `engine/resolution.ts:1222` → `spec/statuses.md#the-applier-snapshot`
- `engine/test-utils/golden-runner.ts:1` → `CONVENTIONS.md#every-golden-replays-through-one-shared-runner`

This is my miss as much as the build's. The plan's M1 row and its samples were in front of me at
the plan review, and I approved them without asking what happens to an anchor inside the label.

**2. Rewrites that made a comment false.** Each was checked against the code or the doc:

- `golden-necromoss-reclaim.fixture.ts:5,7` calls 18 max HP "the species' real numbers". The Wisp
  has `health: 30` (`data/species/rotcap-hollow.ts:211`). "The old numbers" was history, and the
  rewrite turned it into a false present-tense claim.
- `data/traits/glimmerdark.ts:163-164` says the Resonants' "ally casting raises the stats of its
  caster". The response targets `self` (`:182`): the Resonant gains.
- `engine/effects.ts:1-3` promotes the old "grows in Slices B/C" plan to present tense. The status
  lifecycle isn't in this module: `applyStatus` is in `resolution.ts:1335` and the countdown is in
  `combat.ts:164`.
- `engine/balance-types.ts:34` says "Default 2, 1." The default is `{ base: 0, perTenFloors: 1 }`
  (`data/balance.ts:16`). `{2, 1}` is the placeholder fixture's value, and "Phase 4's" was the
  qualifier that made the old line true.
- `data/spells/rotcap-hollow.ts:108-110` says Burn "has no other real producer besides Sporch's
  own on-attack trait". `SPORCH_CINDERLORD_TRAIT` applies Burn on-kill too.
- `engine/spell-effects.test.ts:1224` titles the test "(a mid-fight throw)". The test asserts that
  `validateSpellEffects` rejects the spell **at load**; the old title said it *used to* throw
  mid-fight.
- `engine/effect-types.ts:769-771` says "no existing content sets this". The Blindclaws Striker
  sets `actionKind: 'attack'` (`traits/glimmerdark.ts:136`), and the next sentence names two perks
  that set it.
- `engine/test-utils/rng-draw-count.ts:1-3`: the parenthetical that described the deleted
  `countingRng` now describes this helper and calls it "impossible".
- `engine/generation.ts:169` says "nothing produces a non-null `Instance.scriptId` yet", but the
  balance-sim probe does (`state/balance-sim.ts:914`).

**3. Citations and quotations that don't hold.** `citations` only proves an anchor resolves; I
read each target:

- `data/traits/overgrowth.ts:91` claims `spec/effects.md#count-scaling` "names Swarmhive Striker".
  No spec file mentions Swarmhive.
- `data/traits/rotcap-hollow.ts:12` cites `#myconet-endurancewit-death-network` for a sentence
  about Necromoss. The right anchor is `content/rotcap-hollow.md#necromoss-witvitality-reclaim`.
- `engine/effect-types.ts:312` says count-scaling "names stat-modifier as an eligible host".
  `spec/effects.md#stat-modifier-counts-freeze-at-application` says the opposite; cite that rule.
- `engine/effect-types.ts:763`: the "consumption model" is in
  `spec/effects.md#conditional-damage-bonus`, not `#splashing-and-annihilate`.
- `data/species/starters.ts:36` and `data/traits/starters.ts:9` quote "grants one spell as a
  permanent extra gem" beside `specializations/sorcerer.md#starter-glyphmoth-seer`. The target
  says an innate spell, not a gem, so the quotation is neither the target's words nor what the
  code does.
- Short quotations that aren't the target's words:
  - "a big retaliate" (`traits/overgrowth.ts:269`)
  - "+% while acting before its target" (`traits/glimmerdark.ts:121`)
- `--quotations` reports 0 for all of these. Its window misses a quotation placed *before* the
  anchor and quotations of four words or fewer (decide-point D1).

**4. References left pointing at nothing.** Each referent was the tag the script removed:

- `golden-spore-spread-dot-kill:24`: "now, per the fix"
- `golden-sorcerer-starter:72`: "the same draw as before"; also `:7-10`, where "so the pool stays
  size 1" no longer follows from anything
- `golden-b2-silenced-refuses-granted-cast:138`: "the one new event"
- `golden-b1-granted-cast-default:7`: "the log gains"
- `status-snapshot.test.ts:30`: "(extended to a rule's unit test)"
- `resolution.ts:869,1030`: `spell.spellPower * pf` and `sp * pf`. No such field exists any more,
  and the reason (byte-identity with the legacy cast path that `spell-effects.test.ts` pins) is
  gone.
- `balance-sim.ts:4`: "the watch points"
- `traits/rotcap-hollow.ts:60-61`: "…the Glimmerdark amplifiers):" lost its verb
- `rewards.ts:44`: "deriving a fused creature is `…#fusion`" lost its verb
- `effective-stats.ts:64`: a dangling "Self-only:"
- `corpus-coverage.test.ts:167`: "// Appended:"

**5. Provenance and history that survived.** `comments` passes, so each of these is a shape the
tool misses or a hand-pass judgement:

- Review words:
  - `combat.ts:51` "(design-review B-5)"
  - `generation.ts:221` "(nit, review)"
  - `perform-action.test.ts:4` "(the PR lists the mutation for each)"
  - `status-containers.test.ts:195` "(deliberate change)"
- Slice ids:
  - `combat.test.ts:939`, the title "pre-Slice-B". `evidence/history-markers.md` lists it under
    **Kept** as a live invariant; it is a slice id.
  - `golden-h2b1-observed-tick:2-4` "H2b2 moved…"
  - `golden-h2b2-tick-self-applied:4` "H2b1 refused"
  - `spells/overgrowth.ts:228` "(H's job)"
- Plan items and "locked":
  - `golden-sleep-wake:4,6` "#1's"
  - `golden-action-observed:1` "own locked"
  - `golden-attack-instance-list:1` "(locked)"
- History:
  - `golden-stun:83-84` "it used to expire …". This one wraps across two lines, so a per-line grep
    can't see it. I joined every comment block and re-scanned; it is the only split marker.
  - `golden-f2-weaken-three-turns:2-5` "covered only two … only WHICH turns it covers moves"
  - `spells/overgrowth.ts:81` "(it dealt 35% before)"
  - `traits/index.ts:129` "the Glowflies' three became the Flickerlings'"
  - `roles.test.ts:82` "Was 'taunter'"

**6. Stale facts in blocks the pass touched.** Not created by this PR, but the brief says a
restated rule is "fixed when found", and the kickoff says each rewrite is checked against the code:

- `spells/overgrowth.ts:3` says "11 real spells"; the file has 16. Its "two per other affinity"
  is also wrong.
- `spells/overgrowth.ts:97-100` says the Sorcerer starter references Arcane Bolt "for its fixed
  slot-0 loadout". The starter gets it as an innate spell (`traits/starters.ts:36`).
- `statuses.ts:38-40` says Poison's default "is never actually read". `MYCONET_ROTCORE_TRAIT`
  (`traits/rotcap-hollow.ts:187`) applies Poison without a duration, and `golden-dot` is a fixture,
  not a producer.
- `traits/glimmerdark.ts:247` gives the spread as "4/4/4/4/2". `glimmerdark.test.ts:89` pins
  4/3/5/4/2.
- `golden-resonant-overtone.test.ts:7` says "echo damage lands before the original". The fixture
  (`:95`) and its events show the original landing first, and the PR deleted the only sentence
  that explained the difference.

**7. Leftovers from joining lines.**

- Hyphen joins:
  - "Necromoss- shaped" (`golden-heal-scaling-count:1`)
  - "true- damage" (`effect-types.ts:177`)
  - "deal- damage" (`traits/overgrowth.ts:49`)
  - "Provoke/ Wait" (`actions.ts:202`)
- A double space at `golden-turn-end-dot-kill-burst:13`.
- An identifier capitalised against fix 11: `store-hub.test.ts:93` "// Null = the role".
- Joined lines: in the changed files, comment lines over 120 columns grew from 86 on `main` to
  161. The worst are 230–290 characters, against a `printWidth` of 90 (D2).

## Scope and labeling

- **Quotations "0 after"** is true of the scanner, not of the rule (fix 3). The report should say
  which.
- **`history-markers.md`** keeps `combat.test.ts:939` as an invariant; that row moves to
  Rewritten.
- **To delete:** the report names `evidence/counts-before.tmp` and `evidence/planted-faults.tmp2`.
  Neither is in your working tree or on the branch, so there is nothing to delete. The mailbox holds
  only step files and `evidence/`.
- The report's gates ran on Node 24.19.0. I ran on 24.21.0 (CI pins `24`), and the results match.

## Spec questions, answered

1. **New top-level test folders default to Node.** That is what `main` does: the Node project's
   `include` is a catch-all minus `src/ui` and `src/app`. I added it to
   `CONVENTIONS.md#test-environments`, so `vite.config.ts`'s citation now covers the default too.
2. **The per-creature affinity "coverage" note:** no rule needed. How a biome's affinity spread is
   picked is content authoring, and each content doc states its spread
   (`content/glimmerdark.md#affinity-spread`). The comments should say what the data does, as
   `species/glimmerdark.ts` now does.
3. **`DamageDealt.statusId`'s Phase 7 consumer:** dropping the pointer is right; no rule names it.
4. **The corpus header and `renderFixture` are tied by nothing in the default run.** Decide-point
   D1(c).
5. **`balance-sim.ts`'s "ASSUMPTION 22/108" report strings:** D1(b).
- **Stale living-doc lines:** moved in place this review (see Docs edited). `ROADMAP.md`'s "Done"
  line gains 4.2-H2 at the next kickoff, as usual.

## Decide-points

**D1. Hand the tool's blind spots and the remaining non-comment provenance to 4.2-H3?** This
slice may not change the tool. These would go in `phases/4.2/H/brief.md`'s Decided, not built, as
4.2-H3 items:

- **(a) Shapes `comments` misses:**
  - lower-case `pre-` before a slice name (pattern 3 matches only `Pre-`/`Phase-` and a digit)
  - `Slice-B` with a hyphen (pattern 5 wants a space)
  - review words without fix/round (`design-review`, `(nit, review)`)
  - quotations placed before an anchor, or of four words or fewer
- **(b) Six non-title literals** that carry provenance:
  - `rewards.ts:52` and the regex at `rewards.test.ts:179`
  - three `balance-sim.ts` report strings with `balance-sim.test.ts:164`
  - `corpus-coverage.test.ts:27`
- **(c) A default-run test** that the committed corpus fixture's header equals `renderFixture`'s
  head.

**Recommend yes, all three.** H3 already extends `comments` (a sibling mode for names) and finishes
the provenance strip. Its golden policy is byte-identical, so a string or a header test sits
inside its proof. Doing (a) there also means every pattern it adds is proved against a tree that
H2 has already cleaned. I'll write the three items into the brief once you say so.

**D2. Rewrap the comment lines the pass joined?** About 75 comment lines are now over 120 columns.
The kickoff says "Don't rewrap prose", but that rule protects prose the pass didn't touch; these
lines are the pass's own output, and the 290-column ones are hard to read. **Recommend yes:**
rewrap only lines this branch made longer than 120 columns, at the file's usual width. The proof
is unaffected, because comments are stripped before the compare. If no, drop item 7's last bullet
from the hand-out.

## Decisions

Duncan, 2026-10-11:

- **D1: yes, all three.** The tool's blind spots, the six non-title literals and a default-run
  check of the corpus header against `renderFixture` are 4.2-H3 items, written into
  `phases/4.2/H/brief.md`'s Decided, not built.
- **D2: yes.** The hand-out keeps item 7's rewrap of the comment lines this branch made longer
  than 120 columns.

## What I verified, and how

All of this ran in my own clone, never in your working tree.

**Toolchain and gates:**
- `npm ci` on both worktrees under Node 24.21.0.
- On the branch, every gate passes:
  - `npm run test`: 210 files, 1,682 tests (1,681 passed, 1 skipped)
  - `lint`, `format:check`, `build` and `npx tsc -b`: clean
  - `citations`: PASS, 620 citations
  - `budgets`: 0 over
  - `comments`: PASS, 6,918 comments and 1,627 titles in 403 files
- **Test counts:** `vitest run --reporter=json` on `main` and on the branch, reconciled file by
  file: 210 files, 1,682 tests each, 0 files differ. `vitest list` agrees, with the same full
  names, no duplicates on either side, and 624 full names changed.

**Proofs:**
- **Comment-only:** `comment-proof origin/main --mask evidence/mask.json` gives PASS on 346 changed
  files (344 under `src/`, plus the two configs). Its output matches `evidence/comment-proof.txt`
  line for line. The mask has 344 entries: 343 titles and the template part.
- **Planted faults:** a type change in `effect-types.ts` and an unlisted title edit in
  `combat.test.ts` each exit 1, naming the file.
- **Outside `src/`:** only `deploy.yml` (one line) and `ci.test.ts` change, plus `.claude/`.
- **Goldens:** a throwaway test imported all 135 fixture modules (134 golden and the corpus
  digest) on both trees and deep-compared **every export**, 1,235 in all, with functions compared
  by their comment-stripped print. All are equal. 123 of the modules changed in comments.
- **Corpus:** the fixture's diff is the one header line. Running `npm run corpus:update` in my
  clone left `git diff --exit-code` at 0, which reproduces D1.

**Mutations and reading:**
- **CI mutations:** removing the `comments` step fails both `ci.test.ts` tests. Moving it after
  `npm run test` fails the order test, and so does moving it before `budgets`.
- **Reading:** every hunk of the 346-file diff was read in three parts:
  - goldens, corpus and fixtures
  - engine
  - data, state, ui, app and the configs
  Every finding above was then re-checked against the code or the doc it names.
- **Per-hunk citation count:** the eight anchors in fix 1.
- **Block-joined marker scan:** each comment block joined into one line before scanning; found the
  one wrapped marker in fix 5.
- **Not run:** step 6's corpus scan. There is no behaviour change to look for, and the fixtures and
  digest are equal.

## Docs edited

- `CONVENTIONS.md#every-pull-request-runs-the-gates`: names `comments` among the blocking docs
  checks (moved from the brief's Decided, not built list).
- `CONVENTIONS.md#test-environments`: any other folder under `src/` runs in Node (Spec question 1;
  states what `main` does).
- `workflow/coding-rules.md#rules`: the gate list adds `npm run docs:check -- comments`.
- `CLAUDE.md#how-the-spec-is-written`: "No provenance" covers `src/` comments and test titles, with
  `comments` failing CI on it.
- `workflow/pr-review.md#2-install-and-run-the-gates`: adds the `comments` line.
- `skills/slice-verify/SKILL.md`: step 3 runs `-- comments` too.
- `spec/progression.md#inert-perks`: each inert perk's comment cites its own entry, in the form
  the code now uses.
- `phases/4.2/H/brief.md`: the two Decided, not built items above are removed now that they're
  built; 4.2-H3's item stays, and D1 adds three more for 4.2-H3 (the `comments` and
  `--quotations` blind spots, the six provenance string literals, the corpus header check).

Citations: PASS (622) and budgets: 0 over, with these edits in place.
