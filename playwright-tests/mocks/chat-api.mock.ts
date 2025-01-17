import { Page } from '@playwright/test';
import { DialogueElement } from '../../lib/ai';

export async function mockChatApi(page: Page) {
  await page.route('/api/ai/chat', async (route) => {
    const request = route.request();
    
    if (request.method() === 'POST') {
      try {
        const body = JSON.parse(request.postData() || '{}');
        const { prompt, dialogueContext } = body;

        if (!prompt || !Array.isArray(dialogueContext)) {
          await route.fulfill({ 
            status: 400, 
            body: 'Invalid request format' 
          });
          return;
        }

        // Mock a successful response
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            response: `Mocked response`
          })
        });
      } catch (error) {
        await route.fulfill({ 
          status: 500, 
          body: 'Internal server error' 
        });
      }
    } else {
      await route.continue();
    }
  });
} 