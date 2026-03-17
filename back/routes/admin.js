const express = require("express");
const User = require("../models/User");
const Order = require("../models/Order");
const TestResult = require("../models/TestResult");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// all users
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// all orders
router.get("/orders", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "email role")
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// all tests
router.get("/tests", async (req, res) => {
    try {
        const tests = await TestResult.find()
            .populate("user", "email role")
            .sort({ createdAt: -1 });

        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// update order status
router.patch("/orders/:id", async (req, res) => {
    try {
        const { status } = req.body;

        if (!["new", "processing", "done"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        res.json({ message: "Order updated", order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;