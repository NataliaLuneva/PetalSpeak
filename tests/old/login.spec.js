import { test, expect } from '@playwright/test';

function genEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@mail.com`;
}

// Safe submit helper (avoids repeated selector logic)
async function submitRegister(page) {
  const btn = page.locator('#registerForm button[type="submit"]');

  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
}

test.describe('FULL MULTILANGUAGE AUTH SUITE (bulletproof)', () => {

  /* =========================
     1. REGISTRATION VALIDATION
  ========================= */
  test('registration validation errors', async ({ page }) => {

    await page.goto('/login.html', { waitUntil: 'domcontentloaded' });

    const urlBefore = page.url();

    // Try submitting empty form
    await submitRegister(page);

    // Ensure page didn't unexpectedly navigate
    await expect(page).toHaveURL(urlBefore);

    // Fill weak password
    await page.fill('#registerName', 'Test');
    await page.fill('#registerEmail', genEmail());
    await page.fill('#registerPassword', '123');
    await page.fill('#registerConfirmPassword', '123');

    await submitRegister(page);

    const msg = page.locator('#authMessage');

    await expect(msg).toBeVisible({ timeout: 10000 });
    await expect(msg).toContainText(/6|password|weak|слишк/i);
  });

  /* =========================
     2. SUCCESSFUL REGISTRATION
  ========================= */
  test('successful registration', async ({ page }) => {

    const email = genEmail();
    const password = 'Aa123456!';

    await page.goto('/login.html', { waitUntil: 'domcontentloaded' });

    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#registerConfirmPassword', password);

    await submitRegister(page);

    const msg = page.locator('#authMessage');

    await expect(msg).toBeVisible({ timeout: 10000 });
    await expect(msg).toContainText(/success|успеш|created|создан/i);
  });

  /* =========================
     3. LOGIN + PROFILE FLOW
  ========================= */
  test('successful login + profile access', async ({ page }) => {

    const email = genEmail();
    const password = 'Aa123456!';

    await page.goto('/login.html', { waitUntil: 'domcontentloaded' });

    // Register first
    await page.fill('#registerName', 'User');
    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#registerConfirmPassword', password);

    await submitRegister(page);

    await expect(page.locator('#authMessage')).toBeVisible();

    // Switch to login
    await page.click('#showLogin');

    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', password);

    await page.click('#loginForm button[type="submit"]');

    // Wait for token safely (no race conditions)
    await expect.poll(async () => {
      return await page.evaluate(() => localStorage.getItem('token'));
    }, {
      timeout: 15000
    }).not.toBeNull();

    // Wait for redirect
    await page.waitForURL(/index\.html/, { timeout: 15000 });

    // Auth UI check (safe)
    const authBlock = page.locator('#authBlock');

    await expect(authBlock).toBeVisible({ timeout: 10000 });

    // Profile navigation (safe locator chaining)
    const profileLink = authBlock.locator('a.header-profile-link');

    await expect(profileLink).toBeVisible();
    await profileLink.click();

    await expect(page).toHaveURL(/profile\.html/);

    const profileInput = page.locator('#profileNameInput');
    await expect(profileInput).toBeVisible();
  });

});

// Mida see test täpselt kontrollib:

// 1. Registreerimise valideerimine

// Kontrollib, et tühja vormiga registreerimine ei vii kasutajat edasi
// Kontrollib, et nõrk parool (näiteks “123”) annab veateate
// Veendub, et kasutaja jääb samale lehele, kui sisend on vale

// 2. Edukas registreerimine

// Loob uue kasutaja unikaalse e-mailiga
// Kontrollib, et registreerimine õnnestub
// Veendub, et kuvatakse edukuse sõnum (nt “success” või “created”)

// 3. Sisselogimine ja profiili ligipääs

// Registreerib kasutaja ja logib ta sisse
// Kontrollib, et JWT token salvestatakse localStorage’i
// Ootab turvaliselt, kuni kasutaja on sisse logitud (vältides ajastuse vigu)
// Veendub, et kasutaja suunatakse avalehele
// Kontrollib, et kasutajaliideses ilmub autentitud kasutaja plokk
// Avab profiili lehe ja kontrollib, et profiili vorm on nähtav