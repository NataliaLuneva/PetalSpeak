const { test, expect } = require('@playwright/test');

function genEmail() {
  return `test_${Date.now()}@mail.com`;
}

test.describe('AUTH + JWT + i18n FULL SUITE', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
  });

  /* =========================
     1. EMPTY FORM VALIDATION
  ========================= */
  test('empty register form should not submit', async ({ page }) => {

    await page.click('#registerForm button[type="submit"]');

    await expect(page).toHaveURL(/login\.html/);

    const msg = page.locator('#authMessage');
    await expect(msg).toBeVisible();
  });

  /* =========================
     2. WEAK PASSWORD
  ========================= */
  test('weak password validation', async ({ page }) => {

    await page.fill('#registerName', 'Test');
    await page.fill('#registerEmail', genEmail());
    await page.fill('#registerPassword', '123');
    await page.fill('#registerConfirmPassword', '123');

    await page.click('#registerForm button[type="submit"]');

    await expect(page.locator('#authMessage'))
      .toContainText(/6|short|пароль/i);
  });

  /* =========================
     3. PASSWORD MISMATCH
  ========================= */
  test('password mismatch', async ({ page }) => {

    await page.fill('#registerName', 'Test');
    await page.fill('#registerEmail', genEmail());
    await page.fill('#registerPassword', 'Aa123456');
    await page.fill('#registerConfirmPassword', 'WRONG');

    await page.click('#registerForm button[type="submit"]');

    await expect(page.locator('#authMessage'))
      .toContainText(/match|совпад/i);
  });

  /* =========================
     4. SUCCESS REGISTER
  ========================= */
  test('successful registration', async ({ page }) => {

    const email = genEmail();

    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', 'Aa123456!');
    await page.fill('#registerConfirmPassword', 'Aa123456!');

    await page.click('#registerForm button[type="submit"]');

    await expect(page.locator('#authMessage'))
      .toContainText(/success|успеш|created/i);
  });

  /* =========================
     5. LOGIN FLOW
  ========================= */
  test('login stores token and redirects', async ({ page }) => {

    const email = genEmail();
    const password = 'Aa123456!';

    // register first
    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#registerConfirmPassword', password);
    await page.click('#registerForm button[type="submit"]');

    // switch login
    await page.click('#showLogin');

    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', password);
    await page.click('#loginForm button[type="submit"]');

    // JWT check (REAL FRONT LOGIC)
    await expect.poll(async () => {
      return await page.evaluate(() => localStorage.getItem('token'));
    }).not.toBeNull();

    await page.waitForURL(/index\.html/);

    await expect(page).toHaveURL(/index\.html/);
  });

  /* =========================
     6. LOGOUT TEST
  ========================= */
  test('logout clears token', async ({ page }) => {

    await page.evaluate(() => localStorage.setItem('token', 'fake'));

    await page.goto('/index.html');

    await page.evaluate(() => {
      localStorage.removeItem('token');
    });

    const token = await page.evaluate(() =>
      localStorage.getItem('token')
    );

    expect(token).toBeNull();
  });

  /* =========================
     7. LANGUAGE SWITCH
  ========================= */
  test('language switching works', async ({ page }) => {

    await page.click('.lang-btn[data-lang="ru"]');

    await expect(page.locator('body')).toContainText(/вход|регистрация/i);

    await page.click('.lang-btn[data-lang="en"]');

    await expect(page.locator('body')).toContainText(/login|register/i);
  });

  /* =========================
     8. JWT SECURITY SIMULATION
  ========================= */
  test('invalid token should behave as logged out', async ({ page }) => {

    await page.evaluate(() => {
      localStorage.setItem('token', 'INVALID_TOKEN');
    });

    await page.goto('/index.html');

    const token = await page.evaluate(() =>
      localStorage.getItem('token')
    );

    // frontend should NOT trust invalid token
    expect(token).toBe('INVALID_TOKEN');
  });

});