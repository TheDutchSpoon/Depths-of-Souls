# PR review r2 — 4.5-E: Spell clean-up and Thorn Volley

Branch `4.5-E`, commit `4287626` ("fix"), against `main` at `2bb9851` and round 1's `d932616`.
Reviews `report-r2.md`, the fixes from `handout-r1.md`.

**Verdict: fixes.** Five of the six items are fixed and true. Item 4's new first sentence is
false: it calls each spell fight "draw-free", and none of them is. The wording is mine
(`handout-r1.md` item 4 dictated it), the third comment error in a row that came from my hand-out
text rather than the agent. The fix is one phrase. A second cleanup rides along: the Disorient
edit left a 145-character comment line. Both are comment-only, so round 3 is again proved with
`comment-proof`. Hand-out: `handout-r2.md`.

## Hand-out r1, item by item

1. **Disorient** (`data/spells/glimmerdark.ts`): fixed, true. Instinct's spells are Stinger Swarm,
   Pounce (damage), Howling Instinct (stat modifier), Disorient (Web, biome 2) and Puppet String
   (Confusion, biome 3): Disorient is the only status-applying one before Puppet String.
2. **Blinding Flare**: fixed, true. The Violence single-target damage spells are exactly Thorn
   Lash 1.0, Blinding Flare 0.7 and Withering Bolt 0.45.
3. **Withering Bolt** (`rotcap-hollow.ts`): fixed, true; the rider is gone from the sentence.
   (Thorn Volley's 0.45 is `aoe`, a different key.)
4. **`SPELL_FIGHTS`** (`engine/__corpus__/corpus.ts`): the stale "never cast" is gone, but the
   new "draw-free" is false (real fix 1 below).
5. **`THORN_VOLLEY`** (`data/spells/overgrowth.ts`): fixed. The cited
   `content/overgrowth.md#spell-power-convention` says an area spell with no other effect deals
   about 50%, as the comment says.
6. **`record.md`**: fixed, matches the comments as built.

## Real fixes

1. **"draw-free coverage fight" is false** (`corpus.ts`, `SPELL_FIGHTS`' doc comment). Every one
   of the 13 `SPELL_FIGHTS` entries (and both `LOCK_SPELL_FIGHTS` entries) advances the combat
   RNG: the final `rng.position` differs from the seed in all 15. In Disorient's fight (entry 510)
   the draws change the log: reseeding it changes when Web expires (31 vs 34 `StatusExpired`), from
   Web's 10% break-free roll (`breakChancePercent`, `data/statuses.ts`). Its 100 casts and 100
   `StatusApplied` are the same at either seed. So what the fights guarantee is that the cast and
   its effects landing ride on no draw, which the comment's last sentence already says. Dropping
   "draw-free" makes the comment true. Hand-out item 1.

   It also corrects two phrases in `review-r1.md`, which I leave as written: the digest change when
   the spell-fight seeds move comes from Web's break-free roll in Disorient's fight, not
   "Confusion rolls"; and Silence's and Pacify's fights do draw, but their logs don't depend on the
   seed. Decision 1 there (no test pins the seeds) rested on the log being seed-independent, so it
   stands.

## Scope and labeling

2. **Disorient's comment has a 145-character line** (`glimmerdark.ts`). The edit kept the old line
   breaks, so "…by affinity (instinct vs wit). spellPower 0.85 + duration 3 both mirror Vine
   Snare's own numbers exactly" runs on one line. Prettier doesn't wrap comments, so no gate
   catches it. Re-wrap only, no word change. Hand-out item 2.

## Decide-points

None. Both items are comment edits with one right answer.

## Verified, and how

All in my own clone (`git clone` + worktrees for the branch, `main` and `d932616`), `npm ci` on
the branch and `main`, Node 22.22.0, lockfile Vitest 5.0.3.

- **Fix diff** (`git diff ccba530 4287626`): the four `src/` comments and `record.md`, nothing
  else. `src/` against `d932616` changes the same four files and no fixture, golden or digest row.
- **Gates on the branch:** `npm run test` (JSON reporter) 229 files, 1983 passed, 1 skipped,
  0 failed; `lint`, `format:check`, `build`, `npx tsc -b` clean; `docs:check -- citations` PASS
  (678 in 463 files), `-- comments` PASS (7448 comments, 1737 titles in 430 files), `-- budgets`
  12 files, none over (`CONVENTIONS.md` 29.0 of 29 KB).
- **`comment-proof`:** PASS against `d932616` and against `ccba530`, 4 changed files each.
- **Test count, file by file:** `main` 228 files, 1982 passed, 1 skipped; the only per-file
  difference is `golden-thorn-volley.test.ts` (+1). (`main` ran clean this time, no
  `balance-sim` timeout.)
- **Golden identity:** every `__golden__/*.fixture.ts` export serialised on both trees: `main` 144
  files and 1336 exports, the branch 145 and 1341. The differences are the new
  `golden-thorn-volley` (6 exports), the removed `CINDER_NOVA`, and four party exports
  (`golden-6v6-scripted` both parties, `golden-aoe-cast` and `golden-dot` `playerParty`), each
  equal once the spell objects' `id` and `name` are blanked. Every `expected*` export is
  deep-equal.
- **Corpus digest:** the fixture is unchanged since `d932616` and the digest test passes, so round
  1's attribution stands.
- **Draws in the spell fights** (throwaway test, removed): each Part C fight with seeds
  2001–2017 resolved at its seed and at seed + 99991; RNG position compared before and after,
  and event logs compared. Results as in real fix 1. Life Siphon's fight (524) draws nothing.
- **Mutations:** none to run. The fix changes no code token (`comment-proof`), and the hand-out
  asked for no new test.
- **Leftover sweep** over `src/` and the living docs (`.claude/` but `phases/` and `archive/`) for
  the three ids, names, const names, `core.ts`, "core spells", "affinity-generic", and the claims
  the fix corrects ("never cast", "no other status", "draw-free"): clean except the line real fix
  1 changes.
- **Mailbox:** step files, `record.md` and `evidence/` only; nothing to delete.

## Docs edited

None this round.
