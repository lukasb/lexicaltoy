import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Node, List, ListItem, Paragraph, Text, InlineCode } from 'mdast';
import { ChatContentItem } from '../formula/formula-definitions';

export interface CharLocationCitation {
  type: 'char_location';
  cited_text: string;
  document_index: number;
  document_title: string;
  start_char_index: number;
  end_char_index: number;
}

export interface ContentBlockLocationCitation {
  type: 'content_block_location';
  cited_text: string;
  document_index: number;
  document_title: string;
  start_block_index: number;
  end_block_index: number;
}

export type Citation = CharLocationCitation | ContentBlockLocationCitation;

export interface Point {
  content: string;
  citations?: Citation[];
  points?: Point[];
}

function isPointWithPoints(value: any): value is Point & { points: Point[] } {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.content === 'string' &&
    Array.isArray(value.points)
  );
}

// Type guard to check if a node is a List
function isList(node: Node): node is List {
  return node.type === 'list';
}

// Type guard to check if a node is a Text or InlineCode
function isTextOrInlineCode(node: Node): node is Text | InlineCode {
  return node.type === 'text' || node.type === 'inlineCode';
}

// Additional type guards
function isParagraph(node: Node): node is Paragraph {
  return node.type === 'paragraph';
}

function isText(node: Node): node is Text {
  return node.type === 'text';
}

function isInlineCode(node: Node): node is InlineCode {
  return node.type === 'inlineCode';
}

export function parseFragmentedMarkdown(blocks: ChatContentItem[]): Point[] {
  const points: Point[] = [];
  let currentPoint = null as Point | null;
  let currentText = '';
  let currentCitations: Citation[] = [];

  const createPointFromText = (text: string, citations: Citation[] = []): Point | null => {
    const trimmedText = text.trim();
    if (!trimmedText) return null;
    const point: Point = {
      content: trimmedText,
      citations: citations.length > 0 ? citations : undefined,
      points: undefined
    };
    return point;
  };

  const processTextBlock = (text: string, citations: Citation[] = []) => {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numberedSectionMatch = line.match(/^(\d+)\.\s+(.*)/);

      if (numberedSectionMatch) {
        // Start a new numbered section
        if (currentText) {
          const point = createPointFromText(currentText, currentCitations);
          if (point && isPointWithPoints(currentPoint)) {
            currentPoint.points.push(point);
          } else if (point) {
            points.push(point);
          }
          currentText = '';
          currentCitations = [];
        }

        currentPoint = {
          content: numberedSectionMatch[2].trim(),
          points: [] as Point[]
        };
        points.push(currentPoint);
      } else if (line.trim().startsWith('-')) {
        // Handle bullet point
        if (currentText) {
          const point = createPointFromText(currentText, currentCitations);
          if (point && isPointWithPoints(currentPoint)) {
            currentPoint.points.push(point);
          } else if (point) {
            points.push(point);
          }
          currentText = '';
          currentCitations = [];
        }

        const indentLevel = line.search(/\S/);
        const bulletContent = line.replace(/^[\s-]*/, '').trim();
        const bulletPoint: Point = {
          content: bulletContent,
          citations: citations.length > 0 ? citations : undefined,
          points: undefined
        };
        
        if (indentLevel > 0 && currentPoint?.points?.length) {
          // This is a nested point
          const lastPoint = currentPoint.points[currentPoint.points.length - 1];
          if (!lastPoint.points) {
            lastPoint.points = [];
          }
          lastPoint.points.push(bulletPoint);
        } else if (currentPoint) {
          if (!currentPoint.points) {
            currentPoint.points = [] as Point[];
          }
          currentPoint.points.push(bulletPoint);
        } else {
          points.push(bulletPoint);
        }
      } else if (line.trim() === '' && i < lines.length - 1 && lines[i + 1].trim() === '') {
        // Double newline - create new section from accumulated text
        if (currentText) {
          const point = createPointFromText(currentText, currentCitations);
          if (point && isPointWithPoints(currentPoint)) {
            currentPoint.points.push(point);
          } else if (point) {
            points.push(point);
          }
        }
        currentText = '';
        currentCitations = [];
        currentPoint = null;
        i++; // Skip the second newline
      } else {
        // Accumulate regular text
        if (currentText && currentText.trim()) currentText += '\n';
        currentText += line;
        if (citations.length > 0 && !currentCitations.length) {
          currentCitations = citations;
        }
      }
    }

    // Handle any text remaining in the block
    if (currentText) {
      const point = createPointFromText(currentText, currentCitations);
      if (point && isPointWithPoints(currentPoint)) {
        currentPoint.points.push(point);
      } else if (point) {
        points.push(point);
      }
      currentText = '';
      currentCitations = [];
    }
  };

  // Process each block
  for (const block of blocks) {
    processTextBlock(block.text, block.citations);
  }

  return points;
}