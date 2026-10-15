# 4.5-G2 — The demo: the hub

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **byte-identical**
(`phases/4.5/brief.md#demo-golden-rule`). Builds on 4.5-G1's screens.

## Scope

From `phases/4.5/brief.md#the-demo`: the hub (party, collection, souls and summoning, perks, the
spec switcher, New game) and Debug "Record boss kill", with their part of the tests and
verification. From `phases/4.5/brief.md#decided-not-built`:
`phases/4.5/brief.md#one-run-start-and-one-perk-predicate` and
`phases/4.5/brief.md#an-end-to-end-smoke-test`.

## Known

- The inactive-perk label reads `isFunctionalPerk` in `src/data`, never a copied list.
- `setPartySlot`'s swap semantics handle moves, swaps and benching: the UI adds no logic of its own.

## Done when

Every hub control is reachable, every refusal reason shows, and the click-through covers summoning,
reordering, perks, a spec switch that refunds them, and a first boss clear reached through the UI.
The app and the simulator start a game through one store action and read one perk predicate, and
the smoke test passes locally and in CI, with the deploy waiting on it.
