import { parseFragmentedMarkdown, ContentBlockLocationCitation, CharLocationCitation } from './response-parser';
import { ChatContentItem } from '../formula/formula-definitions';

describe('parseFragmentedMarkdown', () => {
  it('should parse rich content without citations', () => {
    const input: ChatContentItem[] = [{
      type: 'text',
      text: 'While I don\'t see a specific recipe in the provided page content, I can help you with a gluten-free chocolate cake recipe. Here\'s a basic recipe:\n\nGluten-Free Chocolate Cake Recipe:\n\nIngredients:\n- 2 cups gluten-free all-purpose flour blend\n- 2 cups sugar\n- 3/4 cup unsweetened cocoa powder\n- 2 teaspoons baking soda\n- 1 teaspoon baking powder\n- 1 teaspoon salt\n- 2 eggs\n- 1 cup milk (or dairy-free alternative)\n- 1/2 cup vegetable oil\n- 2 teaspoons vanilla extract\n- 1 cup hot water\n\nInstructions:\n1. Preheat oven to 350°F (175°C). Grease and line two 9-inch cake pans.\n2. Mix all dry ingredients in a large bowl.\n3. Add eggs, milk, oil, and vanilla. Mix well.\n4. Stir in hot water. The batter will be thin.\n5. Pour into prepared pans.\n6. Bake for 30-35 minutes or until a toothpick comes out clean.\n7. Cool completely before frosting.\n\nNote: enjoy!'
    }];


    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(5);
    expect(result[0]?.content).toBe('While I don\'t see a specific recipe in the provided page content, I can help you with a gluten-free chocolate cake recipe. Here\'s a basic recipe:');
    expect(result[0]?.points).toBeUndefined();
    expect(result[1]?.content).toBe('Gluten-Free Chocolate Cake Recipe:');
    expect(result[1]?.points).toBeUndefined();
    expect(result[2]?.content).toBe('Ingredients:');
    expect(result[2]?.points).toBeDefined();
    expect(result[2]?.points?.[0]?.content).toBe('2 cups gluten-free all-purpose flour blend');
    expect(result[2]?.points?.[1]?.content).toBe('2 cups sugar');
    expect(result[2]?.points?.[2]?.content).toBe('3/4 cup unsweetened cocoa powder');
    expect(result[2]?.points?.[3]?.content).toBe('2 teaspoons baking soda');
    expect(result[2]?.points?.[4]?.content).toBe('1 teaspoon baking powder');
    expect(result[2]?.points?.[5]?.content).toBe('1 teaspoon salt');
    expect(result[2]?.points?.[6]?.content).toBe('2 eggs');
    expect(result[2]?.points?.[7]?.content).toBe('1 cup milk (or dairy-free alternative)');
    expect(result[2]?.points?.[8]?.content).toBe('1/2 cup vegetable oil');
    expect(result[2]?.points?.[9]?.content).toBe('2 teaspoons vanilla extract');
    expect(result[2]?.points?.[10]?.content).toBe('1 cup hot water');
    expect(result[3]?.content).toBe('Instructions:');
    expect(result[3]?.points).toBeDefined();
    expect(result[3]?.points?.[0]?.content).toBe('Preheat oven to 350°F (175°C). Grease and line two 9-inch cake pans.');
    expect(result[3]?.points?.[1]?.content).toBe('Mix all dry ingredients in a large bowl.');
    expect(result[3]?.points?.[2]?.content).toBe('Add eggs, milk, oil, and vanilla. Mix well.');
    expect(result[3]?.points?.[3]?.content).toBe('Stir in hot water. The batter will be thin.');
    expect(result[3]?.points?.[4]?.content).toBe('Pour into prepared pans.');
    expect(result[3]?.points?.[5]?.content).toBe('Bake for 30-35 minutes or until a toothpick comes out clean.');
    expect(result[3]?.points?.[6]?.content).toBe('Cool completely before frosting.');
    expect(result[4]?.content).toBe('Note: enjoy!');
    expect(result[4]?.points).toBeUndefined();
  });

  it('should parse a simple numbered list into sections', () => {
    const input: ChatContentItem[] = [{
      type: 'text',
      text: '1. First Section\n- Point 1\n- Point 2',
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('First Section');
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.content).toBe('Point 1');
    expect(result[0]?.points?.[1]?.content).toBe('Point 2');
  });

  it('should handle citations in text blocks', () => {
    const input: ChatContentItem[] = [{
      type: 'text',
      text: '\n\n1. Section with Citations\n- Cited point',
      citations: [{
        type: 'char_location',
        cited_text: 'Cited point',
        document_index: 0,
        document_title: 'Test Doc',
        start_char_index: 30,
        end_char_index: 41
      }]
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result[0]?.points?.[0]?.citations).toBeDefined();
    expect(result[0]?.points?.[0]?.citations?.length).toBe(1);
    expect(result[0]?.points?.[0]?.citations?.[0]?.cited_text).toBe('Cited point');
  });

  it('should handle content block citations', () => {
    const blockCitation: ContentBlockLocationCitation = {
      type: 'content_block_location',
      cited_text: 'Block cited point',
      document_index: 0,
      document_title: 'Test Doc',
      start_block_index: 1,
      end_block_index: 2
    };

    const input: ChatContentItem[] = [{
      type: 'text',
      text: '\n\n1. Section\n- Block cited point',
      citations: [blockCitation]
    }];

    const result = parseFragmentedMarkdown(input);
    
    const citation = result[0]?.points?.[0]?.citations?.[0] as ContentBlockLocationCitation;
    expect(citation?.type).toBe('content_block_location');
    expect(citation?.start_block_index).toBe(1);
  });

  it('should handle nested points in lists', () => {
    const input: ChatContentItem[] = [{
      type: 'text',
      text: '\n\n1. Section\n- Main point\n  - Subpoint 1\n  - Subpoint 2'
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result[0]?.points?.length).toBe(1);
    expect(result[0]?.points?.[0]?.content).toBe('Main point');
    expect(result[0]?.points?.[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.points?.[0]?.content).toBe('Subpoint 1');
    expect(result[0]?.points?.[0]?.points?.[1]?.content).toBe('Subpoint 2');
  });

  it('should handle multiple text blocks in the same section', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '\n\n1. Combined Section'
      },
      {
        type: 'text',
        text: '- First point'
      },
      {
        type: 'text',
        text: '- Second point'
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('Combined Section');
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.content).toBe('First point');
    expect(result[0]?.points?.[1]?.content).toBe('Second point');
  });

  it('should handle non-list text in sections', () => {
    const input: ChatContentItem[] = [{
      type: 'text',
      text: '\n\n1. Section\nSome preamble text\n- First point'
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(1);
    expect(result[0]?.points?.[0]?.content).toBe('Some preamble text');
    expect(result[0]?.points?.[0]?.points?.[0]?.content).toBe('First point');
  });

  it('should include non-numbered sections after numbered sections', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '\n\n1. Section\n- Point'
      },
      {
        type: 'text',
        text: '\n\nshould be a new section'
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(2);
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(1);
  });

  it('should include non-numbered sections before numbered sections', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: 'some non-numbered stuff'
      },
      {
        type: 'text',
        text: '\n\n1. Section\n- Point'
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(2);
    expect(result[1]?.points).toBeDefined();
    expect(result[1]?.points?.length).toBe(1);
  });

  it('should attach citations to a single point', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '\n\n3. Security and Session Management:\n'
      },
      {
        type: 'text',
        text: 'There are important security-related tasks:\n- Implement proper localStorage cleanup when users log out\n- Fix the logic error with the find function where find(\"lock\",todos,!done) is returning non-todos',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'event more cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 6,
            end_block_index: 7
          }
        ]
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(1);
    expect(result[0]?.points?.[0]?.content).toBe('There are important security-related tasks:');
    expect(result[0]?.points?.[0]?.points).toBeDefined();
    expect(result[0]?.points?.[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.points?.[0]?.content).toBe('Implement proper localStorage cleanup when users log out');
    expect(result[0]?.points?.[0]?.points?.[0]?.citations).toBeUndefined();
    expect(result[0]?.points?.[0]?.points?.[1]?.content).toBe('Fix the logic error with the find function where find(\"lock\",todos,!done) is returning non-todos');
    expect(result[0]?.points?.[0]?.points?.[1]?.citations?.length).toBe(1);
    expect(result[0]?.points?.[0]?.points?.[1]?.citations?.[0]?.cited_text).toBe('event more cited text');
  });

  /*it('should combine text blocks with citations after a numbered section', () => {
    const citation1: CharLocationCitation = {
      type: 'char_location',
      cited_text: 'First cited text',
      document_index: 0,
      document_title: 'Test Doc',
      start_char_index: 0,
      end_char_index: 15
    };

    const citation2: CharLocationCitation = {
      type: 'char_location',
      cited_text: 'Second cited text',
      document_index: 0,
      document_title: 'Test Doc',
      start_char_index: 20,
      end_char_index: 36
    };

    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '\n\n1. Section Header'
      },
      {
        type: 'text',
        text: 'First cited text\nwith a newline',
        citations: [citation1]
      },
      {
        type: 'text',
        text: 'Second cited text\nwith another newline',
        citations: [citation2]
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe('Section Header');
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.content).toBe('First cited text\nwith a newline');
    expect(result[0]?.points?.[0]?.citations).toBeDefined();
    expect(result[0]?.points?.[0]?.citations?.length).toBe(1);
    expect(result[0]?.points?.[0]?.citations?.[0]?.cited_text).toBe('First cited text');
    expect(result[0]?.points?.[1]?.content).toBe('Second cited text\nwith another newline');
    expect(result[0]?.points?.[1]?.citations).toBeDefined();
    expect(result[0]?.points?.[1]?.citations?.length).toBe(1);
    expect(result[0]?.points?.[1]?.citations?.[0]?.cited_text).toBe('Second cited text');
  });*/

  it('should nest properly under a non-numbered section', () => {
    const citation1: CharLocationCitation = {
      type: 'char_location',
      cited_text: 'First cited text',
      document_index: 0,
      document_title: 'Test Doc',
      start_char_index: 0,
      end_char_index: 15
    };

    const citation2: CharLocationCitation = {
      type: 'char_location',
      cited_text: 'Second cited text',
      document_index: 0,
      document_title: 'Test Doc',
      start_char_index: 20,
      end_char_index: 36
    };

    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: 'Section Header'
      },
      {
        type: 'text',
        text: '\n\n1. First cited text',
      },
      {
        type: 'text',
        text: '- Second cited text\n- with another newline',
        citations: [citation2]
      },
      {
        type: 'text',
        text: '\n\nnon-numbered section'
      },
      {
        type: 'text',
        text: '- First point\n- Second point',
        citations: [citation1]
      },
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(3);
    expect(result[2]?.content).toBe('non-numbered section');
    expect(result[2]?.points).toBeDefined();
    expect(result[2]?.points?.length).toBe(2);
    expect(result[2]?.points?.[0]?.content).toBe('First point');
    expect(result[2]?.points?.[1]?.content).toBe('Second point');
    expect(result[2]?.points?.[1]?.citations).toBeDefined();
    expect(result[2]?.points?.[1]?.citations?.length).toBe(1);
    expect(result[2]?.points?.[1]?.citations?.[0]?.cited_text).toBe('First cited text');
  });

  it('should deeply nest properly', () => {
    const citation1: CharLocationCitation = {
      type: 'char_location',
      cited_text: 'First cited text',
      document_index: 0,
      document_title: 'Test Doc',
      start_char_index: 0,
      end_char_index: 15
    };

    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: 'Section Header'
      },
      {
        type: 'text',
        text: '\n\n1. First cited text',
      },
      {
        type: 'text',
        text: 'We need to:\n- Second cited text\n- with another newline',
        citations: [citation1]
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(2);
    expect(result[1]?.content).toBe('First cited text');
    expect(result[1]?.points).toBeDefined();
    expect(result[1]?.citations).toBeUndefined();
    expect(result[1]?.points?.length).toBe(1);
    expect(result[1]?.points?.[0]?.content).toBe('We need to:');
    expect(result[1]?.points?.[0]?.points).toBeDefined();
    expect(result[1]?.points?.[0]?.citations).toBeUndefined();
    expect(result[1]?.points?.[0]?.points?.length).toBe(2);
    expect(result[1]?.points?.[0]?.points?.[0]?.content).toBe('Second cited text');
    expect(result[1]?.points?.[0]?.points?.[1]?.content).toBe('with another newline');
    expect(result[1]?.points?.[0]?.points?.[1]?.citations).toBeDefined();
    expect(result[1]?.points?.[0]?.points?.[1]?.citations?.length).toBe(1);
    expect(result[1]?.points?.[0]?.points?.[1]?.citations?.[0]?.cited_text).toBe('First cited text');
  });

  it('should parse complex multi-section document with citations', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: 'Based on the document, there are several high-priority tasks you could work on next. Here are the key MVP (Minimum Viable Product) items that seem most urgent:\n\n1. Database and System Issues:\n'
      },
      {
        type: 'text',
        text: 'There are some critical database-related tasks:\n- Release database lock when going into background\n- Fix logic error with the find function where find(\"lock\",todos,!done) is returning non-todos',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'some cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 6,
            end_block_index: 7
          }
        ]
      },
      {
        type: 'text',
        text: '\n\n2. User Experience Improvements:\n'
      },
      {
        type: 'text',
        text: 'Several UX issues need attention:\n- Address the confusion around the ask function not getting current page context\n- Fix the chronological sorting issue where new todos are being added to the end instead of the top of find node results\n- Implement page deletion confirmation\n- Build a nested chat interface',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'more cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 6,
            end_block_index: 7
          }
        ]
      },
      {
        type: 'text',
        text: '\n\n3. Security and Session Management:\n'
      },
      {
        type: 'text',
        text: 'There are important security-related tasks:\n- Implement proper localStorage cleanup when users log out',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'event more cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 6,
            end_block_index: 7
          }
        ]
      },
      {
        type: 'text',
        text: '\n\n4. Technical Debt:\n'
      },
      {
        type: 'text',
        text: 'There\'s a need to:\n- Refactor UI tests to be standalone and add more of them\n- Refactor formula-related code to make it less confusing',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'yes yes, cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 3,
            end_block_index: 4
          }
        ]
      },
      {
        type: 'text',
        text: '\n\n5. Testing:\n'
      },
      {
        type: 'text',
        text: 'Some testing tasks are pending:\n- Add tests for backlinks functionality\n- Review and update the save mechanism, particularly regarding queued updates and timing',
        citations: [
          {
            type: 'content_block_location',
            cited_text: 'and finally cited text',
            document_index: 0,
            document_title: 'orangetask top level',
            start_block_index: 6,
            end_block_index: 7
          }
        ]
      },
      {
        type: 'text',
        text: '\n\nSince these are all marked with #mvp tags or explicitly noted as technical debt, they represent the most important areas to focus on. I would recommend starting with either the database lock issues or the logic error with the find function, as these appear to be core functionality issues that could affect system stability.'
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    // Verify we have seven root-level nodes
    expect(result).toHaveLength(7);

    // Verify sections 2-6 have child points with citations
    for (let i = 1; i < 6; i++) {
      expect(result[i]?.points).toBeDefined();
      expect(result[i]?.points?.length).toBe(1);
      expect(result[i]?.points?.[0]?.citations).toBeUndefined();
      expect(result[i]?.points?.[0]?.points).toBeDefined();
      expect(result[i]?.points?.[0]?.points?.length).toBeGreaterThan(0);
      const length = result[i]?.points?.[0]?.points?.length;
      expect(length).toBeGreaterThan(0);
      if (length) expect(result[i]?.points?.[0]?.points?.[length - 1]?.citations).toBeDefined();
    }
  });
});
