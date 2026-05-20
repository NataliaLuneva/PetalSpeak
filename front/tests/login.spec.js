import { test, expect } from '@playwright/test';

function genEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}@mail.com`;
}

// Generates a random username for profile update testing
function genName() {
  return `User_${Math.random().toString(36).slice(2, 8)}`;
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

    // Open login page

    await page.goto('/login.html', {
      waitUntil: 'domcontentloaded'
    });

    const urlBefore = page.url();

    // Try submitting an empty registration form

    await submitRegister(page);

    // Verify that user stays on the same page

    await expect(page).toHaveURL(urlBefore);

    // Fill form with weak password

    await page.fill('#registerName', 'Test');

    await page.fill('#registerEmail', genEmail());

    await page.fill('#registerPassword', '123');

    await page.fill('#registerConfirmPassword', '123');

    // Submit invalid form

    await submitRegister(page);

    const msg = page.locator('#authMessage');

    // Verify validation message appears

    await expect(msg).toBeVisible({
      timeout: 10000
    });

    // Supports EN / RU / ET validation texts

    await expect(msg).toContainText(
      /6|password|weak|слишк|парол|nõrk/i
    );
  });

  /* =========================
     2. SUCCESSFUL REGISTRATION
  ========================= */

  test('successful registration', async ({ page }) => {

    const email = genEmail();

    const password = 'Aa123456!';

    // Open login page

    await page.goto('/login.html', {
      waitUntil: 'domcontentloaded'
    });

    // Fill valid registration form

    await page.fill('#registerName', 'User');

    await page.fill('#registerEmail', email);

    await page.fill('#registerPassword', password);

    await page.fill('#registerConfirmPassword', password);

    // Submit registration

    await submitRegister(page);

    const msg = page.locator('#authMessage');

    // Verify successful registration message

    await expect(msg).toBeVisible({
      timeout: 10000
    });

    // Supports EN / RU / ET success texts

    await expect(msg).toContainText(
      /success|успеш|created|создан|loodud|õnnest/i
    );
  });

  /* =========================
     3. LOGIN + FULL PROFILE FLOW
  ========================= */

  test('successful login + full profile interaction', async ({ page }) => {

    const email = genEmail();

    const password = 'Aa123456!';

    const newPassword = 'Bb123456!';

    const newName = genName();

    // Open authentication page

    await page.goto('/login.html', {
      waitUntil: 'domcontentloaded'
    });

    // Register a new user

    await page.fill('#registerName', 'User');

    await page.fill('#registerEmail', email);

    await page.fill('#registerPassword', password);

    await page.fill('#registerConfirmPassword', password);

    await submitRegister(page);

    // Verify successful registration

    await expect(page.locator('#authMessage'))
      .toContainText(
        /success|успеш|created|создан|loodud|õnnest/i
      );

    // Switch to login form

    await page.click('#showLogin');

    // Verify login form became visible

    await expect(page.locator('#loginEmail'))
      .toBeVisible();

    // Fill login form

    await page.fill('#loginEmail', email);

    await page.fill('#loginPassword', password);

    // Submit login form

    await page.click('#loginForm button[type="submit"]');

    // Wait until JWT token appears in localStorage

    await page.waitForFunction(() => {
      return localStorage.getItem('token') !== null;
    }, {
      timeout: 15000
    });

    // Wait for redirect to homepage

    await page.waitForURL(/index\.html/, {
      timeout: 15000
    });

    // Verify authenticated user block is visible

    const authBlock = page.locator('#authBlock');

    await expect(authBlock).toBeVisible({
      timeout: 10000
    });

    // Open profile page

    const profileLink = authBlock.locator('a.header-profile-link');

    await expect(profileLink).toBeVisible();

    await profileLink.click();

    // Verify profile page opened

    await expect(page).toHaveURL(/profile\.html/);

    // Verify profile form loaded

    const profileInput = page.locator('#profileNameInput');

    await expect(profileInput).toBeVisible();

    /* =========================
       PROFILE NAME CHANGE
    ========================= */

    // Change profile name

    await page.fill('#profileNameInput', newName);

    // Save updated profile

    await page.click('#profileForm button[type="submit"]');

    // Verify profile update message
    // Supports English, Russian and Estonian

    await expect(page.locator('#profileMessage'))
      .toContainText(
        /updated|saved|успеш|обновл|uuend/i
      );

    // Verify new name appears in profile

    await expect(page.locator('#profileName'))
      .toContainText(newName);

    // Verify header username updated

    await expect(page.locator('#headerUserName'))
      .toContainText(newName);

    /* =========================
       PASSWORD CHANGE
    ========================= */

    // Fill password change form

    await page.fill('#currentPassword', password);

    await page.fill('#newPassword', newPassword);

    await page.fill('#confirmPassword', newPassword);

    // Submit password update

    await page.click('#passwordForm button[type="submit"]');

    // Verify password success message
    // Supports English, Russian and Estonian

    await expect(page.locator('#passwordMessage'))
      .toContainText(
        /updated|changed|успеш|обновл|muudet|uuend/i
      );

    /* =========================
       AVATAR UPLOAD
    ========================= */

    // Upload avatar image

    await page.setInputFiles(
      '#avatarInput',
      'tests/assets/avatar.jpg'
    );

    // Verify avatar upload message
    // Supports English, Russian and Estonian

    await expect(page.locator('#avatarMessage'))
      .toContainText(
        /updated|uploaded|changed|успеш|обновл|laad|uuend/i
      );

    // Verify avatar image source changed

    const avatarPreview = page.locator('#avatarPreview');

    await expect(avatarPreview).toHaveAttribute(
      'src',
      /uploads|avatar|http/i
    );

    /* =========================
       LOGOUT + LOGIN WITH NEW PASSWORD
    ========================= */

    // Logout user

    await page.click('#logoutBtn');

    // Wait for redirect after logout

    await page.waitForURL(/index\.html/, {
      timeout: 15000
    });

    // Open login page again

    await page.goto('/login.html');

    // Switch to login form

    await page.click('#showLogin');

    // Wait until login form becomes visible

    await expect(page.locator('#loginEmail'))
      .toBeVisible();

    // Login with updated password

    await page.fill('#loginEmail', email);

    await page.fill('#loginPassword', newPassword);

    await page.click('#loginForm button[type="submit"]');

    // Verify JWT token appears again

    await page.waitForFunction(() => {
      return localStorage.getItem('token') !== null;
    });

    // Wait for redirect after login

    await page.waitForURL(/index\.html/);

    // Verify authenticated user block is visible again

    await expect(page.locator('#authBlock'))
      .toBeVisible();
  });

});

// Mida see test täpselt kontrollib:

// 1. Registreerimise valideerimine

// Kontrollib, et tühja vormiga registreerimine ei vii kasutajat edasi
// Kontrollib, et nõrk parool (näiteks “123”) annab veateate
// Veendub, et kasutaja jääb samale lehele, kui sisend on vale
// Kontrollib mitmekeelset valideerimist (EN / RU / ET)

// 2. Edukas registreerimine

// Loob uue kasutaja unikaalse e-mailiga
// Kontrollib, et registreerimine õnnestub
// Veendub, et kuvatakse edukuse sõnum
// Kontrollib edukuse sõnumeid erinevates keeltes

// 3. Sisselogimine ja profiili täielik kontroll

// Registreerib kasutaja ja logib ta sisse
// Kontrollib, et JWT token salvestatakse localStorage’i
// Veendub, et kasutaja suunatakse avalehele
// Kontrollib, et autentitud kasutaja plokk ilmub nähtavale
// Avab profiili lehe
// Kontrollib, et profiili vorm laaditakse korrektselt

// 4. Profiili muutmine

// Muudab kasutaja nime
// Kontrollib, et nimi uueneb profiilis
// Kontrollib, et nimi uueneb headeris
// Kontrollib profiili uuendamise sõnumeid EN / RU / ET keeltes

// 5. Parooli muutmine

// Muudab kasutaja parooli
// Kontrollib, et uus parool salvestatakse edukalt
// Kontrollib parooli uuendamise sõnumeid EN / RU / ET keeltes

// 6. Profiilipildi üleslaadimine

// Laeb üles profiilipildi
// Kontrollib, et avatar muutub
// Kontrollib avatar upload edukuse sõnumeid EN / RU / ET keeltes

// 7. Logout ja korduv sisselogimine

// Logib kasutaja välja
// Avab uuesti login vormi
// Logib uuesti sisse uue parooliga
// Kontrollib, et autentimine töötab ka pärast parooli muutmist
// Kontrollib, et kasutaja jääb autentituks pärast uut sisselogimist