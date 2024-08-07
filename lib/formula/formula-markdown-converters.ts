/*
  * This file contains functions to convert formulas to and from markdown.
  * Formulas are represented in markdown as follows:
  * 
  * =formula |||result:
  * output
  * |||
  * 
  * The formula is required and the output is optional.
  * 
  * We (will eventually) escape any pipe symbols in the formula and output to avoid conflicts with our custom markdown.
  */

//const FORMULA_REGEX = /^=(.+?)(?:\s*{result:\s*(.+?)})?\s*$/;
//const FORMULA_LIST_ITEM_REGEX = /^(\s*)-\s?=(.+?)(?:\s*{result:\s*(.+?)})?\s*$/;

const FORMULA_REGEX = /^=(.+?)(?:\s*\|\|\|result:[\n]?([\s\S]*?)\|\|\|)?$/gs;
const FORMULA_LIST_ITEM_REGEX = /^(\s*)- =(.+?)(?:\s*\|\|\|result:[\n]?([\s\S]*?)\|\|\|)?$/gm;

// formula as stored by the nodes has the = sign at the front, maybe should change that
export function getFormulaMarkdown(formula: string, output?: string): string {
  let markdown = `=${formula}`;
  if (output) {
    output = output.replace(/\n+/g, '\n');
    markdown += ` |||result:\n ${output}\n|||`;
  }
  return markdown;
}

export interface ParseResult {
  formula: string | null;
  result: string | null;
}

export function parseFormulaMarkdown(markdownString: string): ParseResult {
  const matches = Array.from(markdownString.matchAll(FORMULA_REGEX));
  if (matches.length > 0) {
    const formula = matches[0][1].trim();
    const result = matches[0][2] ? matches[0][2].trim() : null;
    return { formula, result };
  } else {
    return { formula: null, result: null };
  }
}

export function stripSharedNodesFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const processedLines: string[] = [];
  let inFormula = false;
  let formulaLines: string[] = [];
  let formulaIndent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFormula) {
      const formulaStart = line.match(/^(\s*)- =/);
      if (formulaStart) {
        inFormula = true;
        formulaIndent = formulaStart[1];
        formulaLines = [line];
      } else {
        processedLines.push(line);
      }
    } else {
      formulaLines.push(line);
      if (line.trim() === '|||' || !line.trim()) {
        inFormula = false;
        const fullFormula = formulaLines.join('\n');
        const matches = Array.from(fullFormula.matchAll(FORMULA_LIST_ITEM_REGEX));

        if (matches.length > 0) {
          const [, indent, question, result] = matches[0];
          if (question.startsWith('find(')) {
            if (result && result.trim() != '@@childnodes') {
              processedLines.push(fullFormula);
            } else {
              processedLines.push(`${indent}- =${question}`);
            }

            // Skip child list items
            while (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              const nextMatch = nextLine.match(/^(\s*)-/);
              
              if (
                (nextMatch && nextMatch[1].length > formulaIndent.length) // skip any list item indented further than the formula
                || (!nextMatch && line.trim())) { // or any multiline continuation of one of those list items

                  i++;

              } else {
                break;
              }
            }
          } else {
            processedLines.push(fullFormula);
          }
        } else {
          // If it doesn't match our formula pattern, just add the lines as is
          processedLines.push(...formulaLines);
        }
        formulaLines = [];
      }
    }
  }

  // Handle case where the last formula is not properly closed
  if (formulaLines.length > 0) {
    processedLines.push(...formulaLines);
  }

  return processedLines.join('\n');
}