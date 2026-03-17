const express = require("express");
const TestResult = require("../models/TestResult");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// save test result for authorized user
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { resultType, bouquetTitle, refined, answers } = req.body;

        if (!resultType || !bouquetTitle) {
            return res.status(400).json({ error: "Result data is required" });
        }

        const testResult = new TestResult({
            user: req.user.id,
            resultType,
            bouquetTitle,
            refined: !!refined,
            answers: answers || []
        });

        await testResult.save();

        res.json({ message: "Test result saved", testResult });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get my test history
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const tests = await TestResult.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;