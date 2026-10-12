# 4.5-B2 — every pass over the living creatures in turn order

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate, listed**: the order of
the firings within one multi-creature hook call, the Web rolls' draw assignment, and the fights
whose RNG draws move with either. No other change in an old golden. CI balance verdicts re-checked.

## Scope

`phases/4.5/brief.md#every-pass-over-the-living-creatures-goes-in-turn-order`: the five hooks fired
over every living creature, and the Web break-free roll, go in turn order, read live once per
pass.

## Known

- After 4.5-B every such hook call takes its creatures from the one `livingIdsOf`, and the Web
  roll (`rollWebBreakFree`, `engine/combat.ts`) sorts its own bearers with `compareBySideSlotId`.
  Both take one turn-order helper built on `buildTurnQueue`'s ordering, not a second copy of it.
- Read per call, the order costs an effective-Speed read per living creature on every damage event
  and action instance. The report gives the balance simulator's runtime before and after.
- Where every creature on a call has the same Speed and no turn-order status, the order is
  side → slot → id, as today. An old golden moves only where Speeds differ, a turn-order status
  applies, or a hand-built party's array isn't in slot order.

## Done when

Every multi-creature hook call and every Web cleanup orders its creatures by the live turn order,
through one helper. Hand-derived goldens
show a faster enemy reacting before a slower player creature on one call, an act-first or act-last
status moving a creature's place, and a response that changes Speed mid-call leaving that call's
order as it was; another shows two Webbed creatures whose turn order differs from side → slot →
id rolling in turn order. Two carriers of one `stacks: false` observer on opposite sides give the roll to
the faster one. Every changed old golden is attributed to order alone, and the CI balance verdicts
and round-cap draw rate are reported before and after.
