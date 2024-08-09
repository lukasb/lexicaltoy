import { 
  FormulaOutput,
  FormulaOutputType
} from './formula-definitions';
import { 
  DialogueElement,
  getShortGPTChatResponse,
 } from '@/lib/ai';
import { Page } from '@/lib/definitions';
import { getPageMarkdown } from '@/lib/pages-helpers';
import { stripBrackets } from '@/lib/transform-helpers';
import { getLastSixWeeksJournalPages } from '@/lib/journal-helpers';
import { regexCallbacks } from './regex-callbacks';
import { WIKILINK_REGEX, extractWikilinks } from '@/lib/text-utils';
import { LexicalEditor, $getNodeByKey } from 'lexical';
import { ListItemNode } from '@lexical/list';
import { $isFormulaDisplayNode } from '@/_app/nodes/FormulaNode';
import { $isListItemNode } from '@lexical/list';

const todoInstructions = `
Below you'll see the contents of one or more pages. Pages may include to-do list items that look like this:

Example content:
- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- LATER write a letter to grandma
- DONE make a cake

Items marked with DONE are complete, all other items are incomplete.
User content:
`;

async function getPagesContext(pageSpecs: string[], pages: Page[]): Promise<string | null> {
  const uniquePages = new Set<Page>();

  async function addPages(pageSpec: string) {
    const pageTitle = stripBrackets(pageSpec);

    if (pageTitle.endsWith("/")) {
      if (pageTitle === "journals/") {
        const journalPages = await getLastSixWeeksJournalPages(pages);
        journalPages.forEach(page => uniquePages.add(page));
      } else {
        pages
          .filter(p => p.title.startsWith(pageTitle.slice(0, -1)))
          .forEach(page => uniquePages.add(page));
      }
    } else {
      const page = pages.find(p => p.title === pageSpec);
      if (page) uniquePages.add(page);
    }
  }

  for (const pageSpec of pageSpecs) {
    await addPages(pageSpec);
  }

  if (uniquePages.size === 0) return null;

  async function generateContextStr(pagesToProcess: Page[]): Promise<string> {
    let contextStr = "\n" + todoInstructions;
    for (const page of pagesToProcess) {
      if (page.value.startsWith("{")) {
        const pageMarkdown = await getPageMarkdown(page);
        contextStr += "\n## " + page.title + "\n" + pageMarkdown;
      } else {
        contextStr += "\n## " + page.title + "\n" + page.value;
      }
    }
    return contextStr;
  }

  return generateContextStr(Array.from(uniquePages));
}

export async function getFormulaOutput(formula: string, pages: Page[], dialogueContext?: DialogueElement[]): Promise<FormulaOutput | null> {

  // Check if the formula matches any of the regex patterns
  for (const [regex, callback, type] of regexCallbacks) {
    const match = formula.match(regex);
    if (match) {
      return await callback(match, pages);
    }
  }

  let prompt = formula;
  if (WIKILINK_REGEX.exec(formula) !== null) {
    const referencedPages = extractWikilinks(formula);
    const pagesContext = await getPagesContext(referencedPages, pages);
    prompt = prompt + pagesContext;
  }

  if (!dialogueContext) return null;
  const gptResponse = await getShortGPTChatResponse(prompt, dialogueContext);
  if (!gptResponse) return null;

  return { output: gptResponse, type: FormulaOutputType.Text };
}

function $getGPTPair(listItem: ListItemNode): DialogueElement | undefined {
  const child = listItem.getFirstChild();
  if (
    child && 
    $isFormulaDisplayNode(child) &&
    child.getFormulaDisplayNodeType() === "gptFormula"
  ) {
      return { userQuestion: child.getFormula(), systemAnswer: child.getOutput() };
    }
  return undefined;
}

export function slurpDialogueContext(displayNodeKey: string, editor: LexicalEditor): DialogueElement[] {
  let context: DialogueElement[] = [];
  editor.getEditorState().read(() => {
    const listItem = $getNodeByKey(displayNodeKey)?.getParent();
    let prevListItem = listItem?.getPreviousSibling();
    while (
      prevListItem && 
      $isListItemNode(prevListItem)
    ) {
      const dialogue = $getGPTPair(prevListItem);
      if (dialogue) {
        context.unshift(dialogue);
      } else {
        break;
      }
      prevListItem = prevListItem.getPreviousSibling();
    }
  })
  return context;
}