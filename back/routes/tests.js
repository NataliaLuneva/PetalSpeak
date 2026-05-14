const express = require("express");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");

const router = express.Router();

// Salvestab kasutaja testi tulemuse.
router.post("/", auth, async (req, res) => {
    try {
        const {
            result,
            bouquetTitle,
            bouquetImage,
            price
        } = req.body;

        // Kontrollime, kas vajalikud andmed on olemas.
        if (!result || !bouquetTitle) {
            return res.status(400).json({
                message: "Результат теста не передан"
            });
        }

        // Salvestame testi tulemuse andmebaasi.
        await pool.query(
            `INSERT INTO test_results 
            (user_id, result, bouquet_title, bouquet_image, price) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                req.user.id,
                result,
                bouquetTitle,
                bouquetImage || "",
                price || null
            ]
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

// Tagastab sisselogitud kasutaja testi tulemused.
router.get("/my", auth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM test_results
             WHERE user_id = ?
             ORDER BY created_at DESC`,
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

// Этот файл отвечает за сохранение и получение результатов теста пользователя. 
// Первый маршрут сохраняет результат теста, название букета, изображение и цену в таблицу test_results, привязывая запись к авторизованному пользователю. 
// Второй маршрут возвращает все результаты тестов текущего пользователя, отсортированные по дате создания от новых к старым.