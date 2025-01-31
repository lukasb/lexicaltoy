import { parseFragmentedMarkdown, ContentBlockLocationCitation, CharLocationCitation } from './response-parser';
import { ChatContentItem } from '../formula/formula-definitions';

describe('parseFragmentedMarkdown', () => {
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
      text: '1. Section with Citations\n- Cited point',
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
      text: '1. Section\n- Block cited point',
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
      text: '1. Section\n- Main point\n  - Subpoint 1\n  - Subpoint 2'
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result[0]?.points?.[0]?.content).toBe('Main point');
    expect(result[0]?.points?.[0]?.points).toBeDefined();
    expect(result[0]?.points?.[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.points?.[0]?.content).toBe('Subpoint 1');
    expect(result[0]?.points?.[0]?.points?.[1]?.content).toBe('Subpoint 2');
  });

  it('should handle multiple text blocks in the same section', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '1. Combined Section'
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
      text: '1. Section\nSome preamble text\n- First point'
    }];

    const result = parseFragmentedMarkdown(input);
    
    expect(result[0]?.points).toBeDefined();
    expect(result[0]?.points?.length).toBe(2);
    expect(result[0]?.points?.[0]?.content).toBe('Some preamble text');
    expect(result[0]?.points?.[1]?.content).toBe('First point');
  });

  it('should include non-numbered sections after numbered sections', () => {
    const input: ChatContentItem[] = [
      {
        type: 'text',
        text: '1. Section\n- Point'
      },
      {
        type: 'text',
        text: 'not a valid section'
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
        text: '1. Section\n- Point'
      }
    ];

    const result = parseFragmentedMarkdown(input);
    
    expect(result).toHaveLength(2);
    expect(result[1]?.points).toBeDefined();
    expect(result[1]?.points?.length).toBe(1);
  });

  it('should combine text blocks with citations after a numbered section', () => {
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
        text: '1. Section Header'
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
    expect(result[0]?.points?.length).toBe(1);
    
    const combinedPoint = result[0]?.points?.[0];
    expect(combinedPoint?.content).toBe('First cited text\nwith a newline\nSecond cited text\nwith another newline');
    expect(combinedPoint?.citations).toBeDefined();
    expect(combinedPoint?.citations?.length).toBe(2);
    expect(combinedPoint?.citations?.[0]).toEqual(citation1);
    expect(combinedPoint?.citations?.[1]).toEqual(citation2);
  });
});
