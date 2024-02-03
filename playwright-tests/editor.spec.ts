import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/page');
});

test('has title', async ({ page }) => {
  await expect(page).toHaveTitle(/🍊✅/);
});

test('page contents', async ({ page }) => {
  await expect(page.getByText('Hello, world!')).toBeVisible();
});
