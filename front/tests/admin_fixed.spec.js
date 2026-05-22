import { test, expect } from '@playwright/test';
import path from 'path';
require('dotenv').config({ path: '../back/.env' });

test.describe('Admin panel smoke test', () => {
  let products = [];
  let savedProductName = '';

  test.beforeEach(async ({ page }) => {
    products = [];
    savedProductName = '';

    await page.addInitScript(() => {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      }));
    });

    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin'
        })
      });
    });

    products = [];

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
        const productName = savedProductName || `Test flower ${Date.now()}`;
        const newProduct = {
          id: Date.now(),
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
          body: JSON.stringify({ success: true, product: newProduct })
        });
      }

      return route.continue();
    });

    await page.route('**/api/auth/avatar', async route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, avatar: '/uploads/avatars/admin-avatar.jpg' })
      });
    });

    await page.route('**/api/auth/profile', async route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/users*', async route => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  test('admin can add product and update profile photo + name', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');

    const addProductBtn = page.locator('#addProductBtn');
    await expect(addProductBtn).toBeVisible({ timeout: 20000 });
    await addProductBtn.click();

    await expect(page.locator('#productModal')).toBeVisible();

    const productName = `Test flower ${Date.now()}`;
    savedProductName = productName;
    await page.fill('#productTitleKey', productName);
    await page.fill('#productTextKey', 'Beautiful flower');
    await page.fill('#productPrice', '19.90');
    await page.fill('#productCategory', 'assortment');

    const productImage = path.resolve('tests', 'assets', 'avatar.jpg');
    await page.setInputFiles('#productImage', productImage);

    const [productResponse] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/products') && r.request().method() === 'POST'
      ),
      page.click('#saveProductBtn')
    ]);

    expect(productResponse.ok()).toBeTruthy();

    await page.waitForResponse(r =>
      r.url().includes('/api/products?category=assortment') &&
      r.request().method() === 'GET'
    );

    await expect(page.getByText(productName, { exact: false }))
      .toBeVisible({ timeout: 20000 });

    await page.goto('/profile.html');
    await page.waitForLoadState('domcontentloaded');

    const avatarInput = page.locator('#avatarInput');
    await expect(avatarInput).toBeAttached({ timeout: 10000 });

    const [avatarResponse] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/auth/avatar') && r.request().method() === 'POST'
      ),
      avatarInput.setInputFiles(productImage)
    ]);
    expect(avatarResponse.ok()).toBeTruthy();

    await page.fill('#profileNameInput', 'Admin E2E');

    const [profileResponse] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/api/auth/profile') && r.request().method() === 'PUT'
      ),
      page.click('button[type="submit"]')
    ]);

    expect(profileResponse.ok()).toBeTruthy();
    await expect(page.locator('#profileMessage')).toBeVisible({ timeout: 15000 });
  });
});
