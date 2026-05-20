const request = require("supertest");
const app = require("../server");

describe("Auth API", () => {
    test("registration without data returns 400", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({});

        expect(response.statusCode).toBe(400);
    });

    test("login without data returns 400", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(response.statusCode).toBe(400);
    });
});

afterAll(async () => {
    const pool = require("../config/mysql");
    await pool.end();
});