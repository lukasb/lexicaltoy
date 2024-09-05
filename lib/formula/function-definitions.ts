import { 
  FormulaOutput,
  createBaseNodeMarkdown,
  NodeElementMarkdown,
  FormulaValueType,
} from "./formula-definitions";
import { getShortGPTChatResponse } from "../ai";
import { DefaultArguments, possibleArguments, TODO_STATUS_REGEX_EXTERNAL } from "./formula-parser";
import { Page } from "../definitions";
import { getLastSixWeeksJournalPages } from "../journal-helpers";
import { stripBrackets } from "../transform-helpers";
import { getOutputAsString } from "./FormulaOutput";

const todoInstructions = `
Below you'll see the contents of one or more pages. Pages may include to-do list items that look like this:

Example content:
- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- LATER write a letter to grandma
- DONE make a cake

Items marked with DONE are complete, all other items are incomplete.
User content:
`;

function getPagesContext(pageSpecs: string[], pages: Page[]): string[] {
  const pageValues: string[] = [];

  function addPages(pageSpec: string) {
    const pageTitle = stripBrackets(pageSpec);

    if (pageTitle.endsWith("/")) {
      if (pageTitle === "journals/") {
        const journalPages = getLastSixWeeksJournalPages(pages);
        journalPages.forEach(page => pageValues.push(page.value));
      } else {
        pages
          .filter(p => p.title.startsWith(pageTitle.slice(0, -1)))
          .forEach(page => pageValues.push(page.value));
      }
    } else {
      const page = pages.find(p => p.title === pageSpec);
      if (page) pageValues.push(page.value);
    }
  }

  for (const pageSpec of pageSpecs) {
    addPages(pageSpec);
  }

  return pageValues;
}

function stripOuterQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1');
}

export const askCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {

  if (!defaultArgs.dialogueElements) return null;

  let prompt: string = "";
  let contextSpecs: string[] = [];
  let contextResults: string[] = [];

  const nodeMarkdownPossibleArguments = possibleArguments.filter(arg => arg.type === FormulaValueType.NodeMarkdown);
    
  // if a user arg is a wikilink variant, we need to get the relevant page contents if the page exists
  for (const arg of userArgs) {  
    if (arg.type === FormulaValueType.Text) {
      const text = arg.output as string;
      for (const nodeMarkdownArg of nodeMarkdownPossibleArguments) {
        if (nodeMarkdownArg.regex && text.match(nodeMarkdownArg.regex)) {
          contextSpecs.push(text);
        }
      }
    }
  }

  if (contextSpecs.length > 0 && defaultArgs.pages) {
    contextResults = getPagesContext(contextSpecs, defaultArgs.pages);
  }

  if (contextResults.length > 0 || userArgs.filter(arg => arg.type === FormulaValueType.NodeMarkdown).length > 0) {
    prompt = todoInstructions;
  }

  for (const arg of userArgs) {
    if (arg.type === FormulaValueType.Text) {
      const text = arg.output as string;
      for (const nodeMarkdownArg of nodeMarkdownPossibleArguments) {
        if (nodeMarkdownArg.regex && text.match(nodeMarkdownArg.regex)) {
          if (contextResults.length > 0) {
            prompt += "\n## " + stripBrackets(text) + "\n" + contextResults.shift() + "\n";
          }
          break;
        }
      }
      prompt += "\n" + stripOuterQuotes(text) + "\n";
    } else if (arg.type === FormulaValueType.NodeMarkdown) {
      // TODO maybe include the page name
      prompt += "\n" + getOutputAsString(arg) + "\n";
    }
  }

  const gptResponse = await getShortGPTChatResponse(prompt, defaultArgs.dialogueElements);
  if (!gptResponse) return null;

  return { output: gptResponse, type: FormulaValueType.Text };
};

export const findCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {
    
  // we also check the title when matching, so if one substring is in the title and another
  // is in the line, we match

  if (!defaultArgs.pages || userArgs.length === 0) return null;

  // behavior is undefined if you provide more than one todo status argument
  // in that case we just use the first
  // (multiple statuses in one argument separated by | is okay)

  const substrings: string[] = [];
  let orStatuses: string[] = [];

  userArgs.forEach(arg => {
    if (arg.type !== FormulaValueType.Text && arg.type !== FormulaValueType.NodeTypeOrTypes) return;
    const text = arg.output as string;
    if (arg.type === FormulaValueType.NodeTypeOrTypes) {
      orStatuses = orStatuses.concat(text.split("|").map(s => s.toUpperCase().trim()));
    } else if (arg.type === FormulaValueType.Text) {
      substrings.push(text.trim().toLowerCase().replace(/^"(.*)"$/, '$1'));
    }
  });
  
  if (substrings.length === 0 && orStatuses.length === 0) return null;

  const output: NodeElementMarkdown[] = [];

  for (const page of defaultArgs.pages) {
    let unmatchedSubstrings = [...substrings];

    // search terms can appear in the title or the content of the page
    unmatchedSubstrings = unmatchedSubstrings.filter((substring) => {
      if (page.title.toLowerCase().includes(substring)) {
        return false;
      }
      return true;
    });

    function processNodes(
        nodesMarkdown: NodeElementMarkdown[],
        unmatchedSubstrings: string[],
        orStatuses: string[]
      ): NodeElementMarkdown[] {
        const output: NodeElementMarkdown[] = [];
        for (let node of nodesMarkdown) {
          const lowercaseMarkdown = node.baseNode.nodeMarkdown.toLowerCase();
          const matchesAllSubstrings = unmatchedSubstrings.every((substring) =>
            lowercaseMarkdown.includes(substring)
          );
          const matchesStatus = orStatuses.length === 0 || orStatuses.some((status) =>
            new RegExp(`^\s*- ${status}`).test(node.baseNode.nodeMarkdown)
          );

          if (matchesAllSubstrings && matchesStatus) {
            // Avoid circular references by excluding lines with find() formulas
            if (!findFormulaStartRegex.test(lowercaseMarkdown)) {
              removeFindNodes(node);
              output.push(node);
            }
          } else {
            // didn't match, check children
            if (node.children && node.children.length > 0) {
              output.push(
                ...processNodes(node.children, unmatchedSubstrings, orStatuses)
              );
            }
          }
        }

        return output;
      }

      const nodesMarkdown = splitMarkdownByNodes(page.value, page.title);
      output.push(
        ...processNodes(nodesMarkdown, unmatchedSubstrings, orStatuses)
      );
    }

  return {
    output: output,
    type: FormulaValueType.NodeMarkdown,
  };  
};

export const findFormulaStartRegex = /^\s*- =(find\(|[^,]*,\s*find\()/;

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
export function removeFindNodes(node: NodeElementMarkdown): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (findFormulaStartRegex.test(child.baseNode.nodeMarkdown)) {
      node.children.splice(i);
      return;
    }
    removeFindNodes(child);
  }
}