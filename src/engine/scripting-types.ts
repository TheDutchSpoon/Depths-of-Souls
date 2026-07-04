// Scripting data shapes: Condition/TargetSelector/RuleAction/Rule/Script. Kept separate
// from types.ts's resolver types -- this module has zero dependency on the resolver loop
// and its own sizeable table-driven test surface (conditions.test.ts, target-selectors.test.ts).

export type ComparatorOp = '<' | '<=' | '>' | '>=' | '==' | '!='

// ---- Conditions ----

export type HpSubject = 'self' | 'ally' | 'enemy'
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
 * GAME_DESIGN §8's "affinity advantage vs a target" condition -- deliberately existential
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

export interface IsProvokingCondition {
  readonly kind: 'is-provoking'
}

/** Matches a literal statusId (never a category) among the subject pool's status-carrying
 * effects (condition-status + timed damage-modifier -- never stat-modifiers). Existential over
 * the pool, same as hp-percent's `any` qualifier; no lowest/highest qualifier here. */
export interface HasStatusCondition {
  readonly kind: 'has-status'
  readonly subject: HpSubject
  readonly statusId: string
}

export type Condition =
  | AlwaysCondition
  | HpPercentCondition
  | EnemyCountCondition
  | AllyCountCondition
  | RoundNumberCondition
  | EnemyWeakToMeExistsCondition
  | IsProvokingCondition
  | HasStatusCondition

// ---- Target selectors ----
// The exact 7-member v1 set from GAME_DESIGN §8.

export interface SelfSelector {
  readonly kind: 'self'
}
export interface LowestHpAllySelector {
  readonly kind: 'lowest-hp-ally'
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

export type TargetSelector =
  | SelfSelector
  | LowestHpAllySelector
  | LowestHpEnemySelector
  | HighestHpEnemySelector
  | HighestAttackEnemySelector
  | HighestIntelligenceEnemySelector
  | RandomEnemySelector

// ---- Rule / Script ----
// RuleAction is distinct from Action (types.ts): a rule's authored action never carries a
// resolved target -- that's computed at evaluation time from the selector/equipped spell shape.

export interface AttackRuleAction {
  readonly kind: 'attack'
}
export interface CastRuleAction {
  readonly kind: 'cast'
  readonly gemSlot: number
}
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
  /** Reserved for Phase 6's authoring UI. Never read by the Phase 2 interpreter. */
  readonly defaultTarget?: TargetSelector
}
