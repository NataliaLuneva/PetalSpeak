const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const uploadDir = path.join(__dirname, "..", "uploads", "products");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    }
});

const upload = multer({ storage });

// перевод
async function translateText(text, targetLang) {
    if (!text) return "";

    try {
        const url =
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|${targetLang}`;

        const response = await fetch(url);
        const data = await response.json();

        return data?.responseData?.translatedText || text;
    } catch (error) {
        console.error("Translate error:", error);
        return text;
    }
}

//
// ===== ПОЛУЧИТЬ ТОВАРЫ (С ФИЛЬТРОМ ПО ЧУВСТВУ) =====
//
router.get("/", async (req, res) => {
    try {
        const { category, feeling_type } = req.query;

        let sql = `
            SELECT *
            FROM products
            WHERE is_active = 1
        `;

        const params = [];

        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }

        if (feeling_type) {
            sql += ` AND feeling_type = ?`;
            params.push(feeling_type);
        }

        sql += ` ORDER BY id DESC`;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Ошибка получения товаров" });
    }
});

//
// ===== ДОБАВИТЬ ТОВАР =====
//
router.post(
    "/",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                title_ru,
                text_ru,
                price,
                category,
                feeling_type
            } = req.body || {};

            if (!title_ru || !text_ru || !price) {
                return res.status(400).json({
                    message: "Не все поля переданы"
                });
            }

            const title_en = await translateText(title_ru, "en");
            const title_et = await translateText(title_ru, "et");

            const text_en = await translateText(text_ru, "en");
            const text_et = await translateText(text_ru, "et");

            const imagePath = req.file
                ? `/uploads/products/${req.file.filename}`
                : null;

            const [result] = await pool.query(`
                INSERT INTO products 
                (
                    title_key,
                    text_key,
                    title_ru,
                    title_en,
                    title_et,
                    text_ru,
                    text_en,
                    text_et,
                    image,
                    price,
                    category,
                    feeling_type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                title_ru,
                text_ru,
                title_ru,
                title_en,
                title_et,
                text_ru,
                text_en,
                text_et,
                imagePath,
                price,
                category || "assortment",
                feeling_type || null
            ]);

            res.json({
                message: "Товар добавлен",
                id: result.insertId
            });
        } catch (error) {
            console.error("Create product error:", error);
            res.status(500).json({ message: "Ошибка добавления" });
        }
    }
);

//
// ===== РЕДАКТИРОВАТЬ =====
//
router.put(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                title_ru,
                text_ru,
                price,
                category,
                feeling_type,
                old_image
            } = req.body || {};

            if (!title_ru || !text_ru || !price) {
                return res.status(400).json({
                    message: "Не все поля переданы"
                });
            }

            const title_en = await translateText(title_ru, "en");
            const title_et = await translateText(title_ru, "et");

            const text_en = await translateText(text_ru, "en");
            const text_et = await translateText(text_ru, "et");

            let imagePath = old_image || null;

            if (req.file) {
                imagePath = `/uploads/products/${req.file.filename}`;
            }

            await pool.query(`
                UPDATE products
                SET 
                    title_key = ?,
                    text_key = ?,
                    title_ru = ?,
                    title_en = ?,
                    title_et = ?,
                    text_ru = ?,
                    text_en = ?,
                    text_et = ?,
                    image = ?,
                    price = ?,
                    category = ?,
                    feeling_type = ?
                WHERE id = ?
            `, [
                title_ru,
                text_ru,
                title_ru,
                title_en,
                title_et,
                text_ru,
                text_en,
                text_et,
                imagePath,
                price,
                category || "assortment",
                feeling_type || null,
                req.params.id
            ]);

            res.json({
                message: "Товар обновлён"
            });
        } catch (error) {
            console.error("Update product error:", error);
            res.status(500).json({ message: "Ошибка обновления" });
        }
    }
);

//
// ===== УДАЛИТЬ =====
//
router.delete(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    async (req, res) => {
        try {
            await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);

            res.json({
                message: "Товар удалён"
            });
        } catch (error) {
            console.error("Delete product error:", error);
            res.status(500).json({ message: "Ошибка удаления" });
        }
    }
);

module.exports = router;