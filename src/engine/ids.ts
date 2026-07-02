export type CreatureId = string & { readonly __brand: 'CreatureId' }

export function createCreatureId(value: string): CreatureId {
  return value as CreatureId
}
