import { Page } from "../definitions";
import { 
  FormulaOutput,
  FormulaOutputType,
  createBaseNodeMarkdown,
  NodeElementMarkdown
} from "./formula-definitions";

const findFormulaStartRegex = /^\s*- =find\(/;

function splitMarkdownByNodes(markdown: string, pageName: string): NodeElementMarkdown[] {
  const lines = markdown.split("\n");
  const rootNode: NodeElementMarkdown = {
    baseNode: createBaseNodeMarkdown(pageName, 1, lines.length, ""),
    children: []
  };
  const stack: NodeElementMarkdown[] = [rootNode];
  let currentIndentation = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const indentation = line.length - trimmedLine.length;

    if (trimmedLine === "" || trimmedLine.startsWith("-")) {
      if (trimmedLine !== "") {
        while (indentation < currentIndentation && stack.length > 1) {
          stack.pop();
          currentIndentation -= 2;
        }

        const newNode: NodeElementMarkdown = {
          baseNode: createBaseNodeMarkdown(pageName, i + 1, i + 1, trimmedLine),
          children: []
        };

        stack[stack.length - 1].children.push(newNode);

        if (indentation > currentIndentation) {
          stack.push(newNode);
          currentIndentation = indentation;
        }
      }
    } else {
      const currentNode = stack[stack.length - 1].children[stack[stack.length - 1].children.length - 1] || stack[stack.length - 1];
      currentNode.baseNode.nodeMarkdown += (currentNode.baseNode.nodeMarkdown ? "\n" : "") + line;
      currentNode.baseNode.lineNumberEnd = i + 1;
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

      const output: FormulaOutput["output"] = [];
      const indentationRegex = /^(\s*)-/;

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

        let nodesMarkdown = splitMarkdownByNodes(page.value, page.title);
        let currentNodeNum = 0;
        while (currentNodeNum < nodesMarkdown.length) {
          const currentNodeMarkdown = nodesMarkdown[currentNodeNum].baseNode.nodeMarkdown; 
          const matchesAll = unmatchedSubstrings.every(substring => {
            const substrOrClauses = orClauses[substring];
            for (const substrOrClause of substrOrClauses) {
              if (currentNodeMarkdown.includes(substrOrClause)) {
                return true;
              } 
            }
            return false;
          });
          if (matchesAll) {
            // for now, we avoid circular references by excluding any lines with find() formulas
            if (!findFormulaStartRegex.test(currentNodeMarkdown)) {
              removeFindNodes(nodesMarkdown[currentNodeNum]);
              console.log("pushing onto output", nodesMarkdown[currentNodeNum]);
              output.push(nodesMarkdown[currentNodeNum]);
            }
          }
          currentNodeNum++;
        }
      }

      return {
        output,
        type: FormulaOutputType.NodeMarkdown,
      };
    },
  ],
];