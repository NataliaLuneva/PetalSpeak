const express = require("express");
const router = express.Router();
const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// This file contains routes for the super administrator panel.
// It is used to manage users, orders, and system statistics.

router.get("/users", auth, requireRole("superadmin"), async (req, res) => {

// This route retrieves all registered users from the database.

    try {
        const [users] = await pool.query(`
            SELECT id, name, email, avatar, role, is_blocked, is_deleted, created_at
            FROM users
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Error retrieving users." });
    }

});

router.put("/users/:id/make-admin", auth, requireRole("superadmin"), async (req, res) => {

    // This route assigns the administrator role to a selected user.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You do not need to change yourself." });
        }

        await pool.query(
            "UPDATE users SET role = 'admin' WHERE id = ? AND is_deleted = 0",
            [userId]
        );
        res.json({ message: "User has been assigned as an administrator." });
    } catch (error) {
        console.error("Make admin error:", error);
        res.status(500).json({ message: "Error assigning administrator role." });
    }

});

router.put("/users/:id/remove-admin", auth, requireRole("superadmin"), async (req, res) => {

    // This route removes administrator privileges from a user.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot remove your own administrator privileges." });
        }
        await pool.query(
            "UPDATE users SET role = 'user' WHERE id = ? AND is_deleted = 0",
            [userId]
        );
        res.json({ message: "Administrator privileges have been removed." });
    } catch (error) {
        console.error("Remove admin error:", error);
        res.status(500).json({ message: "Error removing administrator privileges." });
    }

});

router.put("/users/:id/block", auth, requireRole("superadmin"), async (req, res) => {

    // This route blocks a user account.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot block yourself." });
        }
        await pool.query(
            "UPDATE users SET is_blocked = 1 WHERE id = ? AND is_deleted = 0",
            [userId]
        );
        res.json({ message: "User has been blocked." });
    } catch (error) {
        console.error("Block user error:", error);
        res.status(500).json({ message: "Error blocking user." });
    }


});

router.put("/users/:id/unblock", auth, requireRole("superadmin"), async (req, res) => {

    // This route restores access to a blocked user

    try {
        const userId = Number(req.params.id);

        await pool.query(
            "UPDATE users SET is_blocked = 0 WHERE id = ? AND is_deleted = 0",
            [userId]
        );

        res.json({ message: "User has been unblocked." });
    } catch (error) {
        console.error("Unblock user error:", error);
        res.status(500).json({ message: "Error unblocking user." });
    }

});

router.put("/users/:id/delete", auth, requireRole("superadmin"), async (req, res) => {

    // This route performs a soft delete of a user account.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot delete yourself." });
        }
        await pool.query(
            "UPDATE users SET is_deleted = 1 WHERE id = ?",
            [userId]
        );
        res.json({ message: "User has been deleted." });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Error deleting user." });
    }

});

router.get("/orders", auth, requireRole("superadmin"), async (req, res) => {

    // This route retrieves all customer orders with their items.

    try {
        const { from, to } = req.query;
        let where = "";

        const params = [];
        if (from && to) {
            where = "WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            params.push(from, to);
        }

        const [orders] = await pool.query(`
            SELECT o.*, u.name AS user_name, u.role AS user_role
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ${where}
            ORDER BY o.created_at DESC
        `, params);

        for (const order of orders) {
            const [items] = await pool.query(
                "SELECT * FROM order_items WHERE order_id = ?",
                [order.id]
            );

            order.items = items;
        }
        res.json(orders);
    } catch (error) {
        console.error("Get admin orders error:", error);
        res.status(500).json({ message: "Error retrieving orders." });
    }

});

router.get("/stats", auth, requireRole("superadmin"), async (req, res) => {

    // This route generates sales and revenue statistics.

    try {
        const { from, to } = req.query;
        let where = "";
        const params = [];

        if (from && to) {
            where = "WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            params.push(from, to);
        }

        const [[totalOrdersRow]] = await pool.query(
            `SELECT COUNT(*) AS count FROM orders ${where}`,
            params
        );

        const [[totalRevenueRow]] = await pool.query(
            `SELECT COALESCE(SUM(price), 0) AS total FROM orders ${where}`,
            params
        );

        const [[monthRevenueRow]] = await pool.query(`
            SELECT COALESCE(SUM(price), 0) AS total
            FROM orders
            WHERE YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
        `);

        const [topSales] = await pool.query(`
            SELECT 
                oi.bouquet_title,
                SUM(oi.quantity) AS total_sales,
                COALESCE(SUM(oi.price * oi.quantity), 0) AS revenue
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            ${where ? where.replace(/created_at/g, "o.created_at") : ""}
            GROUP BY oi.bouquet_title
            ORDER BY total_sales DESC, revenue DESC
            LIMIT 5
        `, params);
        res.json({
            totalOrders: totalOrdersRow.count,
            totalRevenue: totalRevenueRow.total,
            monthRevenue: monthRevenueRow.total,
            topSales
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ message: "Error retrieving statistics." });
    }

});

module.exports = router;