import { test, expect, Page } from '@playwright/test';
import { db } from '../scripts/seed-db-wrapper.mts';
const {
  users,
  pages
} = require('./tests-placeholder-data.js');

async function cleanUp(client: { sql: any; }, users: any[]) {
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

test.afterEach(async ({ page }) => {
  const client = await db.pool.connect();
  const clientWithSql = {
    ...client,
    sql: db.sql.bind(null)
  };
  await cleanUp(clientWithSql, users);
  await client.release();
});

async function createVilla(page: Page) {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('horatio hornblower');
}

test('just one villa page', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/page');
  await page.waitForTimeout(1000);
  await createVilla(page);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Meta+k');
  await page.keyboard.type('villa');
  const searchResults = await page.locator('[data-testid="search-result"]');
  const count = await searchResults.count();
  let found = 0;
  for (let i = 0; i < count; i++) {
    const titleText = await searchResults.nth(i).textContent();
    console.log(titleText);
    if (titleText?.startsWith('villa')) {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
  await page.close();
});

// TODO this test will fail once we're properly pulling in changes from other tabs updating IndexedDB
// goal here is to test a multiple browser scenario, need to figure out isolation for that
test('detects conflict when localdb page is newer', async ({ browser }) => {
  test.setTimeout(70000);
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await page1.goto('/page');
  await new Promise(r => setTimeout(r, 5000));
  await createVilla(page1);
  //await page1.waitForTimeout(8000);
  await new Promise(r => setTimeout(r, 15000));
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await page2.goto('/page');
  await new Promise(r => setTimeout(r, 15000));
  const activePageTitle = await page2.locator('[data-testid="editable-title"]').first().textContent();
  if (activePageTitle !== 'villa') {
    const newSearch = page2.getByPlaceholder('Search or Create');
    await newSearch.fill('villa');
    await page2.keyboard.press('Enter');
    await page2.waitForTimeout(5000);
  }
  await page2.keyboard.type('i want to make my own changes');
  await page2.waitForTimeout(5000);
  await page1.keyboard.type('i want to make my own changes too!');
  await page1.waitForTimeout(1000);
  await new Promise(r => setTimeout(r, 10000));
  await expect(
    page1.getByText('Your changes are based on an old version of this page.'))
    .toBeVisible();
});