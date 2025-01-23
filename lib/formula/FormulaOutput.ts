import { 
  FormulaOutput,
  FormulaValueType
} from './formula-definitions';
import { 
  DialogueElement
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
import { getShortGPTResponse } from './gpt-formula-handlers';
import { usePageStatusStore } from '@/lib/stores/page-status-store';
import type { PageStatusState } from '@/lib/stores/page-status-store';

const partialFormulaRegex = /=\s?[a-zA-z]+\(/;

export async function getFormulaOutput(
  formula: string,
  pages: Page[],
  context?: PageAndDialogueContext,
  pageUpdateContext?: PageStatusState
): Promise<FormulaOutput | null> {
  try {
    const formulaWithEqualSign = formula.startsWith("=") ? formula : `=${formula}`;
    const lexingResult = FormulaLexer.tokenize(formulaWithEqualSign);
    
    if (lexingResult.errors.length > 0) {
      return getShortGPTResponse(formula, context);
    }
    const parser = new FormulaParser();
    parser.input = lexingResult.tokens;
    const cst = parser.formula() as CstNodeWithChildren;

    if (parser.errors.length > 0) {
      if (!partialFormulaRegex.test(formulaWithEqualSign) && context) {
        return getShortGPTResponse(formula, context);
      } else {
        return null;
      }
    }

    return getFormulaOutputInner(cst, pages, context, pageUpdateContext);
  } catch (error) {
    console.log("🛑 Error parsing or executing formula:", error);
    return null;
  }
}

async function getFormulaOutputInner(
  cst: CstNodeWithChildren,
  pages: Page[],
  context?: PageAndDialogueContext,
  pageUpdateContext?: PageStatusState
): Promise<FormulaOutput | null> {
  const functionCallNode = cst.children.functionCall[0] as CstNodeWithChildren;
  const functionName = (functionCallNode.children.Identifier[0] as IToken).image;
  const argumentListNode = functionCallNode.children.argumentList[0] as CstNodeWithChildren;

  // TODO validate arguments against function definition

  const parsedArgs: FormulaOutput[] = await Promise.all(argumentListNode.children.argument.map(async (arg: any): Promise<FormulaOutput> => {
    // Check for negation
    const isNegated = arg.children.Not && arg.children.Not.length > 0;
    
    let output: FormulaOutput;
    if (arg.children.StringLiteral) {
      output = { output: arg.children.StringLiteral[0].image, type: FormulaValueType.Text };
    } else if (arg.children.SpecialToken) {
      output = { output: arg.children.SpecialToken[0].image, type: FormulaValueType.Text };
    } else if (arg.children.TodoStatus) {
      output = { output: arg.children.TodoStatus[0].image, type: FormulaValueType.NodeTypeOrTypes };
    } else if (arg.children.functionCall) {
      const nestedResult = await getFormulaOutputInner(arg as CstNodeWithChildren, pages, context, pageUpdateContext);
      output = nestedResult ? nestedResult : { output: '', type: FormulaValueType.Text };
    } else if (arg.children.Wikilink) {
      output = { output: arg.children.Wikilink[0].image, type: FormulaValueType.Wikilink };
    } else {
      output = { output: '', type: FormulaValueType.Text };
    }

    // Add negation information to the output
    if (isNegated) {
      output.isNegated = true;
    }

    return output;
  }));

  // Find the corresponding function definition
  const funcDef = functionDefinitions.find((def: FunctionDefinition) => def.name === functionName);

  if (funcDef) {
    // Prepare the default arguments with proper typing
    const defaultArgs = { 
      pages, 
      context, 
      pageUpdateContext 
    } as const;
    
    // Call the function's callback with the default arguments and parsed arguments
    return await funcDef.callback(defaultArgs, parsedArgs);
  } else {
    console.log(`🛑 Unknown function: ${functionName}`);
    return null;
  }
}

function $getGPTPair(listItem: ListItemNode): DialogueElement | undefined {
  const child = listItem.getFirstChild();
  if (
    child && 
    $isFormulaDisplayNode(child)
  ) {
    if (child.getFormulaDisplayNodeType() === "simpleGptFormula") {
      return { userQuestion: child.getFormula(), systemAnswer: child.getOutput() };
    } else if (child.getFormulaDisplayNodeType() === "complexGptFormula") {
      return { userQuestion: child.getFormula(), systemAnswer: child.getOutput() };
    }
  }
  return undefined;
}

export type PageAndDialogueContext = {
  dialogueContext: DialogueElement[];
  priorMarkdown: string; // Markdown from nodes above provided dialogueContext
}

// return context for the current conversation (any dialogue for preceding list items)
// and the markdown from before the current list item
// this will intentionally not include immediately preceding list items with GPT dialogue as part of the prior markdown, since they will be included with the DialogueContext
export function slurpPageAndDialogueContext(nodeKey: string, editor: LexicalEditor): PageAndDialogueContext {
  let context: DialogueElement[] = [];
  let priorMarkdown: string | undefined = undefined;
  editor.getEditorState().read(() => {
    let listItem = $getNodeByKey(nodeKey);
    if (!listItem) return;
    if (!$isListItemNode(listItem)) {
      listItem = listItem.getParent();
    }
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
          const nextSibling = prevListItem.getNextSibling();
          if (nextSibling) {
            priorMarkdown = getMarkdownUpTo(nextSibling.__key, root);
          }
          break;
        }
        prevListItem = prevListItem.getPreviousSibling();
      }
      if (!priorMarkdown) {
        if (listItem) priorMarkdown = getMarkdownUpTo(listItem.__key, root);
      }
    } else {
      if (listItem) priorMarkdown = getMarkdownUpTo(listItem.__key, root);
    }
  })
  return { dialogueContext: context, priorMarkdown: priorMarkdown || "" };
}