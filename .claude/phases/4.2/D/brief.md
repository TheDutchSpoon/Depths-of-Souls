# 4.2-D — Condense effects, responses, statuses

Phase brief: `.claude/phases/4.2/brief.md`. Loop: condense. Golden policy: **byte-identical**.

## Scope

Condense `spec/effects.md`, `spec/responses.md` and `spec/statuses.md`, folding their `## To fold`
sections (most of the Phase 4 addenda) into the halves. This is the largest slice: it holds the
heaviest duplication (the hook execution model, loop safety, the trait model and the status
lifecycle are each in both old files). The v1 status content and the status numbers go to the
content docs (rule 7). If the inventory passes 250 rows, split the slice per file before writing.

## Done when

`inventory D` passes, no `## To fold` section is left in the three files, and a verify round has no
findings.
