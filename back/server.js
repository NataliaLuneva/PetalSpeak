const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/tests");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const productRoutes = require("./routes/products");

// Loome Expressi rakenduse.
const app = express();

// Määrame serveri pordi.
const PORT = 3000;

// Määrame frontend-kausta asukoha.
const FRONT_DIR = path.join(__dirname, "..", "front");

// Lubame CORS päringud.
app.use(cors());

// Lubame JSON-vormingus päringukeha töötlemise.
app.use(express.json());

// Jagame staatilisi frontend-faile.
app.use(express.static(FRONT_DIR));
app.use("/assets", express.static(path.join(FRONT_DIR, "assets")));
app.use("/locales", express.static(path.join(FRONT_DIR, "locales")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Registreerime API marsruudid.
app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/test-results", testRoutes);

// Avalehe päring tagastab index.html faili.
app.get("/", (req, res) => {
    res.sendFile(path.join(FRONT_DIR, "index.html"));
});

// Käivitame serveri määratud pordil.
app.listen(PORT, () => {
    console.log(`Server running http://localhost:${PORT}`);
});

// Данный файл является основной точкой входа серверного приложения. 
// Здесь создаётся экземпляр Express, подключаются необходимые маршруты, настраивается обработка JSON-запросов и разрешаются CORS-запросы. 
// Также сервер раздаёт статические файлы фронтенда, папки assets, locales и загруженные изображения из uploads. 
// После регистрации всех API-маршрутов запускается HTTP-сервер на порту 3000.