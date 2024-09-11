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
  let fullPrompt = "";

  // the prior dialogue as we receive it only has the user prompt
  // it doesn't have additional document context etc
  // so for now always include the document context

  //if (context.dialogueContext.length > 0) {
    // if we're in an ongoing conversation, the contents of the current document will have already been sent
    // so we don't need to send it again
    // (unless the user excluded  it on purpose, in which case we also shouldn't send it)
  //  fullPrompt = formulaWithoutEqualSign;
  //} else {
    if (context.priorMarkdown.trim().length > 0) {
      fullPrompt = getPromptWithContext(formulaWithoutEqualSign, context.priorMarkdown);
    } else {
      fullPrompt = formulaWithoutEqualSign;
    }
  //}
  const gptResponse = await getShortGPTChatResponse(
    fullPrompt,
    context.dialogueContext);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
}
