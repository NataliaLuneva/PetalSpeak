import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Superadmin stable flow', () => {

  test.beforeEach(async ({ page }) => {

    // ================= AUTH =================
    await page.addInitScript(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Super Admin',
        email: 'admin@test.com',
        role: 'superadmin'
      }));
    });

    // ================= AUTH API =================
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

    // ================= PRODUCTS MOCK =================
    let products = [];

    await page.route('**/api/products*', async route => {
      const method = route.request().method();

      // GET PRODUCTS
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(products)
        });
      }

      // CREATE PRODUCT
      if (method === 'POST') {
        const product = {
          id: Date.now(),

          // 🔥 как в твоём backend / frontend
          title_ru: `Flower ${Date.now()}`,
          title_en: `Flower ${Date.now()}`,
          title_et: `Flower ${Date.now()}`,

          text_ru: 'Beautiful flower',
          text_en: 'Beautiful flower',
          text_et: 'Beautiful flower',

          category: 'assortment',
          price: 19.9,
          image: '/assets/img/b1.jpg'
        };

        products.unshift(product);

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(products)
        });
      }

      return route.continue();
    });

    // ================= USERS MOCK =================
    await page.route('**/api/users*', async route => {
      const method = route.request().method();

      if (['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }

      return route.continue();
    });
  });

  test('create product + profile update', async ({ page }) => {

    // ================= LOAD =================
    await page.goto('/index.html', { waitUntil: 'networkidle' });

    await page.waitForLoadState('networkidle');

    // ================= ADMIN BUTTON =================
    const addBtn = page.locator('#addProductBtn');
    await expect(addBtn).toBeVisible({ timeout: 20000 });

    await addBtn.click();

    // ================= MODAL =================
    await expect(page.locator('#productModal')).toBeVisible();

    // ================= CREATE PRODUCT =================
    const productName = `Flower ${Date.now()}`;

    await page.fill('#productTitleKey', productName);
    await page.fill('#productTextKey', 'Beautiful flower');
    await page.fill('#productPrice', '19.90');
    await page.fill('#productCategory', 'assortment');

    const imageFile = path.resolve(__dirname, 'assets', 'avatar.jpg');
    await page.setInputFiles('#productImage', imageFile);

    const [res] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/products') &&
        r.request().method() === 'POST'
      ),
      page.click('#saveProductBtn')
    ]);

    expect(res.ok()).toBeTruthy();

    // ================= VERIFY PRODUCT =================
    await page.reload();
    await page.waitForResponse(r =>
      r.url().includes('/api/products?category=assortment') &&
      r.request().method() === 'GET'
    );

    await expect(
      page.locator('.collection-item').first()
    ).toBeVisible({ timeout: 20000 });

    await expect(
      page.locator('.collection-item')
    ).toHaveCount(1, { timeout: 20000 });

    // ================= PROFILE =================
    await page.goto('/profile.html', { waitUntil: 'networkidle' });

    await page.waitForLoadState('networkidle');

    const avatarInput = page.locator('#avatarInput');
    await expect(avatarInput).toBeAttached();

    await avatarInput.setInputFiles(imageFile);
    await page.fill('#profileNameInput', 'Superadmin E2E');

    const [profileRes] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/users') &&
        ['POST', 'PUT'].includes(r.request().method())
      ),
      page.click('button[type="submit"]')
    ]);

    expect(profileRes.ok()).toBeTruthy();

    await expect(page.locator('#profileMessage'))
      .toBeVisible({ timeout: 15000 });
  });

});