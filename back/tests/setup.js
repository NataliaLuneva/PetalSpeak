// Close MySQL connection after all tests are completed

afterAll(async () => {
    const pool = require("../config/mysql");
    await pool.end();
});