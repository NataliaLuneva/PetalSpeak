const express = require("express");
const Order = require("../models/Order");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// create order (works for guest and user)
router.post("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let userId = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(token, "supersecretkey");
                userId = decoded.id;
            } catch (e) {
                userId = null;
            }
        }

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
            user: userId,
            customerName,
            email,
            bouquetType,
            bouquetTitle,
            message: message || ""
        });

        await order.save();

        res.json({
            message: "Order created",
            order
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// my orders
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;