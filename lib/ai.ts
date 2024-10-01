import { sanitizeText } from "./text-helpers";
import { ListItems } from "./ai-commands";
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

export function parseListItems(jsonString: string): string[] {
  try {
    const parsedJson = JSON.parse(jsonString);
    const validatedData = ListItems.parse(parsedJson);
    return validatedData.listItems.map(item => {
      // Trim trailing whitespace
      let trimmedItem = item.trimEnd();
      // Remove '- ' prefix if it exists
      if (trimmedItem.startsWith('- ')) {
        trimmedItem = trimmedItem.slice(2);
      }
      return trimmedItem;
    });
  } catch (error) {
    console.error("Error parsing or validating ListItems:", error);
    return [];
  }
}

export async function getGPTGeneration(prompt: string): Promise<string[] | null> {
  console.log("getGPTGeneration prompt", prompt);

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return parseListItems(result.response);
  } catch (error) {
    console.error("Error fetching GPT generation:", error);
    return null;
  }
}