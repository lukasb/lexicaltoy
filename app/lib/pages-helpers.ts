import { Page } from './definitions';
import { createHeadlessEditor } from '@lexical/headless';
import { 
  $convertToMarkdownString, 
  TRANSFORMERS,
  $convertFromMarkdownString
} from '@lexical/markdown';
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { WikilinkNode, WikilinkInternalNode } from "../nodes/WikilinkNode";
import { TodoCheckboxStatusNode } from "@/app/nodes/TodoNode";
import { FormulaEditorNode, FormulaDisplayNode } from "@/app/nodes/FormulaNode";

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