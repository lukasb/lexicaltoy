import { getShortGPTChatResponse } from "../ai";
import { PageAndDialogueContext } from "./FormulaOutput";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";

function getPromptWithContext(formula: string, priorMarkdown: string): string {
  return `
  The user is asking a question in the context of a document. The question might or not be related to the document.
  # DOCUMENT CONTENT
  ${priorMarkdown}
  # END DOCUMENT CONTENT

  ${formula}
  `
}

export async function getGPTResponse(prompt: string, context?: PageAndDialogueContext): Promise<FormulaOutput | null> {
  const formulaWithoutEqualSign = prompt.startsWith("=") ? prompt.slice(1) : prompt;
  if (!context) return null;
  console.log("prior markdown", context.priorMarkdown);
  const gptResponse = await getShortGPTChatResponse(
    getPromptWithContext(formulaWithoutEqualSign, context.priorMarkdown),
    context.dialogueContext);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
}
