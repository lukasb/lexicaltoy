import { 
  updateDescendant,
  BaseNodeMarkdown,
  NodeElementMarkdown,
} from './formula-definitions';

describe('updateDescendant', () => {
  // Helper function to create a BaseNodeMarkdown
  function createBaseNode(start: number, end: number, markdown: string): BaseNodeMarkdown {
    return {
      nodeMarkdown: markdown,
      pageName: 'TestPage',
      lineNumberStart: start,
      lineNumberEnd: end,
    };
  }

  // Helper function to create a NodeElementMarkdown
  function createNodeElement(start: number, end: number, markdown: string, children: NodeElementMarkdown[] = []): NodeElementMarkdown {
    return {
      baseNode: createBaseNode(start, end, markdown),
      children,
    };
  }

  test('updates root node', () => {
    const parent = createNodeElement(1, 3, '# Title\nContent\nMore content');
    const oldDescendant = parent.baseNode;
    const newDescendantMarkdown = '# New Title\nNew content';

    const result = updateDescendant(parent, oldDescendant, newDescendantMarkdown);

    expect(result.baseNode.nodeMarkdown).toBe(newDescendantMarkdown);
    expect(result.baseNode.lineNumberStart).toBe(1);
    expect(result.baseNode.lineNumberEnd).toBe(2);
  });

  test('updates child node', () => {
    const parent = createNodeElement(1, 5, '# Title', [
      createNodeElement(2, 3, 'Content\nMore content'),
      createNodeElement(4, 5, 'Even more\ncontent'),
    ]);
    const oldDescendant = parent.children[0].baseNode;
    const newDescendantMarkdown = 'New content\nExtra line\nAnother line';

    const result = updateDescendant(parent, oldDescendant, newDescendantMarkdown);

    expect(result.children[0].baseNode.nodeMarkdown).toBe(newDescendantMarkdown);
    expect(result.children[0].baseNode.lineNumberStart).toBe(2);
    expect(result.children[0].baseNode.lineNumberEnd).toBe(4);
    expect(result.children[1].baseNode.lineNumberStart).toBe(5);
    expect(result.children[1].baseNode.lineNumberEnd).toBe(6);
  });

  test('updates deeply nested node', () => {
    const parent = createNodeElement(1, 7, '# Title', [
      createNodeElement(2, 3, 'Content', [
        createNodeElement(3, 3, 'Nested content'),
      ]),
      createNodeElement(4, 7, 'More content', [
        createNodeElement(5, 6, 'Nested more', [
          createNodeElement(6, 6, 'Deeply nested'),
        ]),
        createNodeElement(7, 7, 'Last line'),
      ]),
    ]);
    const oldDescendant = parent.children[1].children[0].children[0].baseNode;
    const newDescendantMarkdown = 'New deeply\nnested content';

    const result = updateDescendant(parent, oldDescendant, newDescendantMarkdown);

    expect(result.children[1].children[0].children[0].baseNode.nodeMarkdown).toBe(newDescendantMarkdown);
    expect(result.children[1].children[0].children[0].baseNode.lineNumberStart).toBe(6);
    expect(result.children[1].children[0].children[0].baseNode.lineNumberEnd).toBe(7);
    expect(result.children[1].children[1].baseNode.lineNumberStart).toBe(8);
    expect(result.children[1].children[1].baseNode.lineNumberEnd).toBe(8);
  });

  test('handles reduction in lines', () => {
    const parent = createNodeElement(1, 5, '# Title', [
      createNodeElement(2, 3, 'Content\nMore content'),
      createNodeElement(4, 5, 'Even more\ncontent'),
    ]);
    const oldDescendant = parent.children[0].baseNode;
    const newDescendantMarkdown = 'Single line content';

    const result = updateDescendant(parent, oldDescendant, newDescendantMarkdown);

    expect(result.children[0].baseNode.nodeMarkdown).toBe(newDescendantMarkdown);
    expect(result.children[0].baseNode.lineNumberStart).toBe(2);
    expect(result.children[0].baseNode.lineNumberEnd).toBe(2);
    expect(result.children[1].baseNode.lineNumberStart).toBe(3);
    expect(result.children[1].baseNode.lineNumberEnd).toBe(4);
  });

  test('handles increase in lines', () => {
    const parent = createNodeElement(1, 5, '# Title', [
      createNodeElement(2, 2, 'Content'),
      createNodeElement(3, 5, 'More\ncontent\nhere'),
    ]);
    const oldDescendant = parent.children[0].baseNode;
    const newDescendantMarkdown = 'Expanded\ncontent\nwith\nmore\nlines';

    const result = updateDescendant(parent, oldDescendant, newDescendantMarkdown);

    expect(result.children[0].baseNode.nodeMarkdown).toBe(newDescendantMarkdown);
    expect(result.children[0].baseNode.lineNumberStart).toBe(2);
    expect(result.children[0].baseNode.lineNumberEnd).toBe(6);
    expect(result.children[1].baseNode.lineNumberStart).toBe(7);
    expect(result.children[1].baseNode.lineNumberEnd).toBe(9);
  });

  test('returns unchanged parent when descendant not found', () => {
    const parent = createNodeElement(1, 3, '# Title\nContent\nMore content');
    const nonExistentDescendant = createBaseNode(10, 11, 'Non-existent content');
    const newDescendantMarkdown = 'This should not be updated';

    const result = updateDescendant(parent, nonExistentDescendant, newDescendantMarkdown);

    expect(result).toEqual(parent);
  });
});