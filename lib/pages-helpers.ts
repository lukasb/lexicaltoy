import { Page } from './definitions';

export function searchPages(pages: Page[], searchTerm: string): Page[] {
  const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);
  
  if (searchTerms.length === 0) return [];

  return pages.reduce((results, page) => {
    const matchedTerms = new Set<string>();

    searchTerms.forEach(term => {
      const lowercaseTerm = term.toLowerCase();
      if (page.title.toLowerCase().includes(lowercaseTerm)) {
        matchedTerms.add(lowercaseTerm);
      } else if (page.value.toLowerCase().includes(lowercaseTerm)) {
        matchedTerms.add(lowercaseTerm);
      }
    });

    if (matchedTerms.size === searchTerms.length) {
      if (searchTerms.every(term => page.title.toLowerCase().includes(term.toLowerCase()))) {
        results[0].push(page);
      } else if (searchTerms.some(term => page.title.toLowerCase().includes(term.toLowerCase()))) {
        results[1].push(page);
      } else {
        results[2].push(page);
      }
    }

    return results;
  }, [[], [], []] as [Page[], Page[], Page[]]).flat();
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

const PINNED_STORAGE_KEY = "pinnedPageIds";
const COLLAPSED_STORAGE_KEY = "collapsedPageIds";

type PageStateKey = "pinned" | "collapsed";

function serializePageState(pageIds: string[], stateKey: PageStateKey): void {
  if (typeof window !== 'undefined') {
    const storageKey = stateKey === "pinned" ? PINNED_STORAGE_KEY : COLLAPSED_STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(pageIds));
  }
}

function deserializePageState(stateKey: PageStateKey): string[] {
  if (typeof window !== 'undefined') {
    const storageKey = stateKey === "pinned" ? PINNED_STORAGE_KEY : COLLAPSED_STORAGE_KEY;
    return JSON.parse(localStorage.getItem(storageKey) || '[]');
  }
  return [];
}

function togglePageState(pageId: string, stateKey: PageStateKey): string[] {
  const currentState = deserializePageState(stateKey);
  const index = currentState.indexOf(pageId);
  if (index > -1) {
    currentState.splice(index, 1);
  } else {
    currentState.push(pageId);
  }
  serializePageState(currentState, stateKey);
  return currentState;
}

export function togglePagePin(pageId: string): string[] {
  return togglePageState(pageId, "pinned");
}

export function togglePageCollapse(pageId: string): string[] {
  return togglePageState(pageId, "collapsed");
}

export function getPinnedPageIds(): string[] {
  return deserializePageState("pinned");
}

export function getCollapsedPageIds(): string[] {
  return deserializePageState("collapsed");
}

export function isPagePinned(pageId: string): boolean {
  return getPinnedPageIds().includes(pageId);
}

export function isPageCollapsed(pageId: string): boolean {
  return getCollapsedPageIds().includes(pageId);
}