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
import { LexicalEditor, $getNodeByKey } from 'lexical';
import { ListItemNode } from '@lexical/list';
import { $isFormulaDisplayNode } from '@/_app/nodes/FormulaNode';
import { $isListItemNode } from '@lexical/list';
import { CstNodeWithChildren } from './formula-parser';
import { FormulaLexer, FormulaParser, FunctionDefinition } from './formula-parser';
import { IToken } from 'chevrotain';
import { NodeElementMarkdown } from './formula-definitions';

export function getOutputAsString(output: FormulaOutput): string {
  if (output.type === FormulaValueType.Text) {
    return output.output as string;
  } else if (output.type === FormulaValueType.NodeMarkdown) {
    let outputStr = "";
    for (const node of output.output as NodeElementMarkdown[]) {
      outputStr += nodeToString(node);
    }
    return outputStr;

    function nodeToString(node: NodeElementMarkdown): string {
      let result = node.baseNode.nodeMarkdown + "\n";
      for (const child of node.children) {
        result += nodeToString(child);
      }
      return result;
    }
  }
  return "";
}

const partialFormulaRegex = /=\s?[a-zA-z]+\(/;

async function getGPTResponse(formula: string, dialogueContext?: DialogueElement[]): Promise<FormulaOutput | null> {
  const formulaWithoutEqualSign = formula.startsWith("=") ? formula.slice(1) : formula;
  if (!dialogueContext) return null;
  const gptResponse = await getShortGPTChatResponse(formulaWithoutEqualSign, dialogueContext);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
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
      return getGPTResponse(formula, dialogueContext);
    }

    const parser = new FormulaParser();
    parser.input = lexingResult.tokens;
    const cst = parser.formula() as CstNodeWithChildren;

    if (parser.errors.length > 0) {
      if (!partialFormulaRegex.test(formulaWithEqualSign) && dialogueContext) {
        return getGPTResponse(formula, dialogueContext);
      } else {
        return null;
      }
    }

    return getFormulaOutputInner(cst, pages, dialogueContext);
  } catch (error) {
    console.error("Error parsing or executing formula:", error);
    return null;
  }
}

async function getFormulaOutputInner(
  cst: CstNodeWithChildren,
  pages: Page[],
  dialogueContext?: DialogueElement[]
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
      const nestedResult = await getFormulaOutputInner(arg as CstNodeWithChildren, pages, dialogueContext);
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
    const defaultArgs = { pages, dialogueElements: dialogueContext };
    
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