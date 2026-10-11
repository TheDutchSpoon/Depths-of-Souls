import { describe, expect, it } from 'vitest'
import { blockLine, fullName, scanSource } from './scanner.ts'

const texts = (file: string, source: string) =>
  scanSource(file, source).comments.map((c) => c.text)

describe('scanSource comments', () => {
  it.each([
    ['x.ts', 'const a = 1 // note\n/* b */ const c = 2\n'],
    ['x.tsx', 'const a = <p>{/* note */}</p> // note\n'],
    ['x.js', 'const a = 1 // note\n'],
  ])('finds a comment in a %s file', (file, source) => {
    expect(texts(file, source).length).toBeGreaterThan(0)
  })

  it.each([
    ['a string', "const s = '// not a comment'\n"],
    ['a url string', 'const s = "http://example.com/a"\n'],
    ['a regex literal', 'const r = /a\\/\\/b/\n'],
    ['template text', 'const t = `a // b ${x} // c`\n'],
    ['a template fixture', 'const t = `// one\n// two\n// three\n`\n'],
  ])('finds no comment in %s', (_, source) => {
    expect(texts('x.ts', source)).toEqual([])
  })

  it('finds no comment in JSX text', () => {
    expect(texts('x.tsx', 'const a = <p>http://x</p>\n')).toEqual([])
    expect(texts('x.tsx', 'const a = <p>// not a comment</p>\n')).toEqual([])
    expect(
      texts('x.tsx', 'const a = (\n  <p>\n    // not a comment\n  </p>\n)\n'),
    ).toEqual([])
  })

  it('finds a comment inside a template substitution', () => {
    expect(texts('x.ts', 'const t = `a ${ /* c */ x } b`\n')).toEqual(['/* c */'])
  })

  it('reads a same-line trailing comment', () => {
    const scan = scanSource('x.ts', 'const a = [\n  1, // Phase 4\n  2,\n]\n')
    expect(scan.comments.map((c) => [c.text, c.line, c.standalone])).toEqual([
      ['// Phase 4', 2, false],
    ])
  })

  it('reads a trailing comment on the last line of a file', () => {
    expect(texts('x.ts', 'export const a = 1 // last')).toEqual(['// last'])
    expect(texts('x.ts', 'export const a = 1 // last\n')).toEqual(['// last'])
  })

  it('returns no comment twice', () => {
    const scan = scanSource(
      'x.ts',
      '// head\nconst a = 1 // one\n// two\nconst b = 2 /* three */\n',
    )
    expect(scan.comments.map((c) => c.text)).toEqual([
      '// head',
      '// one',
      '// two',
      '/* three */',
    ])
  })

  // A parent's JSDoc is a child of the node, and scanning the comment's inside as code finds the
  // `//` of a URL in it.
  it('does not walk a JSDoc comment', () => {
    const scan = scanSource('x.ts', '/** see http://x // y */\nexport const a = 1\n')
    expect(scan.comments.map((c) => c.text)).toEqual(['/** see http://x // y */'])
    expect(scan.blocks).toHaveLength(1)
  })

  it('does not walk a JSDoc comment on a class member or a parameter', () => {
    const scan = scanSource(
      'x.ts',
      'class A {\n  /** a http://x // y */\n  m(/** p http://p // q */ n: number) {}\n}\n',
    )
    expect(scan.comments.map((c) => c.text)).toEqual([
      '/** a http://x // y */',
      '/** p http://p // q */',
    ])
  })
})

describe('scanSource blocks', () => {
  it('joins consecutive standalone // lines into one block', () => {
    const scan = scanSource('x.ts', '// one\n// two\n//three\nconst a = 1\n')
    expect(scan.blocks).toHaveLength(1)
    expect(scan.blocks[0].text).toBe('one two three')
  })

  it('splits runs separated by a blank line or a gap', () => {
    expect(scanSource('x.ts', '// one\n\n// two\nconst a = 1\n').blocks).toHaveLength(2)
    expect(scanSource('x.ts', '// one\nconst a = 1\n// two\n').blocks).toHaveLength(2)
  })

  it('keeps a trailing comment as a block of its own', () => {
    const scan = scanSource('x.ts', '// one\nconst a = 1 // two\n// three\nconst b = 2\n')
    expect(scan.blocks.map((b) => b.text)).toEqual(['one', 'two', 'three'])
  })

  it('keeps a block comment as a block of its own', () => {
    const scan = scanSource('x.ts', '// one\n/* two */\n// three\nconst a = 1\n')
    expect(scan.blocks.map((b) => b.text)).toEqual(['one', 'two', 'three'])
  })

  // Leader stripping has two code paths, one for `//` runs and one for `/* */` blocks.
  it('reports the line of the first word of a pattern that wraps over // lines', () => {
    const [block] = scanSource(
      'x.ts',
      'const a = 1\n// Phase\n// 8\nconst b = 2\n',
    ).blocks
    expect(block.text).toBe('Phase 8')
    expect(blockLine(block, block.text.indexOf('Phase'))).toBe(2)
    expect(blockLine(block, block.text.indexOf('8'))).toBe(3)
  })

  it('reports the line of the first word of a pattern that wraps in a block comment', () => {
    const [block] = scanSource(
      'x.ts',
      'const a = 1\n/**\n * Phase\n * 8 */\nconst b = 2\n',
    ).blocks
    expect(block.text).toBe('Phase 8')
    expect(blockLine(block, block.text.indexOf('Phase'))).toBe(3)
    expect(blockLine(block, block.text.indexOf('8'))).toBe(4)
  })

  it('strips the leader of a /// directive and of a /*! block', () => {
    expect(scanSource('x.ts', '/// <reference types="x" />\n').blocks[0].text).toBe(
      '<reference types="x" />',
    )
    expect(scanSource('x.ts', '/*!\n * kept\n */\nconst a = 1\n').blocks[0].text).toBe(
      'kept',
    )
  })
})

describe('scanSource titles', () => {
  const titles = (source: string) =>
    scanSource('x.test.ts', source).titles.map((t) => [
      t.call,
      ...t.parts.map((p) => p.text),
    ])

  it('reads the title of each call shape', () => {
    expect(
      titles(`
describe('a', () => {
  it('b', () => {})
  it.only('c', () => {})
  it.each(cases)('d %s', () => {})
  test.each([1, 2])('e', () => {})
  describe.skipIf(flag)('f', () => {})
  test.todo('g')
})
`),
    ).toEqual([
      ['describe', 'a'],
      ['it', 'b'],
      ['it.only', 'c'],
      ['it.each()', 'd %s'],
      ['test.each()', 'e'],
      ['describe.skipIf()', 'f'],
      ['test.todo', 'g'],
    ])
  })

  it('reads a template title on its literal parts only', () => {
    const [title] = scanSource('x.test.ts', 'it(`a ${x} b ${y}`, () => {})\n').titles
    expect(title.template).toBe(true)
    expect(title.parts.map((p) => p.text)).toEqual(['a ', ' b ', ''])
    const [plain] = scanSource('x.test.ts', 'it(`a b`, () => {})\n').titles
    expect(plain.template).toBe(false)
    expect(plain.parts.map((p) => p.text)).toEqual(['a b'])
  })

  it('does not take an identifier or an expression as a title', () => {
    expect(titles("it(name, () => {})\nit('a' + 'b', () => {})\n")).toEqual([])
  })

  it('does not take the argument of it.each(t) as a title', () => {
    expect(titles("it.each('abc')('d', () => {})\n")).toEqual([['it.each()', 'd']])
  })

  it('does not take a call whose root is not a test function', () => {
    expect(titles("expect(x).toBe('a')\nfoo.it('b')\n")).toEqual([])
  })

  it('gives the line of the title literal', () => {
    const [title] = scanSource('x.test.ts', "\n\nit(\n  'a',\n  () => {},\n)\n").titles
    expect(title.parts[0].line).toBe(4)
  })

  it('gives each title the titles that enclose it', () => {
    const scan = scanSource(
      'x.test.ts',
      "describe('a', () => { describe('b', () => { it('c', () => {}) }); it('c', () => {}) })\n",
    )
    expect(scan.titles.map(fullName)).toEqual(['a', 'a > b', 'a > b > c', 'a > c'])
  })
})

describe('scanSource pragmas', () => {
  const pragmas = (source: string) =>
    scanSource('x.ts', source).pragmas.map((p) => [p.text, p.tokenIndex])

  it('returns each real pragma in order, with the token it governs', () => {
    expect(
      pragmas(
        [
          '/// <reference types="x" />',
          '// @ts-expect-error -- why',
          'const a: number = ""',
          '/* eslint-disable no-console */',
          'console.log(a)',
          '// prettier-ignore',
          'const b = 1',
          'const c = 2 // eslint-disable-line',
          '',
        ].join('\n'),
      ),
    ).toEqual([
      ['/// <reference types="x" />', 0],
      ['// @ts-expect-error -- why', 0],
      ['/* eslint-disable no-console */', 6],
      ['// prettier-ignore', 12],
      ['// eslint-disable-line', 20],
    ])
  })

  it('does not take prose that mentions a pragma', () => {
    expect(
      pragmas('// see eslint-disable and @ts-ignore for this\nconst a = 1\n'),
    ).toEqual([])
    expect(pragmas('// the v8 ignore comment is not used here\nconst a = 1\n')).toEqual(
      [],
    )
  })

  it('takes @vitest- anywhere in the leading docblock but not later', () => {
    expect(
      pragmas(
        '/**\n * About this file.\n * @vitest-environment jsdom\n */\nconst a = 1\n',
      ),
    ).toHaveLength(1)
    expect(
      pragmas('const a = 1\n/** @vitest-environment jsdom */\nconst b = 2\n'),
    ).toEqual([])
  })

  it('counts no token inside a JSDoc comment', () => {
    const at = (doc: string) =>
      pragmas(`/** ${doc} */
export const a = 1
// eslint-disable
export const b = 2
`)
    expect(at('x')).toEqual([['// eslint-disable', 5]])
    expect(at('a {@link a} b http://x // y @param n the value')).toEqual(at('x'))
  })

  it('moves the token index when a pragma moves over code and not under a comment edit', () => {
    const before = pragmas('const a = 1\n// eslint-disable\nconst b = 2\n')
    const edited = pragmas(
      '// a long new note\nconst a = 1\n// eslint-disable\nconst b = 2\n',
    )
    const moved = pragmas('// eslint-disable\nconst a = 1\nconst b = 2\n')
    expect(edited).toEqual(before)
    expect(moved).not.toEqual(before)
  })
})
