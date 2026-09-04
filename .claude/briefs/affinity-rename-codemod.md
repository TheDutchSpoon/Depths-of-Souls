# Code task — affinity rename (mechanical, golden-arithmetic-preserving)

Status: shipped. All ~92 occurrences renamed across the 23 files listed below (positional map,
cycle order preserved); `npm run test` (207/207, all goldens byte-identical), `lint`,
`format:check`, and `build` all pass.

**Context:** The design docs (`.claude/GAME_DESIGN.md` §5/§7, `.claude/CLAUDE.md`) now name the five
affinities **Vitality, Violence, Wit, Endurance, Instinct** (was Body/Spirit/Mind/Void/Primal). The
damage cycle is built (Phase 1), so the old names are live in code — this brings code in line with the
docs. It is a **pure rename**, not a behavior change.

## The map (positional — preserves cycle order)

| old      | new         | cycle position |
|----------|-------------|----------------|
| `body`   | `vitality`  | 1              |
| `spirit` | `violence`  | 2              |
| `mind`   | `wit`       | 3              |
| `void`   | `endurance` | 4              |
| `primal` | `instinct`  | 5              |

Old cycle `body > spirit > mind > void > primal > body` → new cycle
`vitality > violence > wit > endurance > instinct > vitality`. **Each old value maps to the new value
in the same cycle slot**, so every strong/weak/neutral relationship is identical.

## Why this is golden-safe (the invariant to verify)

Affinity strings are identifiers; only their **cycle relationships** feed the ×1.25/0.75/1.0 damage
term. Because the map is positional, every multiplier is unchanged, so **every golden's damage
numbers must remain byte-identical** — the *only* permitted diff in any golden fixture is the affinity
**label** (`affinity: 'body'` → `affinity: 'vitality'`). If any golden's computed damage/HP numbers
change, the rename was done wrong (a non-positional remap) — stop and fix the map, do not re-bless the
golden.

## Scope (verified at time of writing: ~92 occurrences across 23 files)

- `src/engine/types.ts` — the `Affinity` type union (the source of truth for the five values).
- `src/engine/affinity.ts` — cycle logic (rename values; keep ordering identical).
- `src/engine/__golden__/*.fixture.ts` — 15+ fixtures carrying `affinity: '...'` (incl.
  `golden-affinity-matchup.fixture.ts`, whose comment names the old cycle — update the comment too).
- `src/engine/__fixtures__/creatures.ts`, `*.test.ts` (affinity/damage/resolution/effective-stats/
  conditions), `src/app/demoFight.ts`.

Do a find/replace on the whole-word string literals only (`'body'`→`'vitality'`, etc.) plus the
`Affinity` type and any doc comments that spell the cycle. Grep for the old names afterward to confirm
zero remain: `grep -rn "'body'\|'spirit'\|'mind'\|'void'\|'primal'" src/`.

## Also new (design intent — not required by this rename)

Each affinity now **softly corresponds to a stat**: Vitality→Health, Violence→Attack, Wit→Intelligence,
Endurance→Defence, Instinct→Speed. This is a **flavor lean + a future trait-hook** ("scale off my
affinity's stat"), **never** a stat constraint and **not** used in the damage cycle. No code is required
for it now beyond the type rename; it becomes relevant only when a trait/perk is authored that reads an
affinity's mapped stat.

## Gates

Run all four (`test` / `lint` / `format:check` / `build`). The goldens are the real check here:
same numbers, relabeled affinities.
