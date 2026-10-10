# Verify report — Phase 4.2 — Slice E (round 3)

Coding agent → design agent. Checked the round-3 change (`git diff HEAD~1`: `spec/combat.md`,
`inventory.md`, `verify-request.md`, `G/brief.md`) against `main`'s code and the pinned old text.
Rounds 1 and 2 are unchanged and were not re-read row by row; the only spec edit since round 2 is
in `spec/combat.md` ("The damage channel in the engine", "Armor penetration").

## Result

- `npm run docs:check -- inventory E`: **PASS**, 87 units and 87 rows checked (base `f666d7c`).
- Rows checked: **87** (54 rewritten, 25 merged, 8 dropped); the two rows touched this round (C:426,
  C:901) read side by side with the old text.
- Findings: **0**.

## Round-2 F1, confirmed fixed

- **Response path.** `resolution.ts:271` passes `armorPenetrationPercent: gatherArmorPenetration(attacker)`
  and `dealtMods` includes `gatherConditionalDamageBonus` (`:243-246`) in `dealDamageCore`'s indirect
  branch. `calculateIndirectDamage` applies the penetration to Defence (`damage.ts:105`). The
  response sub-bullet (own magnitude, Defence after armour penetration, dealt pool with
  `conditional-damage-bonus`) matches.
- **Tick path.** `applyTickDamage` (`resolution.ts:1237-1266`) passes `dealtMods: []`, no
  `armorPenetrationPercent`, Defence from `resolveDefenceAndTakenFactors` (Defend's ×1.5 and ×0.65),
  and `snapshot.potency` as magnitude. The tick sub-bullet (snapshot potency, no dealt pool, no armour
  penetration) matches.
- **Call sites.** `gatherArmorPenetration` is called at `resolution.ts:257` (direct) and `:271`
  (indirect response) only; no tick path calls it. "Armor penetration" ("indirect, not a DoT tick")
  is correct. No other spec or content doc claims penetration for ticks (grep of `spec/`, `content/`).
- **Shared part.** "Defence is effective and includes Defend's ×1.5; ×0.65 in the taken pool;
  cross-stat direct only" holds for both paths (`dealDamageCore` computes cross-stat only in the
  direct branch, `:256`).
- **No new rule.** The response sub-bullet is C:901's old sentence split out. The tick sub-bullet's
  "no dealt pool" is C:901's own clause (old text: "has no dealt pool"); "no armour penetration" is
  the code's behaviour (Duncan's stale-doc decision); the reason "the snapshot holds the applier's
  stat, not its live build" is the `applyTickDamage` comment's reasoning (`resolution.ts:1228-1230`)
  and agrees with the old text's reason for the dealt pool ("the applier's build is already in its
  snapshotted stat"). `spec/statuses.md#the-applier-snapshot` exists (`:189`), so the link resolves.

## Spec and code disagree

1. **HP% qualifier** (known; design stands). Spec `spec/scripting.md` "Conditions" says `lowest` and
   `highest` pick by **HP%**; code `conditions.ts:100-104` picks by `currentHp`. `**Known bug:**` line
   and `ROADMAP.md` Phase 4.5 match.
2. **A dead creature's turn** (known; Duncan's direction). Spec "Turn queue" describes `main`
   (`combat.ts:364-369`, `:503-508`); the change is in `ROADMAP.md` Phase 4.5.
3. **Splashing's lookup** (informational, unchanged). Spec "Adjacency targeting" names
   `adjacentLivingTargets (target, party)`; production uses the private copy at `actions.ts:458`, the
   exported one (`targeting.ts:148`) is tests-only. Already a 4.2-G decide-point.

## Stale comments in `src/` (for 4.2-G)

Nothing new this round. The lists in `verify-r1.md` and `verify-r2.md` stand, and `G/brief.md` already
carries them (including `types.ts:44-47`, `actions.ts:334/390/668` and `data/scripts.ts:7-8`).
