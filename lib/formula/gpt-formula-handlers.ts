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
  let fullPrompt = "";
  if (context.dialogueContext.length > 0) {
    // if we're in an ongoing conversation, the contents of the current document will have already been sent
    // so we don't need to send it again
    // (unless the user excluded  it on purpose, in which case we also shouldn't send it)
    fullPrompt = formulaWithoutEqualSign;
  } else {
    fullPrompt = getPromptWithContext(formulaWithoutEqualSign, context.priorMarkdown);
  }
  const gptResponse = await getShortGPTChatResponse(
    getPromptWithContext(fullPrompt, context.priorMarkdown),
    context.dialogueContext);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
}
