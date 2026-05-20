export async function loginAsSuperadmin(page) {
  // 1. фиксируем токен (любой, просто чтобы приложение "думало", что залогинен)
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-superadmin-token');
  });

  // 2. важно: мокаем /api/auth/me → это решает ВСЁ
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'E2E Admin',
        email: 'admin@test.com',
        role: 'superadmin'
      })
    });
  });
}