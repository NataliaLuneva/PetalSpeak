const request = require("supertest");
const app = require("../server");

// Unit tests for order-related API routes.
//These tests verify order validation and authorization protection.

describe("Orders API", () => {

    /*
     * Test creating an order without required data.
     * Expected result: server returns an error status.
     */
    test("POST /api/orders without data returns error", async () => {
        const res = await request(app)
            .post("/api/orders")
            .send({});

        expect([400, 401, 403]).toContain(res.statusCode);
    });

    /*
     * Test accessing user's orders without authentication token.
     * Expected result: server denies access.
     */
    test("GET /api/orders/my without token returns unauthorized", async () => {
        const res = await request(app).get("/api/orders/my");

        expect([401, 403]).toContain(res.statusCode);
    });
});