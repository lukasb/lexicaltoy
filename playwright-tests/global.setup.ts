import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
require('dotenv').config({ path: './.env.test.local' }); 
//import { db } from '@/lib/dbwrapper';
import { db } from '../scripts/seed-db-wrapper.mts';
import { Pool, neonConfig } from '@neondatabase/serverless';
//import ws from 'ws';
//neonConfig.webSocketConstructor = ws;
const {
  users,
  pages,
} = require('./tests-placeholder-data.js');
import { seedUsers, seedPages } from '../scripts/seed-inserts';

setup('seed db', async () => {
  const client = await db.pool.connect();

  const clientWithSql = {
    ...client,
    sql: db.sql.bind(null)
  };

  await seedUsers(clientWithSql, users);
  await seedPages(clientWithSql, pages);
  
  console.log('Seeded db in global setup');

  await client.release();
});

setup('do login', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Log in').click();
  await page.getByLabel('Email').fill('test@nextmail.com');
  await page.getByLabel('Password').fill('123456');
  await page.getByText('Log in').click();

  // Wait until the page actually signs in.
  await expect(page.getByText('Sign Out')).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});