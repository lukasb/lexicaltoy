import { 
  removeInvalidNodesForFind,
} from "./function-definitions";
import { NodeElementMarkdown } from "./formula-definitions";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";
import { Page, PageStatus } from "../definitions";
import { findCallback } from "./function-definitions";
import { DefaultArguments } from "./formula-parser";
import { splitMarkdownByNodes } from "../markdown/markdown-helpers";
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
            baseNode: createBaseNodeMarkdown('TestPage', 2, 2, '  - Nested 1'),
            children: []
          },
          {
            baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '  - Nested 2'),
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
            baseNode: createBaseNodeMarkdown('TestPage', 2, 2, '  - Nested 1'),
            children: [
              {
                baseNode: createBaseNodeMarkdown('TestPage', 3, 3, '    - Deep nested 1'),
                children: []
              },
            ]
          },
          {
            baseNode: createBaseNodeMarkdown('TestPage', 4, 4, '  - Nested 2'),
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
    removeInvalidNodesForFind(root);
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
    removeInvalidNodesForFind(root);
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
    removeInvalidNodesForFind(root);
    expect(root.children).toHaveLength(3);
  });

  test('handles empty node', () => {
    const root: NodeElementMarkdown = {
      baseNode: createBaseNodeMarkdown('TestPage', 1, 1, 'root'),
      children: []
    };
    removeInvalidNodesForFind(root);
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
    removeInvalidNodesForFind(root);
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
    removeInvalidNodesForFind(root);
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
    },
    {
      id: '3',
      value: 'This should not show up in any of our tests',
      userId: 'user1',
      title: 'Page 3',
      lastModified: new Date('2023-01-03'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '4',
      value: '- Carolina shuffle\n    - boogie',
      userId: 'user1',
      title: 'Page 4',
      lastModified: new Date('2023-01-04'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '5',
      value: '- This is whatever for page 5.\n- It contains some amazing keywords.\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 5',
      lastModified: new Date('2023-01-05'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '6',
      value: '- NOW this is a todo.\n- LATER Another todo.\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 6',
      lastModified: new Date('2023-01-06'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '7',
      value: '- this has a #hashtag\n- this is another line\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 7',
      lastModified: new Date('2023-01-07'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '8',
      value: '- #starttag \n- this is another line\nThis is a multiline continuation',
      userId: 'user1',
      title: 'Page 8',
      lastModified: new Date('2023-01-08'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '9',
      value: '- [[Page 1]] some stuff\n- [[Page 2]] some more stuff\n- more text ^block-id',
      userId: 'user1',
      title: 'Page 9',
      lastModified: new Date('2023-01-09'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
    {
      id: '10',
      value: '- more text [[Page 9#^block-id]]\n - Now we are ready\n- NOW are you ready?',
      userId: 'user1',
      title: 'Page 10',
      lastModified: new Date('2023-01-10'),
      revisionNumber: 1,
      isJournal: false,
      deleted: false,
    },
  ];

  async function testFindFunction(terms: string[], statuses?: string[], wikilinks?: string[]): Promise<FormulaOutput | null> {
    const defaultArguments: DefaultArguments = {
      pages: mockPages
    };
    const userArguments: FormulaOutput[] = terms.map(arg => {
      const isNegated = arg.startsWith('!');
      const value = isNegated ? arg.slice(1) : arg;
      return {
        type: FormulaValueType.Text,
        output: value,
        isNegated
      };
    });
    const statusesLength = statuses?.length ?? 0;
    if (statuses && statusesLength > 0) {
      statuses.forEach(status => {
        const isNegated = status.startsWith('!');
        const value = isNegated ? status.slice(1) : status;
        userArguments.push({
          type: FormulaValueType.NodeTypeOrTypes,
          output: value,
          isNegated
        });
      });
    }
    if (wikilinks) {
      wikilinks.forEach(wikilink => {
        const isNegated = wikilink.startsWith('!');
        const value = isNegated ? wikilink.slice(1) : wikilink;
        userArguments.push({
          type: FormulaValueType.Wikilink,
          output: "[[" + value + "]]",
          isNegated
        });
      });
    }
    return await findCallback(defaultArguments, userArguments);
  }

  test('find() matches single keyword', async () => {
    const result = await testFindFunction(['"content"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(4);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 1');
    expect(output[1].baseNode.pageName).toBe('Page 1');
    expect(output[2].baseNode.pageName).toBe('Page 2');
    expect(output[3].baseNode.pageName).toBe('Page 2');
    expect(output[0].baseNode.nodeMarkdown).toContain('content');
    expect(output[1].baseNode.nodeMarkdown).toContain('content');
    expect(output[2].baseNode.nodeMarkdown).toContain('content');
    expect(output[3].baseNode.nodeMarkdown).toContain('content');
  });

  test('find() matches multiple keywords (AND logic)', async () => {
    const result = await testFindFunction(['"content"', '"keywords"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 1');
    expect(output[0].baseNode.nodeMarkdown).toContain('content');
    expect(output[0].baseNode.nodeMarkdown).toContain('keywords');
  });

  test('find() finds by todo status', async () => {
    const result = await testFindFunction([], ['now']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 10');
    expect(output[0].baseNode.nodeMarkdown).toContain('are you ready?');
    expect(output[1].baseNode.pageName).toBe('Page 6');
    expect(output[1].baseNode.nodeMarkdown).toContain('this is a todo');
  });

  test('find() matches OR clauses', async () => {
    const result = await testFindFunction([],['now|later']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(3);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 10');
    expect(output[1].baseNode.pageName).toBe('Page 6');
    expect(output[2].baseNode.pageName).toBe('Page 6');
    expect(output[0].baseNode.nodeMarkdown).toContain('are you ready?');
    expect(output[1].baseNode.nodeMarkdown).toContain('this is a todo');
    expect(output[2].baseNode.nodeMarkdown).toContain('Another todo');
  });

  test('find() matches in page title', async () => {
    const result = await testFindFunction(['"Page 1"','"keywords"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.nodeMarkdown).toContain('keywords');
    expect(output[0].baseNode.pageName).toBe('Page 1');
    expect(output[1].baseNode.nodeMarkdown).toContain('keywords');
    expect(output[1].baseNode.pageName).toBe('Page 1');
  });

  test('find() returns nested children', async () => {
    const result = await testFindFunction(['"shuffle"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.nodeMarkdown).toContain('Carolina');
    expect(output[0].baseNode.pageName).toBe('Page 4');
    expect(output[0].children).toHaveLength(1);
    expect(output[0].children[0].baseNode.nodeMarkdown).toContain('boogie');
  });

  test('find() includes multiline continuations', async () => {
    const result = await testFindFunction(['"amazing"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.nodeMarkdown).toContain('amazing');
    expect(output[0].baseNode.nodeMarkdown).toContain('\n');
    expect(output[0].baseNode.nodeMarkdown).toContain('multiline');
    expect(output[0].baseNode.pageName).toBe('Page 5');
  });

  test('find() finds by hashtag', async () => {
    const result = await testFindFunction(['"#hashtag"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.nodeMarkdown).toContain('hashtag');
    expect(output[0].baseNode.pageName).toBe('Page 7');
  });

  test('find() finds hashtag at beginning of line', async () => {
    const result = await testFindFunction(['"#starttag"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.nodeMarkdown).toContain('starttag');
    expect(output[0].baseNode.pageName).toBe('Page 8');
  });

  test('find() returns empty array when no matches', async () => {
    const result = await testFindFunction(['"nonexistent"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(0);
  });

  test('find() matches wikilinks passed as wikilinks', async () => {
    const result = await testFindFunction([], [], ['Page 1']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(4);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 1');
    expect(output[0].baseNode.nodeMarkdown).toBe('- This is content for page 1.');
    expect(output[1].baseNode.pageName).toBe('Page 1');
    expect(output[1].baseNode.nodeMarkdown).toBe('- It contains some keywords.\nla la la');
    expect(output[2].baseNode.pageName).toBe('Page 1');
    expect(output[2].baseNode.nodeMarkdown).toBe('- More text content with keywords here.');
    expect(output[3].baseNode.pageName).toBe('Page 9');
    expect(output[3].baseNode.nodeMarkdown).toBe('- [[Page 1]] some stuff');
  });

  test('find() matches wikilinks passed as text', async () => {
    const result = await testFindFunction(['[[Page 2]]']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 9');
    expect(output[0].baseNode.nodeMarkdown).toBe('- [[Page 2]] some more stuff');
  });

  test('find() matches block references', async () => {
    const result = await testFindFunction([], [],['Page 9#^block-id']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 10');
    expect(output[0].baseNode.nodeMarkdown).toBe('- more text [[Page 9#^block-id]]');
    expect(output[1].baseNode.pageName).toBe('Page 9');
    expect(output[1].baseNode.nodeMarkdown).toBe('- more text ^block-id');
  });

  test('can use not operator in find()', async () => {
    const result = await testFindFunction(['!"Another"'], ["todos"],[]);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 10');
    expect(output[0].baseNode.nodeMarkdown).toContain('are you ready?');
    expect(output[1].baseNode.pageName).toBe('Page 6');
    expect(output[1].baseNode.nodeMarkdown).toContain('this is a todo');
  });

  test('find() with negated todo status', async () => {
    const result = await testFindFunction(['"todo"'], ['!now'], []);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 6');
    expect(output[0].baseNode.nodeMarkdown).toBe('- LATER Another todo.\nThis is a multiline continuation');
  });

  test('find() with negated wikilink', async () => {
    const result = await testFindFunction([], [], ['!Page 1', 'Page 9']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(2);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 9');
    expect(output[0].baseNode.nodeMarkdown).toBe('- [[Page 2]] some more stuff');
    expect(output[1].baseNode.pageName).toBe('Page 9');
    expect(output[1].baseNode.nodeMarkdown).toBe('- more text ^block-id');
  });

  test('find() with multiple negated terms', async () => {
    const result = await testFindFunction(['!"keywords"', '!"content"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    const output = result!.output as NodeElementMarkdown[];
    expect(output.length).toBeGreaterThan(0);
    output.forEach(node => {
      expect(node.baseNode.nodeMarkdown.toLowerCase()).not.toContain('keywords');
      expect(node.baseNode.nodeMarkdown.toLowerCase()).not.toContain('content');
    });
  });

  test('find() with mixed negated and non-negated terms', async () => {
    const result = await testFindFunction(['!"Another"', '"todo"']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(1);
    const output = result!.output as NodeElementMarkdown[];
    expect(output[0].baseNode.pageName).toBe('Page 6');
    expect(output[0].baseNode.nodeMarkdown).toBe('- NOW this is a todo.');
  });

  test('find() todos only match todos', async () => {
    const result = await testFindFunction([], ['Page 10'], ['now']);
    expect(result?.type).toBe(FormulaValueType.NodeMarkdown);
    expect(result?.output).toHaveLength(0);
  });

  test('find() combines multiple status arguments', async () => {
    // First get all NOW todos
    const result1 = await testFindFunction([], ['now']);
    expect(result1?.output).toHaveLength(2);
    
    // Then get all todos except NOW todos (order matters - first add all todos, then negate NOW)
    const result2 = await testFindFunction([], ['todos', '!now']);
    expect(result2?.output).toHaveLength(1);
    expect(((result2?.output as NodeElementMarkdown[])[0]).baseNode.nodeMarkdown).toBe('- LATER Another todo.\nThis is a multiline continuation');
    
    // Then combine NOW and LATER explicitly
    const result3 = await testFindFunction([], ['now', 'later']);
    expect(result3?.output).toHaveLength(3);
    expect(((result3?.output as NodeElementMarkdown[])[0]).baseNode.nodeMarkdown).toContain('NOW');
    expect(((result3?.output as NodeElementMarkdown[])[1]).baseNode.nodeMarkdown).toContain('NOW');
    expect(((result3?.output as NodeElementMarkdown[])[2]).baseNode.nodeMarkdown).toContain('LATER');
  });
});
