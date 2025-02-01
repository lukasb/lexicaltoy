import { splitMarkdownByNodes } from './markdown-helpers';

describe('splitMarkdownByNodes', () => {
  it('should correctly split markdown with mixed content including formulas and nested lists', () => {
    const markdown = `Hmmm ... need to figure out meaning of life today.
- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- =find("#parser")
- =ask("What is the meaning of life?") |||result: There has been much debate on this topic.
The most common answer is 42.
|||
- =why 42? |||result: Because 6*7=42|||
- LATER write a letter to grandma
- DONE make a cake
- Who should I invite?
    - John
 John's spouse
    - Jane
    - Mary`;

    const result = splitMarkdownByNodes(markdown, 'test-page');
    
    // Should return 10 top-level nodes
    expect(result).toHaveLength(10);

    // Test first node (non-list text)
    expect(result[0].baseNode.nodeMarkdown).toBe('Hmmm ... need to figure out meaning of life today.');
    expect(result[0].children).toHaveLength(0);

    // Test basic list items
    expect(result[1].baseNode.nodeMarkdown).toBe('- TODO buy groceries');
    expect(result[2].baseNode.nodeMarkdown).toBe('- DOING prepare taxes');
    expect(result[3].baseNode.nodeMarkdown).toBe('- NOW call janet');

    // Test formula nodes
    expect(result[4].baseNode.nodeMarkdown).toBe('- =find("#parser")');
    
    // Test multiline formula result
    expect(result[5].baseNode.nodeMarkdown).toBe(`- =ask("What is the meaning of life?") |||result: There has been much debate on this topic.
The most common answer is 42.
|||`);

    // Test single line formula result
    expect(result[6].baseNode.nodeMarkdown).toBe('- =why 42? |||result: Because 6*7=42|||');

    // Test more basic list items
    expect(result[7].baseNode.nodeMarkdown).toBe('- LATER write a letter to grandma');
    expect(result[8].baseNode.nodeMarkdown).toBe('- DONE make a cake');

    // Test nested list structure
    const lastNode = result[9];
    expect(lastNode.baseNode.nodeMarkdown).toBe('- Who should I invite?');
    expect(lastNode.children).toHaveLength(3);

    // Test nested items as children
    expect(lastNode.children[0].baseNode.nodeMarkdown).toBe('    - John\n John\'s spouse');
    expect(lastNode.children[1].baseNode.nodeMarkdown).toBe('    - Jane');
    expect(lastNode.children[2].baseNode.nodeMarkdown).toBe('    - Mary');

    // Test that nested items are properly indented
    expect(lastNode.children[0].baseNode.nodeMarkdown.startsWith('    -')).toBe(true);
    expect(lastNode.children[1].baseNode.nodeMarkdown.startsWith('    -')).toBe(true);
    expect(lastNode.children[2].baseNode.nodeMarkdown.startsWith('    -')).toBe(true);

    // Test line numbers
    expect(result[0].baseNode.lineNumberStart).toBe(1);
    expect(result[0].baseNode.lineNumberEnd).toBe(1);
    
    // Test multiline formula line numbers
    const formulaNode = result[5];
    expect(formulaNode.baseNode.lineNumberStart).toBe(6);
    expect(formulaNode.baseNode.lineNumberEnd).toBe(8);
  });
}); 