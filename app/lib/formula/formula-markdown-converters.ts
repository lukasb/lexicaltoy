/*
  * This file contains functions to convert formulas to and from markdown.
  * Formulas are represented in markdown as follows:
  * 
  * =formula {result:output}
  * 
  * The formula is required and the output is optional.
  * 
  * We escape any curly braces in the formula and output to avoid conflicts with our custom markdown.
  */


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
  const regex = /^=(.+?)(?:\s*{result:\s*(.+?)})?\s*$/;
  const match = markdownString.match(regex);

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