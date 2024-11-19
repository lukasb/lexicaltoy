import { test, expect } from '@playwright/test';

// TODO figure out per-browser users in db, then re-enable
// parallelism is playwright.config.ts

test.beforeEach(async ({ page }) => {
  await page.goto('/page');
});

test('window title', async ({ page }) => {
  await expect(page).toHaveTitle(/🍊✅/);
});

test('should bring up search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.pressSequentially('test');
  await expect(page.getByTestId('search-result')).toContainText('TestPage1');
});

test('page contents', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await newSearch.pressSequentially('aTestPage2');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Hello, world!')).toBeVisible();
});

test('search for start title match opens page', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await newSearch.pressSequentially('test');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  
  const titles = page.locator('[data-testid="editable-title"]');
  let found = false;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    console.log(titleText);
    if (titleText === 'TestPage1') {
      found = true;
      break;
    }
  }
  await expect(found).toBeTruthy();
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
  await newSearch.pressSequentially('TestPage1');
  await page.keyboard.press('Backspace');
  await expect(page.getByTestId('create-page-option')).toBeVisible();
});

test('escape closes search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('test');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('search-result')).not.toBeVisible();
});

test('renaming page reflected in search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await newSearch.pressSequentially('TestPage1');
  await page.keyboard.press('Enter');
  await page.getByTestId('page-menu-button').first().click();
  await page.getByText('Rename').click();
  await page.getByTestId('edit-dialog-input').fill('New Page Title');
  await page.getByTestId('edit-dialog-submit').click();
  await page.waitForTimeout(100);
  const newerSearch = page.getByPlaceholder('Search or Create');
  await newerSearch.pressSequentially('New Page Title');
  await expect(page.getByTestId('search-result').first()).toContainText('New Page Title');
});

test('create new page', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('avalon');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const titles = page.locator('[data-testid="editable-title"]');
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
  await page.keyboard.press('Tab');
  await page.keyboard.type(' [[abc]] ');
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
  await newSearch.fill('bower');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const anotherSearch = page.getByPlaceholder('Search or Create');
  await anotherSearch.fill('bower');
  await page.keyboard.press('Enter');
  const titles = await page.locator('[data-testid="editable-title"]');
  let found = 0;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'bower') {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
});

test('deleted page does not appear in search results', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.focus();
  await newSearch.fill('twill');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Meta+k');
  await page.keyboard.type('twill');
  const titles = await page.locator('[data-testid="search-result"]');
  let found = 0;
  const count = await titles.count();
  for (let i = 0; i < count; i++) {
    const titleText = await titles.nth(i).textContent();
    if (titleText === 'twill') {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(0);
});

test('wiki page names autocomplete correctly when match is not at start of page title', async ({ page }) => {
  const newSearch = page.getByPlaceholder('Search or Create');
  await newSearch.fill('villa');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.keyboard.press('Meta+k');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(' [[illa');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const wikilinks = page.locator('.PlaygroundEditorTheme__wikilinkPageTitle');
  let found = 0;
  const count = await wikilinks.count();
  for (let i = 0; i < count; i++) {
    const titleText = await wikilinks.nth(i).textContent();
    if (titleText === 'villa') {
      found = found + 1;
      break;
    }
  }
  await expect(found).toBe(1);
});