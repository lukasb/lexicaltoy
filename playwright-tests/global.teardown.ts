import { test as teardown } from '@playwright/test';
require('dotenv').config({ path: './.env.playwright.local' }); 
const { db } = require('@/lib/dbwrapper');
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  ssl: process.env.POSTGRES_HOST ? !process.env.POSTGRES_HOST.includes('localhost') : true
});

teardown('clean up db', async () => {
  const client = await pool.connect();
  await cleanUp(client, users);
  await client.end();
  await pool.release();
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