const express = require("express");
const router = express.Router();

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// все пользователи
router.get("/users", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT id, name, email, avatar, role, is_blocked, is_deleted, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json(users);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Ошибка получения пользователей" });
    }
});

// назначить admin
router.put("/users/:id/make-admin", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ message: "Себя менять не нужно" });
        }

        await pool.query(
            "UPDATE users SET role = 'admin' WHERE id = ? AND is_deleted = 0",
            [userId]
        );

        res.json({ message: "Пользователь назначен админом" });
    } catch (error) {
        console.error("Make admin error:", error);
        res.status(500).json({ message: "Ошибка назначения админа" });
    }
});

// убрать admin
router.put("/users/:id/remove-admin", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ message: "Нельзя убрать права у самого себя" });
        }

        await pool.query(
            "UPDATE users SET role = 'user' WHERE id = ? AND is_deleted = 0",
            [userId]
        );

        res.json({ message: "Права админа убраны" });
    } catch (error) {
        console.error("Remove admin error:", error);
        res.status(500).json({ message: "Ошибка удаления прав админа" });
    }
});

// блокировка
router.put("/users/:id/block", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ message: "Нельзя заблокировать самого себя" });
        }

        await pool.query(
            "UPDATE users SET is_blocked = 1 WHERE id = ? AND is_deleted = 0",
            [userId]
        );

        res.json({ message: "Пользователь заблокирован" });
    } catch (error) {
        console.error("Block user error:", error);
        res.status(500).json({ message: "Ошибка блокировки пользователя" });
    }
});

// разблокировка
router.put("/users/:id/unblock", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        await pool.query(
            "UPDATE users SET is_blocked = 0 WHERE id = ? AND is_deleted = 0",
            [userId]
        );

        res.json({ message: "Пользователь разблокирован" });
    } catch (error) {
        console.error("Unblock user error:", error);
        res.status(500).json({ message: "Ошибка разблокировки пользователя" });
    }
});

// мягкое удаление
router.put("/users/:id/delete", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (userId === req.user.id) {
            return res.status(400).json({ message: "Нельзя удалить самого себя" });
        }

        await pool.query(
            "UPDATE users SET is_deleted = 1 WHERE id = ?",
            [userId]
        );

        res.json({ message: "Пользователь удалён" });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Ошибка удаления пользователя" });
    }
});

// все заказы
router.get("/orders", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, u.name AS user_name, u.role AS user_role
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);

        res.json(orders);
    } catch (error) {
        console.error("Get admin orders error:", error);
        res.status(500).json({ message: "Ошибка получения заказов" });
    }
});

// статистика
router.get("/stats", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const [[totalOrdersRow]] = await pool.query(
            "SELECT COUNT(*) AS count FROM orders"
        );

        const [[totalRevenueRow]] = await pool.query(
            "SELECT COALESCE(SUM(price), 0) AS total FROM orders"
        );

        const [[monthRevenueRow]] = await pool.query(`
            SELECT COALESCE(SUM(price), 0) AS total
            FROM orders
            WHERE YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
        `);

        const [topSales] = await pool.query(`
            SELECT bouquet_title, COUNT(*) AS total_sales, COALESCE(SUM(price), 0) AS revenue
            FROM orders
            GROUP BY bouquet_title
            ORDER BY total_sales DESC, revenue DESC
            LIMIT 5
        `);

        res.json({
            totalOrders: totalOrdersRow.count,
            totalRevenue: totalRevenueRow.total,
            monthRevenue: monthRevenueRow.total,
            topSales
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ message: "Ошибка получения статистики" });
    }
});

module.exports = router;