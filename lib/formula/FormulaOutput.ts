import { 
  FormulaOutput,
  FormulaValueType
} from './formula-definitions';
import { 
  DialogueElement,
  getShortGPTChatResponse,
 } from '@/lib/ai';
import { Page } from '@/lib/definitions';
import { functionDefinitions } from './formula-parser';
import { LexicalEditor, $getNodeByKey, RootNode, ElementNode } from 'lexical';
import { ListItemNode, $isListNode } from '@lexical/list';
import { $isFormulaDisplayNode } from '@/_app/nodes/FormulaNode';
import { $isListItemNode } from '@lexical/list';
import { CstNodeWithChildren } from './formula-parser';
import { FormulaLexer, FormulaParser, FunctionDefinition } from './formula-parser';
import { IToken } from 'chevrotain';
import { $getRoot } from 'lexical';
import { getMarkdownUpTo } from './formula-context-helpers';
import { getGPTResponse } from './gpt-formula-handlers';

const partialFormulaRegex = /=\s?[a-zA-z]+\(/;

export async function getFormulaOutput(
  formula: string,
  pages: Page[],
  context?: PageAndDialogueContext
): Promise<FormulaOutput | null> {
  try {
    const formulaWithEqualSign = formula.startsWith("=") ? formula : `=${formula}`;
    const lexingResult = FormulaLexer.tokenize(formulaWithEqualSign);
    
    if (lexingResult.errors.length > 0) {
      return getGPTResponse(formula, context);
    }

    const parser = new FormulaParser();
    parser.input = lexingResult.tokens;
    const cst = parser.formula() as CstNodeWithChildren;

    if (parser.errors.length > 0) {
      if (!partialFormulaRegex.test(formulaWithEqualSign) && context) {
        return getGPTResponse(formula, context);
      } else {
        return null;
      }
    }

    return getFormulaOutputInner(cst, pages, context);
  } catch (error) {
    console.error("Error parsing or executing formula:", error);
    return null;
  }
}

async function getFormulaOutputInner(
  cst: CstNodeWithChildren,
  pages: Page[],
  context?: PageAndDialogueContext
): Promise<FormulaOutput | null> {
  const functionCallNode = cst.children.functionCall[0] as CstNodeWithChildren;
  const functionName = (functionCallNode.children.Identifier[0] as IToken).image;
  const argumentListNode = functionCallNode.children.argumentList[0] as CstNodeWithChildren;

  // TODO validate arguments against function definition

  const parsedArgs: FormulaOutput[] = await Promise.all(argumentListNode.children.argument.map(async (arg: any): Promise<FormulaOutput> => {
    if (arg.children.StringLiteral) {
      return { output: arg.children.StringLiteral[0].image, type: FormulaValueType.Text };
    } else if (arg.children.SpecialToken) {
      return { output: arg.children.SpecialToken[0].image, type: FormulaValueType.Text };
    } else if (arg.children.TodoStatus) {
      return { output: arg.children.TodoStatus[0].image, type: FormulaValueType.NodeTypeOrTypes };
    } else if (arg.children.functionCall) {
      const nestedResult = await getFormulaOutputInner(arg as CstNodeWithChildren, pages, context);
      return nestedResult ? nestedResult : { output: '', type: FormulaValueType.Text };
    } else if (arg.children.FilePath) {
      // TODO should probably get the page contents here and pass them in
      return { output: arg.children.FilePath[0].image, type: FormulaValueType.Text };
    }
    return { output: '', type: FormulaValueType.Text };
  }));

  // Find the corresponding function definition
  const funcDef = functionDefinitions.find((def: FunctionDefinition) => def.name === functionName);

  if (funcDef) {
    // Prepare the default arguments
    const defaultArgs = { pages, context };
    
    // Call the function's callback with the default arguments and parsed arguments
    return await funcDef.callback(defaultArgs, parsedArgs);
  } else {
    console.error(`Unknown function: ${functionName}`);
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

export type PageAndDialogueContext = {
  dialogueContext: DialogueElement[];
  priorMarkdown: string; // Markdown from nodes above provided dialogueContext
}

// return context for the current conversation (any dialogue for preceding list items)
// and the markdown from before the current list item
export function slurpDialogueContext(displayNodeKey: string, editor: LexicalEditor): PageAndDialogueContext {
  let context: DialogueElement[] = [];
  let priorMarkdown: string | undefined = undefined;
  editor.getEditorState().read(() => {
    const listItem = $getNodeByKey(displayNodeKey)?.getParent();
    const root = $getRoot();
    let prevListItem = listItem?.getPreviousSibling();
    if (prevListItem) {
      while (
        prevListItem && 
        $isListItemNode(prevListItem)
      ) {
        const dialogue = $getGPTPair(prevListItem);
        if (dialogue) {
          context.unshift(dialogue);
        } else {
          if ($isListNode(prevListItem.getFirstChild())) {
            prevListItem = prevListItem.getPreviousSibling();
          }
          if (prevListItem) {
            priorMarkdown = getMarkdownUpTo(prevListItem.__key, true, root);
          }
          break;
        }
        prevListItem = prevListItem.getPreviousSibling();
      }
      if (!priorMarkdown) {
        if (listItem) priorMarkdown = getMarkdownUpTo(listItem.__key, false, root);
      }
    } else {
      if (listItem) priorMarkdown = getMarkdownUpTo(listItem.__key, false, root);
    }
  })
  return { dialogueContext: context, priorMarkdown: priorMarkdown || "" };
}