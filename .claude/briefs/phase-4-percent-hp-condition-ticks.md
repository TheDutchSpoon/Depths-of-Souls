# Brief — Percentage-of-max-HP condition ticks (Regen, Poison, Burn)

Status: planned
Depends on: the cumulative-unlock + Glimmerdark-expansion slice merged (Afterglow/Regen live).
Do before: any biome whose balance leans on Regen or DoT sustain/pressure.

This is an **engine** slice (its own concern: how condition ticks size themselves), deliberately
kept separate from the spell-unlock work. It touches `engine/` — the coding agent implements; the
design agent reviews the implementation plan against the ASSUMPTION checklist below.

## Problem

All three condition ticks are **flat numbers per stack**: Regen heals `4 × stacks`/round, Poison
deals `3 × stacks`, Burn `5 × stacks`. As creature Health scales with level, those numbers go
insignificant — a level-20 creature with a few hundred HP barely notices them. The design owner
wants all three to stay meaningful at every level by scaling with **max HP, per stack**.

## Why not "stat mode" (rejected approach — do not implement)

The heal/deal-damage responses already have a stat-scaled mode (`scalingStat` × `spellPower`).
It is the wrong tool here:

- It multiplies by **×1**, not by stacks.
- For **damage**, stat mode routes through the full damage formula (`dealDamageCore`) with the
  response's `context.self` as the attacker. For a DoT, `context.self` is the **poisoned creature
  itself**. So the victim's own Defence would mitigate its own poison, and the victim's own
  damage-dealt buffs (Glow, conditional bonuses, cross-stat, armor penetration) would *amplify*
  its own poison; affinity would be computed self-vs-self. Flat DoTs deliberately bypass all of
  this today, and that must stay true.

An earlier draft of this brief proposed flipping stat mode's default count to ×stacks ("Option
A"). That is **superseded** by the approach below and must not be implemented: stat mode keeps its
×1 default, untouched.

## Design (owner-decided)

**One primitive for all three: flat mode, with the per-stack amount derived from a stat.**

Flat mode already (a) multiplies by stacks and (b) for damage, bypasses the formula entirely. The
only new thing is *where the per-stack number comes from*: instead of a literal, it can be a
fraction of the **bearer's** effective stat.

- Flat-mode amount fields (`deal-damage.flatAmount`, `heal.amountPerStack`) accept either a
  number (today's behavior, unchanged) or a stat-derived amount, e.g.
  `{ ofStat: 'health', fraction: 0.03 }`. (Field/shape name is the coding agent's call — see
  checklist.)
- The stat is read from the **bearer** (`context.self`): for Regen that is the creature being
  healed, for Poison/Burn it is the creature taking the damage — i.e. "% of the victim's own max
  HP", the standard DoT reading. `getEffectiveStat(bearer, 'health')` is effective max HP.
- **Tick amount = `floor(effectiveStat × fraction × stacks)`** — floored **once**, at the end, not
  per stack. Damage then goes through the existing `applyFlatDamage` (keeps its minimum of 1);
  heals through the existing `applyHeal` (clamped to effective max HP, no overheal). Integer-HP
  invariant holds; fully deterministic.
- `magnitudeSource`, when set, still replaces the stack count exactly as it does in flat mode
  today.

### Numbers (owner-approved placeholders; balance tunable later)

| Status | Today | New | Cap | Max per round |
|---|---|---|---|---|
| Regen | 4 flat/stack | **5% of bearer max HP/stack** | 3 | 15% |
| Poison | 3 flat/stack | **3% of bearer max HP/stack** | 5 | 15% |
| Burn | 5 flat/stack | **5% of bearer max HP/stack** | 3 | 15% |

Caps unchanged. Poison keeps its identity (slow build, 5 stacks); Burn keeps its (hits hard fast,
3 stacks); both still top out at the same ceiling. Balance note for later: a fully stacked DoT now
kills anything in roughly 7 rounds regardless of level — that is the intent, but watch it.

## ASSUMPTION checklist (review before coding)

1. **[DECIDED]** Primitive: flat mode with a stat-derived per-stack amount, for both `heal` and
   `deal-damage`. Stat mode is **not** changed (its ×1 default stays). The superseded "Option A"
   is not implemented.
2. **Shape/naming** of the stat-derived amount — e.g. a union on the existing fields
   (`flatAmount: number | { ofStat, fraction }`) vs. separate fields. Coding agent proposes;
   constraint: a plain number must keep meaning exactly what it means today, and setting more than
   one magnitude mode must still throw the existing resolver-invariant error.
3. **Stat source** = the bearer (`context.self`). Not the applier; no snapshot of the applier's
   stats at application time.
4. **Rounding** = floor once over `stat × fraction × stacks`. DoTs keep `applyFlatDamage`'s
   minimum of 1 (so at very low max HP a percentage DoT still ticks for 1).
5. **Numbers** = Regen 5%/cap 3, Poison 3%/cap 5, Burn 5%/cap 3 (owner-approved placeholders).
6. **Scope** = only these three statuses convert. No other content changes.

## Docs

- `CONVENTIONS.md` — condition-tick vocabulary: flat-mode amounts may be a literal or a
  fraction of the bearer's stat, floored once, still ×stacks, still formula-bypassing for damage.
  Record explicitly that stat (`scalingStat`) mode is **not** used for DoTs because it would run
  the victim through its own damage formula.
- Status reference (wherever Regen/Poison/Burn are described, e.g. GAME_DESIGN's status section
  and `statuses.ts` doc comments) — replace the flat numbers with the percentage rules above.

## Tests

- **`golden-dot` — deliberate change, must be hand-recomputed.** It currently has TARGET at 20
  max HP; under 3% the tick becomes `floor(20 × 0.03) = 0 → min 1`, the target no longer dies on
  the R3 tick, and the golden loses the lifecycle it exists to cover (StatusExpired on the killing
  tick + win checked after the sweep). **Preserve that coverage** by changing only the fixture's
  inputs: e.g. TARGET `health: 100, currentHp: 20` (`makeCreature` supports `currentHp`). Cast
  damage doesn't read HP, so it stays 11 (20 → 9), and each tick = `floor(100 × 0.03 × 1) = 3` —
  9 → 6 → 3 → 0 on R3, identical event trace. Show this arithmetic in the fixture's comment. If
  any event carries max HP and does shift, recompute it by hand, don't paste from a run.
- New focused unit tests, hand-derived with arithmetic in comments: stat-derived heal (1 stack,
  cap stacks, max-HP clamp); stat-derived DoT (1 stack, cap stacks, min-1 floor, **and that the
  victim's Defence and damage-dealt buffs do NOT change the tick** — the reason this primitive
  exists); floor-once vs per-stack (pick a case where they differ, e.g. max HP 30 × 0.05 × 3:
  floor once = 4, per-stack floor would be 3); literal flat amounts unchanged.
- Existing tests that use a local `TEST_REGEN` / literal flat amounts (`resolution.test.ts`)
  exercise the literal-number path and should stay byte-identical. `effects.test.ts` /
  `conditions.test.ts` reference Poison only by `statusId` for has-status/count checks — confirm
  they don't move.
- **Prove byte-identical** for everything else: no other golden moves; no other test is edited.
- `app/demoFight.ts` output shifts (ticks are bigger) — expected, not a golden.
