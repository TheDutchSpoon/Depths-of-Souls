# Plan hand-out, round 2: 4.6-A

**Verdict: approved.** Build `plan.md` with the three items below. Where they differ from
`plan.md`, these items win. No kickoff or living-doc line was edited this round.

## 1. A skipped candidate claims no `stacks: false` slot (Mechanism → test, `stacks: false`)

Two more tests in `stacks-false-claims.test.ts`. In each, one trait with a `stacks: false` trigger
is carried by two creatures, and the carrier first in pass order is skipped before the claim:

- **skipped by its `condition`** (a self-scoped condition that is false for the first carrier
  only): the second carrier still fires;
- **skipped by its `observationFilter` relationship** (the first carrier's relationship to the
  actor doesn't match): the second carrier still fires.

Each fails with the claim moved above that skip in `fireHook`.

These two skips are the ones the claim key can observe. Candidates that share a key share a
definition. So within one `fireHook` call they also share a `damageChannel` match and the cascade
depth, and they skip together.

`damage-channel.test.ts:295` keeps its assertions byte-identical. Its title and comment are
rewritten to say what it pins: within one trait, each channel-gated trigger answers only its own
channel. Its comment no longer claims the two triggers share a slot. Add it to "Comments that go
stale".

## 2. Gates

The gate list includes `npm run docs:check -- comment-proof` on `golden-revive-cap-exclusion` and
`golden-revive-cap-fizzle`.

## 3. Report, Spec questions (No living creature at 0 HP)

Name that the `effectiveMaxHp` floor also reaches the Additional, through
`calculateAdditional(attacker.level, effectiveMaxHp(target))` in `resolution.ts`. The rule's home
is `spec/combat.md#damage-channels-and-the-additional`. It is byte-identical, because no content
reaches a max Health below 1.

## Step 0, wording

The golden `initial` dump for the three `setup` goldens is the whole `CombatState`, as the
Golden policy section says. The branch is not clean at `f496e72`: it carries the mailbox commits.
Baseline from its current head.
