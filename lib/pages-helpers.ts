import { Page } from './definitions';
import { createHeadlessEditor } from '@lexical/headless';
import { 
  $convertToMarkdownString, 
  TRANSFORMERS
} from '@lexical/markdown';
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { WikilinkNode, WikilinkInternalNode } from "@/_app/nodes/WikilinkNode";
import { TodoCheckboxStatusNode } from "@/_app/nodes/TodoNode";
import { FormulaEditorNode, FormulaDisplayNode } from "@/_app/nodes/FormulaNode";

export function searchPageTitles(pages: Page[], term: string): Page[] {
  const normalizedTerm = term.toLowerCase();
  const startsWithTerm = pages.filter((page) =>
    page.title.toLowerCase().startsWith(normalizedTerm)
  );
  const includesTerm = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(normalizedTerm) &&
      !page.title.toLowerCase().startsWith(normalizedTerm)
  );
  return [...startsWithTerm, ...includesTerm];
}

export async function searchPages(pages: Page[], term: string): Promise<Page[]> {
  const normalizedTerm = term.toLowerCase();
  const titleStartsWith: Page[] = [];
  const titleIncludes: Page[] = [];
  const contentIncludes: Page[] = [];

  pages.forEach(page => {
    const normalizedTitle = page.title.toLowerCase();
    const normalizedValue = page.value.toLowerCase();

    if (normalizedTitle.startsWith(normalizedTerm)) {
      titleStartsWith.push(page);
    } else if (normalizedTitle.includes(normalizedTerm)) {
      titleIncludes.push(page);
    } else if (normalizedValue.includes(normalizedTerm)) {
      contentIncludes.push(page);
    }
  });

  return [...titleStartsWith, ...titleIncludes, ...contentIncludes];
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
    const editor = createHeadlessEditor({
      nodes: [
        LinkNode,
        ListNode,
        ListItemNode,
        AutoLinkNode,
        WikilinkNode,
        WikilinkInternalNode,
        TodoCheckboxStatusNode,
        FormulaEditorNode,
        FormulaDisplayNode,
      ],
      onError: console.error,
    });
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

const STORAGE_KEY = "pinnedPages";

export function serializePagePins(pages: Page[]): void {
  const pinnedState = pages.reduce((acc, page) => {
    acc[page.id] = page.pinned;
    return acc;
  }, {} as Record<string, boolean>);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedState));
}

export function deserializePagePins(pages: Page[]): Page[] {
  const pinnedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  
  return pages.map(page => ({
    ...page,
    pinned: pinnedState[page.id] || false
  }));
}

export function serializePagePin(page: Page): void {
  const pinnedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  pinnedState[page.id] = page.pinned;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedState));
}

export function togglePagePin(page: Page): Page {
  page.pinned = !page.pinned;
  serializePagePin(page);
  return page;
}

export function getPinnedPageIds(): string[] {
  const pinnedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return Object.keys(pinnedState).filter(id => pinnedState[id]);
}