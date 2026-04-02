const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = require("../config/mysql");
const auth = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = "secret123";

// ===== uploads folder =====
const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ===== multer config =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Можно загружать только изображения"));
        }
    }
});

// ===== register =====
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Заполни все обязательные поля"
            });
        }

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length) {
            return res.status(400).json({
                message: "Пользователь с таким email уже существует"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );

        res.json({
            message: "Регистрация прошла успешно"
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            message: "Ошибка регистрации"
        });
    }
});

// ===== login =====
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(400).json({
                message: "Пользователь не найден"
            });
        }

        const user = rows[0];

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({
                message: "Неверный пароль"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            message: "Вход выполнен",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Ошибка входа"
        });
    }
});

// ===== current user =====
router.get("/me", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        const [rows] = await pool.query(
            "SELECT id, name, email, avatar, created_at FROM users WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "Пользователь не найден"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({
            message: "Ошибка получения пользователя"
        });
    }
});

// ===== update profile =====
router.put("/profile", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Имя и email обязательны"
            });
        }

        const [emailCheck] = await pool.query(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [email, req.user.id]
        );

        if (emailCheck.length) {
            return res.status(400).json({
                message: "Этот email уже занят"
            });
        }

        await pool.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name, email, req.user.id]
        );

        const [rows] = await pool.query(
            "SELECT id, name, email, avatar FROM users WHERE id = ?",
            [req.user.id]
        );

        res.json({
            message: "Профиль обновлен",
            user: rows[0]
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            message: "Ошибка обновления профиля"
        });
    }
});

// ===== change password =====
router.put("/password", auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Заполни все поля пароля"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Новый пароль должен быть минимум 6 символов"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Пароли не совпадают"
            });
        }

        const [rows] = await pool.query(
            "SELECT password FROM users WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "Пользователь не найден"
            });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return res.status(400).json({
                message: "Текущий пароль неверный"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, req.user.id]
        );

        res.json({
            message: "Пароль успешно изменен"
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            message: "Ошибка смены пароля"
        });
    }
});

// ===== upload avatar =====
router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
    try {
        console.log("REQ.USER:", req.user);
        console.log("REQ.FILE:", req.file);
        
        if (!req.user) {
            return res.status(401).json({
                message: "Не авторизован"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Файл не выбран"
            });
        }

        const avatarPath = `/uploads/avatars/${req.file.filename}`;

        await pool.query(
            "UPDATE users SET avatar = ? WHERE id = ?",
            [avatarPath, req.user.id]
        );

        res.json({
            message: "Фото обновлено",
            avatar: avatarPath
        });
    } catch (error) {
        console.error("Upload avatar error:", error);
        res.status(500).json({
            message: "Ошибка загрузки фото"
        });
    }
});

module.exports = router;