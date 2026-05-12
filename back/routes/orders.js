const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const transporter = require("../utils/mailer");

const router = express.Router();
const JWT_SECRET = "secret123";

router.post("/", async (req, res) => {
    try {
        const {
            customerName,
            email,
            bouquetType,
            bouquetTitle,
            bouquetImage,
            price,
            message,
            address
        } = req.body;

        // Проверка обязательных полей
        if (!customerName || !email || !bouquetTitle) {
            return res.status(400).json({
                message: "Заполни обязательные поля"
            });
        }

        // Получаем userId из JWT (если пользователь авторизован)
        let userId = null;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (error) {
                console.log("Заказ без привязки к пользователю:", error.message);
            }
        }

        // Сохраняем заказ в БД
        await pool.query(
            `INSERT INTO orders
            (customer_name, email, bouquet_type, bouquet_title, bouquet_image, price, message, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerName,
                email,
                bouquetType || "",
                bouquetTitle,
                bouquetImage || "",
                price || null,
                message || "",
                userId
            ]
        );

        // Подготавливаем изображение букета для письма
        const attachments = [];
        let showBouquetImage = false;

        if (bouquetImage) {
            const filename = path.basename(bouquetImage);

            const possiblePaths = [
                path.join(__dirname, "..", "uploads", "products", filename),
                path.join(__dirname, "..", "..", "front", "assets", "img", filename)
            ];

            let imagePath = null;

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    imagePath = p;
                    break;
                }
            }

            console.log("Ищу изображение в:", possiblePaths);

            if (imagePath) {
                attachments.push({
                    filename,
                    path: imagePath,
                    cid: "bouquetimage"
                });

                console.log("Изображение успешно прикреплено:", imagePath);
            } else {
                console.warn("Изображение не найдено:", filename);
            }
        }
        // Отправляем письмо клиенту
        await transporter.sendMail({
            from: '"PetalSpeak" <lunjevanatalja@gmail.com>',
            to: email,
            subject: "Thank you for your order! 💐",
            html: `
                <div style="
                    background:#2b2b2b;
                    padding:16px;
                    color:#ffffff;
                    font-family:Arial,sans-serif;
                    max-width:420px;
                ">
                    <h2 style="
                        margin:0 0 16px;
                        font-size:30px;
                        font-weight:700;
                    ">
                        Thank you for your order! 🎉
                    </h2>

                    ${
                        attachments.length
                            ? `
                                <div style="margin-bottom:16px;">
                                    <img
                                        src="cid:bouquetimage"
                                        alt="${bouquetTitle}"
                                        style="
                                            width:100%;
                                            max-width:320px;
                                            border-radius:12px;
                                            display:block;
                                        "
                                    >
                                </div>
                            `
                            : ""
                    }

                    <p style="margin:8px 0;">
                        <strong>Name:</strong> ${customerName}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Email:</strong> ${email}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Bouquet:</strong> ${bouquetTitle}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Type:</strong> ${bouquetType || "-"}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Price:</strong> €${price || "-"}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Message:</strong> ${message || "-"}
                    </p>

                    <p style="margin:8px 0;">
                        <strong>Delivery address:</strong> ${address || "-"}
                    </p>
                </div>
            `,
            attachments
        });

        // Возвращаем успешный ответ
        res.json({
            message: "Заказ успешно оформлен"
        });
    } catch (error) {
        console.error("Ошибка оформления заказа:", error);
        res.status(500).json({
            message: "Ошибка при оформлении заказа"
        });
    }
});

// Получение заказов текущего пользователя
router.get("/my", auth, async (req, res) => {
    try {
        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        res.json(orders);
    } catch (error) {
        console.error("Ошибка получения заказов:", error);
        res.status(500).json({
            message: "Ошибка получения заказов"
        });
    }
});

module.exports = router;