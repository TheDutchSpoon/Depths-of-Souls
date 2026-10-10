# Verify report — Phase 4.2 — Slice D (round 1)

Coding agent → design agent. Checked `spec/effects.md`, `spec/responses.md`, `spec/statuses.md`
(and the moved text in `spec/progression.md`, `spec/store.md`, the three content docs and ROADMAP)
against the old text (`git show b3ac8dd:.claude/spec/<file>.md`, which is the 4.2-A move of
`892f1b8`) and against `main`'s `src/`.

## Result

- `npm run docs:check -- inventory D`: **PASS**, 172 units and 172 rows checked (base
  `b3ac8dd44c24607ee85ac49599fe0a593b886dd6`). (The slice id is `D`; `4.2-d` is rejected by the
  script: "slice must be one of B, C, D, E, F".)
- Rows checked: **172 of 172** (all fates: 77 rewritten, 70 merged, 3 moved, 22 dropped).
- Findings: **8** (2 stale-doc facts, 1 placement that shifts a meaning, 3 sentences that say more
  than the code does, 1 partly-duplicate drop, 1 circular pointer). No rule was lost. None looks
  like a code bug. All 8 are small; none blocks the merge on its own, but the design
  agent should fix or accept each.
- Everything the request listed to "check hardest" was read against the code and holds, except
  where a finding below says otherwise (see "Confirmed" at the end).

## Findings

**1. `spec/effects.md` "acted-before-target" (C:583): the peek returns no target for three random
selectors, not one.** The text says `peekTargetSelector` "matches `resolveTargetSelector` for every
selector except `random-enemy`, which returns no target rather than drawing RNG … so a rule targeted
at `random-enemy` never satisfies the condition". `target-selectors.ts:171-182` returns `null` for
`random-enemy`, `random-ally` **and** `random`. Evidence: `src/engine/target-selectors.ts:176-181`.
The old unit (C:583) had the same one-selector wording, so this is inherited, but the new text is
the spec now. Stale doc (the other two random kinds came later); a rule targeted at any of the three
never satisfies the condition.

**2. `spec/responses.md` "Response targets" (C:678 / C:774): the list is missing `all-allies-of-species`.**
The text lists the targets a response names: "`self`, `triggering-source`, `triggering-ally`,
`all-enemies`, `all-allies`, a full `TargetSelector`, `random-dead-ally`,
`random-ally-without-status`, `lowest-hp-injured-other-ally` and, inside a spell, `cast-target`".
`ResponseTarget` has an eleventh variant, `{ kind: 'all-allies-of-species' }`
(`src/engine/effect-types.ts:127`, resolved at `src/engine/resolution.ts:697-702`: `livingAlliesOf`
filtered to the firing creature's `speciesId`, empty for a bearer without one), used by the Swarmhive
Queen (`src/data/traits/overgrowth.ts:129`). The old docs never listed it either (grep of both pinned
files: no hit), so no unit carried it, but the rule "a new ResponseTarget needs a review" now sits
beside an incomplete list. Stale doc.

**3. `spec/statuses.md` "Turn-end cleanup" (C:1658): the bullet puts "ending action states" in the
wrong cleanup.** Under the heading "Turn-end cleanup" it says "Cleanup is bookkeeping only: counting
down, expiring, ending action states and the Web roll." Defending and Provoking end in the
**turn-start** cleanup (`src/engine/combat.ts:407-423`, `clearOwnTransientStatus` right after the
turn-start hooks); the turn-end cleanup is only the countdown and the Web roll
(`combat.ts:500-506`; `spec/combat.md` "Turn structure" diagram agrees). C:1658 said "cleanup"
without a qualifier, so the sentence was true of both cleanups; filed under the turn-end heading it
reads as a claim about the turn-end one only. Meaning changed by placement.

**4. `spec/responses.md` "Magnitude modes" (C:327): "A heal spell's default, `'cast'`, is
remap-aware Intelligence" says there is a default.** A `heal` has none: `executeResponse`
(`src/engine/resolution.ts:1031-1053`) picks `offStat`, then `scalingStat`, else `flatAmount ?? 0`,
and `validateSpellEffects` (`src/engine/effect-types.ts:1133-1136, 1143-1147`) requires a spell's
heal to name `offStat: 'cast'` or a `scalingStat`. So `'cast'` is what a heal spell must be authored
with, not a default (`deal-damage` does default, to `offStat: 'attack'`, `resolution.ts:947`). The
old text ("so a heal spell keeps its remap-aware Intelligence default") had the same loose word.

**5. `spec/effects.md` "stacks: false" (C:755): "that exact effect" is keyed by the trait id.** The
text says "at most **one** instance of that exact effect gets its chance per firing". `fireHook`
(`src/engine/resolution.ts:489, 606-609`) keeps a per-call set of `sourceTraitId`s, and the field's
own comment says "(matched by `sourceTraitId`)" (`effect-types.ts:726`). Two `stacks: false`
triggers on one trait and one hook would share one claim; today only Resonant Overtone declares the
flag (`src/data/traits/glimmerdark.ts:234`), so nothing differs. The request asked for this
sentence to be reported if it says more than the code does: it does, by a hair ("trait" for
"effect").

**6. `spec/responses.md` "Flat mode" (C:380): the "Composition" line floors a value that is not
floored for flat damage on another creature.** "Composition: `floor(floor(stat) × percent × count /
100)`" is exact for a cost (`calculateCost`, `damage.ts:128-134`), a heal (`applyHeal`,
`resolution.ts:1312`) and a snapshot, and the closing "The floor happens once, in the damage or heal
itself" is right. But for flat damage on **another** creature `resolveFlatTotal` returns the
unfloored quotient (`resolution.ts:804-818`, its comment says so), which then goes through affinity,
the pools and `− 0.2 × Defence` and is floored once at the end (`damage.ts:112-117`). The two
sentences together are consistent; read alone, the composition line is not what is floored in that
case. No shipped content uses a `StatPercent` on another creature (the Wick is self-targeted), so
this is wording only. Reported because the request asked about this sentence.

**7. Row C:1823 (`dropped`, "duplicate of CONVENTIONS.md 'Where each number lives'") is only partly
a duplicate.** The old unit lists "depth curves (the master difficulty lever), XP/growth, drop
rates, craft/upgrade costs, status magnitudes — all tunable without engine edits". CONVENTIONS
"Where each number lives" (`.claude/CONVENTIONS.md:42-56`) covers the level curve, XP, currency
drops and summon cost; it does not name craft or upgrade costs, and "the master difficulty lever"
survives only in `OPEN_QUESTIONS.md:8`. The Reason already says status magnitudes are content
(`src/data/statuses.ts`). Craft and upgrade costs have no named home in the spec after this drop.
Design agent's call whether that matters before Phase 8.

**8. ROADMAP Phase 7 "Effective stats on screen" (G:531, `moved`): the parenthetical points at a
section that no longer holds the fallback.** The entry ends "an additive-within-a-type,
multiplicative-across-types hybrid is the documented fallback (`spec/effects.md` "Category decides
player-facing treatment")". That section (`spec/effects.md:31-53`) states the multiplicative fold but
no longer mentions the hybrid; the fallback is now documented only in the ROADMAP entry itself.
Content is complete (nothing lost); the pointer is circular.

## Spec and code disagree

Cases 1 and 2 above are the only places where the spec's sentence and `main` differ on a fact; both
read as stale docs (the code is the intended behaviour), neither as a bug.

- **Case 1.** Spec (`spec/effects.md:329-331`): "That matches `resolveTargetSelector` for every
  selector except `random-enemy`, which returns no target rather than drawing RNG". Code
  (`src/engine/target-selectors.ts:176-181`): `selector.kind === 'random-enemy' || selector.kind ===
  'random-ally' || selector.kind === 'random'` → `return null`.
- **Case 2.** Spec (`spec/responses.md:48-51`): the list of response targets without
  `all-allies-of-species`. Code (`src/engine/effect-types.ts:127`): `| { readonly kind:
  'all-allies-of-species' }`.

Findings 4 to 6 are the same kind in miniature (a word that says more than the code does) and are
listed above with both sides quoted.

## Stale comments in `src/` (for 4.2-G)

Already listed in the verify request and G's brief: `engine/effect-types.ts:670-673`,
`engine/effects.ts:434`, `engine/effects.ts:501-503`, the Poison comment in `data/statuses.ts`.
Found on the way, new:

- `engine/types.ts:130-135` (`Creature.speciesId`): says `living-allies-of-species` "is therefore
  inert (always 0) until a later slice (H1+) threads a real speciesId through
  `materializeCreature`", and "deliberately NOT wired into generation.ts". It is threaded (generation
  and `materializeCreature` set it, `generation.ts:58-68, 162, 186`).
- `engine/effect-types.ts:121-127` (`all-allies-of-species`): "Inert (empty) for a bearer with no
  speciesId set, same dormant-until-wired precedent as the count kind". Only a creature without a
  `speciesId` is empty; nothing is dormant.
- `engine/effect-types.ts:277` (`remove-status`): "The final response verb (per CONVENTIONS' 'hold
  the line')". The rule is "no side doors" (`spec/responses.md` "No side doors"); the verb count is
  not a ceiling.
- `engine/effect-types.ts:327-338` (note above `StatModifierDef`): cites "species-locked.md's
  Swarmhive Striker"; the file is deleted (content is in `content/overgrowth.md`).
- `data/statuses.ts` (the `GRANT_ACT_FIRST` and `SPORE` doc comments, around lines 170 and 195) and
  `data/species/*.ts`, `data/spells/*.ts`, `data/traits/*` cite `species-locked.md` (deleted in
  4.2-B): `grep -rn species-locked src` lists about 30 sites for 4.2-G's citation pass.

## Confirmed (read against the code, no finding)

- Constants: `MAX_TRIGGER_CASCADE_DEPTH = 500`, `MAX_REVIVES_PER_CREATURE = 10`
  (`engine/config.ts:33, 38`); 17 hooks (`effect-types.ts:27-44`); Web `breakChancePercent: 10`,
  `defaultDuration: 3` (`data/statuses.ts:127-132`).
- Status content: Weaken −0.2 dealt, 3 turns; Vulnerability ×1.5 taken, 3; Regen 10% of Health, 3,
  `polarity: 'buff'` (`data/statuses.ts:63-116`). Appliers: Stifling Weight
  (`data/spells/overgrowth.ts:287-300`, no duration, inherits 3), Concussive Blows
  (`data/specializations.ts:315-328`, inherits 3), Blinding Flare (`data/spells/glimmerdark.ts:113`,
  3), Afterglow (`data/spells/glimmerdark.ts:140`, heal plus Regen 3).
- Applier snapshot: tick formula (`damage.ts:104-121`, `resolution.ts:1237-1266`); dealer rule
  (`resolution.ts:783-790, 359-361`); no source for the bearer's hooks on a tick (`resolution.ts:361,
  390`); pass-on (`resolution.ts:1098-1099`); strictly-greater replaces (`resolution.ts:1382-1386`).
- Timing: `turnClock` bumps after the turn-start grants for every dequeued turn
  (`combat.ts:440`); the Web roll runs after the countdown over living bearers in side, slot, id
  order and skips born Webs (`combat.ts:202-235, 503-506`); both skip reads and the `TurnSkipped`
  `effectId` fallback (`combat.ts:403-405, 446-452`, `effects.ts:482-491`).
- Effect order (`effects.ts:44-69`, `resolution.ts:1433-1445`, `1392-1399`): innate traits, side
  effects, then statuses and stat-modifiers in the order gained.
- `deal-damage` default `offStat: 'attack'` (`resolution.ts:947`); the one formula with the
  multiplier `count ?? castPowerFraction ?? 1` (`resolution.ts:874, 922, 948, 1008, 1038, 1046`).
- `setPerkLevel` reasons `no-spec`, `perk-not-in-spec`, `invalid-level`, `over-budget`
  (`state/store.ts:218, 582-596`); the nine inert perk ids (`data/specializations.test.ts:55-65`).
- The seven stale-doc fixes (a) to (g) in "Decisions Duncan made" each match the code (stat-modifiers
  appended to `activeEffects`; `speciesId` set; separate Defend and Provoke executors; `HookContext`
  without `amount`; self-source only from a cost; `no-spec`; single-instance statuses with no cap).
  None looks like a bug.
- `on-death-observed` (ROADMAP Phase 4.5): the eight triggers on the two old hooks are real (one in
  `data/traits/core.ts`, one in `glimmerdark.ts`, six in `rotcap-hollow.ts`), and today's order (allies
  all fire before enemies) is `resolution.ts:417-422`.
- The `dropped` rows' homes exist and hold the rule: C:627 and C:1691 (each status is in a content
  doc's "Statuses"; Poison and Burn under rotcap-hollow "Damage over time"), C:789 (rotcap-hollow
  "Sporch Cinderlord"), C:1513 (trait entries in the content docs), the DoT numbers in C:349 and
  G:718 (rotcap-hollow "Damage over time", glimmerdark "Regen"), the Unicorn's 20% in C:416
  (overgrowth "Intro: Unicorn Lightbearer"), the Necromoss examples in C:483 (rotcap-hollow entries),
  G:761 (`spec/combat.md` "Turn structure"), G:645 (creatures "Trait and gem slots", "Fusion").
- The large merges (C:1358+G:486; C:1383+G:519+G:620; C:1428+G:586/595/601; C:1535-1547+G:541-559;
  C:1560/1580/1595/1603+G:637-675; C:1611/1618+G:767-785; C:493+C:782): read side by side, no rule
  lost or changed beyond findings 3 and 6.
- No provenance markers ("until", "(4.1", "ASSUMPTION", "supersedes", "decided") remain in the three
  files; every `spec/x.md "Label"` link to a D, creatures or progression heading resolves. The
  `spec/combat.md` labels do not all resolve yet (4.2-E, already in its brief).
- Reverse direction (no sentence without a unit): none found beyond the two sentences the request
  named, and the stale-doc fixes Duncan approved.
