import { 
  FormulaStringOutput
} from './formula-definitions';
import { 
  getShortGPTChatResponse,
  getFormulaDefinition
} from '../ai-actions';

export async function getFormulaOutput(formula: string): Promise<FormulaStringOutput | null> {
  const formulaDefinition = await getFormulaDefinition(formula);
  if (!formulaDefinition) return null;
  console.log(formulaDefinition);
  if (formulaDefinition.inputPage) {
    // TODO
  } else {
    const gptResponse = await getShortGPTChatResponse(formulaDefinition.prompt);
    if (!gptResponse) return null;
    console.log(gptResponse);
    const formulaResult: FormulaStringOutput = {
      output: gptResponse,
      caption: formulaDefinition.outputCaption
    };
    return formulaResult;
  }
  return null;
}