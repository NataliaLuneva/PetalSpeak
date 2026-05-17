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

// This function checks whether the password meets security requirements.

function isStrongPassword(password) {

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
    
}

// This block creates a folder for storing user profile images.

const uploadDir = path.join(__dirname, "..", "uploads", "avatars");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// This block configures how uploaded avatar files are stored.

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
    }

});

// This block configures file upload restrictions.

const upload = multer({

    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("error_only_images"));
        }
    }

});

// This route registers a new user account.

router.post("/register", async (req, res) => {

    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                messageKey: "error_fields_missing"
            });
        }

        if (!isStrongPassword(password)) {
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
                messageKey: "error_user_exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword]
        );
        res.json({
            messageKey: "registration_success"
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            messageKey: "error_registration"
        });
    }

});

// This route authenticates a user and returns a JWT token.

router.post("/login", async (req, res) => {

    try {
        const { email, password } = req.body;

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!rows.length) {
            return res.status(400).json({
                messageKey: "error_user_not_found"
            });
        }

        const user = rows[0];

        if (user.is_deleted) {
            return res.status(403).json({
                messageKey: "account_deleted"
            });
        }

        if (user.is_blocked) {
            return res.status(403).json({
                messageKey: "account_blocked"
            });
        }

        if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
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
                    messageKey: "accountBlockedAfterAttempts"
                });
            }

            await pool.query(
                "UPDATE users SET failed_attempts = ? WHERE id = ?",
                [attempts, user.id]
            );

            return res.status(400).json({
                messageKey: "wrongPasswordAttemptsLeft",
                count: 3 - attempts
            });
        }

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

        return res.json({
            messageKey: "login_success",
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
        return res.status(500).json({
            messageKey: "error_login"
        });
    }

});

// This route retrieves information about the currently authenticated user.

router.get("/me", auth, async (req, res) => {

    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, avatar, created_at, role, is_blocked, is_deleted FROM users WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({
            message: "Error retrieving user."
        });
    }

});

// This route updates the user's profile information.

router.put("/profile", auth, async (req, res) => {

    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required."
            });
        }

        const [emailCheck] = await pool.query(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [email, req.user.id]
        );

        if (emailCheck.length) {
            return res.status(400).json({
                message: "This email is already in use."
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
            message: "Profile updated successfully.",
            user: rows[0]
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            message: "Error updating profile."
        });
    }

});

// This route changes the user's password.

router.put("/password", auth, async (req, res) => {

    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Please fill in all password fields."
            });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: "The new password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        const [rows] = await pool.query(
            "SELECT password FROM users WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const isValid = await bcrypt.compare(currentPassword, rows[0].password);

        if (!isValid) {
            return res.status(400).json({
                message: "Current password is incorrect."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, req.user.id]
        );

        res.json({
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            message: "Error changing password."
        });
    }

});

// This route uploads and saves a new profile avatar.

router.post("/avatar", auth, (req, res) => {

    upload.single("avatar")(req, res, async (err) => {

        try {
            if (err) {
                return res.status(400).json({
                    message: err.message || "File upload error."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    message: "No file selected."
                });
            }

            const avatarPath = `/uploads/avatars/${req.file.filename}`;

            await pool.query(
                "UPDATE users SET avatar = ? WHERE id = ?",
                [avatarPath, req.user.id]
            );

            res.json({
                message: "Profile photo updated successfully.",
                avatar: avatarPath
            });
        } catch (error) {
            console.error("Upload avatar error:", error);
            res.status(500).json({
                message: "Error uploading profile photo."
            });
        }

    });

});

module.exports = router;