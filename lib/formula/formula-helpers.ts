import { FormulaOutput, FormulaValueType, NodeElementMarkdown } from "./formula-definitions";

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