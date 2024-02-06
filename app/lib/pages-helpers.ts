import { Page } from './definitions';

export function searchPages(pages: Page[], term: string): Page[] {
  const normalizedTerm = term.toLowerCase();
  return pages.filter(page => page.title.toLowerCase().includes(normalizedTerm));
}