# 4.5-G2 — The demo: the hub

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **byte-identical**
(`phases/4.5/brief.md#demo-golden-rule`). Builds on 4.5-G1's screens.

## Scope

From `phases/4.5/brief.md#the-demo`: the hub (party, collection, souls and summoning, perks, the
spec switcher, New game) and Debug "Record boss kill", with their part of the tests and
verification.

## Known

- The inactive-perk label is derived from `resolvePerkEffects`, never from a copied list.
- `setPartySlot`'s swap semantics handle moves, swaps and benching: the UI adds no logic of its own.

## Done when

Every hub control is reachable, every refusal reason shows, and the click-through covers summoning,
reordering, perks and a spec switch that refunds them.
