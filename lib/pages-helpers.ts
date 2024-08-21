import { Page } from './definitions';
import { 
  $convertToMarkdownString, 
  TRANSFORMERS
} from '@lexical/markdown';
import { myCreateHeadlessEditor } from './editor-utils';

export function searchPageTitles(pages: Page[], term: string): Page[] {
  const normalizedTerm = term.toLowerCase();
  const result: Page[] = [];
  const includesTerm: Page[] = [];

  for (const page of pages) {
    const normalizedTitle = page.title.toLowerCase();
    if (normalizedTitle.startsWith(normalizedTerm)) {
      result.push(page);
    } else if (normalizedTitle.includes(normalizedTerm)) {
      includesTerm.push(page);
    }
  }

  return result.concat(includesTerm);
}

export function searchPages(pages: Page[], searchTerm: string): Page[] {
  const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);
  
  if (searchTerms.length === 0) return [];

  return pages.reduce((results, page) => {
    const termsInTitle = searchTerms.filter(term => 
      page.title.toLowerCase().includes(term.toLowerCase())
    );

    if (termsInTitle.length === searchTerms.length) {
      results[0].push(page);
    } else if (termsInTitle.length > 0) {
      const termsInContent = searchTerms.filter(term => 
        page.value.toLowerCase().includes(term.toLowerCase())
      );
      if ((termsInTitle.length + termsInContent.length) === searchTerms.length) {
        results[1].push(page);
      }
    } else {
      const termsInContent = searchTerms.filter(term => 
        page.value.toLowerCase().includes(term.toLowerCase())
      );
      if (termsInContent.length === searchTerms.length) {
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

function getPageMarkdownInternal(page: Page): Promise<string> {
  return new Promise((resolve, reject) => {
    const editor = myCreateHeadlessEditor();
    editor.setEditorState(editor.parseEditorState(page.value));
    try {
      editor.update(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS);
        resolve(markdown);
      });
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
}

export async function getPageMarkdown(page: Page): Promise<string> {
  try {
    const markdown = await getPageMarkdownInternal(page);
    return markdown;
  } catch (e) {
    console.error(e);
    return "";
  } 
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