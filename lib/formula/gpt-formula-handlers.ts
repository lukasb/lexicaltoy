import { getShortGPTChatResponse, getGPTChatResponseForList } from "../ai";
import { PageAndDialogueContext } from "./FormulaOutput";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";
import { BLOCK_ID_REGEX } from '../blockref';

function getPromptWithContextForChat(formula: string, priorMarkdown: string): string {
  return `
The user is editing this document with an app that supports inline chats with language models. The question might or not be related to the rest of the document.
If it's not related, ignore the document content when answering the user question, and do not mention that the document content is not relevant.
# DOCUMENT CONTENT
${priorMarkdown}
# END DOCUMENT CONTENT

${formula}
`
}

export function getPromptWithContextForGeneration(prompt: string, priorMarkdown: string): string {
  return `
The user is editing this document with an app that supports inline generation with language models. The user prompt might or not be related to the rest of the document.
If it's not related, ignore the document content.
# DOCUMENT CONTENT
${priorMarkdown}
# END DOCUMENT CONTENT

User prompt: ${prompt}
`
}

function cleanFormulaForPrompt(formula: string): string {
  let cleanedFormula = formula;
  if (cleanedFormula.startsWith("=")) cleanedFormula = cleanedFormula.slice(1);
  const match = cleanedFormula.match(BLOCK_ID_REGEX);
  if (match) {
    cleanedFormula = cleanedFormula.slice(0, match.index);
  }
  return cleanedFormula;
}

export async function getGPTResponseForList(prompt: string, context?: PageAndDialogueContext): Promise<FormulaOutput | null> {
  const formulaWithoutEqualSign = cleanFormulaForPrompt(prompt);
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
      fullPrompt = getPromptWithContextForChat(formulaWithoutEqualSign, context.priorMarkdown);
    } else {
      fullPrompt = formulaWithoutEqualSign;
    }
  //}
  const gptResponse = await getGPTChatResponseForList(
    fullPrompt,
    context.dialogueContext);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
}

export async function getShortGPTResponse(prompt: string, context?: PageAndDialogueContext): Promise<FormulaOutput | null> {
  const formulaWithoutEqualSign = cleanFormulaForPrompt(prompt);
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
      fullPrompt = getPromptWithContextForChat(formulaWithoutEqualSign, context.priorMarkdown);
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
