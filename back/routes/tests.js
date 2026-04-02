const express = require("express");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");

const router = express.Router();

// сохранить результат теста
router.post("/", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        const { result } = req.body;

        if (!result) {
            return res.status(400).json({
                message: "Результат теста не передан"
            });
        }

        await pool.query(
            "INSERT INTO test_results (user_id, result) VALUES (?, ?)",
            [req.user.id, result]
        );

        res.json({
            message: "Результат теста сохранен"
        });
    } catch (error) {
        console.error("Save test error:", error);
        res.status(500).json({
            message: "Ошибка сохранения теста"
        });
    }
});

// мои тесты
router.get("/my", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        const [rows] = await pool.query(
            "SELECT * FROM test_results WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("Get my tests error:", error);
        res.status(500).json({
            message: "Ошибка получения тестов"
        });
    }
});

module.exports = router;