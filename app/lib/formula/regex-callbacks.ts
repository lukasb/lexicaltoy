import { Page } from "../definitions";
import { FormulaOutput, FormulaOutputType } from "./formula-definitions";

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

      for (const page of pages) {
        const lines = page.value.split("\n");
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

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const matchesAll = unmatchedSubstrings.every(substring => {
            const substrOrClauses = orClauses[substring];
            for (const substrOrClause of substrOrClauses) {
              if (line.includes(substrOrClause)) {
                return true;
              }
            }
            return false;
          });
          if (matchesAll) {
            // for now, we avoid circular references by excluding any formula lines
            if (!findFormulaRegex.test(line)) {
              output.push({
                nodeMarkdown: line,
                pageName: page.title,
                lineNumber: i + 1,
              });
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