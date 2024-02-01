import { test as teardown } from '@playwright/test';
require('dotenv').config({ path: './.env.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

teardown('clean up db', async () => {
  const client = await db.connect();
  await cleanUp(client, users);
  await client.end();
});

async function cleanUp(client: { sql: any; }, users: any[]) {
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
        WHERE pageId = ${user.id};
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