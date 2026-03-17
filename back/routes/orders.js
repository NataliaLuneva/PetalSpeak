const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const transporter = require("../utils/mailer");

router.post("/", async (req, res) => {
    try {
        const {
            customerName,
            email,
            bouquetType,
            bouquetTitle,
            message
        } = req.body;

        if (!customerName || !email || !bouquetType || !bouquetTitle) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const order = new Order({
            customerName,
            email,
            bouquetType,
            bouquetTitle,
            message: message || ""
        });

        await order.save();

        // 💌 письмо клиенту
        await transporter.sendMail({
            from: "PetalSpeak 🌸 <ТВОЯ_ПОЧТА@gmail.com>",
            to: email,
            subject: "Your PetalSpeak Order 💐",
            html: `
                <h2>Thank you for your order!</h2>
                <p><b>Name:</b> ${customerName}</p>
                <p><b>Bouquet:</b> ${bouquetTitle}</p>
                <p><b>Message:</b> ${message}</p>
            `
        });

        // 🔔 уведомление тебе
        await transporter.sendMail({
            from: "PetalSpeak 🌸 <ТВОЯ_ПОЧТА@gmail.com>",
            to: "ТВОЯ_ПОЧТА@gmail.com",
            subject: "🔥 New Order",
            html: `
                <h2>New order</h2>
                <p><b>Name:</b> ${customerName}</p>
                <p><b>Email:</b> ${email}</p>
                <p><b>Bouquet:</b> ${bouquetTitle}</p>
                <p><b>Message:</b> ${message}</p>
            `
        });

        res.json({
            message: "Order created & email sent 💌"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;