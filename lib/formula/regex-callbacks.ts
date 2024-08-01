import { Page } from "../definitions";
import { 
  FormulaOutput,
  FormulaOutputType,
  createBaseNodeMarkdown,
  NodeElementMarkdown
} from "./formula-definitions";

const findFormulaStartRegex = /^\s*- =find\(/;

export function splitMarkdownByNodes(markdown: string, pageName: string): NodeElementMarkdown[] {
  const lines = markdown.split("\n");
  const rootNode: NodeElementMarkdown = {
    baseNode: createBaseNodeMarkdown(pageName, 1, lines.length, ""),
    children: []
  };
  const stack: NodeElementMarkdown[] = [rootNode];
  let currentIndentation = 0;
  let isProcessingListItems = false;
  const indentStack: number[] = [];
  let lastListItem;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const isListItem = trimmedLine.startsWith("-");
    const indentation = line.length - trimmedLine.length;

    if (trimmedLine === "" || isListItem) {
      if (trimmedLine !== "") {
        while (indentation < currentIndentation && stack.length > 1) {
          stack.pop();
          currentIndentation -= indentStack.pop() || 2;
        }

        const newNode: NodeElementMarkdown = {
          baseNode: createBaseNodeMarkdown(pageName, i + 1, i + 1, trimmedLine),
          children: []
        };

        if (indentation > currentIndentation || (!isProcessingListItems && isListItem)) {
          indentStack.push(indentation - currentIndentation);
          if (lastListItem) stack.push(lastListItem);
          currentIndentation = indentation;
          isProcessingListItems = true;
        }
        
        stack[stack.length - 1].children.push(newNode);
        lastListItem = newNode;
      } else {
        if (isProcessingListItems) {
          isProcessingListItems = false;
          while (stack.length > 1) {
            stack.pop();
            currentIndentation -= indentStack.pop() || 2;
          }
          lastListItem = null;
        }
      }
    } else {
      if (isProcessingListItems) {
        // handle multiline continuations of list items
        const currentNode = stack[stack.length - 1].children[stack[stack.length - 1].children.length - 1] || stack[stack.length - 1];
        currentNode.baseNode.nodeMarkdown += (currentNode.baseNode.nodeMarkdown ? "\n" : "") + line;
        currentNode.baseNode.lineNumberEnd = i + 1;
      } else {
        const newNode: NodeElementMarkdown = {
          baseNode: createBaseNodeMarkdown(pageName, i + 1, i + 1, trimmedLine),
          children: []
        };
        stack[stack.length - 1].children.push(newNode);
      }
    }
  }

  return rootNode.children;
}

// for now, if we hit a find() node, just remove it, any children, and any
// subsequent siblings from the search results
function removeFindNodes(node: NodeElementMarkdown): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (findFormulaStartRegex.test(child.baseNode.nodeMarkdown)) {
      node.children.splice(i);
      return;
    }
    removeFindNodes(child);
  }
}

export const regexCallbacks: Array<[RegExp, (match: RegExpMatchArray, pages: Page[]) => Promise<FormulaOutput>]> = [
  [
    /^find\((.+)\)$/,
    async (match, pages) => {

      // for now, find(abc,def|ghi) will find all lines that contain "abc" AND ("def" OR "ghi")
      // we also check the title when matching, so if one substring is in the title and another
      // is in the line, we match

      const substrings = match[1].split(",").map(s => s.trim());

      const orClauses: { [key: string]: string[] } = {};
      for (const substring of substrings) {
        const orClause = substring.split("|").map(s => s.trim());
        orClauses[substring] = orClause;
      }

      const output: NodeElementMarkdown[] = [];

      for (const page of pages) {
        let unmatchedSubstrings = [...substrings];

        // search terms can appear in the title or the content of the page
        unmatchedSubstrings = unmatchedSubstrings.filter(substring => {
          const substrOrClauses = orClauses[substring];
          for (const substrOrClause of substrOrClauses) {
            if (page.title.includes(substrOrClause)) {
              return false;
            }
          }
          return true;
        });

        function processNodes(nodesMarkdown: NodeElementMarkdown[], unmatchedSubstrings: string[], orClauses: { [key: string]: string[] }): NodeElementMarkdown[] {
        
          const output: NodeElementMarkdown[] = [];
          for (let node of nodesMarkdown) {
            const currentNodeMarkdown = node.baseNode.nodeMarkdown;
            const matchesAll = unmatchedSubstrings.every(substring => {
              const substrOrClauses = orClauses[substring];
              return substrOrClauses.some(substrOrClause => 
                currentNodeMarkdown.includes(substrOrClause)
              );
            });
        
            if (matchesAll) {
              // Avoid circular references by excluding lines with find() formulas
              if (!findFormulaStartRegex.test(currentNodeMarkdown)) {
                removeFindNodes(node);
                output.push(node);
              }
            } else {
              // no need to process these, they will be included as part of their parent
              // this is an intentional choice - but we could decide the other way, that every
              // match should appear at the top level
              if (node.children && node.children.length > 0) {
                output.push(...processNodes(node.children, unmatchedSubstrings, orClauses));
              }
            }
          }
        
          return output;
        }
        
        const nodesMarkdown = splitMarkdownByNodes(page.value, page.title);
        output.push(...processNodes(nodesMarkdown, unmatchedSubstrings, orClauses));
      }
      return {
        output: output,
        type: FormulaOutputType.NodeMarkdown,
      };
    },
  ],
];