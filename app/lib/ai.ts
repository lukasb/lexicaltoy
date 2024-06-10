import {
  FormulaDefinition
} from '@/app/lib/formula/formula-definitions';


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
    return result.response;
  } catch (error) {
    console.error("Error fetching chat response:", error);
    return null;
  }
}

export async function getFormulaDefinition(prompt: string): Promise<FormulaDefinition | null> {
  const endpoint = '/api/ai/formula';

  try {
      const response = await fetch(endpoint, {
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
      if (result.formulaDefinition) {
          return result.formulaDefinition;
      } else {
          console.error('No formula definition returned', result.error);
          return null;
      }
  } catch (error) {
      console.error('Error fetching formula definition:', error);
      return null;
  }
}