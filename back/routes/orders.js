const express = require("express");
const path = require("path");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const transporter = require("../utils/mailer");

const router = express.Router();

router.post("/", auth, async (req, res) => {
    try {
        const {
            customerName,
            email,
            bouquetType,
            bouquetTitle,
            bouquetImage,
            price,
            message
        } = req.body;

        if (!customerName || !email || !bouquetTitle) {
            return res.status(400).json({
                message: "Заполни обязательные поля"
            });
        }

        const userId = req.user ? req.user.id : null;

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

        console.log("Заказ сохранен в БД");

        let attachments = [];

        if (bouquetImage) {
            const imagePath = path.join(
                __dirname,
                "../../front",
                bouquetImage.replace(/^\//, "")
            );

            attachments.push({
                filename: path.basename(bouquetImage),
                path: imagePath,
                cid: "bouquetimage"
            });
        }

        await transporter.sendMail({
            from: '"PetalSpeak" <lunjevanatalja@gmail.com>',
            to: email,
            subject: "Thank you for your order! 💐",
            html: `
                <div style="background:#2b2b2b;padding:16px;color:#ffffff;font-family:Arial,sans-serif;max-width:420px;">
                    <h2 style="margin:0 0 16px;font-size:30px;font-weight:700;">
                        Thank you for your order! 🎉
                    </h2>

                    ${
                        bouquetImage
                            ? `
                                <div style="margin-bottom:16px;">
                                    <img
                                        src="cid:bouquetimage"
                                        alt="${bouquetTitle}"
                                        style="width:100%;max-width:320px;border-radius:12px;display:block;"
                                    >
                                </div>
                            `
                            : ""
                    }

                    <p style="margin:8px 0;"><strong>Name:</strong> ${customerName}</p>
                    <p style="margin:8px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin:8px 0;"><strong>Bouquet:</strong> ${bouquetTitle}</p>
                    <p style="margin:8px 0;"><strong>Type:</strong> ${bouquetType || "-"}</p>
                    <p style="margin:8px 0;"><strong>Price:</strong> €${price || "-"}</p>
                    <p style="margin:8px 0;"><strong>Message:</strong> ${message || "-"}</p>
                </div>
            `,
            attachments
        });

        console.log("Письмо успешно отправлено");

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

router.get("/my", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        res.json(orders);
    } catch (error) {
        console.error("Ошибка получения заказов:", error);
        res.status(500).json({ message: "Ошибка получения заказов" });
    }
});

module.exports = router;