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