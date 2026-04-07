const express = require("express");
const router = express.Router();

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// получить все товары
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM products
            WHERE is_active = 1
            ORDER BY id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка получения товаров" });
    }
});

// добавить товар
router.post("/", auth, requireRole("admin", "superadmin"), async (req, res) => {
    try {
        const { title_key, text_key, image, price, category } = req.body;

        const [result] = await pool.query(`
            INSERT INTO products (title_key, text_key, image, price, category)
            VALUES (?, ?, ?, ?, ?)
        `, [title_key, text_key, image, price, category]);

        res.json({ message: "OK", id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка добавления" });
    }
});

// редактировать
router.put("/:id", auth, requireRole("admin", "superadmin"), async (req, res) => {
    try {
        const { title_key, text_key, image, price, category } = req.body;

        await pool.query(`
            UPDATE products
            SET title_key=?, text_key=?, image=?, price=?, category=?
            WHERE id=?
        `, [title_key, text_key, image, price, category, req.params.id]);

        res.json({ message: "OK" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка обновления" });
    }
});

// удалить
router.delete("/:id", auth, requireRole("admin", "superadmin"), async (req, res) => {
    try {
        await pool.query("DELETE FROM products WHERE id=?", [req.params.id]);
        res.json({ message: "OK" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка удаления" });
    }
});

module.exports = router;