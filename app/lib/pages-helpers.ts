import { Page } from './definitions';

export function searchPages(pages: Page[], term: string): Page[] {
  const normalizedTerm = term.toLowerCase();
  return pages.filter(page => page.title.toLowerCase().includes(normalizedTerm));
}

export function findMostRecentlyEditedPage(pages: Page[]): Page {
  const mostRecentlyEditedPage = pages.reduce((latest, current) => {
    return latest.lastModified > current.lastModified ? latest : current;
  }, pages[0]);
  
  return mostRecentlyEditedPage;
}