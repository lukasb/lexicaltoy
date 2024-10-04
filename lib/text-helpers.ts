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

export function convertToUnorderedList(markdown: string): string {
  // First, replace multiple newlines with a single newline
  const normalizedMarkdown = markdown.replace(/\n{2,}/g, '\n');
  const lines = normalizedMarkdown.split('\n');
  let result = '';

  for (const line of lines) {
    if (/^\s*(\d+\.|-|\*|\+)\s/.test(line)) {
      // Existing list item
      const match = line.match(/^(\s*)/);
      const indent = match ? Math.floor(match[1].length / 2) : 0;
      const content = line.replace(/^\s*(\d+\.|-|\*|\+)\s/, '');
      result += `${'    '.repeat(indent + 1)}- ${content}\n`;
    } else {
      result += `- ${line.trim()}\n`;
    }
  }

  return result.trim();
}