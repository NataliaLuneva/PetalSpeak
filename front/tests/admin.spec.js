import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Superadmin full admin flow', () => {

  test.beforeEach(async ({ page }) => {

    // ================= FORCE SUPERADMIN STATE =================
    await page.addInitScript(() => {
      localStorage.setItem('token', 'valid-superadmin');

      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Super Admin',
        email: 'admin@test.com',
        role: 'superadmin'
      }));
    });

    // ================= AUTH / ME =================
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Super Admin',
          email: 'admin@test.com',
          role: 'superadmin'
        })
      });
    });

    // ================= PRODUCTS DB =================
    let products = [];

    await page.route('**/api/products*', async route => {
      const method = route.request().method();

      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(products)
        });
      }

      if (method === 'POST') {
        const productName = `Flower ${Date.now()}`;

        const newProduct = {
          id: Date.now(),
          // frontend expects localized title fields like title_en / title_ru
          title_en: productName,
          title_ru: productName,
          title_et: productName,
          text_en: 'Beautiful flower',
          text_ru: 'Beautiful flower',
           text_et: 'Beautiful flower',
          title_key: '',
          text_key: '',
          category: 'assortment',
          price: 19.90,
          image: '/assets/img/b1.jpg'
        };

        products.unshift(newProduct);

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            product: newProduct
          })
        });
      }

      return route.continue();
    });

    // ================= USERS =================
    await page.route('**/api/users*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('add product + update profile', async ({ page }) => {

    await page.goto('/index.html');

    // 🔥 IMPORTANT: ensure page scripts initialized (auth may come from localStorage)
    await page.waitForLoadState('domcontentloaded');

    // ================= BUTTON =================
    const addBtn = page.locator('#addProductBtn');

    await expect(addBtn).toBeVisible({ timeout: 20000 });

    await addBtn.click();

    // ================= MODAL =================
    await expect(page.locator('#productModal')).toBeVisible();

    const productName = `Flower ${Date.now()}`;

    await page.fill('#productTitleKey', productName);
    await page.fill('#productTextKey', 'Beautiful flower');
    await page.fill('#productPrice', '19.90');
    await page.fill('#productCategory', 'assortment');

    await page.setInputFiles(
      '#productImage',
      path.resolve('tests/assets/avatar.jpg')
    );

    // ================= CREATE =================
    const [res] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/products') &&
        r.request().method() === 'POST'
      ),
      page.click('#saveProductBtn')
    ]);

    expect(res.ok()).toBeTruthy();

    // ================= WAIT RENDER =================
    await page.waitForTimeout(1000);
    await page.reload();

    await expect(
      page.getByText(productName, { exact: false })
    ).toBeVisible({ timeout: 20000 });

    // ================= PROFILE =================
    await page.goto('/profile.html');

    // auth data may be populated from localStorage instantly; wait for DOM instead
    await page.waitForLoadState('domcontentloaded');

    const avatarInput = page.locator('#avatarInput');
    await expect(avatarInput).toBeAttached();

    await avatarInput.setInputFiles(
      path.resolve('tests/assets/avatar.jpg')
    );

    await page.fill('#profileNameInput', 'Superadmin E2E');

    const [profileRes] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/users')
      ),
      page.click('button[type="submit"]')
    ]);

    expect(profileRes.ok()).toBeTruthy();

    await expect(page.locator('#profileMessage'))
      .toBeVisible({ timeout: 10000 });
  });

});