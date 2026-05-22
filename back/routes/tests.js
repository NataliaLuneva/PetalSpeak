const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Saves a bouquet test result.
// The result can be saved both for authenticated users and guest users.

router.post("/", async (req, res) => {

    try {

        // Extract test result data from the request body.

        const {
            result,
            bouquetTitle,
            bouquetImage,
            price
        } = req.body;

        // Check that required data is provided.

        if (!result || !bouquetTitle) {
            return res.status(400).json({
                messageKey: "error_test_result_missing"
            });
        }

        // By default, the result is saved without a user.

        let userId = null;

        // Check whether the request contains an authorization token.

        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {

            try {

                // Extract and verify the JWT token.

                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, JWT_SECRET);

                // Save the authenticated user's ID.

                userId = decoded.id;
            } catch (error) {

                // If the token is invalid, save the result as a guest result.

                userId = null;
            }
        }

        // Save the test result in the database.

        await pool.query(
            `INSERT INTO test_results 
            (user_id, result, bouquet_title, bouquet_image, price) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                result,
                bouquetTitle,
                bouquetImage || "",
                price || null
            ]
        );

        res.json({
            messageKey: "test_saved"
        });
    } catch (error) {
        console.error("Save test error:", error);
        res.status(500).json({
            messageKey: "error_test_save"
        });
    }
});

// Retrieves saved test results for the currently authenticated user.

router.get("/my", auth, async (req, res) => {

    try {

        // Select all test results that belong to the current user.

        const [rows] = await pool.query(
            `SELECT 
                id,
                user_id,
                result,
                bouquet_title,
                bouquet_image,
                price,
                created_at
             FROM test_results
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("Get my tests error:", error);
        res.status(500).json({
            messageKey: "error_tests_get"
        });
    }
});

module.exports = router;