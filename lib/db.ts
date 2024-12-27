import { isPage, Page } from '@/lib/definitions';

export interface PageUpdateResponse {
    revisionNumber?: number;
    lastModified?: Date;
    error?: string;
}

export async function insertPageDb(
  title: string,
  value: string,
  userId: string,
  isJournal: boolean,
  lastModified: Date,
  id?: string
): Promise<Page | string> {
  const endpoint = "/api/db/insertPage";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, value, userId, id, lastModified, isJournal }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        return "duplicate key value";
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }

    const result = await response.json();
    if (result.page) {
      return {
        ...result.page,
        userId: String(result.page.userId), // Ensure userId is a string
        lastModified: new Date(result.page.lastModified) // Convert string to Date
      } as Page;
    } else {
      console.error("Failed to insert page:", result.error);
      return result.error || "Unknown error occurred";
    }
  } catch (error) {
    console.error("Error fetching from API:", error);
    if (error instanceof Error) {
      return `Error fetching from API: ${error.message}`;
    } else {
      // Handle cases where the error might not be an instance of Error
      return `Error fetching from API: ${String(error)}`;
    }
  }
}

export async function updatePageWithHistory(id: string, value: string, title: string, deleted: boolean, oldRevisionNumber: number, lastModified: Date): Promise<PageUpdateResponse> {
  const endpoint = '/api/db/updatePage';

  try {      
      const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, value, title, deleted, oldRevisionNumber, lastModified }),
      });

      if (!response.ok) {
          // Convert non-2xx HTTP responses into throws to handle them in the catch block
          throw new Error(`HTTP error! Status: ${response.status} revnum:${oldRevisionNumber}`);
      }

      const result = await response.json();
      if (result.revisionNumber !== undefined) {
          return {
            revisionNumber: result.revisionNumber,
            lastModified: new Date(result.lastModified)
          };
      } else {
          // If the server response does not include a revision number, throw an error
          throw new Error('Failed to update page: ' + (result.error || 'Unknown error occurred'));
      }
  } catch (error) {
      console.error('Error fetching from API:', error);
      // Return a specific error code or throw an exception depending on your error handling strategy
      throw error; // Here, we choose to propagate the exception further up
  }
}

export async function fetchPagesRemote(userId: string, fetchDeleted?: boolean): Promise<Page[] | null> {
    const endpoint = '/api/db/fetchPages'; // Adjust the endpoint as necessary
  
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, fetchDeleted }),
        });
  
        if (!response.ok) {
            // Convert non-2xx HTTP responses into throws to handle them in the catch block
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const result = await response.json();
        if (result.pages) {
            let pages = JSON.parse(JSON.stringify(result.pages));
            pages = result.pages.map((page: Page) => ({
                ...page,
                lastModified: new Date(page.lastModified) // Convert lastModified to Date object
            }));
            for (const page of pages) {
              if (!isPage(page)) {
                  throw new Error("expected page, got " + JSON.stringify(page));
              }
            }
            return pages;
        } else {
            return result.error || 'Unknown error occurred'; // Returning error as a string
        }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('expected page')) {
        throw error;
      }
      console.error('Error fetching from API:', error);
      return null;
    }
  }

  export async function fetchUpdatesSince(userId: string, since: Date): Promise<Page[] | null> {
    const endpoint = '/api/db/fetchUpdatesSince'; // Adjust the endpoint as necessary
  
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, since }),
        });
  
        if (!response.ok) {
            // Convert non-2xx HTTP responses into throws to handle them in the catch block
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const result = await response.json();
        if (result.pages) {
            let pages = JSON.parse(JSON.stringify(result.pages));
            pages = result.pages.map((page: Page) => ({
                ...page,
                lastModified: new Date(page.lastModified) // Convert lastModified to Date object
            }));
            for (const page of pages) {
                if (!isPage(page)) {
                    throw new Error("expected page, got " + JSON.stringify(page));
                }
            }
            return pages;
        } else {
            return result.error || 'Unknown error occurred'; // Returning error as a string
        }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('expected page')) {
        throw error;
      }
      console.error('Error fetching from API:', error);
      return null;
    }
  }