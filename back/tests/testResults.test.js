const request = require("supertest");
const app = require("../server");

/*
 * Unit tests for test result API routes.
 * These tests verify authorization
 * and validation of test result requests.
 */

describe("Test Results API", () => {

    /*
     * Test saving test results without authentication token.
     * Expected result: server returns an error status.
     */
    test("POST /api/test-results without token returns error", async () => {
        const res = await request(app)
            .post("/api/test-results")
            .send({
                resultType: "romantic",
                resultTitle: "Romantic bouquet"
            });

        expect([400, 401, 403]).toContain(res.statusCode);
    });

    /*
     * Test retrieving user test results without authentication.
     * Expected result: access is denied.
     */
    test("GET /api/test-results/my without token returns unauthorized", async () => {
        const res = await request(app).get("/api/test-results/my");

        expect([401, 403]).toContain(res.statusCode);
    });
});