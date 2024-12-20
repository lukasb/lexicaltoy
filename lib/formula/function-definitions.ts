import { 
  FormulaOutput,
  createBaseNodeMarkdown,
  NodeElementMarkdown,
  FormulaValueType,
} from "./formula-definitions";
import { 
  FORMULA_RESULTS_END_REGEX,
  isFindFormula,
  isFormula,
  isFormulaWithResults
} from "./formula-markdown-converters";
import { DefaultArguments, possibleArguments, nodeTypes } from "./formula-parser";
import { Page } from "../definitions";
import { getLastSixWeeksJournalPages } from "../journal-helpers";
import { stripBrackets } from "../transform-helpers";
import { getOutputAsString } from "./formula-helpers";
import { getUrl } from "../getUrl";
import { sanitizeText } from "../text-helpers";
import { getGPTResponseForList } from "./gpt-formula-handlers";
import { 
  BLOCK_ID_REGEX,
  BLOCK_REFERENCE_REGEX,
  getBlockReferenceFromMarkdown,
  stripBlockReference,
  markdownHasBlockId
} from "../blockref";
import { 
  nodeToString,
  nodeValueForFormula,
  getListItemContentsFromMarkdown
} from "./formula-helpers";

const instructionsWithContext = `
# INSTRUCTIONS AND EXAMPLES
You will receive user questions or instructions, and content from one or more pages. Pages will look like this:

## Today's agenda
Hmmm ... need to figure out meaning of life today.
- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- =find("#parser")
- =ask("What is the meaning of life?") |||result: There has been much debate on this topic.
The most common answer is 42.
|||
- =why 42? |||result: Because 6*7=42|||
- LATER write a letter to grandma
- DONE make a cake
- Who should I invite?
 - John
 - Jane
 - Mary
## END OF PAGE CONTENTS

Items that start with TODO, DOING, NOW, LATER, DONE, or WAITING are todos. Bullet points that start with = are formulas.
Formulas that start with ask(), or don't have an explicit function, trigger a chat with GPT.
# END OF INSTRUCTIONS AND EXAMPLES
`;

function getPageContext(page: Page): string {
  return "## " + page.title + "\n" + page.value + "\n## END OF PAGE CONTENTS\n";
}

function getBlockContext(page: Page, blockId: string): string {
  const nodes = splitMarkdownByNodes(page.value, page.title);

  function findBlock(nodes: NodeElementMarkdown[], blockId: string): NodeElementMarkdown | null {
    for (const node of nodes) {
      console.log("node", node.baseNode.nodeMarkdown);
      const match = node.baseNode.nodeMarkdown.match(BLOCK_ID_REGEX);
      if (match && match[1] === blockId) return node;
      const result = findBlock(node.children, blockId);
      if (result) return result;
    }
    return null;
  }

  const blockNode = findBlock(nodes, blockId);
  if (!blockNode) return "";
  const blockNodeMarkdown = nodeToString(blockNode);
  const blockNodeContents = getListItemContentsFromMarkdown(blockNodeMarkdown);
  const blockNodeValue = nodeValueForFormula(blockNodeContents);
  return blockNodeValue;
}

function getPagesContext(pageSpecs: string[], pages: Page[]): string[] {
  let pagesContext: string[] = [];

  function addPages(pageSpec: string) {
    const pageTitle = stripBrackets(pageSpec);

    if (pageTitle.endsWith("/")) {
      if (pageTitle === "journals/") {
        const journalPages = getLastSixWeeksJournalPages(pages);
        let journalPagesContext: string = "";
        journalPages.forEach(page => journalPagesContext += getPageContext(page));
        pagesContext.push(journalPagesContext);
      } else {
        pages
          .filter(p => p.title.startsWith(pageTitle.slice(0, -1)))
          .forEach(page => pagesContext.push(getPageContext(page)));
      }
    } else if (BLOCK_REFERENCE_REGEX.test(pageTitle)) {
      const match = pageTitle.match(BLOCK_REFERENCE_REGEX);
      const cleanPageTitle = pageTitle.replace(BLOCK_REFERENCE_REGEX, "");
      const page = pages.find(p => p.title === cleanPageTitle);
      if (match && page) {
        const blockContext = getBlockContext(page, match[1]);
        if (blockContext) pagesContext.push(blockContext);
      }
    } else {
      const page = pages.find(p => p.title === pageTitle);
      if (page) pagesContext.push(getPageContext(page));
    }
  }

  for (const pageSpec of pageSpecs) {
    addPages(pageSpec);
  }

  return pagesContext;
}

function stripOuterQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1');
}

export const askCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {

  if (!defaultArgs.context) return null;

  let prompt: string = "";
  let contextSpecs: string[] = [];
  let contextResults: string[] = [];
    
  // if a user arg is a wikilink variant, we need to get the relevant page contents if the page exists
  for (const arg of userArgs) {
    if (arg.type === FormulaValueType.Wikilink) {
      const text = arg.output as string;
      for (const possibleArg of possibleArguments) {
        if (possibleArg.type === FormulaValueType.Wikilink && possibleArg.regex && text.match(possibleArg.regex)) {
          contextSpecs.push(text);
          break;
        }
      }
    }
  }

  if (contextSpecs.length > 0 && defaultArgs.pages) {
    contextResults = getPagesContext(contextSpecs, defaultArgs.pages);
  }
  
  if (
    (contextResults.length > 0 || userArgs.filter(arg => arg.type === FormulaValueType.NodeMarkdown).length > 0)
    || defaultArgs.context?.priorMarkdown.length > 0) {
    prompt += instructionsWithContext;
  }

  for (const arg of userArgs) {
    const argString = getOutputAsString(arg);
    if (arg.type === FormulaValueType.Text) {
      prompt += "\n" + stripOuterQuotes(argString) + "\n";
    } else if (arg.type === FormulaValueType.Wikilink) { 
      for (const possibleArg of possibleArguments) {
        if (possibleArg.type === FormulaValueType.Wikilink && possibleArg.regex && argString.match(possibleArg.regex)) {
          if (contextResults.length > 0) {
            prompt += "\n" + contextResults.shift() + "\n";
          }
          break;
        }
      }
    } else if (arg.type === FormulaValueType.NodeMarkdown) {
      // TODO maybe include the page name
      prompt += "\n" + argString + "\n";
    }
  }

  const gptResponse = await getGPTResponseForList(prompt, defaultArgs.context);
  if (!gptResponse) return null;

  return gptResponse;
};

export function sortFindOutput(output: NodeElementMarkdown[], pages: Page[]): NodeElementMarkdown[] {

  const sortedOutput = output.sort((a, b) => {
    const pageA = pages.find(p => p.title === a.baseNode.pageName);
    const pageB = pages.find(p => p.title === b.baseNode.pageName);
    
    // If one is a journal and the other isn't, journal comes first
    if (pageA?.isJournal !== pageB?.isJournal) {
      return pageA?.isJournal ? -1 : 1;
    }

    // If both are journals, sort by date (reverse chronological)
    if (pageA?.isJournal && pageB?.isJournal) {
      // Convert date strings like "Oct 23rd, 2024" to "2024-10-23" format
      const parseDate = (dateStr: string) => {
        const [month, day, year] = dateStr.replace(/(?:st|nd|rd|th)/, '').split(/[\s,]+/);
        const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
        return `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
      };
      
      const dateStrA = parseDate(pageA.title);
      const dateStrB = parseDate(pageB.title);
      return dateStrB.localeCompare(dateStrA);
    }

    // If neither are journals, sort alphabetically by title
    return (pageA?.title || '').localeCompare(pageB?.title || '');
  });

  return sortedOutput;
}

export const findCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {
    
  // we also check the title when matching, so if one substring is in the title and another
  // is in the line, we match

  if (!defaultArgs.pages || userArgs.length === 0) return null;

  // behavior is undefined if you provide more than one todo status argument
  // in that case we just use the first
  // (multiple statuses in one argument separated by | is okay)

  const substrings: string[] = [];
  let orStatuses: string[] = [];
  const wikilinks: string[] = [];

  userArgs.forEach(arg => {
    const text = arg.output as string;
    if (arg.type === FormulaValueType.NodeTypeOrTypes) {
      if (text === "todos") {
        // "todos" is shorthand for "any todo type"
        orStatuses = nodeTypes.map(nodeType => nodeType.name.toUpperCase());
      } else {
        orStatuses = orStatuses.concat(text.split("|").map(s => s.toUpperCase().trim()));
      }
    } else if (arg.type === FormulaValueType.Text) {
      substrings.push(text.trim().toLowerCase().replace(/^"(.*)"$/, '$1'));
    } else if (arg.type === FormulaValueType.Wikilink) {
      wikilinks.push(text.toLowerCase());
    }
  });
  
  if (substrings.length === 0 && orStatuses.length === 0 && wikilinks.length === 0) return null;

  const output: NodeElementMarkdown[] = [];

  for (const page of defaultArgs.pages) {
    //if (page.title === 'Oct 23rd, 2024') console.log("processing page", page.title, page.value);
    let unmatchedSubstringRegexps = [...substrings];

    // search terms can appear in the title or the content of the page
    unmatchedSubstringRegexps = unmatchedSubstringRegexps.filter((substring) => {
      if (page.title.toLowerCase().includes(substring)) {
        return false;
      }
      return true;
    });

    let unmatchedWikilinks = [...wikilinks];
    let blockId: string | undefined = undefined;
    unmatchedWikilinks = unmatchedWikilinks.filter((wikilink) => {
      let strippedWikilink = stripBrackets(wikilink);
      const pageBlockId = getBlockReferenceFromMarkdown(strippedWikilink);
      if (pageBlockId) {
        strippedWikilink = stripBlockReference(strippedWikilink);
      }
      if (page.title.toLowerCase() === strippedWikilink) {
        blockId = pageBlockId || undefined;
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
          const nodeMarkdown = node.baseNode.nodeMarkdown;
          const matchesAllSubstrings = unmatchedSubstrings.every((substring) =>
            nodeMarkdown.toLowerCase().includes(substring)
          );
          const matchesStatus = orStatuses.length === 0 || orStatuses.some((status) =>
            new RegExp(`^\\s*- ${status}`).test(nodeMarkdown)
          );
          const matchesAllWikilinks = unmatchedWikilinks.every((wikilink) =>
            nodeMarkdown.toLowerCase().includes(wikilink)
          );
          const matchesBlockId = blockId ? markdownHasBlockId(nodeMarkdown, blockId) : true;
          if (matchesAllSubstrings && matchesStatus && matchesAllWikilinks && matchesBlockId) {
            if (!invalidFindResult(nodeMarkdown)) {
              removeInvalidNodesForFind(node);
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

      const pageValue = defaultArgs.pageUpdateContext ? defaultArgs.pageUpdateContext.getUpdatedPageValue(page) : page.value;
      const nodesMarkdown = splitMarkdownByNodes(pageValue, page.title);
      output.push(
        ...processNodes(nodesMarkdown, unmatchedSubstringRegexps, orStatuses)
      );
    }

  return {
    output: sortFindOutput(output, defaultArgs.pages),
    type: FormulaValueType.NodeMarkdown,
  };  
};

// Avoid circular references by excluding lines with find() formulas
// also exclude formulas without results
function invalidFindResult(markdown: string): boolean {
  return isFindFormula(markdown) || 
    (isFormula(markdown) && !isFormulaWithResults(markdown));
}

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
  let isProcessingFormula = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const isListItem = trimmedLine.startsWith("-");
    const indentation = line.length - trimmedLine.length;

    if (isListItem && /- =\w+\(.*\) \|\|\|result:/.test(trimmedLine)) {
      isProcessingFormula = true;
    }

    if ((trimmedLine === "" && !isProcessingFormula) || (isListItem && (!isProcessingFormula || /^\s*- =\w+\(.*\) \|\|\|result:/.test(trimmedLine)))) {
      if (trimmedLine !== "") {
        while (indentation < currentIndentation && stack.length > 1) {
          stack.pop();
          currentIndentation -= indentStack.pop() || 2;
        }

        const newNode: NodeElementMarkdown = {
          baseNode: createBaseNodeMarkdown(pageName, i + 1, i + 1, line),
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
      } else if (!isProcessingFormula) {
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
        if (isProcessingFormula && trimmedLine.match(FORMULA_RESULTS_END_REGEX)) {
          isProcessingFormula = false;
        }
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

// for now, if we hit a find() node, or a formula without results, just remove it, any children, and any
// subsequent siblings from the search results
export function removeInvalidNodesForFind(node: NodeElementMarkdown): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (invalidFindResult(child.baseNode.nodeMarkdown)) {
      node.children.splice(i);
      return;
    }
    removeInvalidNodesForFind(child);
  }
}

export const getUrlCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {
  if (userArgs.length === 0) return null;

  let pagesContents: string = "";
  const urls = [];
  for (const arg of userArgs) {
    if (arg.type !== FormulaValueType.Text) continue;
    // strip outer quotes
    const url = (arg.output as string).replace(/^"(.*)"$/, '$1').trim();
    urls.push(url);
  }

  try {
    // Fetch the content from the URL
    const markdownContents = await getUrl(urls);

    if (!markdownContents) return null;

    for (const [url, markdownContent] of markdownContents) {
      pagesContents += "## " + url + "\n" + sanitizeText(markdownContent) + "##END PAGE CONTENTS\n";
    }
  } catch (error) {
    pagesContents = "Error fetching or rendering content.";
    console.error('Error fetching or rendering content:', error);
  }

  return {
    output: pagesContents.trim(),
    type: FormulaValueType.Text
  };
}
    


