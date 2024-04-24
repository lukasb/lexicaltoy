import { 
  FormulaOutput, 
  FormulaOutputType
} from "./formula-definitions";

export const regexCallbacks: Array<[RegExp, (match: RegExpMatchArray) => Promise<FormulaOutput>]> = [
  [/^find\((.+)\)$/, async (match) => {
    console.log(match[1]);
    return {
      output: [
        {nodeMarkdown: '- hello there', pageName: 'some page', lineNumber: 1},
        {nodeMarkdown: '- general kenobi', pageName: 'another page', lineNumber: 2},
        {nodeMarkdown: '- you are a bold one', pageName: 'another page', lineNumber: 3}
      ],
      type: FormulaOutputType.NodeMarkdown
    };
  }],
];