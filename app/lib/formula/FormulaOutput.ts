import { 
  FormulaOutput,
  isFormulaDefinitionWithPage,
  FormulaOutputType
} from './formula-definitions';
import { 
  getShortGPTChatResponse,
  getFormulaDefinition
 } from '@/app/lib/ai';
import { Page } from '@/app/lib/definitions';
import { getPageMarkdown } from '@/app/lib/pages-helpers';
import { stripBrackets } from '@/app/lib/transform-helpers';
import { getLastTwoWeeksJournalPages } from '@/app/lib/journal-helpers';
import { regexCallbacks } from './regex-callbacks';

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

async function getPagesContext(pageSpec: string, pages: Page[]): Promise<string | null> {

  const pageTitle = stripBrackets(pageSpec);

  async function generateContextStr(pagesToProcess: Page[]): Promise<string> {
    let contextStr = "\n" + todoInstructions;
    for (const page of pagesToProcess) {
      if (page.value.startsWith("{")) {
        const pageMarkdown = await getPageMarkdown(page);
        contextStr += "\n## " + page.title + "\n" + pageMarkdown;
      } else {
        contextStr += "\n## " + page.title + "\n" + page.value;
      }
    }
    return contextStr;
  }

  if (pageTitle.endsWith("/")) {
    let selectedPages: Page[] = [];
    if (pageTitle === "journals/") {
      selectedPages = await getLastTwoWeeksJournalPages(pages);
    } else {
      selectedPages = pages.filter((p) =>
        p.title.startsWith(pageTitle.slice(0, -1))
      );
    }
    return selectedPages.length === 0 ? null : await generateContextStr(selectedPages);
  } else {
    const page = pages.find((p) => p.title === pageSpec);
    return page ? await generateContextStr([page]) : null;
  }
}

export async function getFormulaOutput(formula: string, pages: Page[]): Promise<FormulaOutput | null> {

  // Check if the formula matches any of the regex patterns
  for (const [regex, callback] of regexCallbacks) {
    const match = formula.match(regex);
    if (match) {
      return await callback(match, pages);
    }
  }

  // If no match is found, proceed with the original code
  const formulaDefinition = await getFormulaDefinition(formula);
  if (!formulaDefinition) {
    console.log("no formula definition");
    return null;
  }

  let prompt = formulaDefinition.prompt;
  if (isFormulaDefinitionWithPage(formulaDefinition) && formulaDefinition.inputPage) {
    const pagesContext = await getPagesContext(formulaDefinition.inputPage, pages);
    if (pagesContext) {
      prompt = prompt + pagesContext;
    } else {
      console.log("no pages context");
    }
  }

  const gptResponse = await getShortGPTChatResponse(prompt);
  if (!gptResponse) return null;

  return { output: gptResponse, type: FormulaOutputType.Text };
}