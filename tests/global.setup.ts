import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
require('dotenv').config({ path: './.env.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages,
} = require('./tests-placeholder-data.js');
import { seedUsers, seedPages } from '../scripts/seed-inserts';

setup('seed db', async () => {
  const client = await db.connect();

  await seedUsers(client, users);
  await seedPages(client, pages);
  
  await client.end();
});

setup('do login', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('user@nextmail.com');
  await page.getByLabel('Password').fill('123456');
  await page.getByText('Log in').click();

  // Wait until the page actually signs in.
  await expect(page.getByText('Sign Out')).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});