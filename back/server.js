const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/tests");
const orderRoutes = require("./routes/orders");

const app = express();
const PORT = 3000;

const FRONT_DIR = path.join(__dirname, "..", "front");

app.use(cors());
app.use(express.json());

app.use(express.static(FRONT_DIR));
app.use("/assets", express.static(path.join(FRONT_DIR, "assets")));
app.use("/locales", express.static(path.join(FRONT_DIR, "locales")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(FRONT_DIR, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running http://localhost:${PORT}`);
});