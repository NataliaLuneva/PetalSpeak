import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');

  // Check that the page title is correct
  await expect(page).toHaveTitle('PetalSpeak');

  // Check that the brand name is visible
  await expect(page.locator('.brand')).toHaveText('PETALSPEAK');

  // Check that navigation links are present
  await expect(page.locator('nav a[data-i18n="about"]')).toBeVisible();
  await expect(page.locator('nav a[data-i18n="test"]')).toBeVisible();

  // Check that the hero section is visible
  await expect(page.locator('.hero')).toBeVisible();

  // Check that language switch buttons are present
  await expect(page.locator('.lang-btn[data-lang="en"]')).toBeVisible();
  await expect(page.locator('.lang-btn[data-lang="et"]')).toBeVisible();
  await expect(page.locator('.lang-btn[data-lang="ru"]')).toBeVisible();
});