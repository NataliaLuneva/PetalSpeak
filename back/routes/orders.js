const express = require("express");
const jwt = require("jsonwebtoken");

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const transporter = require("../utils/mailer");

const router = express.Router();
const JWT_SECRET = "secret123";

// Loob uue tellimuse.
router.post("/", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const {
            customerName,
            email,
            message,
            address,
            items,
            lang,

            bouquetType,
            bouquetTitle,
            bouquetImage,
            price
        } = req.body;

        // Kontrollime kohustuslikke välju.
        if (!customerName || !email) {
            return res.status(400).json({ message: "Заполни обязательные поля" });
        }

        // Kui ostukorvis on tooted, kasutame neid.
        let orderItems = Array.isArray(items) && items.length ? items : null;

        // Kui ostukorvi pole, loome tellimuse ühe buketi andmetest.
        if (!orderItems) {
            if (!bouquetTitle) {
                return res.status(400).json({ message: "Корзина пустая" });
            }

            orderItems = [{
                productId: null,
                bouquetType: bouquetType || "",
                bouquetTitle,
                bouquetImage: bouquetImage || "",
                price: Number(price) || 0,
                quantity: 1
            }];
        }

        let userId = null;
        const authHeader = req.headers.authorization;

        // Kui token on olemas, seome tellimuse kasutajaga.
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (error) {
                // Kui token on vigane, jätkub tellimus külalistellimusena.
                console.log("Заказ без пользователя:", error.message);
            }
        }

        // Arvutame tellimuse kogusumma.
        const totalPrice = orderItems.reduce((sum, item) => {
            return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }, 0);

        const firstItem = orderItems[0];

        // Alustame transaktsiooni, et tellimus ja tooted salvestuksid koos.
        await connection.beginTransaction();

        // Salvestame tellimuse põhiandmed.
        const [orderResult] = await connection.query(
            `INSERT INTO orders
            (customer_name, email, bouquet_type, bouquet_title, bouquet_image, price, message, address, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerName,
                email,
                firstItem.bouquetType || firstItem.type || "",
                orderItems.length === 1
                    ? firstItem.bouquetTitle || firstItem.title
                    : `${orderItems.length} bouquets`,
                firstItem.bouquetImage || firstItem.img || "",
                totalPrice,
                message || "",
                address || "",
                userId
            ]
        );

        const orderId = orderResult.insertId;

        // Salvestame kõik tellimuse tooted eraldi tabelisse.
        for (const item of orderItems) {
            await connection.query(
                `INSERT INTO order_items
                (order_id, product_id, bouquet_title, bouquet_type, bouquet_image, price, quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.productId || item.id || null,
                    item.bouquetTitle || item.title || "Bouquet",
                    item.bouquetType || item.type || "",
                    item.bouquetImage || item.img || "",
                    Number(item.price) || 0,
                    Number(item.quantity) || 1
                ]
            );
        }

        // Kinnitame andmebaasi muudatused.
        await connection.commit();

        // Loome tellitud toodete HTML-nimekirja e-kirja jaoks.
        const itemsHtml = orderItems.map(item => `
            <li>
                ${item.bouquetTitle || item.title} —
                €${Number(item.price || 0).toFixed(2)}
                × ${item.quantity || 1}
            </li>
        `).join("");

        // Valime e-kirja keele.
        const mailLang = ["ru", "et", "en"].includes(lang) ? lang : "en";

        // E-kirja tekstid eri keeltes.
        const mailText = {
            en: {
                subject: "Thank you for your order! 💐",
                title: "Thank you for your order! 🎉",
                name: "Name",
                email: "Email",
                address: "Delivery address",
                message: "Message",
                bouquets: "Your bouquets",
                total: "Total"
            },
            ru: {
                subject: "Спасибо за ваш заказ! 💐",
                title: "Спасибо за ваш заказ! 🎉",
                name: "Имя",
                email: "Почта",
                address: "Адрес доставки",
                message: "Сообщение",
                bouquets: "Ваши букеты",
                total: "Итого"
            },
            et: {
                subject: "Aitäh tellimuse eest! 💐",
                title: "Aitäh tellimuse eest! 🎉",
                name: "Nimi",
                email: "E-post",
                address: "Tarneaadress",
                message: "Sõnum",
                bouquets: "Sinu kimbud",
                total: "Kokku"
            }
        };

        const m = mailText[mailLang];

        // Saadame kliendile tellimuse kinnituse.
        await transporter.sendMail({
            from: '"PetalSpeak" <lunjevanatalja@gmail.com>',
            to: email,
            subject: m.subject,
            html: `
                <div style="background:#2b2b2b;padding:16px;color:#fff;font-family:Arial,sans-serif;max-width:480px;">
                    <h2>${m.title}</h2>

                    <p><strong>${m.name}:</strong> ${customerName}</p>
                    <p><strong>${m.email}:</strong> ${email}</p>
                    <p><strong>${m.address}:</strong> ${address || "-"}</p>
                    <p><strong>${m.message}:</strong> ${message || "-"}</p>

                    <h3>${m.bouquets}:</h3>
                    <ul>${itemsHtml}</ul>

                    <p><strong>${m.total}:</strong> €${totalPrice.toFixed(2)}</p>
                </div>
            `
        });

        res.json({
            message: "Заказ успешно оформлен",
            orderId
        });
    } catch (error) {
        // Kui midagi läheb valesti, tühistame transaktsiooni.
        await connection.rollback();
        console.error("Ошибка оформления заказа:", error);
        res.status(500).json({ message: "Ошибка при оформлении заказа" });
    } finally {
        // Vabastame andmebaasiühenduse.
        connection.release();
    }
});

// Tagastab sisselogitud kasutaja tellimused.
router.get("/my", auth, async (req, res) => {
    try {
        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        // Lisame igale tellimusele selle tooted.
        for (const order of orders) {
            const [items] = await pool.query(
                "SELECT * FROM order_items WHERE order_id = ?",
                [order.id]
            );

            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error("Ошибка получения заказов:", error);
        res.status(500).json({ message: "Ошибка получения заказов" });
    }
});

module.exports = router;

// Этот файл отвечает за оформление заказов и получение заказов текущего пользователя. 
// При создании заказа данные берутся либо из корзины items, либо из одного выбранного букета. 
// Если пользователь авторизован, заказ связывается с его id, а если токен отсутствует или недействителен, заказ оформляется как гостевой. 
// Заказ и его товары сохраняются в базе данных внутри транзакции, после чего клиенту отправляется письмо с подтверждением на выбранном языке: русском, эстонском или английском.