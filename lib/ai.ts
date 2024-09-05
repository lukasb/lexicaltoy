import { sanitizeText } from "./text-helpers";

export type DialogueElement = {
  userQuestion: string;
  systemAnswer: string;
}

export async function getShortGPTChatResponse(prompt: string, dialogueContext: DialogueElement[]): Promise<string | null> {
  console.log("getShortGPTChatResponse prompt", prompt);
  console.log("getShortGPTChatResponse context", dialogueContext);

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, dialogueContext }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("chatCompletion", result.response);
    return sanitizeText(result.response);
  } catch (error) {
    console.error("Error fetching chat response:", error);
    return null;
  }
}