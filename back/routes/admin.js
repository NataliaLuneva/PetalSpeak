const express = require( "express" );
const router = express.Router();
const pool = require( "../config/mysql" );
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Retrieves a list of all registered users from the database.
// Access is allowed only for authenticated users with the "superadmin" role.

router.get("/users", auth, requireRole("superadmin"), async (req, res) => {

    // Execute an SQL query to select user information and sort the results by registration date (newest first).

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

// Assigns the "admin" role to a selected user.
// Access is allowed only for authenticated users with the "superadmin" role.

router.put("/users/:id/make-admin", auth, requireRole("superadmin"), async (req, res) => {

    // Convert the user ID from the URL parameter to a number.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You do not need to change yourself." });
        }

        // Update the user's role to "admin", but only if the account is not marked as deleted.

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

// Removes administrator privileges from a selected user.
// The user's role is changed from "admin" to "user".
// Access is allowed only for authenticated users with the "superadmin" role.

router.put("/users/:id/remove-admin", auth, requireRole("superadmin"), async (req, res) => {

    // Convert the user ID from the URL parameter to a number.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot remove your own administrator privileges." });
        }

        // Update the user's role to "user", but only if the account is not marked as deleted.
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

// Blocks a selected user account by setting the is_blocked flag to 1.
// A blocked user cannot log in or use the system.
// Access is allowed only for authenticated users with the "superadmin" role.

router.put("/users/:id/block", auth, requireRole("superadmin"), async (req, res) => {

    // Convert the user ID from the URL parameter to a number.
    // Prevent the super administrator from blocking their own account.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot block yourself." });
        }

        // Update the user's account status by setting is_blocked to 1.
        // Only active (not deleted) accounts can be blocked.
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

// Removes the block from a selected user account by setting is_blocked to 0.
// After this operation, the user can log in and use the system again.
// Access is allowed only for authenticated users with the "superadmin" role.

router.put("/users/:id/unblock", auth, requireRole("superadmin"), async (req, res) => {

    // Update the user's account status by setting is_blocked to 0.
    // Only active (not deleted) accounts can be unblocked.

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

// Marks a selected user account as deleted by setting is_deleted to 1.
// The user record remains in the database, but the account is treated as inactive.
// Access is allowed only for authenticated users with the "superadmin" role.

router.put("/users/:id/delete", auth, requireRole("superadmin"), async (req, res) => {

    // Prevent the super administrator from deleting their own account.

    try {
        const userId = Number(req.params.id);
        if (userId === req.user.id) {
            return res.status(400).json({ message: "You cannot delete yourself." });
        }

        // Mark the user account as deleted by setting is_deleted to 1.
        // The user data is preserved in the database for future reference.

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

// Retrieves all customer orders for the administration panel.
// Access is allowed only for authenticated users with the "superadmin" role.
// Orders can optionally be filtered by a date range.

router.get("/orders", auth, requireRole("superadmin"), async (req, res) => {

    // Extract optional start and end dates from query parameters.
    // SQL WHERE clause used for filtering orders by date.

    try {
        const { from, to } = req.query;
        let where = "";

        const params = [];

        // If both dates are provided, add a date filter.
        // The end date is extended by one day to include the full selected day.

        if (from && to) {
            where = "WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            params.push(from, to);
        }

        // Retrieve all orders together with the customer's name and role.

        const [orders] = await pool.query(`
            SELECT o.*, u.name AS user_name, u.role AS user_role
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ${where}
            ORDER BY o.created_at DESC
        `, params);

        // For each order, retrieve the list of ordered products.

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

// Retrieves statistics for the administration panel.
// Access is allowed only for authenticated users with the "superadmin" role.
// Statistics can optionally be filtered by a date range.

router.get("/stats", auth, requireRole("superadmin"), async (req, res) => {

    try {

        // Get optional date filters from query

        const { from, to } = req.query;

        let where = "";
        const params = [];

        // Filter statistics by date range if provided

        if (from && to) {
            where = "WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            params.push(from, to);
        }

        // Get total number of orders

        const [[totalOrdersRow]] = await pool.query(
            `SELECT COUNT(*) AS count FROM orders ${where}`,
            params
        );

        // Get total revenue from all orders

        const [[totalRevenueRow]] = await pool.query(
            `SELECT COALESCE(SUM(price), 0) AS total FROM orders ${where}`,
            params
        );

        // Get revenue for the current month

        const [[monthRevenueRow]] = await pool.query(`
            SELECT COALESCE(SUM(price), 0) AS total
            FROM orders
            WHERE YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
        `);

        // Get top 5 best-selling bouquets

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

        // Send statistics response

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