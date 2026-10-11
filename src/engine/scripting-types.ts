// Scripting data shapes: Condition/TargetSelector/RuleAction/Rule/Script. Kept separate
// from types.ts's resolver types -- this module has zero dependency on the resolver loop
// and its own sizeable table-driven test surface (conditions.test.ts, target-selectors.test.ts).

export type ComparatorOp = '<' | '<=' | '>' | '>=' | '==' | '!='

// ---- Conditions ----

// 'target' is the creature an effect is being resolved against (`spec/scripting.md#conditions-in-the-engine`):
// the trigger's source (fireHook) or the current damage target (a conditional-damage-bonus's own
// gathering). Scripting-rule lookahead has no such creature, so a 'target'-subject condition is
// false there. The qualifier is ignored for 'target' (a single creature, not a pool): any/lowest/
// highest degenerate to the same one-element check.
export type HpSubject = 'self' | 'ally' | 'enemy' | 'target'
export type HpQualifier = 'any' | 'lowest' | 'highest'

export interface AlwaysCondition {
  readonly kind: 'always'
}

export interface HpPercentCondition {
  readonly kind: 'hp-percent'
  readonly subject: HpSubject
  readonly qualifier: HpQualifier
  readonly comparator: ComparatorOp
  readonly thresholdPercent: number
}

export interface EnemyCountCondition {
  readonly kind: 'enemy-count'
  readonly comparator: ComparatorOp
  readonly count: number
}

export interface AllyCountCondition {
  readonly kind: 'ally-count'
  readonly comparator: ComparatorOp
  readonly count: number
}

export interface RoundNumberCondition {
  readonly kind: 'round-number'
  readonly comparator: ComparatorOp
  readonly round: number
}

/**
 * The "an enemy is weak to me" condition (`spec/scripting.md#conditions`) -- deliberately existential
 * and decoupled from targeting: true iff >=1 living enemy is weak to the acting
 * creature's affinity. No embedded TargetSelector/qualifier; conditions describe board
 * state, selectors describe targeting, and the two never couple. Named for that
 * existential meaning (not "affinity-advantage", which would read as target-coupled) --
 * a Cast chosen because this condition is true may still strike an enemy the caster has
 * no advantage over.
 */
export interface EnemyWeakToMeExistsCondition {
  readonly kind: 'enemy-weak-to-me-exists'
}

/** Matches a literal statusId (never a category) among the subject pool's status-carrying
 * status containers (never stat-modifiers). Existential over
 * the pool, same as hp-percent's `any` qualifier; no lowest/highest qualifier here. */
export interface HasStatusCondition {
  readonly kind: 'has-status'
  readonly subject: HpSubject
  readonly statusId: string
}

/**
 * True while the creature acts before its target in the frozen round's turn queue (Blindclaws'
 * Striker payoff). Evaluated against the RULE'S OWN `targeting` selector, peeked without RNG
 * (`peekTargetSelector`, target-selectors.ts); with no rule (a trigger's or a
 * conditional-damage-bonus's condition) it falls back to the creature being resolved against.
 * False when there is no target to compare: a selector that peeks to none (`random-enemy`,
 * `random-ally`, `random`), no resolving-against creature, or a target not in the queue (e.g.
 * dead). Unlike every other v1 condition it is not target-independent, because it needs a target
 * to evaluate at all.
 */
export interface ActedBeforeTargetCondition {
  readonly kind: 'acted-before-target'
}

export type Condition =
  | AlwaysCondition
  | HpPercentCondition
  | EnemyCountCondition
  | AllyCountCondition
  | RoundNumberCondition
  | EnemyWeakToMeExistsCondition
  | HasStatusCondition
  | ActedBeforeTargetCondition

// ---- Target selectors ----
// The v1 set from `spec/scripting.md#target-selectors`: the 5-member enemy set (lowest/highest-hp, highest-attack,
// highest-intelligence, random) plus `self`, and the one-for-one ally mirror
// (highest-hp/highest-attack/highest-intelligence/random-ally alongside the lowest-hp-ally) so
// ally-targeting spells/trait responses (the support-spell model) can pick WHICH ally, not only
// "the weakest one" -- 11 members total.

export interface SelfSelector {
  readonly kind: 'self'
}
export interface LowestHpAllySelector {
  readonly kind: 'lowest-hp-ally'
}
export interface HighestHpAllySelector {
  readonly kind: 'highest-hp-ally'
}
export interface HighestAttackAllySelector {
  readonly kind: 'highest-attack-ally'
}
export interface HighestIntelligenceAllySelector {
  readonly kind: 'highest-intelligence-ally'
}
export interface RandomAllySelector {
  readonly kind: 'random-ally'
}
export interface LowestHpEnemySelector {
  readonly kind: 'lowest-hp-enemy'
}
export interface HighestHpEnemySelector {
  readonly kind: 'highest-hp-enemy'
}
export interface HighestAttackEnemySelector {
  readonly kind: 'highest-attack-enemy'
}
export interface HighestIntelligenceEnemySelector {
  readonly kind: 'highest-intelligence-enemy'
}
export interface RandomEnemySelector {
  readonly kind: 'random-enemy'
}
/** Uniform among living creatures on the ACTION'S OWN intended side (not fixed to ally/enemy like
 * the two selectors above). Resolving it needs that side, which only the action layer knows, so
 * `resolveTargetSelector` and `targetSelectorHasCandidate` (target-selectors.ts) throw on it and
 * `actions.ts` resolves it directly (`spec/combat.md#one-action-pipeline`).
 * `peekTargetSelector` returns no target for it, as for `random-enemy`/`random-ally`. */
export interface RandomSelector {
  readonly kind: 'random'
}

export type TargetSelector =
  | SelfSelector
  | LowestHpAllySelector
  | HighestHpAllySelector
  | HighestAttackAllySelector
  | HighestIntelligenceAllySelector
  | RandomAllySelector
  | LowestHpEnemySelector
  | HighestHpEnemySelector
  | HighestAttackEnemySelector
  | HighestIntelligenceEnemySelector
  | RandomEnemySelector
  | RandomSelector

// ---- Rule / Script ----
// RuleAction is distinct from Action (types.ts): a rule's authored action never carries a
// resolved target -- that's computed at evaluation time from the selector/equipped spell shape.

export interface AttackRuleAction {
  readonly kind: 'attack'
}
/** A cast of one specific gem slot. */
export interface CastSlotRuleAction {
  readonly kind: 'cast'
  readonly gemSlot: number
}
/** 'random' picks uniformly among the actor's castable gems (innate slots
 * included) at resolution time -- see actions.ts's `castableGemSlots`/`resolveIntent`.
 * `gemSide` narrows the draw to gems whose own `targetSide` is that
 * side (the `support` role's "cast random ally-side gem"; AOE spells count by their targetSide).
 * Absent = every castable gem, exactly the draw from before the field existed. Read at both sites that read the castable
 * set: `checkLegality` and `resolveGemSlot`. */
export interface CastRandomRuleAction {
  readonly kind: 'cast'
  readonly gemSlot: 'random'
  readonly gemSide?: 'ally' | 'enemy'
}
export type CastRuleAction = CastSlotRuleAction | CastRandomRuleAction
export interface DefendRuleAction {
  readonly kind: 'defend'
}
export interface ProvokeRuleAction {
  readonly kind: 'provoke'
}
export interface WaitRuleAction {
  readonly kind: 'wait'
}

export type RuleAction =
  | AttackRuleAction
  | CastRuleAction
  | DefendRuleAction
  | ProvokeRuleAction
  | WaitRuleAction

export interface Rule {
  readonly condition: Condition
  readonly action: RuleAction
  readonly targeting?: TargetSelector
}

export interface Script {
  readonly id: string
  readonly rules: readonly Rule[]
  /** Reserved for the authoring UI (`spec/scripting.md#scripts-and-rules`). Never read by the interpreter. */
  readonly defaultTarget?: TargetSelector
}

// ---- Intent ----
// The rule-shaped, UNRESOLVED action every action source (a script rule, the implicit fallback,
// a granted action) produces -- `actions.ts`'s `checkLegality`/`resolveIntent` are the one
// pipeline that turns this into a resolved `Action` (types.ts). Structurally identical to `Rule`
// minus its `condition` (an Intent has already been "decided"; it has nothing left to evaluate).

export interface Intent {
  readonly action: RuleAction
  readonly targeting?: TargetSelector
}
