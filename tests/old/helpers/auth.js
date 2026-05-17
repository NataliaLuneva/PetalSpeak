export async function login(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fake-test-token');
  });
}