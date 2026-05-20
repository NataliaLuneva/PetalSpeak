const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const transporter = require("../utils/mailer");
const router = express.Router();
const JWT_SECRET = "secret123";

// Creates a new customer order and saves it to the database.
// The route supports both authenticated and guest users.

router.post("/", async (req, res) => {

    // Get a dedicated database connection for transaction handling.

    const connection = await pool.getConnection();

    // Extract order information from the request body.

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

        // Check that the required customer fields are provided.

        if (!customerName || !email) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        // Use the provided cart items if they exist.

        let orderItems = Array.isArray(items) && items.length ? items : null;

        // If no cart items were provided, create a single-item order.

        if (!orderItems) {

            // If no bouquet title is provided, the order cannot be created.

            if (!bouquetTitle) {
                return res.status(400).json({ message: "The cart is empty." });
            }

            // Create a single bouquet order.

            orderItems = [{
                productId: null,
                bouquetType: bouquetType || "",
                bouquetTitle,
                bouquetImage: bouquetImage || "",
                price: Number(price) || 0,
                quantity: 1
            }];

        }

        // By default, the order is treated as a guest order.

        let userId = null;

        // Check whether the request contains an authorization token.

        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Bearer ")) {

            try {

                // Extract and verify the JWT token.

                const token = authHeader.split(" ")[1];

                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.id;
            } catch (error) {
                console.log("Order without a user:", error.message);
            }
        }

        // Calculate the total price of all ordered items.

        const totalPrice = orderItems.reduce((sum, item) => {
            return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }, 0);

        // Get the first item for storing preview information in the orders table.

        const firstItem = orderItems[0];

        // Start a database transaction.

        await connection.beginTransaction();

        // Insert the main order record.

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

        // Get the generated order ID.

        const orderId = orderResult.insertId;

        // Save each ordered item in the order_items table.

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

        await connection.commit();

        // Generate an HTML list of all ordered bouquets for the email message.

        const itemsHtml = orderItems.map(item => `
            <li>
                ${item.bouquetTitle || item.title} —
                €${Number(item.price || 0).toFixed(2)}
                × ${item.quantity || 1}
            </li>
        `).join("");

        // Select the email language.
        // If the provided language is not supported, English is used by default.

        const mailLang = ["ru", "et", "en"].includes(lang) ? lang : "en";

        // Text content for the confirmation email in three languages.

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

        // Get the selected translation object.

        const m = mailText[mailLang];

        // Send the order confirmation email to the customer.

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

        // Return a success response after the order is created and the email is sent.

        res.json({
            message: "Заказ успешно оформлен",
            orderId
        });
    } catch (error) {
        await connection.rollback();
        console.error("Ошибка оформления заказа:", error);
        res.status(500).json({ message: "Ошибка при оформлении заказа" });
    } finally {
        connection.release();
    }
});

// Retrieves all orders made by the currently authenticated user.
// Access is allowed only for users with a valid JWT token.

router.get("/my", auth, async (req, res) => {

    // Find all orders that belong to the current user.
    // Orders are sorted from newest to oldest.

    try {
        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.user.id]
        );

        // For each order, retrieve the bouquets included in it.

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