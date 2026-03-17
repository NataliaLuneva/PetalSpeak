const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

// routes
const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/tests");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = 3000;

// ====== PATH ======
const FRONT_DIR = path.join(__dirname, "..", "front");

// ====== DB ======
const MONGO_URI = "mongodb://127.0.0.1:27017/petalspeak";



mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err));

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());

// ====== STATIC ======
app.use(express.static(FRONT_DIR));
app.use("/assets", express.static(path.join(FRONT_DIR, "assets")));
app.use("/locales", express.static(path.join(FRONT_DIR, "locales")));

// ====== API ======
app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// ====== TEST ROUTE ======
app.get("/api/test", (req, res) => {
    res.json({ message: "API works 🚀" });
});

// ====== FRONT ======
app.get("/", (req, res) => {
    res.sendFile(path.join(FRONT_DIR, "index.html"));
});

// ====== START ======
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});