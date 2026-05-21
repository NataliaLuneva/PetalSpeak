const request = require("supertest");
const app = require("../server");

/*
 * Unit tests for product API routes.
 * These tests verify that the server
 * correctly returns product data.
 */

describe("Products API", () => {

    /*
     * Test retrieving the full product list.
     * Expected result: server returns HTTP 200.
     */
    test("GET /api/products returns products list", async () => {
        const res = await request(app).get("/api/products");

        expect(res.statusCode).toBe(200);
    });

    /*
     * Test retrieving products by category.
     * Expected result: server returns HTTP 200.
     */
    test("GET /api/products?category=assortment returns assortment products", async () => {
        const res = await request(app).get("/api/products?category=assortment");

        expect(res.statusCode).toBe(200);
    });
});