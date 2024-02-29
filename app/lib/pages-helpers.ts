import { Page } from './definitions';

export function searchPages(pages: Page[], term: string): Page[] {
  const normalizedTerm = term.toLowerCase();

  const startsWithTerm = pages.filter(page => 
    page.title.toLowerCase().startsWith(normalizedTerm)
  );

  const includesTerm = pages.filter(page => 
    page.title.toLowerCase().includes(normalizedTerm) && 
    !page.title.toLowerCase().startsWith(normalizedTerm)
  );

  return [...startsWithTerm, ...includesTerm];
}

export function findMostRecentlyEditedPage(pages: Page[]): Page | null {
  if (!pages || pages.length === 0) {
    return null;
  }

  const mostRecentlyEditedPage = pages.reduce((latest, current) => {
    return latest.lastModified > current.lastModified ? latest : current;
  }, pages[0]);
  
  return mostRecentlyEditedPage;
}