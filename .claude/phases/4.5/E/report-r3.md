# Report r3 — 4.5-E: Spell clean-up and Thorn Volley

Hand-out r2, two comment-only edits. No code token, test, golden, digest row or record line changed.

## Items

### 1. `src/engine/__corpus__/corpus.ts`, `SPELL_FIGHTS` doc comment

"draw-free" removed; whole comment re-wrapped (no line past 100 characters, none short mid-paragraph).
New text:

```
/** Each listed spell gets a coverage fight of its own, so it stays covered whatever Parts A and B
 * roll. The stock `always-cast` script casts gemSlot 0, so the spell sits in slot 0 of an
 * affinity-matched caster (equip-gating) with no innate spell ahead of it (the Sorcerer starter's
 * Arcane Bolt would take slot 0). The caster fights beside the Brute and Shieldbarer starters
 * against `WALL_ENEMY`, which neither attacks nor controls: the caster always gets its turn, and
 * every round it casts again until the fight ends. Coverage therefore rides on no random draw at
 * all, so a later change to draw order cannot drop it. */
```

### 2. `src/data/spells/glimmerdark.ts`, Disorient doc comment

Re-wrapped only, no word changes; longest line is 100 characters.

```
/**
 * Disorient: applies act-last to an enemy, reusing the turn-order primitive. That primitive's
 * act-last pole is already the `web` StatusDef (a `turn-order` effect, `position: 'last'`,
 * data/statuses.ts) -- per `spec/statuses.md#a-status-is-a-timed-effect` and
 * `spec/run.md#the-onboarding-ramp` (a spell may apply any status, another species' signature
 * status included; already precedented: Overgrowth's own Vine Snare applies `web` too), Disorient
 * reuses that SAME statusId rather than authoring a new near-identical StatusDef, which would just
 * be Web-with-a-new-name. Authored as a `deal-damage` effect + an `apply-status` effect, same shape
 * as Vine Snare, but on Instinct (Vine Snare is Wit) -- it is Instinct's only status-applying spell
 * before the Rotcap Hollow's Puppet String, so it fills a real gap rather than re-skinning Vine
 * Snare; distinct from Vine Snare under the dedup guard by affinity (instinct vs wit). spellPower
 * 0.85 + duration 3 both mirror Vine Snare's own numbers exactly (single-target + upside band,
 * Web's own `defaultDuration`) -- deliberate consistency, not an oversight. */
```

## Gates

- `npm run test`: 229 files passed, 1983 passed, 1 skipped (1984), same totals as `4287626`.
- `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b`: clean.
- `docs:check -- citations`: PASS (678 citations in 463 files).
- `docs:check -- comments`: PASS (7448 comments, 1737 titles, 430 files).
- `docs:check -- comment-proof 4287626` on the finished tree: PASS, 2 changed files:
  `src/data/spells/glimmerdark.ts`, `src/engine/__corpus__/corpus.ts`.
- Corpus digest: not regenerated, unchanged. Golden policy: no golden touched.
- Mutation tests: none; no mechanism changed.

## Spec questions
None.

## Content changes
None.

## To delete
None.
