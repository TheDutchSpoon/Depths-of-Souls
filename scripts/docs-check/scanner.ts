import ts from 'typescript'

// The comment scanner behind `comments` and `comment-proof`. It is pure: text in, structure out, no
// fs and no git.
//
// It parses with `ts.createSourceFile` (a raw `ts.createScanner` mis-scans template literals,
// regex literals and JSX text) and reads comments at the token positions of the parse tree. At
// each token it reads the comment ranges of the token's own leading trivia, which holds the
// previous line's same-line trailing comments too, and keeps a range only if it ends before the
// token starts: a `//` that opens a JSX text token or sits in template text ends after that
// token's start, so is not a comment. JSDoc nodes are not walked: their text arrives once, as the
// leading comment of the first real token after them.

export interface Comment {
  pos: number
  end: number
  /** 1-based line of the comment's first character. */
  line: number
  /** The comment as written, delimiters included. */
  text: string
  /** True when nothing but whitespace precedes it on its line. */
  standalone: boolean
}

export interface BlockPiece {
  /** Offset in `Block.text` where this piece starts. */
  start: number
  /** The source line the piece came from. */
  line: number
}

/**
 * A run of comment text that reads as one: consecutive standalone `//` lines, or one `/* *\/`
 * comment, or one trailing comment. `text` is the bodies with their leaders stripped, joined with
 * one space, so a pattern that wraps across lines still matches.
 */
export interface Block {
  comments: Comment[]
  text: string
  pieces: BlockPiece[]
}

export interface TitlePart {
  text: string
  line: number
}

export interface Title {
  pos: number
  end: number
  line: number
  /** The callee as written, such as `it`, `it.each()` or `describe.skipIf()`. */
  call: string
  /** The literal parts of the title; a template with substitutions has several. */
  parts: TitlePart[]
  /** True when the title is a template with `${…}` substitutions. */
  template: boolean
  /** The titles of the enclosing `describe`/`it` calls, outermost first. */
  chain: string[]
}

export interface Pragma {
  /** The comment exactly as written. */
  text: string
  /** The 0-based index of the next real token in the walk's token stream. */
  tokenIndex: number
}

export interface Scan {
  comments: Comment[]
  blocks: Block[]
  titles: Title[]
  pragmas: Pragma[]
}

const TITLE_ROOTS = new Set(['describe', 'it', 'test', 'suite'])

/** A pragma starts the comment body; `@vitest-` may sit anywhere in the leading docblock. */
const PRAGMA =
  /^(?:@ts-(?:expect-error|ignore|nocheck|check)\b|eslint-|@jsx|@vite-ignore|prettier-ignore|v8 ignore|istanbul)/

export function scriptKind(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/.test(file)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

export function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file))
}

/** The full test name of a title: its parts joined by `${}`. */
export function titleText(title: { parts: TitlePart[] }): string {
  return title.parts.map((p) => p.text).join('${}')
}

/** The full name of a title: the enclosing titles, then its own text. */
export function fullName(title: Title): string {
  return [...title.chain, titleText(title)].join(' > ')
}

function lineStartsOf(text: string): number[] {
  const starts = [0]
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1))
    starts.push(i + 1)
  return starts
}

function lineAt(starts: number[], offset: number): number {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= offset) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

/** The source line of a character of `block.text`. */
export function blockLine(block: Block, offset: number): number {
  let line = block.pieces[0]?.line ?? 1
  for (const piece of block.pieces) {
    if (piece.start > offset) break
    line = piece.line
  }
  return line
}

function calleeRoot(expression: ts.Expression): string | undefined {
  let e = expression
  for (;;) {
    if (ts.isIdentifier(e)) return e.text
    if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e))
      e = e.expression
    else if (ts.isCallExpression(e)) e = e.expression
    else if (ts.isTaggedTemplateExpression(e)) e = e.tag
    else if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e))
      e = e.expression
    else return undefined
  }
}

function calleeShape(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression))
    return `${calleeShape(expression.expression)}.${expression.name.text}`
  if (ts.isCallExpression(expression)) return `${calleeShape(expression.expression)}()`
  if (ts.isTaggedTemplateExpression(expression))
    return `${calleeShape(expression.tag)}\`\``
  return '?'
}

/** A call is a title call when its callee's root is `describe|it|test|suite` and it is not the inner call of a curried one such as `it.each(t)`. */
function isTitleCall(node: ts.CallExpression): boolean {
  if (calleeRoot(node.expression) === undefined) return false
  if (!TITLE_ROOTS.has(calleeRoot(node.expression) ?? '')) return false
  const parent = node.parent
  return !(ts.isCallExpression(parent) && parent.expression === node)
}

function titleOf(
  node: ts.CallExpression,
  sf: ts.SourceFile,
  starts: number[],
): Title | null {
  const arg = node.arguments[0]
  const base = {
    pos: node.getStart(sf),
    end: node.end,
    line: lineAt(starts, node.getStart(sf)),
    call: calleeShape(node.expression),
    chain: [] as string[],
  }
  const lineOfNode = (n: ts.Node) => lineAt(starts, n.getStart(sf))
  if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)))
    return {
      ...base,
      parts: [{ text: arg.text, line: lineOfNode(arg) }],
      template: false,
    }
  if (arg && ts.isTemplateExpression(arg)) {
    const parts = [{ text: arg.head.text, line: lineOfNode(arg.head) }]
    for (const span of arg.templateSpans)
      parts.push({ text: span.literal.text, line: lineOfNode(span.literal) })
    return { ...base, parts, template: true }
  }
  return null
}

function pragmaBody(comment: Comment): string {
  return comment.text.replace(/^(?:\/\/+|\/\*+)\s*/, '')
}

function isPragma(comment: Comment, tokenIndex: number): boolean {
  if (comment.text.startsWith('///')) return /^\/\/\/\s*</.test(comment.text)
  if (PRAGMA.test(pragmaBody(comment))) return true
  return tokenIndex === 0 && /@vitest-/.test(comment.text)
}

function bodyPieces(comment: Comment): { text: string; line: number }[] {
  if (comment.text.startsWith('//'))
    return [{ text: comment.text.replace(/^\/\/+/, '').trim(), line: comment.line }]
  const body = comment.text.replace(/^\/\*[*!]*/, '').replace(/\*+\/$/, '')
  return body.split('\n').map((raw, i) => ({
    text: (i === 0 ? raw : raw.replace(/^\s*\*+/, '')).trim(),
    line: comment.line + i,
  }))
}

function toBlocks(comments: Comment[]): Block[] {
  const groups: Comment[][] = []
  for (const c of comments) {
    const last = groups.at(-1)?.at(-1)
    if (
      last &&
      c.standalone &&
      last.standalone &&
      c.text.startsWith('//') &&
      last.text.startsWith('//') &&
      c.line === last.line + 1
    )
      groups.at(-1)?.push(c)
    else groups.push([c])
  }
  return groups.map((group) => {
    const pieces: BlockPiece[] = []
    let text = ''
    for (const comment of group)
      for (const piece of bodyPieces(comment)) {
        if (piece.text === '') continue
        if (text !== '') text += ' '
        pieces.push({ start: text.length, line: piece.line })
        text += piece.text
      }
    return { comments: group, text, pieces }
  })
}

/** Reads the comments, blocks, titles and pragmas of one source file. */
export function scanSource(file: string, source: string): Scan {
  const text = source.replace(/\r/g, '')
  const sf = parse(file, text)
  const starts = lineStartsOf(text)
  const comments: Comment[] = []
  const pragmas: Pragma[] = []
  const titles: Title[] = []
  const stack: string[] = []
  let tokenIndex = 0

  const leaf = (node: ts.Node) => {
    const start = node.getStart(sf)
    const full = node.getFullStart()
    const seen = new Set<number>()
    const ranges = [
      ...(ts.getTrailingCommentRanges(text, full) ?? []),
      ...(ts.getLeadingCommentRanges(text, full) ?? []),
    ]
      .filter((r) => r.end <= start && !seen.has(r.pos) && seen.add(r.pos))
      .sort((a, b) => a.pos - b.pos)
    for (const r of ranges) {
      const line = lineAt(starts, r.pos)
      const comment: Comment = {
        pos: r.pos,
        end: r.end,
        line,
        text: text.slice(r.pos, r.end),
        standalone: /^[ \t]*$/.test(text.slice(starts[line - 1], r.pos)),
      }
      comments.push(comment)
      if (isPragma(comment, tokenIndex)) pragmas.push({ text: comment.text, tokenIndex })
    }
    tokenIndex++
  }

  const visit = (node: ts.Node) => {
    const children = node
      .getChildren(sf)
      .filter(
        (c) =>
          c.kind < ts.SyntaxKind.FirstJSDocNode || c.kind > ts.SyntaxKind.LastJSDocNode,
      )
    if (children.length === 0) {
      if (node.kind !== ts.SyntaxKind.SyntaxList) leaf(node)
      return
    }
    let pushed = false
    if (ts.isCallExpression(node) && isTitleCall(node)) {
      const title = titleOf(node, sf, starts)
      if (title) {
        title.chain = [...stack]
        titles.push(title)
      }
      stack.push(title ? titleText(title) : '${}')
      pushed = true
    }
    for (const child of children) visit(child)
    if (pushed) stack.pop()
  }
  visit(sf)

  return { comments, blocks: toBlocks(comments), titles, pragmas }
}
