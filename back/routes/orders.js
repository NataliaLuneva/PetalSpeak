const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const pool = require("../config/mysql");
const transporter = require("../utils/mailer");

router.post("/", async (req, res) => {
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

        console.log("bouquetImage from frontend:", bouquetImage);

        if (!customerName || !email || !bouquetType || !bouquetTitle) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        await pool.execute(
            `
            INSERT INTO orders
            (customer_name, email, bouquet_type, bouquet_title, bouquet_image, price, message)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                customerName,
                email,
                bouquetType,
                bouquetTitle,
                bouquetImage || null,
                price || null,
                message || ""
            ]
        );

        try {
            const imageFilename = bouquetImage ? path.basename(bouquetImage) : null;
            const imagePath = imageFilename
                ? path.join(__dirname, "..", "..", "front", "assets", "img", imageFilename)
                : null;

            console.log("imageFilename:", imageFilename);
            console.log("imagePath:", imagePath);
            console.log("image exists:", imagePath ? fs.existsSync(imagePath) : false);

            const hasImage = imagePath && fs.existsSync(imagePath);

            await transporter.sendMail({
                from: '"PetalSpeak 🌸" <ТВОЯ_ПОЧТА@gmail.com>',
                to: email,
                subject: "Your PetalSpeak Order 💐",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Thank you for your order! 💐</h2>

                        ${hasImage ? `
                            <img
                                src="cid:bouquetimage"
                                style="width: 300px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display:block; margin: 15px 0;"
                            />
                        ` : ""}

                        <p><b>Name:</b> ${customerName}</p>
                        <p><b>Bouquet:</b> ${bouquetTitle}</p>
                        <p><b>Price:</b> €${price || "-"}</p>
                        <p><b>Message:</b> ${message || "-"}</p>
                    </div>
                `,
                attachments: hasImage
                    ? [
                        {
                            filename: imageFilename,
                            path: imagePath,
                            cid: "bouquetimage"
                        }
                    ]
                    : []
            });

            await transporter.sendMail({
                from: '"PetalSpeak 🌸" <ТВОЯ_ПОЧТА@gmail.com>',
                to: "ТВОЯ_ПОЧТА@gmail.com",
                subject: "New PetalSpeak Order 🌸",
                html: `
                    <h2>New order received</h2>
                    <p><b>Name:</b> ${customerName}</p>
                    <p><b>Email:</b> ${email}</p>
                    <p><b>Bouquet type:</b> ${bouquetType}</p>
                    <p><b>Bouquet title:</b> ${bouquetTitle}</p>
                    <p><b>Price:</b> €${price || "-"}</p>
                    <p><b>Message:</b> ${message || "-"}</p>
                `
            });

        } catch (mailError) {
            console.error("MAIL ERROR:", mailError);
            return res.json({
                message: "Order saved, but email was not sent"
            });
        }

        res.json({ message: "Order created successfully 💌" });
    } catch (error) {
        console.error("ORDER ERROR:", error);
        res.status(500).json({ error: "Server error while creating order" });
    }
});

router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM orders ORDER BY created_at DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("GET ORDERS ERROR:", error);
        res.status(500).json({ error: "Server error while fetching orders" });
    }
});

module.exports = router;