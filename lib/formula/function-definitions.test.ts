import { 
  splitMarkdownByNodes,
  removeFindNodes,
} from "./function-definitions";
import { NodeElementMarkdown } from "./formula-definitions";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";
import { Page, PageStatus } from "../definitions";
import { findCallback } from "./function-definitions";
import { DefaultArguments } from "./formula-parser";

// Helper function to create a BaseNodeMarkdown for comparison
function createBaseNodeMarkdown(pageName: string, lineNumberStart: number, lineNumberEnd: number, nodeMarkdown: string) {
  return { pageName, lineNumberStart, lineNumberEnd, nodeMarkdown };
}

describe('splitMarkdownByNodes', () => {
  test('splits simple markdown with no list items', () => {
    const markdown = `Line 1
Line 2
Line 3`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      { baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'Line 1'), children: [] },
      { baseNode: createBaseNodeMarkdown('TestPage', 2, 2, 'Line 2'), children: [] },
      { baseNode: createBaseNodeMarkdown('TestPage', 3, 3, 'Line 3'), children: [] },
    ]);
  });

  test('splits markdown with simple list items', () => {
    const markdown = `- Item 1
- Item 2
- Item 3`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      {
        baseNode: createBaseNodeMarkdown('TestPage', 1, 1, '- Item 1'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 2, 2, '- Item 2'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- Item 3'),
        children: []
      },
    ]);
  });

  test('handles nested list items', () => {
    const markdown = `- Item 1
  - Nested 1
  - Nested 2
- Item 2`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      {
        baseNode: createBaseNodeMarkdown('TestPage', 1, 1, '- Item 1'),
        children: [
          {
            baseNode: createBaseNodeMarkdown('TestPage', 2, 2, '- Nested 1'),
            children: []
          },
          {
            baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- Nested 2'),
            children: []
          },
        ]
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 4, 4, '- Item 2'),
        children: []
      },
    ]);
  });

  test('handles mixed content', () => {
    const markdown = `Paragraph 1

- List item 1
- List item 2

Paragraph 2`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      {
        baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'Paragraph 1'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- List item 1'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 4, 4, '- List item 2'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 6, 6, 'Paragraph 2'),
        children: []
      },
    ]);
  });

  test('handles multiline list items', () => {
    const markdown = `- Item 1
continues here
- Item 2`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      {
        baseNode: createBaseNodeMarkdown('TestPage', 1, 2, '- Item 1\ncontinues here'),
        children: []
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- Item 2'),
        children: []
      },
    ]);
  });

  test('handles deeply nested list items', () => {
    const markdown = `- Item 1
  - Nested 1
    - Deep nested 1
  - Nested 2
- Item 2`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([
      {
        baseNode: createBaseNodeMarkdown('TestPage', 1, 1, '- Item 1'),
        children: [
          {
            baseNode: createBaseNodeMarkdown('TestPage', 2, 2, '- Nested 1'),
            children: [
              {
                baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- Deep nested 1'),
                children: []
              },
            ]
          },
          {
            baseNode: createBaseNodeMarkdown('TestPage', 4, 4, '- Nested 2'),
            children: []
          },
        ]
      },
      {
        baseNode: createBaseNodeMarkdown('TestPage', 5, 5, '- Item 2'),
        children: []
      },
    ]);
  });

  test('handles empty input', () => {
    const result = splitMarkdownByNodes('', 'TestPage');
    expect(result).toEqual([]);
  });

  test('handles input with only blank lines', () => {
    const markdown = `

`;
    const result = splitMarkdownByNodes(markdown, 'TestPage');
    expect(result).toEqual([]);
  });
});

describe('removeFindNodes', () => {
  test('removes find node and its siblings', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: [
        { baseNode: createBaseNodeMarkdown('TestPage', 2, 2, 'child 1'), children: [] },
        { baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '- =find(something)'), children: [] },
        { baseNode: createBaseNodeMarkdown('TestPage', 4, 4, 'child 3'), children: [] },
      ]
    };
    removeFindNodes(root);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].baseNode.nodeMarkdown).toBe('child 1');
  });

  test('removes find node in nested structure', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: [
        {
          baseNode: createBaseNodeMarkdown('TestPage', 2, 2, 'parent'),
          children: [
            { baseNode: createBaseNodeMarkdown('TestPage', 3, 3, 'child 1'), children: [] },
            { baseNode: createBaseNodeMarkdown('TestPage', 4, 4, '- =find(something)'), children: [] },
            { baseNode: createBaseNodeMarkdown('TestPage', 5, 5, 'child 3'), children: [] },
          ]
        },
      ]
    };
    removeFindNodes(root);
    expect(root.children[0].children).toHaveLength(1);
    expect(root.children[0].children[0].baseNode.nodeMarkdown).toBe('child 1');
  });

  test('does not remove nodes if no find node is present', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: [
        { baseNode: createBaseNodeMarkdown('TestPage', 2, 2, 'child 1'), children: [] },
        { baseNode: createBaseNodeMarkdown('TestPage', 3, 3, 'child 2'), children: [] },
        { baseNode: createBaseNodeMarkdown('TestPage', 4, 4, 'child 3'), children: [] },
      ]
    };
    removeFindNodes(root);
    expect(root.children).toHaveLength(3);
  });

  test('handles empty node', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: []
    };
    removeFindNodes(root);
    expect(root.children).toHaveLength(0);
  });

  test('removes find node at different levels', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: [
        {
          baseNode: createBaseNodeMarkdown('TestPage', 2, 2, 'level 1'),
          children: [
            { baseNode: createBaseNodeMarkdown('TestPage', 3, 3, 'level 2-1'), children: [] },
            {
              baseNode: createBaseNodeMarkdown('TestPage', 4, 4, 'level 2-2'),
              children: [
                { baseNode: createBaseNodeMarkdown('TestPage', 5, 5, '- =find(something)'), children: [] },
                { baseNode: createBaseNodeMarkdown('TestPage', 6, 6, 'level 3-2'), children: [] },
              ]
            },
            { baseNode: createBaseNodeMarkdown('TestPage', 7, 7, 'level 2-3'), children: [] },
          ]
        },
      ]
    };
    removeFindNodes(root);
    expect(root.children[0].children[1].children).toHaveLength(0);
    expect(root.children[0].children).toHaveLength(3);
  });

  test('preserves baseNode properties', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('MainPage', 1, 5, 'root'),
      children: [
        { 
          baseNode: createBaseNodeMarkdown('MainPage', 2, 2, '- =find(something)'),
          children: [] 
        },
        { 
          baseNode: createBaseNodeMarkdown('MainPage', 3, 4, 'child'),
          children: [] 
        },
      ]
    };
    removeFindNodes(root);
    expect(root.children).toHaveLength(0);
    expect(root.baseNode).toEqual({
      nodeMarkdown: 'root',
      pageName: 'MainPage',
      lineNumberStart: 1,
      lineNumberEnd: 5
    });
  });
});

describe('find() function in regexCallbacks', () => {
  // Mock pages for testing
  const mockPages: Page[] = [
    {
      id: '1',
      value: '- This is content for page 1.\n- It contains some keywords.\nla la la\n- More text content with keywords here.',
      userId: 'user1',
      title: 'Page 1',
      lastModified: new Date('2023-01-01'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
    {
      id: '2',
      value: '# Page 2\n- This page has different text content.\nIt also has some stuff.\n## Section 2\n- Even more content.\nAlbequerque',
      userId: 'user1',
      title: 'Page 2',
      lastModified: new Date('2023-01-02'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
    {
      id: '3',
      value: 'This should not show up in any of our tests',
      userId: 'user1',
      title: 'Page 3',
      lastModified: new Date('2023-01-02'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
    {
      id: '4',
      value: '- Carolina shuffle\n    - boogie',
      userId: 'user1',
      title: 'Page 4',
      lastModified: new Date('2023-01-02'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
    {
      id: '5',
      value: '- This is whatever for page 5.\n- It contains some amazing keywords.\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 5',
      lastModified: new Date('2023-01-02'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
    {
      id: '6',
      value: '- NOW this is a todo.\n- LATER Another todo.\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 6',
      lastModified: new Date('2023-01-02'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
      status: PageStatus.Quiescent,
    },
  ];

  async function testFindFunction(terms: string[], statuses?: string[]): Promise<FormulaOutput | null> {
    const defaultArguments: DefaultArguments = {
      pages: mockPages
    };
    const userArguments: FormulaOutput[] = terms.map(arg => ({
      type: FormulaValueType.Text,
      output: arg
    }));
    if (statuses) {
      userArguments.push({
        type: FormulaValueType.NodeTypeOrTypes,
        output: statuses.join('|')
      });
    }
    return await findCallback(defaultArguments, userArguments);
  }

  test('find() matches single keyword', async () => {
    const result = await testFindFunction(['"content"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(4);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 1');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.pageName).toBe('Page 1');
    expect((result?.output[2] as NodeElementMarkdown).baseNode.pageName).toBe('Page 2');
    expect((result?.output[3] as NodeElementMarkdown).baseNode.pageName).toBe('Page 2');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('content');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('content');
    expect((result?.output[2] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('content');
    expect((result?.output[3] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('content');
  });

  test('find() matches multiple keywords (AND logic)', async () => {
    const result = await testFindFunction(['"content"', '"keywords"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 1');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('content');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('keywords');
  });

  test('find() finds by todo status', async () => {
    const result = await testFindFunction([], ['now']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 6');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('this is a todo');
  });

  test('find() matches OR clauses', async () => {
    const result = await testFindFunction([],['now|later']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 6');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.pageName).toBe('Page 6');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('this is a todo');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('Another todo');
  });

  test('find() matches in page title', async () => {
    const result = await testFindFunction(['"Page 1"','"keywords"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('keywords');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 1');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('keywords');
    expect((result?.output[1] as NodeElementMarkdown).baseNode.pageName).toBe('Page 1');
  });

  test('find() returns nested children', async () => {
    const result = await testFindFunction(['"shuffle"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('Carolina');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 4');
    expect((result?.output[0] as NodeElementMarkdown).children).toHaveLength(1);
    expect((result?.output[0] as NodeElementMarkdown).children[0].baseNode.nodeMarkdown).toContain('boogie');
  });

  test('find() includes multiline continuations', async () => {
    const result = await testFindFunction(['"amazing"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('amazing');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('\n');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.nodeMarkdown).toContain('multiline');
    expect((result?.output[0] as NodeElementMarkdown).baseNode.pageName).toBe('Page 5');
  });

  test('find() returns empty array when no matches', async () => {
    const result = await testFindFunction(['"nonexistent"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(0);
  });
});