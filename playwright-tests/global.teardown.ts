import { test as teardown } from '@playwright/test';
require('dotenv').config({ path: './.env.playwright.local' }); 
import { db } from '../scripts/seed-db-wrapper.mts';
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

teardown('clean up db', async () => {
  const client = await db.pool.connect();
  const clientWithSql = {
    ...client,
    sql: db.sql.bind(null)
  };
  await cleanUp(clientWithSql, users);
  await client.release();
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
        WHERE userId = ${user.id};
      `;
      }),
    );

    const deletedPagesHistory = await Promise.all(
      users.map(async (user) => {
        return client.sql`
        DELETE FROM pages_history
        WHERE userId = ${user.id};
      `;
      }),
    );
    
    console.log(`Cleaned up db in global teardown`);

    return {
      deletedUsers,
      deletedPages
    };
  } catch (error) {
    console.error('Error cleaning up:', error);
    throw error;
  }
}