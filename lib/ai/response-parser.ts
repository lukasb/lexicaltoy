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
  const processor = remark();
  const rootPoints: Point[] = [];
  let currentSection: Point | null = null;
  let currentText = '';
  let currentCitations: Citation[] | undefined = undefined;

  function flushCurrentText() {
    if (currentText.trim()) {
      const point: Point = {
        content: currentText.trim(),
        citations: currentCitations
      };
      if (currentSection) {
        if (!currentSection.points) {
          currentSection.points = [];
        }
        currentSection.points.push(point);
      } else {
        rootPoints.push(point);
      }
      currentText = '';
      currentCitations = undefined;
    }
  }

  for (const block of blocks) {
    if (block.type !== 'text') continue;

    const citations = block.citations;
    const markdown = block.text;
    
    // Split the text into lines and process each line
    const lines = markdown.split('\n');
    let lineBuffer = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Handle blank lines
      if (!trimmedLine) {
        // Flush any accumulated text
        if (lineBuffer.trim()) {
          currentText = lineBuffer.trim();
          currentCitations = citations;
          flushCurrentText();
          lineBuffer = '';
        }
        continue;
      }
      
      // If we hit a section header
      if (trimmedLine.match(/^\d+\./)) {
        // Flush any accumulated text
        if (lineBuffer.trim()) {
          currentText = lineBuffer.trim();
          currentCitations = citations;
          flushCurrentText();
          lineBuffer = '';
        }
        
        // Start a new section
        currentSection = {
          content: trimmedLine.replace(/^\d+\.\s*/, ''),
          citations: citations,
          points: []
        };
        rootPoints.push(currentSection);
      }
      // If we hit a list item
      else if (trimmedLine.startsWith('-')) {
        // Flush any accumulated text
        if (lineBuffer.trim()) {
          currentText = lineBuffer.trim();
          currentCitations = citations;
          flushCurrentText();
          lineBuffer = '';
        }

        const ast = processor.parse(trimmedLine);
        visit(ast, (node: Node) => {
          if (isList(node)) {
            node.children.forEach((listItemNode: ListItem) => {
              const point = parseListItem(listItemNode, citations);
              if (currentSection) {
                if (!currentSection.points) {
                  currentSection.points = [];
                }
                currentSection.points.push(point);
              } else {
                rootPoints.push(point);
              }
            });
          }
        });
      }
      // Otherwise accumulate the text
      else if (trimmedLine) {
        // If this is non-list text and not a section header, it should be at root level
        if (!currentSection || !lineBuffer) {
          if (lineBuffer.trim()) {
            currentText = lineBuffer.trim();
            currentCitations = citations;
            flushCurrentText();
            lineBuffer = '';
          }
          currentSection = null;
        }
        if (lineBuffer && !lineBuffer.endsWith('\n')) {
          lineBuffer += '\n';
        }
        lineBuffer += line;  // Keep original whitespace for non-empty lines
      }
    }

    // Flush any remaining text in the buffer
    if (lineBuffer.trim()) {
      currentText = lineBuffer.trim();
      currentCitations = citations;
      flushCurrentText();
    }
  }

  return rootPoints.filter(p => p.content.trim().length > 0);
}

function processListChild(list: List, context: { currentParent: Point[] }, citations?: Citation[]) {
  list.children.forEach(listItemNode => {
    const point = parseListItem(listItemNode, citations);
    context.currentParent.push(point);
    if (point.points) {
      const prevParent = context.currentParent;
      context.currentParent = point.points;
      visit(listItemNode, (child: Node) => {
        if (isList(child)) processListChild(child, context, citations);
      });
      context.currentParent = prevParent;
    }
  });
}

function parseListItem(listItem: ListItem, citations?: Citation[]): Point {
  const point: Point = {
    content: '',
    citations: citations,
  };

  listItem.children.forEach(child => {
    if (isParagraph(child)) {
      point.content = getParagraphText(child);
    } else if (isList(child)) {
      point.points = [];
      // Nested lists will be processed in processListChild
    }
  });

  // Remove empty points array if no nested items were added
  if (point.points && point.points.length === 0) {
    delete point.points;
  }

  return point;
}

function extractFlowingText(node: Node): string {
  let text = '';
  visit(node, (child: Node) => {
    // Skip text content from list items to avoid duplication
    if (child.type === 'list' || child.type === 'listItem') {
      return 'skip';
    }
    if (isTextOrInlineCode(child)) {
      text += child.value;
    }
    if (child.type === 'paragraph') {
      text += '\n';
    }
  });
  return text.replace(/^\n+|\n+$/g, '');
}

function getParagraphText(paragraph: Paragraph): string {
  return paragraph.children
    .map((child) => {
      if (isText(child)) return child.value;
      if (isInlineCode(child)) return `\`${child.value}\``;
      return '';
    })
    .join('');
}