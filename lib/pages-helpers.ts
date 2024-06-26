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

const STORAGE_KEY = "pinnedPageIds";

export function serializePagePins(pageIds: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pageIds));
  }
}

export function deserializePagePins(): string[] {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }
  return [];
}

export function togglePagePin(pageId: string, pinnedPageIds: string[]): string[] {
  const index = pinnedPageIds.indexOf(pageId);
  if (index > -1) {
    pinnedPageIds.splice(index, 1);
  } else {
    pinnedPageIds.push(pageId);
  }
  serializePagePins(pinnedPageIds);
  return pinnedPageIds;
}

export function getPinnedPageIds(): string[] {
  return deserializePagePins();
}
