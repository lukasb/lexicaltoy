import { Page } from "../definitions";
import { 
  FormulaOutput,
  FormulaOutputType,
  createBaseNodeMarkdown
} from "./formula-definitions";
import { splitMarkdownByNodes } from "../list-utils";

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
      const findFormulaRegex = /^\s*- =find\((.+)\)$/;
      const findFormulaStartRegex = /^\s*- =find\(/;
      const indentationRegex = /^(\s*)-/;

      for (const page of pages) {
        const pageMarkdown = page.value;
        let unmatchedSubstrings = [...substrings];

        unmatchedSubstrings = unmatchedSubstrings.filter(substring => {
          const substrOrClauses = orClauses[substring];
          for (const substrOrClause of substrOrClauses) {
            if (page.title.includes(substrOrClause)) {
              return false;
            }
          }
          return true;
        });

        let nodesMarkdown = splitMarkdownByNodes(page.value);
        let currentNodeNum = 0;
        while (currentNodeNum < nodesMarkdown.length) {
          const matchesAll = unmatchedSubstrings.every(substring => {
            const substrOrClauses = orClauses[substring];
            for (const substrOrClause of substrOrClauses) {
              if (nodesMarkdown[currentNodeNum].includes(substrOrClause)) {
                return true;
              } 
            }
            return false;
          });
          if (matchesAll) {
            // for now, we avoid circular references by excluding any lines with find() formulas
            if (!findFormulaStartRegex.test(nodesMarkdown[currentNodeNum])) {
              const indentationNum = indentationRegex.exec(nodesMarkdown[currentNodeNum])?.[1].length ?? -1;
              let numChildren = 0;
              if (indentationNum > -1) {
                // if the match is a bullet point, pull in any child nodes
                // if we hit a child node with a find(), just stop
                // TODO figure out something better to do here
                while (currentNodeNum + numChildren + 1 < nodesMarkdown.length) { 
                  const potentialChild = nodesMarkdown[currentNodeNum + numChildren + 1];
                  const childIndentNum = indentationRegex.exec(potentialChild)?.[1].length ?? -1;
                  if (childIndentNum > indentationNum && !findFormulaStartRegex.test(nodesMarkdown[currentNodeNum+numChildren])) {
                    numChildren++;
                    continue;
                  } else {
                    break;
                  }
                }
              }
              let outputLinesString = nodesMarkdown[currentNodeNum];
              if (numChildren > 0) {
                for (let j = 1; j <= numChildren; j++) {
                  outputLinesString += "\n" + nodesMarkdown[currentNodeNum+j];
                }
              }
              output.push(
                createBaseNodeMarkdown(page.title, i+1, i+numLines, outputLinesString)
              );
              currentNodeNum += numChildren + 1;
            }
          }
        }
      }

      return {
        output,
        type: FormulaOutputType.NodeMarkdown,
      };
    },
  ],
];