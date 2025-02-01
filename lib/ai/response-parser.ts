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
    let bulletPoints: Point[] = [];
    let pendingText = '';
    let isNewSection = true;
    let pendingCitations = citations;
    let lastLineWasEmpty = false;
    
    const flushPendingText = () => {
      if (pendingText) {
        const point = createPointFromText(pendingText, pendingCitations);
        if (point) {
          points.push(point);
        }
        pendingText = '';
        pendingCitations = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const numberedSectionMatch = line.match(/^(\d+)\.\s+(.*)/);
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
      const hasDoubleNewline = prevLine.trim() === '' && (i > 1 && lines[i - 2].trim() === '');
      const isEndOfBlock = i === lines.length - 1 || (nextLine.trim() === '' && (i < lines.length - 2 && lines[i + 2].trim() === ''));

      if (line.trim() === '') {
        if (lastLineWasEmpty) {
          // Double newline - create new section from accumulated text
          flushPendingText();
          currentPoint = null;
          isNewSection = true;
          lastLineWasEmpty = false;
          continue;
        }
        lastLineWasEmpty = true;
        continue;
      } else {
        const isAfterDoubleNewline = lastLineWasEmpty && prevLine.trim() === '';
        lastLineWasEmpty = false;

        // Check for section breaks in text
        if (line.includes(':') && !line.trim().startsWith('-') && !numberedSectionMatch) {
          flushPendingText();
          const newPoint = {
            content: line.trim(),
            points: [] as Point[]
          };
          // If we're after a numbered section and not after a double newline, nest under it
          if (currentPoint && !isAfterDoubleNewline && points.length > 0 && points[points.length - 1] === currentPoint) {
            if (!currentPoint.points) currentPoint.points = [];
            currentPoint.points.push(newPoint);
          } else {
            points.push(newPoint);
          }
          currentPoint = newPoint;
          continue;
        }

        if (numberedSectionMatch) {
          // Handle numbered items that should be sub-points
          flushPendingText();
          const bulletContent = numberedSectionMatch[2].trim();
          const bulletPoint: Point = {
            content: bulletContent,
            points: undefined
          };

          if (currentPoint && !isAfterDoubleNewline) {
            if (!currentPoint.points) {
              currentPoint.points = [] as Point[];
            }
            currentPoint.points.push(bulletPoint);
            
            // Only attach citations to the last bullet point
            if (citations.length > 0 && isEndOfBlock) {
              bulletPoint.citations = citations;
            }
          } else {
            points.push(bulletPoint);
            currentPoint = bulletPoint;
          }
        } else if (line.trim().startsWith('-')) {
          // If we have pending text before bullet points, create a parent point
          if (pendingText) {
            const parentPoint: Point = {
              content: pendingText.trim(),
              points: []
            };
            if (currentPoint && !isAfterDoubleNewline) {
              if (!currentPoint.points) currentPoint.points = [];
              currentPoint.points.push(parentPoint);
            } else {
              points.push(parentPoint);
            }
            currentPoint = parentPoint;
            pendingText = '';
            pendingCitations = [];
          }

          const indentLevel = line.search(/\S/);
          const bulletContent = line.replace(/^[\s-]*/, '').trim();
          const bulletPoint: Point = {
            content: bulletContent,
            points: undefined
          };
          
          if (indentLevel > 0 && currentPoint?.points?.length) {
            // This is a nested point
            const lastPoint = currentPoint.points[currentPoint.points.length - 1];
            if (!lastPoint.points) {
              lastPoint.points = [];
            }
            lastPoint.points.push(bulletPoint);
            
            // Only attach citations to the last bullet point
            if (citations.length > 0 && isEndOfBlock) {
              bulletPoint.citations = citations;
            }
          } else if (currentPoint) {
            if (!currentPoint.points) {
              currentPoint.points = [] as Point[];
            }
            currentPoint.points.push(bulletPoint);
            
            // Only attach citations to the last bullet point
            if (citations.length > 0 && isEndOfBlock) {
              bulletPoint.citations = citations;
            }
          } else {
            // If no current point exists, try to attach to the last point
            const lastPoint = points[points.length - 1];
            if (lastPoint) {
              if (!lastPoint.points) {
                lastPoint.points = [];
              }
              lastPoint.points.push(bulletPoint);
              currentPoint = lastPoint;
            } else {
              points.push(bulletPoint);
            }
            
            // Only attach citations to the last bullet point
            if (citations.length > 0 && isEndOfBlock) {
              bulletPoint.citations = citations;
            }
          }
        } else {
          isNewSection = false;
          // Accumulate regular text
          if (!line.trim().startsWith('-')) {
            if (pendingText && pendingText.trim()) pendingText += '\n';
            pendingText += line;
            if (isEndOfBlock) {
              flushPendingText();
              currentPoint = null;  // Reset current point after flushing
            }
          }
        }
      }
    }

    // Handle any text remaining in the block
    flushPendingText();

    // Clean up empty points arrays
    for (const point of points) {
      if (point.points && point.points.length === 0) {
        point.points = undefined;
      }
    }
  };

  // Process each block
  for (const block of blocks) {
    processTextBlock(block.text, block.citations);
  }

  return points;
}