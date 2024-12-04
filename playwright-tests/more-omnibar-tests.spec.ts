import { test, expect, Page } from '@playwright/test';
import { db } from '../scripts/seed-db-wrapper.mts';
import { cleanUp } from './tests.shared.ts';
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

test.afterEach(async ({ page }) => {
  const client = await db.pool.connect();
  const clientWithSql = {
    ...client,
    sql: db.sql.bind(null)
  };
  await cleanUp(clientWithSql, users);
  await client.release();
});

async function createPage(page: Page, title: string) {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill(title);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.type('horatio hornblower and his ' + title);
}

async function checkSearchResult(page: Page, title: string) {
  const titles = await page.locator('[data-testid="search-result"]');
  let found = 0;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText?.startsWith(title)) {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
}

test('backspace searches again', async ({ page }) => {
  await page.goto('/page');
  await createPage(page, 'blue sasquatch');
  await createPage(page, 'toy sasquatch');
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.pressSequentially('sasquatch toy');
  await page.waitForTimeout(100);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await checkSearchResult(page, 'blue sasquatch');
});
