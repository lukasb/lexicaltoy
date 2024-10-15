import { BLOCK_ID_REGEX } from "../blockref";

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
  * Like other nodes, formula nodes can have block references at the end.
  * =formula |||result:
  * result text
  * ||| ^block-id
  * 
  * We (will eventually) escape any pipe symbols in the formula and output to avoid conflicts with our custom markdown.
  */


const FORMULA_START_REGEX = /^=(.*?)(?:\s*\|\|\|result:|$)/;
export const FORMULA_LIST_ITEM_REGEX = /^(\s*)- =(.+?)(?:\s*\|\|\|result:[\n]?([\s\S]*?)\|\|\|)?(\^[a-zA-Z0-9-]+)?$/gm; // something is broken with capture groups here
const FORMULA_LIST_ITEM_START_WITH_RESULTS_REGEX = /^(\s*)- =.*\|\|\|result:/;
export const FORMULA_LIST_ITEM_WITH_RESULTS_REGEX = /^(\s*)- =(.+?)(?:\s*\|\|\|result:[\n]?([\s\S]*?)\|\|\|)(\s)?(\^[a-zA-Z0-9-]+)?$/gm; // something is broken with capture groups here
export const FIND_FORMULA_START_REGEX = /^\s*- =(find\(|[^,]*,\s*find\()/;
export const IS_FORMULA_REGEX = /^\s*- =/;
export const FORMULA_RESULTS_END_REGEX = /^\s*\|\|\|(\s)?(\^[a-zA-Z0-9-]+)?$/;

// formula as stored by the nodes has the = sign at the front, maybe should change that
export function getFormulaMarkdown(formula: string, output?: string, blockId?: string): string {
  const match = formula.match(BLOCK_ID_REGEX);
  if (match) {
    formula = formula.slice(0, match.index);
  }
  let markdown = `=${formula}`;
  if (output) {
    output = output.replace(/\n+/g, '\n');
    markdown += ` |||result:\n ${output}\n|||`;
    if (match) {
      markdown += ` ${match[0]}`;
    }
  }
  if (blockId) {
    markdown += ` ${blockId}`;
  }
  return markdown;
}

export interface ParseResult {
  formula: string | undefined;
  result: string | undefined;
  blockId: string | undefined;
}

// expects to get a formula without bullet point at the start
export function parseFormulaMarkdown(markdownString: string): ParseResult {
  const match = markdownString.match(FORMULA_START_REGEX);
  const resultMarker = '|||result:';
  const resultMarkerLength = resultMarker.length;
  let result = undefined;
  let blockId = undefined;

  if (match) {
    const formula = match[1].trim();
    const resultStart = markdownString.indexOf(resultMarker);
    
    if (resultStart !== -1) {
      const resultEnd = markdownString.indexOf('|||', resultStart + resultMarkerLength);
      if (resultEnd !== -1) {
        result = markdownString.slice(resultStart + 10, resultEnd).trim();
        const match = markdownString.match(BLOCK_ID_REGEX);
        if (match) {
          blockId = match[0];
        }
        return { formula, result, blockId };
      } else {
        console.log("no result end");
      }
    } else {
      const match = markdownString.match(BLOCK_ID_REGEX);
      if (match) {
        blockId = match[0];
      }
      return { formula, result, blockId };
    }
  }
  
  return { formula: undefined, result: undefined, blockId: undefined };
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
      const formulaStart = line.match(FORMULA_LIST_ITEM_START_WITH_RESULTS_REGEX);
      if (formulaStart) {
        inFormula = true;
        formulaIndent = formulaStart[1];
        formulaLines = [line];
      } else {
        processedLines.push(line);
      }
    } else {
      formulaLines.push(line);
      if (line.match(FORMULA_RESULTS_END_REGEX) || !line.trim()) {
        inFormula = false;
        const fullFormula = formulaLines.join('\n');
        const matches = Array.from(fullFormula.matchAll(FORMULA_LIST_ITEM_REGEX));

        if (matches.length > 0) {
          processedLines.push(fullFormula);
          const [, indent, question, result] = matches[0];
          // TODO this is terrible
          if (question.startsWith('find(') || question.startsWith('ask(')) {
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