import { test, expect } from '@playwright/test';

// TODO figure out per-browser users in db, then re-enable
// parallelism is playwright.config.ts

test.beforeEach(async ({ page }) => {
  await page.goto('/page');
});

test('window title', async ({ page }) => {
  await expect(page).toHaveTitle(/🍊✅/);
});

test('page contents', async ({ page }) => {
  await expect(page.getByText('Hello, world!')).toBeVisible();
});

test('page title', async ({ page }) => {
  const title = await page.getByTestId('editable-title');
  await expect(title).toHaveText('TestPage1');
});

test('should bring up search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('test');
  await expect(page.getByTestId('search-result')).toHaveText('TestPage1');
});

test('should select search result', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await page.keyboard.press('t');
  await page.keyboard.press('e');
  await page.keyboard.press('s');
  const isSelectedItemPresent = await page.$('.selected-item') !== null;
  expect(isSelectedItemPresent).toBeTruthy();
});

test('backspace deselects search result', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await page.keyboard.press('t');
  await page.keyboard.press('e');
  await page.keyboard.press('s');
  await page.keyboard.press('Backspace');
  const isSelectedItemPresent = await page.$('.selected-item') !== null;
  expect(isSelectedItemPresent).toBeFalsy();
});

test('escape closes search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('test');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('search-result')).not.toBeVisible();
});

test('renaming page reflected in search results', async ({ page }) => {
  const title = page.getByTestId('editable-title');
  await expect(title).toHaveText('TestPage1');
  await title.focus();
  await title.fill('NewTitle');
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('new');
  await expect(page.getByTestId('search-result')).toHaveText('NewTitle');
  await page.keyboard.press('Escape');
  const newTitle = page.getByTestId('editable-title');
  await newTitle.focus();
  await newTitle.fill('TestPage1');
});

test('create new page', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('avalon');
  await page.keyboard.press('Enter');
  const titles = page.locator('[data-testid="editable-title"]');
  await expect(titles).toHaveCount(2);
  let found = false;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    console.log(titleText);
    if (titleText === 'avalon') {
      found = true;
      break;
    }
  }
  await expect(found).toBeTruthy();
});

test('open page', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('TestPage1');
  await page.keyboard.press('Enter');
  const anotherSearch = page.getByPlaceholder('Search or Create');
  await anotherSearch.fill('avalon');
  await page.keyboard.press('Enter');
  const titles = await page.locator('[data-testid="editable-title"]');
  await expect(titles).toHaveCount(2);
  let found = false;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'avalon') {
      found = true;
      break;
    }
  }
  await expect(found).toBeTruthy();
});

test('keyboard shortcut for omnibar', async ({ page }) => {
  await page.keyboard.press('Meta+k');
  await expect(page.getByPlaceholder('Search or Create')).toBeFocused();
});

test('can create a wikilink', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press(' ');
  await page.keyboard.press('[');
  await page.keyboard.press('[');
  await page.keyboard.press('a');
  await page.keyboard.press('b');
  await page.keyboard.press('c');
  await page.keyboard.press(']');
  await page.keyboard.press(']');
  await page.keyboard.press(' ');
  const wikilink = page.locator('.PlaygroundEditorTheme__wikilinkPageTitle');
  await expect(wikilink).toHaveText('abc');
  await page.waitForTimeout(1000); // make sure edit happens
});

test('can open a wikilink', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  const wikilink = page.locator('.PlaygroundEditorTheme__wikilinkPageTitle');
  await wikilink.click();
  await page.waitForTimeout(1000);
  const titles = await page.locator('[data-testid="editable-title"]');
  let found = false;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'abc') {
      found = true;
      break;
    }
  }
  await expect(found).toBeTruthy();
});

test('clicking wikilink does not open duplicate pages', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  const wikilink = page.locator('.PlaygroundEditorTheme__wikilinkPageTitle');
  await wikilink.click();
  await page.waitForTimeout(1000);
  await wikilink.click();
  await page.waitForTimeout(1000);
  const titles = await page.locator('[data-testid="editable-title"]');
  let found = 0;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'abc') {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
});

test('opening same page from omnibar twice does not create duplicate editor', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('TestPage1');
  await page.keyboard.press('Enter');
  const anotherSearch = page.getByPlaceholder('Search or Create');
  await anotherSearch.fill('TestPage1');
  await page.keyboard.press('Enter');
  const titles = await page.locator('[data-testid="editable-title"]');
  let found = 0;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'TestPage1') {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
});