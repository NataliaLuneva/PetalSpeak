import { test, expect } from '@playwright/test';

test.describe('PetalSpeak API Tests', () => {
  const baseURL = 'http://localhost:3000';

  // Test data
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'Test123!'
  };

  let token = '';
  let productId = null;
  let orderId = null;

  // 1. User Registration
  test('User registration should return success', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/register`, {
      data: testUser,
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.message).toBeTruthy();
  });

  // 2. User Login
  test('User login should return JWT token', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  // 3. Get Products
  test('Get products should return product list', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/products`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();

    if (body.length > 0) {
      productId = body[0].id;
    }
  });

  // 4. Protected Route Without Token
  test('Protected route should reject unauthorized access', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/orders/my`);

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.message).toBeTruthy();
  });
});