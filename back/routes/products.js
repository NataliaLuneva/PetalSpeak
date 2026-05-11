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
async function translateText(text, sourceLang, targetLang) {
    if (!text) return "";

    try {
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const googleResponse = await fetch(googleUrl);

        if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            const translated = googleData?.[0]?.[0]?.[0];
            if (translated) {
                console.log(`Google ${sourceLang} -> ${targetLang}: "${text}" -> "${translated}"`);
                return translated;
            }
        }

        const libreResponse = await fetch("https://libretranslate.com/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang
            })
        });

        if (libreResponse.ok) {
            const libreData = await libreResponse.json();
            if (libreData.translatedText) {
                console.log(`LibreTranslate ${sourceLang} -> ${targetLang}: "${text}" -> "${libreData.translatedText}"`);
                return libreData.translatedText;
            }
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);
        const data = await response.json();

        console.log(`MyMemory ${sourceLang} -> ${targetLang}: "${text}" -> "${data?.responseData?.translatedText}"`);
        return data?.responseData?.translatedText || text;
    } catch (error) {
        console.error("Translate error:", error);
        return text;
    }
}

async function buildTranslations(text, sourceLang) {
    if (!text) {
        return {
            title_ru: "",
            title_en: "",
            title_et: ""
        };
    }

    const lang = sourceLang || "ru";
    let title_ru = "";
    let title_en = "";
    let title_et = "";

    if (lang === "en") {
        title_en = text;
        title_ru = await translateText(text, "en", "ru");
        title_et = await translateText(text, "en", "et");
    } else if (lang === "et") {
        title_et = text;
        title_ru = await translateText(text, "et", "ru");
        title_en = await translateText(text, "et", "en");
    } else {
        title_ru = text;
        title_en = await translateText(text, "ru", "en");
        title_et = await translateText(text, "ru", "et");
    }

    return { title_ru, title_en, title_et };
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
        res.status(500).json({
            messageKey: "error_load"
        });
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
                title_source,
                text_source,
                src_lang,
                price,
                category,
                feeling_type
            } = req.body || {};

            const sourceTitle = (title_source || req.body.title_ru || "").trim();
            const sourceText = (text_source || req.body.text_ru || "").trim();
            const sourceLang = (src_lang || "ru").trim() || "ru";
            const priceValue = typeof price === "string" ? price.trim() : price;

            if (!sourceTitle || !sourceText || priceValue === "" || priceValue === undefined || priceValue === null) {
                return res.status(400).json({
                    messageKey: "error_fields_missing"
                });
            }

            const parsedPrice = Number(priceValue);
            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({
                    messageKey: "error_invalid_price"
                });
            }

            const {
                title_ru,
                title_en,
                title_et
            } = await buildTranslations(sourceTitle, sourceLang);

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

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
                sourceTitle,
                sourceText,
                title_ru,
                title_en,
                title_et,
                text_ru,
                text_en,
                text_et,
                imagePath,
                parsedPrice,
                category || "assortment",
                feeling_type || null
            ]);

            res.json({
                messageKey: "success"
            });
        } catch (error) {
            console.error("Create product error:", error);
            res.status(500).json({
                messageKey: "error_save"
            });
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
                title_source,
                text_source,
                src_lang,
                price,
                category,
                feeling_type,
                old_image
            } = req.body || {};

            const sourceTitle = (title_source || req.body.title_ru || "").trim();
            const sourceText = (text_source || req.body.text_ru || "").trim();
            const sourceLang = (src_lang || "ru").trim() || "ru";
            const priceValue = typeof price === "string" ? price.trim() : price;

            if (!sourceTitle || !sourceText || priceValue === "" || priceValue === undefined || priceValue === null) {
                return res.status(400).json({
                    messageKey: "error_fields_missing"
                });
            }

            const parsedPrice = Number(priceValue);
            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({
                    messageKey: "error_invalid_price"
                });
            }

            const {
                title_ru,
                title_en,
                title_et
            } = await buildTranslations(sourceTitle, sourceLang);

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

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
                sourceTitle,
                sourceText,
                title_ru,
                title_en,
                title_et,
                text_ru,
                text_en,
                text_et,
                imagePath,
                parsedPrice,
                category || "assortment",
                feeling_type || null,
                req.params.id
            ]);

            res.json({
                messageKey: "success"
            });
        } catch (error) {
            console.error("Update product error:", error);
            res.status(500).json({
                messageKey: "error_save"
            });
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
                messageKey: "success"
            });
        } catch (error) {
            console.error("Delete product error:", error);
            res.status(500).json({
                messageKey: "error_delete"
            });
        }
    }
);

module.exports = router;