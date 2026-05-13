import { test, expect } from '@playwright/test';

test.describe('Feelings Test', () => {
  test('loads correctly', async ({ page }) => {
    await page.goto('/test.html');

    await expect(page).toHaveTitle('Feelings Test');
    await expect(page.locator('.brand')).toHaveText('PETALSPEAK');
    await expect(page.locator('#test-title')).toBeVisible();
    await expect(page.locator('#question')).toBeVisible();
  });

  test('can navigate questions', async ({ page }) => {
    await page.goto('/test.html');

    // Wait for first question
    await expect(page.locator('#question')).not.toBeEmpty();

    // Check answers are present
    await expect(page.locator('#answers')).not.toBeEmpty();

    // Click next
    await page.locator('#next-btn').click();

    // Should go to next question or result
    await expect(page.locator('#question, .result')).toBeVisible();
  });
});