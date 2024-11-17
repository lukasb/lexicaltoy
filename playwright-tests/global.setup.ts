import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
require('dotenv').config({ path: './.env.playwright.local' }); 
const { db } = require('@vercel/postgres');
const {
  users,
  pages,
} = require('./tests-placeholder-data.js');
import { seedUsers, seedPages } from '../scripts/seed-inserts';
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  ssl: process.env.POSTGRES_HOST ? !process.env.POSTGRES_HOST.includes('localhost') : true
});


setup('seed db', async () => {
  const client = await pool.connect();

  await seedUsers(client, users);
  await seedPages(client, pages);
  
  console.log('Seeded db');

  await client.end();
  await pool.release();
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