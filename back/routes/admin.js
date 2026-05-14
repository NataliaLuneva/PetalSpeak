const express = require("express");
const router = express.Router();

const pool = require("../config/mysql");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Tagastab kõik kasutajad.
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

// Määrab kasutajale admini rolli.
router.put("/users/:id/make-admin", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const userId = Number(req.params.id);

        // Keelame enda rolli muutmise.
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

// Eemaldab kasutajalt admini rolli.
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

// Blokeerib kasutaja.
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

// Eemaldab kasutaja blokeeringu.
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

// Märgib kasutaja kustutatuks ilma andmeid päriselt eemaldamata.
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

// Tagastab kõik tellimused koos kuupäevafiltriga.
router.get("/orders", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const { from, to } = req.query;

        let where = "";
        const params = [];

        // Kui kuupäevad on antud, filtreerime tellimused perioodi järgi.
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
        console.error("Get admin orders error:", error);
        res.status(500).json({ message: "Ошибка получения заказов" });
    }
});

// Tagastab statistika koos kuupäevafiltriga.
router.get("/stats", auth, requireRole("superadmin"), async (req, res) => {
    try {
        const { from, to } = req.query;

        let where = "";
        const params = [];

        if (from && to) {
            where = "WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)";
            params.push(from, to);
        }

        // Tellimuste koguarv.
        const [[totalOrdersRow]] = await pool.query(
            `SELECT COUNT(*) AS count FROM orders ${where}`,
            params
        );

        // Kogutulu valitud perioodil.
        const [[totalRevenueRow]] = await pool.query(
            `SELECT COALESCE(SUM(price), 0) AS total FROM orders ${where}`,
            params
        );

        // Käesoleva kuu tulu.
        const [[monthRevenueRow]] = await pool.query(`
            SELECT COALESCE(SUM(price), 0) AS total
            FROM orders
            WHERE YEAR(created_at) = YEAR(CURDATE())
              AND MONTH(created_at) = MONTH(CURDATE())
        `);

        // Enim müüdud kimbud.
        const [topSales] = await pool.query(`
            SELECT bouquet_title, COUNT(*) AS total_sales, COALESCE(SUM(price), 0) AS revenue
            FROM orders
            ${where}
            GROUP BY bouquet_title
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
        res.status(500).json({ message: "Ошибка получения статистики" });
    }
});

module.exports = router;

// Этот файл содержит маршруты административной панели для superadmin. 
// Через них можно получать список пользователей, назначать и удалять роль администратора, блокировать, разблокировать и мягко удалять пользователей. 
// Также здесь реализовано получение всех заказов с возможностью фильтрации по датам и получение статистики: общее количество заказов, общая выручка, выручка за текущий месяц и список самых продаваемых букетов.
