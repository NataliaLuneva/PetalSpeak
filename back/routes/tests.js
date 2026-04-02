const express = require("express");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");

const router = express.Router();

// сохранить тест
router.post("/", auth, async (req, res) => {
    const { result } = req.body;

    await pool.query(
        "INSERT INTO test_results (user_id, result) VALUES (?,?)",
        [req.user.id, result]
    );

    res.json({ message: "saved" });
});

// история тестов
router.get("/my", auth, async (req, res) => {
    const [rows] = await pool.query(
        "SELECT * FROM test_results WHERE user_id=? ORDER BY created_at DESC",
        [req.user.id]
    );

    res.json(rows);
});

module.exports = router;