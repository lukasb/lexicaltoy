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
import { FormulaLexer, FormulaParser, FunctionDefinition } from './formula-parser';
import { IToken } from 'chevrotain';

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

export async function getFormulaOutput(
  formula: string,
  pages: Page[],
  dialogueContext?: DialogueElement[]
): Promise<FormulaOutput | null> {
  try {
    const formulaWithEqualSign = formula.startsWith("=") ? formula : `=${formula}`;
    const lexingResult = FormulaLexer.tokenize(formulaWithEqualSign);
    
    if (lexingResult.errors.length > 0) {
      console.error("Lexing errors:", lexingResult.errors);
      return null;
    }

    const parser = new FormulaParser();
    parser.input = lexingResult.tokens;
    const cst = parser.formula() as CstNodeWithChildren;

    if (parser.errors.length > 0) {
      console.error("Parsing errors:", parser.errors);
      return null;
    }

    const functionCallNode = cst.children.functionCall[0] as CstNodeWithChildren;
    const functionName = (functionCallNode.children.Identifier[0] as IToken).image;
    const argumentListNode = functionCallNode.children.argumentList[0] as CstNodeWithChildren;

    const args: string[] = argumentListNode.children.argument.map((arg: any): string => {
      if (arg.children.StringLiteral) {
        return arg.children.StringLiteral[0].image.slice(1, -1); // Remove quotes
      } else if (arg.children.SpecialToken) {
        return arg.children.SpecialToken[0].image;
      } else if (arg.children.pipeExpression) {
        return arg.children.pipeExpression[0].children.TodoStatus.map((token: any) => token.image).join('|');
      } else if (arg.children.functionCall) {
        // Recursive call for nested function calls
        const nestedResult = getFormulaOutput(arg.children.functionCall[0].image, pages, dialogueContext);
        return nestedResult ? JSON.stringify(nestedResult) : '';
      } else if (arg.children.FilePath) {
        return arg.children.FilePath[0].image.slice(2, -2); // Remove [[ and ]]
      }
      return '';
    });

    // Find the corresponding function definition
    const funcDef = functionDefinitions.find((def: FunctionDefinition) => def.name === functionName);

    if (funcDef) {
      // Prepare the default arguments
      const defaultArgs = { pages, dialogueElements: dialogueContext };

      console.log("args", args);
      
      // Call the function's callback with the default arguments and parsed arguments
      return await funcDef.callback(defaultArgs, args);
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