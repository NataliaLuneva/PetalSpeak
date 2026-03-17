const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

const FRONT_DIR = path.join(__dirname, "..", "front");

app.use(express.static(FRONT_DIR)); // ← ВАЖНО

app.use("/assets", express.static(path.join(FRONT_DIR, "assets")));
app.use("/locales", express.static(path.join(FRONT_DIR, "locales")));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONT_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});