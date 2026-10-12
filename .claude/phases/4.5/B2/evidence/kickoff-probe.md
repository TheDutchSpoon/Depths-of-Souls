# Kickoff probe: what the order change moves on `main`

Scratch clone of `f81af3f` (`main`), outside the repo. The probe swapped in the slice's order and
nothing else, as the plainest possible version of it:

- `livingIdsOf(state)` returned `buildTurnQueue(state.playerParty, state.enemyParty)`, so all nine
  multi-creature hook calls (five `on-action-observed`, `on-damage-observed`, `on-death-observed`
  minus the dead creature, `on-fight-start`, `on-round-end`) took turn order;
- `rollWebBreakFree` took its bearers from the same list instead of sorting by
  `compareBySideSlotId`.

It is a measurement, not the build: the plan designs the helper.

## Full suite

`npx vitest run`: 1 failed, 1874 passed, 1 skipped. The one failure is the corpus digest. Every
hand-derived golden, every unit test and the three `balance-ci-*` threshold tests stay green.

## Corpus digest

97 of 527 fights change. Classified by comparing each fight's `main` log with the probe's:
"reorder" means the same multiset of events (same count, same result); "diverge" means the logs
differ beyond order. Every fight's first differing event is a `TriggerFired` of one of the five
hooks or a Web roll's `StatusExpired`:

| First differing event | Reorder | Diverge |
| --- | --- | --- |
| `TriggerFired` `on-death-observed` | 23 | 7 |
| `TriggerFired` `on-fight-start` | 21 | 1 |
| `TriggerFired` `on-action-observed` | 12 | 1 |
| `TriggerFired` `on-round-end` | 3 | 1 |
| `TriggerFired` `on-damage-observed` | 0 | 2 |
| `StatusExpired` (Web roll) | 0 | 26 |
| **Total** | **59** | **38** |

One result changes: corpus fight 185, win → loss (1095 → 535 events), first divergence at a Web
roll.

## Runtime

Corpus resolution (`resolveFight` over all 527 fights, one vitest file, 3 runs each, same machine,
the first of each also writing the logs to disk): `main` 3.1 / 3.7 / 4.1 s, probe 6.7 / 6.6 /
5.5 s, roughly +60%. The probe recomputes `buildTurnQueue` on every pass,
which reads every living creature's effects three times and its effective Speed once.
