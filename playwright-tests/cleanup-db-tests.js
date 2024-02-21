require('dotenv').config({ path: './.env.development.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

async function main() {
  const client = await db.connect();
  await cleanUp(client, users);
  await client.end();
}

async function cleanUp(client, users) {
  try {
    const deletedUsers = await Promise.all(
      users.map(async (user) => {
        return client.sql`
        DELETE FROM users
        WHERE id = ${user.id};
      `;
      }),
    );

    const deletedPages = await Promise.all(
      users.map(async (user) => {
        return client.sql`
        DELETE FROM pages
        WHERE userId = ${user.id};
      `;
      }),
    );

    console.log(`Cleaned up db`);

    return {
      deletedUsers,
      deletedPages
    };
  } catch (error) {
    console.error('Error cleaning up:', error);
    throw error;
  }
}

main();