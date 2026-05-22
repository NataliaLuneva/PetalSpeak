# Test Documentation for PetalSpeak

## Overview

This document summarizes the existing test coverage for the PetalSpeak project, including backend API tests and frontend UI/E2E tests. It describes what is covered today, how tests are configured, and how to run them.

---

## Backend Testing

### Test approach

- Backend tests are written using `supertest` and the Node test runner style (`describe`, `test`, `expect`).
- They focus on server-side validation, authorization, and basic route behavior.
- The backend server is defined in `back/server.js`.

### Test files

- `back/tests/auth.test.js`
  - verifies auth endpoints handle missing request body
  - checks registration and login return 400 when request data is absent

- `back/tests/orders.test.js`
  - validates order API routes reject missing request data
  - verifies unauthorized access is blocked for `/api/orders/my`

- `back/tests/products.test.js`
  - verifies product list endpoint returns success
  - verifies filtered product list by category returns success

- `back/tests/testResults.test.js`
  - likely covers test result API behavior (not inspected in detail here)

- `back/tests/setup.js`
  - likely contains shared setup/fixtures for backend tests

### Important backend details

- `back/.env` stores environment variables, including `JWT_SECRET`, `MAIL_USER`, and `MAIL_PASS`.
- Backend routes such as `back/routes/auth.js` and middleware in `back/middleware/auth.js` now require `JWT_SECRET` from the environment.

### Running backend tests

There is no explicit backend test script in the repository root `package.json`. Use one of the following approaches:

- If using Node 18+ with the built-in test runner:

  ```bash
  cd c:\Users\jarjo\Desktop\PetalSpeak\back
  node --test tests/auth.test.js
  ```

- For the full backend suite, run all `.test.js` files from the backend folder:

  ```bash
  cd c:\Users\jarjo\Desktop\PetalSpeak\back
  node --test tests
  ```

> Make sure `back/.env` exists and contains `JWT_SECRET` before starting the tests.

---

## Frontend Testing

### Test framework

- Frontend tests are implemented using `@playwright/test`.
- Playwright config is located in `front/playwright.config.js`.
- The frontend suite runs against a real server started automatically by Playwright.

### Configuration

- `testDir: './tests'` points to the frontend test folder.
- Base URL: `http://localhost:3000`.
- The web server command is `node ../back/server.js`, so frontend tests launch the backend automatically.
- `dotenv/config` is loaded in Playwright config, injecting environment variables from `back/.env`.
- Browser projects include Chromium, Firefox, and WebKit.
- Tracing is enabled on first retry; screenshots and videos are kept on failure.

### Frontend test files

- `front/tests/auth.spec.js`
  - empty registration form validation
  - weak password validation
  - password mismatch validation
  - successful registration
  - login flow with JWT storage and redirect
  - logout behavior
  - language UI switch
  - invalid token defense

- `front/tests/login.spec.js`
  - registration validation and negative cases
  - successful registration
  - login validation and error checks
  - full login + profile flow, including:
    - login
    - profile name update
    - password change
    - avatar upload
    - logout and re-login with new password

- `front/tests/homepage.spec.js`
  - homepage interactions and login-related UI behavior (not detailed here)

- `front/tests/admin_fixed.spec.js`
  - admin flows and fixed admin scenarios (not detailed here)

- `front/tests/test.spec.js`
  - other general frontend tests

- `front/tests/e2e/purchase-flow.spec.js`
  - end-to-end purchase flow tests for the shopping scenario

- `front/tests/helpers/` and `front/tests/fixtures/`
  - contain reusable test data and helper routines

### Key coverage areas

- Authentication UI flows
- Registration and login validation
- JWT token storage and token-based access control
- Logout behavior
- Localization / language switching
- Profile page updates and avatar upload
- Admin access controls and UI restrictions
- E2E checkout / purchase flow

### Running frontend tests

From the `front` directory:

```bash
cd c:\Users\Desktop\PetalSpeak\front
node_modules\.bin\playwright.cmd test
```

Or with npm/yarn:

```bash
cd c:\Users\Desktop\PetalSpeak\front
npm test
```

To run a single test file:

```bash
cd c:\Users\Desktop\PetalSpeak\front
node_modules\.bin\playwright.cmd test tests/login.spec.js --reporter=dot --workers=1
```

### Environment requirements

- `back/.env` must include `JWT_SECRET`.
- The Playwright config already injects `back/.env` into the frontend test environment.
- The backend server is launched by Playwright from `front` using `node ../back/server.js`.

---

## Notes and Observations

- The project uses a mixed testing strategy:
  - backend API tests covering basic validation and authentication behavior,
  - frontend Playwright tests covering UI flows, auth, localization, and security.

- Backend tests are light and primarily verify request validation and authorization handling.
- Frontend tests are more comprehensive and include real browser flows.
- There is a strong dependency on `JWT_SECRET` in the environment; missing it will break auth-related tests.

## Quick commands

- Run all frontend Playwright tests:
  ```bash
  cd c:\Users\Desktop\PetalSpeak\front
  npm test
  ```

- Run a specific Playwright test file:
  ```bash
  cd c:\Users\Desktop\PetalSpeak\front
  node_modules\.bin\playwright.cmd test tests/login.spec.js --workers=1 --reporter=dot
  ```

- Run backend API tests (Node >=18):
  ```bash
  cd c:\Users\Desktop\PetalSpeak\back
  node --test tests
  ```
