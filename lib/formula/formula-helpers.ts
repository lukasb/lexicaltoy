import { FormulaOutput, FormulaValueType, NodeElementMarkdown } from "./formula-definitions";
import { 
  parseFormulaMarkdown
} from './formula-markdown-converters';


export function nodeToString(node: NodeElementMarkdown): string {
  let result = node.baseNode.nodeMarkdown + "\n";
  for (const child of node.children) {
    result += nodeToString(child);
  }
  return result;
}

export function getOutputAsString(output: FormulaOutput): string {
  if (output.type === FormulaValueType.Text || output.type === FormulaValueType.Wikilink) {
    return output.output as string;
  } else if (output.type === FormulaValueType.NodeMarkdown) {
    let outputStr = "";
    for (const node of output.output as NodeElementMarkdown[]) {
      outputStr += nodeToString(node);
    }
    return outputStr;
  }
  return "";
}

/**
   * Given the markdown for a node, return the value to be used for formulas.
   * If it's not a formula node, we just return the node's markdown.
   * If it is a formula node, we return the formula's result.
   * If it's a formula without results, we return the formula.
   *
   * */
export function nodeValueForFormula(nodeMarkdown: string): string {

  const { formula, result, blockId } = parseFormulaMarkdown(nodeMarkdown);
  if (result) {
    return result;
  }
  if (formula) {  
    return formula;
  }
  return nodeMarkdown;
}

export function getListItemContentsFromMarkdown(nodeMarkdown: string): string {
  // strip leading -
  return nodeMarkdown.replace(/^\s*-+\s*/, "");
}

