# 4.5-A — Placeholders to fixtures, one Splashing lookup, the 3.5 demo retired

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **byte-identical** (every golden, store
test and the corpus digest unchanged). Small: Duncan may merge steps.

## Scope

- `phases/4.5/brief.md#placeholder-traits-move-to-test-fixtures`.
- `phases/4.5/brief.md#one-copy-of-splashings-adjacency-lookup`.
- Retire the 3.5 demo: `src/app/demoFight.ts` and its test are deleted (listed for Duncan), and
  `App.tsx` renders a stub (`phases/4.5/brief.md#assumptions`). `src/ui/CombatDemo.tsx` stays,
  unused, for 4.5-G1 to move its event text and beat grouping from.

## Known

- `demoFight.ts` is the only non-test user of five of the placeholder traits and of Venom Bolt and
  Cinder Nova; with it gone, the placeholders have no game-data user left.
- Comments name the placeholders as if they were game data: `data/specializations.ts` (Grudge),
  `data/statuses.ts` (Reeling), `engine/resolution.ts` and `engine/effect-types.ts` (Catastrophic
  Collapse). They are reworded to cite the fixture, or the rule.
- `engine/effect-types.ts` cites `ROADMAP.md#phase-45--run-loop-demo-interlude` for the Splashing
  dedupe; once deduped, that comment is rewritten.
- `CONVENTIONS.md#mechanism-goldens-vs-content-goldens` carries the `**Known bug:**` line this
  slice's PR review removes.

## Done when

The nine traits are out of `src/data` and `TRAIT_REGISTRY`, Splashing runs the `targeting.ts`
export, the live build shows the stub, and the byte-identical claim is proved on every golden and
the digest.
