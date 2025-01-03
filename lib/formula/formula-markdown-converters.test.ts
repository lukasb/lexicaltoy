import { 
  getFormulaMarkdown,
  parseFormulaMarkdown,
  stripSharedNodesFromMarkdown
} from "./formula-markdown-converters";

describe('getFormulaMarkdown', () => {
  test('returns correct Markdown with formula only', () => {
    const formula = "SUM(A1:A10)";
    const result = getFormulaMarkdown(formula);
    expect(result).toBe("=SUM(A1:A10)");
  });

  test('returns correct Markdown with formula and single-line output', () => {
    const formula = "AVERAGE(B1:B5)";
    const output = "15.5";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=AVERAGE(B1:B5) |||result:\n 15.5\n|||");
  });

  test('returns correct Markdown with formula and multi-line output', () => {
    const formula = "VLOOKUP(C1, A1:B10, 2, FALSE)";
    const output = "First line\nSecond line\nThird line";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=VLOOKUP(C1, A1:B10, 2, FALSE) |||result:\n First line\nSecond line\nThird line\n|||");
  });

  test('handles empty output correctly', () => {
    const formula = "IF(D1>100, 'High', 'Low')";
    const output = "";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=IF(D1>100, 'High', 'Low')");
  });

  test('removes extra newlines from output', () => {
    const formula = "COUNT(E1:E20)";
    const output = "Line 1\n\n\nLine 2\n\nLine 3";
    const result = getFormulaMarkdown(formula, output);
    expect(result).toBe("=COUNT(E1:E20) |||result:\n Line 1\nLine 2\nLine 3\n|||");
  });

  test('adds blockId to formula', () => {
    const formula = "SUM(A1:A10)";
    const blockId = "^block-id";
    const result = getFormulaMarkdown(formula, undefined, blockId);
    expect(result).toBe("=SUM(A1:A10) ^block-id");
  });

  test('adds blockId to formula with result', () => {
    const formula = "SUM(A1:A10)";
    const output = "100";
    const blockId = "^block-id";
    const result = getFormulaMarkdown(formula, output, blockId);
    expect(result).toBe("=SUM(A1:A10) |||result:\n 100\n||| ^block-id");
  });
});

describe('parseFormulaMarkdown', () => {
  test('parses formula without result', () => {
    const markdown = '=find("orangetask","#mvp")';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: 'find("orangetask","#mvp")', result: undefined, blockId: undefined });
  });

  test('parses formula with single-line result', () => {
    const markdown = '=AVERAGE(B1:B5) |||result:\n 15.5\n|||';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: 'AVERAGE(B1:B5)', result: '15.5', blockId: undefined });
  });

  test('parses formula with multi-line result', () => {
    const markdown = '=VLOOKUP(C1, A1:B10, 2, FALSE) |||result:\n First line\nSecond line\nThird line\n|||';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ 
      formula: 'VLOOKUP(C1, A1:B10, 2, FALSE)', 
      result: 'First line\nSecond line\nThird line',
      blockId: undefined
    });
  });

  test('handles empty result', () => {
    const markdown = "=IF(D1>100, 'High', 'Low') |||result:\n \n|||";
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: "IF(D1>100, 'High', 'Low')", result: '', blockId: undefined });
  });

  test('returns undefined for formula, result and blockId when no match', () => {
    const markdown = 'This is not a formula';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: undefined, result: undefined, blockId: undefined });
  });

  test('handles result with leading/trailing spaces', () => {
    const markdown = '=TRIM(A1) |||result:\n    Trimmed String    \n|||';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: 'TRIM(A1)', result: 'Trimmed String', blockId: undefined });
  });

  test('handles complex nested formulas', () => {
    const markdown = '=IF(AND("A1>10","B1<5"),SUM("C1:C5"),AVERAGE("D1:D10"))';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ 
      formula: 'IF(AND("A1>10","B1<5"),SUM("C1:C5"),AVERAGE("D1:D10"))', 
      result: undefined,
      blockId: undefined
    });
  });

  test('handles blockId without result', () => {
    const markdown = '=SUM(A1:A10) ^block-id';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: 'SUM(A1:A10)', result: undefined, blockId: '^block-id' });
  });

  test('handles blockId with result', () => {
    const markdown = '=SUM(A1:A10) |||result:\n 100\n||| ^block-id';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: 'SUM(A1:A10)', result: '100', blockId: '^block-id' });
  });

  test('handle unstructured formula', () => {
    const markdown = '=hey ChatGPT I have a question about oranges';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: "hey ChatGPT I have a question about oranges", result: undefined, blockId: undefined });
  });

  test('handle unstructured formula with result', () => {
    const markdown = '=hey ChatGPT I have a question about oranges |||result:\n I want to know if oranges are on sale\n|||';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: "hey ChatGPT I have a question about oranges", result: "I want to know if oranges are on sale", blockId: undefined });
  });

  test('handle unstructured formula with blockId', () => {
    const markdown = '=hey ChatGPT I have a question about oranges ^block-id';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: "hey ChatGPT I have a question about oranges", result: undefined, blockId: '^block-id' });
  });

  test('handle unstructured formula with blockId and result', () => {
    const markdown = '=hey ChatGPT I have a question about oranges |||result:\n I want to know if oranges are on sale\n||| ^block-id';
    const result = parseFormulaMarkdown(markdown);
    expect(result).toEqual({ formula: "hey ChatGPT I have a question about oranges", result: "I want to know if oranges are on sale", blockId: '^block-id' });
  });
});

describe('stripSharedNodesFromMarkdown', () => {
  test('strips shared nodes from find formula', () => {
    const markdown = `
- =find(something) |||result:
  @@childnodes
  |||
  - Child node 1
  - Child node 2
- Next item
`;
    const expected = `
- =find(something) |||result:
  @@childnodes
  |||
- Next item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(expected);
  });

  test('keeps non-find formulas intact', () => {
    const markdown = `
- =calculate(1 + 1) |||result:
  2
  |||
- Next item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(markdown);
  });

  test('handles multiple formulas', () => {
    const markdown = `
- =find(something) |||result:
  @@childnodes
  |||
  - Child node 1
  - Child node 2
- =calculate(2 + 2) |||result:
  4
  |||
- this is another node
  - =this is a formula without results
  - this is a node without a formula
- =find(another thing) |||result:
  @@childnodes
  |||
  - Child node 3
  - Child node 4
- Final item
`;
    const expected = `
- =find(something) |||result:
  @@childnodes
  |||
- =calculate(2 + 2) |||result:
  4
  |||
- this is another node
  - =this is a formula without results
  - this is a node without a formula
- =find(another thing) |||result:
  @@childnodes
  |||
- Final item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(expected);
  });

  test('not too greedy stripping formula results', () => {
    const markdown = `
- abc
- def
- =find("stuff") |||result:
 @@childnodes
|||
    - [[horrorday]]
        - some stuff here.

some other stuff!

- yeah
`;
    const expected = `
- abc
- def
- =find("stuff") |||result:
 @@childnodes
|||

some other stuff!

- yeah
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(expected);
  });

  test('handles nested list items', () => {
    const markdown = `
- =find(something) |||result:
  @@childnodes
  |||
  - Child node 1
    - Nested child 1
    - Nested child 2
  - Child node 2
    - Nested child 3
- Next item
`;
    const expected = `
- =find(something) |||result:
  @@childnodes
  |||
- Next item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(expected);
  });

  test('preserves indentation', () => {
    const markdown = `
  - =find(something) |||result:
    @@childnodes
    |||
    - Child node 1
    - Child node 2
  - Next item
`;
    const expected = `
  - =find(something) |||result:
    @@childnodes
    |||
  - Next item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(expected);
  });

  test('handles empty input', () => {
    expect(stripSharedNodesFromMarkdown('')).toBe('');
  });

  test('handles input with no formulas', () => {
    const markdown = `
- Item 1
- Item 2
  - Subitem 2.1
- Item 3
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(markdown);
  });

  test('handles formulas with multiline results', () => {
    const markdown = `
- =calculate(complex stuff) |||result:
  Line 1 of result
  Line 2 of result
  Line 3 of result
  |||
- Next item
`;
    expect(stripSharedNodesFromMarkdown(markdown)).toBe(markdown);
  });
});