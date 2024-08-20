export function highlightText(text: string, searchTerms: string): string {
  if (!searchTerms.trim()) return text;
  
  const terms = searchTerms.split(/\s+/).filter(term => term.length > 0);
  const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.replace(regex, '<mark class="highlight bg-yellow-200 dark:bg-yellow-700">$1</mark>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}