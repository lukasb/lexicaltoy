import { test, expect, Page } from '@playwright/test';

// TODO figure out per-browser users in db, then re-enable
// parallelism is playwright.config.ts

test.beforeEach(async ({ page }) => {
  await page.goto('/page');
});

async function createVilla(page: Page) {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('horatio hornblower');
}

async function createAston(page: Page) {
  const newerSearch = page.getByPlaceholder('Search or Create');
  await newerSearch.pressSequentially('aston');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('=find("horatio")');
  await page.keyboard.press('Enter');
}

async function createGemlike(page: Page) {
  const newerSearch = page.getByPlaceholder('Search or Create');
  await newerSearch.pressSequentially('gemlike');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.type('=find("horatio")');
  await page.keyboard.press('Enter');
}

async function closePage(page: Page) {
  await page.keyboard.down('Meta');
  await page.keyboard.press('u');
  await page.keyboard.up('Meta');
}

test('can create a shared node', async ({ page }) => {
  await createVilla(page);
  await createAston(page);
  await expect(
    page.locator('li').filter({ hasText: '[[villa]]horatio hornblower' }))
    .toBeVisible();
});

test('modifying shared node on source page propagates to find nodes', async ({ page }) => {
  await createVilla(page);
  await createAston(page);
  const newerSearch = page.getByPlaceholder('Search or Create');
  await newerSearch.pressSequentially('villa');
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.type(' was a great man');
  await expect(
    page.locator('li').filter({ hasText: '[[villa]]horatio hornblower was a great man' }))
    .toBeVisible();
});

test('modifying shared node on find page propagates to source page', async ({ page }) => {
  await createVilla(page);
  await createAston(page);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' was who? ');
  await page.waitForTimeout(500);
  await closePage(page);
  await expect(page.getByText('h was who? oratio hornblower')).toBeVisible();
});

test('editing on source page is reflected in shared nodes (same page)', async ({ page }) => {
  await createVilla(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('=find("horatio")');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.type(' was a great man');
  await page.waitForTimeout(500);
  await expect(
    page.locator('li').filter({ hasText: '[[villa]]horatio hornblower was a great man' }))
    .toBeVisible();
});

test('editing shared nodes reflected on source page (same page)', async ({ page }) => {
  await createVilla(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('=find("horatio")');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.type(' was a great man');
  await page.waitForTimeout(200);
  await expect(
    page.locator('li').first())
    .toHaveText('horatio hornblower was a great man');
});

test('editing shared nodes reflected on source page (same page, with GPT node)', async ({ page }) => {
  await createVilla(page);
  await page.keyboard.press('Enter');
  await page.keyboard.type('=who was married at the feast of Cana?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  await page.keyboard.type('=find("horatio")');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.type(' was a great man');
  await page.waitForTimeout(200);
  await expect(
    page.locator('li').first())
    .toHaveText('horatio hornblower was a great man');
});

test('changes propagate between shared nodes on different pages', async ({ page }) => {
  await createVilla(page);
  await closePage(page);
  await createAston(page);
  await createGemlike(page);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' was who? ');
  await page.waitForTimeout(500);
  await closePage(page);
  await expect(page.getByText('h was who? oratio hornblower')).toBeVisible();
});

