const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

const FRONT_DIR = path.join(__dirname, "..", "front");

app.use("/assets", express.static(path.join(FRONT_DIR, "assets")));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONT_DIR, "index.html"));
});

app.get("/test", (req, res) => {
  res.sendFile(path.join(FRONT_DIR, "test.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});