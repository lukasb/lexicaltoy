import { Page, toPageStatus } from '@/app/lib/definitions';

export async function updatePageTitle(id: string, title: string, oldRevisionNumber: number): Promise<number> {
  // Define the endpoint URL (use the full URL if calling from a different domain in production)
  const endpoint = '/api/db/updatePageTitle';

  try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, title, oldRevisionNumber }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.revisionNumber !== undefined) {
          return result.revisionNumber;
      } else {
          console.error('Failed to update page title:', result.error);
          return -1; // Return -1 to indicate failure as per the original function
      }
  } catch (error) {
      console.error('Error fetching from API:', error);
      return -1; // Return -1 to indicate failure
  }
}

export async function insertPage(title: string, value: string, userId: string): Promise<Page | string> {
    const endpoint = '/api/db/insertPage';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, value, userId }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.page) {
          return {
            ...result.page,
            userId: String(result.page.userId), // Ensure userId is a string
            lastModified: new Date(result.page.lastModified), // Convert string to Date
            status: toPageStatus(result.page.status) // Ensure status is correctly typed
        } as Page;
        } else {
            console.error('Failed to insert page:', result.error);
            return result.error || 'Unknown error occurred';
        }
    } catch (error) {
        console.error('Error fetching from API:', error);
        if (error instanceof Error) {
          return `Error fetching from API: ${error.message}`;
      } else {
          // Handle cases where the error might not be an instance of Error
          return `Error fetching from API: ${String(error)}`;
      }
    }
}