# Report — Phase 4.2 — Slice H2: Code comments, the sweep — Round 2

Fixes for `handout-r1.md`, on branch `4.2-h2` at build commit `552e5bc`; the proof's base stays `origin/main` (0126c4a, unchanged). Every
change is a comment or a test title. Nothing is committed and nothing is deleted. No living doc and nothing under `scripts/` changed.

## Gates

`evidence/gates.txt` (Node 24.19.0, npm 11.12.1):

| Gate | Result |
| --- | --- |
| `npm run test` | 210 files, 1,682 tests (1,681 passed, 1 skipped) |
| `npm run lint` | clean |
| `npm run format:check` | clean |
| `npm run build` | built |
| `npx tsc -b` | clean |
| `npm run docs:check -- citations` | PASS, 640 citations in 436 files |
| `npm run docs:check -- budgets` | 12 files, 0 over budget |
| `npm run docs:check -- comments` | PASS, 7,003 comments and 1,627 titles in 403 files; `--quotations` 0 and 0 |
| `comment-proof origin/main --mask evidence/mask.json` | PASS, 346 changed files (`evidence/comment-proof.txt`) |

- **Test count, file by file:** a `vitest --reporter=json` run of the branch against the `main` column of `evidence/test-counts.txt`: 210 files,
  1,682 tests, 0 files differ. Three titles changed this round (`spell-effects.test.ts:1224`, `combat.test.ts:939`,
  `golden-resonant-overtone.test.ts:7`); none was added or removed.
- **Golden policy, byte-identical:** the 123 changed fixtures were imported again from `main`'s tree and the branch's, in a scratch Vitest test
  in a scratch copy of the working tree, and every export compared: 123 EQUAL, 0 differ (`evidence/fixtures-compare.txt`). This is the imports
  method, not a read of the diff. The corpus digest is unchanged; `npm run corpus:update` was not run; the digest test passes in `npm run test`.
- **Mask:** 346 entries (345 title parts and the `renderFixture` template part), up from 344. The spell-effects entry now ends
  "(at load, not mid-fight)", and `combat.test.ts:939` and `golden-resonant-overtone.test.ts:7` have new entries. No entry was widened;
  `evidence/mask.json`, `comment-proof.txt` and `retitled-tests.md` (345 rows, no new duplicate full name) are refreshed.
- **Mechanisms:** none is added or removed, so the round-1 table stands (`comments` in CI with `ci.test.ts`, the sweep, the comment-only proof).
  The tool and `ci.test.ts` are untouched this round.

## The two counts the hand-out asks for

- **Item 1, citations per hunk** (`git diff -U0 origin/main`, every hunk, `.md#` citations removed against added): 1,615 hunks; 148 citations
  removed, 240 added. After the eight fixes, 10 hunks still remove a citation they do not add back; none is a loss:
  - re-pointed to the rule that states the fact: `specializations.ts:332` (Cull the Weak now cites `specializations/brute.md#cull-the-weak` and
    `spec/effects.md#conditional-damage-bonus`), `traits/rotcap-hollow.ts:11` (the Necromoss entry), `effect-types.ts:763`
    (`#conditional-damage-bonus`), `resolution-types.ts:96` (`spec/combat.md#every-action-source-obeys-the-same-rules`), `targeting.ts:107`
    (`spec/combat.md#targeting-override`);
  - moved to a neighbouring hunk of the same comment, because the diff split the block: `golden-brute-starter.fixture.ts:7`,
    `effect-types.ts:93`, `effect-types.ts:315` (both anchors are in the rewritten NOTE), `state/rewards.ts:58` (one duplicate of
    `spec/run.md#rewards` in the same sentence);
  - a test title, which carries no anchor: `species/overgrowth.test.ts:125`.
- **Item 5, split markers:** the history word list (the report-r1 list plus `historical`) over each comment block joined into one line,
  against the same list over single lines: 193 single-line hits and 1 split-only hit. The one is a false positive
  (`golden-sparkeater-voidmaw.fixture.ts:1`, "TARGET was at full HP", a scenario step). A grep for the siblings of the item's review and plan words (`design-review`, `(nit`, `review item`,
  `the PR`, `this slice`, `deliberate change`, `(locked)`, `H's job`, slice ids, `(A<n>)`) found only the hyphenated ids listed under
  Found and not fixed; the other `locked` hits are action locks.

## The hand-out, item by item

**1. Eight anchors restored.** `scripts.test.ts` (`#role-scripts`), `validateObservationFilters` and `observedDamage`
(`#damage-observation`), the `'random'` selector (`spec/combat.md#one-action-pipeline`), `validateStatusDef`
(`#no-temporary-stat-modifier`), `isActionLocked` (`spec/statuses.md#action-locks`), the tick (`#the-applier-snapshot`) and
`golden-runner.ts` (`CONVENTIONS.md#every-golden-replays-through-one-shared-runner`). Each orphaned first line is wrapped back to the block's
width. Checked by `citations` (resolves) and by reading the rule each anchor heads.

**2. False comments.** Rewritten against the code: the necromoss fixture (18 max HP is now the hypothetical, 30 is not mentioned; the
arithmetic is kept); `glimmerdark.ts` (the Resonant gains the stats, `target: self`); `effects.ts` header (what the module holds; applying is
`resolution.ts`'s, counting down `combat.ts`'s); `balance-types.ts` (default 0, 1 from `data/balance.ts:16`); Burn's producers (Sporch Igniter
on-attack, Cinderlord on-kill); the spell-effects title (mask entry updated); `rng-draw-count.ts`; `generation.ts` (the simulator's probe sets
`Instance.scriptId`, `balance-sim.ts:914`).
- **`effect-types.ts` `actionKind`, the item is wrong in part.** The hand-out says Cull the Weak, Ambusher, Gloomjaws and "Sporch's Reaper" leave
  it absent. There is no Sporch Reaper (Sporch has the Igniter, Ashborn and the Cinderlord; "Sporecloud Reaper" deals a bonus hit and is not a
  `conditional-damage-bonus`). I read every `conditional-damage-bonus` in `src/data` and wrote the ones that leave it absent: Cull the Weak,
  Ambusher, Lullpollen's Reaper, Hollowkin Puppeteer, Sporch Ashborn and Gloomjaw Stalker. I also added the Blindclaws Striker (`'attack'`) as asked,
  and dropped "unconditional", which is false for the Striker.

**3. Citations and quotations.**
- `overgrowth.ts:91` cites `#count-scaling` for the mechanism only and the Swarmhive Striker entry for the creature;
  `rotcap-hollow.ts:12` cites `#necromoss-witvitality-reclaim`; `effect-types.ts:312` cites
  `#stat-modifier-counts-freeze-at-application` and keeps only what the code adds (the call sites without a `CombatState`, the two content users);
  `effect-types.ts:763` cites `#conditional-damage-bonus`.
- `species/starters.ts` and `traits/starters.ts`: the quotation is gone and the anchor stays; `ARCANE_BOLT` is called the innate spell.
- "a big retaliate" (`overgrowth.ts:269`) and "+% while acting before its target" (`glimmerdark.ts:121`): quotes dropped, anchors kept.
- **By-hand re-scan** (`evidence/quotations.txt`, "round 2"): 78 quoted spans in blocks that hold an anchor, 61 not in any cited doc, 28 of those
  within 110 characters of an anchor. 23 changed, 5 are false positives and shown as such. It found real defects the tool cannot see: the perk
  comments in `data/specializations.ts` claimed `spec/combat.md#cross-stat-contribution` "names this exact perk" (it names none of them; the perks are
  in `specializations/brute.md` and `shieldbarer.md`), and `rng.ts`, `effects.ts`, `store.ts`, `statuses.ts`, `rotcap-hollow.ts` and two
  `glimmerdark.ts` comments quoted words their anchor does not hold.

**4. References to nothing.** All nine done: the spore golden ("a distinct per-trigger guard identity, see the header"), "(draw #1)", the
sorcerer fixture's pool size, "the grant's only event", "the log has", `status-snapshot.test.ts` (cites
`CONVENTIONS.md#tuning-never-changes-a-mechanism-golden`), the two `* pf` comments in `resolution.ts` (they say why the order is kept: byte-identical
with the legacy cast path that `spell-effects.test.ts`'s oracle pins), and the five dangling lines. `rewards.ts:44` says "is not built yet"
because `comments` pattern 2 rejects "Phase 8's".

**5. Provenance and history.** Every listed line rewritten or dropped (the round-2 table in `evidence/history-markers.md`, 32 rows; the two
`combat.test.ts:939` hits moved from Kept to Rewritten, so Kept is 298). The `pre-Slice-B` title is
"absent scalingStat reads the remap-aware Intelligence". `golden-h2b1-observed-tick` keeps the why: its own golden so the tick case can change alone.
`golden-f2-weaken-three-turns` says a Weaken applied after the bearer acted *would* cover only two turns under round-end counting. The roles comment
says why the Shieldbarer is not a taunter: a Provoke-only script never attacks. See the counts above for the split-marker scan.

**6. Stale facts.** `spells/overgrowth.ts` now says 16 spells, at least three per affinity (counted from the file), and that Arcane Bolt is the
Sorcerer starter's innate spell; `statuses.ts` says `MYCONET_ROTCORE_TRAIT` reads Poison's default; `glimmerdark.ts:247` cites
`content/glimmerdark.md#affinity-spread`. The overtone title says the original's damage lands first, then the echo's; it avoids the apostrophe
(`'`) a single-quoted title cannot hold, so it reads "the original damage lands first, then the echo damage".

**7. Join leftovers.** The four hyphen joins, the double space and `// null = the role` fixed. The other labels the script capitalised were found by
comparing each added comment that starts with a capitalised identifier-shaped word against the code: the only others are "True iff ..." prose
(`effective-stats.ts`, `effects.ts`, `generation.ts`, `resolution.ts`), which reads as English, not as the literal, and is left;
`balance-sim.ts:894` is now `` `true` ``.
**Rewrap:** 109 comment lines that this branch lengthened past 120 columns (160 such lines before the rewrap, 50 after; 86 on `main`) were rewrapped at
100 columns: 102 first, 7 one-line `/** ... */` and closing lines after. A tail merges into the next line only when that line continues the
sentence. Lines the branch did not lengthen, and the two corpus files that must match each other, were not touched. 50 comment lines still exceed
120 columns, all of them `main`'s own or shortened by this branch.

## Spec questions

None new from this round. Round 1's stand, plus: `CONVENTIONS.md#comment-why-not-what` could say that a quotation beside an anchor must be the
anchor's words (it is a rule the tool half-enforces: it misses a quote before its anchor and one of four words or fewer).

**Found and not fixed (outside the hand-out):** three plan-item ids in a hyphenated shape remain, which `comments` and the `[A-Z]\d` scan miss:
`engine/effect-types.ts:337` ("B-9"), `engine/rng.test.ts:64` and `engine/rng.ts:48` ("B-2"). They are the same kind as the listed "design-review
B-5". They are a one-line change each, for the reviewer to call.

## Content changes

None. Comments and titles only; the 123 fixtures compare equal.

## To delete

None. (Round 1's two `.tmp` files are already gone.) The scratch copy used for the fixture comparison and the scripts are in the session's
scratchpad, outside the repo.
