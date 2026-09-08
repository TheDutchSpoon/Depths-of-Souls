# Slice workflow

Each slice is built and reviewed in its **own fresh chat** — the **docs are the memory**, not chat scrollback.
Two habits keep that true:
1. Every locked decision lives in `.claude/` (not in a chat).
2. When a slice PR surfaces a **new** decision, it's synced into `.claude/` **before** the next
   slice's chat opens — otherwise a fresh build runs against a stale spec. This review → sync →
   next-slice rhythm is the connective tissue between slices.

The failure mode to avoid: a long-lived chat where decisions live only in scrollback → drift, and
stale decisions silently outliving their correction.

---

## Coding-agent kickoff (paste at the top of each slice chat — one slice per chat)

```
Phase <X> — Slice <Y: name>. Build ONLY this slice.

Before writing anything, read:
- .claude/CLAUDE.md
- .claude/briefs/phase-<X>-implementation-plan.md (this slice's section + the
  engine-vocabulary delta + the Assumptions checklist)
- .claude/CONVENTIONS.md and .claude/GAME_DESIGN.md (the spec you build against —
  docs win over anything in the brief if they disagree; flag the conflict, don't guess)
- the current src/engine + existing goldens (build against real code, not memory)
- for content slices: .claude/species/ and .claude/specializations/

Rules:
- Stay in this slice's scope; if it depends on an unbuilt slice, stop and say so.
- Every ASSUMPTION in scope: mark it inline AND in the slice's checklist.
- Goldens hand-derived (arithmetic in comments) for focused cases; big integration
  goldens labeled generated-then-checkpoint-verified. No run-then-pasted goldens.
- Engine stays pure (no UI/store imports in src/engine).
- Formula-touching work: prove prior goldens byte-identical (numbers unchanged).
- Green all four gates before done: test / lint / format:check / build.
- Leave main green + deployable; the demo (if this slice ships one) consumes the
  engine, doesn't leak into it.

Output: a PR against `main`, a short note of anything that surfaced a spec
question (so the docs get updated before the next slice), plus an update to, or new phase document.
```

## Review kickoff (paste at the top of each review chat — one PR per chat)

```
Review PR: <link or branch name>. Follow pr-review-runbook.md.
It's a slice of the phase-<X> plan — review against the docs on `main`, not the PR's
own claims. Separate real fixes from scope/labeling; flag the things needing my
decision vs. what you'll action. If it surfaced a new decision, say what the docs need.
```

---

## The human's judgment call these don't remove
When a slice surfaces a spec-question, decide: resolve it inline, or pull it back to a design pass
(a grill). Radar: the brief's **Assumptions checklist** — anything tagged there that a slice wants
to **change** (not merely **confirm**) is a "bring it back" signal.
