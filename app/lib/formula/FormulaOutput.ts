import { 
  FormulaStringOutput,
  isFormulaDefinitionWithPage
} from './formula-definitions';
import { 
  getShortGPTChatResponse,
  getFormulaDefinition
} from '../ai-actions';
import { Page } from '@/app/lib/definitions';
import { getPageMarkdown } from '../pages-helpers';
import { stripBrackets } from '../transform-helpers';

const todoInstructions = `
Below you'll see the contents of one or more pages. Pages may include to-do list items that look like this:

- TODO buy groceries
- DOING prepare taxes
- NOW call janet
- LATER write a letter to grandma
- DONE make a cake

Items marked with DONE are complete, all other items are incomplete.
`;

export async function getFormulaOutput(formula: string, pages: Page[]): Promise<FormulaStringOutput | null> {
  
  console.log("getting formula output", formula);
  const formulaDefinition = await getFormulaDefinition(formula);
  if (!formulaDefinition) {
    console.log("no formula definition");
    return null;
  }
  
  let prompt = formulaDefinition.prompt;
  if (
    isFormulaDefinitionWithPage(formulaDefinition) &&
    formulaDefinition.inputPage
  ) {
    const pageTitle = stripBrackets(formulaDefinition.inputPage);
    prompt = prompt + "\n" + todoInstructions;
    if (pageTitle.endsWith("/")) {
      const matchingPages = pages.filter((p) => p.title.startsWith(pageTitle.slice(0, -1)));
      for (const page of matchingPages) {
        const pageMarkdown = await getPageMarkdown(page);
        prompt = prompt + "\n" + "##" + page.title + "\n" + pageMarkdown;
      }
    } else {
      const page = pages.find((p) => p.title === formulaDefinition.inputPage);
      if (!page) return null;
      const pageMarkdown = await getPageMarkdown(page);
      prompt = prompt + "\n" + todoInstructions;
      prompt = prompt + "\n" + "##" + page.title + "\n" + pageMarkdown;
    }
  }
  console.log("getting short response");
  const gptResponse = await getShortGPTChatResponse(prompt);
  if (!gptResponse) return null;

  return {
    output: gptResponse,
    caption: formulaDefinition.outputCaption
  };
}