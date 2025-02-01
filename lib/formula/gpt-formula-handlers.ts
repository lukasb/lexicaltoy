import { getShortGPTChatResponse, getGPTChatResponseForList } from "../ai/ai";
import { PageAndDialogueContext, DialogueElement, DocumentContent } from "../ai/ai-context";
import { FormulaOutput, FormulaValueType } from "./formula-definitions";
import { BLOCK_ID_REGEX } from '../blockref';

function getPromptWithContextForShortChat(formula: string, priorMarkdown?: string): DialogueElement {
  const message: DialogueElement = {
    role: "user",
    content: [],
  };
  message.content.push({ type: "text", text: "You will be given a user question or instruction. Your response should be brief. The editor will be unable to display newlines or list items in your response, so do not use them." });
  message.content.push({ type: "text", text: formula });
  if (priorMarkdown) {
    const docContent: DocumentContent = {
      type: "document",
      title: "!!current document",
      citations: { enabled: true },
      source: {
      type: "text",
      media_type: "text/plain",
      data: priorMarkdown,
    },
    context: "This is the current document. The question might or not be related to the document. If it's not related, ignore the document content when answering the user question, and do not mention that the document content is not relevant. The dialogue the user is having with you is part of the document, with the location indicated by <current dialogue here>",
    };
    message.content.push(docContent);
  }
  return message;
}

function getPromptWithContextForLongChat(formula: string, priorMarkdown?: string): DialogueElement {
  const message: DialogueElement = {
    role: "user",
    content: [],
  };
  message.content.push({ type: "text", text: "You will be given a user question or instruction." });
  message.content.push({ type: "text", text: formula });
  if (priorMarkdown) {
    const docContent: DocumentContent = {
      type: "document",
      title: "!!current document",
      citations: { enabled: true },
      source: {
      type: "text",
      media_type: "text/plain",
      data: priorMarkdown,
    },
    context: "This is the current document. The question might or not be related to the document. If it's not related, ignore the document content when answering the user question, and do not mention that the document content is not relevant. The dialogue the user is having with you is part of the document, with the location indicated by <current dialogue here>",
    };
    message.content.push(docContent);
  }
  return message;
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

export async function getShortGPTResponse(prompt: string, context?: PageAndDialogueContext): Promise<FormulaOutput | null> {
  const formulaWithoutEqualSign = cleanFormulaForPrompt(prompt);
  if (!context) return null;
  let fullPrompt: DialogueElement;
  const pastDialogue: DialogueElement[] = context.dialogueContext;

  // the prior dialogue as we receive it only has the user prompt
  // it doesn't have additional document context etc
  // so for now always include the document context

  //if (context.dialogueContext.length > 0) {
    // if we're in an ongoing conversation, the contents of the current document will have already been sent
    // so we don't need to send it again
    // (unless the user excluded  it on purpose, in which case we also shouldn't send it)
  //  fullPrompt = formulaWithoutEqualSign;
  //} else {
    if (context.markdownAnnotatedForDialogue.trim().length > 0) {
      fullPrompt = getPromptWithContextForShortChat(formulaWithoutEqualSign, context.markdownAnnotatedForDialogue);
    } else {
      fullPrompt = getPromptWithContextForShortChat(formulaWithoutEqualSign);
    }
  //}
  const gptResponse = await getShortGPTChatResponse([...pastDialogue, fullPrompt]);
  if (!gptResponse) return null;
  return { output: gptResponse, type: FormulaValueType.Text };
}
