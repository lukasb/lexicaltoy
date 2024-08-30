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
import { functionDefinitions } from './formula-parser';
import { WIKILINK_REGEX, extractWikilinks } from '@/lib/text-utils';
import { LexicalEditor, $getNodeByKey } from 'lexical';
import { ListItemNode } from '@lexical/list';
import { $isFormulaDisplayNode } from '@/_app/nodes/FormulaNode';
import { $isListItemNode } from '@lexical/list';
import { parseFormula } from './formula-parser';
import { DefaultArguments } from './formula-parser';
import { CstNodeWithChildren, getChildrenByName, getTokenImage } from './formula-parser';

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

export async function getPagesContext(pageSpecs: string[], pages: Page[]): Promise<string | null> {
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
  try {
      // Parse the formula using our new parser
      const parsedFormula = parseFormula(formula) as CstNodeWithChildren;

      // Extract function name and arguments from the parsed formula
      const functionCallNode = getChildrenByName(parsedFormula, 'functionCall')[0] as CstNodeWithChildren;
      const functionName = getTokenImage(getChildrenByName(functionCallNode, 'Identifier')[0]);

      console.log("functionName", functionName);
      
      const argumentListNode = getChildrenByName(functionCallNode, 'argumentList')[0] as CstNodeWithChildren;
      const args = getChildrenByName(argumentListNode, 'argument').map(arg => {
          const argNode = arg as CstNodeWithChildren;
          if (getChildrenByName(argNode, 'StringLiteral').length > 0) {
              return getTokenImage(getChildrenByName(argNode, 'StringLiteral')[0]).slice(1, -1); // Remove quotes
          } else if (getChildrenByName(argNode, 'WikiLink').length > 0) {
              return getTokenImage(getChildrenByName(argNode, 'WikiLink')[0]);
          } else if (getChildrenByName(argNode, 'stringSet').length > 0) {
              const stringSetNode = getChildrenByName(argNode, 'stringSet')[0] as CstNodeWithChildren;
              return getChildrenByName(stringSetNode, 'stringSetItem').map(item => {
                  const itemNode = item as CstNodeWithChildren;
                  if (getChildrenByName(itemNode, 'StringLiteral').length > 0) {
                      return getTokenImage(getChildrenByName(itemNode, 'StringLiteral')[0]).slice(1, -1);
                  } else {
                      return getTokenImage(getChildrenByName(itemNode, 'Word')[0]);
                  }
              }).join(' ');
          } else if (getChildrenByName(argNode, 'typeOrTypes').length > 0) {
              const typeOrTypesNode = getChildrenByName(argNode, 'typeOrTypes')[0] as CstNodeWithChildren;
              return getChildrenByName(typeOrTypesNode, 'NodeType').map(node => getTokenImage(node)).join('|');
          }
          return '';
      });

      // Find the corresponding function definition
      const funcDef = functionDefinitions.find(def => def.name === functionName);

      if (funcDef) {
          // Prepare the default arguments
          const defaultArgs: DefaultArguments = { pages, dialogueElements: dialogueContext };

          // Call the function's callback with the default arguments and parsed arguments
          return await funcDef.callback(defaultArgs, ...args);
      } else {
          console.error(`Unknown function: ${functionName}`);
          return null;
      }
  } catch (error) {
      console.error("Error parsing or executing formula:", error);
      return null;
  }
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