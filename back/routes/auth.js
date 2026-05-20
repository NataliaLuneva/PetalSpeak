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

// Checks whether the provided password meets security requirements.
// Returns true if the password is strong enough, otherwise returns false.

function isStrongPassword(password) {

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
    
}

// Create an absolute path to the folder where avatar images will be stored.
// The folder will be located in the "uploads/avatars" directory.

const uploadDir = path.join(__dirname, "..", "uploads", "avatars");

// Check whether the directory already exists.

if (!fs.existsSync(uploadDir)) {

    // If the directory does not exist, create it.
    // The "recursive: true" option automatically creates all missing parent directories if necessary.

    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure how uploaded avatar images will be stored on the server.

const storage = multer.diskStorage({

    // Specify the directory where uploaded avatar images will be saved.

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    // Generate a unique filename for each uploaded file.

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);

        // Create a new filename using:
        // - the current user's ID,
        // - the current timestamp,
        // - the original file extension.
        // Example: user_5_1716200000000.jpg

        cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
    }

});

// Create a multer instance for handling file uploads.

const upload = multer({

    // Set restrictions for uploaded files.
    // Maximum allowed file size is 5 megabytes.

    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        // Allow only files whose MIME type starts with "image/" such as image/jpeg, image/png, or image/webp.

        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("error_only_images"));
        }
    }

});

// Registers a new user in the system.

router.post("/register", async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // Check that all required fields are provided.

        if (!name || !email || !password) {
            return res.status(400).json({
                messageKey: "error_fields_missing"
            });
        }

        // Validate the password strength.
        // The password must contain at least 8 characters, uppercase and lowercase letters, a number, and a special character.

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                messageKey: "passwordWeak"
            });
        }

        // Check whether a user with the same email already exists.

        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        // If the email is already registered, return an error.

        if (existing.length) {
            return res.status(400).json({
                messageKey: "error_user_exists"
            });
        }

        // Hash the password using bcrypt before saving it.

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database.

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

// Authenticates a user and generates a JWT token after successful login.

router.post("/login", async (req, res) => {

    try {
        const { email, password } = req.body;

        // Search for a user with the provided email address.

        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        // If no user with this email exists, return an error.

        if (!rows.length) {
            return res.status(400).json({
                messageKey: "error_user_not_found"
            });
        }

        // Get the first matching user record.

        const user = rows[0];

        // Check whether the account has been marked as deleted.

        if (user.is_deleted) {
            return res.status(403).json({
                messageKey: "account_deleted"
            });
        }

        // Check whether the account has been permanently blocked.

        if (user.is_blocked) {
            return res.status(403).json({
                messageKey: "account_blocked"
            });
        }

        // Check whether the account is temporarily blocked due to too many failed login attempts.

        if (user.blocked_until && new Date(user.blocked_until) > new Date()) {
            return res.status(403).json({
                messageKey: "accountTemporarilyBlocked"
            });
        }

        // Compare the entered password with the stored hashed password.

        const isValid = await bcrypt.compare(password, user.password);

        // If the password is incorrect.

        if (!isValid) {

            // Increase the number of failed login attempts.

            const attempts = (user.failed_attempts || 0) + 1;

            // If three incorrect attempts are reached, block the account for 3 hours.

            if (attempts >= 3) {
                await pool.query(
                    "UPDATE users SET failed_attempts = 0, blocked_until = DATE_ADD(NOW(), INTERVAL 3 HOUR) WHERE id = ?",
                    [user.id]
                );

                return res.status(403).json({
                    messageKey: "accountBlockedAfterAttempts"
                });
            }

            // Save the updated number of failed attempts.

            await pool.query(
                "UPDATE users SET failed_attempts = ? WHERE id = ?",
                [attempts, user.id]
            );

            // Return an error and indicate how many attempts remain.

            return res.status(400).json({
                messageKey: "wrongPasswordAttemptsLeft",
                count: 3 - attempts
            });
        }

        // Reset failed attempts and remove temporary block after successful authentication.

        await pool.query(
            "UPDATE users SET failed_attempts = 0, blocked_until = NULL WHERE id = ?",
            [user.id]
        );

        // Generate a JWT token containing user information.
        // The token is valid for 15 minutes.

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role || "user"
            },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Return the authentication token and user profile data.

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

// Retrieves information about the currently authenticated user.
// Access is allowed only for users with a valid JWT token.

router.get("/me", auth, async (req, res) => {

    try {

        // Find the user in the database by the ID stored in the token.

        const [rows] = await pool.query(
            "SELECT id, name, email, avatar, created_at, role, is_blocked, is_deleted FROM users WHERE id = ?",
            [req.user.id]
        );

        // If the user does not exist, return a not found error.

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

// Updates the profile information of the currently authenticated user.
// Access is allowed only for users with a valid JWT token.

router.put("/profile", auth, async (req, res) => {

    try {
        const { name, email } = req.body;

        // Check that both required fields are provided.

        if (!name || !email) {
            return res.status(400).json({
                message: "Name and email are required."
            });
        }

        // Check whether another user is already using the same email address.

        const [emailCheck] = await pool.query(
            "SELECT id FROM users WHERE email = ? AND id != ?",
            [email, req.user.id]
        );

        // If the email is already taken, return an error.

        if (emailCheck.length) {
            return res.status(400).json({
                message: "This email is already in use."
            });
        }

        // Update the user's name and email in the database.

        await pool.query(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name, email, req.user.id]
        );

        // Retrieve the updated user information from the database.

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

// Changes the password of the currently authenticated user.
// Access is allowed only for users with a valid JWT token.

router.put("/password", auth, async (req, res) => {

    try {

        // Extract the current password, new password, and password confirmation from the request body.

        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Check that all password fields are filled in.

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Please fill in all password fields."
            });
        }

        // Validate the strength of the new password.
        // The password must contain at least 8 characters, uppercase and lowercase letters, a number, and a special character.

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                message: "The new password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        // Check whether the new password matches the confirmation password.

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match."
            });
        }

        // Retrieve the current hashed password from the database.

        const [rows] = await pool.query(
            "SELECT password FROM users WHERE id = ?",
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        // Compare the entered current password with the stored hashed password.

        const isValid = await bcrypt.compare(currentPassword, rows[0].password);

        if (!isValid) {
            return res.status(400).json({
                message: "Current password is incorrect."
            });
        }

        // Hash the new password before saving it.

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database.

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

// Uploads and saves a new profile avatar for the currently authenticated user.
// Access is allowed only for users with a valid JWT token.

router.post("/avatar", auth, (req, res) => {

    // Process a single uploaded file from the form field named "avatar".

    upload.single("avatar")(req, res, async (err) => {

        // Check whether an error occurred during file upload.

        try {
            if (err) {
                return res.status(400).json({
                    message: err.message || "File upload error."
                });
            }

            // Check whether a file was actually selected.

            if (!req.file) {
                return res.status(400).json({
                    message: "No file selected."
                });
            }

            // Create the relative path to the uploaded avatar image.

            const avatarPath = `/uploads/avatars/${req.file.filename}`;

            // Save the avatar path in the user's database record.

            await pool.query(
                "UPDATE users SET avatar = ? WHERE id = ?",
                [avatarPath, req.user.id]
            );

            // Return a success message and the new avatar path.

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