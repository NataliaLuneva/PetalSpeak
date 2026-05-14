const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Määrame toodete piltide üleslaadimise kausta.
const uploadDir = path.join(__dirname, "..", "uploads", "products");

// Loome kausta, kui seda veel pole.
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Seadistame pildi salvestamise.
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

// Kaitse korduva kiire salvestamise vastu.
const savingLocks = new Set();

// Loob lukuvõtme kasutaja ja tegevuse järgi.
function getLockKey(req, action) {
    const userId = req.user?.id || req.ip;
    return `${action}_${userId}_${req.params.id || "new"}`;
}

// Tõlgib teksti valitud keelest sihtkeelde.
async function translateText(text, sourceLang, targetLang) {
    if (!text) return "";

    try {
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const googleResponse = await fetch(googleUrl);

        if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            const translated = googleData?.[0]?.[0]?.[0];
            if (translated) return translated;
        }

        const libreResponse = await fetch("https://libretranslate.com/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                q: text,
                source: sourceLang,
                target: targetLang
            })
        });

        if (libreResponse.ok) {
            const libreData = await libreResponse.json();
            if (libreData.translatedText) return libreData.translatedText;
        }

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);
        const data = await response.json();

        return data?.responseData?.translatedText || text;
    } catch (error) {
        console.error("Translate error:", error);
        return text;
    }
}

// Loob teksti tõlked vene, inglise ja eesti keelde.
async function buildTranslations(text, sourceLang) {
    if (!text) {
        return {
            title_ru: "",
            title_en: "",
            title_et: ""
        };
    }

    const lang = sourceLang || "ru";

    if (lang === "en") {
        return {
            title_en: text,
            title_ru: await translateText(text, "en", "ru"),
            title_et: await translateText(text, "en", "et")
        };
    }

    if (lang === "et") {
        return {
            title_et: text,
            title_ru: await translateText(text, "et", "ru"),
            title_en: await translateText(text, "et", "en")
        };
    }

    return {
        title_ru: text,
        title_en: await translateText(text, "ru", "en"),
        title_et: await translateText(text, "ru", "et")
    };
}

// Leiab kategooria ja tunde tüübi ID-d nende koodide järgi.
async function getRelationIds(category, feeling_type) {
    const categoryCode = category || "assortment";

    const [[categoryRow]] = await pool.query(
        "SELECT id FROM bouquet_categories WHERE code = ?",
        [categoryCode]
    );

    let feelingRow = null;

    if (feeling_type) {
        const [feelingRows] = await pool.query(
            "SELECT id FROM feeling_types WHERE code = ?",
            [feeling_type]
        );

        feelingRow = feelingRows[0] || null;
    }

    return {
        categoryId: categoryRow?.id || null,
        feelingTypeId: feelingRow?.id || null
    };
}

// Tagastab aktiivsed tooted koos filtritega.
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
        res.json([]);
    }
});

// Lisab uue toote.
router.post(
    "/",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {
        const lockKey = getLockKey(req, "create");

        // Kui sama kasutaja juba salvestab, peatame korduva päringu.
        if (savingLocks.has(lockKey)) {
            return res.status(429).json({
                messageKey: "please_wait"
            });
        }

        savingLocks.add(lockKey);

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

            // Kontrollime kohustuslikke välju.
            if (!sourceTitle || !sourceText || priceValue === "" || priceValue === undefined || priceValue === null) {
                return res.status(400).json({ messageKey: "error_fields_missing" });
            }

            const parsedPrice = Number(priceValue);

            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({ messageKey: "error_invalid_price" });
            }

            // Loome pealkirja ja kirjelduse tõlked.
            const { title_ru, title_en, title_et } = await buildTranslations(sourceTitle, sourceLang);

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

            const imagePath = req.file
                ? `/uploads/products/${req.file.filename}`
                : null;

            const { categoryId, feelingTypeId } = await getRelationIds(
                category || "assortment",
                feeling_type || null
            );

            // Salvestame toote andmebaasi.
            await pool.query(`
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
                    feeling_type,
                    category_id,
                    feeling_type_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                categoryId,
                feelingTypeId
            ]);

            res.json({ messageKey: "success" });
        } catch (error) {
            console.error("Create product error:", error);
            res.status(500).json({ messageKey: "error_save" });
        } finally {
            savingLocks.delete(lockKey);
        }
    }
);

// Uuendab olemasolevat toodet.
router.put(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {
        const lockKey = getLockKey(req, "update");

        if (savingLocks.has(lockKey)) {
            return res.status(429).json({
                messageKey: "please_wait"
            });
        }

        savingLocks.add(lockKey);

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
                return res.status(400).json({ messageKey: "error_fields_missing" });
            }

            const parsedPrice = Number(priceValue);

            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({ messageKey: "error_invalid_price" });
            }

            // Uuendame tõlked.
            const { title_ru, title_en, title_et } = await buildTranslations(sourceTitle, sourceLang);

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

            // Kui uut pilti pole, jätame vana pildi alles.
            let imagePath = old_image || null;

            if (req.file) {
                imagePath = `/uploads/products/${req.file.filename}`;
            }

            const { categoryId, feelingTypeId } = await getRelationIds(
                category || "assortment",
                feeling_type || null
            );

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
                    feeling_type = ?,
                    category_id = ?,
                    feeling_type_id = ?
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
                categoryId,
                feelingTypeId,
                req.params.id
            ]);

            res.json({ messageKey: "success" });
        } catch (error) {
            console.error("Update product error:", error);
            res.status(500).json({ messageKey: "error_save" });
        } finally {
            savingLocks.delete(lockKey);
        }
    }
);

// Kustutab toote andmebaasist.
router.delete(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    async (req, res) => {
        try {
            await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);

            res.json({ messageKey: "success" });
        } catch (error) {
            console.error("Delete product error:", error);
            res.status(500).json({ messageKey: "error_delete" });
        }
    }
);

module.exports = router;

// Этот файл отвечает за работу с товарами: получение списка активных товаров, добавление нового товара, редактирование и удаление. 
// Для админских действий используется авторизация и проверка роли admin или superadmin. 
// При создании и обновлении товара загружается изображение, проверяются обязательные поля, цена преобразуется в число, а название и описание автоматически переводятся на русский, английский и эстонский языки. 
// Также товар связывается с категорией и типом эмоции через соответствующие ID.