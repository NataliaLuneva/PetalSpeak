const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/mysql");

const router = express.Router();

// регистрация
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const [exists] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (exists.length) return res.status(400).json({ message: "Email уже используется" });

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash]
    );

    res.json({ message: "OK" });
});

// логин
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const [users] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    if (!users.length) return res.status(400).json({ message: "Пользователь не найден" });

    const user = users[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Неверный пароль" });

    const token = jwt.sign({ id: user.id }, "secret123");

    res.json({ token });
});

// текущий пользователь
router.get("/me", async (req, res) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({});

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, "secret123");

    const [users] = await pool.query("SELECT id,name,email FROM users WHERE id=?", [decoded.id]);

    res.json(users[0]);
});

module.exports = router;