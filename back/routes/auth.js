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

function isStrongPassword(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

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

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message: "Пароль должен быть минимум 8 символов и содержать заглавную букву, строчную букву, цифру и спецсимвол"
            });
            return res.status(400).json({
                messageKey: "passwordWeak"
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

        if (user.is_deleted) {
            return res.status(403).json({
                message: "Аккаунт удалён"
            });
        }

        if (user.is_blocked) {
            return res.status(403).json({
                message: "Аккаунт заблокирован"
            });
        }

        if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
            return res.status(403).json({
                message: "Аккаунт временно заблокирован на 3 часа из-за неверных попыток входа"
            });
            return res.status(403).json({
                messageKey: "accountTemporarilyBlocked"
            });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            const attempts = (user.failed_attempts || 0) + 1;

            if (attempts >= 3) {
                await pool.query(
                    "UPDATE users SET failed_attempts = 0, blocked_until = DATE_ADD(NOW(), INTERVAL 3 HOUR) WHERE id = ?",
                    [user.id]
                );

                return res.status(403).json({
                    message: "Аккаунт заблокирован на 3 часа после 3 неверных попыток входа"
                });

                return res.status(403).json({
                    messageKey: "accountBlockedAfterAttempts"
                });
            }

            await pool.query(
                "UPDATE users SET failed_attempts = ? WHERE id = ?",
                [attempts, user.id]
            );

            return res.status(400).json({
                message: `Неверный пароль. Осталось попыток: ${3 - attempts}`
            });

            return res.status(400).json({
                messageKey: "wrongPasswordAttemptsLeft",
                params: {
                    count: 3 - attempts
                }
            });
        }

        // Если пароль правильный — сбрасываем счётчик и снимаем временную блокировку
        await pool.query(
            "UPDATE users SET failed_attempts = 0, blocked_until = NULL WHERE id = ?",
            [user.id]
        );

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role || "user"
            },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.json({
            message: "Вход выполнен",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role || "user"
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Ошибка входа"
        });

        return res.status(401).json({
            messageKey: "sessionExpired"
        });
    }
});

// ===== current user =====
router.get("/me", auth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, avatar, created_at, role, is_blocked, is_deleted FROM users WHERE id = ?",
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
            "SELECT id, name, email, avatar, role FROM users WHERE id = ?",
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
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Заполни все поля пароля"
            });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: "Новый пароль должен быть минимум 8 символов и содержать заглавную букву, строчную букву, цифру и спецсимвол"
            });

            return res.status(400).json({
                messageKey: "newPasswordWeak"
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

        const isValid = await bcrypt.compare(currentPassword, rows[0].password);

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
router.post("/avatar", auth, (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
        try {
            if (err) {
                return res.status(400).json({
                    message: err.message || "Ошибка загрузки файла"
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
});

module.exports = router;