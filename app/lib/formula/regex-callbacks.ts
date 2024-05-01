import { Page } from "../definitions";
import { FormulaOutput, FormulaOutputType } from "./formula-definitions";

export const regexCallbacks: Array<[RegExp, (match: RegExpMatchArray, pages: Page[]) => Promise<FormulaOutput>]> = [
  [
    /^find\((.+)\)$/,
    async (match, pages) => {
      const regex = new RegExp(match[1]);
      const output: FormulaOutput["output"] = [];

      for (const page of pages) {
        const lines = page.value.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (regex.test(line)) {
            output.push({
              nodeMarkdown: line,
              pageName: page.title,
              lineNumber: i + 1,
            });
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