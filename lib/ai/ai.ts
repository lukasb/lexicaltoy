import { 
  sanitizeText,
  convertToUnorderedList,
  convertChatResponsesToUnorderedList
} from "../text-helpers";
import { AIGenListItems, AIGenListItemType } from "./ai-commands";
import { DialogueElement } from "./ai-context";
import { ChatContentSchema, ChatContentItem } from "../formula/formula-definitions";


async function fetchGPTChatResponse(dialogueContext: DialogueElement[]): Promise<ChatContentItem[]> {
  console.log("fetchGPTChatResponse prompt", dialogueContext[dialogueContext.length - 1].content);
  if (dialogueContext.length > 1) {
    console.log("fetchGPTChatResponse context", dialogueContext.slice(0, -1));
  }

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dialogueContext }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error in fetchGPTChatResponse! status: ${response.status}`);
  }

  const result = await response.json();
  console.log("chatCompletion", JSON.stringify(result.response));
  
  try {
    const parsedContent = ChatContentSchema.parse({ content: JSON.parse(result.response) });
    return parsedContent.content;
  } catch (error) {
    console.log("🛑 Error validating chat response:", error);
    const contentItem: ChatContentItem = {
      type: 'text',
      text: result.response,
    };
    return [contentItem];
  }
}

export async function getGPTChatResponseForList(dialogueContext: DialogueElement[]): Promise<string | null> {
  try {
    const response = await fetchGPTChatResponse(dialogueContext);
    return convertChatResponsesToUnorderedList(response);
  } catch (error) {
    console.log("🛑 Error fetching chat response for list:", error);
    return null;
  }
}

export async function getShortGPTChatResponse(dialogueContext: DialogueElement[]): Promise<string | null> {
  try {
    const response = await fetchGPTChatResponse(dialogueContext);
    return sanitizeText(convertChatResponsesToUnorderedList(response));
  } catch (error) {
    console.log("🛑 Error fetching short chat response:", error);
    return null;
  }
}

export function parseListItems(jsonString: string): AIGenListItemType[] {
  try {
    const parsedJson = JSON.parse(jsonString);
    const validatedData = AIGenListItems.parse(parsedJson);
    
    function processItem(item: AIGenListItemType): AIGenListItemType {
      // Trim trailing whitespace
      let trimmedContent = item.content.trimEnd();
      // Remove '- ' prefix if it exists
      if (trimmedContent.startsWith('- ')) {
        trimmedContent = trimmedContent.slice(2);
      }
      
      const processedChildren = item.children 
        ? item.children.map(processItem)
        : undefined;
      
      return { 
        content: trimmedContent, 
        children: processedChildren 
      };
    }

    return validatedData.listItems.map(processItem);
  } catch (error) {
    console.log("🛑 Error parsing or validating ListItems:", error);
    return [];
  }
}

export async function getGPTGeneration(prompt: string): Promise<AIGenListItemType[] | null> {
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
      throw new Error(`HTTP error! in getGPTGeneration status: ${response.status}`);
    }

    const result = await response.json();
    return parseListItems(result.response);
  } catch (error) {
    console.log("🛑 Error fetching GPT generation:", error);
    return null;
  }
}