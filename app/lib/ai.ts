export async function getShortGPTChatResponse(prompt: string): Promise<string | null> {
  console.log("getShortGPTChatResponse", prompt);

  try {
    // Replace '/api/chat' with the full URL path if calling from a different domain
    const response = await fetch('/api/chat', {
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
    return result.response;
  } catch (error) {
    console.error("Error fetching chat response:", error);
    return null;
  }
}