function processResult(result: string): string {
  // Strip Markdown elements that could interfere with document structure
  result = result.replace(/^#+\s/gm, '');  // Remove headings
  result = result.replace(/^[-*+]\s/gm, '');  // Remove bullet points
  
  // Replace two or more consecutive newlines with a single newline
  result = result.replace(/\n{2,}/g, '\n');
  
  // Indent all lines
  return result.split('\n')
    .map(line => line.trim() ? '  ' + line : '')
    .join('\n')
    .trim();
}

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
    return processResult(result.response);
  } catch (error) {
    console.error("Error fetching chat response:", error);
    return null;
  }
}