import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
require('dotenv').config({ path: './.env.test.local' }); 
import { db } from '@/lib/dbwrapper';
import { Pool, neonConfig } from '@neondatabase/serverless';
//import ws from 'ws';
//neonConfig.webSocketConstructor = ws;
const {
  users,
  pages,
} = require('./tests-placeholder-data.js');
import { seedUsers, seedPages } from '../scripts/seed-inserts';

setup('seed db', async () => {
  console.log("postgres url", process.env.POSTGRES_URL);
  console.log("vercel env", process.env.VERCEL_ENV);
  const client = await db.connect();
  //const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  //const client = await pool.connect();

  await seedUsers(client, users);
  await seedPages(client, pages);
  
  console.log('Seeded db');

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