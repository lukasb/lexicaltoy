import { ChatContentItem } from "./formula/formula-definitions";
import { parseFragmentedMarkdown, Point } from "./ai/response-parser";

export function highlightText(text: string, searchTerms: string): string {
  if (!searchTerms.trim()) return text;
  
  const terms = searchTerms.split(/\s+/).filter(term => term.length > 0);
  const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.replace(regex, '<mark class="highlight bg-yellow-200 dark:bg-yellow-700">$1</mark>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizeText(result: string): string {
  // Strip Markdown elements that could interfere with document structure
  //result = result.replace(/^#+\s/gm, '');  // Remove headings
  result = result.replace(/^(\s*)[-*+]\s/gm, '$1‣ ');  // Replace bullets with emoji, preserving leading whitespace
  
  // Replace two or more consecutive newlines with a single newline
  result = result.replace(/\n{2,}/g, '\n');
  
  // Indent all lines
  return result.split('\n')
    .map(line => line.trim() ? '  ' + line : '')
    .join('\n')
    .trim();
}

// God forgive me for the funky escaping we're doing here
export function convertToUnorderedList(markdown: string): string {
  // First, replace multiple newlines with a single newline
  const normalizedMarkdown = markdown.replace(/\n{2,}/g, '\n');
  const lines = normalizedMarkdown.split('\n');
  let result = '';
  let indent = 0;

  let inOrderedSublist = false;
  let orderedIndent = 0;

  for (const line of lines) {
    if (/^\s*\d+\.\s/.test(line)) {
      // Ordered list item
      const match = line.match(/^(\s*)/);
      orderedIndent = match ? Math.floor(match[1].length / 2) : 0;
      const content = line.replace(/^\s*\d+\.\s/, '');
      result += `${'▵'.repeat(indent + orderedIndent)}‣ ${content}\n`;
      inOrderedSublist = true;
    } else if (/^\s*(-|\*|\+)\s/.test(line)) {
      // Unordered list item
      const match = line.match(/^(\s*)/);
      const lineIndent = match ? Math.floor(match[1].length / 2) : 0;
      const content = line.replace(/^\s*(-|\*|\+)\s/, '');
      const totalIndent = inOrderedSublist ? 
        Math.max(indent + orderedIndent + 1, lineIndent) : 
        indent + lineIndent;
      result += `${'▵'.repeat(totalIndent)}‣ ${content}\n`;
    } else {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        // turn paragraphs into list items
        result += `‣ ${trimmedLine}\n`;
      } else {
        result += '\n';
      }
      indent = 1; // make sure that actual list items are indented below paragraphs
      inOrderedSublist = false;
    }
  }

  return result.trim();
}

export function convertChatResponsesToUnorderedList(chatResponses: ChatContentItem[]): string {
  const points = parseFragmentedMarkdown(chatResponses);
  console.log("points", points);
  const result: string[] = [];

  const processPoint = (point: Point, indent: number) => {
    const trimmedContent = point.content.trim();
    result.push(`${'▵'.repeat(indent)}‣ ${trimmedContent}\n`);
    if (point.points) {
      for (const subpoint of point.points) {
        processPoint(subpoint, indent + 1);
      }
    }
    if (point.citations) {
      result.push(`${'▵'.repeat(indent)}‣ Sources: ${point.citations.map(citation => "[[" + citation.document_title + "]]").join(', ')}\n`);
    }
  }

  for (const point of points) {
    processPoint(point, 0);
  }

  return result.join('');
}

export function convertChatResponsesToText(chatResponses: ChatContentItem[]): string {
  const points = parseFragmentedMarkdown(chatResponses);
  const result: string[] = [];

  const processPoint = (point: Point) => {
    let pointContent = point.content;
    // TODO for some reason points lose their trailing space when they're converted to text
    // so we add it back here with this ugly hack
    // also see above
    if (pointContent.endsWith('.') || pointContent.endsWith(':')) pointContent += ' ';
    result.push(pointContent);
    if (point.points) {
      for (const subpoint of point.points) {
        processPoint(subpoint);
      }
    }
  }

  for (const point of points) {
    processPoint(point);
  }

  return result.join('');
}

export function unescapeMarkdown(markdown: string): string {
  return markdown.replace(/‣/g, "-").replace(/▵/g, "    ");
}
