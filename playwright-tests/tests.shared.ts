export async function cleanUp(client: { sql: any; }, users: any[]) {
  try {

    const deletedPages = await Promise.all(
      users.map(async (user) => {
        console.log("deleting pages for user", user.id);
        return client.sql`
        DELETE FROM pages
        WHERE userId = ${user.id};
      `;
      }),
    );
    
    console.log(`Cleaned up db in afterEach`);

    return {
      deletedPages
    };
  } catch (error) {
    console.error('Error cleaning up:', error);
    throw error;
  }
}