import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Node, List, ListItem, Paragraph, Text, InlineCode } from 'mdast';

interface Citation {
  type: string;
  cited_text: string;
  document_index: number;
  document_title: string;
  start_block_index: number;
  end_block_index: number;
}

interface SubPoint {
  content: string;
  citations: Citation[];
}

interface Point {
  content: string;
  subpoints: SubPoint[];
  citations: Citation[];
}

interface Section {
  title: string;
  points: Point[];
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

// Add this type guard function
function isSection(section: Section | null): section is Section {
  return section !== null;
}

export async function parseFragmentedMarkdown(blocks: any[]): Promise<Section[]> {
  const processor = remark();
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let pendingSectionContent: string[] = [];

  for (const block of blocks) {
    if (block.type !== 'text') continue;

    const citations = block.citations || [];
    const markdown = block.text;
    const ast = processor.parse(markdown);

    // Handle section titles that might be split across blocks
    let hasProcessedStructure = false;

    visit(ast, (node: Node) => {
      if (isList(node)) {
        hasProcessedStructure = true;
        if (node.ordered) {
          // Process numbered sections
          node.children.forEach((listItemNode: ListItem) => {
            const section = parseSection(listItemNode);
            currentSection = section;
            sections.push(section);
          });
        } else {
          // Process points under current section
          node.children.forEach((listItemNode: ListItem) => {
            const point = parsePoint(listItemNode, citations);
            if (isSection(currentSection)) {
              currentSection.points.push(point);
            }
          });
        }
      }
    });

    // Handle text that belongs to current section but isn't in list structure
    if (!hasProcessedStructure && currentSection !== null) {
      const content = extractFlowingText(ast);
      const section: Section = currentSection;
      
      if (content) {
        if (section.points.length === 0) {
          // Add as section preamble text
          section.points.push(createTextPoint(content, citations));
        } else {
          // Append to last point
          const lastPoint = section.points[section.points.length - 1];
          lastPoint.content += '\n' + content;
        }
      }
    }
  }

  return sections;
}

function parseSection(listItem: ListItem): Section {
  let title = '';
  listItem.children.forEach(child => {
    if (isParagraph(child)) {
      title = getParagraphText(child);
    }
  });
  return { title, points: [] };
}

function parsePoint(listItem: ListItem, citations: Citation[]): Point {
  let content = '';
  const subpoints: SubPoint[] = [];
  
  listItem.children.forEach(child => {
    if (isParagraph(child)) {
      content = getParagraphText(child);
    } else if (isList(child)) {
      subpoints.push(...parseSubpoints(child, citations));
    }
  });
  
  return {
    content,
    subpoints,
    citations: [...citations],
  };
}

function parseSubpoints(list: List, citations: Citation[]): SubPoint[] {
  return list.children.map(subItem => {
    let content = '';
    if (!('children' in subItem)) return { content: '', citations: [...citations] };
    
    subItem.children.forEach(child => {
      if (isParagraph(child)) {
        content = getParagraphText(child);
      }
    });
    return {
      content,
      citations: [...citations],
    };
  });
}

function createTextPoint(content: string, citations: Citation[]): Point {
  return {
    content,
    subpoints: [],
    citations: [...citations]
  };
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