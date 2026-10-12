# 4.5-B — on-death-observed

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate, listed**: the hook name in
`TriggerFired`, and the firing order on a death. No other change in an old golden.

## Scope

`phases/4.5/brief.md#on-death-observed`: `on-ally-death` and `on-enemy-death` become one
`on-death-observed` with an `ObservationFilter`, and the 8 triggers move over (7 in game data,
Grudge in the test fixtures). `on-death` and `on-kill` are untouched.

## Known

- The Rot Sovereign's two triggers (`data/traits/rotcap-hollow.ts`) become one `any` trigger: its
  golden changes only in hook name and order.
- The new hook's filter and order are the other two observation hooks', so the slice reuses their
  machinery rather than adding a third copy.

## Done when

No trait or engine path names the two old hooks, each relationship (`self`, `ally`, `enemy`, `any`)
has a hand-derived golden, and every changed old golden is attributed to the hook name or the order.
