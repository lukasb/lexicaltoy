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
  const context: { 
    currentParent: Point[],
    lastPoint?: Point
  } = { currentParent: rootPoints };

  for (const block of blocks) {
    if (block.type !== 'text') continue;

    const citations = block.citations;
    const markdown = block.text;
    const ast = processor.parse(markdown);
    const hasCitations = citations && citations.length > 0;

    // Process free-form text first
    const freeText = extractFlowingText(ast);
    if (freeText) {
      const shouldCreateNewPoint = 
        hasCitations ||
        !context.lastPoint ||
        (context.lastPoint.citations && context.lastPoint.citations.length > 0);

      if (shouldCreateNewPoint) {
        const newPoint: Point = {
          content: freeText,
          citations: citations,
        };
        context.currentParent.push(newPoint);
        context.lastPoint = newPoint;
      } else {
        if (context.lastPoint) {
          context.lastPoint.content += ` ${freeText}`;
        }
      }
    }

    // Then process lists
    visit(ast, (node: Node) => {
      if (isList(node)) {
        context.lastPoint = undefined;
        node.children.forEach((listItemNode: ListItem) => {
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
    });
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

  return point;
}

function extractFlowingText(node: Node): string {
  let text = '';
  visit(node, (child: Node) => {
    if (isTextOrInlineCode(child)) {
      text += child.value + ' ';
    }
    if (child.type === 'paragraph') {
      text += '\n';
    }
  });
  return text.trim();
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