import { test, expect } from '@playwright/test';

function genEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@mail.com`;
}

test.describe('FULL MULTILANGUAGE AUTH SUITE', () => {

  // -------------------------------------------------------
  // 1. Ошибки регистрации
  // -------------------------------------------------------
  test('registration validation errors', async ({ page }) => {
  await page.goto('/login.html');

  // Пустые поля → форма НЕ отправилась
  const urlBefore = page.url();
  await page.click('#registerForm button[type="submit"]');
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(urlBefore);

  // Слабый пароль
  await page.fill('#registerName', 'Test');
  await page.fill('#registerEmail', genEmail());
  await page.fill('#registerPassword', '123');
  await page.fill('#registerConfirmPassword', '123');
  await page.click('#registerForm button[type="submit"]');

  // Проверяем, что backend вернул ошибку слабого пароля
  await expect(page.locator('#authMessage')).toContainText(/6/);
});
  // -------------------------------------------------------
  // 2. Успешная регистрация
  // -------------------------------------------------------
  test('successful registration', async ({ page }) => {
    const email = genEmail();
    const password = 'Aa123456!';

    await page.goto('/login.html');

    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#registerConfirmPassword', password);
    await page.click('#registerForm button[type="submit"]');

    await expect(page.locator('#authMessage')).toContainText(/success|успеш/i);
  });

  // -------------------------------------------------------
  // 3–6. 3 попытки → блокировка
  // -------------------------------------------------------

  // -------------------------------------------------------
  // 7. Успешный логин + переход в профиль
  // -------------------------------------------------------
  test('successful login + profile access', async ({ page }) => {
    const email = genEmail();
    const password = 'Aa123456!';

    // Регистрация
    await page.goto('/login.html');
    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#registerConfirmPassword', password);
    await page.click('#registerForm button[type="submit"]');

    // Логин
    await page.click('#showLogin');
    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', password);
    await page.click('#loginForm button[type="submit"]');

    // Ждём токен
    await page.waitForFunction(() => localStorage.getItem('token'));

    // Ждём редирект
    await page.waitForURL(/index\.html/);

    // Ждём authBlock
    await expect(page.locator('#authBlock')).toBeVisible();

    // Переход в профиль
    await page.click('#authBlock a.header-profile-link');

    await expect(page).toHaveURL(/profile\.html/);
    await expect(page.locator('#profileNameInput')).toBeVisible();
  });

});
