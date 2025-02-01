import { Page } from '@playwright/test';
import { DialogueElement } from '../../lib/ai/ai-context';

export async function mockChatApi(page: Page) {
  // Intercept all requests to the chat API endpoint
  await page.route('**/api/ai/chat', async (route) => {
    const request = route.request();
    
    try {
      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        const { prompt, dialogueContext } = body;

        if (!prompt || !Array.isArray(dialogueContext)) {
          await route.fulfill({ 
            status: 400, 
            body: 'Invalid request format' 
          });
          return;
        }

        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            response: `Mocked response`
          })
        });
      } else {
        // Handle any non-POST requests to the same endpoint
        await route.fulfill({ 
          status: 405, 
          body: 'Method not allowed' 
        });
      }
    } catch (error) {
      await route.fulfill({ 
        status: 500, 
        body: 'Internal server error' 
      });
    }
  });
} 