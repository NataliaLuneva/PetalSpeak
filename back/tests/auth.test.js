const request = require("supertest");
const app = require("../server");

//Unit tests for authentication API routes.
//These tests verify that the backend correctly handles invalid requests with missing data.

describe("Auth API", () => {

    //Test user registration without request data.
    //Expected result: server returns HTTP 400.

    test("registration without data returns 400", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({});

        expect(response.statusCode).toBe(400);
    });

    //Test user login without request data.
    //Expected result: server returns HTTP 400.

    test("login without data returns 400", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        expect(response.statusCode).toBe(400);
    });
});