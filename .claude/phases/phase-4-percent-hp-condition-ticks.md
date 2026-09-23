# Percentage-of-max-HP condition ticks

Status: **done.**

An engine slice per the brief (`.claude/briefs/phase-4-percent-hp-condition-ticks.md`): Regen,
Poison and Burn no longer tick for a flat number — each ticks for a percentage of the *bearer's*
own effective max HP per stack, so they stay meaningful as Health scales with level instead of
going insignificant.

## What was built

- **`StatPercent`** (`engine/effect-types.ts`) — `{ ofStat: Stat; percent: number }`, `percent` a
  positive integer. New alternative mode on the existing flat-mode fields:
  `deal-damage.flatAmount: number | StatPercent`, `heal.amountPerStack: number | StatPercent`. A
  plain number is byte-identical to before; the union is purely additive. Deliberately **not**
  `scalingStat` mode — that would route a DoT's victim through its own damage formula as the
  *attacker* (own Defence mitigating its own poison, own damage-dealt buffs amplifying it); flat
  mode's formula-bypass is preserved exactly, only the per-stack number's source changes.
- **`resolveFlatTotal(bearer, amount, count)`** (`engine/resolution.ts`, new local helper) — the
  single place both call sites (`deal-damage` flat branch, `heal` flat branch) resolve a
  flat-mode magnitude, replacing the old inline `response.flatAmount * flatCount` /
  `response.amountPerStack * flatCount`. A plain number multiplies through unchanged. A
  `StatPercent` computes `(Math.floor(getEffectiveStat(bearer, ofStat)) * percent * count) / 100`
  — the stat is read **floored** (the integer value the game actually uses) and `percent`/`count`
  are multiplied in **before** dividing by 100, so the result is exact in floating point; throws a
  resolver-invariant error if `percent` isn't a positive integer. The existing single floor
  downstream (`applyFlatDamage`'s `Math.max(1, Math.floor(...))`, `applyHeal`'s
  `Math.floor(...)` clamped to effective max HP) is still the only floor — never per-stack.
  `magnitudeSource`'s existing replacement of the stack count is untouched (`count` is computed
  exactly as before; `resolveFlatTotal` only changes where the per-stack rate comes from).
  Integer-percent, not a float fraction, specifically because `stat × 0.03` etc. can land just
  below an integer in IEEE-754 double precision and floor one too low (e.g. `180 × 0.03 × 5 =
  26.999999999999996`); multiplying integers before dividing by 100 is exact.
- **`data/statuses.ts`** — `POISON.flatAmount` → `{ ofStat: 'health', percent: 3 }` (cap 5),
  `BURN.flatAmount` → `{ ofStat: 'health', percent: 5 }` (cap 3), `REGEN.amountPerStack` →
  `{ ofStat: 'health', percent: 5 }` (cap 3). Caps unchanged; doc comments updated.

## Docs synced

- `CONVENTIONS.md` — new "Flat-mode stat-derived magnitude" bullet (Response vocabulary section)
  spelling out the `StatPercent` shape, the floor/integer-arithmetic composition, and explicitly
  recording why `scalingStat` is not used for DoTs. Cross-referenced from the existing DoT bullet.
- `GAME_DESIGN.md` — one sentence added to the status-effects section noting Regen/Poison/Burn
  now tick as a percentage of the bearer's max HP rather than a flat number (the surrounding text
  had no literal numbers to replace — it was already conceptual).
- `.claude/content/glimmerdark.md` — Afterglow's row updated from "heals a further 4 HP" to "5%
  of the target's own effective max HP per stack."

## Golden fixture: `golden-dot` (the one deliberate change)

TARGET's max HP is now 100 (was 20), so Poison's 3%-per-stack tick still lands as an integer ≥1
(at the old 20 max HP, 3% floors to 0, min-1'd to 1 — nowhere near enough to preserve the
3-round kill this golden exists to exercise). The fixture does **not** set `currentHp` on
TARGET's raw creature object — `createCombat` unconditionally resets every creature's `currentHp`
to its effective max at fight-start (GAME_DESIGN's own "currentHp inits to effective max Health
at fight-start"), so a `currentHp` override on the input creature is silently discarded and would
have misled the next reader. Instead the fixture exports `TARGET` and `TARGET_STARTING_HP = 20`,
and `golden-dot.test.ts` applies the wound via `updateCreature` **after** `createCombat` — the
same idiom every other "wounded creature" test in this codebase already uses
(`resolution.test.ts`'s heal-scaling/Necromoss tests).

With that, the arithmetic is unchanged from the old flat-3 literal: cast damage doesn't read HP
(stays 11: 20 → 9), and each tick is `floor(floor(100) × 3 × 1 / 100) = 3` — 9 → 6 → 3 → 0 on the
R3 tick, identical event trace (`expectedEvents` in the fixture was not touched; only the
fixture's own inputs and comment were).

## New tests (`resolution.test.ts`, new describe block)

All hand-derived with arithmetic in comments, calling `executeResponse` directly:

- Stat-derived heal, 1 stack (non-clamping) and at cap stacks (clamped to effective max HP,
  `HealApplied.amount` is the clamped delta, not the requested total).
- Stat-derived DoT: unaffected by the victim's own (huge) Defence; at cap stacks; the existing
  minimum-of-1 floor at very low max HP.
- Stat-derived DoT: the victim's own damage-dealt buff (a real `damage-modifier` status,
  `direction: 'dealt'`) does not amplify its own tick, and its own taken-damage multiplier
  (`direction: 'taken'`, Vulnerable-shaped) does not change its own tick either — flat mode never
  reads `dealtMods`/`takenFactors`, which is the entire reason this primitive exists instead of
  `scalingStat`.
- Floor-once vs. per-stack: max HP 30, `percent: 5`, 3 stacks → 4 (floor once), not 3 (a
  per-stack-floor bug would give).
- The float trap: max HP 180, `percent: 3`, 5 stacks → exactly 27; verified in-test that the
  float-fraction equivalent (`180 * 0.03 * 5`) evaluates to `26.999999999999996` in JS and would
  floor to 26.
- A non-integer or non-positive `percent` throws the resolver-invariant error.
- A literal-number `flatAmount` still behaves exactly as before (regression guard for the union).

No other test file needed edits: `resolution.test.ts`'s pre-existing `TEST_DOT`/`TEST_REGEN`
suites author their own literal-number `EffectResponse` objects inline (never import
`POISON`/`BURN`/`REGEN`), and `effects.test.ts`/`conditions.test.ts`/`data/statuses.test.ts`
reference Poison/Burn/Regen only by `statusId`/shape (`toMatchObject`), never by numeric value —
confirmed unaffected, byte-identical.

## Plan-review corrections (folded in before coding, per the design agent's review)

- **Integer percent, not a float fraction** — the design agent's review caught that a float
  fraction (`stat × 0.03`) is not exact in IEEE-754 and would floor some inputs one too low (31
  cases for Poison between 1–5000 max HP); the brief was updated to `StatPercent { ofStat,
  percent }` with `percent` a positive integer, count multiplied in before the `/100` division.
- **`.claude/content/glimmerdark.md`** was flagged as a stale living doc (Afterglow's "4 HP")
  and added to the files-touched list; phase records and shipped briefs mentioning the old
  numbers are left as immutable archives, per instruction.

## Verification

All four gates green: `npm run test` — 90 files / 566 tests passed; `npm run lint` — clean;
`npm run format:check` — clean; `npm run build` — `tsc -b && vite build` succeeded.

## Next

No specific follow-on named by the brief. `app/demoFight.ts` output shifts (ticks are bigger) —
expected, not a golden.
