import { test, expect } from '@playwright/test';

// TODO figure out per-browser users in db, then re-enable
// parallelism is playwright.config.ts

test.beforeEach(async ({ page }) => {
  await page.goto('/page');
});

test('can create a shared node', async ({ page }) => {
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
  await expect(
    page.locator('li').filter({ hasText: '[[villa]]horatio hornblower' }))
    .toBeVisible();
});