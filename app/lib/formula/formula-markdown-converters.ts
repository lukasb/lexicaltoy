/*
  * This file contains functions to convert formulas to and from markdown.
  * Formulas are represented in markdown as follows:
  * 
  * =formula {result: output}
  * 
  * The formula is required and the output is optional.
  * 
  * We (will eventually) escape any curly braces in the formula and output to avoid conflicts with our custom markdown.
  */

const FORMULA_REGEX = /^=(.+?)(?:\s*{result:\s*(.+?)})?\s*$/;
const FORMULA_LIST_ITEM_REGEX = /^(\s*)-\s?=(.+?)(?:\s*{result:\s*(.+?)})?\s*$/;

function escapeContentForMarkdown(str: string) {
  return str.replace(/{/g, '\\{').replace(/}/g, '\\}');
}

// formula as stored by the nodes has the = sign at the front, maybe should change that
// TODO escape curly brackets in case they appear in formula or result, means changing parser below too
export function getFormulaMarkdown(formula: string, output?: string): string {
  /*
  let markdown = `=${escapeContentForMarkdown(formula)}`;
  if (output) {
    markdown += ` {result: ${escapeContentForMarkdown(output)}}`;
  }*/
  let markdown = `=${formula}`;
  if (output) {
    markdown += ` {result: ${output}}`;
  }
  return markdown;
}

export interface ParseResult {
  formula: string | null;
  result: string | null;
}

// TODO handle escaped curly brackets
export function parseFormulaMarkdown(markdownString: string): ParseResult {
  const match = markdownString.match(FORMULA_REGEX);

  if (match) {
    //const formula = match[1].replace(/\\{/g, '{').replace(/\\}/g, '}');
    //const result = match[2] ? match[2].replace(/\\{/g, '{').replace(/\\}/g, '}') : null;
    const formula = match[1];
    const result = match[2];
    return { formula, result };
  } else {
    return { formula: null, result: null };
  }
}

export function stripSharedNodesFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const processedLines: string[] = [];

  // if a formula has a find() function that returns shared nodes, we want to strip the child nodes so they don't get serialized
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(FORMULA_LIST_ITEM_REGEX);
    if (match && match[2].startsWith('find(') && match[3] === '@@childnodes') {
      const currentIndent = match[1].length;
      const resultStrIndex = line.indexOf(' {result:');
      processedLines.push(line.slice(0, resultStrIndex));

      // Skip child list items
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextMatch = nextLine.match(/^(\s*)-/);

        if (nextMatch && nextMatch[1].length > currentIndent) {
          i++; // Skip the child list item
        } else {
          break;
        }
      }
    } else {
      processedLines.push(line);
    }
  }

  return processedLines.join('\n');
}