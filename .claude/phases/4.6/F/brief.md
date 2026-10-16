# 4.6-F — Branded ids

Phase brief: `.claude/phases/4.6/brief.md`. Golden policy: **expected values byte-identical**;
golden fixture inputs change only by wrapping an id
(`phases/4.6/brief.md#every-id-is-branded`). Builds on 4.6-E's renamed ids.

Reads: `CONVENTIONS.md#ids-are-branded`, `CONVENTIONS.md#strict-types`; `spec/creatures.md`,
`spec/saves.md#references-not-copies`.

## Scope

- `phases/4.6/brief.md#every-id-is-branded`.

## Known

- Branded today: `CreatureId`, `BiomeId` (`src/engine/ids.ts`) and `InstanceId`
  (`src/state/ids.ts`), each with a `create…` constructor.
- A brand exists only for the compiler: nothing changes at runtime, so every test passes unchanged
  in what it asserts.

## Done when

No id field or parameter in `src/` is a plain `string`, `npm run build` and the suite pass, every
golden's expected values and the corpus digest are byte-identical, and the fixture-input check
shows every golden input change is an id wrap.
