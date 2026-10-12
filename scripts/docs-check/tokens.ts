import ts from 'typescript'
import { isTitleCall, parse } from './scanner.ts'

// The tokens `comment-proof --renames` and the `comments` name guard read: the identifiers, the
// literals and the module specifiers of one source file. Pure, like the scanner.

export interface Literal {
  /** Cooked text; a regex literal's text as written, slashes and flags included. */
  text: string
  /** The span a rewrite replaces: the whole literal for a string, the inside of a template part. */
  from: number
  to: number
  quoted: boolean
  /** A module specifier, the first argument of a title call, or any other literal. */
  context: 'specifier' | 'title' | 'value'
  line: number
}

export interface Ident {
  text: string
  from: number
  to: number
  line: number
}

function isSpecifier(node: ts.Node): boolean {
  const p = node.parent
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p))
    return p.moduleSpecifier === node
  if (ts.isExternalModuleReference(p)) return true
  if (ts.isModuleDeclaration(p)) return p.name === node
  if (ts.isLiteralTypeNode(p)) return ts.isImportTypeNode(p.parent)
  if (ts.isCallExpression(p))
    return (
      p.arguments[0] === node &&
      (p.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(p.expression) && p.expression.text === 'require'))
    )
  return false
}

function isTitle(node: ts.Node): boolean {
  let n: ts.Node = node
  if (ts.isTemplateHead(n)) n = n.parent
  else if (ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) n = n.parent.parent
  const p = n.parent
  return ts.isCallExpression(p) && p.arguments[0] === n && isTitleCall(p)
}

/** Every string, template part and regex literal of `text`, in source order. */
export function literalsOf(file: string, text: string): Literal[] {
  const out: Literal[] = []
  const sf = parse(file, text)
  const visit = (node: ts.Node) => {
    const start = node.getStart(sf)
    const line = sf.getLineAndCharacterOfPosition(start).line + 1
    const add = (from: number, to: number, quoted: boolean, cooked: string) =>
      out.push({
        text: cooked,
        from,
        to,
        quoted,
        line,
        context: isSpecifier(node) ? 'specifier' : isTitle(node) ? 'title' : 'value',
      })
    if (ts.isStringLiteral(node)) add(start, node.end, true, node.text)
    else if (ts.isNoSubstitutionTemplateLiteral(node))
      add(start + 1, node.end - 1, false, node.text)
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node))
      add(start + 1, node.end - 2, false, node.text)
    else if (ts.isTemplateTail(node)) add(start + 1, node.end - 1, false, node.text)
    else if (ts.isRegularExpressionLiteral(node))
      add(start, node.end, true, node.getText(sf))
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

/** Every identifier token of `text`: declarations, uses, property names and import specifiers. */
export function identifiersOf(file: string, text: string): Ident[] {
  const out: Ident[] = []
  const sf = parse(file, text)
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      const start = node.getStart(sf)
      out.push({
        text: node.text,
        from: start,
        to: node.end,
        line: sf.getLineAndCharacterOfPosition(start).line + 1,
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}
