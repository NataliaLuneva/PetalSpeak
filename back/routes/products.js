const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const uploadDir = path.join(__dirname, "..", "uploads", "products");

// Check whether the upload directory already exists.

if (!fs.existsSync(uploadDir)) {

    // If the directory does not exist, create it.
    // The "recursive: true" option allows Node.js to create  all missing parent folders automatically.

    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure how uploaded product images will be stored on the server.

const storage = multer.diskStorage({

    // Specify the folder where uploaded product images will be saved.

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    // Generate a unique filename for each uploaded image.

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `product_${Date.now()}${ext}`);
    }
});

const upload = multer({ storage });

const savingLocks = new Set();

// Generates a unique key for locking a specific action.
// This key is used to prevent the same user from performing the same operation multiple times simultaneously.

function getLockKey(req, action) {

    // Use the authenticated user's ID if available.
    // If the user is not authenticated, use the IP address instead.

    const userId = req.user?.id || req.ip;

    // Create and return a unique key consisting of:
    // - the action name (for example "create", "update", "delete"),
    // - the user ID or IP address,
    // - the route parameter ID, or "new" if no ID is provided.
    // Example: create_5_12
    // Example: delete_192.168.1.10_7
    // Example: add_user_5_new

    return `${action}_${userId}_${req.params.id || "new"}`;
}

// Translates text from one language to another using several translation services.
// If one service fails, the function automatically tries the next one.

async function translateText(text, sourceLang, targetLang) {

    // If no text is provided, return an empty string.

    if (!text) return "";

    try {

        // ---------------------------------------------------------------------
        // 1. Try Google Translate API.
        // ---------------------------------------------------------------------

        // Build the request URL with source and target languages.

        const googleUrl =
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        // Send the request to Google Translate.

        const googleResponse = await fetch(googleUrl);

        // If the request is successful, extract the translated text.

        if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            const translated = googleData?.[0]?.[0]?.[0];

            // Return the translation if it exists.

            if (translated) return translated;
        }

        // ---------------------------------------------------------------------
        // 2. Try LibreTranslate as a fallback service.
        // ---------------------------------------------------------------------

        const libreResponse = await fetch(
            "https://libretranslate.com/translate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang
                })
            }
        );

        // If the request is successful, return the translated text.

        if (libreResponse.ok) {
            const libreData = await libreResponse.json();

            if (libreData.translatedText) {
                return libreData.translatedText;
            }
        }

        // ---------------------------------------------------------------------
        // 3. Try MyMemory Translation API as the final fallback.
        // ---------------------------------------------------------------------

        const url =
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;

        // Send the request to MyMemory.

        const response = await fetch(url);
        const data = await response.json();
        return data?.responseData?.translatedText || text;

    } catch (error) {
        console.error("Translate error:", error);
        return text;
    }
}

// Builds translations of a product title into Russian, English, and Estonian.
// The original language is detected from the sourceLang parameter.

async function buildTranslations(text, sourceLang) {

    // If no text is provided, return empty values for all languages.

    if (!text) {
        return {
            title_ru: "",
            title_en: "",
            title_et: ""
        };
    }

    // Use the provided source language.
    // If no language is specified, Russian is used by default.

    const lang = sourceLang || "ru";

    // If the source text is in English, keep the original text and translate it into Russian and Estonian.

    if (lang === "en") {
        return {
            title_en: text,
            title_ru: await translateText(text, "en", "ru"),
            title_et: await translateText(text, "en", "et")
        };
    }

    // If the source text is in Estonian, keep the original text and translate it into Russian and English.

    if (lang === "et") {
        return {
            title_et: text,
            title_ru: await translateText(text, "et", "ru"),
            title_en: await translateText(text, "et", "en")
        };
    }

    // If the source language is Russian (default), keep the original text and translate it into English and Estonian.

    return {
        title_ru: text,
        title_en: await translateText(text, "ru", "en"),
        title_et: await translateText(text, "ru", "et")
    };
}

// Retrieves the database IDs for the selected bouquet category and optional feeling type.

async function getRelationIds(category, feeling_type) {

    // Use the provided category code.
    // If no category is specified, "assortment" is used by default.

    const categoryCode = category || "assortment";

    // Find the category ID in the bouquet_categories table.

    const [[categoryRow]] = await pool.query(
        "SELECT id FROM bouquet_categories WHERE code = ?",
        [categoryCode]
    );

    // Variable for storing the feeling type record.

    let feelingRow = null;

    // If a feeling type code is provided, search for the corresponding record.
    if (feeling_type) {
        const [feelingRows] = await pool.query(
            "SELECT id FROM feeling_types WHERE code = ?",
            [feeling_type]
        );

        // Use the first matching record, or null if none is found.

        feelingRow = feelingRows[0] || null;
    }

    // Return the found IDs.
    // If no matching records are found, null is returned.

    return {
        categoryId: categoryRow?.id || null,
        feelingTypeId: feelingRow?.id || null
    };
}

// Retrieves all active products from the database.
// Products can optionally be filtered by category and feeling type.

router.get("/", async (req, res) => {
    try {

        // Extract optional filter parameters from the query string.

        const { category, feeling_type } = req.query;

        // Base SQL query that selects only active products.

        let sql = `
            SELECT *
            FROM products
            WHERE is_active = 1
        `;

        // Array of parameters for the SQL query.

        const params = [];

        // If a category is specified, add a category filter.

        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }

        // If a feeling type is specified, add a feeling type filter.

        if (feeling_type) {
            sql += ` AND feeling_type = ?`;
            params.push(feeling_type);
        }

        // Sort products by ID in descending order so that the newest products appear first.

        sql += ` ORDER BY id DESC`;

        // Execute the SQL query with the collected parameters.

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error("Get products error:", error);
        res.json([]);
    }
});

// Creates a new product in the database.
// Access is allowed only for authenticated users with the "admin" or "superadmin" role.
// The route also supports uploading a product image.

router.post(
    "/",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {

        // Generate a lock key to prevent duplicate product creation.

        const lockKey = getLockKey(req, "create");

        // If the same request is already being processed, stop it.

        if (savingLocks.has(lockKey)) {
            return res.status(429).json({
                messageKey: "please_wait"
            });
        }

        // Add the request to active locks.

        savingLocks.add(lockKey);

        try {

            // Extract product data from the request body.

            const {
                title_source,
                text_source,
                src_lang,
                price,
                category,
                feeling_type
            } = req.body || {};

            // Prepare title, description, language, and price values.

            const sourceTitle = (title_source || req.body.title_ru || "").trim();
            const sourceText = (text_source || req.body.text_ru || "").trim();
            const sourceLang = (src_lang || "ru").trim() || "ru";
            const priceValue = typeof price === "string" ? price.trim() : price;

            // Validate required fields.

            if (!sourceTitle || !sourceText || priceValue === "" || priceValue === undefined || priceValue === null) {
                return res.status(400).json({ messageKey: "error_fields_missing" });
            }

            // Convert price to a number.

            const parsedPrice = Number(priceValue);

            // Validate that the price is numeric.

            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({ messageKey: "error_invalid_price" });
            }

            // Translate the product title into Russian, English, and Estonian.

            const { title_ru, title_en, title_et } = await buildTranslations(sourceTitle, sourceLang);

            // Translate the product description into Russian, English, and Estonian.

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

            // Save the uploaded image path if an image was provided.

            const imagePath = req.file
                ? `/uploads/products/${req.file.filename}`
                : null;

            // Get related category and feeling type IDs from the database.

            const { categoryId, feelingTypeId } = await getRelationIds(
                category || "assortment",
                feeling_type || null
            );

            // Insert the new product into the database.

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

// Updates an existing product in the database.
// Access is allowed only for authenticated users with the "admin" or "superadmin" role.
// The route also supports replacing the product image.

router.put(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    upload.single("image"),
    async (req, res) => {

        // Generate a lock key to prevent duplicate update requests.

        const lockKey = getLockKey(req, "update");

        // If the same update is already being processed, stop the request.

        if (savingLocks.has(lockKey)) {
            return res.status(429).json({
                messageKey: "please_wait"
            });
        }

        // Add the request to active locks.

        savingLocks.add(lockKey);

        try {

            // Extract product data from the request body.

            const {
                title_source,
                text_source,
                src_lang,
                price,
                category,
                feeling_type,
                old_image
            } = req.body || {};

            // Prepare title, description, language, price, and image values.

            const sourceTitle = (title_source || req.body.title_ru || "").trim();
            const sourceText = (text_source || req.body.text_ru || "").trim();
            const sourceLang = (src_lang || "ru").trim() || "ru";
            const priceValue = typeof price === "string" ? price.trim() : price;

            // Validate required fields.

            if (!sourceTitle || !sourceText || priceValue === "" || priceValue === undefined || priceValue === null) {
                return res.status(400).json({ messageKey: "error_fields_missing" });
            }

            // Convert price to a number.

            const parsedPrice = Number(priceValue);

            // Validate that the price is numeric.

            if (Number.isNaN(parsedPrice)) {
                return res.status(400).json({ messageKey: "error_invalid_price" });
            }

            // Translate the product title into Russian, English, and Estonian.

            const { title_ru, title_en, title_et } = await buildTranslations(sourceTitle, sourceLang);

            // Translate the product description into Russian, English, and Estonian.

            const {
                title_ru: text_ru,
                title_en: text_en,
                title_et: text_et
            } = await buildTranslations(sourceText, sourceLang);

            // Keep the old image by default.

            let imagePath = old_image || null;

            // If a new image was uploaded, replace the old image path.

            if (req.file) {
                imagePath = `/uploads/products/${req.file.filename}`;
            }

            // Get related category and feeling type IDs from the database.

            const { categoryId, feelingTypeId } = await getRelationIds(
                category || "assortment",
                feeling_type || null
            );

            // Update the product data in the database.

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

// Deletes a product from the database.
// Access is allowed only for authenticated users with the "admin" or "superadmin" role.

router.delete(
    "/:id",
    auth,
    requireRole("admin", "superadmin"),
    async (req, res) => {

        try {

            // Delete the product whose ID is provided in the URL parameter.

            await pool.query(
                "DELETE FROM products WHERE id = ?",
                [req.params.id]
            );

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