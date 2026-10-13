# 4.5-C — A dead creature's turn is skipped entirely

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **deliberate, listed**: the bracket
events and the Web roll's draws, in fights where a creature dies before its turn, and a stepped
golden's `TURN_STEPS`. CI balance verdicts re-checked (`phases/4.5/brief.md#balance-verdicts`).

## Scope

`phases/4.5/brief.md#a-dead-creatures-turn-is-skipped-entirely`, including its "nothing else reads
a dead slot" finding and the revive cases its tests pin, and
`phases/4.5/brief.md#resolveturn-refuses-a-finished-fight` (byte-identical).

## Known

- Today a dead creature's dequeued slot does exactly three things (the bracket, the clock bump at
  the action slot, `rollWebBreakFree`); everything else in the turn is already alive-gated
  (`engine/combat.ts`).
- A creature that dies during its own turn keeps that turn's cleanup and Web roll.

## Done when

A dead creature's slot emits nothing and draws nothing, the Web roll runs only on living turns,
`resolveTurn` throws on a finished fight, and each changed old golden is attributed to one of the
three listed kinds.
