import { 
  FormulaOutput,
  NodeElementMarkdown,
  FormulaValueType,
} from "./formula-definitions";
import { 
  isFindFormula,
  isFormula,
  isFormulaWithResults
} from "./formula-markdown-converters";
import { DefaultArguments, possibleArguments, nodeTypes } from "./formula-parser";
import { Page } from "../definitions";
import { stripBrackets } from "../transform-helpers";
import { getOutputAsString } from "./formula-helpers";
import { getUrl } from "../getUrl";
import { sanitizeText } from "../text-helpers";
import { 
  getBlockReferenceFromMarkdown,
  stripBlockReference,
  markdownHasBlockId
} from "../blockref";
import { splitMarkdownByNodes } from "../markdown/markdown-helpers";
import { getNodesMarkdownContext, getPagesContext } from "../ai/context-helpers";
import { DialogueElement, DocumentContent } from "../ai/ai-context";
import { getGPTChatResponseForList } from "../ai/ai";

function stripOuterQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1');
}

export const askCallback = async (defaultArgs: DefaultArguments, userArgs: FormulaOutput[]): Promise<FormulaOutput | null> => {

  if (!defaultArgs.context) return null;

  let pastDialogue: DialogueElement[] = defaultArgs.context.dialogueContext;
  let contextSpecs: string[] = [];
  let contextResults: DocumentContent[][] = [];
  let message: DialogueElement = {
    role: "user",
    content: [],
  };
    
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
    contextResults.push(getPagesContext(contextSpecs, defaultArgs.pages));
  }

  for (const arg of userArgs) {
    const argString = getOutputAsString(arg);
    if (arg.type === FormulaValueType.Text) {
      message.content.push({ type: "text", text: stripOuterQuotes(argString) });
    } else if (arg.type === FormulaValueType.Wikilink) { 
      for (const possibleArg of possibleArguments) {
        if (possibleArg.type === FormulaValueType.Wikilink && possibleArg.regex && argString.match(possibleArg.regex)) {
          if (contextResults.length > 0) {
            const context = contextResults.shift();
            if (context) message.content.push(...context);
          }
          break;
        }
      }
    } else if (arg.type === FormulaValueType.NodeMarkdown) {
      message.content.push(...getNodesMarkdownContext(arg.output as NodeElementMarkdown[]));
    }
  }

  const gptResponse = await getGPTChatResponseForList([...pastDialogue, message]);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
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
    
  if (!defaultArgs.pages || userArgs.length === 0) return null;

  // behavior is undefined if you provide more than one todo status argument
  // in that case we just use the first
  // (multiple statuses in one argument separated by | is okay)

  interface SearchTerm {
    value: string;
    isNegated: boolean;
  }

  const substrings: SearchTerm[] = [];
  let orStatuses: SearchTerm[] = [];
  const wikilinks: SearchTerm[] = [];

  userArgs.forEach(arg => {
    const text = arg.output as string;
    const isNegated = arg.isNegated || false;
    
    if (arg.type === FormulaValueType.NodeTypeOrTypes) {
      if (text === "todos") {
        // "todos" is shorthand for "any todo type"
        const todoStatuses = nodeTypes.map(nodeType => ({
          value: nodeType.name.toUpperCase(),
          isNegated
        }));
        todoStatuses.forEach(status => {
          const existingIndex = orStatuses.findIndex(s => s.value === status.value);
          if (existingIndex >= 0) {
            orStatuses[existingIndex].isNegated = status.isNegated;
          } else {
            orStatuses.push(status);
          }
        });
      } else {
        const newStatuses = text.split("|").map(s => ({
          value: s.toUpperCase().trim(),
          isNegated
        }));
        newStatuses.forEach(status => {
          const existingIndex = orStatuses.findIndex(s => s.value === status.value);
          if (existingIndex >= 0) {
            orStatuses[existingIndex].isNegated = status.isNegated;
          } else {
            orStatuses.push(status);
          }
        });
      }
    } else if (arg.type === FormulaValueType.Text) {
      substrings.push({
        value: text.trim().toLowerCase().replace(/^"(.*)"$/, '$1'),
        isNegated
      });
    } else if (arg.type === FormulaValueType.Wikilink) {
      wikilinks.push({
        value: text.toLowerCase(),
        isNegated
      });
    }
  });
  
  if (substrings.length === 0 && orStatuses.length === 0 && wikilinks.length === 0) return null;

  const output: NodeElementMarkdown[] = [];

  for (const page of defaultArgs.pages) {
  
    let unmatchedSubstringRegexps = [...substrings];

    // search terms can appear in the title or the content of the page
    // First check negated terms - if any match in title, skip this page entirely
    const hasNegatedMatch = unmatchedSubstringRegexps.some(substring => 
      substring.isNegated && page.title.toLowerCase().includes(substring.value)
    );
    if (hasNegatedMatch) {
      continue; // Skip to next page
    }

    // Then handle non-negated terms
    unmatchedSubstringRegexps = unmatchedSubstringRegexps.filter((substring) => {
      const matches = page.title.toLowerCase().includes(substring.value);
      return !matches;
    });

    let unmatchedWikilinks = [...wikilinks];
    let blockId: string | undefined = undefined;
    let exactNegatedMatch = false;
    unmatchedWikilinks = unmatchedWikilinks.filter((wikilink) => {
      let strippedWikilink = stripBrackets(wikilink.value);
      const pageBlockId = getBlockReferenceFromMarkdown(strippedWikilink);
      if (pageBlockId) {
        strippedWikilink = stripBlockReference(strippedWikilink);
      }
      const matches = page.title.toLowerCase() === strippedWikilink;
      if (matches && !wikilink.isNegated) {
        blockId = pageBlockId || undefined;
      }

      if (wikilink.isNegated && matches) exactNegatedMatch = true;

      return !matches;
    });

    // title is an exact match for a negated wikilink, skip
    if (exactNegatedMatch) {
      continue;
    } 

    function processNodes(
        nodesMarkdown: NodeElementMarkdown[],
        unmatchedSubstrings: SearchTerm[],
        orStatuses: SearchTerm[],
        currentWikilinks: SearchTerm[]
      ): NodeElementMarkdown[] {
        const output: NodeElementMarkdown[] = [];
        for (let node of nodesMarkdown) {
          const nodeMarkdown = node.baseNode.nodeMarkdown;
          
          // First check negated terms - if any match, skip this node
          const hasNegatedMatch = unmatchedSubstrings.some(substring => 
            substring.isNegated && nodeMarkdown.toLowerCase().includes(substring.value)
          ) || currentWikilinks.some(wikilink =>
            wikilink.isNegated && nodeMarkdown.toLowerCase().includes(wikilink.value)
          ) || orStatuses.some(status =>
            status.isNegated && new RegExp(`^\\s*- ${status.value}`).test(nodeMarkdown)
          );

          if (hasNegatedMatch) {
            // If any negated term matches, skip this node and check children
            if (node.children && node.children.length > 0) {
              output.push(...processNodes(node.children, unmatchedSubstrings, orStatuses, currentWikilinks));
            }
            continue;
          }

          // Now check non-negated terms
          const matchesAllSubstrings = unmatchedSubstrings
            .filter(s => !s.isNegated)
            .every(substring => nodeMarkdown.toLowerCase().includes(substring.value));

          const matchesAllWikilinks = currentWikilinks
            .filter(w => !w.isNegated)
            .every(wikilink => nodeMarkdown.toLowerCase().includes(wikilink.value));

          const nonNegatedStatuses = orStatuses.filter(s => !s.isNegated);
          const matchesStatus = nonNegatedStatuses.length === 0 || 
            nonNegatedStatuses.some(status => 
              new RegExp(`^\\s*- ${status.value}`).test(nodeMarkdown)
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
                ...processNodes(node.children, unmatchedSubstrings, orStatuses, currentWikilinks)
              );
            }
          }
        }

        return output;
      }

      const pageValue = defaultArgs.pageUpdateContext?.getUpdatedPageValue?.(page) ?? page.value;
      const nodesMarkdown = splitMarkdownByNodes(pageValue, page.title);
      output.push(
        ...processNodes(nodesMarkdown, unmatchedSubstringRegexps, orStatuses, unmatchedWikilinks)
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
    console.log('🛑 Error fetching or rendering content:', error);
  }

  return {
    output: pagesContents.trim(),
    type: FormulaValueType.Text
  };
}
    


