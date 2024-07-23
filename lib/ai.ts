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

export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {
  console.log("getShortGPTChatResponse", prompt);

  try {
    const response = await fetch('/api/ai/chat', {
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
    console.log("chatCompletion", result.response);
    return processResult(result.response);
  } catch (error) {
    console.error("Error fetching chat response:", error);
    return null;
  }
}