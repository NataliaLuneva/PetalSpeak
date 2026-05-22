import { test, expect } from '@playwright/test';
require('dotenv').config({ path: '../back/.env' });

test.describe('Purchase Flow (stable deterministic version)', () => {

  test.beforeEach(async ({ page }) => {

    // ================= FIXED CART (NO UI DEPENDENCY) =================
    await page.addInitScript(() => {
      localStorage.setItem("cart", JSON.stringify([
        {
          id: "1",
          title: "Rose Bouquet",
          price: 50,
          quantity: 1,
          img: "/assets/img/b1.jpg"
        }
      ]));
    });

    // ================= MOCK PRODUCTS =================
    await page.route('**/api/products*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Rose Bouquet',
            price: 50,
            img: '/assets/img/b1.jpg'
          }
        ])
      });
    });

    // ================= MOCK USER =================
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@mail.com',
          role: 'user'
        })
      });
    });

    // ================= MOCK ORDER API =================
    await page.route('**/api/orders', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('full purchase flow end-to-end', async ({ page }) => {

    // ================= CART PAGE =================
    await page.goto('/cart.html');

    const cartPanel = page.locator('#cartList, .order-panel');
    await expect(cartPanel.first()).toBeVisible({ timeout: 15000 });

    const checkbox = page.locator('.cart-check').first();

    if (await checkbox.count() > 0) {
      await expect(checkbox).toBeVisible();
      await checkbox.check();
    }

    // ================= BUY SELECTED =================
    const buyBtn = page.locator('#buySelectedBtn');

    await expect(buyBtn).toBeVisible({ timeout: 15000 });
    await expect(buyBtn).toBeEnabled();

    await buyBtn.click();

    // ================= ORDER PAGE =================
    await expect(page).toHaveURL(/order\.html/, { timeout: 15000 });

    const form = page.locator('.order-form, #orderForm');
    await expect(form.first()).toBeVisible({ timeout: 15000 });

    // ================= FILL FORM =================
    await page.locator('#name, #customerName').first().fill('Test User');
    await page.locator('#email').first().fill('test@mail.com');
    await page.locator('#address').first().fill('Tallinn');
    await page.locator('#message').first().fill('Test order');

    // payment fields (если есть)
    const cardName = page.locator('#cardName');
    if (await cardName.count()) {
      await cardName.fill('Test User');
      await page.locator('#cardNumber').fill('4111 1111 1111 1111');
      await page.locator('#expiry').fill('12/30');
      await page.locator('#cvv').fill('123');
    }

    const consent = page.locator('#privacyConsent');
    if (await consent.count()) {
      await consent.check();
    }

    // ================= SUBMIT ORDER =================
    const submitBtn = page.locator('#orderSubmitBtn, #orderBtn');

    await expect(submitBtn.first()).toBeVisible();
    await expect(submitBtn.first()).toBeEnabled();

    await submitBtn.first().click();

    // ================= SUCCESS =================
    await expect(page).toHaveURL(/success\.html/, { timeout: 20000 });
  });
});