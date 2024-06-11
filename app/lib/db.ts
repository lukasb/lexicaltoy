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

export async function updatePageContentsWithHistory(id: string, value: string, oldRevisionNumber: number): Promise<number> {
  const endpoint = '/api/db/updatePageContents'; // Adjust the endpoint as needed

  try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, value, oldRevisionNumber }),
      });

      if (!response.ok) {
          // Convert non-2xx HTTP responses into throws to handle them in the catch block
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.revisionNumber !== undefined) {
          return result.revisionNumber;
      } else {
          // If the server response does not include a revision number, throw an error
          throw new Error('Failed to update page contents: ' + (result.error || 'Unknown error occurred'));
      }
  } catch (error) {
      console.error('Error fetching from API:', error);
      // Return a specific error code or throw an exception depending on your error handling strategy
      throw error; // Here, we choose to propagate the exception further up
  }
}

export async function insertJournalPage(title: string, value: string, userId: string, journalDate: Date): Promise<Page | string> {
  const endpoint = '/api/db/insertJournalPage'; // Adjust the endpoint as needed

  try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              title,
              value,
              userId,
              journalDate: journalDate.toISOString() // Ensuring date is in a proper format for JSON
          }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.page) {
          return result.page as Page;
        } else {
          return result.error || "Unknown error occurred"; // Returning error as a string
        }
      }

      if (response.status === 409) {
          return '409'; // TODO yeah yeah there's a better way
      }

      throw new Error(`HTTP error! status: ${response.status}`);
      
  } catch (error) {
      console.error('Error fetching from API:', error);
      if (error instanceof Error) {
          return error.message; // Return the error message if it is an instance of Error
      } else {
          return 'An unknown error occurred'; // Return a generic error message otherwise
      }
  }
}

export async function deleteStaleJournalPages(ids: string[], defaultValue: string): Promise<string[]> {
  const endpoint = '/api/db/deleteStaleJournalPages'; // Ensure the endpoint matches your setup

  try {
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids, defaultValue }),
      });

      if (!response.ok) {
          // Convert non-2xx HTTP responses into throws to handle them in the catch block
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
          console.error('Error deleting pages:', result.error);
          throw new Error(result.error);
      }
      return result.deletedIds; // Assuming the API returns an object with a deletedIds array
  } catch (error) {
      console.error('Error fetching from API:', error);
      if (error instanceof Error) {
          throw error; // Propagate the error for further handling, or you could return an empty array to signify failure
      } else {
          throw new Error('An unknown error occurred');
      }
  }
}