import { 
  splitMarkdownByNodes,
  removeFindNodes,
  findFormulaStartRegex
} from "./regex-callbacks";
import { NodeElementMarkdown } from "./formula-definitions";

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