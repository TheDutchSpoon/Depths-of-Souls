# 4.5-S — The simulator runs in Actions after each merge

Phase brief: `.claude/phases/4.5/brief.md`. Golden policy: **byte-identical**: a new workflow file
only, no `src/` change.

## Scope

- `phases/4.5/brief.md#the-simulator-runs-in-actions-after-each-merge`.

## Done when

The slice's own PR shows a green `sim.yml` run whose job summary carries the three CI verdicts and
the round-cap draw rate per spec, and whose artifact holds the full report; `deploy.yml` is
untouched and every gate is green.
